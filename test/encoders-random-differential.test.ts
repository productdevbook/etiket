/**
 * Randomised differential testing against BWIPP.
 *
 * The formats with no decoder are pinned by a handful of hand-picked payloads
 * each, which is enough to catch a broken table and not enough to catch a
 * mis-taken branch: Code 16K alone chooses between fourteen shift and latch
 * moves, and a fixed sample list reaches perhaps half of them. These sweeps
 * throw a few hundred payloads over a deliberately awkward alphabet — control
 * characters, lower case, digit runs of both parities — at each encoder and
 * compare every module against the reference.
 *
 * The generator is seeded, so a failure is reproducible: the payload is printed
 * with the assertion.
 */

import { describe, expect, it } from "vitest"
import { bwipMatrix } from "./_bwip"
import { encodeCodablockF } from "../src/encoders/codablock-f"
import { encodeCode16K } from "../src/encoders/code16k"
import { encodeDotCode } from "../src/encoders/dotcode"

/** Deterministic generator: the same seed always yields the same payloads. */
function makeRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

const ALPHABETS = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  " .,-/:;()$%*+",
  "\x01\x02\x03\x04\x05\x1b\x1f",
]

/** `count` payloads mixing the alphabets, up to `maxLength` characters. */
function payloads(seed: number, count: number, maxLength: number): string[] {
  const random = makeRandom(seed)
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

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

describe("randomised differential against bwip-js", () => {
  it("Code 16K over 200 payloads", () => {
    const QUIET_ZONE = 10
    const ROW_MODULES = 70
    for (const payload of payloads(4242, 200, 30)) {
      const expected = bwipMatrix("code16k", payload).map((row) =>
        row
          .slice(QUIET_ZONE, QUIET_ZONE + ROW_MODULES)
          .map((m) => (m ? "1" : "0"))
          .join(""),
      )
      expect(rows(encodeCode16K(payload).matrix), JSON.stringify(payload)).toEqual(expected)
    }
  })

  /**
   * The moves random payloads rarely land on: a shift out of Code C needs an
   * even digit run, one to three letters, and another even digit run, which
   * uniform characters almost never produce.
   */
  it("Code 16K shift and latch boundaries", () => {
    const QUIET_ZONE = 10
    const ROW_MODULES = 70
    const BOUNDARIES = [
      "\x01a\x02", // one B character shifted out of A
      "\x01ab\x02", // two
      "\x01abcd", // and the latch, once shifting stops paying
      "\x011234\x02", // two digit pairs shifted out of A
      "\x01123456\x02", // three
      "\x0112345678", // and the latch
      "a\x01b", // one A character shifted out of B
      "a\x01\x02b", // two
      "a\x01\x02\x03\x04", // and the latch
      "a1234b", // two digit pairs shifted out of B
      "a123456b", // three
      "a12345678", // and the latch
      "1234a5678", // one B character shifted out of C
      "1234ab56789", // two, before an odd run
      "1234ab5678", // two, before an even one
      "1234abc56789", // three, before an odd run
      "1234abc5678", // three, before an even one
      "1234\x01\x02", // and the latch back to A
      "1234abcd5678", // four: past what a shift can carry
    ]
    for (const payload of BOUNDARIES) {
      const expected = bwipMatrix("code16k", payload).map((row) =>
        row
          .slice(QUIET_ZONE, QUIET_ZONE + ROW_MODULES)
          .map((m) => (m ? "1" : "0"))
          .join(""),
      )
      expect(rows(encodeCode16K(payload).matrix), JSON.stringify(payload)).toEqual(expected)
    }
  })

  it("DotCode over 150 payloads", () => {
    for (const payload of payloads(777, 150, 20)) {
      expect(rows(encodeDotCode(payload)), JSON.stringify(payload)).toEqual(
        rows(bwipMatrix("dotcode", payload)),
      )
    }
  })

  /**
   * Binary mode and the structured append macros, which random ASCII never
   * reaches. etiket encodes a JavaScript string as UTF-8, so the reference gets
   * the same bytes rather than the same characters.
   */
  it("DotCode binary mode and macro headers", () => {
    const escape = (text: string): string => {
      let out = ""
      for (const byte of new TextEncoder().encode(text)) {
        out +=
          byte > 126 || byte < 32 || byte === 94
            ? `^${String(byte).padStart(3, "0")}`
            : String.fromCharCode(byte)
      }
      return out
    }
    const CASES = [
      "éê", // two bytes of binary
      "éêëìíîïðñ", // a run long enough to latch
      "ABéêCD", // binary between text
      "éê12345678", // binary then digits
      "12345678éê", // and the other way round
      "[)>05DATA", // the macro headers
      "[)>06DATA",
      "[)>12DATA",
      "[)>99DATA",
    ]
    for (const payload of CASES) {
      expect(rows(encodeDotCode(payload)), JSON.stringify(payload)).toEqual(
        rows(bwipMatrix("dotcode", escape(payload), { parse: true })),
      )
    }
  })

  it("Codablock F over 150 payloads", () => {
    for (const payload of payloads(31337, 150, 30)) {
      expect(rows(encodeCodablockF(payload).matrix), JSON.stringify(payload)).toEqual(
        rows(bwipMatrix("codablockf", payload)),
      )
    }
  })
})
