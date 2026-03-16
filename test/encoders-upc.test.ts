import { describe, expect, it } from "vitest";
import { encodeUPCA, encodeUPCE } from "../src/encoders/upc";

describe("encodeUPCA", () => {
  // --- Valid encoding ---

  it("encodes 11 digits with auto-calculated check digit", () => {
    const result = encodeUPCA("03600029145");
    expect(result.bars.length).toBeGreaterThan(0);
    expect(Array.isArray(result.bars)).toBe(true);
    expect(Array.isArray(result.guards)).toBe(true);
  });

  it("encodes 12 digits with valid check digit", () => {
    const result = encodeUPCA("036000291452");
    expect(result.bars.length).toBeGreaterThan(0);
  });

  it("returns guard positions", () => {
    const result = encodeUPCA("03600029145");
    // 3 guard positions: start, center, end
    expect(result.guards.length).toBe(3);
    // Guards should be in ascending order
    expect(result.guards[0]).toBeLessThan(result.guards[1]!);
    expect(result.guards[1]).toBeLessThan(result.guards[2]!);
  });

  // --- Bar width validation ---

  it("produces only valid widths (1-4)", () => {
    const result = encodeUPCA("03600029145");
    for (const w of result.bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("output length is fixed for UPC-A", () => {
    // UPC-A: start(3) + 6*4 left + center(5) + 6*4 right + end(3)
    // = 3 + 24 + 5 + 24 + 3 = 59 elements
    const result = encodeUPCA("03600029145");
    expect(result.bars.length).toBe(59);
  });

  // --- Check digit validation ---

  it("throws on incorrect check digit", () => {
    // 036000291452 is valid; 036000291453 should fail
    expect(() => encodeUPCA("036000291453")).toThrow("check digit mismatch");
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different bar patterns", () => {
    const result1 = encodeUPCA("03600029145");
    const result2 = encodeUPCA("01234567890");
    expect(result1.bars).not.toEqual(result2.bars);
  });

  it("same input produces same output", () => {
    const result1 = encodeUPCA("03600029145");
    const result2 = encodeUPCA("03600029145");
    expect(result1.bars).toEqual(result2.bars);
  });

  // --- Invalid input handling ---

  it("throws on wrong length", () => {
    expect(() => encodeUPCA("12345")).toThrow("11 or 12 digits");
    expect(() => encodeUPCA("1234567890123")).toThrow("11 or 12 digits");
  });

  it("strips non-digit characters and validates length", () => {
    // The encoder calls replace(/\D/g, ''), so non-digits are stripped
    // "0-36-00029145" has 11 digits after stripping
    const result = encodeUPCA("0-36-00029145");
    expect(result.bars.length).toBe(59);
  });
});

describe("encodeUPCE", () => {
  // --- Valid encoding ---

  it("encodes 6 digits (NS=0 implied, check auto-calculated)", () => {
    const result = encodeUPCE("123456");
    expect(result.bars.length).toBeGreaterThan(0);
    expect(Array.isArray(result.bars)).toBe(true);
    expect(Array.isArray(result.guards)).toBe(true);
  });

  it("encodes 7 digits starting with 0 (NS=0 + 6 middle)", () => {
    const result = encodeUPCE("0123456");
    expect(result.bars.length).toBeGreaterThan(0);
  });

  it("encodes 7 digits starting with 1 (NS=1 + 6 middle)", () => {
    const result = encodeUPCE("1123456");
    expect(result.bars.length).toBeGreaterThan(0);
  });

  it("encodes 8 digits (NS + 6 middle + check)", () => {
    // First get a valid encoding to extract the check digit
    const result = encodeUPCE("01234565");
    expect(result.bars.length).toBeGreaterThan(0);
  });

  it("returns guard positions", () => {
    const result = encodeUPCE("123456");
    // 2 guard positions: start and end
    expect(result.guards.length).toBe(2);
    expect(result.guards[0]).toBeLessThan(result.guards[1]!);
  });

  // --- Bar width validation ---

  it("produces only valid widths (1-4)", () => {
    const result = encodeUPCE("123456");
    for (const w of result.bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
      expect(Number.isInteger(w)).toBe(true);
    }
  });

  it("output length is fixed for UPC-E", () => {
    // UPC-E: start(3) + 6*4 digits + end_special(6) = 3 + 24 + 6 = 33
    const result = encodeUPCE("123456");
    expect(result.bars.length).toBe(33);
  });

  // --- Check digit validation ---

  it("throws on incorrect check digit for 8-digit input", () => {
    // Try with a wrong check digit
    expect(() => encodeUPCE("01234560")).toThrow("check digit mismatch");
  });

  it("throws on invalid number system for 8-digit input", () => {
    expect(() => encodeUPCE("51234567")).toThrow("number system must be 0 or 1");
  });

  // --- Different inputs produce different outputs ---

  it("different inputs produce different bar patterns", () => {
    const result1 = encodeUPCE("123456");
    const result2 = encodeUPCE("654321");
    expect(result1.bars).not.toEqual(result2.bars);
  });

  // --- Invalid input handling ---

  it("throws on wrong length", () => {
    expect(() => encodeUPCE("12345")).toThrow("6, 7, or 8 digits");
    expect(() => encodeUPCE("123456789")).toThrow("6, 7, or 8 digits");
  });

  // --- Edge case: UPC-E expansion patterns ---

  it("handles last digit 0 expansion correctly", () => {
    const result = encodeUPCE("120000");
    expect(result.bars.length).toBe(33);
  });

  it("handles last digit 5-9 expansion correctly", () => {
    const result = encodeUPCE("123455");
    expect(result.bars.length).toBe(33);
    const result2 = encodeUPCE("123459");
    expect(result2.bars.length).toBe(33);
  });
});
