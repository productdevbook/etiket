/**
 * Full-surface coverage for encode(): every supported type, option passthrough,
 * and agreement with the dedicated encoders it dispatches to.
 */

import { describe, expect, it } from "vitest"
import { encode } from "../src/_encode"
import { encodeBars } from "../src/_barcode"
import { encodePostal } from "../src/_postal"
import { encodeQR } from "../src/encoders/qr/index"
import { encodeMicroQR } from "../src/encoders/qr/micro"
import { encodeRMQR } from "../src/encoders/rmqr"
import { encodeDataMatrix, encodeGS1DataMatrix } from "../src/encoders/datamatrix/index"
import { encodePDF417 } from "../src/encoders/pdf417/index"
import { encodeMicroPDF417 } from "../src/encoders/micropdf417"
import { encodeAztec } from "../src/encoders/aztec/index"
import { encodeMaxiCode } from "../src/encoders/maxicode"
import { encodeDotCode } from "../src/encoders/dotcode"
import { encodeHanXin } from "../src/encoders/hanxin"
import { encodeCodablockF } from "../src/encoders/codablock-f"
import { encodeCode16K } from "../src/encoders/code16k"
import { ENCODE_TYPES } from "../src/_types"
import type { EncodeType } from "../src/_types"

/** Valid sample input for every encode type. */
const SAMPLES: Array<[EncodeType, string]> = [
  // 1D
  ["code128", "HELLO"],
  ["ean13", "4006381333931"],
  ["ean8", "96385074"],
  ["code39", "HELLO"],
  ["code39ext", "Hello"],
  ["code93", "HELLO"],
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
  ["identcode", "563102430313"],
  ["leitcode", "2131000006418"],
  ["plessey", "1234"],
  ["gs1-databar", "0012345678901"],
  ["gs1-databar-limited", "0012345678901"],
  ["gs1-databar-expanded", "(01)90012345678908"],
  ["gs1-databar-truncated", "0012345678901"],
  ["ean14", "1234567890123"],
  ["sscc18", "10614141192837465"],
  ["isbn", "978-0-306-40615-7"],
  ["issn", "0317-8471"],
  ["ismn", "M-2306-7118-7"],
  ["code32", "12345678"],
  ["pzn", "123456"],
  ["pzn8", "1234567"],
  // Postal
  ["postnet", "12345"],
  ["planet", "12345678901"],
  ["rm4scc", "SN34RD1A"],
  ["kix", "2500GG"],
  ["auspost", "12345678"],
  ["jppost", "1234567"],
  ["imb", "01234567094987654321"],
  // 2D
  ["qr", "HELLO"],
  ["microqr", "12345"],
  ["rmqr", "HELLO"],
  ["datamatrix", "HELLO"],
  ["gs1-datamatrix", "(01)12345678901231"],
  ["pdf417", "HELLO"],
  ["micropdf417", "HELLO"],
  ["aztec", "HELLO"],
  ["maxicode", "HELLO"],
  ["dotcode", "HELLO"],
  ["hanxin", "HELLO"],
  ["codablock-f", "HELLO"],
  ["code16k", "HELLO"],
]

const POSTAL_TYPES = new Set<EncodeType>([
  "postnet",
  "planet",
  "rm4scc",
  "kix",
  "auspost",
  "jppost",
  "imb",
])

const TWO_D_TYPES = new Set<EncodeType>([
  "qr",
  "microqr",
  "rmqr",
  "datamatrix",
  "gs1-datamatrix",
  "pdf417",
  "micropdf417",
  "aztec",
  "maxicode",
  "dotcode",
  "hanxin",
  "codablock-f",
  "code16k",
])

