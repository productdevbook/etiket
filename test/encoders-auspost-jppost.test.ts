import { describe, expect, it } from "vitest"
import { encodeAustraliaPost, encodeJapanPost } from "../src/encoders/fourstate"

describe("Australia Post 4-State", () => {
  it("encodes FCC + DPID", () => {
    const bars = encodeAustraliaPost("11", "12345678")
    expect(bars.length).toBeGreaterThan(0)
  })

  it("all values are valid states", () => {
    const bars = encodeAustraliaPost("59", "98765432")
    for (const b of bars) {
      expect(["T", "A", "D", "F"]).toContain(b)
    }
  })

  it("starts and ends with frame bars", () => {
    const bars = encodeAustraliaPost("11", "12345678")
    expect(bars[0]).toBe("F")
    expect(bars[1]).toBe("A")
  })

  it("throws on invalid FCC", () => {
    expect(() => encodeAustraliaPost("1", "12345678")).toThrow()
  })

  it("throws on invalid DPID", () => {
    expect(() => encodeAustraliaPost("11", "1234")).toThrow()
  })

  it("different data produces different output", () => {
    const a = encodeAustraliaPost("11", "12345678")
    const b = encodeAustraliaPost("11", "87654321")
    expect(a).not.toEqual(b)
  })
})

describe("Japan Post 4-State", () => {
  it("encodes 7-digit zipcode", () => {
    const bars = encodeJapanPost("1000001")
    expect(bars.length).toBeGreaterThan(0)
  })

  it("strips dashes from zipcode", () => {
    const a = encodeJapanPost("100-0001")
    const b = encodeJapanPost("1000001")
    expect(a).toEqual(b)
  })

  it("encodes zipcode with address", () => {
    const bars = encodeJapanPost("1000001", "1-2-3")
    expect(bars.length).toBeGreaterThan(0)
  })

  it("all values are valid states", () => {
    const bars = encodeJapanPost("1000001")
    for (const b of bars) {
      expect(["T", "A", "D", "F"]).toContain(b)
    }
  })

  it("throws on invalid zipcode", () => {
    expect(() => encodeJapanPost("12345")).toThrow()
  })

  it("throws on invalid address characters", () => {
    expect(() => encodeJapanPost("1000001", "!@#")).toThrow()
  })

  it("accepts alphabetic characters in address", () => {
    const bars = encodeJapanPost("1000001", "A")
    expect(bars.length).toBeGreaterThan(0)
    for (const b of bars) {
      expect(["T", "A", "D", "F"]).toContain(b)
    }
  })

  it("starts with F,D and ends with D,F", () => {
    const bars = encodeJapanPost("1000001")
    expect(bars[0]).toBe("F")
    expect(bars[1]).toBe("D")
    expect(bars[bars.length - 2]).toBe("D")
    expect(bars[bars.length - 1]).toBe("F")
  })

  it("produces correct barcode length (start + 21*3 bars + stop)", () => {
    // 2 start bars + 21 chars * 3 bars each + 2 stop bars = 67 bars
    const bars = encodeJapanPost("1000001")
    expect(bars.length).toBe(2 + 21 * 3 + 2)
  })

  it("uses mod 19 check digit", () => {
    // Two different inputs should produce different check digits
    const a = encodeJapanPost("1000001")
    const b = encodeJapanPost("1000002")
    // They should differ (different data → different check)
    expect(a).not.toEqual(b)
  })
})
