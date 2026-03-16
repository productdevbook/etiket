import { describe, expect, it } from "vitest";
import { validateQRInput, validateBarcodeInput } from "../src/index";

describe("validateQRInput", () => {
  it("returns valid with version 1 and mode numeric for short numeric input", () => {
    const result = validateQRInput("12345", "L");
    expect(result.valid).toBe(true);
    expect(result.version).toBe(1);
    expect(result.mode).toBe("numeric");
    expect(result.dataLength).toBe(5);
    expect(result.maxCapacity).toBeGreaterThan(0);
  });

  it("returns valid with mode byte for mixed-case text", () => {
    const result = validateQRInput("Hello", "H");
    expect(result.valid).toBe(true);
    expect(result.mode).toBe("byte");
    expect(result.version).toBeGreaterThanOrEqual(1);
    expect(result.dataLength).toBe(5);
  });

  it("returns invalid for data that exceeds maximum capacity", () => {
    const result = validateQRInput("A".repeat(5000), "H");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns invalid for empty string", () => {
    const result = validateQRInput("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Text cannot be empty");
  });

  it("returns higher version for longer data", () => {
    const short = validateQRInput("123", "L");
    const long = validateQRInput("1".repeat(200), "L");
    expect(short.valid).toBe(true);
    expect(long.valid).toBe(true);
    expect(long.version).toBeGreaterThan(short.version!);
  });

  it("detects alphanumeric mode for uppercase + digits", () => {
    const result = validateQRInput("HELLO 123", "M");
    expect(result.valid).toBe(true);
    expect(result.mode).toBe("alphanumeric");
  });

  it("uses default EC level M when not specified", () => {
    const result = validateQRInput("test");
    expect(result.valid).toBe(true);
    expect(result.version).toBeGreaterThanOrEqual(1);
  });
});

describe("validateBarcodeInput", () => {
  it("returns valid with checkDigit for EAN-13 (12 digits)", () => {
    const result = validateBarcodeInput("400638133393", "ean13");
    expect(result.valid).toBe(true);
    expect(result.checkDigit).toBe(1);
  });

  it("returns invalid for non-numeric EAN-13 input", () => {
    const result = validateBarcodeInput("ABC", "ean13");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns valid with checkDigit for EAN-13 with 13 digits", () => {
    const result = validateBarcodeInput("4006381333931", "ean13");
    expect(result.valid).toBe(true);
    expect(result.checkDigit).toBe(1);
  });

  it("returns valid with checkDigit for EAN-8", () => {
    const result = validateBarcodeInput("9638507", "ean8");
    expect(result.valid).toBe(true);
    expect(typeof result.checkDigit).toBe("number");
  });

  it("returns valid with checkDigit for UPC-A", () => {
    const result = validateBarcodeInput("01234567890", "upca");
    expect(result.valid).toBe(true);
    expect(typeof result.checkDigit).toBe("number");
  });

  it("returns valid with checkDigit for ITF-14", () => {
    const result = validateBarcodeInput("1234567890123", "itf14");
    expect(result.valid).toBe(true);
    expect(typeof result.checkDigit).toBe("number");
  });

  it("returns valid without checkDigit for code128", () => {
    const result = validateBarcodeInput("Hello", "code128");
    expect(result.valid).toBe(true);
    expect(result.checkDigit).toBeUndefined();
  });

  it("returns invalid for wrong length ITF-14", () => {
    const result = validateBarcodeInput("123", "itf14");
    expect(result.valid).toBe(false);
  });
});
