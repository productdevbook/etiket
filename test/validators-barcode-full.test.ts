/**
 * Exhaustive validator coverage: every branch of validateBarcode, and agreement
 * between the validator's verdict and what the encoders actually accept.
 */

import { describe, expect, it } from "vitest"
import { validateBarcode, isValidInput, validateBarcodeInput } from "../src/validators/barcode"
import { ENCODE_TYPES } from "../src/_types"
import { calculateEANCheckDigit, verifyEANCheckDigit } from "../src/validators/barcode"
import { encodeBars } from "../src/_barcode"
import { encodePostal } from "../src/_postal"
import { encodeIdentcode, encodeLeitcode } from "../src/encoders/deutsche-post"
import { encodePOSTNET, encodePLANET } from "../src/encoders/postnet"

describe("validateBarcode — accepts valid input", () => {
  const valid: Array<[string, string]> = [
    ["code128", "HELLO"],
    ["ean13", "4006381333931"],
    ["ean13", "400638133393"],
    ["ean8", "96385074"],
    ["code39", "HELLO 123"],
    ["code93", "HELLO 123"],
    ["code39ext", "Hello"],
    ["code93ext", "Hello"],
    ["itf", "1234567890"],
    ["itf14", "15400141288763"],
    ["upca", "036000291452"],
    ["upce", "01234565"],
    ["ean2", "12"],
    ["ean5", "12345"],
    ["codabar", "123456"],
    ["msi", "1234"],
    ["pharmacode", "1234"],
    ["code11", "1234-5"],
    ["gs1-128", "(01)12345678901231"],
    ["identcode", "56310243031"],
    ["leitcode", "2131000006418"],
    ["postnet", "12345"],
    ["postnet", "12345-6789"],
    ["planet", "12345678901"],
    ["plessey", "1234AB"],
    ["rm4scc", "SN34RD1A"],
    ["kix", "2500GG"],
    ["auspost", "12345678"],
    ["jppost", "1234567"],
    ["imb", "01234567094987654321"],
    ["gs1-databar", "0012345678901"],
    ["gs1-databar-limited", "0012345678901"],
    ["gs1-databar-expanded", "(01)90012345678908"],
    ["qr", "HELLO"],
    ["datamatrix", "HELLO"],
    ["pdf417", "HELLO"],
    ["aztec", "HELLO"],
    ["microqr", "123"],
    ["rmqr", "HELLO"],
    ["maxicode", "HELLO"],
    ["dotcode", "HELLO"],
    ["hanxin", "HELLO"],
    ["codablock-f", "HELLO"],
    ["code16k", "HELLO"],
    ["micropdf417", "HELLO"],
    ["gs1-datamatrix", "(01)12345678901231"],
  ]

  for (const [type, text] of valid) {
    it(`${type}: "${text}"`, () => {
      const result = validateBarcode(text, type)
      expect(result.valid, `${type} ${text}: ${result.error ?? ""}`).toBe(true)
      expect(result.error).toBeUndefined()
      expect(isValidInput(text, type)).toBe(true)
    })
  }
})

describe("validateBarcode — rejects invalid input", () => {
  const invalid: Array<[string, string, RegExp]> = [
    ["code128", "", /empty/i],
    ["ean13", "123", /12 or 13 digits/],
    ["ean13", "4006381333930", /check digit/i],
    ["ean8", "123", /7 or 8 digits/],
    ["ean8", "96385075", /check digit/i],
    ["code39", "hello!", /only accepts/],
    ["code93", "hello!", /only accepts/],
    ["code39ext", "café", /ASCII/],
    ["code93ext", "café", /ASCII/],
    ["itf", "12A45", /only accepts digits/],
    ["itf14", "123", /13 or 14 digits/],
    ["upca", "123", /11 or 12 digits/],
    ["upce", "12345", /6-8 digits/],
    ["codabar", "12!45", /only accepts/],
    ["msi", "12A4", /only accepts digits/],
    ["pharmacode", "2", /3-131070/],
    ["pharmacode", "131071", /3-131070/],
    ["pharmacode", "abc", /3-131070/],
    ["code11", "12A4", /only accepts/],
    ["ean2", "123", /exactly 2 digits/],
    ["ean5", "1234", /exactly 5 digits/],
    ["gs1-128", "", /empty/i],
    ["gs1-128", "(ab)123", /Application Identifier/],
    ["identcode", "123", /11 or 12 digits/],
    ["leitcode", "123", /13 or 14 digits/],
    ["postnet", "ABCDE", /only accepts digits/],
    ["postnet", "1234", /5, 9, or 11 digits/],
    ["planet", "ABCDEFGHIJK", /only accepts digits/],
    ["planet", "1234", /11 or 13 digits/],
    ["plessey", "XYZ", /hexadecimal/],
    ["plessey", "", /empty/i],
    ["rm4scc", "SN3 4RD!", /only accepts/],
    ["kix", "2500-GG", /only accepts/],
    ["auspost", "1234", /8-digit DPID/],
    ["jppost", "123", /7-digit postal code/],
    ["imb", "123", /20-digit tracking code/],
    ["gs1-databar", "123456789012345", /up to 14 digits/],
    ["gs1-databar-limited", "23456789012345", /indicator digit/],
    ["gs1-databar-expanded", "", /empty/i],
    ["qr", "", /must not be empty/],
    ["datamatrix", "", /must not be empty/],
    ["pdf417", "", /must not be empty/],
    ["aztec", "", /must not be empty/],
    ["microqr", "", /must not be empty/],
    ["rmqr", "", /must not be empty/],
    ["maxicode", "", /must not be empty/],
    ["dotcode", "", /must not be empty/],
    ["hanxin", "", /must not be empty/],
    ["codablock-f", "", /must not be empty/],
    ["code16k", "", /must not be empty/],
    ["micropdf417", "", /must not be empty/],
  ]

  for (const [type, text, pattern] of invalid) {
    it(`${type}: "${text}"`, () => {
      const result = validateBarcode(text, type)
      expect(result.valid, `${type} "${text}" should be invalid`).toBe(false)
      expect(result.error).toMatch(pattern)
      expect(isValidInput(text, type)).toBe(false)
    })
  }
})

