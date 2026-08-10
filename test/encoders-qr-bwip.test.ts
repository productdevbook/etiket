/**
 * QR Code against BWIPP.
 *
 * QR was verified by decoding alone — jsQR and zxing both read the symbols
 * back — which proves the data survives but not that the segmentation, the
 * block structure or the module placement are the ones ISO/IEC 18004
 * describes. This compares the modules themselves.
 *
 * Two things have to be held level for that to mean anything:
 *
 * - **The error correction level.** BWIPP treats `eclevel` as a floor and then
 *   raises it to the strongest level that still fits the version it picked, so
 *   asking it for L can return a symbol at H. The comparison reads the level
 *   back out of BWIPP's own format information and asks etiket for that.
 * - **The mask.** ISO/IEC 18004 scores the eight masks and takes the lowest,
 *   but the four penalty rules leave room for reading: whether the format
 *   information is part of the symbol being scored, and whether the light area
 *   beside a finder-like pattern may run off the edge of the symbol. BWIPP and
 *   Zint — two independent implementations — pick the same mask as each other
 *   for only 41% of payloads, so this is not something one of them is right
 *   about. The comparison pins etiket to BWIPP's mask and checks everything
 *   else.
 *
 * What is left after those two is the part that has a right answer, and it
 * agrees exactly.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeQR } from "../src/index"
import { bwipMatrix } from "./_bwip"

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

/** The error correction level and mask a QR symbol declares. */
function readFormat(matrix: boolean[][]): { ecLevel: "L" | "M" | "Q" | "H"; mask: 0 } {
  const bits: number[] = []
  for (const col of [0, 1, 2, 3, 4, 5, 7, 8]) bits.push(matrix[8]![col] ? 1 : 0)
  for (const row of [7, 5, 4, 3, 2, 1, 0]) bits.push(matrix[row]![8] ? 1 : 0)
  let value = 0
  for (const bit of bits) value = (value << 1) | bit
  value ^= 0x5412 // the format information mask of ISO/IEC 18004 8.9
  return {
    ecLevel: (["M", "L", "H", "Q"] as const)[(value >> 13) & 3]!,
    mask: ((value >> 10) & 7) as 0,
  }
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

/**
 * Deterministic payloads that switch alphabet character by character, which is
 * what puts the segment boundaries under pressure.
 */
function mixedPayloads(seed: number, count: number, maxLength: number): string[] {
  const ALPHABETS = [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    " $%*+-./:",
    ".,;()!?@#",
  ]
  let state = seed
  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
  const out: string[] = []
  for (let n = 0; n < count; n++) {
    const length = 1 + Math.floor(random() * maxLength)
    let payload = ""
    for (let i = 0; i < length; i++) {
      const alphabet = ALPHABETS[Math.floor(random() * ALPHABETS.length)]!
      payload += alphabet[Math.floor(random() * alphabet.length)]
    }
    out.push(payload)
  }
  return out
}

async function decode(matrix: boolean[][]): Promise<string | null> {
  const scale = 6
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
        const i = (y * width + x) * 4
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
    }
  }
  const results = await readBarcodes({ data, width, height: width } as ImageData, {
    tryHarder: true,
    formats: ["QRCode"],
  })
  return results[0]?.text ?? null
}

/** etiket's symbol for the level and mask BWIPP settled on. */
function matched(payload: string, theirs: boolean[][]): boolean[][] {
  const { ecLevel, mask } = readFormat(theirs)
  return encodeQR(payload, { ecLevel, mask })
}

describe("QR Code against BWIPP", () => {
  it.each([
    ["numeric", "0123456789"],
    ["alphanumeric", "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 $%*+-./:"],
    ["byte", "abcdefghijklmnopqrstuvwxyz"],
    ["Latin-1", "abcdéèêëàâÀÉÎ"],
    ["mixed", "ABCabc123 .,;()!?@#$%"],
  ])("matches for %s messages at every level", (_name, alphabet) => {
    let compared = 0
    for (const requested of ["L", "M", "Q", "H"] as const) {
      for (const payload of payloads(2468, 30, alphabet, 100)) {
        const theirs = bwipMatrix("qrcode", payload, { eclevel: requested })
        expect(rows(matched(payload, theirs)), `${requested} ${JSON.stringify(payload)}`).toEqual(
          rows(theirs),
        )
        compared++
      }
    }
    expect(compared).toBe(120)
  })

  // Long messages, up to version 40, where the version selection and the
  // interleaved Reed-Solomon blocks that come with it are doing the work
  it.each([
    ["numeric", "0123456789"],
    ["alphanumeric", "ABCDEFGHIJ0123456789 -."],
    ["byte", "abcdefghij"],
  ])("matches for long %s messages", (_name, alphabet) => {
    for (const payload of payloads(97, 12, alphabet, 900)) {
      for (const requested of ["L", "H"] as const) {
        const theirs = bwipMatrix("qrcode", payload, { eclevel: requested })
        expect(rows(matched(payload, theirs)), `${requested} ${payload.length} characters`).toEqual(
          rows(theirs),
        )
      }
    }
  })
})

describe("QR Code segmentation against BWIPP", () => {
  /**
   * Messages that change character class constantly. etiket splits them into
   * segments by shortest path, BWIPP by its own rule, and where the two costs
   * tie the symbols differ without either being worse. The symbol is never
   * larger, and the ones that differ still read back.
   */
  it("is never larger, and still decodes where it differs", async () => {
    let identical = 0
    let tied = 0
    for (const payload of mixedPayloads(2468, 150, 80)) {
      const theirs = bwipMatrix("qrcode", payload, { eclevel: "L" })
      const mine = matched(payload, theirs)
      expect(mine.length, JSON.stringify(payload)).toBeLessThanOrEqual(theirs.length)
      if (mine.length === theirs.length && rows(mine).join() === rows(theirs).join()) identical++
      else {
        tied++
        expect(await decode(mine), JSON.stringify(payload)).toBe(payload)
      }
    }
    expect(identical + tied).toBe(150)
    expect(identical).toBeGreaterThanOrEqual(140)
  })

  /**
   * Long messages that alternate between the alphanumeric set and byte mode,
   * where the split is worth the most. etiket takes the cheapest one there is,
   * which at level H reaches a 137 module symbol where BWIPP needs 141.
   */
  it("is never larger for long mixed messages", async () => {
    let smaller = 0
    for (const payload of payloads(97, 12, "ABCabc0123456789 -.", 900)) {
      for (const requested of ["L", "H"] as const) {
        const theirs = bwipMatrix("qrcode", payload, { eclevel: requested })
        const mine = matched(payload, theirs)
        expect(mine.length, `${requested} ${payload.length} characters`).toBeLessThanOrEqual(
          theirs.length,
        )
        // Reading a version 30 symbol back is slow, so only the ones where
        // etiket claims a smaller symbol than the reference are decoded
        if (mine.length < theirs.length) {
          smaller++
          expect(await decode(mine), `${requested} ${payload.length} characters`).toBe(payload)
        }
      }
    }
    expect(smaller).toBeGreaterThan(0)
  })
})
