import { describe, expect, it } from "vitest";
import {
  barcode,
  qrcode,
  datamatrix,
  pdf417,
  aztec,
  encodeQR,
  svgToDataURI,
  svgToBase64,
} from "../src/index";

/**
 * Edge runtime compatibility tests
 * Verifies no Node.js-specific APIs are used in the core library
 * (CLI is excluded as it's Node.js only)
 */
describe("Edge runtime compatibility", () => {
  it("barcode() uses no Node.js globals", () => {
    const svg = barcode("Hello");
    expect(svg).toContain("<svg");
  });

  it("qrcode() uses no Node.js globals", () => {
    const svg = qrcode("Hello");
    expect(svg).toContain("<svg");
  });

  it("datamatrix() uses no Node.js globals", () => {
    const svg = datamatrix("Hello");
    expect(svg).toContain("<svg");
  });

  it("pdf417() uses no Node.js globals", () => {
    const svg = pdf417("Hello");
    expect(svg).toContain("<svg");
  });

  it("aztec() uses no Node.js globals", () => {
    const svg = aztec("Hello");
    expect(svg).toContain("<svg");
  });

  it("encodeQR() uses only TextEncoder (available in all runtimes)", () => {
    const matrix = encodeQR("Hello");
    expect(matrix.length).toBeGreaterThan(0);
  });

  it("svgToDataURI() uses no Node.js globals", () => {
    const uri = svgToDataURI("<svg></svg>");
    expect(uri).toMatch(/^data:image\/svg\+xml,/);
  });

  it("svgToBase64() uses TextEncoder + btoa (available in all runtimes)", () => {
    const b64 = svgToBase64("<svg></svg>");
    expect(b64).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