describe("validateBarcode — unknown types", () => {
  it("rejects unknown types rather than waving them through", () => {
    expect(validateBarcode("anything", "some-future-type")).toEqual({
      valid: false,
      error: "Unknown barcode type: some-future-type",
    })
  })

  it("rejects unknown types through isValidInput too", () => {
    expect(isValidInput("anything", "some-future-type")).toBe(false)
  })

  it("still accepts every type the library actually supports", () => {
    // Driven off the runtime type list, so a new symbology cannot be added
    // without the validator learning about it
    for (const type of [...ENCODE_TYPES, "jabcode"]) {
      const result = validateBarcode(validSampleFor(type), type)
      expect(result.error ?? "", type).not.toMatch(/Unknown barcode type/)
    }
  })
})

/** A payload each type accepts, so the "no unknown types" sweep is meaningful */
function validSampleFor(type: string): string {
  switch (type) {
    case "ean13":
    case "gs1-databar":
    case "gs1-databar-limited":
      return "012345678901"
    case "ean8":
      return "9638507"
    case "upca":
      return "03600029145"
    case "upce":
      return "012345"
    case "itf":
    case "itf14":
      return "0001234567890"
    case "codabar":
      return "A12345B"
    case "identcode":
      return "56310243031"
    case "leitcode":
      return "2134807501650"
    case "postnet":
    case "planet":
      return "12345"
    case "ean2":
      return "12"
    case "ean5":
      return "12345"
    case "pharmacode":
      return "1234"
    case "rm4scc":
    case "kix":
      return "SN34RD1A"
    case "auspost":
      return "12345678"
    case "jppost":
      return "1234567"
    case "imb":
      return "01234567094987654321"
    case "gs1-128":
    case "gs1-databar-expanded":
      return "(01)09501101020917"
    case "ean14":
      return "1234567890123"
    case "sscc18":
      return "10614141192837465"
    case "isbn":
      return "978-0-306-40615-7"
    case "issn":
      return "0317-8471"
    case "ismn":
      return "M-2306-7118-7"
    case "code32":
      return "12345678"
    case "pzn":
      return "123456"
    case "pzn8":
      return "1234567"
    case "aztecrune":
      return "42"
    case "pharmacode2":
      return "1234"
    case "mailmark":
      return "JGB 012100123456789AB19XY1A 0                "
    case "industrial2of5":
    case "iata2of5":
    case "matrix2of5":
    case "coop2of5":
    case "datalogic2of5":
      return "1234567890"
    default:
      return "TEST123"
  }
}

