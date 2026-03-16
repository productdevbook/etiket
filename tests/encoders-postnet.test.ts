import { describe, expect, it } from "vitest";
import { encodePOSTNET, encodePLANET } from "../src/encoders/postnet";
import { barcode } from "../src/index";

describe("POSTNET", () => {
  it("encodes 5-digit ZIP", () => {
    const bars = encodePOSTNET("12345");
    // (5+1 check) × 5 + 2 frame = 32
    expect(bars.length).toBe(32);
    expect(bars[0]).toBe(1); // start frame bar
    expect(bars[bars.length - 1]).toBe(1); // end frame bar
  });

  it("encodes 9-digit ZIP+4", () => {
    const bars = encodePOSTNET("123456789");
    expect(bars.length).toBe(52); // (9+1) × 5 + 2 = 52
  });

  it("encodes 11-digit delivery point", () => {
    const bars = encodePOSTNET("12345678901");
    expect(bars.length).toBe(62); // (11+1) × 5 + 2 = 62
  });

  it("strips dashes and spaces", () => {
    const a = encodePOSTNET("12345-6789");
    const b = encodePOSTNET("123456789");
    expect(a).toEqual(b);
  });

  it("throws on non-digits", () => {
    expect(() => encodePOSTNET("ABCDE")).toThrow();
  });

  it("throws on wrong length", () => {
    expect(() => encodePOSTNET("1234")).toThrow();
    expect(() => encodePOSTNET("123456")).toThrow();
  });

  it("all values are 0 or 1", () => {
    const bars = encodePOSTNET("12345");
    for (const b of bars) {
      expect(b === 0 || b === 1).toBe(true);
    }
  });

  it("works via barcode() function", () => {
    const svg = barcode("12345", { type: "postnet" });
    expect(svg).toContain("<svg");
  });
});

describe("PLANET", () => {
  it("encodes 11-digit code", () => {
    const bars = encodePLANET("12345678901");
    expect(bars.length).toBe(62);
  });

  it("encodes 13-digit code", () => {
    const bars = encodePLANET("1234567890123");
    expect(bars.length).toBe(72); // (13+1) × 5 + 2 = 72
  });

  it("PLANET is inverted POSTNET", () => {
    // For same digit patterns, PLANET should have inverted heights (except frame bars)
    const postnet = encodePOSTNET("12345678901");
    const planet = encodePLANET("12345678901");
    // Inner bars (excluding frame) should be inverted
    for (let i = 1; i < postnet.length - 1; i++) {
      expect(planet[i]).toBe(postnet[i] === 1 ? 0 : 1);
    }
  });

  it("throws on wrong length", () => {
    expect(() => encodePLANET("12345")).toThrow();
  });

  it("works via barcode() function", () => {
    const svg = barcode("12345678901", { type: "planet" });
    expect(svg).toContain("<svg");
  });
});
