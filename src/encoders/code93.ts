/**
 * Code 93 and Code 93 Extended barcode encoder
 * Higher density than Code 39, with two mandatory check digits (C and K)
 * Each character encoded as 9 modules (3 bars, 3 spaces)
 */

import { InvalidInputError } from "../errors"

// Code 93 character set (47 characters + 4 shift characters)
const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%"
// Shift characters at indices 43-46: ($), (%), (/), (+)

// Binary patterns for each character value (9 modules, 1=bar, 0=space)
const BINARY_PATTERNS: string[] = [
  "100010100", // 0: '0'
  "101001000", // 1: '1'
  "101000100", // 2: '2'
  "101000010", // 3: '3'
  "100101000", // 4: '4'
  "100100100", // 5: '5'
  "100100010", // 6: '6'
  "101010000", // 7: '7'
  "100010010", // 8: '8'
  "100001010", // 9: '9'
  "110101000", // 10: 'A'
  "110100100", // 11: 'B'
  "110100010", // 12: 'C'
  "110010100", // 13: 'D'
  "110010010", // 14: 'E'
  "110001010", // 15: 'F'
  "101101000", // 16: 'G'
  "101100100", // 17: 'H'
  "101100010", // 18: 'I'
  "100110100", // 19: 'J'
  "100011010", // 20: 'K'
  "101011000", // 21: 'L'
  "101001100", // 22: 'M'
  "101000110", // 23: 'N'
  "100101100", // 24: 'O'
  "100010110", // 25: 'P'
  "110110100", // 26: 'Q'
  "110110010", // 27: 'R'
  "110101100", // 28: 'S'
  "110100110", // 29: 'T'
  "110010110", // 30: 'U'
  "110011010", // 31: 'V'
  "101101100", // 32: 'W'
  "101100110", // 33: 'X'
  "100110110", // 34: 'Y'
  "100111010", // 35: 'Z'
  "100101110", // 36: '-'
  "111010100", // 37: '.'
  "111010010", // 38: ' '
  "111001010", // 39: '$'
  "101101110", // 40: '/'
  "101110110", // 41: '+'
  "110101110", // 42: '%'
  "100100110", // 43: ($) shift
  "111011010", // 44: (%) shift
  "111010110", // 45: (/) shift
  "100110010", // 46: (+) shift
]

const START_STOP_BINARY = "101011110"

/**
 * Convert a binary pattern string (e.g. '101001000') to bar/space widths
 * Starting with bar (1s), alternating bar/space
 */
function binaryToWidths(binary: string): number[] {
  const widths: number[] = []
  let i = 0
  while (i < binary.length) {
    const currentBit = binary[i]
    let count = 0
    while (i < binary.length && binary[i] === currentBit) {
      count++
      i++
    }
    widths.push(count)
  }
  return widths
}

// Pre-compute all width patterns
const WIDTH_PATTERNS: number[][] = BINARY_PATTERNS.map(binaryToWidths)
const START_STOP_PATTERN: number[] = binaryToWidths(START_STOP_BINARY)

// Extended ASCII mapping: each ASCII char (0-127) maps to a sequence of Code 93 values
// Shift characters: ($)=43, (%)=44, (/)=45, (+)=46
const EXTENDED_MAP: (number[] | null)[] = buildExtendedMap()

function buildExtendedMap(): (number[] | null)[] {
  const map: (number[] | null)[] = Array.from<number[] | null>({ length: 128 }).fill(null)

  // ASCII 0: (%U)
  map[0] = [44, 30]

  // ASCII 1-26: ($A) through ($Z)
  for (let i = 1; i <= 26; i++) {
    map[i] = [43, i + 9] // ($) + A-Z
  }

  // ASCII 27-31: (%A) through (%E)
  for (let i = 27; i <= 31; i++) {
    map[i] = [44, i - 27 + 10] // (%) + A-E
  }

  // ASCII 32 (space): native value 38
  map[32] = [38]

  // ASCII 33-47: punctuation and symbols
  map[33] = [45, 10] // ! = (/A)
  map[34] = [45, 11] // " = (/B)
  map[35] = [45, 12] // # = (/C)
  map[36] = [39] // $ (native)
  map[37] = [42] // % (native)
  map[38] = [45, 15] // & = (/F)
  map[39] = [45, 16] // ' = (/G)
  map[40] = [45, 17] // ( = (/H)
  map[41] = [45, 18] // ) = (/I)
  map[42] = [45, 19] // * = (/J)
  map[43] = [41] // + (native)
  map[44] = [45, 21] // , = (/L)
  map[45] = [36] // - (native)
  map[46] = [37] // . (native)
  map[47] = [40] // / (native)

  // ASCII 48-57: digits 0-9 (native values 0-9)
  for (let i = 48; i <= 57; i++) {
    map[i] = [i - 48]
  }

  // ASCII 58-64: punctuation
  map[58] = [45, 35] // : = (/Z)
  map[59] = [44, 15] // ; = (%F)
  map[60] = [44, 16] // < = (%G)
  map[61] = [44, 17] // = = (%H)
  map[62] = [44, 18] // > = (%I)
  map[63] = [44, 19] // ? = (%J)
  map[64] = [44, 31] // @ = (%V)

  // ASCII 65-90: A-Z (native values 10-35)
  for (let i = 65; i <= 90; i++) {
    map[i] = [i - 55]
  }

  // ASCII 91-96: brackets and related
  map[91] = [44, 20] // [ = (%K)
  map[92] = [44, 21] // \ = (%L)
  map[93] = [44, 22] // ] = (%M)
  map[94] = [44, 23] // ^ = (%N)
  map[95] = [44, 24] // _ = (%O)
  map[96] = [44, 32] // ` = (%W)

  // ASCII 97-122: a-z = (+A) through (+Z)
  for (let i = 97; i <= 122; i++) {
    map[i] = [46, i - 87] // (+) + A-Z
  }

  // ASCII 123-127: braces and special
  map[123] = [44, 25] // { = (%P)
  map[124] = [44, 26] // | = (%Q)
  map[125] = [44, 27] // } = (%R)
  map[126] = [44, 28] // ~ = (%S)
  map[127] = [44, 29] // DEL = (%T)

  return map
}

