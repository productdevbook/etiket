import { describe, expect, it } from "vitest";
import { encodeRM4SCC, encodeKIX } from "../src/encoders/fourstate";

describe("RM4SCC (Royal Mail)", () => {
  it("encodes postcode", () => {
    const bars = encodeRM4SCC("EC1A1BB");
    expect(bars.length).toBeGreaterThan(0);
    expect(bars[0]).toBe("A"); // start bar
    expect(bars[bars.length - 1]).toBe("F"); // stop bar
  });

  it("all values are valid states", () => {
    const bars = encodeRM4SCC("SW1A2AA");
    for (const b of bars) {
      expect(["T", "A", "D", "F"]).toContain(b);
    }
  });

  it("includes check digit (longer than raw data)", () => {
    const bars = encodeRM4SCC("AB");
    // 2 data chars + 1 check = 3 chars × 4 bars + start + stop = 14
    expect(bars.length).toBe(14);
  });

  it("strips spaces", () => {
    const a = encodeRM4SCC("EC1A 1BB");
    const b = encodeRM4SCC("EC1A1BB");
    expect(a).toEqual(b);
  });

  it("case insensitive", () => {
    const a = encodeRM4SCC("ec1a1bb");
    const b = encodeRM4SCC("EC1A1BB");
    expect(a).toEqual(b);
  });

  it("throws on invalid characters", () => {
    expect(() => encodeRM4SCC("EC1A-1BB")).toThrow();
  });

  it("different postcodes produce different output", () => {
    const a = encodeRM4SCC("EC1A1BB");
    const b = encodeRM4SCC("SW1A2AA");
    expect(a).not.toEqual(b);
  });
});

describe("KIX (Dutch PostNL)", () => {
  it("encodes postcode", () => {
    const bars = encodeKIX("1234AB");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("has no start/stop bars", () => {
    const bars = encodeKIX("1234AB");
    // 6 chars × 4 bars = 24 (no start/stop, no check digit)
    expect(bars.length).toBe(24);
  });

  it("all values are valid states", () => {
    const bars = encodeKIX("9999ZZ");
    for (const b of bars) {
      expect(["T", "A", "D", "F"]).toContain(b);
    }
  });

  it("throws on invalid characters", () => {
    expect(() => encodeKIX("1234-AB")).toThrow();
  });
});
