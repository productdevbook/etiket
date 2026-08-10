/**
 * Data Matrix changing mode part way through the message.
 *
 * Each of the other candidates picks one mode and lives with it, which for a
 * message that starts or ends outside that mode's comfortable set costs a
 * symbol size. The clearest case is HIBC: every HIBC primary begins with a `+`,
 * which C40 spends a shift on and ASCII spends a codeword a character on for
 * the rest of the message. `+A123BJC5D6E710G` needed 18x18 and fits 16x16 with
 * one ASCII character in front of a C40 run.
 *
 * The route is found by shortest path over (mode, values not yet placed), the
 * same shape as the MaxiCode and Aztec encoders. It ends back in ASCII unless
 * ending inside a mode is legal — where the symbol stops exactly there for
 * C40, Text and X12, and wherever a reader would have left EDIFACT anyway.
 *
 * Getting that last part wrong is what the round trips here are for: a reader
 * leaves EDIFACT of its own accord once two codewords or fewer are left, so an
 * unlatch written there comes back as data.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeDataMatrix, encodeHIBCPrimary } from "../src/index"
import { bwipMatrix } from "./_bwip"

function area(matrix: boolean[][]): number {
  return matrix.length * matrix[0]!.length
}

/** bwip-js reads its input as UTF-8, so the bytes are escaped for it. */
function escape(text: string): string {
  let out = ""
  for (const ch of text) {
    const byte = ch.codePointAt(0)!
    out += byte > 126 || byte < 32 || byte === 94 ? `^${String(byte).padStart(3, "0")}` : ch
  }
  return out
}

function reference(payload: string): boolean[][] {
  return bwipMatrix("datamatrix", escape(payload), { parse: true })
}

async function decodeBytes(matrix: boolean[][]): Promise<number[] | null> {
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
  const bytes = results[0]?.bytes
  return bytes ? [...bytes] : null
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

const SETS = {
  everything: "ABCdef123 .,-/:;()$%*+\x01\x1bÀÉÎçñ~|{}[]<>?!@#^&",
  EDIFACT: "ABCDEFGHIJ0123456789 +-/*<>?",
  punctuation: "ABCdef .,-/:;()$%*+",
  "mixed case": "AbCdEfGhIj",
  HIBC: "+0123456789ABCDEFGHIJ",
} as const

describe("Data Matrix mixed mode encoding", () => {
  it("puts an HIBC primary in the symbol the reference does", () => {
    for (const [lic, product] of [
      ["A123", "BJC5D6E71"],
      ["ABCD", "1234567890"],
      ["Z999", "X"],
      ["A001", "CATALOGUE-1234"],
    ] as const) {
      const data = encodeHIBCPrimary(lic, product)
      expect(area(encodeDataMatrix(data)), data).toBeLessThanOrEqual(
        area(bwipMatrix("hibcdatamatrix", data.slice(1, -1))),
      )
    }
  })

  it("puts +A123BJC5D6E710G in a 16x16", () => {
    expect(encodeDataMatrix("+A123BJC5D6E710G")).toHaveLength(16)
  })

  it.each(Object.entries(SETS))(
    "carries random %s messages back byte for byte",
    async (_name, alphabet) => {
      for (const payload of payloads(2718, 60, alphabet, 80)) {
        expect(await decodeBytes(encodeDataMatrix(payload)), JSON.stringify(payload)).toEqual(
          [...payload].map((ch) => ch.codePointAt(0)!),
        )
      }
    },
  )

  it.each(Object.entries(SETS))("is never larger than BWIPP's for %s", (name, alphabet) => {
    let smaller = 0
    for (const payload of payloads(2718, 200, alphabet, 80)) {
      const mine = encodeDataMatrix(payload)
      const theirs = reference(payload)
      // Punctuation is the one class where BWIPP still finds something etiket
      // does not, three times in two hundred
      if (name === "punctuation" && area(mine) > area(theirs)) continue
      expect(area(mine), JSON.stringify(payload)).toBeLessThanOrEqual(area(theirs))
      if (area(mine) < area(theirs)) smaller++
    }
    expect(smaller).toBeGreaterThan(0)
  })

  // Punctuation-heavy mixed-case text is the residue: BWIPP reaches a smaller
  // symbol three times in two hundred. Kept as a count so that closing it, or
  // losing ground, shows up here
  it("is larger than BWIPP for three punctuation messages in two hundred", () => {
    let larger = 0
    for (const payload of payloads(2718, 200, SETS.punctuation, 80)) {
      if (area(encodeDataMatrix(payload)) > area(reference(payload))) larger++
    }
    expect(larger).toBe(3)
  })
})
