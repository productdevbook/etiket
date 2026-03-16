import { describe, expect, it } from "vitest";
import { barcode, qrcode, encodeCode128, encodeEAN13, encodeEAN8, encodeQR } from "../src/index";

describe("barcode", () => {
  it("generates Code 128 SVG", () => {
    const svg = barcode("Hello");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<rect");
  });

  it("generates Code 128 with text", () => {
    const svg = barcode("ABC-123", { showText: true });
    expect(svg).toContain("ABC-123");
    expect(svg).toContain("<text");
  });

  it("generates EAN-13 SVG", () => {
    const svg = barcode("4006381333931", { type: "ean13" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("<rect");
  });

  it("generates EAN-8 SVG", () => {
    const svg = barcode("96385074", { type: "ean8" });
    expect(svg).toContain("<svg");
  });

  it("respects custom colors", () => {
    const svg = barcode("Test", { color: "#ff0000", background: "#eee" });
    expect(svg).toContain("#ff0000");
    expect(svg).toContain("#eee");
  });

  it("throws on unsupported type", () => {
    expect(() => barcode("test", { type: "invalid" as any })).toThrow("Unsupported");
  });
});

describe("qrcode", () => {
  it("generates QR code SVG", () => {
    const svg = qrcode("Hello");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<path");
  });

  it("respects size option", () => {
    const svg = qrcode("Test", { size: 300 });
    expect(svg).toContain('width="300"');
    expect(svg).toContain('height="300"');
  });

  it("respects custom colors", () => {
    const svg = qrcode("Test", { color: "#333", background: "#fff" });
    expect(svg).toContain("#333");
  });

  it("handles URLs", () => {
    const svg = qrcode("https://example.com");
    expect(svg).toContain("<svg");
  });
});

describe("encodeCode128", () => {
  it("encodes numeric data", () => {
    const bars = encodeCode128("12345678");
    expect(bars.length).toBeGreaterThan(0);
    // All values should be 1-4
    for (const b of bars) {
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(4);
    }
  });

  it("encodes alphanumeric data", () => {
    const bars = encodeCode128("ABC123");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("optimizes with Code C for long numeric runs", () => {
    const short = encodeCode128("AB");
    const numeric = encodeCode128("12345678");
    // Code C encoding should be more compact for pure numbers
    expect(numeric.length).toBeLessThan(short.length * 4);
  });
});

describe("encodeEAN13", () => {
  it("encodes 13 digits", () => {
    const result = encodeEAN13("4006381333931");
    expect(result.bars.length).toBeGreaterThan(0);
  });

  it("auto-calculates check digit from 12 digits", () => {
    const result = encodeEAN13("400638133393");
    expect(result.bars.length).toBeGreaterThan(0);
  });

  it("throws on invalid length", () => {
    expect(() => encodeEAN13("123")).toThrow();
  });
});

describe("encodeEAN8", () => {
  it("encodes 8 digits", () => {
    const result = encodeEAN8("96385074");
    expect(result.bars.length).toBeGreaterThan(0);
  });

  it("auto-calculates check digit from 7 digits", () => {
    const result = encodeEAN8("9638507");
    expect(result.bars.length).toBeGreaterThan(0);
  });
});

describe("encodeQR", () => {
  it("encodes short text", () => {
    const matrix = encodeQR("Hello");
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix[0]!.length).toBe(matrix.length); // Square
  });

  it("encodes URL", () => {
    const matrix = encodeQR("https://example.com");
    expect(matrix.length).toBeGreaterThan(0);
  });

  it("version scales with data length", () => {
    const short = encodeQR("Hi");
    const long = encodeQR("This is a longer text that needs more space");
    expect(long.length).toBeGreaterThan(short.length);
  });
});
