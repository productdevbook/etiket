/**
 * MaxiCode against BWIPP.
 *
 * MaxiCode was reaching v1 verified by decoding alone: zxing reads the symbols
 * back, which proves the data survives but says nothing about whether the
 * codewords, the interleaving or the module placement are the ones the standard
 * describes. A symbol can decode and still be a different symbol from the
 * reference's.
 *
 * BWIPP reports MaxiCode as a list of dark hexagon indices rather than a module
 * grid, which is part of why so little compared them — `bwipMaxiCode` in
 * `_bwip.ts` converts it. The one thing that list leaves out is the central
 * bullseye, drawn as rings rather than hexagons; `BULLSEYE` below names those
 * 36 cells and the comparison asserts the difference is confined to them rather
 * than masking them away.
 *
 * What the sweeps caught was the code set routing. etiket used to latch and
 * shift between the five code sets by rule — latch if four or more characters
 * follow, otherwise shift — and that is a character or two short of optimal on
 * punctuation heavy text. The encoder now finds the shortest route, and these
 * comparisons hold it to producing the reference's symbol and not merely one of
 * the same size, over uppercase, lowercase, mixed case, punctuation, digits,
 * random Latin-1 across all 256 byte values, and the structured carrier
 * messages of modes 2 and 3.
 */

import { describe, expect, it } from "vitest"
import { encodeMaxiCode } from "../src/index"
import { bwipMaxiCode } from "./_bwip"

/**
 * The central bullseye, which BWIPP draws as rings rather than as hexagons and
 * so leaves out of its module list. Dark in every etiket symbol, light in every
 * BWIPP one.
 */
const BULLSEYE = new Set([
  343, 344, 372, 376, 400, 403, 404, 407, 430, 432, 436, 438, 461, 463, 464, 466, 490, 493, 495,
  498, 521, 523, 524, 526, 550, 552, 556, 558, 580, 583, 584, 587, 612, 616, 643, 644,
])

/**
 * Compare two symbols outside the bullseye, and check the bullseye itself is
 * exactly the difference it is supposed to be.
 */
