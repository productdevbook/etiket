/**
 * Data Matrix and bytes above 127.
 *
 * Base 256 carries every byte in one codeword behind a two codeword header.
 * ASCII spends two codewords on each byte above 127 — an Upper Shift and the
 * value — and C40 four, so text with accents in it was coming out a size class
 * or two larger than it needed to be. etiket only reached for Base 256 when the
 * input had a character Latin-1 could not hold at all, which meant never, for
 * European text.
 *
 * On 120 random messages over Latin-1 the symbol was larger than BWIPP's 101
 * times; over bytes above 127 alone, 115 times, twice by two size classes.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeDataMatrix } from "../src/index"
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

async function decodeBytes(matrix: boolean[][]): Promise<number[] | null> {
  const scale = 6
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
const HIGH = (random: () => number) => String.fromCharCode(128 + Math.floor(random() * 128))
const EUROPEAN = (random: () => number) => "abcdefghij ÀÉÎÕÜçñöüäß"[Math.floor(random() * 22)]!

describe("Data Matrix symbol size for bytes above 127", () => {
  it.each([
    ["the whole of Latin-1", LATIN1],
    ["bytes above 127", HIGH],
    ["European text", EUROPEAN],
  ])("is never larger than BWIPP's for %s", (_name, pick) => {
    for (const payload of payloads(9001, 120, 60, pick)) {
      expect(
        area(encodeDataMatrix(payload)),
        JSON.stringify(payload.slice(0, 24)),
      ).toBeLessThanOrEqual(area(bwipMatrix("datamatrix", escape(payload), { parse: true })))
    }
  })

  it("puts accented text in the symbol the reference does", () => {
    for (const payload of [
      "Zürich",
      "de-CH; Zürich; Bahnhofstrasse 1",
      "naïve résumé",
      "Größe: 42 cm",
      "ÀÉÎÕÜçñöüäß",
    ]) {
      expect(area(encodeDataMatrix(payload)), payload).toBeLessThanOrEqual(
        area(bwipMatrix("datamatrix", escape(payload), { parse: true })),
      )
    }
  })
})

describe("Data Matrix Base 256 round-trip", () => {
  it.each([
    ["the whole of Latin-1", LATIN1],
    ["bytes above 127", HIGH],
    ["European text", EUROPEAN],
  ])("carries %s back byte for byte", async (_name, pick) => {
    for (const payload of payloads(4711, 40, 60, pick)) {
      expect(await decodeBytes(encodeDataMatrix(payload)), JSON.stringify(payload)).toEqual(
        [...payload].map((ch) => ch.codePointAt(0)!),
      )
    }
  })

  // The length field is one codeword up to 249 bytes and two beyond it
  it.each([248, 249, 250, 251, 300, 500])(
    "carries a %i byte run, across the length field boundary",
    async (length) => {
      let payload = ""
      for (let i = 0; i < length; i++) payload += String.fromCharCode(128 + (i % 128))
      expect(await decodeBytes(encodeDataMatrix(payload))).toEqual(
        [...payload].map((ch) => ch.codePointAt(0)!),
      )
    },
  )
})
