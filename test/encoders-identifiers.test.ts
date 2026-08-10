/**
 * Numbering schemes carried by another symbology: ISBN, ISSN and ISMN over
 * EAN-13, EAN-14 and SSCC-18 over GS1-128, Code 32 and PZN over Code 39.
 *
 * None of them changes how a symbol is drawn — `bwip-compare.test.ts` pins the
 * modules against BWIPP for each. What is under test here is the transformation
 * on the way in: which digits reach the underlying symbology, and which inputs
 * are refused. Every symbol that a decoder understands is read back through
 * zxing, so the digits are checked from the other end too.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import {
  encodeCode32,
  encodeCode39,
  encodeEAN13,
  encodeEAN14,
  encodeGS1128,
  encodeISBN,
  encodeISMN,
  encodeISSN,
  encodePZN,
  encodeSSCC18,
} from "../src/index"
import { CheckDigitError, InvalidInputError } from "../src/errors"

function barsToImageData(bars: number[], barWidth = 4, height = 100, margin = 40) {
  let totalModules = 0
  for (const w of bars) totalModules += w
  const width = totalModules * barWidth + margin * 2
  const imgHeight = height + margin * 2
  const data = new Uint8ClampedArray(width * imgHeight * 4)
  data.fill(255)

  let x = margin
  let isBar = true
  for (const w of bars) {
    if (isBar) {
      for (let py = margin; py < margin + height; py++) {
        for (let px = x; px < x + w * barWidth && px < width; px++) {
          const idx = (py * width + px) * 4
          data[idx] = 0
          data[idx + 1] = 0
          data[idx + 2] = 0
        }
      }
    }
    x += w * barWidth
    isBar = !isBar
  }
  return { data, width, height: imgHeight }
}

async function decode(bars: number[]): Promise<string | null> {
  const results = await readBarcodes(barsToImageData(bars) as unknown as ImageData, {
    tryHarder: true,
  })
  return results[0]?.text ?? null
}

describe("ISBN", () => {
  it("moves a ten digit ISBN to the 978 prefix", () => {
    expect(encodeISBN("0306406152").bars).toEqual(encodeEAN13("9780306406157").bars)
  })

  it("ignores the hyphens of the printed form", () => {
    expect(encodeISBN("0-306-40615-2").bars).toEqual(encodeISBN("0306406152").bars)
    expect(encodeISBN("978-0-306-40615-7").bars).toEqual(encodeISBN("9780306406157").bars)
  })

  it("takes a thirteen digit ISBN as the payload it already is", () => {
    expect(encodeISBN("9780306406157").bars).toEqual(encodeEAN13("9780306406157").bars)
  })

  it("computes the check digit when it is left off", () => {
    expect(encodeISBN("030640615").bars).toEqual(encodeISBN("0306406152").bars)
    expect(encodeISBN("978030640615").bars).toEqual(encodeISBN("9780306406157").bars)
  })

  it("accepts X as the ISBN-10 check digit", () => {
    expect(encodeISBN("043942089X").bars).toEqual(encodeEAN13("9780439420891").bars)
  })

  it("rejects a wrong check digit", () => {
    expect(() => encodeISBN("0306406153")).toThrow(CheckDigitError)
  })

  it("rejects anything that is not an ISBN", () => {
    expect(() => encodeISBN("12345")).toThrow(InvalidInputError)
    expect(() => encodeISBN("9770306406157")).toThrow(InvalidInputError)
  })

  it("reads back as its EAN-13", async () => {
    expect(await decode(encodeISBN("0-306-40615-2").bars)).toBe("9780306406157")
  })
})

describe("ISSN", () => {
  it("puts the serial number behind the 977 prefix", () => {
    expect(encodeISSN("0317-8471").bars).toEqual(encodeEAN13("9770317847001").bars)
  })

  it("replaces the ISSN check digit with the sequence variant", () => {
    expect(encodeISSN("0317-8471", { variant: "01" }).bars).toEqual(
      encodeEAN13("9770317847018").bars,
    )
  })

  it("computes the ISSN check digit when it is left off", () => {
    expect(encodeISSN("0317847").bars).toEqual(encodeISSN("0317-8471").bars)
  })

  it("accepts X as the ISSN check digit", () => {
    expect(encodeISSN("0000-006X").bars).toEqual(encodeEAN13("977000000600").bars)
  })

  it("rejects a wrong check digit, a bad variant and a bad length", () => {
    expect(() => encodeISSN("0317-8472")).toThrow(CheckDigitError)
    expect(() => encodeISSN("0317-8471", { variant: "1" })).toThrow(InvalidInputError)
    expect(() => encodeISSN("03178")).toThrow(InvalidInputError)
  })

  it("reads back as its EAN-13", async () => {
    expect(await decode(encodeISSN("0317-8471").bars)).toBe("9770317847001")
  })
})

describe("ISMN", () => {
  it("rewrites the M form as the 9790 prefix", () => {
    expect(encodeISMN("M-2306-7118-7").bars).toEqual(encodeEAN13("9790230671187").bars)
  })

  it("takes the thirteen digit form as it is", () => {
    expect(encodeISMN("979-0-2306-7118-7").bars).toEqual(encodeISMN("M23067118").bars)
  })

  it("rejects a wrong check digit and a bad prefix", () => {
    expect(() => encodeISMN("M-2306-7118-8")).toThrow(CheckDigitError)
    expect(() => encodeISMN("9791230671187")).toThrow(InvalidInputError)
  })

  it("reads back as its EAN-13", async () => {
    expect(await decode(encodeISMN("M-2306-7118-7").bars)).toBe("9790230671187")
  })
})

describe("EAN-14 and SSCC-18", () => {
  it("wraps a GTIN-14 in AI (01)", () => {
    expect(encodeEAN14("1234567890123")).toEqual(encodeGS1128("(01)12345678901231"))
  })

  it("wraps an SSCC in AI (00)", () => {
    expect(encodeSSCC18("10614141192837465")).toEqual(encodeGS1128("(00)106141411928374657"))
  })

  it("accepts the application identifier in the input", () => {
    expect(encodeEAN14("(01)1234567890123")).toEqual(encodeEAN14("1234567890123"))
    expect(encodeSSCC18("(00)10614141192837465")).toEqual(encodeSSCC18("10614141192837465"))
  })

  it("verifies a check digit that is supplied", () => {
    expect(encodeEAN14("12345678901231")).toEqual(encodeEAN14("1234567890123"))
    expect(() => encodeEAN14("12345678901232")).toThrow(CheckDigitError)
    expect(() => encodeSSCC18("106141411928374658")).toThrow(CheckDigitError)
  })

  it("rejects the wrong number of digits", () => {
    expect(() => encodeEAN14("123456789012")).toThrow(InvalidInputError)
    expect(() => encodeSSCC18("1061414119283746")).toThrow(InvalidInputError)
  })

  it("reads back as a GS1-128", async () => {
    expect(await decode(encodeEAN14("1234567890123"))).toBe("(01)12345678901231")
  })
})

describe("Code 32", () => {
  it("packs the nine digits into six base-32 characters", () => {
    // 123456788 in base 32 is 3 21 23 19 8 20, which over an alphabet with no
    // vowels in it is 3PRM8N
    expect(encodeCode32("12345678")).toEqual(encodeCode39("3PRM8N"))
  })

  it("accepts the check digit when it is already there", () => {
    expect(encodeCode32("123456788")).toEqual(encodeCode32("12345678"))
  })

  it("rejects a wrong check digit and a bad length", () => {
    expect(() => encodeCode32("123456780")).toThrow(CheckDigitError)
    expect(() => encodeCode32("1234567")).toThrow(InvalidInputError)
    expect(() => encodeCode32("1234567A")).toThrow(InvalidInputError)
  })

  it("reads back as the Italian Pharmacode it carries", async () => {
    // zxing recognises the symbology and unpacks the base-32 characters, so
    // this checks the digits themselves rather than the packing
    expect(await decode(encodeCode32("12345678"))).toBe("A123456788")
  })
})

describe("PZN", () => {
  it("puts a dash in front of the digits", () => {
    expect(encodePZN("123456")).toEqual(encodeCode39("-1234562"))
    expect(encodePZN("1234567", { pzn8: true })).toEqual(encodeCode39("-12345678"))
  })

  it("weights the digits from 2 for a PZN-7 and from 1 for a PZN-8", () => {
    // The same digits, a different scheme, a different check digit
    expect(encodePZN("1234567", { pzn8: true })).not.toEqual(encodePZN("123456"))
  })

  it("accepts the check digit when it is already there", () => {
    expect(encodePZN("1234562")).toEqual(encodePZN("123456"))
    expect(encodePZN("12345678", { pzn8: true })).toEqual(encodePZN("1234567", { pzn8: true }))
  })

  it("rejects a number with no valid check digit", () => {
    // A remainder of 10 has no single digit representation
    expect(() => encodePZN("500000")).toThrow(/no valid check digit/)
  })

  it("rejects a wrong check digit and a bad length", () => {
    expect(() => encodePZN("1234563")).toThrow(CheckDigitError)
    expect(() => encodePZN("12345")).toThrow(InvalidInputError)
    expect(() => encodePZN("123456", { pzn8: true })).toThrow(InvalidInputError)
  })

  it("reads back as the Code 39 symbol it is", async () => {
    expect(await decode(encodePZN("123456"))).toBe("-1234562")
  })
})
