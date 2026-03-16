import { describe, expect, it } from "vitest";
import { encodeRMQR } from "../src/encoders/rmqr";

describe("rMQR (Rectangular Micro QR)", () => {
  it("encodes short text", () => {
    const matrix = encodeRMQR("Hello");
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix[0]!.length).toBeGreaterThan(matrix.length); // rectangular
  });

  it("produces rectangular matrix (wider than tall)", () => {
    const matrix = encodeRMQR("Test data");
    expect(matrix[0]!.length).toBeGreaterThan(matrix.length);
  });

  it("produces boolean matrix", () => {
    const matrix = encodeRMQR("Data");
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("has finder at top-left", () => {
    const matrix = encodeRMQR("Test");
    expect(matrix[0]![0]).toBe(true);
    expect(matrix[0]![6]).toBe(true);
    expect(matrix[3]![3]).toBe(true);
  });

  it("supports EC level M", () => {
    const matrix = encodeRMQR("Test", { ecLevel: "M" });
    expect(matrix.length).toBeGreaterThan(0);
  });

  it("supports EC level H", () => {
    const matrix = encodeRMQR("Test", { ecLevel: "H" });
    expect(matrix.length).toBeGreaterThan(0);
  });

  it("throws on empty input", () => {
    expect(() => encodeRMQR("")).toThrow();
  });

  it("throws on too long data", () => {
    expect(() => encodeRMQR("A".repeat(500))).toThrow();
  });

  it("different data produces different output", () => {
    const a = encodeRMQR("Hello");
    const b = encodeRMQR("World");
    const aStr = a.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const bStr = b.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(aStr).not.toBe(bStr);
  });
});
