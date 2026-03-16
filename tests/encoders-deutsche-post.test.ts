import { describe, expect, it } from "vitest";
import { encodeIdentcode, encodeLeitcode } from "../src/encoders/deutsche-post";
import { barcode } from "../src/index";

describe("Identcode", () => {
  it("encodes 11 digits (auto check digit)", () => {
    const bars = encodeIdentcode("56300001014");
    expect(bars.length).toBeGreaterThan(0);
    for (const b of bars) expect(b).toBeGreaterThanOrEqual(1);
  });

  it("encodes 12 digits (with check)", () => {
    const bars = encodeIdentcode("563000010140");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("throws on non-digits", () => {
    expect(() => encodeIdentcode("5630000ABC")).toThrow();
  });

  it("throws on wrong length", () => {
    expect(() => encodeIdentcode("123")).toThrow();
  });

  it("works via barcode() function", () => {
    const svg = barcode("56300001014", { type: "identcode" });
    expect(svg).toContain("<svg");
  });
});

describe("Leitcode", () => {
  it("encodes 13 digits (auto check digit)", () => {
    const bars = encodeLeitcode("2130000000014");
    expect(bars.length).toBeGreaterThan(0);
    for (const b of bars) expect(b).toBeGreaterThanOrEqual(1);
  });

  it("encodes 14 digits (with check)", () => {
    const bars = encodeLeitcode("21300000000140");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("throws on non-digits", () => {
    expect(() => encodeLeitcode("ABC")).toThrow();
  });

  it("throws on wrong length", () => {
    expect(() => encodeLeitcode("12345")).toThrow();
  });

  it("works via barcode() function", () => {
    const svg = barcode("2130000000014", { type: "leitcode" });
    expect(svg).toContain("<svg");
  });

  it("different data produces different output", () => {
    const a = encodeLeitcode("2130000000014");
    const b = encodeLeitcode("2130000000024");
    expect(a).not.toEqual(b);
  });
});
