import { describe, expect, it } from "vitest";
import { svgToDataURI, svgToBase64, svgToBase64Raw } from "../src/renderers/data-uri";

describe("data URI encoding", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#000"/></svg>';

  it("creates valid data URI", () => {
    const uri = svgToDataURI(svg);
    expect(uri).toMatch(/^data:image\/svg\+xml,/);
    expect(uri.length).toBeGreaterThan(svg.length);
  });

  it("creates base64 data URI", () => {
    const uri = svgToBase64(svg);
    expect(uri).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("creates raw base64 string", () => {
    const b64 = svgToBase64Raw(svg);
    expect(b64).not.toContain("data:");
    // Should be valid base64 characters
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("percent-encodes special characters", () => {
    const uri = svgToDataURI(svg);
    expect(uri).not.toContain("<svg");
    expect(uri).toContain("%3C");
  });

  it("handles UTF-8 content in base64 encoding", () => {
    const utf8Svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>café über naïve</text></svg>';
    const uri = svgToBase64(utf8Svg);
    expect(uri).toMatch(/^data:image\/svg\+xml;base64,/);
    // Round-trip: decode and verify the original string is preserved
    const base64Part = uri.replace("data:image/svg+xml;base64,", "");
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(base64Part), (c) => c.charCodeAt(0)),
    );
    expect(decoded).toBe(utf8Svg);
  });

  it("handles UTF-8 content in raw base64 encoding", () => {
    const utf8Svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>résumé</text></svg>';
    const b64 = svgToBase64Raw(utf8Svg);
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    expect(decoded).toBe(utf8Svg);
  });
});
