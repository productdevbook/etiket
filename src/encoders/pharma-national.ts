/**
 * National pharmaceutical numbering schemes carried by Code 39.
 *
 * Both compress a national product number into a Code 39 symbol, and both are
 * defined by how the number is transformed rather than by any change to the
 * symbology: Code 32 packs nine digits into six base-32 characters, PZN puts a
 * leading `-` in front of its digits. The check digit is theirs, not Code 39's.
 */

import { CheckDigitError, InvalidInputError } from "../errors"
import { encodeCode39 } from "./code39"

/**
 * Code 32 base-32 alphabet: the digits, then the letters with A, E, I, O and
 * the ones that could be misread left out (Italian Ministry of Health).
 */
const CODE32_ALPHABET = "0123456789BCDFGHJKLMNPQRSTUVWXYZ"

/** Luhn check digit over the eight significant digits of an Italian Pharmacode. */
function code32CheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < 8; i++) {
    let value = digits.charCodeAt(i) - 48
    if (i % 2 !== 0) {
      value *= 2
      if (value > 9) value -= 9
    }
    sum += value
  }
  return sum % 10
}

/**
 * Encode Code 32 — the Italian Pharmacode, *Codice Farmaceutico Italiano*.
 *
 * The nine digit number is written in base 32 over an alphabet that drops the
 * vowels, and those six characters are the Code 39 symbol. The human readable
 * text is the digits with an `A` in front, which is not part of the symbol.
 *
 * @param text - 8 digits, or 9 with the check digit already on the end
 * @returns Array of bar widths (alternating bar/space)
 *
 * @example
 * ```ts
 * encodeCode32("12345678") // check digit computed
 * ```
 */
export function encodeCode32(text: string): number[] {
  if (!/^\d{8,9}$/.test(text)) {
    throw new InvalidInputError("Code 32 requires 8 or 9 digits")
  }

  const check = code32CheckDigit(text)
  if (text.length === 9 && text.charCodeAt(8) - 48 !== check) {
    throw new CheckDigitError(
      `Code 32 check digit mismatch: expected ${check}, got ${text.slice(8)}`,
    )
  }

  let value = Number.parseInt(text.slice(0, 8), 10) * 10 + check
  let encoded = ""
  for (let i = 0; i < 6; i++) {
    encoded = CODE32_ALPHABET[value % 32]! + encoded
    value = Math.floor(value / 32)
  }

  return encodeCode39(encoded)
}

export interface PZNOptions {
  /** Encode a PZN-8 (seven significant digits) rather than the older PZN-7. */
  pzn8?: boolean
}

/**
 * Encode a PZN — the German *Pharmazentralnummer*.
 *
 * The digits are weighted 1 to 7 for a PZN-8 and 2 to 7 for a PZN-7, summed
 * modulo 11; a remainder of 10 means the number itself is not a valid PZN. The
 * symbol is Code 39 over a leading `-` followed by the digits and the check.
 *
 * @param text - 6 or 7 digits for a PZN-7, 7 or 8 for a PZN-8, the last one
 *   being the check digit when present
 * @param options - `pzn8` selects the eight digit scheme
 * @returns Array of bar widths (alternating bar/space)
 *
 * @example
 * ```ts
 * encodePZN("123456") // PZN-7, check digit computed
 * encodePZN("1234567", { pzn8: true })
 * ```
 */
export function encodePZN(text: string, options: PZNOptions = {}): number[] {
  const pzn8 = options.pzn8 ?? false
  const significant = pzn8 ? 7 : 6

  if (!new RegExp(`^\\d{${significant},${significant + 1}}$`).test(text)) {
    throw new InvalidInputError(
      `PZN-${pzn8 ? 8 : 7} requires ${significant} or ${significant + 1} digits`,
    )
  }

  let checksum = 0
  for (let i = 0; i < significant; i++) {
    checksum += (text.charCodeAt(i) - 48) * (i + (pzn8 ? 1 : 2))
  }
  checksum %= 11
  if (checksum === 10) {
    throw new InvalidInputError(`PZN ${text.slice(0, significant)} has no valid check digit`)
  }

  if (text.length > significant && text.charCodeAt(significant) - 48 !== checksum) {
    throw new CheckDigitError(
      `PZN check digit mismatch: expected ${checksum}, got ${text.slice(significant)}`,
    )
  }

  return encodeCode39(`-${text.slice(0, significant)}${String(checksum)}`)
}
