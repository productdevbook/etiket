/**
 * Optimal segment mode switching for QR codes
 *
 * Finds the cheapest way to split the input across numeric, alphanumeric and
 * byte segments. A shorter segment is not automatically better: every switch
 * costs a 4-bit mode indicator plus a version-dependent character count, so a
 * short numeric run inside alphanumeric text is cheaper left where it is.
 *
 * The search is a dynamic program over the three modes. Costs are tracked in
 * sixths of a bit so that the fractional per-character costs stay exact:
 * numeric is 10 bits per 3 characters (20 sixths each), alphanumeric 11 bits
 * per 2 characters (33 sixths each) and byte 8 bits per byte (48 sixths). A
 * partially filled group is only paid for once the segment ends, so the
 * running cost is rounded up to a whole bit at each mode switch.
 */

import type { QRSegment } from "./types"
import { getCharCountBits, ALPHANUMERIC_CHARS } from "./tables"
import { isKanjiChar } from "./kanji"

type Mode = "numeric" | "alphanumeric" | "byte" | "kanji"

const MODES: readonly Mode[] = ["numeric", "alphanumeric", "byte", "kanji"]
const NUMERIC = 0
const ALPHANUMERIC = 1
const BYTE = 2
const KANJI = 3
const MODE_COUNT = MODES.length

/** UTF-8 byte length of a single code point */
function utf8Length(char: string): number {
  const code = char.codePointAt(0)!
  if (code < 0x80) return 1
  if (code < 0x800) return 2
  if (code < 0x10000) return 3
  return 4
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9"
}

function isAlphanumeric(char: string): boolean {
  return ALPHANUMERIC_CHARS.includes(char)
}

/** Cost of one character in a mode, in sixths of a bit; Infinity if unusable */
function charCost(char: string, mode: number): number {
  switch (mode) {
    case NUMERIC:
      return isDigit(char) ? 20 : Infinity
    case ALPHANUMERIC:
      return isAlphanumeric(char) ? 33 : Infinity
    case KANJI:
      // 13 bits per character, and only for what Shift-JIS can hold
      return isKanjiChar(char) ? 78 : Infinity
    default:
      return utf8Length(char) * 48
  }
}

/** Round a sixths-of-a-bit cost up to a whole bit */
function roundToBit(cost: number): number {
  return Math.ceil(cost / 6) * 6
}

/**
 * Split text into segments that minimise the total encoded bit length.
 *
 * @param text - The text to segment
 * @param version - Target QR version; it sets the character-count width and
 *   therefore how expensive a mode switch is
 * @param headBits - What a segment header costs in each mode, in bits, when it
 *   is not QR's four bit indicator plus a version-dependent count. Micro QR
 *   passes its own: the indicator is one to three bits wide there, the counts
 *   are narrower, and a mode a version does not offer costs `Infinity`.
 */
export function optimizeSegments(
  text: string,
  version: number,
  headBits?: readonly number[],
): QRSegment[] {
  const chars = [...text]
  if (chars.length === 0) return []

  const headCost = headBits
    ? headBits.map((bits) => bits * 6)
    : MODES.map((mode) => (4 + getCharCountBits(version, mode)) * 6)

  // charModes[i][m] = the mode character i-1 was in, on the cheapest path that
  // puts character i in mode m
  const charModes: number[][] = []
  let prevCosts = headCost.slice()

  for (const char of chars) {
    const costs = Array.from<number>({ length: MODE_COUNT }).fill(Infinity)
    const from = Array.from<number>({ length: MODE_COUNT }).fill(-1)

    for (let mode = 0; mode < MODE_COUNT; mode++) {
      const perChar = charCost(char, mode)
      if (perChar === Infinity) continue

      // Staying in the same mode
      if (prevCosts[mode]! !== Infinity) {
        costs[mode] = prevCosts[mode]! + perChar
        from[mode] = mode
      }

      // Switching into this mode: the previous segment ends here, so its cost
      // is rounded up to a whole bit before the new header is added
      for (let previous = 0; previous < MODE_COUNT; previous++) {
        if (previous === mode || prevCosts[previous]! === Infinity) continue
        const switched = roundToBit(prevCosts[previous]!) + headCost[mode]! + perChar
        if (switched < costs[mode]!) {
          costs[mode] = switched
          from[mode] = previous
        }
      }
    }

    charModes.push(from)
    prevCosts = costs
  }

  // Cheapest terminal mode
  let endMode = BYTE
  for (let mode = 0; mode < MODE_COUNT; mode++) {
    if (roundToBit(prevCosts[mode]!) < roundToBit(prevCosts[endMode]!)) endMode = mode
  }

  // Walk the choices backwards to label every character with its mode
  const modeOfChar: number[] = Array.from({ length: chars.length })
  let mode = endMode
  for (let i = chars.length - 1; i >= 0; i--) {
    modeOfChar[i] = mode
    mode = charModes[i]![mode]!
  }

  return groupSegments(chars, modeOfChar)
}

/** Turn per-character modes into runs, then into segments */
function groupSegments(chars: string[], modeOfChar: number[]): QRSegment[] {
  const segments: QRSegment[] = []
  let start = 0

  for (let i = 1; i <= chars.length; i++) {
    if (i < chars.length && modeOfChar[i] === modeOfChar[start]) continue
    segments.push(makeSegment(chars.slice(start, i).join(""), modeOfChar[start]!))
    start = i
  }

  return segments
}

function makeSegment(text: string, mode: number): QRSegment {
  if (mode === BYTE) {
    const data = new TextEncoder().encode(text)
    return { mode: "byte", data, charCount: data.length }
  }
  // Kanji counts characters, and a kanji character is always one code unit here
  return { mode: MODES[mode]!, data: text, charCount: [...text].length }
}
