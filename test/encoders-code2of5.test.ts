/**
 * Code 25 — the discrete 2 of 5 family.
 *
 * `bwip-compare.test.ts` pins every element of every variant against BWIPP, so
 * what is left here is the shape of the API: which variant a type selects, what
 * the check digit does, and what is refused. No decoder implements any of these
 * symbologies, which is exactly why the module comparison carries the weight.
 */

import { describe, expect, it } from "vitest"
import { encodeCode2of5 } from "../src/encoders/code2of5"
import type { Code2of5Version } from "../src/encoders/code2of5"
import { encodeBars } from "../src/_barcode"
import { CheckDigitError, InvalidInputError } from "../src/errors"

const VERSIONS: Code2of5Version[] = ["industrial", "iata", "matrix", "coop", "datalogic"]

describe("Code 25", () => {
  it("defaults to the industrial table", () => {
    expect(encodeCode2of5("1234")).toEqual(encodeCode2of5("1234", { version: "industrial" }))
  })

  it("gives every variant a different symbol", () => {
    const symbols = VERSIONS.map((version) =>
      JSON.stringify(encodeCode2of5("1234567890", { version })),
    )
    expect(new Set(symbols).size).toBe(VERSIONS.length)
  })

  it("spends ten elements a digit on the bar-only variants and six on the rest", () => {
    // Guards aside, the element count is what separates the two halves of the
    // family: industrial and IATA put a narrow space between every bar
    const elements = (version: Code2of5Version, digits: string) =>
      encodeCode2of5(digits, { version }).length
    for (const version of ["industrial", "iata"] as const) {
      expect(elements(version, "12345") - elements(version, "1234"), version).toBe(10)
    }
    for (const version of ["matrix", "coop", "datalogic"] as const) {
      expect(elements(version, "12345") - elements(version, "1234"), version).toBe(6)
    }
  })

  it("appends a check digit on request", () => {
    // 1234567890 checks to 5, so the symbol is the one for 12345678905
    expect(encodeCode2of5("1234567890", { checkDigit: true })).toEqual(
      encodeCode2of5("12345678905"),
    )
  })

  it("verifies a check digit already on the end", () => {
    expect(encodeCode2of5("12345678905", { checkDigit: "verify" })).toEqual(
      encodeCode2of5("12345678905"),
    )
    expect(() => encodeCode2of5("12345678900", { checkDigit: "verify" })).toThrow(CheckDigitError)
  })

  it("needs something to check as well as the check digit", () => {
    expect(() => encodeCode2of5("5", { checkDigit: "verify" })).toThrow(InvalidInputError)
  })

  it("rejects empty input, non-digits and an unknown variant", () => {
    expect(() => encodeCode2of5("")).toThrow(InvalidInputError)
    expect(() => encodeCode2of5("12A45")).toThrow(InvalidInputError)
    expect(() => encodeCode2of5("1234", { version: "nope" as Code2of5Version })).toThrow(
      InvalidInputError,
    )
  })

  it("every bar and space is one or three modules", () => {
    for (const version of VERSIONS) {
      for (const width of encodeCode2of5("1234567890", { version })) {
        expect([1, 3], version).toContain(width)
      }
    }
  })

  it.each([
    ["industrial2of5", "industrial"],
    ["iata2of5", "iata"],
    ["matrix2of5", "matrix"],
    ["coop2of5", "coop"],
    ["datalogic2of5", "datalogic"],
  ] as const)("barcode type %s selects the %s table", (type, version) => {
    expect(encodeBars("1234567890", { type })).toEqual(encodeCode2of5("1234567890", { version }))
  })

  it("passes the check digit option through barcode()", () => {
    expect(encodeBars("12345", { type: "matrix2of5", code2of5CheckDigit: true })).toEqual(
      encodeCode2of5("12345", { version: "matrix", checkDigit: true }),
    )
  })
})
