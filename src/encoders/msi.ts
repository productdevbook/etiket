/**
 * MSI Plessey barcode encoder
 * Digits 0-9 only, with configurable check digit algorithms
 */

import { InvalidInputError } from "../errors"

/**
 * Available check digit calculation types
 */
export type MSICheckDigitType = "mod10" | "mod11" | "mod1010" | "mod1110" | "none"

// Start pattern: wide bar (2), narrow space (1)
const START = [2, 1]

// Stop pattern: narrow bar (1), wide space (2), narrow bar (1)
const STOP = [1, 2, 1]

// BCD bit encoding:
// 0 bit → narrow bar (1), wide space (2)
// 1 bit → wide bar (2), narrow space (1)
const BIT_0 = [1, 2]
const BIT_1 = [2, 1]

/**
 * Encode a single digit into bar/space widths using BCD
 * Each digit is 4 bits, MSB first
 */
function encodeDigit(digit: number): number[] {
  const result: number[] = []
  for (let bit = 3; bit >= 0; bit--) {
    if ((digit >> bit) & 1) {
      result.push(BIT_1[0]!, BIT_1[1]!)
    } else {
      result.push(BIT_0[0]!, BIT_0[1]!)
    }
  }
  return result
}

/**
 * Calculate Mod 10 (Luhn) check digit
 *
 * 1. Moving right to left, double every other digit starting from the rightmost
 * 2. Concatenate the doubled digits as a string
 * 3. Sum all individual digits of that string
 * 4. Add the non-doubled digits
 * 5. Check digit = (10 - (sum mod 10)) mod 10
 */
function calculateMod10(digits: number[]): number {
  // MSI Mod10 uses a variant of Luhn:
  // 1. Take digits from right, double every other starting from rightmost
  // 2. Form a string of doubled values, sum individual digits
  // 3. Add non-doubled digits
  let doubledStr = ""
  let undoubledSum = 0

  for (let i = digits.length - 1; i >= 0; i--) {
    const pos = digits.length - 1 - i
    if (pos % 2 === 0) {
      // Double this digit
      doubledStr = String(digits[i]! * 2) + doubledStr
    } else {
      undoubledSum += digits[i]!
    }
  }

  // Sum individual digits of the doubled string
  let doubledSum = 0
  for (const ch of doubledStr) {
    doubledSum += Number(ch)
  }

  const total = doubledSum + undoubledSum
  return (10 - (total % 10)) % 10
}

/**
 * Calculate Mod 11 check digit
 *
 * Weights cycle 2, 3, 4, 5, 6, 7 from right to left
 * Sum of (digit * weight) mod 11
 * If remainder is 0, check digit is 0
 * If remainder is 1, check digit is 0 (some implementations)
 */
function calculateMod11(digits: number[]): number {
  let sum = 0
  let weight = 2

  for (let i = digits.length - 1; i >= 0; i--) {
    sum += digits[i]! * weight
    weight++
    if (weight > 7) {
      weight = 2
    }
  }

  const remainder = sum % 11
  // If remainder is 0 or 1, check digit is 0
  if (remainder <= 1) {
    return 0
  }
  return 11 - remainder
}

/**
 * Calculate check digits based on the chosen algorithm
 */
function calculateCheckDigits(digits: number[], type: MSICheckDigitType): number[] {
  switch (type) {
    case "none":
      return []
    case "mod10": {
      return [calculateMod10(digits)]
    }
    case "mod11": {
      return [calculateMod11(digits)]
    }
    case "mod1010": {
      const c1 = calculateMod10(digits)
      const c2 = calculateMod10([...digits, c1])
      return [c1, c2]
    }
    case "mod1110": {
      const c1 = calculateMod11(digits)
      const c2 = calculateMod10([...digits, c1])
      return [c1, c2]
    }
  }
}

/**
 * Encode an MSI Plessey barcode
 *
 * @param text - Digits to encode (0-9 only)
 * @param options - Encoding options
 * @param options.checkDigit - Check digit algorithm (default: 'mod10')
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeMSI(text: string, options?: { checkDigit?: MSICheckDigitType }): number[] {
  if (text.length === 0) {
    throw new InvalidInputError("MSI input must not be empty")
  }

  if (!/^\d+$/.test(text)) {
    throw new InvalidInputError("MSI barcode requires digits only (0-9)")
  }

  const checkDigitType = options?.checkDigit ?? "mod10"

  // Convert text to digit array
  const digits: number[] = []
  for (let i = 0; i < text.length; i++) {
    digits.push(text.charCodeAt(i) - 48)
  }

  // Calculate check digit(s)
  const checkDigits = calculateCheckDigits(digits, checkDigitType)

  // All digits to encode (data + check digits)
  const allDigits = [...digits, ...checkDigits]

  const bars: number[] = []

  // Start pattern
  for (const w of START) {
    bars.push(w)
  }

  // Encode each digit
  for (const digit of allDigits) {
    const widths = encodeDigit(digit)
    for (const w of widths) {
      bars.push(w)
    }
  }

  // Stop pattern
  for (const w of STOP) {
    bars.push(w)
  }

  return bars
}
