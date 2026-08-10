/**
 * Decoding what the SVG renderers actually draw.
 *
 * SVG is the library's main output, and until now nothing read one back. The
 * renderer tests pull the rectangles out of the document and check their
 * geometry, which catches a misplaced module but not a missing one, and says
 * nothing about whether the whole symbol still scans.
 *
 * `_svg.ts` draws the document — the two shapes etiket emits, a `<rect>` per
 * bar and one `<path>` of axis-aligned rectangles per matrix — and this hands
 * the pixels to zxing.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import * as etiket from "../src/index"
import { rasterizeSVG, svgRectangles } from "./_svg"

type Format =
  | "QRCode"
  | "MicroQRCode"
  | "RMQRCode"
  | "DataMatrix"
  | "Aztec"
  | "PDF417"
  | "MicroPDF417"
  | "Code128"
  | "EAN-13"
  | "EAN-8"
  | "UPC-A"
  | "Code39"
  | "Code93"
  | "ITF"
  | "Codabar"
  | "DataBar"
  | "DataBarExpanded"

async function read(svg: string, format: Format, scale = 2): Promise<string | null> {
  const results = await readBarcodes(rasterizeSVG(svg, scale), {
    tryHarder: true,
    formats: [format],
  })
  return results[0]?.text ?? null
}

describe("2D SVG output decodes", () => {
  it.each([
    ["QR", "HELLO SVG", () => etiket.qrcode("HELLO SVG"), "QRCode"],
    ["Micro QR", "12345", () => etiket.microqr("12345"), "MicroQRCode"],
    ["rMQR", "HELLO", () => etiket.rmqr("HELLO"), "RMQRCode"],
    ["Data Matrix", "HELLO SVG", () => etiket.datamatrix("HELLO SVG"), "DataMatrix"],
    ["Aztec", "HELLO SVG", () => etiket.aztec("HELLO SVG"), "Aztec"],
    ["PDF417", "HELLO SVG", () => etiket.pdf417("HELLO SVG"), "PDF417"],
    ["MicroPDF417", "HELLO", () => etiket.micropdf417("HELLO"), "MicroPDF417"],
  ] as const)("%s", async (_name, expected, render, format) => {
    expect(await read(render(), format)).toBe(expected)
  })

  it.each([100, 200, 400])("carries the message at size %i", async (size) => {
    expect(await read(etiket.qrcode("SIZED", { size }), "QRCode")).toBe("SIZED")
  })

  it.each([1, 2, 4, 8])("carries the message with a margin of %i modules", async (margin) => {
    expect(await read(etiket.qrcode("MARGIN", { margin }), "QRCode")).toBe("MARGIN")
  })

  // The styled shapes draw circles and rounded corners, which this rasteriser
  // does not follow — but the plain one is what most symbols are printed as
  it("draws every dark module and nothing else", () => {
    const matrix = etiket.encodeQR("MODULES")
    const dark = matrix.flat().filter(Boolean).length
    expect(svgRectangles(etiket.qrcode("MODULES"))).toHaveLength(dark)
  })
})

describe("1D SVG output decodes", () => {
  it.each([
    ["Code 128", "HELLO SVG", { type: "code128" }, "Code128"],
    ["EAN-13", "5901234123457", { type: "ean13" }, "EAN-13"],
    ["EAN-8", "96385074", { type: "ean8" }, "EAN-8"],

    ["Code 39", "HELLO", { type: "code39" }, "Code39"],
    ["Code 93", "HELLO", { type: "code93" }, "Code93"],
    ["ITF", "123456", { type: "itf" }, "ITF"],
    ["Codabar", "A1234B", { type: "codabar" }, "Codabar"],
  ] as const)("%s", async (_name, text, options, format) => {
    expect(await read(etiket.barcode(text, options), format, 3)).toBe(text)
  })

  // zxing reports a UPC-A as the EAN-13 it is, with the leading zero written out
  it("carries a UPC-A", async () => {
    expect(await read(etiket.barcode("036000291452", { type: "upca" }), "UPC-A", 3)).toBe(
      "0036000291452",
    )
  })

  it("carries a GS1 DataBar", async () => {
    expect(await read(etiket.barcode("2001234567890", { type: "gs1-databar" }), "DataBar", 3)).toBe(
      "(01)20012345678909",
    )
  })

  it.each([1, 2, 3, 4])("carries the message at a bar width of %i", async (barWidth) => {
    expect(await read(etiket.barcode("WIDTH", { type: "code128", barWidth }), "Code128", 3)).toBe(
      "WIDTH",
    )
  })
})

describe("the data URI draws the same thing", () => {
  it("carries the message through the base64 form", async () => {
    const uri = etiket.qrcodeDataURI("DATA URI")
    const svg = decodeURIComponent(uri.slice("data:image/svg+xml,".length))
    expect(await read(svg, "QRCode")).toBe("DATA URI")
  })
})
