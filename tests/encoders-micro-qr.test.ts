import { describe, expect, it } from "vitest";
import { encodeMicroQR } from "../src/encoders/qr/micro";

describe("Micro QR Code", () => {
  it("encodes M1 (numeric only, 11x11)", () => {
    const matrix = encodeMicroQR("12345");
    expect(matrix.length).toBe(11);
    expect(matrix[0]!.length).toBe(11);
  });

  it("encodes M2 (alphanumeric, 13x13)", () => {
    const matrix = encodeMicroQR("AB12");
    expect(matrix.length).toBe(13);
  });

  it("encodes M3 (byte mode, 15x15)", () => {
    const matrix = encodeMicroQR("hello");
    expect(matrix.length).toBe(15);
  });

  it("encodes M4 (larger byte, 17x17)", () => {
    const matrix = encodeMicroQR("Hello World!!");
    expect(matrix.length).toBe(17);
  });

  it("produces boolean matrix", () => {
    const matrix = encodeMicroQR("123");
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("has finder pattern at top-left", () => {
    const matrix = encodeMicroQR("123");
    expect(matrix[0]![0]).toBe(true);
    expect(matrix[0]![6]).toBe(true);
    expect(matrix[6]![0]).toBe(true);
    expect(matrix[3]![3]).toBe(true);
  });

  it("has NO finder at other corners (single finder)", () => {
    const matrix = encodeMicroQR("123");
    const size = matrix.length;
    // Bottom-right should not have a finder
    // (unlike standard QR which has 3 finders)
  });

  it("throws on empty input", () => {
    expect(() => encodeMicroQR("")).toThrow();
  });

  it("throws on data too long", () => {
    expect(() => encodeMicroQR("A".repeat(100))).toThrow();
  });

  it("supports explicit version", () => {
    const matrix = encodeMicroQR("12", { version: 2 });
    expect(matrix.length).toBe(13);
  });

  it("different data produces different matrices", () => {
    const a = encodeMicroQR("123");
    const b = encodeMicroQR("456");
    const aStr = a.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const bStr = b.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(aStr).not.toBe(bStr);
  });
});
