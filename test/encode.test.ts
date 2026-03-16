import { describe, expect, it } from "vitest";
import { encode } from "../src/index";

describe("encode() — unified raw output", () => {
  // --- 1D barcode output ---

  it("returns { type: '1d', bars: [...] } for default code128", () => {
    const result = encode("Hello");
    expect(result.type).toBe("1d");
    expect(result).toHaveProperty("bars");
    if (result.type === "1d") {
      expect(Array.isArray(result.bars)).toBe(true);
      expect(result.bars.length).toBeGreaterThan(0);
      for (const bar of result.bars) {
        expect(typeof bar).toBe("number");
        expect(bar).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("returns { type: '1d', bars: [...] } for explicit code128", () => {
    const result = encode("Hello", { type: "code128" });
    expect(result.type).toBe("1d");
    if (result.type === "1d") {
      expect(result.bars.length).toBeGreaterThan(0);
    }
  });

  it("returns same bars as default when type is code128", () => {
    const defaultResult = encode("Hello");
    const explicitResult = encode("Hello", { type: "code128" });
    expect(defaultResult).toEqual(explicitResult);
  });

  // --- 2D matrix output ---

  it("returns { type: '2d', matrix: [...] } for QR code", () => {
    const result = encode("Hello", { type: "qr" });
    expect(result.type).toBe("2d");
    expect(result).toHaveProperty("matrix");
    if (result.type === "2d") {
      expect(Array.isArray(result.matrix)).toBe(true);
      expect(result.matrix.length).toBeGreaterThan(0);
      // Each row should be an array of booleans
      for (const row of result.matrix) {
        expect(Array.isArray(row)).toBe(true);
        for (const cell of row) {
          expect(typeof cell).toBe("boolean");
        }
      }
      // Matrix should be square for QR
      expect(result.matrix.length).toBe(result.matrix[0]!.length);
    }
  });

  it("returns { type: '2d', matrix: [...] } for Data Matrix", () => {
    const result = encode("Hello", { type: "datamatrix" });
    expect(result.type).toBe("2d");
    if (result.type === "2d") {
      expect(result.matrix.length).toBeGreaterThan(0);
    }
  });

  it("returns { type: '2d', matrix: [...] } for PDF417", () => {
    const result = encode("Hello", { type: "pdf417" });
    expect(result.type).toBe("2d");
    if (result.type === "2d") {
      expect(result.matrix.length).toBeGreaterThan(0);
    }
  });

  it("returns { type: '2d', matrix: [...] } for Aztec", () => {
    const result = encode("Hello", { type: "aztec" });
    expect(result.type).toBe("2d");
    if (result.type === "2d") {
      expect(result.matrix.length).toBeGreaterThan(0);
    }
  });

  // --- Various 1D barcode types ---

  it("returns 1d result for code39", () => {
    const result = encode("HELLO", { type: "code39" });
    expect(result.type).toBe("1d");
  });

  it("returns 1d result for code93", () => {
    const result = encode("TEST", { type: "code93" });
    expect(result.type).toBe("1d");
  });

  it("returns 1d result for ean13", () => {
    const result = encode("4006381333931", { type: "ean13" });
    expect(result.type).toBe("1d");
  });

  it("returns 1d result for itf", () => {
    const result = encode("1234567890", { type: "itf" });
    expect(result.type).toBe("1d");
  });

  // --- Error handling ---

  it("throws for ean13 with wrong length", () => {
    expect(() => encode("Hello", { type: "ean13" })).toThrow();
  });

  it("throws for unsupported type", () => {
    expect(() => encode("test", { type: "invalid" as any })).toThrow("Unsupported");
  });

  // --- Different types produce different structures ---

  it("same text produces different structures for 1d vs 2d", () => {
    const barcode = encode("12345678");
    const qr = encode("12345678", { type: "qr" });
    expect(barcode.type).toBe("1d");
    expect(qr.type).toBe("2d");
  });

  // --- Passthrough options work ---

  it("passes code128Charset option through", () => {
    const auto = encode("123456", { type: "code128" });
    const charsetC = encode("123456", { type: "code128", code128Charset: "C" });
    // Both should succeed and produce 1d results
    expect(auto.type).toBe("1d");
    expect(charsetC.type).toBe("1d");
    // Charset C produces a more compact encoding for pure digits
    if (auto.type === "1d" && charsetC.type === "1d") {
      expect(charsetC.bars.length).toBeLessThanOrEqual(auto.bars.length);
    }
  });
});
