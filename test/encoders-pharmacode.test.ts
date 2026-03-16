import { describe, expect, it } from "vitest";
import { encodePharmacode } from "../src/encoders/pharmacode";

describe("encodePharmacode", () => {
  // --- Valid encoding ---

  it("encodes minimum value (3)", () => {
    const bars = encodePharmacode(3);
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it("encodes maximum value (131070)", () => {
    const bars = encodePharmacode(131070);
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes a typical value", () => {
    const bars = encodePharmacode(1234);
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes small values near the minimum", () => {
    const bars3 = encodePharmacode(3);
    const bars4 = encodePharmacode(4);
    const bars5 = encodePharmacode(5);
    expect(bars3.length).toBeGreaterThan(0);
    expect(bars4.length).toBeGreaterThan(0);
    expect(bars5.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only valid widths (2 thin, 4 thick for bars; 2 for gaps)", () => {
    const bars = encodePharmacode(12345);
    for (const w of bars) {
      expect([2, 4]).toContain(w);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("alternates between bar widths and gap widths", () => {
    const bars = encodePharmacode(1234);
    for (let i = 0; i < bars.length; i++) {
      if (i % 2 === 0) {
        // Even indices are bars (thin=2 or thick=4)
        expect([2, 4]).toContain(bars[i]);
      } else {
        // Odd indices are gaps (always 2)
        expect(bars[i]).toBe(2);
      }
    }
  });

  it("output length is always odd (bars separated by gaps)", () => {
    // N bars separated by N-1 gaps: total = 2N - 1 (odd)
    for (const val of [3, 10, 100, 1000, 10000]) {
      const bars = encodePharmacode(val);
      expect(bars.length % 2).toBe(1);
    }
  });

  // --- Output length scales with value ---

  it("larger values generally produce longer outputs", () => {
    const small = encodePharmacode(3);
    const medium = encodePharmacode(1000);
    const large = encodePharmacode(100000);
    expect(medium.length).toBeGreaterThanOrEqual(small.length);
    expect(large.length).toBeGreaterThanOrEqual(medium.length);
  });

  // --- Different inputs produce different outputs ---

  it("different values produce different outputs", () => {
    const bars1 = encodePharmacode(100);
    const bars2 = encodePharmacode(200);
    expect(bars1).not.toEqual(bars2);
  });

  it("same value produces same output", () => {
    const bars1 = encodePharmacode(5678);
    const bars2 = encodePharmacode(5678);
    expect(bars1).toEqual(bars2);
  });

  it("consecutive values produce different outputs", () => {
    const bars1 = encodePharmacode(99);
    const bars2 = encodePharmacode(100);
    expect(bars1).not.toEqual(bars2);
  });

  // --- Invalid input handling ---

  it("throws on value below minimum (< 3)", () => {
    expect(() => encodePharmacode(0)).toThrow("between 3 and 131070");
    expect(() => encodePharmacode(1)).toThrow("between 3 and 131070");
    expect(() => encodePharmacode(2)).toThrow("between 3 and 131070");
  });

  it("throws on value above maximum (> 131070)", () => {
    expect(() => encodePharmacode(131071)).toThrow("between 3 and 131070");
    expect(() => encodePharmacode(200000)).toThrow("between 3 and 131070");
  });

  it("throws on non-integer value", () => {
    expect(() => encodePharmacode(3.5)).toThrow("must be an integer");
    expect(() => encodePharmacode(100.1)).toThrow("must be an integer");
  });

  it("throws on negative value", () => {
    expect(() => encodePharmacode(-1)).toThrow("between 3 and 131070");
  });

  // --- Edge cases ---

  it("encodes boundary value 3 correctly (produces thin bars only)", () => {
    const bars = encodePharmacode(3);
    // Value 3: odd -> thin (1), (3-1)/2=1 -> odd -> thin (0)
    // So two thin bars separated by a gap: [2, 2, 2]
    expect(bars.length).toBe(3);
  });

  it("encodes boundary value 131070 (produces output without error)", () => {
    const bars = encodePharmacode(131070);
    expect(bars.length).toBeGreaterThan(0);
  });
});
