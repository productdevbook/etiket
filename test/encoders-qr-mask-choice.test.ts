/**
 * Which mask etiket picks.
 *
 * `encoders-qr-bwip.test.ts` pins etiket to BWIPP's mask so that everything
 * else can be compared; nothing pins the choice itself. That leaves the eight
 * candidate evaluations — the slowest part of encoding a QR code by some way —
 * free to be made faster without anyone noticing if the answer changed.
 *
 * So this reads the mask back out of the format information for a spread of
 * payloads, versions and error correction levels, and holds it.
 */

import { describe, expect, it } from "vitest"
import { encodeQR, encodeMicroQR } from "../src/index"

/** The error correction level and mask a QR symbol declares. */
function readFormat(matrix: boolean[][]): { ecLevel: string; mask: number } {
  const bits: number[] = []
  for (const col of [0, 1, 2, 3, 4, 5, 7, 8]) bits.push(matrix[8]![col] ? 1 : 0)
  for (const row of [7, 5, 4, 3, 2, 1, 0]) bits.push(matrix[row]![8] ? 1 : 0)
  let value = 0
  for (const bit of bits) value = (value << 1) | bit
  value ^= 0x5412
  return { ecLevel: ["M", "L", "H", "Q"][(value >> 13) & 3]!, mask: (value >> 10) & 7 }
}

/** Micro QR's format information is a table lookup, not a field of its own. */
const FORMAT_INFO_MICRO = [
  0x4445, 0x4172, 0x4e2b, 0x4b1c, 0x55ae, 0x5099, 0x5fc0, 0x5af7, 0x6793, 0x62a4, 0x6dfd, 0x68ca,
  0x7678, 0x734f, 0x7c16, 0x7921, 0x06de, 0x03e9, 0x0cb0, 0x0987, 0x1735, 0x1202, 0x1d5b, 0x186c,
  0x2508, 0x203f, 0x2f66, 0x2a51, 0x34e3, 0x31d4, 0x3e8d, 0x3bba,
]

function readMicroMask(matrix: boolean[][]): number {
  let value = 0
  for (let i = 0; i < 8; i++) if (matrix[i + 1]![8]) value |= 1 << i
  for (let i = 0; i < 8; i++) if (matrix[8]![i + 1]) value |= 1 << (14 - i)
  return FORMAT_INFO_MICRO.indexOf(value) & 3
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

describe("QR mask selection", () => {
  it.each([
    ["Hello, World!", 5],
    ["https://example.com/p/12345", 6],
    ["0123456789", 0],
    ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5],
    ["abcdefghijklmnopqrstuvwxyz", 7],
    ["A", 3],
    ["éèê", 7],
  ])("picks a mask for %j", (payload, mask) => {
    expect(readFormat(encodeQR(payload)).mask).toBe(mask)
  })

  it.each(["L", "M", "Q", "H"] as const)("picks a mask at level %s", (ecLevel) => {
    const masks = payloads(2468, 30, "ABCabc0123456789 -.", 120).map(
      (payload) => readFormat(encodeQR(payload, { ecLevel })).mask,
    )
    // The whole run, so that any change to the scoring shows up here
    expect(masks.join("")).toMatchSnapshot()
  })

  it("picks a mask for long messages, where the eight candidates cost the most", () => {
    const masks = payloads(97, 8, "ABCabc0123456789 -.", 900).map(
      (payload) => readFormat(encodeQR(payload)).mask,
    )
    expect(masks.join("")).toMatchSnapshot()
  })

  it("honours a mask that is asked for", () => {
    for (let mask = 0; mask < 8; mask++) {
      expect(readFormat(encodeQR("MASKED", { mask: mask as 0 })).mask).toBe(mask)
    }
  })
})

describe("Micro QR mask selection", () => {
  it("picks a mask", () => {
    const masks = payloads(1357, 30, "ABC0123456789", 12).map((payload) =>
      readMicroMask(encodeMicroQR(payload)),
    )
    expect(masks.join("")).toMatchSnapshot()
  })

  it("honours a mask that is asked for", () => {
    for (let mask = 0; mask < 4; mask++) {
      expect(readMicroMask(encodeMicroQR("1234", { mask: mask as 0 }))).toBe(mask)
    }
  })
})
