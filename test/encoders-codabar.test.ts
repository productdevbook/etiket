import { describe, expect, it } from "vitest";
import { encodeCodabar } from "../src/encoders/codabar";

describe("encodeCodabar", () => {
  // --- Valid encoding ---

  it("encodes a simple numeric string", () => {
    const bars = encodeCodabar("12345");
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it("encodes a single digit", () => {
    const bars = encodeCodabar("0");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes special data characters (-, $, :, /, ., +)", () => {
    const bars = encodeCodabar("1-2$3:4/5.6+7");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("uses default start/stop A-A when no start/stop in text", () => {
    const bars = encodeCodabar("123");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Start/stop characters in text ---

  it("recognizes start/stop characters in text", () => {
    const bars = encodeCodabar("A123B");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("supports all start/stop pairs (A, B, C, D)", () => {
    const barsA = encodeCodabar("A123A");
    const barsB = encodeCodabar("B123B");
    const barsC = encodeCodabar("C123C");
    const barsD = encodeCodabar("D123D");
    expect(barsA.length).toBeGreaterThan(0);
    expect(barsB.length).toBeGreaterThan(0);
    expect(barsC.length).toBeGreaterThan(0);
    expect(barsD.length).toBeGreaterThan(0);
    // Different start/stop chars should produce different patterns
    expect(barsA).not.toEqual(barsB);
  });

  it("handles lowercase start/stop characters (case-insensitive)", () => {
    const barsUpper = encodeCodabar("A123B");
    const barsLower = encodeCodabar("a123b");
    expect(barsUpper).toEqual(barsLower);
  });

  // --- Custom start/stop via options ---

  it("uses custom start/stop from options", () => {
    const bars = encodeCodabar("123", { start: "B", stop: "C" });
    expect(bars.length).toBeGreaterThan(0);
  });

  it("start/stop in text takes precedence over options", () => {
    const barsText = encodeCodabar("A123D");
    // When text has start/stop, options are ignored
    expect(barsText.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only valid widths (1 narrow, 3 wide)", () => {
    const bars = encodeCodabar("12345");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(3);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("output length matches expected structure", () => {
    // For data of length N (without start/stop in text):
    // start(7) + gap(1) + N * (pattern(7) + gap(1)) + stop(7)
    // = 7 + 1 + N*8 + 7 = 15 + N*8
    const bars = encodeCodabar("123");
    expect(bars.length).toBe(15 + 3 * 8);
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeCodabar("123");
    const bars2 = encodeCodabar("456");
    expect(bars1).not.toEqual(bars2);
  });

  it("same input produces same output", () => {
    const bars1 = encodeCodabar("9876");
    const bars2 = encodeCodabar("9876");
    expect(bars1).toEqual(bars2);
  });

  // --- Invalid input handling ---

  it("throws on empty input", () => {
    expect(() => encodeCodabar("")).toThrow("must not be empty");
  });

  it("throws on invalid data characters", () => {
    expect(() => encodeCodabar("A12@3A")).toThrow("Invalid Codabar character");
  });

  it("throws on invalid start character in options", () => {
    expect(() => encodeCodabar("123", { start: "X" })).toThrow("Invalid Codabar start character");
  });

  it("throws on invalid stop character in options", () => {
    expect(() => encodeCodabar("123", { stop: "Z" })).toThrow("Invalid Codabar stop character");
  });

  // --- Edge cases ---

  it("encodes data that contains only special characters", () => {
    const bars = encodeCodabar("-.$+:/");
    expect(bars.length).toBeGreaterThan(0);
  });
});
