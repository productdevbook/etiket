import { describe, expect, it } from "vitest";
import { encodeDotCode } from "../src/encoders/dotcode";

describe("DotCode", () => {
  it("encodes short text", () => {
    const matrix = encodeDotCode("Hello");
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix[0]!.length).toBeGreaterThan(0);
  });

  it("height + width is odd (DotCode spec requirement)", () => {
    const matrix = encodeDotCode("Test");
    expect((matrix.length + matrix[0]!.length) % 2).toBe(1);
  });

  it("checkerboard pattern — no adjacent dots", () => {
    const matrix = encodeDotCode("Test data");
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r]!.length; c++) {
        if (matrix[r]![c] && (r + c) % 2 !== 0) {
          // Dots should only appear at even (r+c) positions
          expect(true).toBe(false); // fail
        }
      }
    }
  });

  it("produces boolean matrix", () => {
    const matrix = encodeDotCode("Data");
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("throws on empty input", () => {
    expect(() => encodeDotCode("")).toThrow();
  });

  it("larger data produces larger matrix", () => {
    const small = encodeDotCode("Hi");
    const large = encodeDotCode("This is a longer DotCode message for testing purposes");
    const smallArea = small.length * small[0]!.length;
    const largeArea = large.length * large[0]!.length;
    expect(largeArea).toBeGreaterThan(smallArea);
  });

  it("different data produces different output", () => {
    const a = encodeDotCode("Hello");
    const b = encodeDotCode("World");
    const aStr = a.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const bStr = b.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(aStr).not.toBe(bStr);
  });
});
