/**
 * How a Data Matrix encoding mode stops, and against BWIPP.
 *
 * An unlatch exists so that whatever follows it is read as ASCII. That makes
 * where a mode may stop a question about the symbol and not only about the
 * data, and etiket was answering it without looking:
 *
 * - EDIFACT packs four six-bit values into three codewords. A last group of one
 *   or two values only reaches one or two of those codewords, and etiket
 *   emitted all three — so a reader that left EDIFACT at the unlatch found a
 *   codeword of zero bits where ASCII was supposed to start. **Every EDIFACT
 *   symbol whose message length was a multiple of four, or one more than one,
 *   failed to decode at all.** The round trips below are the regression test.
 * - The unlatch itself is redundant where the symbol ends exactly where the
 *   data does, and wrong where two codewords or fewer are left — a reader
 *   leaves EDIFACT of its own accord there and would read the unlatch as data.
 *   Both cost a symbol size on short messages: `ABCDEF` needed 14x14 and fits
 *   12x12.
 *
 * BWIPP is the oracle for the module data, at every message length rather than
 * at a handful. It switches mode mid-message where etiket picks one mode for
 * the whole of it, so a few lengths come out as a different encoding of the
 * same size; those are listed by length rather than asserted away, so that
 * closing the gap shows up here as a failure.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeDataMatrix } from "../src/index"
import { bwipMatrix } from "./_bwip"

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

function area(matrix: boolean[][]): number {
  return matrix.length * matrix[0]!.length
}

async function decode(matrix: boolean[][]): Promise<string | null> {
  const scale = 8
  const margin = 5
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

/** Deterministic payloads over one character set. */
function payloads(seed: number, count: number, alphabet: string, maxLength: number): string[] {
  let state = seed
  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
  const out: string[] = []
  for (let n = 0; n < count; n++) {
    let payload = ""
    const length = 1 + Math.floor(random() * maxLength)
    for (let i = 0; i < length; i++) payload += alphabet[Math.floor(random() * alphabet.length)]
    out.push(payload)
  }
  return out
}

const EDIFACT_ALPHABET = "ABC/DEF+GHI-JKL*MNO"

describe("Data Matrix EDIFACT termination", () => {
  // The defect was in the message length modulo four, so every length is tried
  it("decodes back at every message length", async () => {
    for (let length = 1; length <= 64; length++) {
      const payload = EDIFACT_ALPHABET.repeat(4).slice(0, length)
      expect(await decode(encodeDataMatrix(payload)), `${length} characters`).toBe(payload)
    }
  })

  it("decodes back for random EDIFACT messages", async () => {
    for (const payload of payloads(1717, 40, EDIFACT_ALPHABET, 70)) {
      expect(await decode(encodeDataMatrix(payload)), JSON.stringify(payload)).toBe(payload)
    }
  })
})

describe("Data Matrix against BWIPP", () => {
  /**
   * Lengths where the two produce a different symbol of the same size. BWIPP
   * changes mode part way through the message and etiket does not, so the
   * encodings tie rather than one being better.
   */
  it.each([
    ["EDIFACT", EDIFACT_ALPHABET, [10, 11, 26]],
    ["uppercase", "ABCDEFGHIJKLMNOPQRSTUVWXYZ ", [7, 8]],
    ["lowercase", "abcdefghijklmnopqrstuvwxyz ", [7, 8]],
    ["digits", "0123456789", []],
    ["control characters", "ABCdef\x01\x02\x03\x1b", []],
  ] as const)("matches at every length up to 70, %s", (_name, alphabet, tied) => {
    const differing: number[] = []
    for (let length = 1; length <= 70; length++) {
      const payload = alphabet.repeat(8).slice(0, length)
      const mine = encodeDataMatrix(payload)
      const theirs = bwipMatrix("datamatrix", payload)
      expect(area(mine), `${length} characters`).toBeLessThanOrEqual(area(theirs))
      if (rows(mine).join("\n") !== rows(theirs).join("\n")) differing.push(length)
    }
    expect(differing).toEqual([...tied])
  })

  it.each([
    ["digits", "0123456789"],
    ["uppercase", "ABCDEFGHIJKLMNOPQRSTUVWXYZ "],
    ["lowercase", "abcdefghijklmnopqrstuvwxyz "],
    ["control characters", "ABCdef\x01\x02\x03\x1b"],
    ["EDIFACT", EDIFACT_ALPHABET],
  ])("is never larger than BWIPP's for random %s", (_name, alphabet) => {
    for (const payload of payloads(31_337, 60, alphabet, 60)) {
      expect(area(encodeDataMatrix(payload)), JSON.stringify(payload)).toBeLessThanOrEqual(
        area(bwipMatrix("datamatrix", payload)),
      )
    }
  })
})

describe("Data Matrix symbol size", () => {
  // Each of these used to take the next size up, because the unlatch went into
  // a symbol that had no room to spare for it
  it.each([
    ["ABCDEF", 12],
    ["ABCDEFGHIJ", 14],
    ["A.B,C/D:E", 14],
  ] as const)("puts %s in a %ix%i symbol", (payload, size) => {
    const matrix = encodeDataMatrix(payload)
    expect(matrix).toHaveLength(size)
    expect(matrix[0]).toHaveLength(size)
  })
})
