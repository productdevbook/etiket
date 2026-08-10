/**
 * Randomised sweeps over the GS1 family.
 *
 * The same lens that found the Micro QR padding, the Data Matrix block
 * interleaving and the Code 128 shift: throw a few hundred payloads at each
 * encoder rather than the handful each test happens to pin, decode them where
 * a reader exists and compare with BWIPP where one does not.
 *
 * Nothing here found a defect, which is the point of keeping it.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import {
  encodeGS1DataBarOmni,
  encodeGS1DataBarTruncated,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
  encodeGS1Composite,
  encodeGS1128,
} from "../src/index"
import {
  gs1DataBarStackedRows,
  gs1DataBarStackedOmniRows,
  gs1DataBarExpandedStackedRows,
} from "../src/encoders/gs1-databar"
import { bwipBars, bwipMatrix, trimTrailingSpace } from "./_bwip"

function makeRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

/** The GS1 mod 10 check digit for a body of digits. */
function checkDigit(body: string): string {
  let sum = 0
  const digits = [...body].map(Number).reverse()
  for (const [i, digit] of digits.entries()) sum += digit * (i % 2 === 0 ? 3 : 1)
  return String((10 - (sum % 10)) % 10)
}

/** 13 digits of GTIN, the body DataBar takes without its check digit. */
function gtinBody(random: () => number): string {
  let digits = ""
  for (let i = 0; i < 13; i++) digits += Math.floor(random() * 10)
  return digits
}

function show(matrix: (number[] | boolean[])[]): string[] {
  return matrix.map((row) => [...row].map((v) => (v ? "1" : "0")).join(""))
}

async function decode(bars: number[]): Promise<string | null> {
  const unit = 4
  const quiet = 40
  const width = bars.reduce((sum, run) => sum + run, 0) * unit + quiet * 2
  const height = 180
  const data = new Uint8ClampedArray(width * height * 4)
  data.fill(255)
  let x = quiet
  for (const [index, run] of bars.entries()) {
    const runWidth = run * unit
    if (index % 2 === 0) {
      for (let px = x; px < x + runWidth; px++) {
        for (let y = 0; y < height; y++) {
          const i = (y * width + px) * 4
          data[i] = 0
          data[i + 1] = 0
          data[i + 2] = 0
        }
      }
    }
    x += runWidth
  }
  const results = await readBarcodes({ data, width, height } as ImageData, { tryHarder: true })
  return results[0]?.text ?? null
}

describe("GS1 DataBar round-trip", () => {
  it.each([
    ["omnidirectional", encodeGS1DataBarOmni, 2468],
    ["truncated", encodeGS1DataBarTruncated, 2468],
    // Limited carries values below 2 x 10^13, so the leading digit is 0 or 1
    ["limited", (body: string) => encodeGS1DataBarLimited(`0${body.slice(1)}`), 1357],
  ] as const)("%s carries a random GTIN", async (name, encode, seed) => {
    const random = makeRandom(seed)
    for (let n = 0; n < 30; n++) {
      const body = name === "limited" ? `0${gtinBody(random).slice(1)}` : gtinBody(random)
      expect(await decode(encode(body)), body).toBe(`(01)${body}${checkDigit(body)}`)
    }
  })

  it("expanded carries a GTIN and a second application identifier", async () => {
    const random = makeRandom(8642)
    for (let n = 0; n < 30; n++) {
      const lot = "ABCDEFGHIJ0123456789".slice(0, 1 + Math.floor(random() * 12))
      const body = gtinBody(random)
      const payload = `(01)${body}${checkDigit(body)}(10)${lot}`
      expect((await decode(encodeGS1DataBarExpanded(payload)))?.includes(lot), payload).toBe(true)
    }
  })
})

describe("GS1 against BWIPP", () => {
  // (37) is left out: GS1 forbids it alongside (01) and BWIPP enforces that
  // where etiket does not
  const AIS = [
    ["10", "ABCDEFGHIJ0123456789"],
    ["21", "0123456789ABCDEF"],
    ["30", "12345678"],
  ] as const

  it("GS1-128 matches over random application identifiers", () => {
    const random = makeRandom(2222)
    for (let n = 0; n < 60; n++) {
      const [ai, alphabet] = AIS[Math.floor(random() * AIS.length)]!
      const value = alphabet.slice(0, 1 + Math.floor(random() * alphabet.length))
      const body = gtinBody(random)
      const payload = `(01)${body}${checkDigit(body)}(${ai})${value}`
      expect(trimTrailingSpace(encodeGS1128(payload)), payload).toEqual(
        bwipBars("gs1-128", payload),
      )
    }
  })

  it.each([
    ["stacked", gs1DataBarStackedRows, "databarstacked"],
    ["stacked omnidirectional", gs1DataBarStackedOmniRows, "databarstackedomni"],
  ] as const)("DataBar %s matches", (_name, rowsOf, bcid) => {
    const random = makeRandom(3333)
    for (let n = 0; n < 30; n++) {
      const body = gtinBody(random)
      expect(show(rowsOf(body).rows), body).toEqual(
        show(bwipMatrix(bcid, `(01)${body}${checkDigit(body)}`)),
      )
    }
  })

  it("DataBar expanded stacked matches", () => {
    const random = makeRandom(4444)
    for (let n = 0; n < 30; n++) {
      const body = gtinBody(random)
      const payload = `(01)${body}${checkDigit(body)}(10)ABC${Math.floor(random() * 1000)}`
      expect(show(gs1DataBarExpandedStackedRows(payload).rows), payload).toEqual(
        show(bwipMatrix("databarexpandedstacked", payload)),
      )
    }
  })

  it.each(["CC-A", "CC-B", "CC-C"] as const)("the %s composite component matches", (version) => {
    const random = makeRandom(5555)
    for (let n = 0; n < 15; n++) {
      const payload = `(17)26040${Math.floor(random() * 10)}(10)AB${Math.floor(random() * 100)}`
      expect(show(encodeGS1Composite(payload, version).composite), payload).toEqual(
        show(bwipMatrix("gs1-cc", payload, { ccversion: version.slice(3).toLowerCase() })),
      )
    }
  })
})
