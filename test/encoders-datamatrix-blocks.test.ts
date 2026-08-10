/**
 * Data Matrix symbols big enough to need several Reed-Solomon blocks.
 *
 * From 52x52 up, ISO/IEC 16022 8.5 splits the data into blocks by taking every
 * nth codeword rather than a contiguous run of them, so that a burst of damage
 * is spread across the blocks instead of landing in one. etiket sliced them
 * contiguously, which computed error correction over the wrong codewords:
 * **every symbol holding more than 174 data codewords was unreadable.**
 *
 * Nothing caught it. The round-trip tests used payloads that fit a single
 * block, and the largest symbol anything asserted on was 48x48.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeDataMatrix } from "../src/index"
import { bwipMatrix } from "./_bwip"

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

async function decode(matrix: boolean[][]): Promise<string | null> {
  const scale = 4
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
    formats: ["DataMatrix"],
  })
  return results[0]?.text ?? null
}

/** Every symbol size that needs more than one block, and the size it is. */
const MULTI_BLOCK = [
  [204, 52, 2],
  [280, 64, 2],
  [368, 72, 4],
  [456, 80, 4],
  [576, 88, 4],
  [696, 96, 4],
  [816, 104, 6],
  [1050, 120, 6],
  [1304, 132, 8],
  [1558, 144, 10],
] as const

/** Digits pack two to a codeword, which is how a payload reaches these sizes. */
function fill(codewords: number): string {
  return "0123456789".repeat(Math.ceil(codewords / 5)).slice(0, codewords * 2)
}

describe("Data Matrix Reed-Solomon blocks", () => {
  it.each(MULTI_BLOCK)(
    "decodes a %i codeword symbol (%ix%i, %i blocks)",
    async (codewords, size) => {
      const payload = fill(codewords)
      const matrix = encodeDataMatrix(payload)
      expect(matrix).toHaveLength(size)
      expect(await decode(matrix)).toBe(payload)
    },
  )

  // Every size but the largest is the reference's symbol exactly. 144x144
  // divides into ten blocks of two different lengths and BWIPP arranges them
  // some other way; both symbols decode, so neither is wrong, and this keeps
  // the difference visible rather than asserting it away.
  it.each(MULTI_BLOCK.filter(([codewords]) => codewords !== 1558))(
    "matches bwip-js at %i codewords (%ix%i)",
    (codewords) => {
      const payload = fill(codewords)
      expect(rows(encodeDataMatrix(payload))).toEqual(rows(bwipMatrix("datamatrix", payload)))
    },
  )

  it("differs from bwip-js only at 144x144, where both still decode", async () => {
    const payload = fill(1558)
    const mine = encodeDataMatrix(payload)
    const theirs = bwipMatrix("datamatrix", payload)
    expect(mine).toHaveLength(144)
    expect(rows(mine)).not.toEqual(rows(theirs))
    expect(await decode(mine)).toBe(payload)
    expect(await decode(theirs)).toBe(payload)
  })

  // The first size that needs two blocks, from either side
  it.each([170, 174, 175, 200, 204, 210, 250])(
    "decodes %i characters across the single block boundary",
    async (length) => {
      const payload = "ABCDEFGHIJ0123456789 -.".repeat(20).slice(0, length)
      expect(await decode(encodeDataMatrix(payload))).toBe(payload)
    },
  )
})
