/**
 * EAN-13 and EAN-8 barcode encoder
 */

import { InvalidInputError } from "../errors"

// Encoding patterns for digits
// L = left odd parity, G = left even parity, R = right
const L_PATTERNS: number[][] = [
  [3, 2, 1, 1], // 0
  [2, 2, 2, 1], // 1
  [2, 1, 2, 2], // 2
  [1, 4, 1, 1], // 3
  [1, 1, 3, 2], // 4
  [1, 2, 3, 1], // 5
  [1, 1, 1, 4], // 6
  [1, 3, 1, 2], // 7
  [1, 2, 1, 3], // 8
  [3, 1, 1, 2], // 9
]

const R_PATTERNS: number[][] = [
  [3, 2, 1, 1], // 0
  [2, 2, 2, 1], // 1
  [2, 1, 2, 2], // 2
  [1, 4, 1, 1], // 3
  [1, 1, 3, 2], // 4
  [1, 2, 3, 1], // 5
  [1, 1, 1, 4], // 6
  [1, 3, 1, 2], // 7
  [1, 2, 1, 3], // 8
  [3, 1, 1, 2], // 9
]

// G patterns (used for EAN-13 left side based on first digit)
const G_PATTERNS: number[][] = [
  [1, 1, 2, 3], // 0 (reverse of L)
  [1, 2, 2, 2], // 1
  [2, 2, 1, 2], // 2
  [1, 1, 4, 1], // 3
  [2, 3, 1, 1], // 4
  [1, 3, 2, 1], // 5
  [4, 1, 1, 1], // 6
  [2, 1, 3, 1], // 7
  [3, 1, 2, 1], // 8
  [2, 1, 1, 3], // 9
]

// First digit encoding for EAN-13 (which left digits use L vs G)
// 0 = L pattern, 1 = G pattern
const FIRST_DIGIT_ENCODING: number[][] = [
  [0, 0, 0, 0, 0, 0], // 0
  [0, 0, 1, 0, 1, 1], // 1
  [0, 0, 1, 1, 0, 1], // 2
  [0, 0, 1, 1, 1, 0], // 3
  [0, 1, 0, 0, 1, 1], // 4
  [0, 1, 1, 0, 0, 1], // 5
  [0, 1, 1, 1, 0, 0], // 6
  [0, 1, 0, 1, 0, 1], // 7
  [0, 1, 0, 1, 1, 0], // 8
  [0, 1, 1, 0, 1, 0], // 9
]

const GUARD_START = [1, 1, 1] // bar, space, bar
const GUARD_CENTER = [1, 1, 1, 1, 1] // space, bar, space, bar, space
const GUARD_END = [1, 1, 1] // bar, space, bar

/**
 * Calculate EAN check digit
 */
function calculateCheckDigit(digits: number[]): number {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i]! * (i % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

/**
 * Encode EAN-13 barcode
 * Input: 12 or 13 digit string (13th is check digit, auto-calculated if 12)
 */
export function encodeEAN13(text: string): { bars: number[]; guards: number[] } {
  const digits = text.replace(/\D/g, "").split("").map(Number)

  if (digits.length === 12) {
    digits.push(calculateCheckDigit(digits))
  } else if (digits.length === 13) {
    const expected = calculateCheckDigit(digits.slice(0, 12))
    if (digits[12] !== expected) {
      throw new InvalidInputError(
        `EAN-13 check digit mismatch: expected ${expected}, got ${digits[12]}`,
      )
    }
  } else {
    throw new InvalidInputError("EAN-13 requires 12 or 13 digits")
  }

  const firstDigit = digits[0]!
  const encoding = FIRST_DIGIT_ENCODING[firstDigit]!

  const bars: number[] = []
  const guards: number[] = [] // positions of guard bars for rendering

  // Start guard
  let pos = 0
  guards.push(pos)
  for (const w of GUARD_START) {
    bars.push(w)
    pos++
  }

  // Left 6 digits (digits[1] through digits[6])
  for (let i = 0; i < 6; i++) {
    const digit = digits[i + 1]!
    const pattern = encoding[i] === 0 ? L_PATTERNS[digit]! : G_PATTERNS[digit]!
    for (const w of pattern) {
      bars.push(w)
      pos++
    }
  }

  // Center guard
  guards.push(pos)
  for (const w of GUARD_CENTER) {
    bars.push(w)
    pos++
  }

  // Right 6 digits (digits[7] through digits[12])
  for (let i = 0; i < 6; i++) {
    const digit = digits[i + 7]!
    const pattern = R_PATTERNS[digit]!
    for (const w of pattern) {
      bars.push(w)
      pos++
    }
  }

  // End guard
  guards.push(pos)
  for (const w of GUARD_END) {
    bars.push(w)
    pos++
  }

  return { bars, guards }
}

/**
 * Encode EAN-8 barcode
 * Input: 7 or 8 digit string (8th is check digit, auto-calculated if 7)
 */
export function encodeEAN8(text: string): { bars: number[]; guards: number[] } {
  const digits = text.replace(/\D/g, "").split("").map(Number)

  if (digits.length === 7) {
    digits.push(calculateCheckDigit(digits))
  } else if (digits.length === 8) {
    const expected = calculateCheckDigit(digits.slice(0, 7))
    if (digits[7] !== expected) {
      throw new InvalidInputError(
        `EAN-8 check digit mismatch: expected ${expected}, got ${digits[7]}`,
      )
    }
  } else {
    throw new InvalidInputError("EAN-8 requires 7 or 8 digits")
  }

  const bars: number[] = []
  const guards: number[] = []

  // Start guard
  let pos = 0
  guards.push(pos)
  for (const w of GUARD_START) {
    bars.push(w)
    pos++
  }

  // Left 4 digits (L encoding only)
  for (let i = 0; i < 4; i++) {
    const digit = digits[i]!
    const pattern = L_PATTERNS[digit]!
    for (const w of pattern) {
      bars.push(w)
      pos++
    }
  }

  // Center guard
  guards.push(pos)
  for (const w of GUARD_CENTER) {
    bars.push(w)
    pos++
  }

  // Right 4 digits
  for (let i = 0; i < 4; i++) {
    const digit = digits[i + 4]!
    const pattern = R_PATTERNS[digit]!
    for (const w of pattern) {
      bars.push(w)
      pos++
    }
  }

  // End guard
  guards.push(pos)
  for (const w of GUARD_END) {
    bars.push(w)
    pos++
  }

  return { bars, guards }
}
