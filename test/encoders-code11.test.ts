import { describe, expect, it } from "vitest";
import { encodeCode11 } from "../src/encoders/code11";

describe("encodeCode11", () => {
  // --- Valid encoding ---

  it("encodes a simple numeric string", () => {
    const bars = encodeCode11("12345");
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it("encodes a single digit", () => {
    const bars = encodeCode11("0");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes the dash character", () => {
    const bars = encodeCode11("123-456");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes all valid characters (0-9 and -)", () => {
    const bars = encodeCode11("0123456789-");
    expect(bars.length).toBeGreaterThan(0);
  });

  // --- Bar width validation ---

  it("produces only valid widths (1 narrow, 2 wide)", () => {
    const bars = encodeCode11("12345");
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(2);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  // --- Check digit behavior ---

  it("includes one check digit (C) for data length <= 10", () => {
    // Data length 5, <= 10, so only C check digit
    // Structure: start(6) + (5 data + 1 check) * 6 + stop(5) = 6 + 36 + 5 = 47
    const bars = encodeCode11("12345");
    expect(bars.length).toBe(47);
  });

  it("includes two check digits (C and K) for data length > 10", () => {
    // Data length 11, > 10, so C and K check digits
    // Structure: start(6) + (11 data + 2 checks) * 6 + stop(5) = 6 + 78 + 5 = 89
    const bars = encodeCode11("12345678901");
    expect(bars.length).toBe(89);
  });

  it("data length exactly 10 gets only one check digit", () => {
    // Data length 10, <= 10, so only C
    // Structure: start(6) + (10 data + 1 check) * 6 + stop(5) = 6 + 66 + 5 = 77
    const bars = encodeCode11("1234567890");
    expect(bars.length).toBe(77);
  });

  it("data length 11 gets two check digits", () => {
    // Structure: start(6) + (11 data + 2 checks) * 6 + stop(5) = 6 + 78 + 5 = 89
    const bars = encodeCode11("12345678901");
    expect(bars.length).toBe(89);
  });

  it("output with more data is longer", () => {
    const short = encodeCode11("1");
    const long = encodeCode11("12345");
    expect(long.length).toBeGreaterThan(short.length);
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different outputs", () => {
    const bars1 = encodeCode11("123");
    const bars2 = encodeCode11("456");
    expect(bars1).not.toEqual(bars2);
  });

  it("same input produces same output", () => {
    const bars1 = encodeCode11("9876");
    const bars2 = encodeCode11("9876");
    expect(bars1).toEqual(bars2);
  });

  // --- Invalid input handling ---

  it("throws on empty input", () => {
    expect(() => encodeCode11("")).toThrow("must not be empty");
  });

  it("throws on letters", () => {
    expect(() => encodeCode11("ABC")).toThrow("Invalid Code 11 character");
  });

  it("throws on invalid special characters", () => {
    expect(() => encodeCode11("12.34")).toThrow("Invalid Code 11 character");
    expect(() => encodeCode11("12+34")).toThrow("Invalid Code 11 character");
    expect(() => encodeCode11("12$34")).toThrow("Invalid Code 11 character");
  });

  it("throws on space character", () => {
    expect(() => encodeCode11("12 34")).toThrow("Invalid Code 11 character");
  });

  // --- Edge cases ---

  it("encodes a string of only dashes", () => {
    const bars = encodeCode11("---");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes a string of all zeros", () => {
    const bars = encodeCode11("0000000000");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes a long string (triggers K check digit)", () => {
    const bars = encodeCode11("1234567890123456789");
    expect(bars.length).toBeGreaterThan(0);
  });
});
