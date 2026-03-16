import { describe, expect, it } from "vitest";
import {
  isNumeric,
  isAlphanumeric,
  detectMode,
  encodeNumericData,
  encodeAlphanumericData,
  encodeByteData,
  getAlphanumericValue,
} from "../src/encoders/qr/mode";

describe("QR mode detection", () => {
  it("detects numeric mode", () => {
    expect(isNumeric("12345")).toBe(true);
    expect(isNumeric("0")).toBe(true);
    expect(isNumeric("")).toBe(false); // regex test fails on empty
    expect(isNumeric("12a34")).toBe(false);
    expect(detectMode("12345")).toBe("numeric");
  });

  it("detects alphanumeric mode", () => {
    expect(isAlphanumeric("HELLO")).toBe(true);
    expect(isAlphanumeric("HELLO 123")).toBe(true);
    expect(isAlphanumeric("hello")).toBe(false); // lowercase not in alphanumeric
    expect(detectMode("HELLO 123")).toBe("alphanumeric");
  });

  it("falls back to byte mode", () => {
    expect(detectMode("hello world")).toBe("byte");
    expect(detectMode("日本語")).toBe("byte");
    expect(detectMode("https://example.com")).toBe("byte"); // lowercase
  });
});

describe("QR numeric encoding", () => {
  it("encodes groups of 3 digits as 10 bits", () => {
    const bits = encodeNumericData("123");
    expect(bits.length).toBe(10);
    // 123 in 10 bits = 0001111011
    expect(bits).toEqual([0, 0, 0, 1, 1, 1, 1, 0, 1, 1]);
  });

  it("encodes remainder 2 digits as 7 bits", () => {
    const bits = encodeNumericData("12");
    expect(bits.length).toBe(7);
    // 12 in 7 bits = 0001100
    expect(bits).toEqual([0, 0, 0, 1, 1, 0, 0]);
  });

  it("encodes remainder 1 digit as 4 bits", () => {
    const bits = encodeNumericData("5");
    expect(bits.length).toBe(4);
    // 5 in 4 bits = 0101
    expect(bits).toEqual([0, 1, 0, 1]);
  });

  it("encodes 6 digits as 20 bits (2 groups of 3)", () => {
    const bits = encodeNumericData("123456");
    expect(bits.length).toBe(20);
  });
});

describe("QR alphanumeric encoding", () => {
  it("returns correct values for known characters", () => {
    expect(getAlphanumericValue("0")).toBe(0);
    expect(getAlphanumericValue("9")).toBe(9);
    expect(getAlphanumericValue("A")).toBe(10);
    expect(getAlphanumericValue("Z")).toBe(35);
    expect(getAlphanumericValue(" ")).toBe(36);
  });

  it("encodes pairs as 11 bits", () => {
    const bits = encodeAlphanumericData("AB");
    expect(bits.length).toBe(11);
    // A=10, B=11 → 10*45+11 = 461 in 11 bits
  });

  it("encodes single char as 6 bits", () => {
    const bits = encodeAlphanumericData("A");
    expect(bits.length).toBe(6);
  });

  it("throws for invalid alphanumeric characters", () => {
    expect(() => getAlphanumericValue("a")).toThrow();
  });
});

describe("QR byte encoding", () => {
  it("encodes each byte as 8 bits", () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]); // Hello
    const bits = encodeByteData(data);
    expect(bits.length).toBe(40);
  });

  it("encodes ASCII correctly", () => {
    const data = new Uint8Array([65]); // 'A' = 01000001
    const bits = encodeByteData(data);
    expect(bits).toEqual([0, 1, 0, 0, 0, 0, 0, 1]);
  });
});
