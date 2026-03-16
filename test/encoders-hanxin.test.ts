import { describe, expect, it } from "vitest";
import { encodeHanXin } from "../src/encoders/hanxin";

describe("Han Xin Code", () => {
  it("encodes short text", () => {
    const matrix = encodeHanXin("Hello");
    expect(matrix.length).toBeGreaterThanOrEqual(23);
    expect(matrix[0]!.length).toBe(matrix.length); // square
  });

  it("4 finder patterns at corners", () => {
    const matrix = encodeHanXin("Test");
    const size = matrix.length;
    // Top-left
    expect(matrix[0]![0]).toBe(true);
    expect(matrix[3]![3]).toBe(true);
    // Top-right
    expect(matrix[0]![size - 1]).toBe(true);
    // Bottom-left
    expect(matrix[size - 1]![0]).toBe(true);
    // Bottom-right (Han Xin has 4th finder, unlike QR)
    expect(matrix[size - 1]![size - 1]).toBe(true);
  });

  it("produces boolean matrix", () => {
    const matrix = encodeHanXin("Data");
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("supports EC levels", () => {
    for (const ecLevel of [1, 2, 3, 4] as const) {
      const matrix = encodeHanXin("Test", { ecLevel });
      expect(matrix.length).toBeGreaterThanOrEqual(23);
    }
  });

  it("throws on empty input", () => {
    expect(() => encodeHanXin("")).toThrow();
  });

  it("larger data produces larger matrix", () => {
    const small = encodeHanXin("Hi");
    const large = encodeHanXin("A".repeat(100));
    expect(large.length).toBeGreaterThan(small.length);
  });

  it("different data produces different output", () => {
    const a = encodeHanXin("Hello");
    const b = encodeHanXin("World");
    const aStr = a.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const bStr = b.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(aStr).not.toBe(bStr);
  });
});
