/**
 * Code 25 — the discrete 2 of 5 family.
 *
 * Five symbologies that differ only in their element tables: two of every five
 * elements are wide, and which two says which digit. Industrial and IATA carry
 * the data in the bars alone, with a narrow space between each; Matrix, COOP
 * and Datalogic use the spaces as well, which halves the width.
 *
 * None of them is self-checking and none has a mandatory check digit, so a
 * reader cannot tell a misread from a good read. Use them only where the
 * application already knows how long the data is — which is what
 * [ITF](./itf.ts) fixed, and why it replaced them.
 */

import { CheckDigitError, InvalidInputError } from "../errors"

/** Which of the five element tables to encode with. */
export type Code2of5Version = "industrial" | "iata" | "matrix" | "coop" | "datalogic"

export interface Code2of5Options {
  /** Element table. Defaults to `"industrial"`. */
  version?: Code2of5Version
  /** Append a modulo 10 check digit, or verify one already on the end. */
  checkDigit?: boolean | "verify"
}

/**
 * Element widths per digit, then the start and stop patterns, bar first.
 *
 * Industrial and IATA share their digit table, as do Matrix and Datalogic;
 * only the guards tell those pairs apart. COOP uses the same ten patterns as
 * Matrix against different digits.
 */
const DIGITS_WIDE_BARS = [
  "1111313111",
  "3111111131",
  "1131111131",
  "3131111111",
  "1111311131",
  "3111311111",
  "1131311111",
  "1111113131",
  "3111113111",
  "1131113111",
]

const DIGITS_WIDE_BOTH = [
  "113311",
  "311131",
  "131131",
  "331111",
  "113131",
  "313111",
  "133111",
  "111331",
  "311311",
  "131311",
]

const DIGITS_COOP = [
  "331111",
  "111331",
  "113131",
  "113311",
  "131131",
  "131311",
  "133111",
  "311131",
  "311311",
  "313111",
]

const VERSIONS: Record<Code2of5Version, { digits: string[]; start: string; stop: string }> = {
  industrial: { digits: DIGITS_WIDE_BARS, start: "313111", stop: "31113" },
  iata: { digits: DIGITS_WIDE_BARS, start: "1111", stop: "311" },
  matrix: { digits: DIGITS_WIDE_BOTH, start: "311111", stop: "31111" },
  coop: { digits: DIGITS_COOP, start: "3131", stop: "133" },
  datalogic: { digits: DIGITS_WIDE_BOTH, start: "1111", stop: "311" },
}

/** Modulo 10 check digit, weighting from the right by 3 and 1. */
function checkDigitOf(digits: string): number {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += (digits.charCodeAt(i) - 48) * ((digits.length - i) % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

function widths(pattern: string, out: number[]): void {
  for (const character of pattern) out.push(character.charCodeAt(0) - 48)
}

/**
 * Encode a Code 25 barcode.
 *
 * @param text - Digits only
 * @param options - Element table and check digit handling
 * @returns Array of bar widths (alternating bar/space)
 *
 * @example
 * ```ts
 * encodeCode2of5("1234567890")
 * encodeCode2of5("1234567890", { version: "matrix", checkDigit: true })
 * ```
 */
export function encodeCode2of5(text: string, options: Code2of5Options = {}): number[] {
  const version = options.version ?? "industrial"
  const table = VERSIONS[version]
  if (!table) {
    throw new InvalidInputError(`Unknown Code 25 version: ${String(version)}`)
  }
  if (text.length === 0) {
    throw new InvalidInputError("Code 25 input must not be empty")
  }
  if (!/^\d+$/.test(text)) {
    throw new InvalidInputError("Code 25 must contain only digits")
  }

  let digits = text
  if (options.checkDigit === "verify") {
    const body = text.slice(0, -1)
    if (body.length === 0) {
      throw new InvalidInputError("Code 25 needs a digit to check as well as the check digit")
    }
    const expected = checkDigitOf(body)
    if (text.charCodeAt(text.length - 1) - 48 !== expected) {
      throw new CheckDigitError(
        `Code 25 check digit mismatch: expected ${expected}, got ${text.slice(-1)}`,
      )
    }
  } else if (options.checkDigit) {
    digits = text + String(checkDigitOf(text))
  }

  const bars: number[] = []
  widths(table.start, bars)
  for (const digit of digits) widths(table.digits[digit.charCodeAt(0) - 48]!, bars)
  widths(table.stop, bars)
  return bars
}
