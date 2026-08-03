/**
 * Code 11 barcode encoder
 * Encodes digits 0-9 and dash (-)
 * Includes automatic check digits (C and optionally K)
 */

import { InvalidInputError } from "../errors"

// Code 11 character patterns: 6 elements each
// First 5 elements are BSBSB (the character itself)
// 6th element is the trailing inter-character space
// Narrow = 1, Wide = 2
// Source: BWIPP (Barcode Writer in Pure PostScript) reference
const PATTERNS: number[][] = [
  [1, 1, 1, 1, 2, 1], // 0
  [2, 1, 1, 1, 2, 1], // 1
  [1, 2, 1, 1, 2, 1], // 2
  [2, 2, 1, 1, 1, 1], // 3
  [1, 1, 2, 1, 2, 1], // 4
  [2, 1, 2, 1, 1, 1], // 5
  [1, 2, 2, 1, 1, 1], // 6
  [1, 1, 1, 2, 2, 1], // 7
  [2, 1, 1, 2, 1, 1], // 8
  [2, 1, 1, 1, 1, 1], // 9
  [1, 1, 2, 1, 1, 1], // 10 = '-'
]

// Start/stop pattern (6 elements: BSBSB + trailing space)
const START_STOP = [1, 1, 2, 2, 1, 1]

// Character set for mapping
const CHARSET = "0123456789-"

// Character value lookup
const CHAR_VALUES = new Map<string, number>()
for (let i = 0; i < CHARSET.length; i++) {
  CHAR_VALUES.set(CHARSET[i]!, i)
}

/**
 * Calculate check digit C
 * Weighted sum from right, weights cycle 1 through 10
 * Result mod 11; if 10, the check digit character is '-'
 */
function calculateCheckC(values: number[]): number {
  let sum = 0
  let weight = 1
  for (let i = values.length - 1; i >= 0; i--) {
    sum += values[i]! * weight
    weight++
    if (weight > 10) {
      weight = 1
    }
  }
  return sum % 11
}

/**
 * Calculate check digit K
 * Weighted sum from right (including C digit), weights cycle 1 through 9
 * Result mod 11; if 10, the check digit character is '-'
 */
function calculateCheckK(values: number[]): number {
  let sum = 0
  let weight = 1
  for (let i = values.length - 1; i >= 0; i--) {
    sum += values[i]! * weight
    weight++
    if (weight > 9) {
      weight = 1
    }
  }
  return sum % 11
}

/**
 * Encode a Code 11 barcode
 *
 * Check digits are always included:
 * - Data length <= 10: one check digit (C)
 * - Data length > 10: two check digits (C and K)
 *
 * @param text - Text to encode (digits 0-9 and dash only)
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeCode11(text: string): number[] {
  if (text.length === 0) {
    throw new InvalidInputError("Code 11 input must not be empty")
  }

  // Validate and collect character values
  const values: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    const value = CHAR_VALUES.get(ch)
    if (value === undefined) {
      throw new InvalidInputError(
        `Invalid Code 11 character: '${ch}' at position ${i}. Valid characters: 0-9 and -`,
      )
    }
    values.push(value)
  }

  // Calculate check digit C (always)
  const checkC = calculateCheckC(values)
  const valuesWithC = [...values, checkC]

  // Calculate check digit K (only if data length > 10)
  const includeK = text.length > 10
  const allValues = includeK ? [...valuesWithC, calculateCheckK(valuesWithC)] : valuesWithC

  const bars: number[] = []

  // Start pattern
  const startPattern = START_STOP
  for (const w of startPattern) {
    bars.push(w)
  }

  // Data + check digit characters
  for (const value of allValues) {
    const pattern = PATTERNS[value]!
    for (const w of pattern) {
      bars.push(w)
    }
  }

  // Stop pattern: same BSBSB as start, without trailing inter-character space
  for (let i = 0; i < 5; i++) {
    bars.push(START_STOP[i]!)
  }

  return bars
}
