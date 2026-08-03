import { describe, expect, it } from "vitest"
import {
  encodeGS1DataBarOmni,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
} from "../src/encoders/gs1-databar"
import { barcode } from "../src/index"

describe("GS1 DataBar Omnidirectional", () => {
  it("encodes 14-digit GTIN", () => {
    const bars = encodeGS1DataBarOmni("01234567890128")
    expect(bars.length).toBeGreaterThan(0)
    for (const b of bars) expect(b).toBeGreaterThanOrEqual(1)
  })

  it("encodes 13-digit GTIN (auto check digit)", () => {
    const bars = encodeGS1DataBarOmni("0123456789012")
    expect(bars.length).toBeGreaterThan(0)
  })

  it("produces exactly 46 elements totaling 96 modules", () => {
    const bars = encodeGS1DataBarOmni("01234567890128")
    expect(bars).toHaveLength(46)
    expect(bars.reduce((a, b) => a + b, 0)).toBe(96)
  })

  it("has correct guard patterns", () => {
    const bars = encodeGS1DataBarOmni("01234567890128")
    expect(bars[0]).toBe(1)
    expect(bars[1]).toBe(1)
    expect(bars[44]).toBe(1)
    expect(bars[45]).toBe(1)
  })

  it("all elements are between 1 and 9", () => {
    const bars = encodeGS1DataBarOmni("5901234123457")
    for (const b of bars) {
      expect(b).toBeGreaterThanOrEqual(1)
      expect(b).toBeLessThanOrEqual(9)
    }
  })

  it("same input produces same output (deterministic)", () => {
    const a = encodeGS1DataBarOmni("01234567890128")
    const b = encodeGS1DataBarOmni("01234567890128")
    expect(a).toEqual(b)
  })

  it("different GTINs produce different output", () => {
    const a = encodeGS1DataBarOmni("01234567890128")
    const b = encodeGS1DataBarOmni("5901234123457")
    expect(a).not.toEqual(b)
  })

  it("13-digit and 14-digit (with check) produce same output", () => {
    const a = encodeGS1DataBarOmni("0123456789012")
    const b = encodeGS1DataBarOmni("01234567890128")
    expect(a).toEqual(b)
  })

  it("throws on non-numeric", () => {
    expect(() => encodeGS1DataBarOmni("ABC")).toThrow()
  })

  it("throws on wrong length", () => {
    expect(() => encodeGS1DataBarOmni("12345")).toThrow()
  })

  it("throws on invalid check digit", () => {
    expect(() => encodeGS1DataBarOmni("01234567890129")).toThrow(/check digit/i)
  })

  it("works via barcode()", () => {
    const svg = barcode("01234567890128", { type: "gs1-databar" })
    expect(svg).toContain("<svg")
  })
})

describe("GS1 DataBar Limited", () => {
  it("encodes GTIN starting with 0", () => {
    const bars = encodeGS1DataBarLimited("01234567890128")
    expect(bars.length).toBeGreaterThan(0)
  })

  it("encodes GTIN starting with 1", () => {
    const bars = encodeGS1DataBarLimited("11234567890125")
    expect(bars.length).toBeGreaterThan(0)
  })

  it("produces exactly 47 elements", () => {
    const bars = encodeGS1DataBarLimited("01234567890128")
    expect(bars).toHaveLength(47)
  })

  it("has correct guard patterns and terminator", () => {
    const bars = encodeGS1DataBarLimited("01234567890128")
    expect(bars[0]).toBe(1)
    expect(bars[1]).toBe(1)
    expect(bars[44]).toBe(1)
    expect(bars[45]).toBe(1)
    expect(bars[46]).toBe(5) // terminator bar
  })

  it("data pairs each sum to 26 modules", () => {
    const bars = encodeGS1DataBarLimited("01234567890128")
    // Left pair: elements 2-15 (14 elements)
    const leftPairSum = bars.slice(2, 16).reduce((a, b) => a + b, 0)
    expect(leftPairSum).toBe(26)
    // Right pair: elements 30-43 (14 elements)
    const rightPairSum = bars.slice(30, 44).reduce((a, b) => a + b, 0)
    expect(rightPairSum).toBe(26)
  })

  it("all elements are between 1 and 9", () => {
    const bars = encodeGS1DataBarLimited("01234567890128")
    // Skip terminator bar (index 46 = 5)
    for (let i = 0; i < 46; i++) {
      expect(bars[i]).toBeGreaterThanOrEqual(1)
      expect(bars[i]).toBeLessThanOrEqual(9)
    }
  })

  it("throws on GTIN starting with 2+", () => {
    expect(() => encodeGS1DataBarLimited("21234567890122")).toThrow()
  })

  it("throws on invalid check digit", () => {
    expect(() => encodeGS1DataBarLimited("01234567890121")).toThrow(/check digit/i)
  })

  it("works via barcode()", () => {
    const svg = barcode("01234567890128", { type: "gs1-databar-limited" })
    expect(svg).toContain("<svg")
  })
})

describe("GS1 DataBar Expanded", () => {
  it("encodes AI data", () => {
    const bars = encodeGS1DataBarExpanded("(01)12345678901234")
    expect(bars.length).toBeGreaterThan(0)
  })

  it("encodes plain text", () => {
    const bars = encodeGS1DataBarExpanded("HELLO123")
    expect(bars.length).toBeGreaterThan(0)
  })

  it("has correct guard patterns", () => {
    const bars = encodeGS1DataBarExpanded("(01)12345678901234")
    expect(bars[0]).toBe(1)
    expect(bars[1]).toBe(1)
    expect(bars[bars.length - 2]).toBe(1)
    expect(bars[bars.length - 1]).toBe(1)
  })

  it("all elements are >= 1", () => {
    const bars = encodeGS1DataBarExpanded("(01)12345678901234")
    for (const b of bars) {
      expect(b).toBeGreaterThanOrEqual(1)
    }
  })

  it("longer data produces more elements", () => {
    const short = encodeGS1DataBarExpanded("(01)12345678901234")
    const long = encodeGS1DataBarExpanded("(01)12345678901234(10)ABC123")
    expect(long.length).toBeGreaterThan(short.length)
  })

  it("throws on empty", () => {
    expect(() => encodeGS1DataBarExpanded("")).toThrow()
  })

  it("works via barcode()", () => {
    const svg = barcode("(01)12345678901234", { type: "gs1-databar-expanded" })
    expect(svg).toContain("<svg")
  })

  it("different data produces different output", () => {
    const a = encodeGS1DataBarExpanded("(01)12345678901234")
    const b = encodeGS1DataBarExpanded("(01)98765432109876")
    expect(a).not.toEqual(b)
  })

  it("deterministic encoding", () => {
    const a = encodeGS1DataBarExpanded("(01)12345678901234")
    const b = encodeGS1DataBarExpanded("(01)12345678901234")
    expect(a).toEqual(b)
  })
})
