import { describe, expect, it } from "vitest";
import { optimizeSVG } from "../svg/optimize";

describe("SVG optimization", () => {
  it("rounds decimals to specified precision", () => {
    const input = '<path d="M1.123456,2.654321h3.999999"/>';
    const result = optimizeSVG(input, { precision: 2 });
    expect(result).toContain("1.12");
    expect(result).toContain("2.65");
    expect(result).not.toContain("1.123456");
  });

  it("removes trailing zeros", () => {
    const input = '<rect x="4.000000" y="8.100000"/>';
    const result = optimizeSVG(input, { precision: 2 });
    expect(result).toContain('"4"');
    expect(result).toContain('"8.1"');
  });

  it("responsive mode removes width/height", () => {
    const input = '<svg viewBox="0 0 200 100" width="200" height="100">';
    const result = optimizeSVG(input, { responsive: true });
    expect(result).toContain("viewBox");
    expect(result).not.toMatch(/ width="/);
    expect(result).not.toMatch(/ height="/);
  });

  it("keeps width/height by default", () => {
    const input = '<svg viewBox="0 0 200 100" width="200" height="100">';
    const result = optimizeSVG(input);
    expect(result).toContain('width="200"');
    expect(result).toContain('height="100"');
  });

  it("default precision is 2", () => {
    const input = "M1.23456789";
    const result = optimizeSVG(input);
    expect(result).toBe("M1.23");
  });

  it("works with real QR SVG output", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><path d="M6.896551724137931,6.896551724137931h6.896551724137931v6.896551724137931h-6.896551724137931z"/></svg>';
    const result = optimizeSVG(input, { precision: 1, responsive: true });
    expect(result).not.toContain("6.896551724137931");
    expect(result).toContain("6.9");
    expect(result).not.toMatch(/ width="/);
  });
});
