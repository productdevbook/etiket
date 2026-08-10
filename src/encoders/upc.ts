/**
 * UPC-A and UPC-E barcode encoder
 */

import { InvalidInputError, CheckDigitError } from "../errors"
import { eanDigits } from "./ean"

// Encoding patterns for digits (same as EAN, duplicated to avoid inter-encoder dependencies)
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

// G patterns (even parity, used for UPC-E encoding)
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

// Guard patterns
const GUARD_START = [1, 1, 1]
const GUARD_CENTER = [1, 1, 1, 1, 1]
const GUARD_END = [1, 1, 1]

// UPC-E special end guard (6 modules)
const GUARD_END_UPCE = [1, 1, 1, 1, 1, 1]

// UPC-E parity patterns for number system 0, indexed by check digit
// O = odd parity (L_PATTERNS), E = even parity (G_PATTERNS)
const UPCE_PARITY_NS0: number[][] = [
  [1, 1, 1, 0, 0, 0], // 0: EEEOOO
  [1, 1, 0, 1, 0, 0], // 1: EEOEOO
  [1, 1, 0, 0, 1, 0], // 2: EEOOEO
  [1, 1, 0, 0, 0, 1], // 3: EEOOOE
  [1, 0, 1, 1, 0, 0], // 4: EOEEOO
  [1, 0, 0, 1, 1, 0], // 5: EOOEEO
  [1, 0, 0, 0, 1, 1], // 6: EOOOEE
  [1, 0, 1, 0, 1, 0], // 7: EOEOEO
  [1, 0, 1, 0, 0, 1], // 8: EOEOOE
  [1, 0, 0, 1, 0, 1], // 9: EOOEOE
]

/**
 * Calculate UPC/EAN check digit using the standard weighted algorithm
 */
function calculateCheckDigit(digits: number[]): number {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i]! * (i % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10
}

/**
 * Expand a UPC-E 6-digit code (middle digits) to a full UPC-A 11-digit code
 * (without check digit). numberSystem is 0 or 1.
 */
function expandUPCE(numberSystem: number, middleDigits: number[]): number[] {
  const d = middleDigits
  const lastDigit = d[5]!

  let manufacturer: number[]
  let product: number[]

  if (lastDigit === 0 || lastDigit === 1 || lastDigit === 2) {
    // NS + d1 d2 (lastDigit) 0000 d3 d4 d5 + check
    manufacturer = [d[0]!, d[1]!, lastDigit, 0, 0]
    product = [0, 0, d[2]!, d[3]!, d[4]!]
  } else if (lastDigit === 3) {
    // NS + d1 d2 d3 00000 d4 d5 + check
    manufacturer = [d[0]!, d[1]!, d[2]!, 0, 0]
    product = [0, 0, 0, d[3]!, d[4]!]
  } else if (lastDigit === 4) {
    // NS + d1 d2 d3 d4 00000 d5 + check
    manufacturer = [d[0]!, d[1]!, d[2]!, d[3]!, 0]
    product = [0, 0, 0, 0, d[4]!]
  } else {
    // lastDigit 5-9: NS + d1 d2 d3 d4 d5 0000 (lastDigit) + check
    manufacturer = [d[0]!, d[1]!, d[2]!, d[3]!, d[4]!]
    product = [0, 0, 0, 0, lastDigit]
  }

  return [numberSystem, ...manufacturer, ...product]
}

/**
 * Encode UPC-A barcode
 *
 * @param text - 11 or 12 digit string (12th is check digit, auto-calculated if 11)
 * @returns bars (widths) and guard positions
 */
