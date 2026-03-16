import { describe, expect, it } from "vitest";
import { encodePlessey } from "../src/encoders/plessey";
import { barcode } from "../src/index";

describe("Plessey", () => {
  it("encodes hex digits", () => {
    const bars = encodePlessey("1234AB");
    expect(bars.length).toBeGreaterThan(0);
    for (const b of bars) expect(b).toBeGreaterThanOrEqual(1);
  });

  it("accepts lowercase hex", () => {
    const a = encodePlessey("abcdef");
    const b = encodePlessey("ABCDEF");
    expect(a).toEqual(b);
  });

  it("all bar widths are 1 or 2", () => {
    const bars = encodePlessey("0123456789ABCDEF");
    for (const b of bars) {
      expect(b === 1 || b === 2).toBe(true);
    }
  });

  it("throws on non-hex characters", () => {
    expect(() => encodePlessey("GHIJ")).toThrow();
  });

  it("throws on empty input", () => {
    expect(() => encodePlessey("")).toThrow();
  });

  it("different data produces different output", () => {
    const a = encodePlessey("1234");
    const b = encodePlessey("5678");
    expect(a).not.toEqual(b);
  });

  it("includes 2 CRC check digits (output is longer)", () => {
    // 4 data digits + 2 check digits = 6 digits encoded
    // Each digit = 4 pairs = 8 elements. 6 digits = 48 elements + start(4) + stop(2) = 54
    const bars = encodePlessey("1234");
    expect(bars.length).toBe(54);
  });

  it("works via barcode() function", () => {
    const svg = barcode("1234AB", { type: "plessey" });
    expect(svg).toContain("<svg");
  });
});
