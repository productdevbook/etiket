/**
 * Code 128 and the upper half of Latin-1.
 *
 * `encodeCode128` used to walk past any character above 126 without encoding
 * it: `encodeCode128("AéB")` produced the symbol for `AB`, silently, and no
 * test noticed. FNC4 is what the standard provides for those characters — one
 * shifts a single character across the 128 boundary, two latch across it — and
 * both the symbol and the bytes a reader gets back are checked here.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeCode128 } from "../src/encoders/code128"
import { InvalidInputError } from "../src/errors"
import { bwipBars, describeDiff } from "./_bwip"

function toImage(bars: number[], barWidth = 4, height = 100, margin = 40) {
  let total = 0
  for (const w of bars) total += w
  const width = total * barWidth + margin * 2
  const imgHeight = height + margin * 2
  const data = new Uint8ClampedArray(width * imgHeight * 4)
  data.fill(255)
  let x = margin
  let isBar = true
  for (const w of bars) {
    if (isBar) {
      for (let py = margin; py < margin + height; py++) {
        for (let px = x; px < x + w * barWidth && px < width; px++) {
          const idx = (py * width + px) * 4
          data[idx] = 0
          data[idx + 1] = 0
          data[idx + 2] = 0
        }
      }
    }
    x += w * barWidth
    isBar = !isBar
  }
  return { data, width, height: imgHeight }
}

async function decodeBytes(bars: number[]): Promise<number[]> {
  const results = await readBarcodes(toImage(bars) as unknown as ImageData, { tryHarder: true })
  return [...(results[0]?.bytes ?? [])]
}

/** etiket input, and the same payload with `^NNN` escapes for BWIPP. */
const CASES: [string, string][] = [
  ["é", "^233"],
  ["Aé", "A^233"],
  ["AéB", "A^233B"],
  ["éê", "^233^234"],
  ["éêë", "^233^234^235"],
  ["AéêëB", "A^233^234^235B"],
  ["éAê", "^233A^234"],
  ["Grüße", "Gr^252^223e"],
  ["naïve résumé", "na^239ve r^233sum^233"],
  ["éêëìABCDEF", "^233^234^235^236ABCDEF"],
  ["ABCéêëìDEF", "ABC^233^234^235^236DEF"],
  ["ABCéêëìí", "ABC^233^234^235^236^237"],
  ["éêëìíîï", "^233^234^235^236^237^238^239"],
  ["ééXéé", "^233^233X^233^233"],
]

describe("Code 128 Latin-1", () => {
  it("no longer drops a character above 126", () => {
    // The bug: this produced exactly the symbol for "AB"
    expect(encodeCode128("AéB")).not.toEqual(encodeCode128("AB"))
    expect(encodeCode128("é").length).toBeGreaterThan(encodeCode128("").length)
  })

  it("shifts a single character with one FNC4", () => {
    // Start B, FNC4, 'i' (233 - 128), check — four symbols and the stop
    expect(encodeCode128("é")).toHaveLength(4 * 6 + 7)
  })

  it("latches with two FNC4 where that is shorter than shifting", () => {
    // Four in a row: start, two FNC4, four characters, check — against the ten
    // symbols four separate shifts would have taken
    expect(encodeCode128("éêëì")).toHaveLength(8 * 6 + 7)
  })

  it("shifts rather than latching when the run does not pay for it", () => {
    // Three between two base characters: the latch would need a way back
    expect(encodeCode128("AéêëB")).toHaveLength(10 * 6 + 7)
  })

  it("rejects a character outside Latin-1", () => {
    expect(() => encodeCode128("日")).toThrow(InvalidInputError)
    expect(() => encodeCode128("A日B")).toThrow(/not encodable/)
  })

  for (const [text, escaped] of CASES) {
    it(`matches bwip-js for ${JSON.stringify(text)}`, () => {
      const actual = encodeCode128(text)
      const expected = bwipBars("code128", escaped, { parse: true })
      expect(actual, describeDiff(actual, expected)).toEqual(expected)
    })
  }

  for (const [text] of CASES) {
    it(`reads back byte for byte: ${JSON.stringify(text)}`, async () => {
      const expected = [...text].map((character) => character.charCodeAt(0))
      expect(await decodeBytes(encodeCode128(text))).toEqual(expected)
    })
  }
})
