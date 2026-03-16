import { describe, expect, it } from "vitest";
import { encodeIMb } from "../src/encoders/imb";

describe("USPS Intelligent Mail barcode", () => {
  it("encodes 20-digit tracking code only", () => {
    const bars = encodeIMb("01234567094987654321");
    expect(bars.length).toBe(65);
  });

  it("encodes tracking + 5-digit ZIP", () => {
    const bars = encodeIMb("01234567094987654321", "12345");
    expect(bars.length).toBe(65);
  });

  it("encodes tracking + 9-digit ZIP+4", () => {
    const bars = encodeIMb("01234567094987654321", "123456789");
    expect(bars.length).toBe(65);
  });

  it("encodes tracking + 11-digit delivery point", () => {
    const bars = encodeIMb("01234567094987654321", "12345678901");
    expect(bars.length).toBe(65);
  });

  it("all values are valid 4-state", () => {
    const bars = encodeIMb("01234567094987654321", "12345");
    for (const b of bars) {
      expect(["T", "A", "D", "F"]).toContain(b);
    }
  });

  it("strips spaces and dashes from routing", () => {
    const a = encodeIMb("01234567094987654321", "12345-6789");
    const b = encodeIMb("01234567094987654321", "123456789");
    expect(a).toEqual(b);
  });

  it("throws on wrong tracking length", () => {
    expect(() => encodeIMb("12345")).toThrow();
    expect(() => encodeIMb("123456789012345678901")).toThrow();
  });

  it("throws on wrong routing length", () => {
    expect(() => encodeIMb("01234567094987654321", "123")).toThrow();
    expect(() => encodeIMb("01234567094987654321", "1234567")).toThrow();
  });

  it("throws on non-digit tracking", () => {
    expect(() => encodeIMb("0123456709498765ABCD")).toThrow();
  });

  it("different tracking codes produce different bars", () => {
    const a = encodeIMb("01234567094987654321");
    const b = encodeIMb("99999999999999999999");
    expect(a).not.toEqual(b);
  });
});
