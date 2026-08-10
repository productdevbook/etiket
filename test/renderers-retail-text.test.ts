/**
 * The human readable layout of a retail symbol.
 *
 * An EAN or UPC symbol does not print its digits as one centred line. The guard
 * patterns run past the other bars, the digits sit in the gaps they leave, and
 * the digits that fall outside — the lead digit of an EAN-13, both ends of a
 * UPC-A — go in the quiet zones. The encoders reported the guard positions from
 * the start and nothing consumed them; this is what consumes them.
 */

import { describe, expect, it } from "vitest"
import { barcode } from "../src/_barcode"
import { renderBarcodeSVG } from "../src/renderers/svg/barcode"
import { eanLayout } from "../src/renderers/svg/ean-layout"
import { encodeEAN13 } from "../src/encoders/ean"

/** The `<text>` elements of an SVG, in document order. */
function texts(svg: string): { x: number; text: string }[] {
  return [...svg.matchAll(/<text x="([\d.-]+)"[^>]*>([^<]*)<\/text>/g)].map((match) => ({
    x: Number(match[1]),
    text: match[2]!,
  }))
}

/** Every distinct bar height in the symbol, smallest first. */
function barHeights(svg: string): number[] {
  const heights = [...svg.matchAll(/<rect [^>]*height="([\d.]+)"[^>]*fill="#000"/g)].map((m) =>
    Number(m[1]),
  )
  return [...new Set(heights)].sort((a, b) => a - b)
}

describe("retail human readable text", () => {
  it("splits an EAN-13 into lead digit and two halves", () => {
    const svg = barcode("4006381333931", { type: "ean13", showText: true, moduleSize: 3 })
    expect(texts(svg).map((t) => t.text)).toEqual(["4", "006381", "333931"])
  })

  it("splits an EAN-8 into two halves with nothing outside", () => {
    const svg = barcode("96385074", { type: "ean8", showText: true, moduleSize: 3 })
    expect(texts(svg).map((t) => t.text)).toEqual(["9638", "5074"])
  })

  it("puts the UPC-A number system and check digit outside the symbol", () => {
    const svg = barcode("036000291452", { type: "upca", showText: true, moduleSize: 3 })
    const parts = texts(svg)
    expect(parts.map((t) => t.text)).toEqual(["0", "36000", "29145", "2"])
    // The outer two sit beyond the bars at either end
    const barXs = [...svg.matchAll(/<rect x="([\d.]+)"[^>]*fill="#000"/g)].map((m) => Number(m[1]))
    expect(parts[0]!.x).toBeLessThan(Math.min(...barXs))
    expect(parts[3]!.x).toBeGreaterThan(Math.max(...barXs))
  })

  it("splits a UPC-E the same way", () => {
    const svg = barcode("01234565", { type: "upce", showText: true, moduleSize: 3 })
    expect(texts(svg).map((t) => t.text)).toEqual(["0", "123456", "5"])
  })

  it("runs the guard bars past the others", () => {
    const svg = barcode("4006381333931", {
      type: "ean13",
      showText: true,
      moduleSize: 3,
      height: 70,
    })
    // Six guard bars — two per guard pattern — five modules longer than the rest
    expect(barHeights(svg)).toEqual([70, 85])
    const long = [...svg.matchAll(/height="85"/g)]
    expect(long).toHaveLength(6)
  })

  it("gives the symbol the quiet zones the standard asks for", () => {
    // Eleven modules to the left, seven to the right, which is also where the
    // digits outside the symbol go
    const svg = barcode("4006381333931", { type: "ean13", showText: true, moduleSize: 3 })
    const firstBar = Number(/<rect x="([\d.]+)"[^>]*fill="#000"/.exec(svg)![1])
    expect(firstBar).toBe(33)
  })

  it("leaves the plain layout alone when the caller supplies their own text", () => {
    const svg = barcode("4006381333931", { type: "ean13", showText: true, text: "own text" })
    expect(texts(svg).map((t) => t.text)).toEqual(["own text"])
    expect(barHeights(svg)).toHaveLength(1)
  })

  it("leaves every other symbology centred", () => {
    const svg = barcode("HELLO", { type: "code39", showText: true })
    expect(texts(svg).map((t) => t.text)).toEqual(["HELLO"])
    expect(barHeights(svg)).toHaveLength(1)
  })

  it("draws no text and no extension when showText is off", () => {
    const svg = barcode("4006381333931", { type: "ean13" })
    expect(texts(svg)).toEqual([])
    expect(barHeights(svg)).toHaveLength(1)
  })
})

describe("eanLayout", () => {
  it("refuses digits that do not match the symbology", () => {
    const { guards } = encodeEAN13("4006381333931")
    expect(eanLayout("ean13", "123", guards)).toBeUndefined()
    expect(eanLayout("ean8", "4006381333931", guards)).toBeUndefined()
  })

  it("refuses a symbol with no guard positions", () => {
    expect(eanLayout("ean13", "4006381333931", [])).toBeUndefined()
  })
})

describe("renderBarcodeSVG guard options", () => {
  it("extends the bars it is given and no others", () => {
    const svg = renderBarcodeSVG([1, 1, 1, 1, 1], {
      guardBars: [0],
      guardExtension: 4,
      moduleSize: 2,
      height: 50,
    })
    expect(barHeights(svg)).toEqual([50, 58])
  })

  it("makes room for the extension even with no text", () => {
    const plain = renderBarcodeSVG([1, 1, 1], { moduleSize: 2, height: 50 })
    const extended = renderBarcodeSVG([1, 1, 1], { moduleSize: 2, height: 50, guardBars: [0] })
    const heightOf = (svg: string) => Number(/height="(\d+)"/.exec(svg)![1])
    expect(heightOf(extended)).toBeGreaterThan(heightOf(plain))
  })
})
