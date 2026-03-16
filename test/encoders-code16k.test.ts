import { describe, expect, it } from "vitest";
import { encodeCode16K } from "../src/encoders/code16k";

describe("Code 16K", () => {
  it("encodes short text", () => {
    const result = encodeCode16K("Hello");
    expect(result.matrix.length).toBeGreaterThanOrEqual(2);
    expect(result.rows).toBeGreaterThanOrEqual(2);
  });

  it("produces boolean matrix", () => {
    const result = encodeCode16K("Test");
    for (const row of result.matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("minimum 2 rows", () => {
    const result = encodeCode16K("Hi");
    expect(result.rows).toBeGreaterThanOrEqual(2);
  });

  it("maximum 16 rows", () => {
    const result = encodeCode16K("A".repeat(70));
    expect(result.rows).toBeLessThanOrEqual(16);
  });

  it("throws on empty input", () => {
    expect(() => encodeCode16K("")).toThrow();
  });

  it("throws on non-printable", () => {
    expect(() => encodeCode16K("\x01")).toThrow();
  });

  it("all rows same width", () => {
    const result = encodeCode16K("Hello World");
    const widths = new Set(result.matrix.map((r) => r.length));
    expect(widths.size).toBe(1);
  });
});
