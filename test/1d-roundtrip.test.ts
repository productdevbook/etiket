/**
 * 1D barcode round-trip tests — encode with etiket, decode with zxing-wasm
 * Verifies that generated 1D barcodes are actually scannable
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import {
  encodeCode128,
  encodeEAN13,
  encodeEAN8,
  encodeUPCA,
  encodeCode39,
  encodeCode93,
  encodeITF,
  encodeCodabar,
  encodeGS1128,
} from "../src/index"

/**
 * Convert 1D bar widths to ImageData for zxing-wasm decoding.
 * Renders the bar/space pattern as a pixel image with proper quiet zones.
 */
function barsToImageData(
  bars: number[],
  barWidth = 4,
  height = 100,
  margin = 40,
): { data: Uint8ClampedArray; width: number; height: number } {
  let totalModules = 0
  for (const w of bars) totalModules += w
  const imgWidth = totalModules * barWidth + margin * 2
  const imgHeight = height + margin * 2
  const data = new Uint8ClampedArray(imgWidth * imgHeight * 4)
  data.fill(255) // white background

  // Draw bars
  let x = margin
  let isBar = true
  for (const w of bars) {
    if (isBar) {
      const barEnd = x + w * barWidth
      for (let py = margin; py < margin + height; py++) {
        for (let px = x; px < barEnd && px < imgWidth; px++) {
          const idx = (py * imgWidth + px) * 4
          data[idx] = 0
          data[idx + 1] = 0
          data[idx + 2] = 0
          data[idx + 3] = 255
        }
      }
    }
    x += w * barWidth
    isBar = !isBar
  }

  return { data, width: imgWidth, height: imgHeight }
}

/**
 * Decode a 1D barcode bar-width array using zxing-wasm
 */
async function decode1D(bars: number[]): Promise<string | null> {
  const img = barsToImageData(bars)
  const results = await readBarcodes(img as unknown as ImageData, { tryHarder: true })
  return results.length > 0 ? results[0]!.text : null
}

/**
 * Decode EAN/UPC which returns { bars, guards }
 */
async function decodeEAN(result: { bars: number[]; guards: number[] }): Promise<string | null> {
  return decode1D(result.bars)
}

describe("Code 128 round-trip", () => {
  it("decodes uppercase", async () => {
    expect(await decode1D(encodeCode128("ABC123"))).toBe("ABC123")
  })

  it("decodes lowercase", async () => {
    expect(await decode1D(encodeCode128("hello"))).toBe("hello")
  })

  it("decodes mixed case", async () => {
    expect(await decode1D(encodeCode128("Hello World"))).toBe("Hello World")
  })

  it("decodes special characters", async () => {
    expect(await decode1D(encodeCode128("test@example.com"))).toBe("test@example.com")
  })

  it("decodes digits-only (Code C)", async () => {
    expect(await decode1D(encodeCode128("1234567890"))).toBe("1234567890")
  })
})

describe("EAN-13 round-trip", () => {
  it("decodes standard EAN-13", async () => {
    expect(await decodeEAN(encodeEAN13("5901234123457"))).toBe("5901234123457")
  })

  it("decodes with auto check digit", async () => {
    const result = await decodeEAN(encodeEAN13("590123412345"))
    expect(result).toBe("5901234123457")
  })
})

describe("EAN-8 round-trip", () => {
  it("decodes standard EAN-8", async () => {
    expect(await decodeEAN(encodeEAN8("96385074"))).toBe("96385074")
  })
})

describe("UPC-A round-trip", () => {
  it("decodes standard UPC-A", async () => {
    const result = await decodeEAN(encodeUPCA("012345678905"))
    // zxing-wasm may decode UPC-A as EAN-13 (with leading 0)
    expect(result).toMatch(/0?12345678905$/)
  })
})

describe("Code 39 round-trip", () => {
  it("decodes uppercase text", async () => {
    expect(await decode1D(encodeCode39("HELLO"))).toBe("HELLO")
  })

  it("decodes digits", async () => {
    expect(await decode1D(encodeCode39("12345"))).toBe("12345")
  })
})

describe("Code 93 round-trip", () => {
  it("decodes text", async () => {
    expect(await decode1D(encodeCode93("TEST"))).toBe("TEST")
  })
})

describe("ITF round-trip", () => {
  it("decodes even-length digits", async () => {
    expect(await decode1D(encodeITF("1234567890"))).toBe("1234567890")
  })
})

describe("Codabar round-trip", () => {
  it("decodes with start/stop", async () => {
    const result = await decode1D(encodeCodabar("A12345B"))
    expect(result).toContain("12345")
  })
})

describe("GS1-128 round-trip", () => {
  it("decodes AI format", async () => {
    const result = await decode1D(encodeGS1128("(01)12345678901231"))
    expect(result).toContain("12345678901231")
  })
})
