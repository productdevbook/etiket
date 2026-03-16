import { describe, expect, it } from "vitest";
import { encodeCodablockF } from "../src/encoders/codablock-f";

describe("Codablock F", () => {
  it("encodes short text", () => {
    const result = encodeCodablockF("Hello");
    expect(result.matrix.length).toBeGreaterThan(0);
    expect(result.rows).toBeGreaterThan(0);
    expect(result.cols).toBeGreaterThan(0);
  });

  it("produces boolean matrix", () => {
    const result = encodeCodablockF("Test");
    for (const row of result.matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("all rows have same width", () => {
    const result = encodeCodablockF("Hello World Test Data");
    const widths = result.matrix.map((r) => r.length);
    const unique = new Set(widths);
    expect(unique.size).toBe(1);
  });

  it("more data produces more rows", () => {
    const short = encodeCodablockF("Hi");
    const long = encodeCodablockF("Hello World This Is A Longer Text");
    expect(long.rows).toBeGreaterThan(short.rows);
  });

  it("throws on empty input", () => {
    expect(() => encodeCodablockF("")).toThrow();
  });

  it("throws on non-encodable characters", () => {
    expect(() => encodeCodablockF("\x80")).toThrow();
  });

  it("encodes control characters via Code A", () => {
    const result = encodeCodablockF("\x01\x02\x03");
    expect(result.matrix.length).toBeGreaterThan(0);
    expect(result.rows).toBeGreaterThan(0);
  });

  it("respects column count", () => {
    const r1 = encodeCodablockF("Hello World", { columns: 4 });
    const r2 = encodeCodablockF("Hello World", { columns: 8 });
    expect(r1.rows).toBeGreaterThan(r2.rows);
  });
});
