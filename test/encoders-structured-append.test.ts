/**
 * Structured Append for Data Matrix and MaxiCode.
 *
 * QR and PDF417 could already split a message across symbols a reader puts
 * back together; Data Matrix and MaxiCode define the same thing and etiket did
 * not offer it.
 *
 * Data Matrix opens each symbol with codeword 233, then its position in the
 * high nibble of the next codeword and the number of symbols in the low one —
 * counting *down*, so a sequence of two is 15 and one of sixteen is 1 — then
 * two file identifier codewords (ISO/IEC 16022 5.6). zxing reports all three
 * back, so it verifies itself.
 *
 * MaxiCode opens with a pad codeword and one holding the position in its top
 * three bits and the count in its bottom three (ISO/IEC 16023 5.5). No decoder
 * reports that, so BWIPP is the oracle: it takes the same thing through its
 * `sam` option.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import {
  encodeDataMatrix,
  encodeDataMatrixSequence,
  encodeMaxiCode,
  encodeMaxiCodeSequence,
  CapacityError,
  InvalidInputError,
} from "../src/index"
import { bwipMaxiCode } from "./_bwip"

/** BWIPP draws the MaxiCode bullseye as rings rather than hexagons. */
const BULLSEYE = new Set([
  343, 344, 372, 376, 400, 403, 404, 407, 430, 432, 436, 438, 461, 463, 464, 466, 490, 493, 495,
  498, 521, 523, 524, 526, 550, 552, 556, 558, 580, 583, 584, 587, 612, 616, 643, 644,
])

function differences(mine: boolean[][], theirs: boolean[][]): string[] {
  const out: string[] = []
  for (let r = 0; r < 33; r++) {
    for (let c = 0; c < 30; c++) {
      if (BULLSEYE.has(r * 30 + c)) continue
      if (mine[r]![c] !== theirs[r]![c]) out.push(`${r},${c}`)
    }
  }
  return out
}

interface Read {
  text?: string
  sequenceIndex?: number
  sequenceSize?: number
  sequenceId?: string
}

async function read(matrix: boolean[][]): Promise<Read | undefined> {
  const scale = 6
  const margin = 5
  const rows = matrix.length
  const cols = matrix[0]!.length
  const width = (cols + margin * 2) * scale
  const height = (rows + margin * 2) * scale
  const data = new Uint8ClampedArray(width * height * 4)
  data.fill(255)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = Math.floor(y / scale) - margin
      const c = Math.floor(x / scale) - margin
      if (r >= 0 && r < rows && c >= 0 && c < cols && matrix[r]![c]) {
        const i = (y * width + x) * 4
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
    }
  }
  const results = await readBarcodes({ data, width, height } as ImageData, {
    tryHarder: true,
    formats: ["DataMatrix"],
  })
  return results[0] as Read | undefined
}

