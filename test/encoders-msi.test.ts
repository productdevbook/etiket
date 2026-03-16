import { describe, expect, it } from "vitest";
import { encodeMSI } from "../src/encoders/msi";
import type { MSICheckDigitType } from "../src/encoders/msi";

describe("encodeMSI", () => {
  // --- Valid encoding ---

  it("encodes a simple numeric string", () => {
    const bars = encodeMSI("12345");
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it("encodes a single digit", () => {
    const bars = encodeMSI("0");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes all digits 0-9", () => {
    const bars = encodeMSI("0123456789");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only valid widths (1 narrow, 2 wide)", () => {
    const bars = encodeMSI("12345");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(2);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("output length matches expected structure with mod10 (default)", () => {
    // Structure: start(2) + (N+1 digits) * 8 bits + stop(3)
    // Each digit is 4 BCD bits, each bit is 2 elements (bar+space) = 8 elements per digit
    // With mod10: 1 extra check digit
    // 3 data digits + 1 check = 4 digits: 2 + 4*8 + 3 = 37
    const bars = encodeMSI("123");
    expect(bars.length).toBe(37);
  });

  // --- Check digit algorithm variants ---

  it('supports "none" check digit type', () => {
    const bars = encodeMSI("123", { checkDigit: "none" });
    // No check digit: 2 + 3*8 + 3 = 29
    expect(bars.length).toBe(29);
  });

  it('supports "mod10" check digit type (default)', () => {
    const barsDefault = encodeMSI("123");
    const barsExplicit = encodeMSI("123", { checkDigit: "mod10" });
    expect(barsDefault).toEqual(barsExplicit);
  });

  it('supports "mod11" check digit type', () => {
    const bars = encodeMSI("123", { checkDigit: "mod11" });
    // 3 data + 1 check = 4 digits: 2 + 4*8 + 3 = 37
    expect(bars.length).toBe(37);
  });

  it('supports "mod1010" check digit type (two check digits)', () => {
    const bars = encodeMSI("123", { checkDigit: "mod1010" });
    // 3 data + 2 checks = 5 digits: 2 + 5*8 + 3 = 45
    expect(bars.length).toBe(45);
  });

  it('supports "mod1110" check digit type (two check digits)', () => {
    const bars = encodeMSI("123", { checkDigit: "mod1110" });
    // 3 data + 2 checks = 5 digits: 2 + 5*8 + 3 = 45
    expect(bars.length).toBe(45);
  });

  it("different check digit types produce different outputs", () => {
    const checkTypes: MSICheckDigitType[] = ["none", "mod10", "mod11", "mod1010", "mod1110"];
    const results = checkTypes.map((t) => encodeMSI("12345", { checkDigit: t }));
    // At least some should differ
    const unique = new Set(results.map((r) => JSON.stringify(r)));
    expect(unique.size).toBeGreaterThan(1);
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeMSI("123");
    const bars2 = encodeMSI("456");
    expect(bars1).not.toEqual(bars2);
  });

  it("same input produces same output", () => {
    const bars1 = encodeMSI("9876");
    const bars2 = encodeMSI("9876");
    expect(bars1).toEqual(bars2);
  });

  // --- Invalid input handling ---

  it("throws on empty input", () => {
    expect(() => encodeMSI("")).toThrow("must not be empty");
  });

  it("throws on non-digit characters", () => {
    expect(() => encodeMSI("12A34")).toThrow("digits only");
  });

  it("throws on letters", () => {
    expect(() => encodeMSI("ABCD")).toThrow("digits only");
  });

  it("throws on special characters", () => {
    expect(() => encodeMSI("12-34")).toThrow("digits only");
  });

  // --- Edge cases ---

  it("encodes a long numeric string", () => {
    const bars = encodeMSI("1234567890123456789");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes all zeros", () => {
    const bars = encodeMSI("0000");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes all nines", () => {
    const bars = encodeMSI("9999");
    expect(bars.length).toBeGreaterThan(0);
  });
});
