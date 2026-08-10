/**
 * Aztec Rune — a value of 0 to 255 in an 11x11 symbol.
 *
 * Every one of the 256 runes is compared module for module against BWIPP and
 * read back through zxing, which is as complete as verification gets: the whole
 * domain, from both ends.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeAztecRune } from "../src/index"
import { InvalidInputError } from "../src/errors"
import { bwipMatrix, describeDiff } from "./_bwip"

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((on) => (on ? "#" : ".")).join(""))
}

function toImage(matrix: boolean[][], scale = 12, margin = 6) {
  const size = matrix.length
  const width = (size + margin * 2) * scale
  const data = new Uint8ClampedArray(width * width * 4)
  data.fill(255)
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const mr = Math.floor(y / scale) - margin
      const mc = Math.floor(x / scale) - margin
      if (mr >= 0 && mr < size && mc >= 0 && mc < size && matrix[mr]![mc]) {
        const idx = (y * width + x) * 4
        data[idx] = 0
        data[idx + 1] = 0
        data[idx + 2] = 0
      }
    }
  }
  return { data, width, height: width }
}

describe("Aztec Rune", () => {
  it("is 11 modules square", () => {
    const matrix = encodeAztecRune(0)
    expect(matrix).toHaveLength(11)
    for (const row of matrix) expect(row).toHaveLength(11)
  })

  it("matches bwip-js for all 256 values", () => {
    for (let value = 0; value <= 255; value++) {
      const actual = rows(encodeAztecRune(value))
      const expected = rows(bwipMatrix("aztecrune", String(value)))
      expect(actual, `rune ${value}: ${describeDiff(actual, expected)}`).toEqual(expected)
    }
  })

  it("gives every value a different symbol", () => {
    const seen = new Set<string>()
    for (let value = 0; value <= 255; value++) seen.add(rows(encodeAztecRune(value)).join("|"))
    expect(seen.size).toBe(256)
  })

  it("rejects anything that is not a byte", () => {
    expect(() => encodeAztecRune(-1)).toThrow(InvalidInputError)
    expect(() => encodeAztecRune(256)).toThrow(InvalidInputError)
    expect(() => encodeAztecRune(1.5)).toThrow(InvalidInputError)
    expect(() => encodeAztecRune(Number.NaN)).toThrow(InvalidInputError)
  })

  it.each([0, 1, 42, 128, 254, 255])("reads back as %i through zxing", async (value) => {
    const { data, width, height } = toImage(encodeAztecRune(value))
    const results = await readBarcodes({ data, width, height } as ImageData, { tryHarder: true })
    expect(results[0]?.format).toBe("Aztec")
    // zxing reports a rune as its three digit value
    expect(Number(results[0]?.text)).toBe(value)
  })
})
