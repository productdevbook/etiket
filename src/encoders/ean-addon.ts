/**
 * EAN-2 and EAN-5 addon barcode encoders
 * Supplemental barcodes used alongside EAN-13/UPC-A for periodicals and books
 */

import { InvalidInputError } from "../errors"

// L patterns (left odd parity) — same as EAN
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

// G patterns (left even parity) — same as EAN
const G_PATTERNS: number[][] = [
  [1, 1, 2, 3], // 0
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

// Start guard for addon barcodes: bar, space, bar+space pattern (1011)
const ADDON_START = [1, 1, 2]

// Delineator between digits (01 = space, bar)
const ADDON_DELINEATOR = [1, 1]

// EAN-2 parity based on value mod 4
// 0 = L pattern, 1 = G pattern
const EAN2_PARITY: number[][] = [
  [0, 0], // 0: LL
  [0, 1], // 1: LG
  [1, 0], // 2: GL
  [1, 1], // 3: GG
]

// EAN-5 parity based on checksum digit
// 0 = L pattern, 1 = G pattern
const EAN5_PARITY: number[][] = [
  [1, 1, 0, 0, 0], // 0: GGLLL
  [1, 0, 1, 0, 0], // 1: GLGLL
  [1, 0, 0, 1, 0], // 2: GLLGL
  [1, 0, 0, 0, 1], // 3: GLLLG
  [0, 1, 1, 0, 0], // 4: LGGLL
  [0, 0, 1, 1, 0], // 5: LLGGL
  [0, 0, 0, 1, 1], // 6: LLLGG
  [0, 1, 0, 1, 0], // 7: LGLGL
  [0, 1, 0, 0, 1], // 8: LGLLG
  [0, 0, 1, 0, 1], // 9: LLGLG
]

/**
 * Validate that a string contains only digits of the expected length
 */
function validateDigits(text: string, expected: number, name: string): number[] {
  if (!/^\d+$/.test(text)) {
    throw new InvalidInputError(`${name} requires digits only (0-9)`)
  }
  if (text.length !== expected) {
    throw new InvalidInputError(`${name} requires exactly ${expected} digits`)
  }
  return text.split("").map(Number)
}

/**
 * Encode EAN-2 addon barcode
 *
 * @param text - 2-digit string representing an issue number
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeEAN2(text: string): number[] {
  const digits = validateDigits(text, 2, "EAN-2")

  // Parity based on the 2-digit value mod 4
  const value = digits[0]! * 10 + digits[1]!
  const parity = EAN2_PARITY[value % 4]!

  const bars: number[] = []

  // Start guard
  for (const w of ADDON_START) {
    bars.push(w)
  }

  // Encode each digit
  for (let i = 0; i < 2; i++) {
    // Delineator between digits (not before the first)
    if (i > 0) {
      for (const w of ADDON_DELINEATOR) {
        bars.push(w)
      }
    }

    const digit = digits[i]!
    const pattern = parity[i] === 0 ? L_PATTERNS[digit]! : G_PATTERNS[digit]!
    for (const w of pattern) {
      bars.push(w)
    }
  }

  return bars
}

/**
 * Calculate EAN-5 checksum
 * Formula: (d1*3 + d2*9 + d3*3 + d4*9 + d5*3) mod 10
 */
function calculateEAN5Checksum(digits: number[]): number {
  const weights = [3, 9, 3, 9, 3]
  let sum = 0
  for (let i = 0; i < 5; i++) {
    sum += digits[i]! * weights[i]!
  }
  return sum % 10
}

/**
 * Encode EAN-5 addon barcode
 *
 * @param text - 5-digit string (commonly used for book prices, e.g. "52495" = $24.95)
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeEAN5(text: string): number[] {
  const digits = validateDigits(text, 5, "EAN-5")

  // Calculate checksum to determine parity encoding
  const checksum = calculateEAN5Checksum(digits)
  const parity = EAN5_PARITY[checksum]!

  const bars: number[] = []

  // Start guard
  for (const w of ADDON_START) {
    bars.push(w)
  }

  // Encode each digit
  for (let i = 0; i < 5; i++) {
    // Delineator between digits (not before the first)
    if (i > 0) {
      for (const w of ADDON_DELINEATOR) {
        bars.push(w)
      }
    }

    const digit = digits[i]!
    const pattern = parity[i] === 0 ? L_PATTERNS[digit]! : G_PATTERNS[digit]!
    for (const w of pattern) {
      bars.push(w)
    }
  }

  return bars
}
