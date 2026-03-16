import { describe, expect, it } from "vitest";
import { encodeGS1DataMatrix } from "../src/encoders/datamatrix/index";
import { gs1datamatrix } from "../src/index";

describe("GS1 DataMatrix", () => {
  it("encodes GTIN with AI 01", () => {
    const matrix = encodeGS1DataMatrix("(01)12345678901234");
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix[0]!.length).toBeGreaterThan(0);
  });

  it("encodes multiple AIs", () => {
    const matrix = encodeGS1DataMatrix("(01)12345678901234(17)260101(10)BATCH01");
    expect(matrix.length).toBeGreaterThan(0);
  });

  it("produces boolean matrix", () => {
    const matrix = encodeGS1DataMatrix("(01)12345678901234");
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("renders to SVG via convenience function", () => {
    const svg = gs1datamatrix("(01)12345678901234");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("throws on empty input", () => {
    expect(() => encodeGS1DataMatrix("")).toThrow();
  });

  it("throws on invalid AI format", () => {
    expect(() => encodeGS1DataMatrix("no parens")).toThrow();
  });

  it("different AIs produce different matrices", () => {
    const a = encodeGS1DataMatrix("(01)12345678901234");
    const b = encodeGS1DataMatrix("(01)98765432109876");
    // Different data should produce different matrices
    const aStr = a.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const bStr = b.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(aStr).not.toBe(bStr);
  });
});
