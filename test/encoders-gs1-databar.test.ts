import { describe, expect, it } from "vitest";
import {
  encodeGS1DataBarOmni,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
} from "../src/encoders/gs1-databar";
import { barcode } from "../src/index";

describe("GS1 DataBar Omnidirectional", () => {
  it("encodes 14-digit GTIN", () => {
    const bars = encodeGS1DataBarOmni("01234567890128");
    expect(bars.length).toBeGreaterThan(0);
    for (const b of bars) expect(b).toBeGreaterThanOrEqual(1);
  });

  it("encodes 13-digit GTIN (auto check digit)", () => {
    const bars = encodeGS1DataBarOmni("0123456789012");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("throws on non-numeric", () => {
    expect(() => encodeGS1DataBarOmni("ABC")).toThrow();
  });

  it("throws on wrong length", () => {
    expect(() => encodeGS1DataBarOmni("12345")).toThrow();
  });

  it("works via barcode()", () => {
    const svg = barcode("01234567890128", { type: "gs1-databar" });
    expect(svg).toContain("<svg");
  });
});

describe("GS1 DataBar Limited", () => {
  it("encodes GTIN starting with 0", () => {
    const bars = encodeGS1DataBarLimited("01234567890128");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes GTIN starting with 1", () => {
    const bars = encodeGS1DataBarLimited("11234567890128");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("throws on GTIN starting with 2+", () => {
    expect(() => encodeGS1DataBarLimited("21234567890128")).toThrow();
  });

  it("works via barcode()", () => {
    const svg = barcode("01234567890128", { type: "gs1-databar-limited" });
    expect(svg).toContain("<svg");
  });
});

describe("GS1 DataBar Expanded", () => {
  it("encodes AI data", () => {
    const bars = encodeGS1DataBarExpanded("(01)12345678901234");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("encodes plain text", () => {
    const bars = encodeGS1DataBarExpanded("HELLO123");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("throws on empty", () => {
    expect(() => encodeGS1DataBarExpanded("")).toThrow();
  });

  it("works via barcode()", () => {
    const svg = barcode("(01)12345678901234", { type: "gs1-databar-expanded" });
    expect(svg).toContain("<svg");
  });

  it("different data produces different output", () => {
    const a = encodeGS1DataBarExpanded("(01)12345678901234");
    const b = encodeGS1DataBarExpanded("(01)98765432109876");
    expect(a).not.toEqual(b);
  });
});