/**
 * Look up the Code 93 value for a native character
 */
function charToValue(ch: string): number {
  const idx = CHARSET.indexOf(ch)
  if (idx === -1) {
    throw new InvalidInputError(
      `Invalid Code 93 character: '${ch}'. Valid characters: 0-9, A-Z, -, ., space, $, /, +, %`,
    )
  }
  return idx
}

/**
 * Calculate check digit C (modulo 47, weights cycle 1-20 from right)
 */
function calculateCheckC(values: number[]): number {
  let sum = 0
  const len = values.length
  for (let i = 0; i < len; i++) {
    const weight = ((len - 1 - i) % 20) + 1
    sum += values[i]! * weight
  }
  return sum % 47
}

/**
 * Calculate check digit K (modulo 47, weights cycle 1-15 from right)
 * Includes check digit C in the calculation
 */
function calculateCheckK(values: number[]): number {
  let sum = 0
  const len = values.length
  for (let i = 0; i < len; i++) {
    const weight = ((len - 1 - i) % 15) + 1
    sum += values[i]! * weight
  }
  return sum % 47
}

/**
 * Encode text as Code 93 barcode
 * Input must only contain characters from the Code 93 native set:
 * 0-9, A-Z, -, ., space, $, /, +, %
 * Returns array of bar widths (alternating bar/space)
 */
export function encodeCode93(text: string): number[] {
  if (text.length === 0) {
    throw new InvalidInputError("Code 93 input must not be empty")
  }

  // Convert text to values
  const values: number[] = []
  for (const ch of text) {
    values.push(charToValue(ch))
  }

  // Calculate check digits
  const checkC = calculateCheckC(values)
  const valuesWithC = [...values, checkC]
  const checkK = calculateCheckK(valuesWithC)

  // Build bar widths
  const bars: number[] = []

  // Start sentinel
  for (const w of START_STOP_PATTERN) {
    bars.push(w)
  }

  // Data characters
  for (const val of values) {
    for (const w of WIDTH_PATTERNS[val]!) {
      bars.push(w)
    }
  }

  // Check digit C
  for (const w of WIDTH_PATTERNS[checkC]!) {
    bars.push(w)
  }

  // Check digit K
  for (const w of WIDTH_PATTERNS[checkK]!) {
    bars.push(w)
  }

  // Stop sentinel
  for (const w of START_STOP_PATTERN) {
    bars.push(w)
  }

  // Termination bar (single module bar)
  bars.push(1)

  return bars
}

/**
 * Encode text as Code 93 Extended barcode
 * Supports full ASCII (0-127) via shift character pairs
 * Returns array of bar widths (alternating bar/space)
 */
export function encodeCode93Extended(text: string): number[] {
  if (text.length === 0) {
    throw new InvalidInputError("Code 93 Extended input must not be empty")
  }

  // Convert full ASCII text to Code 93 values using extended mapping
  const values: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0 || code > 127) {
      throw new InvalidInputError(
        `Code 93 Extended only supports ASCII characters (0-127), got character code ${code} at position ${i}`,
      )
    }
    const mapping = EXTENDED_MAP[code]
    if (mapping === null) {
      throw new InvalidInputError(
        `No Code 93 Extended mapping for character code ${code} at position ${i}`,
      )
    }
    for (const val of mapping) {
      values.push(val)
    }
  }

  // Calculate check digits
  const checkC = calculateCheckC(values)
  const valuesWithC = [...values, checkC]
  const checkK = calculateCheckK(valuesWithC)

  // Build bar widths
  const bars: number[] = []

  // Start sentinel
  for (const w of START_STOP_PATTERN) {
    bars.push(w)
  }

  // Data characters
  for (const val of values) {
    for (const w of WIDTH_PATTERNS[val]!) {
      bars.push(w)
    }
  }

  // Check digit C
  for (const w of WIDTH_PATTERNS[checkC]!) {
    bars.push(w)
  }

  // Check digit K
  for (const w of WIDTH_PATTERNS[checkK]!) {
    bars.push(w)
  }

  // Stop sentinel
  for (const w of START_STOP_PATTERN) {
    bars.push(w)
  }

  // Termination bar (single module bar)
  bars.push(1)

  return bars
}
