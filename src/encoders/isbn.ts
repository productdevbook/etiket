/**
 * Publishing identifiers carried by EAN-13: ISBN, ISSN and ISMN.
 *
 * None of them is a symbology of its own. Each is a numbering scheme with its
 * own check digit that maps onto a twelve digit EAN-13 payload — which is where
 * the work is, because the scheme's check digit is discarded on the way and
 * EAN-13 computes its own.
 */

import { CheckDigitError, InvalidInputError } from "../errors"
import { encodeEAN13 } from "./ean"

/** An EAN-13 symbol: bar widths and the positions of the guard bars. */
type EAN13Symbol = ReturnType<typeof encodeEAN13>

/** Strip the hyphens and spaces a printed identifier is written with. */
function digitsOf(text: string): string {
  return text.replaceAll(/[\s-]/g, "")
}

/** ISBN-10 / ISMN-10 check character: weights 10 down to 2, modulo 11, 10 is X. */
function mod11CheckDigit(digits: string): string {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += (digits.length + 1 - i) * (digits.charCodeAt(i) - 48)
  }
  const check = (11 - (sum % 11)) % 11
  return check === 10 ? "X" : String(check)
}

/** Reject a supplied check character that does not match the computed one. */
function verify(scheme: string, supplied: string | undefined, expected: string): void {
  if (supplied !== undefined && supplied.toUpperCase() !== expected) {
    throw new CheckDigitError(
      `${scheme} check digit mismatch: expected ${expected}, got ${supplied}`,
    )
  }
}

/**
 * Encode an ISBN as its EAN-13 (Bookland) symbol.
 *
 * A ten digit ISBN moves to the 978 prefix and gets a new check digit; a
 * thirteen digit one is already an EAN-13 payload. Hyphens and spaces in the
 * printed form are ignored, and the ISBN's own check digit is verified when it
 * is there.
 *
 * @param text - ISBN-10 or ISBN-13, hyphenated or not
 *
 * @example
 * ```ts
 * encodeISBN("0-306-40615-2") // 9780306406157
 * encodeISBN("978-0-306-40615-7")
 * ```
 */
export function encodeISBN(text: string): EAN13Symbol {
  const raw = digitsOf(text).toUpperCase()

  if (/^\d{9}[\dX]?$/.test(raw)) {
    const body = raw.slice(0, 9)
    verify("ISBN-10", raw.length === 10 ? raw.slice(9) : undefined, mod11CheckDigit(body))
    return encodeEAN13(`978${body}`)
  }

  if (/^97[89]\d{9,10}$/.test(raw)) {
    return encodeEAN13(raw)
  }

  throw new InvalidInputError(
    "ISBN must be 10 digits, or 13 beginning 978 or 979 (hyphens optional)",
  )
}

export interface ISSNOptions {
  /** Two digit sequence variant, printed to the right of the ISSN. Default `00`. */
  variant?: string
}

/**
 * Encode an ISSN as its EAN-13 symbol.
 *
 * The serial number sits behind the 977 prefix, and the two digit sequence
 * variant — the issue or price code — takes the place of the ISSN's own check
 * digit, which the symbol does not carry.
 *
 * @param text - ISSN, with or without its hyphen and check digit
 * @param options - Sequence variant
 *
 * @example
 * ```ts
 * encodeISSN("0317-8471")
 * encodeISSN("0317-8471", { variant: "01" })
 * ```
 */
export function encodeISSN(text: string, options: ISSNOptions = {}): EAN13Symbol {
  const raw = digitsOf(text).toUpperCase()
  if (!/^\d{7}[\dX]?$/.test(raw)) {
    throw new InvalidInputError(
      "ISSN must be 8 digits in the form XXXX-XXXX (check digit may be X)",
    )
  }
  verify("ISSN", raw.length === 8 ? raw.slice(7) : undefined, mod11CheckDigit(raw.slice(0, 7)))

  const variant = options.variant ?? "00"
  if (!/^\d{2}$/.test(variant)) {
    throw new InvalidInputError("ISSN sequence variant must be two digits")
  }

  return encodeEAN13(`977${raw.slice(0, 7)}${variant}`)
}

/**
 * Encode an ISMN as its EAN-13 symbol.
 *
 * The ten character form starts with `M` where the thirteen digit form starts
 * with the 9790 prefix; both end up as the same symbol.
 *
 * @param text - ISMN in either form, hyphenated or not
 *
 * @example
 * ```ts
 * encodeISMN("M-2306-7118-7")
 * encodeISMN("979-0-2306-7118-7")
 * ```
 */
export function encodeISMN(text: string): EAN13Symbol {
  const raw = digitsOf(text).toUpperCase()

  // The ten character form's check digit is the thirteen digit form's, so
  // rewriting the M as the 9790 prefix leaves EAN-13 to verify it.
  if (/^M\d{8}\d?$/.test(raw)) return encodeEAN13(`9790${raw.slice(1)}`)
  if (/^9790\d{8,9}$/.test(raw)) return encodeEAN13(raw)

  throw new InvalidInputError("ISMN must be M followed by 8 digits, or 13 digits beginning 9790")
}
