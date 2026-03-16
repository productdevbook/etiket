import { describe, expect, it } from "vitest";
import { renderText } from "../src/renderers/text";

describe("text renderer", () => {
  // Small test matrix
  const matrix: boolean[][] = [
    [true, false, true],
    [false, true, false],
    [true, false, true],
  ];

  it("renders compact mode by default", () => {
    const text = renderText(matrix);
    expect(text.length).toBeGreaterThan(0);
    // Compact mode uses half-block characters
    expect(text).toMatch(/[█▀▄ ]/);
  });

  it("renders non-compact mode", () => {
    const text = renderText(matrix, { compact: false });
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("██"); // Dark module
  });

  it("includes margin", () => {
    const withMargin = renderText(matrix, { margin: 2 });
    const noMargin = renderText(matrix, { margin: 0 });
    expect(withMargin.length).toBeGreaterThan(noMargin.length);
  });

  it("invert option swaps dark/light", () => {
    const normal = renderText(matrix, { compact: false, margin: 0 });
    const inverted = renderText(matrix, { compact: false, margin: 0, invert: true });
    expect(normal).not.toBe(inverted);
  });

  it("produces multiple lines", () => {
    const text = renderText(matrix);
    const lines = text.split("\n");
    expect(lines.length).toBeGreaterThan(1);
  });
});
