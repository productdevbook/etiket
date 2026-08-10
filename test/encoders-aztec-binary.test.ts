/**
 * Aztec bytes that no text mode can carry.
 *
 * Two defects, both silent: the symbol scanned, and the bytes that came back
 * were not the bytes that went in.
 *
 * - **NUL was encoded as Mixed codeword 0**, which is the shift into
 *   Punctuation, not NUL. Aztec has no codeword for NUL in any mode; it goes
 *   out through the binary shift. `"AB\0CD"` came back as `AB{` and two
 *   punctuation characters.
 * - **A binary shift starting in Digit mode emitted codeword 15**, which is
 *   Upper Shift. Digit has no binary shift of its own, so a run starting there
 *   has to latch to Upper first. `"123\x80"` came back as `"123 6"`.
 *
 * Neither was caught because the round trips never put a byte outside the text
 * modes next to digits, and nothing compared Aztec against the reference.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeAztec } from "../src/index"
import { bwipMatrix } from "./_bwip"

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
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

/** Decode back to bytes: a reader guesses a character set, the bytes are the data. */
async function decodeBytes(matrix: boolean[][]): Promise<number[] | null> {
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
    formats: ["Aztec"],
  })
  const bytes = results[0]?.bytes
  return bytes ? [...bytes] : null
}

function bytesOf(text: string): number[] {
  return [...text].map((ch) => ch.codePointAt(0)!)
}

describe("Aztec binary shift", () => {
  it.each([
    ["a lone NUL", "\x00"],
    ["NUL before text", "\x00A"],
    ["NUL after text", "A\x00"],
    ["NUL between text", "AB\x00CD"],
    ["NUL between digits", "1\x002"],
    ["a run of NULs", "\x00\x00\x00"],
    ["a high byte after digits", "123\x80"],
    ["high bytes after digits", "123456\x80\x81"],
    ["a high byte after a digit run", "0000\xff"],
    ["high bytes between digits and text", "12345678\x80\x81\x82ABC"],
    ["a high byte after a punctuation pair", ". 123\x80"],
    ["every byte a text mode cannot carry", "\x00\x80\x81\xfe\xff"],
  ])("carries %s", async (_name, payload) => {
    expect(await decodeBytes(encodeAztec(payload))).toEqual(bytesOf(payload))
  })

  it.each([
    ["the whole of Latin-1", 31_337, 256, 0],
    ["ASCII", 555, 128, 0],
    ["printable ASCII", 777, 95, 32],
  ] as const)("carries random messages over %s", async (_name, seed, range, base) => {
    let state: number = seed
    const random = () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff
      return state / 0x7fffffff
    }
    for (let n = 0; n < 60; n++) {
      const length = 1 + Math.floor(random() * 40)
      let payload = ""
      for (let i = 0; i < length; i++) {
        payload += String.fromCharCode(base + Math.floor(random() * range))
      }
      expect(await decodeBytes(encodeAztec(payload)), JSON.stringify(payload)).toEqual(
        bytesOf(payload),
      )
    }
  })

  // The reference agrees module for module on the short cases the fixes were
  // found from, which is a stronger statement than "it decodes"
  it.each(["\x00", "\x00A", "A\x00", "AB\x00CD", "\x00\x00\x00", "\x01", "A", "hello"])(
    "matches bwip-js for %j",
    (payload) => {
      expect(rows(encodeAztec(payload, { compact: true }))).toEqual(
        rows(bwipMatrix("azteccode", escape(payload), { parse: true, format: "compact" })),
      )
    },
  )
})
