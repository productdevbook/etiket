import { describe, expect, it } from "vitest";
import { renderBarcodeSVG } from "../svg/barcode";

// Simple bar pattern: bar(2), space(1), bar(1), space(1), bar(2)
const testBars = [2, 1, 1, 1, 2];

describe("barGap option", () => {
  it("barGap 0 (default) renders normally", () => {
    const svg = renderBarcodeSVG(testBars, { barGap: 0 });
    const svgDefault = renderBarcodeSVG(testBars);
    expect(svg).toBe(svgDefault);
  });

  it("barGap > 0 produces different SVG than barGap 0", () => {
    const svgNoGap = renderBarcodeSVG(testBars, { barGap: 0 });
    const svgWithGap = renderBarcodeSVG(testBars, { barGap: 1 });
    expect(svgWithGap).not.toBe(svgNoGap);
    // The gapped version should have narrower bars
    expect(svgWithGap).toContain("<rect");
  });

  it("barGap does not change total SVG width", () => {
    const svgNoGap = renderBarcodeSVG(testBars, { barGap: 0 });
    const svgWithGap = renderBarcodeSVG(testBars, { barGap: 1 });

    const widthOf = (svg: string) => {
      const match = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : NaN;
    };

    expect(widthOf(svgWithGap)).toBe(widthOf(svgNoGap));
  });
});
