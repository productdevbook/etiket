import { describe, expect, it } from "vitest"
import { encodeIMb } from "../src/encoders/imb"

describe("USPS Intelligent Mail barcode", () => {
  // USPS-B-3200 spec Example 4:
  // barcode_id=01, service_type=234, mailer_id=567094, serial=987654321
  // tracking = "01234567094987654321", routing = "01234567891" (11-digit delivery point)
  // Expected output: AADTFFDFTDADTAADAATFDTDDAAADDTDTTDAFADADDDTFFFDDTTTADFAAADFTDAADA
  it("encodes USPS-B-3200 spec example 4 correctly", () => {
    const bars = encodeIMb("01234567094987654321", "01234567891")
    expect(bars.join("")).toBe("AADTFFDFTDADTAADAATFDTDDAAADDTDTTDAFADADDDTFFFDDTTTADFAAADFTDAADA")
  })

  it("returns 65 bars for tracking code only", () => {
    const bars = encodeIMb("01234567094987654321")
    expect(bars.length).toBe(65)
  })

  it("returns 65 bars for tracking + 5-digit ZIP", () => {
    const bars = encodeIMb("01234567094987654321", "12345")
    expect(bars.length).toBe(65)
  })

  it("returns 65 bars for tracking + 9-digit ZIP+4", () => {
    const bars = encodeIMb("01234567094987654321", "123456789")
    expect(bars.length).toBe(65)
  })

  it("returns 65 bars for tracking + 11-digit delivery point", () => {
    const bars = encodeIMb("01234567094987654321", "12345678901")
    expect(bars.length).toBe(65)
  })

  it("all values are valid 4-state (T/A/D/F)", () => {
    const bars = encodeIMb("01234567094987654321", "12345")
    for (const b of bars) {
      expect(["T", "A", "D", "F"]).toContain(b)
    }
  })

  it("strips spaces and dashes from routing", () => {
    const a = encodeIMb("01234567094987654321", "12345-6789")
    const b = encodeIMb("01234567094987654321", "123456789")
    expect(a).toEqual(b)
  })

  it("throws on wrong tracking length", () => {
    expect(() => encodeIMb("12345")).toThrow()
    expect(() => encodeIMb("123456789012345678901")).toThrow()
  })

  it("throws on wrong routing length", () => {
    expect(() => encodeIMb("01234567094987654321", "123")).toThrow()
    expect(() => encodeIMb("01234567094987654321", "1234567")).toThrow()
  })

  it("throws on non-digit tracking", () => {
    expect(() => encodeIMb("0123456709498765ABCD")).toThrow()
  })

  it("different tracking codes produce different bars", () => {
    const a = encodeIMb("01234567094987654321")
    const b = encodeIMb("99999999999999999999")
    expect(a).not.toEqual(b)
  })

  it("different routing codes produce different bars", () => {
    const a = encodeIMb("01234567094987654321", "12345")
    const b = encodeIMb("01234567094987654321", "54321")
    expect(a).not.toEqual(b)
  })

  it("empty routing produces different result from non-empty", () => {
    const a = encodeIMb("01234567094987654321")
    const b = encodeIMb("01234567094987654321", "01234")
    expect(a).not.toEqual(b)
  })
})