describe("encode() — every supported type", () => {
  for (const [type, sample] of SAMPLES) {
    it(`encodes ${type}`, () => {
      const result = encode(sample, { type })

      if (TWO_D_TYPES.has(type)) {
        expect(result.type, type).toBe("2d")
        if (result.type !== "2d") return
        expect(result.matrix.length, type).toBeGreaterThan(0)
        expect(result.matrix[0]!.length, type).toBeGreaterThan(0)
        for (const row of result.matrix) {
          expect(row.length, type).toBe(result.matrix[0]!.length)
        }
        // A symbol that is entirely light or entirely dark is broken
        const dark = result.matrix.flat().filter(Boolean).length
        expect(dark, type).toBeGreaterThan(0)
        expect(dark, type).toBeLessThan(result.matrix.flat().length)
      } else if (POSTAL_TYPES.has(type)) {
        expect(result.type, type).toBe("postal")
        if (result.type !== "postal") return
        expect(result.bars.length, type).toBeGreaterThan(0)
      } else {
        expect(result.type, type).toBe("1d")
        if (result.type !== "1d") return
        expect(result.bars.length, type).toBeGreaterThan(0)
        for (const bar of result.bars) {
          expect(typeof bar, type).toBe("number")
          expect(bar, type).toBeGreaterThanOrEqual(1)
        }
      }
    })
  }

  it("covers every declared type in the sample table", () => {
    // EncodeType is derived from ENCODE_TYPES, so this catches a new symbology
    // being added without a sample — which a hardcoded count could not
    const sampled = new Set(SAMPLES.map(([type]) => type))
    const missing = ENCODE_TYPES.filter((type) => !sampled.has(type))
    expect(missing, "encode types with no sample").toEqual([])
    expect(sampled.size).toBe(ENCODE_TYPES.length)
  })
})