export function encodeUPCA(text: string): {
  bars: number[]
  guards: number[]
  digits: string
} {
  const digits = eanDigits(text, "UPC-A")

  if (digits.length === 11) {
    digits.push(calculateCheckDigit(digits))
  } else if (digits.length === 12) {
    const expected = calculateCheckDigit(digits.slice(0, 11))
    if (digits[11] !== expected) {
      throw new CheckDigitError(
        `UPC-A check digit mismatch: expected ${expected}, got ${digits[11]}`,
      )
    }
  } else {
    throw new InvalidInputError("UPC-A requires 11 or 12 digits")
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

  // Left 6 digits (all L encoding)
  for (let i = 0; i < 6; i++) {
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

  // Right 6 digits (all R encoding)
  for (let i = 0; i < 6; i++) {
    const digit = digits[i + 6]!
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

  return { bars, guards, digits: digits.join("") }
}

/**
 * Encode UPC-E barcode
 *
 * Input formats:
 *  - 6 digits: number system 0 implied, check digit auto-calculated
 *  - 7 digits: treated as NS(1) + 6 middle digits (auto-calc check),
 *              OR 6 middle digits + check digit (NS 0 implied) — resolved by
 *              checking if first digit is 0 or 1 (NS) vs other
 *  - 8 digits: NS + 6 middle digits + check digit
 *
 * @param text - 6, 7, or 8 digit string
 * @returns bars (widths) and guard positions
 */
export function encodeUPCE(text: string): {
  bars: number[]
  guards: number[]
  digits: string
} {
  const raw = eanDigits(text, "UPC-E")

  let numberSystem: number
  let middleDigits: number[]
  let checkDigit: number

  if (raw.length === 6) {
    // 6 digits: NS=0, auto-calculate check
    numberSystem = 0
    middleDigits = raw
    const expanded = expandUPCE(numberSystem, middleDigits)
    checkDigit = calculateCheckDigit(expanded)
  } else if (raw.length === 7) {
    // 7 digits: ambiguous — if first digit is 0 or 1, treat as NS + 6 middle
    // otherwise treat as 6 middle + check (NS=0)
    if (raw[0] === 0 || raw[0] === 1) {
      numberSystem = raw[0]!
      middleDigits = raw.slice(1)
      const expanded = expandUPCE(numberSystem, middleDigits)
      checkDigit = calculateCheckDigit(expanded)
    } else {
      numberSystem = 0
      middleDigits = raw.slice(0, 6)
      const expanded = expandUPCE(numberSystem, middleDigits)
      checkDigit = calculateCheckDigit(expanded)
      const provided = raw[6]!
      if (provided !== checkDigit) {
        throw new CheckDigitError(
          `UPC-E check digit mismatch: expected ${checkDigit}, got ${provided}`,
        )
      }
    }
  } else if (raw.length === 8) {
    // 8 digits: NS + 6 middle + check
    numberSystem = raw[0]!
    if (numberSystem !== 0 && numberSystem !== 1) {
      throw new InvalidInputError(`UPC-E number system must be 0 or 1, got ${numberSystem}`)
    }
    middleDigits = raw.slice(1, 7)
    const expanded = expandUPCE(numberSystem, middleDigits)
    checkDigit = calculateCheckDigit(expanded)
    const provided = raw[7]!
    if (provided !== checkDigit) {
      throw new CheckDigitError(
        `UPC-E check digit mismatch: expected ${checkDigit}, got ${provided}`,
      )
    }
  } else {
    throw new InvalidInputError("UPC-E requires 6, 7, or 8 digits")
  }

  // Determine parity pattern based on number system and check digit
  let parityPattern: number[]
  if (numberSystem === 0) {
    parityPattern = UPCE_PARITY_NS0[checkDigit]!
  } else {
    // Number system 1: invert the parity (E <-> O)
    parityPattern = UPCE_PARITY_NS0[checkDigit]!.map((p) => (p === 0 ? 1 : 0))
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

  // 6 data digits encoded with odd/even parity
  for (let i = 0; i < 6; i++) {
    const digit = middleDigits[i]!
    // 1 = even parity (G_PATTERNS), 0 = odd parity (L_PATTERNS)
    const pattern = parityPattern[i] === 1 ? G_PATTERNS[digit]! : L_PATTERNS[digit]!
    for (const w of pattern) {
      bars.push(w)
      pos++
    }
  }

  // End guard (special 6-module UPC-E end guard)
  guards.push(pos)
  for (const w of GUARD_END_UPCE) {
    bars.push(w)
    pos++
  }

  return {
    bars,
    guards,
    digits: `${numberSystem}${middleDigits.join("")}${checkDigit}`,
  }
}
