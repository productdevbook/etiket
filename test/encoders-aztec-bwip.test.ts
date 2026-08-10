/**
 * Aztec against BWIPP.
 *
 * Aztec picks between five text modes and a binary shift, and until the route
 * was searched rather than guessed the encoder broke a binary run for every
 * character that happened to fit a text mode — a fresh ten-bit header each
 * time — and chose between latching and shifting by looking one character
 * ahead. That left the symbol a size class larger than the reference on 43 of
 * 200 random Latin-1 messages, and on a GS1 Digital Link URL.
 *
 * These comparisons hold it to two things at once: never larger than BWIPP's
 * symbol, and the same symbol wherever the two agree on the route. bwip-js
 * reads its input as UTF-8, so the bytes are escaped for it.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeAztec } from "../src/index"
import { bwipMatrix } from "./_bwip"

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

function escape(text: string): string {
  let out = ""
  for (const ch of text) {
    const byte = ch.codePointAt(0)!
    out += byte > 126 || byte < 32 || byte === 94 ? `^${String(byte).padStart(3, "0")}` : ch
  }
  return out
}

function reference(payload: string): boolean[][] {
  return bwipMatrix("azteccode", escape(payload), { parse: true, format: "compact" })
}

async function decodeBytes(matrix: boolean[][]): Promise<number[] | null> {
  const scale = 5
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
    formats: ["Aztec"],
  })
  const bytes = results[0]?.bytes
  return bytes ? [...bytes] : null
}

/** Deterministic payloads from a character generator. */
function payloads(
  seed: number,
  count: number,
  maxLength: number,
  pick: (random: () => number) => string,
): string[] {
  let state = seed
  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
  const out: string[] = []
  for (let n = 0; n < count; n++) {
    let payload = ""
    const length = 1 + Math.floor(random() * maxLength)
    for (let i = 0; i < length; i++) payload += pick(random)
    out.push(payload)
  }
  return out
}

const LATIN1 = (random: () => number) => String.fromCharCode(Math.floor(random() * 256))
const PRINTABLE = (random: () => number) => String.fromCharCode(32 + Math.floor(random() * 95))
const ALNUM = (random: () => number) =>
  "ABCDEFGHIJabcdefghij0123456789 "[Math.floor(random() * 31)]!
const PUNCTUATION = (random: () => number) => ". , : \r\nABCabc123"[Math.floor(random() * 17)]!

/** The kind of thing an Aztec symbol is put on a label for. */
const REAL = [
  "https://example.com/p/12345",
  "https://id.gs1.org/01/09521234543213/10/ABC123",
  "1Z999AA10123456784",
  "PN:ABC-1234/REV-B SN:0000123456",
  "MFR:ACME;PN:XJ-9931;LOT:20260401;QTY:250",
  "01095212345432131719260401",
  "user@example.com",
  "BEGIN:VCARD VERSION:3.0 FN:Ada Lovelace END:VCARD",
  "Order #4417 / 2026-04-01 / EUR 129.90",
  '{"id":4417,"ok":true}',
  "/api/v1/items?id=4417&sort=asc",
  "ABCDEFGHIJKLMNOP",
  "abcdefghijklmnop",
  "0000000000000000000000000000",
]

describe("Aztec symbol size against BWIPP", () => {
  it.each([
    ["Latin-1", 2024, LATIN1],
    ["printable ASCII", 2024, PRINTABLE],
    ["letters and digits", 2024, ALNUM],
    ["punctuation pairs", 99, PUNCTUATION],
  ] as const)("is never larger for %s", (_name, seed, pick) => {
    let smaller = 0
    for (const payload of payloads(seed, 120, 40, pick)) {
      const mine = encodeAztec(payload, { compact: true })
      const theirs = reference(payload)
      expect(mine.length, JSON.stringify(payload)).toBeLessThanOrEqual(theirs.length)
      if (mine.length < theirs.length) smaller++
    }
    // Not merely never larger: the search finds symbols the reference does not
    expect(smaller).toBeGreaterThan(0)
  })

  it("is never larger for real payloads, and smaller for two of them", () => {
    let smaller = 0
    for (const payload of REAL) {
      const mine = encodeAztec(payload, { compact: true })
      const theirs = reference(payload)
      expect(mine.length, JSON.stringify(payload)).toBeLessThanOrEqual(theirs.length)
      if (mine.length < theirs.length) smaller++
    }
    expect(smaller).toBe(2)
  })
})

describe("Aztec against BWIPP", () => {
  // Where both take the same route the symbols have to be the same symbol
  it("matches module for module for real payloads it agrees on", () => {
    let identical = 0
    for (const payload of REAL) {
      const mine = encodeAztec(payload, { compact: true })
      const theirs = reference(payload)
      if (mine.length !== theirs.length) continue
      expect(rows(mine), JSON.stringify(payload)).toEqual(rows(theirs))
      identical++
    }
    expect(identical).toBe(12)
  })

  it.each([
    ["Latin-1", 2024, LATIN1, 80],
    ["printable ASCII", 2024, PRINTABLE, 80],
    ["letters and digits", 2024, ALNUM, 70],
  ] as const)("matches for most random %s messages", (_name, seed, pick, floor) => {
    let identical = 0
    let differing = 0
    for (const payload of payloads(seed, 120, 40, pick)) {
      const mine = encodeAztec(payload, { compact: true })
      const theirs = reference(payload)
      if (mine.length !== theirs.length) continue
      if (rows(mine).join() === rows(theirs).join()) identical++
      else differing++
    }
    // The rest are ties: a different route of the same length
    expect(identical + differing).toBeGreaterThan(0)
    expect(identical).toBeGreaterThanOrEqual(floor)
  })
})

describe("Aztec round-trip", () => {
  it.each([
    ["Latin-1", 31_337, LATIN1, 40],
    ["printable ASCII", 777, PRINTABLE, 40],
    ["punctuation pairs", 99, PUNCTUATION, 50],
    ["long messages", 4242, PRINTABLE, 400],
  ] as const)("carries %s back byte for byte", async (_name, seed, pick, maxLength) => {
    for (const payload of payloads(seed, 40, maxLength, pick)) {
      expect(await decodeBytes(encodeAztec(payload)), JSON.stringify(payload)).toEqual(
        [...payload].map((ch) => ch.codePointAt(0)!),
      )
    }
  })
})
