import { describe, expect, it } from "vitest";
import { encodeMicroPDF417 } from "../src/encoders/micropdf417";

describe("MicroPDF417", () => {
  it("encodes short text", () => {
    const result = encodeMicroPDF417("Hello");
    expect(result.matrix.length).toBeGreaterThan(0);
    expect(result.rows).toBeGreaterThan(0);
    expect(result.cols).toBeGreaterThan(0);
  });

  it("produces boolean matrix", () => {
    const result = encodeMicroPDF417("Test");
    for (const row of result.matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("respects column count", () => {
    const r1 = encodeMicroPDF417("Hi", { columns: 1 });
    const r2 = encodeMicroPDF417("Hi", { columns: 2 });
    // Different column count should produce different row counts
    expect(r1.rows).not.toBe(r2.rows);
  });

  it("throws on empty input", () => {
    expect(() => encodeMicroPDF417("")).toThrow();
  });

  it("all rows have same width", () => {
    const result = encodeMicroPDF417("Hello World");
    const widths = result.matrix.map((r) => r.length);
    const unique = new Set(widths);
    expect(unique.size).toBe(1);
  });

  it("different data produces different output", () => {
    const a = encodeMicroPDF417("Hello");
    const b = encodeMicroPDF417("World");
    const aStr = a.matrix.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const bStr = b.matrix.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(aStr).not.toBe(bStr);
  });
});
