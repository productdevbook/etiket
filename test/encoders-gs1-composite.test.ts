import { describe, expect, it } from "vitest";
import { encodeGS1Composite } from "../src/encoders/gs1-composite";

describe("GS1 Composite", () => {
  it("encodes CC-A (MicroPDF417, 2 columns)", () => {
    const result = encodeGS1Composite("(17)260101(10)BATCH01", "CC-A");
    expect(result.type).toBe("CC-A");
    expect(result.rows).toBeGreaterThan(0);
    expect(result.composite.length).toBe(result.rows);
  });

  it("encodes CC-B (MicroPDF417, 3 columns)", () => {
    const result = encodeGS1Composite("(17)260101(10)BATCH01", "CC-B");
    expect(result.type).toBe("CC-B");
    expect(result.rows).toBeGreaterThan(0);
  });

  it("encodes CC-C (PDF417)", () => {
    const result = encodeGS1Composite("(17)260101(10)BATCH01(21)SERIAL001", "CC-C");
    expect(result.type).toBe("CC-C");
    expect(result.rows).toBeGreaterThan(0);
  });

  it("default type is CC-A", () => {
    const result = encodeGS1Composite("(10)LOT123");
    expect(result.type).toBe("CC-A");
  });

  it("produces boolean matrix", () => {
    const result = encodeGS1Composite("(10)TEST");
    for (const row of result.composite) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("throws on empty", () => {
    expect(() => encodeGS1Composite("")).toThrow();
  });

  it("different data produces different output", () => {
    const a = encodeGS1Composite("(10)AAA");
    const b = encodeGS1Composite("(10)BBB");
    const aStr = a.composite.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const bStr = b.composite.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(aStr).not.toBe(bStr);
  });
});
