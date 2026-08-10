/**
 * Every 2D symbology at the sizes a long payload reaches.
 *
 * Data Matrix shipped with error correction computed over the wrong codewords
 * for any symbol holding more than 174 of them — every one of them unreadable —
 * and nothing caught it because no test encoded a payload that long (#160).
 * This is the sweep that would have: the formats a decoder reads are decoded
 * back, and the ones nothing decodes are compared against BWIPP, at lengths
 * that climb until the encoder says no.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import {
  encodeAztec,
  encodeQR,
  encodePDF417,
  encodeMicroPDF417,
  encodeDataMatrix,
  encodeHanXin,
  encodeDotCode,
  encodeCodablockF,
  encodeCode16K,
} from "../src/index"
import { bwipMatrix } from "./_bwip"

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

type Format = "Aztec" | "QRCode" | "PDF417" | "MicroPDF417" | "DataMatrix"

async function decode(matrix: boolean[][], format: Format, scale: number): Promise<string | null> {
  const margin = 6
  const height = matrix.length
  const cols = matrix[0]!.length
  const w = (cols + margin * 2) * scale
  const h = (height + margin * 2) * scale
  const data = new Uint8ClampedArray(w * h * 4)
  data.fill(255)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = Math.floor(y / scale) - margin
      const c = Math.floor(x / scale) - margin
      if (r >= 0 && r < height && c >= 0 && c < cols && matrix[r]![c]) {
        const i = (y * w + x) * 4
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
    }
  }
  const results = await readBarcodes({ data, width: w, height: h } as ImageData, {
    tryHarder: true,
    formats: [format],
  })
  return results[0]?.text ?? null
}

/** A payload of `length` characters that no single mode carries cheaply. */
function text(length: number): string {
  return "ABCDEFGHIJ0123456789 -.abcdefghij".repeat(Math.ceil(length / 33)).slice(0, length)
}

describe("large 2D symbols decode", () => {
  it.each([
    ["Aztec", (p: string) => encodeAztec(p), "Aztec", 4, [100, 600, 1200, 1800]],
    ["QR", (p: string) => encodeQR(p), "QRCode", 4, [100, 600, 1200, 1800]],
    ["PDF417", (p: string) => encodePDF417(p).matrix, "PDF417", 3, [100, 600, 1200]],
    ["MicroPDF417", (p: string) => encodeMicroPDF417(p).matrix, "MicroPDF417", 4, [50, 100, 150]],
    ["Data Matrix", (p: string) => encodeDataMatrix(p), "DataMatrix", 4, [100, 600, 1200, 1800]],
  ] as const)("%s", async (_name, encode, format, scale, lengths) => {
    for (const length of lengths) {
      const payload = text(length)
      expect(await decode(encode(payload), format, scale), `${length} characters`).toBe(payload)
    }
  })
})

describe("large symbols nothing decodes match BWIPP", () => {
  it.each([
    [
      "Han Xin",
      (p: string) => encodeHanXin(p),
      (p: string) => bwipMatrix("hanxin", p),
      [20, 120, 400, 900],
    ],
    [
      "DotCode",
      (p: string) => encodeDotCode(p),
      (p: string) => bwipMatrix("dotcode", p),
      [20, 120, 400, 700, 2000],
    ],
    [
      "Codablock F",
      (p: string) => encodeCodablockF(p).matrix,
      (p: string) => bwipMatrix("codablockf", p),
      [20, 120, 300, 350],
    ],
  ] as const)("%s", (_name, mine, theirs, lengths) => {
    // Han Xin's numeric mode has no oracle — BWIPP reads a digit run one
    // character past its end — so the payloads here stay out of it
    for (const length of lengths) {
      const payload = "abcdefghij".repeat(Math.ceil(length / 10)).slice(0, length)
      expect(rows(mine(payload)), `${length} characters`).toEqual(rows(theirs(payload)))
    }
  })

  // The longest message each of them takes, which is the same message
  it.each([
    ["Codablock F", (p: string) => encodeCodablockF(p), (p: string) => bwipMatrix("codablockf", p)],
    ["DotCode", (p: string) => encodeDotCode(p), (p: string) => bwipMatrix("dotcode", p)],
  ] as const)("%s runs out at the same length BWIPP does", (_name, mine, theirs) => {
    const fits = (encode: (payload: string) => unknown, length: number): boolean => {
      try {
        encode("abcdefghij".repeat(300).slice(0, length))
        return true
      } catch {
        return false
      }
    }
    /** The longest message that fits, by bisection. */
    const limit = (encode: (payload: string) => unknown): number => {
      let low = 1
      let high = 3000
      while (low < high) {
        const middle = Math.ceil((low + high) / 2)
        if (fits(encode, middle)) low = middle
        else high = middle - 1
      }
      return low
    }
    expect(limit(mine)).toBe(limit(theirs))
  })

  // Code 16K holds 16 rows and no more, so its largest is small
  it("Code 16K", () => {
    const QUIET_ZONE = 10
    const ROW_MODULES = 70
    for (const length of [20, 60, 77]) {
      const payload = "abcdefghij".repeat(8).slice(0, length)
      const expected = bwipMatrix("code16k", payload).map((row) =>
        row
          .slice(QUIET_ZONE, QUIET_ZONE + ROW_MODULES)
          .map((m) => (m ? "1" : "0"))
          .join(""),
      )
      expect(rows(encodeCode16K(payload).matrix), `${length} characters`).toEqual(expected)
    }
  })
})
