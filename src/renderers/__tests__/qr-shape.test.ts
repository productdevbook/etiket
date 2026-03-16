import { describe, expect, it } from "vitest";
import { renderQRCodeSVG } from "../svg/qr";
import { qrcode } from "../../index";

const matrix: boolean[][] = [
  [true, false, true],
  [false, true, false],
  [true, false, true],
];

describe("QR shape option", () => {
  it("default square has no clipPath", () => {
    const svg = renderQRCodeSVG(matrix);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).not.toContain("clipPath");
    expect(svg).not.toContain("etiket-circle-clip");
  });

  it("circle shape adds clipPath with circle", () => {
    const svg = renderQRCodeSVG(matrix, { shape: "circle" });
    expect(svg).toContain("<clipPath");
    expect(svg).toContain("etiket-circle-clip");
    expect(svg).toContain("<circle");
    expect(svg).toContain('clip-path="url(#etiket-circle-clip)"');
  });

  it("circle shape produces valid SVG", () => {
    const svg = renderQRCodeSVG(matrix, { shape: "circle" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<path");
  });

  it("works via qrcode() convenience function", () => {
    const svg = qrcode("Hello", { shape: "circle" });
    expect(svg).toContain("<clipPath");
    expect(svg).toContain("etiket-circle-clip");
  });

  it("square shape explicitly set has no clipPath", () => {
    const svg = renderQRCodeSVG(matrix, { shape: "square" });
    expect(svg).not.toContain("clipPath");
  });
});
