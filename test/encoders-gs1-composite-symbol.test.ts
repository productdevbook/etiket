/**
 * Complete GS1 Composite symbols — linear component, separator pattern and 2D
 * component — cross-verified against BWIPP's combined composite encoders.
 *
 * BWIPP returns the whole symbol as one module grid, which is exactly the shape
 * `encodeGS1CompositeSymbol` produces, so the comparison covers the linkage flag
 * in the linear component, the separator pattern and the component alignment in
 * one go. Every one of those three is specific to the linear symbology
 * underneath, so all of them are compared.
 */

import { describe, expect, it } from "vitest"
import {
  type CompositeLinearType,
  encodeGS1Composite,
  encodeGS1CompositeSymbol,
} from "../src/encoders/gs1-composite"
import { encodeGS1DataBarOmni } from "../src/encoders/gs1-databar"
import { bwipMatrix, describeDiff } from "./_bwip"

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

/** etiket linear type -> the BWIPP encoder that draws the same composite. */
const BCID: Record<CompositeLinearType, string> = {
  ean13: "ean13composite",
  ean8: "ean8composite",
  upca: "upcacomposite",
  upce: "upcecomposite",
  "gs1-128": "gs1-128composite",
  "databar-omni": "databaromnicomposite",
  "databar-truncated": "databartruncatedcomposite",
  "databar-limited": "databarlimitedcomposite",
  "databar-stacked": "databarstackedcomposite",
  "databar-stacked-omni": "databarstackedomnicomposite",
  "databar-expanded": "databarexpandedcomposite",
  "databar-expanded-stacked": "databarexpandedstackedcomposite",
}

/** Primary data each linear symbology accepts. */
const PRIMARY: Record<CompositeLinearType, string> = {
  ean13: "9521234543213",
  ean8: "9521234",
  upca: "416000336108",
  upce: "0123456",
  "gs1-128": "(01)03612345678904",
  "databar-omni": "(01)09521234543213",
  "databar-truncated": "(01)09521234543213",
  "databar-limited": "(01)09521234543213",
  "databar-stacked": "(01)09521234543213",
  "databar-stacked-omni": "(01)09521234543213",
  "databar-expanded": "(01)09521234543213(3103)001234",
  "databar-expanded-stacked": "(01)09521234543213(3103)001234",
}

/** Composite data covering every encodation method and compaction mode. */
const COMPOSITES = [
  "(11)990102",
  "(10)LOT1",
  "(21)SERIAL01",
  "(17)260101(10)BATCH01",
  "(90)1A2B3C4D5E",
  "(21)abc-123",
]

/** A payload that overflows CC-A, so CC-B has to be picked instead. */
const CC_B = "(21)ABCDEFGHIJ0123456789(10)ABCDEFGHIJ0123456789"

function expectMatches(
  linearType: CompositeLinearType,
  composite: string,
  options: { ccversion?: "b" | "c"; primary?: string; dontlint?: boolean } = {},
): void {
  const data = `${options.primary ?? PRIMARY[linearType]}|${composite}`
  const type = options.ccversion === "b" ? "CC-B" : options.ccversion === "c" ? "CC-C" : undefined
  const actual = rows(encodeGS1CompositeSymbol(linearType, data, { type }).matrix)
  const expected = rows(
    bwipMatrix(BCID[linearType], data, {
      ...(options.ccversion ? { ccversion: options.ccversion } : {}),
      ...(options.dontlint ? { dontlint: true } : {}),
    }),
  )
  expect(actual, `${linearType} ${data}: ${describeDiff(actual, expected)}`).toEqual(expected)
}

describe("GS1 Composite symbol vs bwip-js", () => {
  for (const linearType of Object.keys(BCID) as CompositeLinearType[]) {
    describe(linearType, () => {
      for (const composite of COMPOSITES) {
        it(composite, () => {
          expectMatches(linearType, composite)
        })
      }

      it("upgrades to CC-B when the data overflows CC-A", () => {
        expectMatches(linearType, CC_B)
      })
    })
  }
})

