import { describe, expect, it } from "vitest";
import { getModulePath, getFinderOuterPath, getFinderInnerPath } from "../src/renderers/svg/shapes";

describe("module shapes", () => {
  const x = 10;
  const y = 20;
  const size = 5;

  it("square generates valid path", () => {
    const path = getModulePath(x, y, size, "square");
    expect(path).toContain("M");
    expect(path).toContain("h");
    expect(path).toContain("v");
    expect(path).toContain("z");
  });

  it("dots generates circle path", () => {
    const path = getModulePath(x, y, size, "dots");
    expect(path).toContain("a"); // arc commands for circle
  });

  it("rounded generates path with arcs", () => {
    const path = getModulePath(x, y, size, "rounded");
    expect(path).toContain("a"); // arc commands
  });

  it("diamond generates path", () => {
    const path = getModulePath(x, y, size, "diamond");
    expect(path).toContain("l"); // line commands
  });

  it("all dot types produce non-empty paths", () => {
    const types = [
      "square",
      "rounded",
      "dots",
      "diamond",
      "classy",
      "classy-rounded",
      "extra-rounded",
      "vertical-line",
      "horizontal-line",
      "small-square",
      "tiny-square",
    ] as const;

    for (const type of types) {
      const path = getModulePath(x, y, size, type);
      expect(path.length).toBeGreaterThan(0);
      expect(path).toContain("M"); // All paths start with moveto
    }
  });

  it("dotSize scales the module", () => {
    const full = getModulePath(x, y, size, "square", 1);
    const half = getModulePath(x, y, size, "square", 0.5);
    expect(full).not.toBe(half);
  });
});

describe("finder pattern paths", () => {
  it("outer path generates valid SVG", () => {
    const path = getFinderOuterPath(0, 0, 5, "square");
    expect(path).toContain("M");
    expect(path.length).toBeGreaterThan(10);
  });

  it("inner path generates valid SVG", () => {
    const path = getFinderInnerPath(0, 0, 5, "square");
    expect(path).toContain("M");
  });

  it("rounded outer path has arcs", () => {
    const path = getFinderOuterPath(0, 0, 5, "rounded");
    expect(path).toContain("a");
  });

  it("dots outer path has circles", () => {
    const path = getFinderOuterPath(0, 0, 5, "dots");
    expect(path).toContain("a");
  });
});
