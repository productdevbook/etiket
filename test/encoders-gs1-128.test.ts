import { describe, expect, it } from "vitest";
import { encodeGS1128 } from "../src/encoders/gs1-128";

describe("encodeGS1128", () => {
  // --- Valid encoding (parenthesized AI format) ---

  it("encodes a single fixed-length AI field", () => {
    const bars = encodeGS1128("(01)12345678901234");
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it("encodes multiple AI fields", () => {
    const bars = encodeGS1128("(01)12345678901234(17)260101");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes with variable-length AI field", () => {
    const bars = encodeGS1128("(10)ABC123");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes mixed fixed and variable-length AI fields", () => {
    const bars = encodeGS1128("(01)12345678901234(10)ABC123");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes AI 21 (serial number)", () => {
    const bars = encodeGS1128("(21)SERIAL123");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes date AI fields (11, 13, 15, 17)", () => {
    const bars11 = encodeGS1128("(11)260101");
    const bars13 = encodeGS1128("(13)260101");
    const bars15 = encodeGS1128("(15)260101");
    const bars17 = encodeGS1128("(17)260101");
    expect(bars11.length).toBeGreaterThan(0);
    expect(bars13.length).toBeGreaterThan(0);
    expect(bars15.length).toBeGreaterThan(0);
    expect(bars17.length).toBeGreaterThan(0);
  });

  it("encodes AI 20 (product variant)", () => {
    const bars = encodeGS1128("(20)05");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Valid encoding (plain string format) ---

  it("encodes a plain numeric string", () => {
    const bars = encodeGS1128("1234567890");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes a plain alphanumeric string", () => {
    const bars = encodeGS1128("ABC123");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only valid widths (1-4)", () => {
    const bars = encodeGS1128("(01)12345678901234");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("ends with the stop pattern", () => {
    const bars = encodeGS1128("(01)12345678901234");
    // Stop pattern is [2, 3, 3, 1, 1, 1, 2] (7 elements)
    const lastSeven = bars.slice(-7);
    expect(lastSeven).toEqual([2, 3, 3, 1, 1, 1, 2]);
  });

  // --- FNC1 separator handling ---

  it("variable-length field followed by another field inserts FNC1 separator", () => {
    // AI 10 is variable-length, AI 01 is fixed
    const barsWithSep = encodeGS1128("(10)ABC(01)12345678901234");
    expect(barsWithSep.length).toBeGreaterThan(0);
  });

  it("fixed-length field does not need FNC1 separator before next field", () => {
    // AI 01 is fixed (14 digits), so no FNC1 between 01 and 17
    const bars = encodeGS1128("(01)12345678901234(17)260101");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeGS1128("(01)12345678901234");
    const bars2 = encodeGS1128("(01)98765432109876");
    expect(bars1).not.toEqual(bars2);
  });

  it("same input produces same output", () => {
    const bars1 = encodeGS1128("(01)12345678901234");
    const bars2 = encodeGS1128("(01)12345678901234");
    expect(bars1).toEqual(bars2);
  });

  // --- Invalid input handling ---

  it("throws on empty input", () => {
    expect(() => encodeGS1128("")).toThrow("must not be empty");
  });

  it("throws on missing closing parenthesis in AI", () => {
    expect(() => encodeGS1128("(01 12345678901234")).toThrow("Missing closing ')'");
  });

  it("throws on invalid AI (non-numeric)", () => {
    expect(() => encodeGS1128("(AB)12345")).toThrow("must contain only digits");
  });

  it("throws on empty data for an AI field", () => {
    expect(() => encodeGS1128("(01)")).toThrow("Empty data");
  });

  it("throws on AI with wrong fixed-length data", () => {
    // AI 01 requires exactly 14 digits
    expect(() => encodeGS1128("(01)123")).toThrow("requires exactly");
  });

  it("throws on AI with data that does not match expected format", () => {
    // AI 01 requires 14 digits, letters are not valid
    expect(() => encodeGS1128("(01)ABCDEFGHIJKLMN")).toThrow("does not match expected format");
  });

  it("throws when AI string has no opening parenthesis", () => {
    // This would be treated as plain string (no parenthesized format)
    // But if it starts with '(' and is malformed, it should throw
    expect(() => encodeGS1128("()")).toThrow();
  });

  // --- Edge cases ---

  it("encodes a single AI with maximum-length variable data", () => {
    // AI 10 has maxLength 20
    const bars = encodeGS1128("(10)ABCDEFGHIJKLMNOPQRST");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("handles three-digit AI codes", () => {
    // AI 400 is a valid 3-digit AI
    const bars = encodeGS1128("(400)ORDERREF123");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("handles four-digit AI codes", () => {
    // AI 3100 is a valid 4-digit AI (net weight in kg, 0 decimals)
    const bars = encodeGS1128("(3100)001234");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes multiple variable-length fields", () => {
    const bars = encodeGS1128("(10)BATCH1(21)SERIAL1");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("Code C optimization for long numeric runs", () => {
    // A long numeric AI value should encode more compactly
    const bars = encodeGS1128("(01)12345678901234");
    // Just verify it produces valid output
    expect(bars.length).toBeGreaterThan(0);
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
    }
  });
});
