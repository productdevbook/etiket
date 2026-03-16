import { describe, expect, it } from "vitest";
import { encodeJABCode, JAB_COLORS_4, JAB_COLORS_8 } from "../src/encoders/jabcode";

describe("JAB Code", () => {
  it("encodes with 4 colors (default)", () => {
    const result = encodeJABCode("Hello");
    expect(result.matrix.length).toBeGreaterThan(0);
    expect(result.palette).toBe(JAB_COLORS_4);
    // All values should be 0-3
    for (const row of result.matrix) {
      for (const cell of row) {
        expect(cell).toBeGreaterThanOrEqual(0);
        expect(cell).toBeLessThanOrEqual(3);
      }
    }
  });

  it("encodes with 8 colors", () => {
    const result = encodeJABCode("Hello", { colors: 8 });
    expect(result.palette).toBe(JAB_COLORS_8);
    for (const row of result.matrix) {
      for (const cell of row) {
        expect(cell).toBeGreaterThanOrEqual(0);
        expect(cell).toBeLessThanOrEqual(7);
      }
    }
  });

  it("8-color is more compact than 4-color", () => {
    const c4 = encodeJABCode("Hello World Test Data", { colors: 4 });
    const c8 = encodeJABCode("Hello World Test Data", { colors: 8 });
    expect(c8.rows).toBeLessThanOrEqual(c4.rows);
  });

  it("square matrix", () => {
    const result = encodeJABCode("Test");
    expect(result.rows).toBe(result.cols);
  });

  it("throws on empty", () => {
    expect(() => encodeJABCode("")).toThrow();
  });

  it("different data produces different output", () => {
    const a = encodeJABCode("Hello");
    const b = encodeJABCode("World");
    const aStr = a.matrix.map((r) => r.join("")).join("");
    const bStr = b.matrix.map((r) => r.join("")).join("");
    expect(aStr).not.toBe(bStr);
  });

  it("returns color palette", () => {
    const result = encodeJABCode("Test");
    expect(result.palette.length).toBe(4);
    expect(result.palette[0]).toBe("#000000");
  });
});
