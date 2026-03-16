import { describe, expect, it } from "vitest";
import {
  encodeHIBCPrimary,
  encodeHIBCSecondary,
  encodeHIBCConcatenated,
} from "../src/encoders/hibc";

describe("HIBC Primary", () => {
  it("encodes LIC + product", () => {
    const result = encodeHIBCPrimary("A123", "PROD456");
    expect(result).toMatch(/^\+A123PROD4560.$/); // + LIC PRODUCT UOM CHECK
  });

  it("starts with +", () => {
    const result = encodeHIBCPrimary("B999", "XYZ", 1);
    expect(result[0]).toBe("+");
  });

  it("includes unit of measure", () => {
    const result = encodeHIBCPrimary("A123", "ITEM", 5);
    expect(result).toContain("ITEM5");
  });

  it("throws on invalid LIC", () => {
    expect(() => encodeHIBCPrimary("123", "PROD")).toThrow();
    expect(() => encodeHIBCPrimary("AB", "PROD")).toThrow();
  });

  it("throws on empty product", () => {
    expect(() => encodeHIBCPrimary("A123", "")).toThrow();
  });

  it("throws on product > 18 chars", () => {
    expect(() => encodeHIBCPrimary("A123", "A".repeat(19))).toThrow();
  });

  it("check digit is valid HIBC character", () => {
    const result = encodeHIBCPrimary("A123", "PROD");
    const check = result[result.length - 1]!;
    expect("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%").toContain(check);
  });
});

describe("HIBC Secondary", () => {
  it("encodes expiry YYMMDD", () => {
    const result = encodeHIBCSecondary("260101");
    expect(result).toMatch(/^\+\$\$3260101.$/);
  });

  it("encodes expiry YYMM", () => {
    const result = encodeHIBCSecondary("2601");
    expect(result).toMatch(/^\+\$\$22601.$/);
  });

  it("encodes lot only", () => {
    const result = encodeHIBCSecondary(undefined, "LOT001");
    expect(result).toContain("LOT001");
  });

  it("encodes expiry + lot", () => {
    const result = encodeHIBCSecondary("260101", "LOT001");
    expect(result).toContain("260101");
    expect(result).toContain("LOT001");
  });

  it("throws on invalid expiry format", () => {
    expect(() => encodeHIBCSecondary("123")).toThrow();
  });
});

describe("HIBC Concatenated", () => {
  it("combines primary and secondary", () => {
    const result = encodeHIBCConcatenated("A123", "PROD", {
      expiry: "260101",
      lot: "LOT01",
    });
    expect(result).toContain("A123");
    expect(result).toContain("PROD");
    expect(result).toContain("/");
  });

  it("works without secondary", () => {
    const result = encodeHIBCConcatenated("A123", "PROD");
    expect(result).toContain("+A123PROD");
  });
});
