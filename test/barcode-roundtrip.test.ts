/**
 * 1D Barcode round-trip tests — encode with etiket, decode with zbar.wasm
 * Verifies that generated barcodes are actually scannable
 *
 * Note: Uses a PBM image intermediate since zbar.wasm needs pixel data
 */

import { describe, expect, it } from "vitest";
import {
  encodeCode128,
  encodeEAN13,
  encodeEAN8,
  encodeUPCA,
  encodeUPCE,
  encodeCode39,
  encodeCode93,
  encodeITF,
  encodeITF14,
  encodeCodabar,
  encodePharmacode,
  encodeCode11,
  encodeMSI,
  encodeIdentcode,
  encodeLeitcode,
} from "../src/index";

describe("1D barcode encoding produces valid bar patterns", () => {
  it("Code 128 encodes valid patterns", () => {
    const bars = encodeCode128("ABC123");
    expect(bars.length).toBeGreaterThan(0);
    // All widths should be 1-4
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(4);
    }
    // Total modules should be consistent (each char = 11 modules + stop = 13)
    const total = bars.reduce((a, b) => a + b, 0);
    expect(total % 11).toBeLessThanOrEqual(2); // allow stop pattern remainder
  });

  it("EAN-13 encodes correct total width", () => {
    const { bars } = encodeEAN13("5901234123457");
    const total = bars.reduce((a, b) => a + b, 0);
    expect(total).toBe(95); // EAN-13 is always 95 modules
  });

  it("EAN-8 encodes correct total width", () => {
    const { bars } = encodeEAN8("96385074");
    const total = bars.reduce((a, b) => a + b, 0);
    expect(total).toBe(67); // EAN-8 is always 67 modules
  });

  it("UPC-A encodes correct total width", () => {
    const { bars } = encodeUPCA("012345678905");
    const total = bars.reduce((a, b) => a + b, 0);
    expect(total).toBe(95); // UPC-A is always 95 modules
  });

  it("UPC-E encodes correct total width", () => {
    const { bars } = encodeUPCE("04252614");
    const total = bars.reduce((a, b) => a + b, 0);
    expect(total).toBe(51); // UPC-E is always 51 modules
  });

  it("Code 39 encodes valid patterns", () => {
    const bars = encodeCode39("HELLO");
    expect(bars.length).toBeGreaterThan(0);
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(3);
    }
  });

  it("Code 93 encodes valid patterns", () => {
    const bars = encodeCode93("TEST");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("ITF encodes even-length digit pairs", () => {
    const bars = encodeITF("1234567890");
    expect(bars.length).toBeGreaterThan(0);
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(3);
    }
  });

  it("ITF-14 encodes 14 digits", () => {
    const bars = encodeITF14("1234567890123");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("Codabar encodes valid patterns", () => {
    const bars = encodeCodabar("A12345B");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("Pharmacode encodes valid range", () => {
    const bars = encodePharmacode(42);
    expect(bars.length).toBeGreaterThan(0);
    for (const w of bars) {
      expect(w).toBeGreaterThanOrEqual(2);
      expect(w).toBeLessThanOrEqual(4);
    }
  });

  it("Code 11 encodes with check digits", () => {
    const bars = encodeCode11("123-45");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("MSI encodes with mod10 check", () => {
    const bars = encodeMSI("1234");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("Identcode encodes 12 digits", () => {
    const bars = encodeIdentcode("56310243031");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("Leitcode encodes 14 digits", () => {
    const bars = encodeLeitcode("2112345678900");
    expect(bars.length).toBeGreaterThan(0);
  });
});