describe("GS1-128 Composite versions vs bwip-js", () => {
  it("CC-B on request", () => {
    expectMatches("gs1-128", "(10)LOT1", { ccversion: "b" })
  })

  for (const composite of ["(10)LOT1", "(17)260101(10)BATCH01", CC_B]) {
    it(`CC-C on request — ${composite}`, () => {
      expectMatches("gs1-128", composite, { ccversion: "c" })
    })
  }

  it("upgrades CC-B to CC-C, which only a GS1-128 can carry", () => {
    const long = Array.from({ length: 8 }, (_, i) => `(9${i})ABCDEFGHIJ0123456789`).join("")
    expectMatches("gs1-128", long)
  })

  /**
   * Under ten symbol characters the 2D component can no longer be inset from
   * the right hand end of the linear one, and shifts two modules instead.
   * BWIPP wants a GTIN alongside AI (10); the geometry is what is under test.
   */
  it("aligns the component over a short primary", () => {
    expectMatches("gs1-128", "(21)SERIAL01", { primary: "(10)LOT", dontlint: true })
  })
})

describe("GS1 Composite symbol shape", () => {
  it("exposes the components separately", () => {
    const symbol = encodeGS1CompositeSymbol("databar-omni", "(01)09521234543213|(11)990102")

    expect(symbol.type).toBe("CC-A")
    expect(symbol.linearType).toBe("databar-omni")
    expect(symbol.separator).toHaveLength(1)
    expect(symbol.composite.length + symbol.separator.length + 1).toBe(symbol.matrix.length)
    expect(symbol.rowHeights).toHaveLength(symbol.matrix.length)
    for (const row of symbol.matrix) expect(row).toHaveLength(symbol.cols)
  })

  it("EAN/UPC get a three module separator", () => {
    const symbol = encodeGS1CompositeSymbol("ean13", "9521234543213|(11)990102")
    expect(symbol.separator).toHaveLength(3)
    expect(symbol.rowHeights.at(-1)).toBe(symbol.linearHeight)
  })

  it("the linear component carries the linkage flag", () => {
    // A linked DataBar encodes 10^13 + GTIN, so its bars differ from standalone.
    const linked = encodeGS1CompositeSymbol("databar-omni", "(01)09521234543213|(11)990102")
    expect(linked.linear).not.toEqual(encodeGS1DataBarOmni("09521234543213"))
    expect(linked.linear).toEqual(encodeGS1DataBarOmni("09521234543213", { linkage: true }))
  })

  it("a stacked primary comes back as rows instead of bars", () => {
    const symbol = encodeGS1CompositeSymbol("databar-stacked", "(01)09521234543213|(11)990102")

    expect(symbol.linear).toEqual([])
    expect(symbol.linearRows).toHaveLength(3)
    expect(symbol.linearHeight).toBe(13)
    expect(symbol.rowHeights.slice(-3)).toEqual([5, 1, 7])
  })

  it("a CC-C component is three modules per row, the others two", () => {
    const ccc = encodeGS1CompositeSymbol("gs1-128", "(01)03612345678904|(10)LOT1", {
      type: "CC-C",
    })
    expect(new Set(ccc.rowHeights.slice(0, ccc.composite.length))).toEqual(new Set([3]))

    const cca = encodeGS1CompositeSymbol("gs1-128", "(01)03612345678904|(10)LOT1")
    expect(new Set(cca.rowHeights.slice(0, cca.composite.length))).toEqual(new Set([2]))
  })

  it("rejects CC-C over a primary that cannot carry one", () => {
    expect(() =>
      encodeGS1CompositeSymbol("databar-omni", "(01)09521234543213|(10)LOT1", { type: "CC-C" }),
    ).toThrow(/only a GS1-128/)
  })

  it("rejects CC-C over a GS1-128 too narrow to match", () => {
    // The narrowest GS1-128 that can carry one is 68 modules, so this is only
    // reachable by encoding the component on its own with a width to match.
    expect(() =>
      encodeGS1Composite("(10)LOT1", { type: "CC-C", linear: "gs1-128", linearWidth: 40 }),
    ).toThrow(/68 modules/)
  })

  it("rejects data without a component separator", () => {
    expect(() => encodeGS1CompositeSymbol("ean13", "9521234543213")).toThrow()
  })

  it("rejects an empty component", () => {
    expect(() => encodeGS1CompositeSymbol("ean13", "|(11)990102")).toThrow()
    expect(() => encodeGS1CompositeSymbol("ean13", "9521234543213|")).toThrow()
  })
})
