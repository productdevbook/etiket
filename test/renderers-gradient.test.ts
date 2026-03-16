import { describe, expect, it, beforeEach } from "vitest";
import {
  isGradient,
  generateGradientDef,
  resetGradientCounter,
} from "../src/renderers/svg/gradient";

describe("gradient utilities", () => {
  beforeEach(() => {
    resetGradientCounter();
  });

  it("isGradient returns false for strings", () => {
    expect(isGradient("#000")).toBe(false);
    expect(isGradient("red")).toBe(false);
    expect(isGradient(undefined)).toBe(false);
  });

  it("isGradient returns true for gradient objects", () => {
    expect(
      isGradient({
        type: "linear",
        stops: [
          { offset: 0, color: "#000" },
          { offset: 1, color: "#fff" },
        ],
      }),
    ).toBe(true);
    expect(
      isGradient({
        type: "radial",
        stops: [
          { offset: 0, color: "#000" },
          { offset: 1, color: "#fff" },
        ],
      }),
    ).toBe(true);
  });

  it("generates linear gradient SVG", () => {
    const { id, svg } = generateGradientDef({
      type: "linear",
      rotation: 45,
      stops: [
        { offset: 0, color: "#ff0000" },
        { offset: 1, color: "#0000ff" },
      ],
    });

    expect(id).toBe("etiket-grad-0");
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain('id="etiket-grad-0"');
    expect(svg).toContain("<stop");
    expect(svg).toContain("#ff0000");
    expect(svg).toContain("#0000ff");
    expect(svg).toContain("</linearGradient>");
  });

  it("generates radial gradient SVG", () => {
    const { id, svg } = generateGradientDef({
      type: "radial",
      stops: [
        { offset: 0, color: "#000" },
        { offset: 1, color: "#fff" },
      ],
    });

    expect(id).toBe("etiket-grad-0");
    expect(svg).toContain("<radialGradient");
    expect(svg).toContain('cx="50%"');
    expect(svg).toContain("</radialGradient>");
  });

  it("increments gradient IDs", () => {
    const g1 = generateGradientDef({ type: "linear", stops: [{ offset: 0, color: "#000" }] });
    const g2 = generateGradientDef({ type: "linear", stops: [{ offset: 0, color: "#000" }] });
    expect(g1.id).toBe("etiket-grad-0");
    expect(g2.id).toBe("etiket-grad-1");
  });
});
