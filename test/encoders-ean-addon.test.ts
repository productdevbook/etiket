import { describe, expect, it } from "vitest";
import { encodeEAN2, encodeEAN5 } from "../src/encoders/ean-addon";

describe("encodeEAN2", () => {
  // --- Valid encoding ---

  it("encodes a 2-digit string", () => {
    const bars = encodeEAN2("12");
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it('encodes "00" (minimum value)', () => {
    const bars = encodeEAN2("00");
    expect(bars.length).toBeGreaterThan(0);
  });

  it('encodes "99" (maximum value)', () => {
    const bars = encodeEAN2("99");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only valid widths (1-4)", () => {
    const bars = encodeEAN2("42");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("output length is fixed", () => {
    // EAN-2: start(3) + digit(4) + delineator(2) + digit(4) = 13
    const bars = encodeEAN2("12");
    expect(bars.length).toBe(13);
  });

  // --- Parity changes based on value mod 4 ---

  it("all four parity patterns produce different results", () => {
    const p0 = encodeEAN2("00"); // 0 mod 4 = 0 -> LL
    const p1 = encodeEAN2("01"); // 1 mod 4 = 1 -> LG
    const p2 = encodeEAN2("02"); // 2 mod 4 = 2 -> GL
    const p3 = encodeEAN2("03"); // 3 mod 4 = 3 -> GG
    // All should differ (different parity patterns)
    const results = [p0, p1, p2, p3];
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        expect(results[i]).not.toEqual(results[j]);
      }
    }
  });

  it("values with same mod-4 residue share parity pattern", () => {
    // 00 mod 4 = 0, 04 mod 4 = 0 — same parity, but different digit patterns
    const bars1 = encodeEAN2("00");
    const bars2 = encodeEAN2("04");
    // They should have same length but different content (different digits encoded)
    expect(bars1.length).toBe(bars2.length);
    expect(bars1).not.toEqual(bars2);
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeEAN2("12");
    const bars2 = encodeEAN2("34");
    expect(bars1).not.toEqual(bars2);
  });

  it("same input produces same output", () => {
    const bars1 = encodeEAN2("57");
    const bars2 = encodeEAN2("57");
    expect(bars1).toEqual(bars2);
  });

  // --- Invalid input handling ---

  it("throws on non-digits", () => {
    expect(() => encodeEAN2("AB")).toThrow("digits only");
  });

  it("throws on wrong length", () => {
    expect(() => encodeEAN2("1")).toThrow("exactly 2 digits");
    expect(() => encodeEAN2("123")).toThrow("exactly 2 digits");
  });

  it("throws on empty input", () => {
    expect(() => encodeEAN2("")).toThrow();
  });
});

describe("encodeEAN5", () => {
  // --- Valid encoding ---

  it("encodes a 5-digit string", () => {
    const bars = encodeEAN5("52495");
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it('encodes "00000" (minimum value)', () => {
    const bars = encodeEAN5("00000");
    expect(bars.length).toBeGreaterThan(0);
  });

  it('encodes "99999" (maximum value)', () => {
    const bars = encodeEAN5("99999");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only valid widths (1-4)", () => {
    const bars = encodeEAN5("52495");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("output length is fixed", () => {
    // EAN-5: start(3) + digit(4) + 4 * (delineator(2) + digit(4)) = 3 + 4 + 4*6 = 31
    const bars = encodeEAN5("12345");
    expect(bars.length).toBe(31);
  });

  // --- Checksum-based parity ---

  it("different checksum values produce different parity encodings", () => {
    // Use inputs designed to produce different checksum values
    const bars1 = encodeEAN5("00000"); // checksum = 0
    const bars2 = encodeEAN5("10000"); // checksum = 3
    expect(bars1).not.toEqual(bars2);
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeEAN5("12345");
    const bars2 = encodeEAN5("54321");
    expect(bars1).not.toEqual(bars2);
  });

  it("same input produces same output", () => {
    const bars1 = encodeEAN5("52495");
    const bars2 = encodeEAN5("52495");
    expect(bars1).toEqual(bars2);
  });

  // --- Invalid input handling ---

  it("throws on non-digits", () => {
    expect(() => encodeEAN5("ABCDE")).toThrow("digits only");
  });

  it("throws on wrong length", () => {
    expect(() => encodeEAN5("1234")).toThrow("exactly 5 digits");
    expect(() => encodeEAN5("123456")).toThrow("exactly 5 digits");
  });

  it("throws on empty input", () => {
    expect(() => encodeEAN5("")).toThrow();
  });
});
