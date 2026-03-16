import { describe, expect, it } from "vitest";
import { encodeCode39, encodeCode39Extended } from "../src/encoders/code39";

describe("encodeCode39", () => {
  // --- Valid encoding ---

  it("encodes a simple numeric string", () => {
    const bars = encodeCode39("12345");
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it("encodes uppercase letters", () => {
    const bars = encodeCode39("ABCXYZ");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes special characters (-, ., space, $, /, +, %)", () => {
    const bars = encodeCode39("A-B.C $D/E+F%G");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes a single character", () => {
    const bars = encodeCode39("A");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only positive integer widths (1 or 3 for bars/spaces, 1 for gaps)", () => {
    const bars = encodeCode39("TEST");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(3);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("output length matches expected structure", () => {
    // For N data chars (no check digit):
    // start(9) + gap(1) + N*(pattern(9) + gap(1)) + stop(9) = 19 + N*10
    const bars = encodeCode39("ABC");
    // 3 data chars: 19 + 3*10 = 49
    expect(bars.length).toBe(49);
  });

  // --- Check digit calculation ---

  it("produces longer output with check digit enabled", () => {
    const without = encodeCode39("CODE39");
    const withCheck = encodeCode39("CODE39", { checkDigit: true });
    // With check digit: one extra character (9 pattern + 1 gap = 10 more elements)
    expect(withCheck.length).toBe(without.length + 10);
  });

  it("check digit does not change base encoding", () => {
    const without = encodeCode39("1234");
    const withCheck = encodeCode39("1234", { checkDigit: true });
    // The beginning of the encoding should be the same (start + first data chars)
    // start(9) + gap(1) = first 10 elements are identical
    expect(withCheck.slice(0, 10)).toEqual(without.slice(0, 10));
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeCode39("ABC");
    const bars2 = encodeCode39("XYZ");
    expect(bars1).not.toEqual(bars2);
  });

  it("same input produces same output", () => {
    const bars1 = encodeCode39("HELLO");
    const bars2 = encodeCode39("HELLO");
    expect(bars1).toEqual(bars2);
  });

  // --- Invalid input handling ---

  it("throws on empty input", () => {
    expect(() => encodeCode39("")).toThrow("must not be empty");
  });

  it("throws on lowercase letters (not in Code 39 charset)", () => {
    expect(() => encodeCode39("abc")).toThrow("Invalid Code 39 character");
  });

  it("throws on star character (reserved for start/stop)", () => {
    expect(() => encodeCode39("A*B")).toThrow("start/stop character");
  });

  it("throws on invalid characters", () => {
    expect(() => encodeCode39("A@B")).toThrow("Invalid Code 39 character");
    expect(() => encodeCode39("A#B")).toThrow("Invalid Code 39 character");
  });
});

describe("encodeCode39Extended", () => {
  // --- Valid encoding ---

  it("encodes lowercase letters via extended mapping", () => {
    const bars = encodeCode39Extended("abc");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes mixed case text", () => {
    const bars = encodeCode39Extended("Hello");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes punctuation and special ASCII characters", () => {
    const bars = encodeCode39Extended("test@123");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes native Code 39 characters directly", () => {
    // Native chars like digits and uppercase should still work
    const bars = encodeCode39Extended("ABC123");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only valid widths (1 or 3)", () => {
    const bars = encodeCode39Extended("test");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(3);
    }
  });

  // --- Extended produces longer output due to character pairs ---

  it("lowercase input is longer than uppercase (2 Code 39 chars per lowercase)", () => {
    const upper = encodeCode39Extended("A");
    const lower = encodeCode39Extended("a");
    // 'a' maps to '+A' (2 code 39 chars), 'A' maps to 'A' (1 code 39 char)
    expect(lower.length).toBeGreaterThan(upper.length);
  });

  // --- Check digit works with extended ---

  it("supports check digit option", () => {
    const without = encodeCode39Extended("abc");
    const withCheck = encodeCode39Extended("abc", { checkDigit: true });
    expect(withCheck.length).toBeGreaterThan(without.length);
  });

  // --- Invalid input handling ---

  it("throws on empty input", () => {
    expect(() => encodeCode39Extended("")).toThrow("must not be empty");
  });

  it("throws on non-ASCII characters (code > 127)", () => {
    expect(() => encodeCode39Extended("\u00C9")).toThrow("only ASCII 0-127");
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeCode39Extended("hello");
    const bars2 = encodeCode39Extended("world");
    expect(bars1).not.toEqual(bars2);
  });
});