describe("encode() agrees with the underlying encoders", () => {
  it("matches encodeBars for 1D types", () => {
    for (const [type, sample] of SAMPLES) {
      if (TWO_D_TYPES.has(type) || POSTAL_TYPES.has(type)) continue
      const result = encode(sample, { type })
      expect(result.type).toBe("1d")
      if (result.type !== "1d") continue
      expect(result.bars, type).toEqual(encodeBars(sample, { type: type as "code128" }))
    }
  })

  it("matches encodePostal for postal types", () => {
    for (const [type, sample] of SAMPLES) {
      if (!POSTAL_TYPES.has(type)) continue
      const result = encode(sample, { type })
      expect(result.type).toBe("postal")
      if (result.type !== "postal") continue
      expect(result.bars, type).toEqual(encodePostal(sample, { type: type as "postnet" }))
    }
  })

  it("matches the 2D encoders", () => {
    expect((encode("HELLO", { type: "qr" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeQR("HELLO"),
    )
    expect((encode("12345", { type: "microqr" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeMicroQR("12345"),
    )
    expect((encode("HELLO", { type: "rmqr" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeRMQR("HELLO"),
    )
    expect((encode("HELLO", { type: "datamatrix" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeDataMatrix("HELLO"),
    )
    expect(
      (encode("(01)12345678901231", { type: "gs1-datamatrix" }) as { matrix: boolean[][] }).matrix,
    ).toEqual(encodeGS1DataMatrix("(01)12345678901231"))
    expect((encode("HELLO", { type: "pdf417" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodePDF417("HELLO").matrix,
    )
    expect((encode("HELLO", { type: "micropdf417" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeMicroPDF417("HELLO").matrix,
    )
    expect((encode("HELLO", { type: "aztec" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeAztec("HELLO"),
    )
    expect((encode("HELLO", { type: "maxicode" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeMaxiCode("HELLO"),
    )
    expect((encode("HELLO", { type: "dotcode" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeDotCode("HELLO"),
    )
    expect((encode("HELLO", { type: "hanxin" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeHanXin("HELLO"),
    )
    expect((encode("HELLO", { type: "codablock-f" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeCodablockF("HELLO").matrix,
    )
    expect((encode("HELLO", { type: "code16k" }) as { matrix: boolean[][] }).matrix).toEqual(
      encodeCode16K("HELLO").matrix,
    )
  })
})

describe("encode() option passthrough", () => {
  it("passes 1D options that previously only barcode() honoured", () => {
    // code39CheckDigit was silently ignored by the old encode() implementation
    const plain = encode("HELLO", { type: "code39" })
    const checked = encode("HELLO", { type: "code39", code39CheckDigit: true })
    expect(plain).not.toEqual(checked)
    expect((checked as { bars: number[] }).bars).toEqual(
      encodeBars("HELLO", { type: "code39", code39CheckDigit: true }),
    )
  })

  it("passes codabar start/stop characters", () => {
    const a = encode("123456", { type: "codabar", codabarStart: "A", codabarStop: "B" })
    const c = encode("123456", { type: "codabar", codabarStart: "C", codabarStop: "D" })
    expect(a).not.toEqual(c)
  })

  it("passes the MSI check digit option", () => {
    const mod10 = encode("1234", { type: "msi", msiCheckDigit: "mod10" })
    const mod11 = encode("1234", { type: "msi", msiCheckDigit: "mod11" })
    expect(mod10).not.toEqual(mod11)
  })

  it("passes code128 charset", () => {
    const auto = encode("123456", { type: "code128" })
    const charsetC = encode("123456", { type: "code128", code128Charset: "C" })
    expect((charsetC as { bars: number[] }).bars.length).toBeLessThanOrEqual(
      (auto as { bars: number[] }).bars.length,
    )
  })

  it("passes QR encoder options", () => {
    const l = encode("HELLO", { type: "qr", qr: { ecLevel: "L" } })
    const h = encode("HELLO", { type: "qr", qr: { ecLevel: "H" } })
    expect(l).not.toEqual(h)
    expect((h as { matrix: boolean[][] }).matrix).toEqual(encodeQR("HELLO", { ecLevel: "H" }))
  })

  it("passes Micro QR options", () => {
    expect(encode("12345", { type: "microqr", microqr: { mask: 0 } })).not.toEqual(
      encode("12345", { type: "microqr", microqr: { mask: 3 } }),
    )
  })

  it("passes rMQR options", () => {
    expect(encode("HELLO", { type: "rmqr", rmqr: { ecLevel: "M" } })).not.toEqual(
      encode("HELLO", { type: "rmqr", rmqr: { ecLevel: "H" } }),
    )
  })

  it("passes PDF417 options", () => {
    expect(encode("HELLO", { type: "pdf417", pdf417: { columns: 2 } })).not.toEqual(
      encode("HELLO", { type: "pdf417", pdf417: { columns: 5 } }),
    )
  })

  it("passes MicroPDF417 options", () => {
    expect(encode("HELLO", { type: "micropdf417", micropdf417: { columns: 1 } })).not.toEqual(
      encode("HELLO", { type: "micropdf417", micropdf417: { columns: 4 } }),
    )
  })

  it("passes Aztec options", () => {
    // Aztec fills all spare capacity with EC, so ecPercent only shows up once
    // it forces a larger symbol — compare sizes rather than raw matrices.
    const low = encode("HELLO WORLD LONGER DATA STRING HERE 1234567890", {
      type: "aztec",
      aztec: { ecPercent: 5 },
    }) as { matrix: boolean[][] }
    const high = encode("HELLO WORLD LONGER DATA STRING HERE 1234567890", {
      type: "aztec",
      aztec: { ecPercent: 90 },
    }) as { matrix: boolean[][] }
    expect(high.matrix.length).toBeGreaterThan(low.matrix.length)

    // layers/compact are forwarded too
    expect(encode("HELLO", { type: "aztec", aztec: { layers: 2 } })).not.toEqual(
      encode("HELLO", { type: "aztec", aztec: { layers: 4 } }),
    )
  })

  it("passes MaxiCode options", () => {
    expect(
      encode("HELLO", {
        type: "maxicode",
        maxicode: { mode: 2, postalCode: "123456789", countryCode: 840 },
      }),
    ).not.toEqual(encode("HELLO", { type: "maxicode", maxicode: { mode: 4 } }))
  })

  it("passes Han Xin options", () => {
    expect(encode("HELLO", { type: "hanxin", hanxin: { ecLevel: 1 } })).not.toEqual(
      encode("HELLO", { type: "hanxin", hanxin: { ecLevel: 4 } }),
    )
  })

  it("passes Codablock-F options", () => {
    expect(
      encode("CODABLOCK TEST", { type: "codablock-f", codablockf: { columns: 8 } }),
    ).not.toEqual(encode("CODABLOCK TEST", { type: "codablock-f", codablockf: { columns: 16 } }))
  })

  it("passes the Australia Post format control code", () => {
    expect(encode("12345678", { type: "auspost", fcc: "11" })).not.toEqual(
      encode("12345678", { type: "auspost", fcc: "59" }),
    )
  })

  it("passes the IMb routing code", () => {
    expect(encode("01234567094987654321", { type: "imb", routingCode: "01234567891" })).not.toEqual(
      encode("01234567094987654321", { type: "imb" }),
    )
  })

  it("passes the Japan Post address", () => {
    expect(encode("1234567", { type: "jppost", routingCode: "1-2-3" })).not.toEqual(
      encode("1234567", { type: "jppost" }),
    )
  })
})

describe("encode() error handling", () => {
  it("rejects an unsupported type", () => {
    expect(() => encode("test", { type: "nope" as EncodeType })).toThrow(/Unsupported/)
  })

  it("propagates encoder validation errors", () => {
    expect(() => encode("HELLO", { type: "ean13" })).toThrow()
    expect(() => encode("", { type: "qr" })).toThrow()
    expect(() => encode("ABC", { type: "postnet" })).toThrow()
  })
})
