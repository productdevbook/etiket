/**
 * Nothing an encoder is given may disappear.
 *
 * Code 128 walked past every character above 126 without encoding it, and no
 * test noticed because the symbol it produced was perfectly well formed — just
 * for different data. The sweep below is the general form of that check: append
 * a character to a payload each symbology accepts, and the result has to either
 * change or be refused. Silently coming back the same means the character went
 * nowhere.
 */

import { describe, expect, it } from "vitest"
import { encodeBars } from "../src/_barcode"
import { encode } from "../src/_encode"
import { BARCODE_TYPES, EXTRA_ENCODE_TYPES } from "../src/_types"
import type { BarcodeType, EncodeType } from "../src/_types"

/** A payload each linear type accepts, with room to grow. */
const LINEAR: Record<BarcodeType, string> = {
  code128: "AB",
  // A base whose check digit is not one of the characters appended below,
  // where the "extra" would legitimately complete the number
  ean13: "978030640615",
  ean8: "9638507",
  code39: "AB",
  code39ext: "AB",
  code93: "AB",
  code93ext: "AB",
  itf: "1234",
  itf14: "0001234567890",
  upca: "03600029145",
  upce: "012345",
  ean2: "12",
  ean5: "12345",
  codabar: "1234",
  msi: "1234",
  pharmacode: "1234",
  code11: "1234",
  "gs1-128": "(10)AB",
  identcode: "56310243031",
  leitcode: "2134807501650",
  postnet: "12345",
  planet: "12345678901",
  plessey: "1234",
  "gs1-databar": "0012345678901",
  "gs1-databar-limited": "0012345678901",
  "gs1-databar-expanded": "(01)90012345678908",
  "gs1-databar-truncated": "0012345678901",
  ean14: "9876543210987",
  sscc18: "10614141192837465",
  isbn: "978-0-306-40615-7",
  issn: "0317-8471",
  ismn: "M-2306-7118-7",
  code32: "12345678",
  pzn: "123456",
  pzn8: "1234567",
  industrial2of5: "1234",
  iata2of5: "1234",
  matrix2of5: "1234",
  coop2of5: "1234",
  datalogic2of5: "1234",
}

/**
 * Characters to append. Spaces and hyphens are left out: several symbologies
 * treat them as the punctuation a printed number is written with and drop them
 * deliberately, which is documented on each.
 */
const EXTRAS = ["A", "1", "é", "", "日", "%"]

/** Height-modulated types have no bar widths; `encodeBars` refuses them. */
const HEIGHT_MODULATED = new Set<string>(["postnet", "planet"])

describe("no encoder drops input on the floor", () => {
  for (const type of BARCODE_TYPES) {
    if (HEIGHT_MODULATED.has(type)) continue
    it(type, () => {
      const base = LINEAR[type]
      const baseline = JSON.stringify(encodeBars(base, { type }))
      for (const extra of EXTRAS) {
        let longer: string | undefined
        try {
          longer = JSON.stringify(encodeBars(base + extra, { type }))
        } catch {
          continue // refused, which is the other acceptable answer
        }
        expect(longer, `${type} ignored ${JSON.stringify(extra)}`).not.toBe(baseline)
      }
    })
  }

  for (const type of EXTRA_ENCODE_TYPES) {
    if (HEIGHT_MODULATED.has(type)) continue
    it(type, () => {
      const base = SAMPLE_2D[type] ?? "AB12"
      const baseline = JSON.stringify(encode(base, { type }))
      for (const extra of EXTRAS) {
        let longer: string | undefined
        try {
          longer = JSON.stringify(encode(base + extra, { type }))
        } catch {
          continue
        }
        expect(longer, `${type} ignored ${JSON.stringify(extra)}`).not.toBe(baseline)
      }
    })
  }
})

/** Types whose input is not free text. */
const SAMPLE_2D: Partial<Record<EncodeType, string>> = {
  rm4scc: "SN34RD1A",
  kix: "2500GG",
  auspost: "12345678",
  jppost: "1234567",
  imb: "01234567094987654321",
  "gs1-datamatrix": "(10)AB",
  aztecrune: "4",
  pharmacode2: "1234",
  mailmark: "JGB 012100123456789AB19XY1A 0                ",
}
