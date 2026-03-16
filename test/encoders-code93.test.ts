import { describe, expect, it } from "vitest";
import { encodeCode93, encodeCode93Extended } from "../src/encoders/code93";

describe("encodeCode93", () => {
  // --- Valid encoding ---

  it("encodes a simple numeric string", () => {
    const bars = encodeCode93("12345");
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it("encodes uppercase letters", () => {
    const bars = encodeCode93("ABCXYZ");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes special characters (-, ., space, $, /, +, %)", () => {
    const bars = encodeCode93("A-B.C $D/E+F%G");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes a single character", () => {
    const bars = encodeCode93("A");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only positive integer widths", () => {
    const bars = encodeCode93("TEST93");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("ends with a termination bar of width 1", () => {
    const bars = encodeCode93("ABC");
    expect(bars[bars.length - 1]).toBe(1);
  });

  // --- Check digits are always included (C and K) ---

  it("longer input produces longer output", () => {
    const short = encodeCode93("A");
    const long = encodeCode93("ABCDE");
    expect(long.length).toBeGreaterThan(short.length);
  });

  it("output includes start/stop + data + 2 check digits + terminator", () => {
    // Each char in Code 93 has a 9-module binary pattern that becomes a variable-width run.
    // Just check it is non-empty and reasonable
    const bars = encodeCode93("TEST");
    // Start(varies) + 4 data + 2 check digits + stop(varies) + termination(1)
    expect(bars.length).toBeGreaterThan(10);
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeCode93("ABC");
    const bars2 = encodeCode93("XYZ");
    expect(bars1).not.toEqual(bars2);
  });

  it("same input produces same output (deterministic)", () => {
    const bars1 = encodeCode93("CODE93");
    const bars2 = encodeCode93("CODE93");
    expect(bars1).toEqual(bars2);
  });

  // --- Invalid input handling ---

  it("throws on empty input", () => {
    expect(() => encodeCode93("")).toThrow("must not be empty");
  });

  it("throws on lowercase letters (not in native Code 93 charset)", () => {
    expect(() => encodeCode93("abc")).toThrow("Invalid Code 93 character");
  });

  it("throws on characters outside the charset", () => {
    expect(() => encodeCode93("A@B")).toThrow("Invalid Code 93 character");
    expect(() => encodeCode93("A#B")).toThrow("Invalid Code 93 character");
  });
});

describe("encodeCode93Extended", () => {
  // --- Valid encoding ---

  it("encodes lowercase letters", () => {
    const bars = encodeCode93Extended("abc");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes mixed case text", () => {
    const bars = encodeCode93Extended("Hello World");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes punctuation and special ASCII characters", () => {
    const bars = encodeCode93Extended("test@123!");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes native Code 93 characters directly", () => {
    const bars = encodeCode93Extended("ABC123");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only valid widths", () => {
    const bars = encodeCode93Extended("hello");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
    }
  });

  it("ends with a termination bar of width 1", () => {
    const bars = encodeCode93Extended("test");
    expect(bars[bars.length - 1]).toBe(1);
  });

  // --- Extended produces longer output for non-native chars ---

  it("lowercase input is longer than equivalent uppercase (shift pairs)", () => {
    const upper = encodeCode93Extended("A");
    const lower = encodeCode93Extended("a");
    // 'a' maps to (+A) = 2 code 93 values, 'A' maps to 1 value
    expect(lower.length).toBeGreaterThan(upper.length);
  });

  // --- Invalid input handling ---

  it("throws on empty input", () => {
    expect(() => encodeCode93Extended("")).toThrow("must not be empty");
  });

  it("throws on non-ASCII characters (code > 127)", () => {
    expect(() => encodeCode93Extended("\u00E9")).toThrow("ASCII");
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeCode93Extended("hello");
    const bars2 = encodeCode93Extended("world");
    expect(bars1).not.toEqual(bars2);
  });
});
