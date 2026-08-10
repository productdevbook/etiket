/**
 * Randomised round trips for the linear symbologies.
 *
 * The 1D round-trip tests each pin a handful of hand-picked payloads, which is
 * enough to catch a broken table and not enough to catch a mis-taken branch.
 * Code 128 in particular chooses between three code sets, a shift, and the
 * FNC4 escape that carries the upper half of Latin-1 — and one of those
 * branches was wrong:
 *
 * A SHIFT borrows a single Code A character without leaving Code B. It cannot
 * carry an FNC4 with it, because the FNC4 would land in the wrong code set. The
 * encoder took the shift for any control character with printable text after
 * it, whether or not the reader was latched into the upper half — so a control
 * character following a run of accented ones came back 128 higher than it went
 * in. `[..., 204, 22, 79]` read back as `[..., 204, 150, 79]`.
 *
 * These sweeps throw a few hundred payloads over each encoder's whole
 * character set and compare the *bytes* that come back, since a reader guesses
 * a character set for anything above 127.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeBars } from "../src/index"
import { bwipBars, trimTrailingSpace, widthRanks } from "./_bwip"

/** Render a bar/space width sequence, wide enough for a reader to find. */
async function decodeBytes(bars: number[]): Promise<number[] | null> {
  const unit = 4
  const quiet = 40
  const width = bars.reduce((sum, run) => sum + run, 0) * unit + quiet * 2
  const height = 180
  const data = new Uint8ClampedArray(width * height * 4)
  data.fill(255)
  let x = quiet
  for (const [index, run] of bars.entries()) {
    const runWidth = run * unit
    if (index % 2 === 0) {
      for (let px = x; px < x + runWidth; px++) {
        for (let y = 0; y < height; y++) {
          const i = (y * width + px) * 4
          data[i] = 0
          data[i + 1] = 0
          data[i + 2] = 0
        }
      }
    }
    x += runWidth
  }
  const results = await readBarcodes({ data, width, height } as ImageData, { tryHarder: true })
  const bytes = results[0]?.bytes
  return bytes ? [...bytes] : null
}

function bytesOf(text: string): number[] {
  return [...text].map((ch) => ch.codePointAt(0)!)
}

/** Deterministic payloads over a character set. */
function payloads(seed: number, count: number, maxLength: number, alphabet: string): string[] {
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

const ASCII = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)).join("")
const LATIN1 = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i)).join("")

describe("Code 128 over the whole of Latin-1", () => {
  // The payload the FNC4 shift defect was found from
  it("carries a control character out of a latched upper half run", async () => {
    const codes = [212, 161, 188, 201, 229, 66, 41, 74, 241, 204, 22, 79]
    const payload = codes.map((code) => String.fromCharCode(code)).join("")
    expect(await decodeBytes(encodeBars(payload, { type: "code128" }))).toEqual(codes)
  })

  it.each([
    [4242, 30],
    [777, 60],
    [99, 12],
    [31_337, 100],
  ])(
    "carries random messages back byte for byte (seed %i, up to %i characters)",
    async (seed, maxLength) => {
      for (const payload of payloads(seed, 60, maxLength, LATIN1)) {
        expect(
          await decodeBytes(encodeBars(payload, { type: "code128" })),
          JSON.stringify(payload),
        ).toEqual(bytesOf(payload))
      }
    },
  )
})

describe("the other linear symbologies over their character sets", () => {
  // No %, $, / or + here: a reader offered those in a plain Code 39 symbol may
  // read them as the extended escapes instead of as themselves
  it.each([
    ["code128", ASCII, 40],
    ["code39", "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. ", 30],
    ["code93", "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. ", 30],
  ] as const)("%s", async (type, alphabet, maxLength) => {
    for (const payload of payloads(1234, 40, maxLength, alphabet)) {
      expect(await decodeBytes(encodeBars(payload, { type })), JSON.stringify(payload)).toEqual(
        bytesOf(payload),
      )
    }
  })

  // A reader will not commit to a symbol with only a character or two in it
  it("codabar", async () => {
    for (const payload of payloads(1234, 40, 20, "0123456789-$:/.+")) {
      const framed = `A${payload.padEnd(4, "0")}B`
      expect(await decodeBytes(encodeBars(framed, { type: "codabar" })), framed).toEqual(
        bytesOf(framed),
      )
    }
  })

  it("itf", async () => {
    for (const payload of payloads(1234, 40, 20, "0123456789")) {
      const digits = payload.padEnd(6, "0")
      const even = digits.length % 2 === 0 ? digits : `${digits}0`
      expect(await decodeBytes(encodeBars(even, { type: "itf" })), even).toEqual(bytesOf(even))
    }
  })
})

/**
 * The extended forms escape every ASCII character a plain symbol cannot carry
 * into a pair the reader puts back together. zxing hands the escapes back
 * rather than the characters, so BWIPP is the oracle for these — and it wants
 * to be asked for the Code 93 check characters that etiket always writes.
 */
describe("the extended forms against BWIPP", () => {
  it.each([
    ["code39ext", {}],
    ["code93ext", { includecheck: true }],
  ] as const)("%s", (type, options) => {
    for (const payload of payloads(1234, 60, 20, ASCII)) {
      expect(
        widthRanks(trimTrailingSpace(encodeBars(payload, { type }))),
        JSON.stringify(payload),
      ).toEqual(widthRanks(bwipBars(type, payload, options)))
    }
  })
})