describe("validator agrees with the encoders", () => {
  const cases: Array<[string, string]> = [
    ["code128", "HELLO"],
    ["ean13", "4006381333931"],
    ["ean8", "96385074"],
    ["code39", "HELLO"],
    ["itf", "1234567890"],
    ["itf14", "15400141288763"],
    ["upca", "036000291452"],
    ["ean2", "12"],
    ["ean5", "12345"],
    ["codabar", "123456"],
    ["msi", "1234"],
    ["code11", "1234-5"],
    ["identcode", "56310243031"],
    ["leitcode", "2131000006418"],
    ["plessey", "1234"],
    ["ean14", "1234567890123"],
    ["sscc18", "10614141192837465"],
    ["isbn", "0-306-40615-2"],
    ["issn", "0317-8471"],
    ["ismn", "M-2306-7118-7"],
    ["code32", "12345678"],
    ["pzn", "123456"],
    ["pzn8", "1234567"],
    ["industrial2of5", "1234567890"],
    ["iata2of5", "1234567890"],
    ["matrix2of5", "1234567890"],
    ["coop2of5", "1234567890"],
    ["datalogic2of5", "1234567890"],
  ]

  it("input the validator accepts, the encoder encodes", () => {
    for (const [type, text] of cases) {
      expect(validateBarcode(text, type).valid, type).toBe(true)
      expect(() => encodeBars(text, { type: type as "code128" }), type).not.toThrow()
    }
  })

  it("postal input the validator accepts, the postal encoder encodes", () => {
    const postalCases: Array<[string, string]> = [
      ["postnet", "12345"],
      ["planet", "12345678901"],
      ["rm4scc", "SN34RD1A"],
      ["kix", "2500GG"],
      ["auspost", "12345678"],
      ["jppost", "1234567"],
      ["imb", "01234567094987654321"],
    ]
    for (const [type, text] of postalCases) {
      expect(validateBarcode(text, type).valid, type).toBe(true)
      expect(() => encodePostal(text, { type: type as "postnet" }), type).not.toThrow()
    }
  })

  it("input the validator rejects, the encoder also rejects", () => {
    const rejected: Array<[string, string]> = [
      ["ean13", "123"],
      ["ean8", "123"],
      ["itf", "12A45"],
      ["msi", "12A4"],
      ["code11", "12A4"],
      ["ean2", "123"],
      ["ean5", "1234"],
      ["ean14", "123"],
      ["sscc18", "123"],
      ["isbn", "0306406153"],
      ["issn", "0317-8472"],
      ["ismn", "9791230671187"],
      ["code32", "1234567"],
      ["pzn", "500000"],
      ["pzn8", "123456"],
      ["industrial2of5", "12A45"],
      ["matrix2of5", ""],
    ]
    for (const [type, text] of rejected) {
      expect(validateBarcode(text, type).valid, type).toBe(false)
      expect(() => encodeBars(text, { type: type as "code128" }), type).toThrow()
    }
  })
})

describe("validateBarcodeInput — check digits", () => {
  it("computes the EAN-13 check digit", () => {
    expect(validateBarcodeInput("400638133393", "ean13")).toEqual({ valid: true, checkDigit: 1 })
  })

  it("computes the EAN-8 check digit", () => {
    const result = validateBarcodeInput("9638507", "ean8")
    expect(result.valid).toBe(true)
    expect(result.checkDigit).toBe(4)
  })

  it("computes the UPC-A check digit", () => {
    expect(validateBarcodeInput("03600029145", "upca").checkDigit).toBe(2)
  })

  it("computes the ITF-14 check digit", () => {
    expect(validateBarcodeInput("1540014128876", "itf14").checkDigit).toBe(3)
  })

  it("computes the UPC-E check digit", () => {
    const result = validateBarcodeInput("012345", "upce")
    expect(result.valid).toBe(true)
    expect(typeof result.checkDigit).toBe("number")
  })

  it("computes Identcode/Leitcode check digits matching the encoder", () => {
    const ident = validateBarcodeInput("56310243031", "identcode")
    expect(ident.valid).toBe(true)
    // The encoder accepts data + the validator's check digit as a complete code
    expect(() => encodeIdentcode("56310243031" + String(ident.checkDigit))).not.toThrow()

    const leit = validateBarcodeInput("2131000006418", "leitcode")
    expect(leit.valid).toBe(true)
    expect(() => encodeLeitcode("2131000006418" + String(leit.checkDigit))).not.toThrow()
  })

  it("computes POSTNET/PLANET check digits", () => {
    // 1+2+3+4+5 = 15 → (10 - 15 % 10) % 10 = 5
    expect(validateBarcodeInput("12345", "postnet").checkDigit).toBe(5)
    // 1+2+…+9+0+1 = 46 → (10 - 46 % 10) % 10 = 4
    expect(validateBarcodeInput("12345678901", "planet").checkDigit).toBe(4)
    // The encoders append the same digit
    expect(encodePOSTNET("12345").length).toBe(1 + 6 * 5 + 1)
    expect(encodePLANET("12345678901").length).toBe(1 + 12 * 5 + 1)
  })

  it("returns no check digit for types that do not define one", () => {
    expect(validateBarcodeInput("HELLO", "code128")).toEqual({ valid: true })
    expect(validateBarcodeInput("HELLO", "code39")).toEqual({ valid: true })
  })

  it("propagates validation failures without computing a check digit", () => {
    const result = validateBarcodeInput("123", "ean13")
    expect(result.valid).toBe(false)
    expect(result.checkDigit).toBeUndefined()
  })
})

describe("EAN check digit helpers", () => {
  it("calculates known check digits", () => {
    expect(calculateEANCheckDigit([4, 0, 0, 6, 3, 8, 1, 3, 3, 3, 9, 3])).toBe(1)
    expect(calculateEANCheckDigit([9, 6, 3, 8, 5, 0, 7])).toBe(4)
  })

  it("verifies complete codes", () => {
    expect(verifyEANCheckDigit("4006381333931")).toBe(true)
    expect(verifyEANCheckDigit("4006381333930")).toBe(false)
    expect(verifyEANCheckDigit("96385074")).toBe(true)
  })

  it("rejects input too short to carry a check digit", () => {
    expect(verifyEANCheckDigit("")).toBe(false)
    expect(verifyEANCheckDigit("5")).toBe(false)
  })

  it("ignores non-digit separators", () => {
    expect(verifyEANCheckDigit("4-006381333931")).toBe(true)
  })
})
