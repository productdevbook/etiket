import { describe, expect, it } from "vitest";
import { encodeDataMatrix } from "../src/encoders/datamatrix/index";
import { encodePDF417 } from "../src/encoders/pdf417/index";
import { encodeAztec } from "../src/encoders/aztec/index";
import { datamatrix, pdf417, aztec } from "../src/index";

describe("Data Matrix encoder", () => {
  it("encodes short text", () => {
    const matrix = encodeDataMatrix("Hello");
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix[0]!.length).toBeGreaterThan(0);
  });

  it("produces square or rectangular matrix", () => {
    const matrix = encodeDataMatrix("Test");
    expect(matrix.length).toBeGreaterThan(0);
    // Data Matrix can be square or rectangular
    expect(matrix[0]!.length).toBeGreaterThan(0);
  });

  it("matrix contains only boolean values", () => {
    const matrix = encodeDataMatrix("Data");
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("larger data produces larger matrix", () => {
    const small = encodeDataMatrix("Hi");
    const large = encodeDataMatrix("This is a longer text");
    expect(large.length * large[0]!.length).toBeGreaterThan(small.length * small[0]!.length);
  });

  it("renders to SVG via convenience function", () => {
    const svg = datamatrix("Hello");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });
});

describe("PDF417 encoder", () => {
  it("encodes short text", () => {
    const result = encodePDF417("Hello");
    expect(result.matrix.length).toBeGreaterThan(0);
    expect(result.rows).toBeGreaterThan(0);
    expect(result.cols).toBeGreaterThan(0);
  });

  it("matrix contains only boolean values", () => {
    const result = encodePDF417("Test");
    for (const row of result.matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("renders to SVG via convenience function", () => {
    const svg = pdf417("Hello World");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });
});

describe("Aztec encoder", () => {
  it("encodes short text", () => {
    const matrix = encodeAztec("Hello");
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix[0]!.length).toBe(matrix.length); // Should be square
  });

  it("produces square matrix", () => {
    const matrix = encodeAztec("Test data");
    expect(matrix.length).toBe(matrix[0]!.length);
  });

  it("matrix contains only boolean values", () => {
    const matrix = encodeAztec("Data");
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("has bullseye pattern at center", () => {
    const matrix = encodeAztec("Test");
    const center = Math.floor(matrix.length / 2);
    // Center module should be dark (bullseye center)
    expect(matrix[center]![center]).toBe(true);
  });

  it("renders to SVG via convenience function", () => {
    const svg = aztec("Hello World");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });
});
