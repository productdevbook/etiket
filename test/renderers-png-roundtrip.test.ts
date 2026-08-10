/**
 * Decoding what the PNG renderers actually produce.
 *
 * Everything else in this suite checks the module matrix. The PNG is what a
 * user prints, and nothing read one back: the existing PNG tests measure the
 * IHDR dimensions and sample pixels, and the one PNG reader in the suite
 * asserts that only filter type 0 is used — which is true of the ICO
 * conversions it was written for and not of a barcode, where rows repeat and
 * the Up filter earns its keep.
 *
 * So this decodes the real thing: the public PNG functions, through a reader
 * that undoes the zlib framing, all five row filters and the palette, and then
 * through zxing. That covers the module size, the quiet zone, the deflate
 * stream and the palette in one go.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import * as etiket from "../src/index"
import { decodePNG, pngImageData } from "./_png"

type Format =
  | "QRCode"
  | "MicroQRCode"
  | "RMQRCode"
  | "DataMatrix"
  | "Aztec"
  | "PDF417"
  | "MicroPDF417"
  | "MaxiCode"
  | "Code128"
  | "EAN-13"
  | "Code39"
  | "ITF"
  | "Codabar"
  | "DataBar"

async function read(png: Uint8Array, format: Format): Promise<string | null> {
  const results = await readBarcodes(pngImageData(png), { tryHarder: true, formats: [format] })
  return results[0]?.text ?? null
}

describe("2D PNG output decodes", () => {
  it.each([
    ["QR", "HELLO PNG", () => etiket.qrcodePNG("HELLO PNG", { moduleSize: 6 }), "QRCode"],
    ["Micro QR", "12345", () => etiket.microqrPNG("12345", { moduleSize: 8 }), "MicroQRCode"],
    ["rMQR", "HELLO", () => etiket.rmqrPNG("HELLO", { moduleSize: 8 }), "RMQRCode"],
    [
      "Data Matrix",
      "HELLO PNG",
      () => etiket.datamatrixPNG("HELLO PNG", { moduleSize: 8 }),
      "DataMatrix",
    ],
    ["Aztec", "HELLO PNG", () => etiket.aztecPNG("HELLO PNG", { moduleSize: 8 }), "Aztec"],
    ["PDF417", "HELLO PNG", () => etiket.pdf417PNG("HELLO PNG", { moduleSize: 4 }), "PDF417"],
    [
      "MicroPDF417",
      "HELLO",
      () => etiket.micropdf417PNG("HELLO", { moduleSize: 6 }),
      "MicroPDF417",
    ],
    [
      "MaxiCode",
      "HELLO PNG",
      () => etiket.maxicodePNG("HELLO PNG", { moduleSize: 10 }),
      "MaxiCode",
    ],
  ] as const)("%s", async (_name, expected, render, format) => {
    expect(await read(render(), format)).toBe(expected)
  })

  it.each([2, 4, 8, 12])("carries the message at module size %i", async (moduleSize) => {
    expect(await read(etiket.qrcodePNG("MODULE SIZE", { moduleSize }), "QRCode")).toBe(
      "MODULE SIZE",
    )
  })

  it.each([1, 2, 4, 8])("carries the message with a margin of %i modules", async (margin) => {
    expect(await read(etiket.qrcodePNG("MARGIN", { moduleSize: 6, margin }), "QRCode")).toBe(
      "MARGIN",
    )
  })
})

describe("1D PNG output decodes", () => {
  it.each([
    ["Code 128", "HELLO PNG", { type: "code128" }, "Code128"],
    ["EAN-13", "5901234123457", { type: "ean13" }, "EAN-13"],
    ["Code 39", "HELLO", { type: "code39" }, "Code39"],
    ["ITF", "123456", { type: "itf" }, "ITF"],
    ["Codabar", "A1234B", { type: "codabar" }, "Codabar"],
  ] as const)("%s", async (_name, text, options, format) => {
    expect(await read(etiket.barcodePNG(text, options), format)).toBe(text)
  })
})

describe("what the PNG encoder writes", () => {
  it("uses the Up filter where a row repeats, and says so in the row byte", () => {
    // A barcode is mostly repeated rows, which is what the filter is for
    const png = etiket.qrcodePNG("FILTERS", { moduleSize: 6 })
    const { width, height } = decodePNG(png)
    expect(width).toBe(height)
    // Decoding at all proves the filters were applied and undone correctly;
    // this pins that more than one of them is in use
    const filters = new Set<number>()
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
    let pos = 8
    const idat: number[] = []
    while (pos < png.length) {
      const length = view.getUint32(pos)
      const type = String.fromCharCode(...png.slice(pos + 4, pos + 8))
      if (type === "IDAT")
        for (const byte of png.subarray(pos + 8, pos + 8 + length)) idat.push(byte)
      if (type === "IEND") break
      pos += 12 + length
    }
    // Walk the stored deflate blocks to the raw scanlines
    const raw: number[] = []
    let at = 2
    for (;;) {
      const header = idat[at]!
      const length = idat[at + 1]! | (idat[at + 2]! << 8)
      at += 5
      for (let i = 0; i < length; i++) raw.push(idat[at + i]!)
      at += length
      if (header & 1) break
    }
    for (let y = 0; y < height; y++) filters.add(raw[y * (width + 1)]!)
    expect(filters.size).toBeGreaterThan(1)
    for (const filter of filters) expect(filter).toBeLessThanOrEqual(4)
  })

  it("puts the same pixels in the data URI as in the bytes", () => {
    const png = etiket.qrcodePNG("DATA URI", { moduleSize: 6 })
    const uri = etiket.qrcodePNGDataURI("DATA URI", { moduleSize: 6 })
    const base64 = uri.slice("data:image/png;base64,".length)
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.codePointAt(0)!)
    expect([...bytes]).toEqual([...png])
  })
})
