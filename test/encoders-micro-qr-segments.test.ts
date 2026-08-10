/**
 * Micro QR segmentation, and the codeword M1 and M3 finish on.
 *
 * Two things here, both found by putting the encoder next to BWIPP:
 *
 * - A Micro QR message is split into segments the way a full QR message is, so
 *   a run of digits inside a byte message costs ten bits per three characters
 *   rather than eight bits each. One mode used to be chosen for the whole
 *   message, which sent some payloads to a symbol one size class larger than
 *   they needed.
 * - M1 and M3 finish on a four bit data codeword. Every whole codeword before
 *   it takes the alternating 11101100 / 00010001 pad pattern and only that last
 *   four bits is zero filled (ISO/IEC 18004 7.4.10). etiket zero filled all of
 *   it, which still decodes — a reader stops at the character count — but is
 *   not the symbol the standard describes, and no test could see it.
 *
 * BWIPP is the oracle for the module data. It takes the smallest symbol that
 * holds the message and then the strongest error correction level that still
 * fits in it, so these comparisons ask etiket for the same symbol rather than
 * for its own default, which is L.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeMicroQR } from "../src/index"
import { bwipMatrix } from "./_bwip"

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

/**
 * etiket's symbol for a payload at the level BWIPP would have chosen: the
 * strongest one that still fits the symbol size BWIPP settled on.
 */
function atBwipLevel(payload: string, size: number): boolean[][] {
  let chosen: boolean[][] | undefined
  for (const ecLevel of ["L", "M", "Q"] as const) {
    let matrix: boolean[][]
    try {
      matrix = encodeMicroQR(payload, { ecLevel })
    } catch {
      continue // the level does not reach a symbol this small
    }
    if (matrix.length === size) chosen = matrix
  }
  if (!chosen) throw new Error(`no EC level gives etiket a ${size}x${size} symbol for ${payload}`)
  return chosen
}

function expectMatchesBwip(payload: string): void {
  const theirs = bwipMatrix("microqrcode", payload)
  expect(rows(atBwipLevel(payload, theirs.length)), JSON.stringify(payload)).toEqual(rows(theirs))
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

const NUMERIC = "0123456789"
const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 $%*+-./:"
const BYTE = "abcdefghijklmnopqrstuvwxyz~"
const MIXED = "ABCdef123 /:xyZ$%*+-.abcXYZ789"

async function decode(matrix: boolean[][]): Promise<string | null> {
  const scale = 8
  const margin = 4
  const size = matrix.length
  const width = (size + margin * 2) * scale
  const data = new Uint8ClampedArray(width * width * 4)
  data.fill(255)
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const r = Math.floor(y / scale) - margin
      const c = Math.floor(x / scale) - margin
      if (r >= 0 && r < size && c >= 0 && c < size && matrix[r]![c]) {
        const idx = (y * width + x) * 4
        data[idx] = 0
        data[idx + 1] = 0
        data[idx + 2] = 0
      }
    }
  }
  const results = await readBarcodes({ data, width, height: width } as ImageData, {
    tryHarder: true,
  })
  return results[0]?.text ?? null
}

describe("Micro QR against BWIPP", () => {
  // A single mode holds the whole message, so both implementations have the
  // same one segment to encode and the module data has to agree exactly
  it("matches for numeric messages", () => {
    for (const payload of payloads(2024, 40, NUMERIC, 30)) expectMatchesBwip(payload)
  })

  it("matches for alphanumeric messages", () => {
    for (const payload of payloads(1201, 40, ALPHANUMERIC, 20)) expectMatchesBwip(payload)
  })

  it("matches for byte messages", () => {
    for (const payload of payloads(555, 40, BYTE, 14)) expectMatchesBwip(payload)
  })

  // These were all wrong before the padding fix: the data agreed and every pad
  // codeword after it did not
  it.each(["vd", "igor", "AV/YOCS", "a", "Z", "7", "hello world"])(
    "pads %j the way the standard does",
    (payload) => {
      expectMatchesBwip(payload)
    },
  )

  it("never reaches for a larger symbol than BWIPP", () => {
    let compared = 0
    for (const payload of payloads(31_415, 120, MIXED, 12)) {
      const theirs = bwipMatrix("microqrcode", payload)
      expect(encodeMicroQR(payload).length, JSON.stringify(payload)).toBeLessThanOrEqual(
        theirs.length,
      )
      compared++
    }
    expect(compared).toBe(120)
  })
})

describe("Micro QR segmentation", () => {
  it("splits a mixed message rather than paying byte mode for all of it", () => {
    // Ten characters, four of them lowercase. As one byte segment that is
    // 6 + 80 bits and needs M4; split, it fits M3
    const payload = "D/4K9XG*sw"
    expect(encodeMicroQR(payload)).toHaveLength(15)
    expect(encodeMicroQR(payload, { version: 3 })).toEqual(encodeMicroQR(payload))
  })

  it("breaks a digit run out of an alphanumeric message", () => {
    // Alphanumeric costs 11 bits per two characters, numeric 10 per three, and
    // the digit run here is long enough to be worth its own segment header:
    // 65 bits split against 72 in one segment, which is the difference between
    // fitting M3 at level M and not
    expect(encodeMicroQR("A0123456789Z", { version: 3, ecLevel: "M" })).toHaveLength(15)
  })

  it("keeps a single segment when splitting would cost more", () => {
    // Two lowercase letters either side of one digit: a numeric segment header
    // costs more than the two bits it would save
    expect(encodeMicroQR("ab1cd")).toEqual(encodeMicroQR("ab1cd", { version: 3 }))
  })

  it("decodes every mixed message back byte for byte", async () => {
    for (const payload of payloads(99, 30, MIXED, 12)) {
      expect(await decode(encodeMicroQR(payload)), JSON.stringify(payload)).toBe(payload)
    }
  })

  it("still refuses a mode the pinned version cannot carry", () => {
    // Splitting must not open a back door into M1 and M2, which have no byte
    // mode however the message is divided
    expect(() => encodeMicroQR("12a45", { version: 1 })).toThrow(/numeric only/)
    expect(() => encodeMicroQR("AB1cd", { version: 2 })).toThrow(/numeric only|cannot encode/)
  })
})
