import { describe, expect, it } from "vitest";
import {
  encodeISBT128DIN,
  encodeISBT128Component,
  encodeISBT128Expiry,
  encodeISBT128BloodGroup,
} from "../src/encoders/isbt128";
import { barcode } from "../src/index";

describe("ISBT 128 DIN", () => {
  it("formats donation identification number", () => {
    const result = encodeISBT128DIN("US", "12345", "26", "000001");
    expect(result).toBe("=US1234526000001");
  });

  it("pads facility and donation numbers", () => {
    const result = encodeISBT128DIN("GB", "1", "26", "1");
    expect(result).toBe("=GB0000126000001");
  });

  it("throws on invalid country code", () => {
    expect(() => encodeISBT128DIN("USA", "12345", "26", "1")).toThrow();
  });

  it("throws on long facility number", () => {
    expect(() => encodeISBT128DIN("US", "123456", "26", "1")).toThrow();
  });

  it("can be encoded as Code 128 barcode", () => {
    const din = encodeISBT128DIN("US", "12345", "26", "000001");
    const svg = barcode(din, { type: "code128" });
    expect(svg).toContain("<svg");
  });
});

describe("ISBT 128 Component", () => {
  it("formats product code", () => {
    expect(encodeISBT128Component("E0791")).toBe("=E0791");
  });

  it("throws on wrong length", () => {
    expect(() => encodeISBT128Component("E07")).toThrow();
  });
});

describe("ISBT 128 Expiry", () => {
  it("formats expiry date", () => {
    expect(encodeISBT128Expiry("260115")).toBe("&260115");
  });

  it("throws on non-digits", () => {
    expect(() => encodeISBT128Expiry("26Jan1")).toThrow();
  });
});

describe("ISBT 128 Blood Group", () => {
  it("formats blood group code", () => {
    expect(encodeISBT128BloodGroup("51")).toBe("%51");
  });

  it("throws on empty", () => {
    expect(() => encodeISBT128BloodGroup("")).toThrow();
  });
});
