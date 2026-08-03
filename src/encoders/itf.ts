/**
 * Interleaved 2 of 5 (ITF) and ITF-14 barcode encoder
 */

import { InvalidInputError } from "../errors"

// Digit patterns: 5 elements each (N=1 narrow, W=3 wide)
const DIGIT_PATTERNS: number[][] = [
  [1, 1, 3, 3, 1], // 0: N N W W N
  [3, 1, 1, 1, 3], // 1: W N N N W
  [1, 3, 1, 1, 3], // 2: N W N N W
  [3, 3, 1, 1, 1], // 3: W W N N N
  [1, 1, 3, 1, 3], // 4: N N W N W
  [3, 1, 3, 1, 1], // 5: W N W N N
  [1, 3, 3, 1, 1], // 6: N W W N N
  [1, 1, 1, 3, 3], // 7: N N N W W
  [3, 1, 1, 3, 1], // 8: W N N W N
  [1, 3, 1, 3, 1], // 9: N W N W N
]

const START_PATTERN = [1, 1, 1, 1] // narrow bar, narrow space, narrow bar, narrow space
const STOP_PATTERN = [3, 1, 1] // wide bar, narrow space, narrow bar

/**
 * Validate that a string contains only digits
 */
function validateDigitsOnly(text: string): void {
  if (!/^\d+$/.test(text)) {
    throw new InvalidInputError("ITF barcode requires digits only (0-9)")
  }
}

/**
 * Calculate ITF-14 / EAN modulo 10 check digit
 */
function calculateCheckDigit(digits: number[]): number {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    // ITF-14 uses the same weighting as EAN: alternating 3 and 1 from the right
    // For a 13-digit input, position 0 gets weight 3, position 1 gets weight 1, etc.
    sum += digits[i]! * (i % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10
}

/**
 * Encode a digit pair into interleaved bar/space widths
 * First digit is encoded in bars, second in spaces
 * Returns 10 elements: bar, space, bar, space, bar, space, bar, space, bar, space
 */
function encodePair(d1: number, d2: number): number[] {
  const pattern1 = DIGIT_PATTERNS[d1]!
  const pattern2 = DIGIT_PATTERNS[d2]!
  const result: number[] = []

  for (let i = 0; i < 5; i++) {
    result.push(pattern1[i]!) // bar width from first digit
    result.push(pattern2[i]!) // space width from second digit
  }

  return result
}

/**
 * Encode an Interleaved 2 of 5 (ITF) barcode
 *
 * Input: string of digits (even count required; if odd, a leading 0 is prepended)
 * Returns: array of bar widths (alternating bar/space)
 */
export function encodeITF(text: string): number[] {
  validateDigitsOnly(text)

  // Prepend 0 if odd number of digits
  let digits = text
  if (digits.length % 2 !== 0) {
    digits = "0" + digits
  }

  const bars: number[] = []

  // Start pattern
  for (const w of START_PATTERN) {
    bars.push(w)
  }

  // Encode digit pairs
  for (let i = 0; i < digits.length; i += 2) {
    const d1 = digits.charCodeAt(i) - 48
    const d2 = digits.charCodeAt(i + 1) - 48
    const pair = encodePair(d1, d2)
    for (const w of pair) {
      bars.push(w)
    }
  }

  // Stop pattern
  for (const w of STOP_PATTERN) {
    bars.push(w)
  }

  return bars
}

/**
 * Encode an ITF-14 barcode
 *
 * Input: 13 digits (check digit auto-calculated) or 14 digits (with check digit)
 * Returns: array of bar widths (alternating bar/space)
 */
export function encodeITF14(text: string): number[] {
  validateDigitsOnly(text)

  let digits: string

  if (text.length === 13) {
    // Auto-calculate check digit
    const nums = text.split("").map(Number)
    const check = calculateCheckDigit(nums)
    digits = text + String(check)
  } else if (text.length === 14) {
    const nums = text.slice(0, 13).split("").map(Number)
    const expected = calculateCheckDigit(nums)
    const provided = Number(text[13])
    if (provided !== expected) {
      throw new InvalidInputError(
        `ITF-14 check digit mismatch: expected ${expected}, got ${provided}`,
      )
    }
    digits = text
  } else {
    throw new InvalidInputError("ITF-14 requires 13 or 14 digits")
  }

  // Encode using standard ITF (14 digits is already even)
  return encodeITF(digits)
}