function expectSame(mine: boolean[][], theirs: boolean[][], label: string): void {
  const differences: string[] = []
  const bullseyeWrong: string[] = []
  for (let r = 0; r < 33; r++) {
    for (let c = 0; c < 30; c++) {
      if (BULLSEYE.has(r * 30 + c)) {
        if (!mine[r]![c] || theirs[r]![c]) bullseyeWrong.push(`${r},${c}`)
      } else if (mine[r]![c] !== theirs[r]![c]) {
        differences.push(`${r},${c}`)
      }
    }
  }
  expect(bullseyeWrong, `${label}: bullseye`).toEqual([])
  expect(differences, `${label}: ${differences.length} modules differ`).toEqual([])
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

// No run of nine digits can occur in these, so both encoders take the same
// route through the code sets
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ "
const LOWER = "abcdefghijklmnopqrstuvwxyz "
const MIXED = "AbCdEfGhIjKlM nOpQrStUvWxYz"
const PUNCT = "ABCdef .,-/:%$*+"

describe("MaxiCode against BWIPP", () => {
  it.each([4, 5, 6] as const)("matches for uppercase text in mode %i", (mode) => {
    for (const payload of payloads(11 + mode, 25, UPPER, 60)) {
      expectSame(encodeMaxiCode(payload, { mode }), bwipMaxiCode(payload, { mode }), payload)
    }
  })

  it.each([4, 5, 6] as const)("matches for lowercase text in mode %i", (mode) => {
    for (const payload of payloads(202 + mode, 25, LOWER, 60)) {
      expectSame(encodeMaxiCode(payload, { mode }), bwipMaxiCode(payload, { mode }), payload)
    }
  })

  // Mixed case is the case that exercises the shift and latch decisions: every
  // character alternates between Code Set A and Code Set B
  it.each([4, 5] as const)("matches for mixed case text in mode %i", (mode) => {
    for (const payload of payloads(303 + mode, 25, MIXED, 40)) {
      expectSame(encodeMaxiCode(payload, { mode }), bwipMaxiCode(payload, { mode }), payload)
    }
  })

  it("matches for punctuation", () => {
    for (const payload of payloads(404, 25, PUNCT, 50)) {
      expectSame(encodeMaxiCode(payload, { mode: 4 }), bwipMaxiCode(payload, { mode: 4 }), payload)
    }
  })

  // Code Sets C, D and E hold the upper half of Latin-1 between them, which is
  // where the two-codeword locks and the shifts between non-A sets live.
  // bwip-js takes its input as UTF-8, so the bytes are escaped to keep both
  // encoders looking at the same message
  it("matches for Latin-1 characters, which reach the other three code sets", () => {
    const escape = (text: string): string => {
      let out = ""
      for (const ch of text) {
        const byte = ch.codePointAt(0)!
        out += byte > 126 || byte < 32 || byte === 94 ? `^${String(byte).padStart(3, "0")}` : ch
      }
      return out
    }
    for (const payload of [
      "ÀÉÎÕÜ",
      "café",
      "naïve résumé",
      "£100",
      "±5°C",
      "«quoted»",
      "ÀÁÂÃÄÅÆÇÈÉ",
      "àáâãäåæçèé",
      "\x80\x90\xa0\xb0",
      "AÀaà1",
    ]) {
      expectSame(
        encodeMaxiCode(payload, { mode: 4 }),
        bwipMaxiCode(escape(payload), { mode: 4, parse: true }),
        payload,
      )
    }
  })

  // Random messages over the whole of Latin-1, where every code set and every
  // move between them is in play
  it("matches over Latin-1 at random", () => {
    let state = 8080
    const random = () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff
      return state / 0x7fffffff
    }
    for (let n = 0; n < 40; n++) {
      const length = 1 + Math.floor(random() * 30)
      let payload = ""
      let escaped = ""
      for (let i = 0; i < length; i++) {
        const byte = Math.floor(random() * 256)
        payload += String.fromCodePoint(byte)
        escaped +=
          byte > 126 || byte < 32 || byte === 94
            ? `^${String(byte).padStart(3, "0")}`
            : payload.at(-1)
      }
      expectSame(
        encodeMaxiCode(payload, { mode: 4 }),
        bwipMaxiCode(escaped, { mode: 4, parse: true }),
        JSON.stringify(payload),
      )
    }
  })

  // Digit runs of nine or more, where the Numeric Sequence codeword competes
  // with encoding the digits one at a time
  it("matches for digits", () => {
    for (const payload of payloads(707, 30, "0123456789", 60)) {
      expectSame(encodeMaxiCode(payload, { mode: 4 }), bwipMaxiCode(payload, { mode: 4 }), payload)
    }
  })

  it("matches for digits mixed into text", () => {
    for (const payload of payloads(808, 30, "0123456789ABCdef ", 50)) {
      expectSame(encodeMaxiCode(payload, { mode: 4 }), bwipMaxiCode(payload, { mode: 4 }), payload)
    }
  })

  // The structured carrier message: postal code, ISO country code and service
  // class in the primary message, everything else in the secondary. BWIPP takes
  // the three primary fields as the head of its input, separated by GS
  it.each([
    { mode: 2 as const, postalCode: "152382802", countryCode: 840, serviceClass: 1, text: "UPSN" },
    { mode: 2 as const, postalCode: "999999999", countryCode: 840, serviceClass: 999, text: "ABC" },
    {
      mode: 2 as const,
      postalCode: "123456789",
      countryCode: 840,
      serviceClass: 1,
      text: "UPS TEST",
    },
    { mode: 2 as const, postalCode: "1234", countryCode: 250, serviceClass: 42, text: "PKG" },
    { mode: 2 as const, postalCode: "12345", countryCode: 840, serviceClass: 999, text: "SHIP" },
    { mode: 2 as const, postalCode: "1", countryCode: 4, serviceClass: 68, text: "A" },
    { mode: 3 as const, postalCode: "B1AA1A", countryCode: 124, serviceClass: 68, text: "UPSN" },
    { mode: 3 as const, postalCode: "EC1A1B", countryCode: 826, serviceClass: 1, text: "DHL DATA" },
    { mode: 3 as const, postalCode: "AB12", countryCode: 276, serviceClass: 7, text: "PARCEL" },
    { mode: 3 as const, postalCode: "KA11", countryCode: 826, serviceClass: 1, text: "TEST" },
  ])("matches the structured carrier message of mode $mode, $postalCode", (options) => {
    const GS = "\x1d"
    const primary = [
      options.postalCode,
      String(options.countryCode).padStart(3, "0"),
      String(options.serviceClass).padStart(3, "0"),
    ].join(GS)
    expectSame(
      encodeMaxiCode(options.text, options),
      bwipMaxiCode(`${primary}${GS}${options.text}`, { mode: options.mode }),
      `mode ${options.mode} ${options.postalCode}`,
    )
  })

  // The cases that were pinned by name before there was a sweep
  it.each([
    ["upper case", "HELLO WORLD", 4],
    ["mixed case", "Hello World", 4],
    ["a numeric run", "ORDER 123456789012345678 END", 4],
    ["enhanced error correction", "EEC MODE FIVE", 5],
  ] as const)("matches for %s", (_name, text, mode) => {
    expectSame(encodeMaxiCode(text, { mode }), bwipMaxiCode(text, { mode }), text)
  })
})

/**
 * The module comparisons above would still pass if both encoders were equally
 * wasteful, so this measures the thing that actually costs a user something:
 * the longest payload of each shape that still fits the symbol.
 */
describe("MaxiCode capacity against BWIPP", () => {
  const SHAPES: Record<string, string> = {
    digits: "1234567890",
    upper: "ABCDEFGHIJ",
    lower: "abcdefghij",
    mixedCase: "aBcDeFgHiJ",
    alphanumeric: "A1B2C3D4E5",
    lowercaseDigits: "a1b2c3d4e5",
    punctuation: "A.B,C/D:E-",
    digitBlocks: "123456789ABC",
  }

  /** Longest payload of this shape the encoder accepts, up to 200 characters. */
  function limit(shape: string, encode: (text: string) => unknown): number {
    let length = 0
    while (length < 200) {
      const text = shape.repeat(20).slice(0, length + 1)
      try {
        encode(text)
      } catch {
        return length
      }
      length++
    }
    return length
  }

  it.each([4, 5] as const)("reaches the same length as BWIPP in mode %i", (mode) => {
    for (const [name, shape] of Object.entries(SHAPES)) {
      const mine = limit(shape, (text) => encodeMaxiCode(text, { mode }))
      const theirs = limit(shape, (text) => bwipMaxiCode(text, { mode }))
      expect(mine, `${name} in mode ${mode}`).toBe(theirs)
      expect(mine).toBeGreaterThan(40)
    }
  })
})
