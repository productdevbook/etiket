import { describe, expect, it } from "vitest";
import { renderBarcodeSVG } from "../svg/barcode";

const bars = [2, 1, 2, 2, 2, 2]; // simple pattern

describe("measurement units", () => {
  it("default px has no unit suffix", () => {
    const svg = renderBarcodeSVG(bars);
    expect(svg).toMatch(/width="\d+"/);
    expect(svg).not.toMatch(/width="\d+mm"/);
  });

  it("mm unit adds mm suffix", () => {
    const svg = renderBarcodeSVG(bars, { unit: "mm" });
    expect(svg).toMatch(/width="\d+mm"/);
    expect(svg).toMatch(/height="\d+mm"/);
  });

  it("in unit adds in suffix", () => {
    const svg = renderBarcodeSVG(bars, { unit: "in" });
    expect(svg).toMatch(/width="[\d.]+in"/);
  });

  it("cm unit adds cm suffix", () => {
    const svg = renderBarcodeSVG(bars, { unit: "cm" });
    expect(svg).toMatch(/width="[\d.]+cm"/);
  });

  it("pt unit adds pt suffix", () => {
    const svg = renderBarcodeSVG(bars, { unit: "pt" });
    expect(svg).toMatch(/width="[\d.]+pt"/);
  });

  it("viewBox remains unitless", () => {
    const svg = renderBarcodeSVG(bars, { unit: "mm" });
    expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
    expect(svg).not.toMatch(/viewBox="0 0 \d+mm/);
  });
});
