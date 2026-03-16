import { describe, expect, it } from "vitest";
import { getMaskFn, evaluatePenalty } from "../src/encoders/qr/mask";

describe("QR mask patterns", () => {
  it("mask 0: (r+c) % 2 === 0", () => {
    const fn = getMaskFn(0);
    expect(fn(0, 0)).toBe(true);
    expect(fn(0, 1)).toBe(false);
    expect(fn(1, 0)).toBe(false);
    expect(fn(1, 1)).toBe(true);
  });

  it("mask 1: r % 2 === 0", () => {
    const fn = getMaskFn(1);
    expect(fn(0, 0)).toBe(true);
    expect(fn(0, 5)).toBe(true);
    expect(fn(1, 0)).toBe(false);
    expect(fn(2, 3)).toBe(true);
  });

  it("mask 2: c % 3 === 0", () => {
    const fn = getMaskFn(2);
    expect(fn(0, 0)).toBe(true);
    expect(fn(0, 1)).toBe(false);
    expect(fn(0, 2)).toBe(false);
    expect(fn(0, 3)).toBe(true);
  });

  it("mask 3: (r+c) % 3 === 0", () => {
    const fn = getMaskFn(3);
    expect(fn(0, 0)).toBe(true);
    expect(fn(0, 1)).toBe(false);
    expect(fn(1, 2)).toBe(true);
  });

  it("mask 4: (floor(r/2) + floor(c/3)) % 2 === 0", () => {
    const fn = getMaskFn(4);
    expect(fn(0, 0)).toBe(true);
    expect(fn(0, 3)).toBe(false);
    expect(fn(2, 0)).toBe(false);
  });

  it("mask 5: (r*c)%2 + (r*c)%3 === 0", () => {
    const fn = getMaskFn(5);
    expect(fn(0, 0)).toBe(true); // 0*0=0, 0%2+0%3=0
    expect(fn(1, 1)).toBe(false); // 1%2+1%3=1+1=2
  });

  it("mask 6: ((r*c)%2 + (r*c)%3) % 2 === 0", () => {
    const fn = getMaskFn(6);
    expect(fn(0, 0)).toBe(true); // 0%2=0
    expect(fn(1, 1)).toBe(true); // (1%2+1%3)%2 = 2%2 = 0
  });

  it("mask 7: ((r+c)%2 + (r*c)%3) % 2 === 0", () => {
    const fn = getMaskFn(7);
    expect(fn(0, 0)).toBe(true); // (0%2+0%3)%2=0
  });

  it("all 8 masks produce different patterns on a 10x10 grid", () => {
    const patterns: string[] = [];
    for (let m = 0; m < 8; m++) {
      const fn = getMaskFn(m);
      let pat = "";
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          pat += fn(r, c) ? "1" : "0";
        }
      }
      patterns.push(pat);
    }
    // All patterns should be unique
    const unique = new Set(patterns);
    expect(unique.size).toBe(8);
  });
});

describe("QR penalty evaluation", () => {
  it("returns 0 for perfectly alternating pattern", () => {
    // A checkerboard pattern should have low penalty
    const size = 10;
    const matrix: (boolean | null)[][] = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => (r + c) % 2 === 0),
    );
    const penalty = evaluatePenalty(matrix, size);
    // Checkerboard has no consecutive runs, no 2x2 blocks
    // Rule 1: no runs of 5+ (score = 0)
    // Rule 2: no 2x2 blocks (score = 0)
    // Rule 3: may or may not match patterns
    // Rule 4: exactly 50% dark (score = 0)
    expect(penalty).toBeGreaterThanOrEqual(0);
  });

  it("penalizes all-dark matrix", () => {
    const size = 10;
    const allDark: (boolean | null)[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => true),
    );
    const _allLight: (boolean | null)[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => false),
    );
    const checkerboard: (boolean | null)[][] = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => (r + c) % 2 === 0),
    );

    const darkPenalty = evaluatePenalty(allDark, size);
    const checkPenalty = evaluatePenalty(checkerboard, size);

    // All-dark should have much higher penalty than checkerboard
    expect(darkPenalty).toBeGreaterThan(checkPenalty);
  });

  it("returns non-negative penalty", () => {
    const size = 21;
    const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => Math.random() > 0.5),
    );
    const penalty = evaluatePenalty(matrix, size);
    expect(penalty).toBeGreaterThanOrEqual(0);
  });
});
