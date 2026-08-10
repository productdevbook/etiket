/**
 * Royal Mail Mailmark 2D barcode.
 *
 * Not a symbology of its own: a Data Matrix of a fixed size carrying a fixed
 * data layout. Royal Mail defines three barcode types, which are three symbol
 * sizes, and a 45 character header — format, version, class, supply chain and
 * item identifiers, destination postcode — that every Mailmark item carries
 * before its customer content.
 */

import { InvalidInputError } from "../errors"
import { encodeDataMatrix } from "./datamatrix/index"

/** Royal Mail barcode type, which fixes the symbol size. */
export type MailmarkType = 7 | 9 | 29

export interface MailmarkOptions {
  /** Barcode type: 7 (24x24), 9 (32x32) or 29 (16x48). Default 7. */
  type?: MailmarkType
}

const SYMBOL_SIZE: Record<MailmarkType, string> = {
  7: "24x24",
  9: "32x32",
  29: "16x48",
}

/** The 45 character header every Mailmark item begins with. */
const HEADER_LENGTH = 45

/**
 * Encode a Royal Mail Mailmark 2D barcode.
 *
 * @param text - Mailmark data: `JGB ` and at least 45 characters in all,
 *   space padded, from the uppercase letters, digits and space Royal Mail
 *   allows
 * @param options - Barcode type
 * @returns 2D boolean array where `true` = dark module
 *
 * @example
 * ```ts
 * encodeMailmark("JGB 012100123456789AB19XY1A 0            ", { type: 9 })
 * ```
 */
export function encodeMailmark(text: string, options: MailmarkOptions = {}): boolean[][] {
  const type = options.type ?? 7
  const size = SYMBOL_SIZE[type]
  if (!size) {
    throw new InvalidInputError(`Mailmark barcode type must be 7, 9 or 29 (got ${String(type)})`)
  }
  if (!text.startsWith("JGB ")) {
    throw new InvalidInputError("Mailmark data must begin with the identifier 'JGB '")
  }
  if (text.length < HEADER_LENGTH) {
    throw new InvalidInputError(
      `Mailmark data must be at least ${HEADER_LENGTH} characters, space padded (got ${text.length})`,
    )
  }
  if (!/^[A-Z0-9 ]+$/.test(text)) {
    throw new InvalidInputError(
      "Mailmark data holds uppercase letters, digits and spaces only — for anything else, " +
        "use datamatrix() with the same symbolSize",
    )
  }

  return encodeDataMatrix(text, { symbolSize: size })
}
