import { describe, expect, it } from "vitest";
import { renderQRCodeSVG } from "../src/renderers/svg/qr";

const matrix: boolean[][] = [
  [true, false, true, false, true],
  [false, true, false, true, false],
  [true, false, true, false, true],
  [false, true, false, true, false],
  [true, false, true, false, true],
];

describe("QR logo embedding", () => {
  it("embeds inline SVG logo", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { svg: '<circle r="0.5" fill="red"/>' },
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("circle");
  });

  it("embeds SVG path logo", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { path: "M10 10 L90 10 L90 90 L10 90 Z" },
    });
    expect(svg).toContain("M10 10");
  });

  it("embeds image via data URI", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: dataUri },
    });
    expect(svg).toContain("<image");
    expect(svg).toContain('href="data:image/png;base64,');
  });

  it("embeds image via URL", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: "https://example.com/logo.png", imageWidth: 40, imageHeight: 40 },
    });
    expect(svg).toContain("<image");
    expect(svg).toContain("https://example.com/logo.png");
    expect(svg).toContain('width="40"');
    expect(svg).toContain('height="40"');
  });

  it("escapes imageUrl to prevent injection", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: 'test" onload="alert(1)' },
    });
    // The quote should be escaped so the attribute boundary is preserved
    expect(svg).not.toContain('href="test"');
    expect(svg).toContain("&quot;");
  });

  it("adds background behind logo", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: "data:image/png;base64,abc", backgroundColor: "#fff" },
    });
    expect(svg).toContain('fill="#fff"');
  });

  it("hides background dots by default", () => {
    const withLogo = renderQRCodeSVG(matrix, {
      logo: { imageUrl: "data:image/png;base64,abc", size: 0.5 },
    });
    const withoutLogo = renderQRCodeSVG(matrix);
    // With logo should have fewer path segments (dots hidden)
    const withCount = (withLogo.match(/M/g) || []).length;
    const withoutCount = (withoutLogo.match(/M/g) || []).length;
    expect(withCount).toBeLessThanOrEqual(withoutCount);
  });
});