describe("Data Matrix Structured Append", () => {
  it.each([2, 3, 4, 8, 16])("splits a message across %i symbols", async (total) => {
    const text = "ABCDEFGHIJ0123456789".repeat(4)
    const symbols = encodeDataMatrixSequence(text, { symbols: total })
    expect(symbols).toHaveLength(total)

    let rebuilt = ""
    for (const [index, matrix] of symbols.entries()) {
      const result = await read(matrix)
      expect(result?.sequenceIndex, `symbol ${index}`).toBe(index)
      expect(result?.sequenceSize, `symbol ${index}`).toBe(total)
      expect(result?.sequenceId, `symbol ${index}`).toBe("257")
      rebuilt += result?.text ?? ""
    }
    expect(rebuilt).toBe(text)
  })

  it("gives every symbol of a sequence the same file identifier", async () => {
    const symbols = encodeDataMatrixSequence("HELLO WORLD AND EVERYONE", {
      symbols: 2,
      fileId: [17, 42],
    })
    for (const matrix of symbols) {
      // The identifier is reported as the two bytes read as one number
      expect((await read(matrix))?.sequenceId).toBe(String(17 * 256 + 42))
    }
  })

  it("takes the fewest symbols that hold the message when none is asked for", () => {
    expect(encodeDataMatrixSequence("SHORT")).toHaveLength(2)
    expect(encodeDataMatrixSequence("A".repeat(8000)).length).toBeGreaterThan(2)
  })

  it("costs four codewords a symbol, which the size shows", () => {
    const text = "0123456789012345678901234567890123456789"
    const alone = encodeDataMatrix(text)
    const [first] = encodeDataMatrixSequence(text, { symbols: 2 })
    // Half the message plus a four codeword header is not half the symbol
    expect(first!.length).toBeGreaterThan(alone.length / 2)
  })

  it("refuses a sequence it cannot make", () => {
    expect(() => encodeDataMatrixSequence("", { symbols: 2 })).toThrow(InvalidInputError)
    expect(() => encodeDataMatrixSequence("A", { symbols: 1 })).toThrow(/2 to 16/)
    expect(() => encodeDataMatrixSequence("A", { symbols: 17 })).toThrow(/2 to 16/)
    expect(() =>
      encodeDataMatrixSequence("A".repeat(400), { symbols: 2, symbolSize: "16x16" }),
    ).toThrow(CapacityError)
  })

  it("refuses a header that is not a place in a sequence", () => {
    expect(() => encodeDataMatrix("A", { structuredAppend: { index: 1, total: 1 } })).toThrow(
      /2 to 16/,
    )
    expect(() => encodeDataMatrix("A", { structuredAppend: { index: 3, total: 2 } })).toThrow(
      /outside a sequence/,
    )
    expect(() =>
      encodeDataMatrix("A", { structuredAppend: { index: 1, total: 2, fileId: [0, 1] } }),
    ).toThrow(/1 to 254/)
    expect(() =>
      encodeDataMatrix("A", { structuredAppend: { index: 1, total: 2, fileId: [1, 255] } }),
    ).toThrow(/1 to 254/)
  })
})

describe("MaxiCode Structured Append", () => {
  it.each([
    [1, 2],
    [2, 2],
    [1, 3],
    [3, 3],
    [4, 6],
    [1, 8],
    [8, 8],
  ])("matches BWIPP for symbol %i of %i", (index, total) => {
    for (const text of ["TEST", "HELLO WORLD", "abc123"]) {
      const mine = encodeMaxiCode(text, { mode: 4, structuredAppend: { index, total } })
      const theirs = bwipMaxiCode(text, { mode: 4, sam: `${index}${total}` })
      expect(differences(mine, theirs), `${index} of ${total} ${text}`).toEqual([])
    }
  })

  it("splits a message across symbols", () => {
    const text = "ABCDEFGHIJ".repeat(20)
    const symbols = encodeMaxiCodeSequence(text, { symbols: 3 })
    expect(symbols).toHaveLength(3)
    for (const matrix of symbols) expect(matrix).toHaveLength(33)
  })

  it("takes the fewest symbols that hold the message when none is asked for", () => {
    expect(encodeMaxiCodeSequence("SHORT")).toHaveLength(2)
    expect(encodeMaxiCodeSequence("A".repeat(200)).length).toBeGreaterThan(2)
  })

  it("refuses a sequence it cannot make", () => {
    expect(() => encodeMaxiCodeSequence("", { symbols: 2 })).toThrow(InvalidInputError)
    expect(() => encodeMaxiCodeSequence("A", { symbols: 1 })).toThrow(/2 to 8/)
    expect(() => encodeMaxiCodeSequence("A", { symbols: 9 })).toThrow(/2 to 8/)
    expect(() => encodeMaxiCodeSequence("A".repeat(2000))).toThrow(CapacityError)
  })

  it("refuses a header that is not a place in a sequence", () => {
    expect(() => encodeMaxiCode("A", { structuredAppend: { index: 1, total: 1 } })).toThrow(
      /2 to 8/,
    )
    expect(() => encodeMaxiCode("A", { structuredAppend: { index: 9, total: 8 } })).toThrow(
      /outside a sequence/,
    )
  })
})
