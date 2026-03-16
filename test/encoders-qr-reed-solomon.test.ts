import { describe, expect, it } from "vitest";
import {
  gfMultiply,
  generateECCodewords,
  addErrorCorrection,
} from "../src/encoders/qr/reed-solomon";

describe("GF(256) arithmetic", () => {
  it("multiply by 0 returns 0", () => {
    expect(gfMultiply(0, 0)).toBe(0);
    expect(gfMultiply(123, 0)).toBe(0);
    expect(gfMultiply(0, 123)).toBe(0);
  });

  it("multiply by 1 returns same value", () => {
    expect(gfMultiply(1, 1)).toBe(1);
    expect(gfMultiply(100, 1)).toBe(100);
    expect(gfMultiply(1, 200)).toBe(200);
  });

  it("multiplication is commutative", () => {
    expect(gfMultiply(3, 7)).toBe(gfMultiply(7, 3));
    expect(gfMultiply(100, 200)).toBe(gfMultiply(200, 100));
  });

  it("results are in range 0-255", () => {
    for (let a = 1; a < 256; a += 17) {
      for (let b = 1; b < 256; b += 19) {
        const result = gfMultiply(a, b);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe("Reed-Solomon EC generation", () => {
  it("generates correct number of EC codewords", () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    const ec = generateECCodewords(data, 10);
    expect(ec.length).toBe(10);
  });

  it("EC codewords are in range 0-255", () => {
    const data = [1, 2, 3, 4, 5];
    const ec = generateECCodewords(data, 7);
    for (const byte of ec) {
      expect(byte).toBeGreaterThanOrEqual(0);
      expect(byte).toBeLessThanOrEqual(255);
    }
  });

  it("different data produces different EC", () => {
    const ec1 = generateECCodewords([1, 2, 3], 5);
    const ec2 = generateECCodewords([4, 5, 6], 5);
    expect(ec1).not.toEqual(ec2);
  });
});

describe("Error correction with interleaving", () => {
  it("produces correct total length for single block", () => {
    const data = Array.from({ length: 16 }, () => 0).map((_, i) => i);
    const result = addErrorCorrection(data, 10, 1, 16, 0, 0);
    // 16 data + 10 EC = 26 total
    expect(result.length).toBe(26);
  });

  it("produces correct total length for multiple blocks", () => {
    const data = Array.from({ length: 64 }, () => 0).map((_, i) => i % 256);
    // 2 blocks of 32 each, 18 EC per block
    const result = addErrorCorrection(data, 18, 2, 32, 0, 0);
    // 64 data + 2*18 EC = 100 total
    expect(result.length).toBe(100);
  });

  it("handles two group types", () => {
    const data = Array.from({ length: 86 }, () => 0).map((_, i) => i % 256);
    // 2 blocks of 43, 0 group 2 blocks, 24 EC per block
    const result = addErrorCorrection(data, 24, 2, 43, 0, 0);
    expect(result.length).toBe(86 + 2 * 24);
  });

  it("all output bytes are in range 0-255", () => {
    const data = Array.from({ length: 44 }, () => 0).map((_, i) => (i * 7) % 256);
    const result = addErrorCorrection(data, 26, 1, 44, 0, 0);
    for (const byte of result) {
      expect(byte).toBeGreaterThanOrEqual(0);
      expect(byte).toBeLessThanOrEqual(255);
    }
  });
});
