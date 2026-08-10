/**
 * Royal Mail Mailmark 2D.
 *
 * Not a symbology of its own — a Data Matrix of a fixed size carrying a fixed
 * data layout — so what is under test is the size the barcode type picks, the
 * data Royal Mail accepts, and agreement with BWIPP over the character set the
 * spec allows.
 */

import { describe, expect, it } from "vitest"
import { encodeMailmark } from "../src/encoders/mailmark"
import { encodeDataMatrix } from "../src/encoders/datamatrix/index"
import { InvalidInputError } from "../src/errors"
import { bwipMatrix } from "./_bwip"

const HEADER = "JGB 012100123456789AB19XY1A 0                "

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

/** Deterministic payloads over the character set Royal Mail allows. */
function payloads(seed: number, count: number, extra: number): string[] {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 "
  let state = seed
  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
  const out: string[] = []
  for (let n = 0; n < count; n++) {
    let payload = "JGB "
    const length = 45 + Math.floor(random() * (extra + 1))
    for (let i = 4; i < length; i++) payload += ALPHABET[Math.floor(random() * ALPHABET.length)]
    out.push(payload)
  }
  return out
}

describe("Mailmark", () => {
  it.each([
    [7, 24, 24],
    [9, 32, 32],
    [29, 16, 48],
  ] as const)("barcode type %i is %ix%i", (type, height, width) => {
    const matrix = encodeMailmark(HEADER, { type })
    expect(matrix).toHaveLength(height)
    expect(matrix[0]).toHaveLength(width)
  })

  it("defaults to type 7", () => {
    expect(encodeMailmark(HEADER)).toEqual(encodeMailmark(HEADER, { type: 7 }))
  })

  it("is the Data Matrix of the same data at the same size", () => {
    expect(encodeMailmark(HEADER, { type: 9 })).toEqual(
      encodeDataMatrix(HEADER, { symbolSize: "32x32" }),
    )
  })

  it("rejects data that is not Mailmark", () => {
    expect(() => encodeMailmark("XXX 0121001234567")).toThrow(/JGB/)
    expect(() => encodeMailmark("JGB 0121")).toThrow(/at least 45/)
    expect(() => encodeMailmark(HEADER.slice(0, 44) + "a")).toThrow(/uppercase/)
    expect(() => encodeMailmark(HEADER, { type: 8 as 7 })).toThrow(InvalidInputError)
  })

  it.each([7, 9, 29] as const)("matches bwip-js for type %i", (type) => {
    // 24x24 holds only the header; the larger types take customer content too
    const extra = type === 7 ? 0 : type === 9 ? 6 : 5
    for (const payload of payloads(1234 + type, 20, extra)) {
      expect(rows(encodeMailmark(payload, { type })), JSON.stringify(payload)).toEqual(
        rows(bwipMatrix("mailmark", payload, { type: String(type) })),
      )
    }
  })
})
