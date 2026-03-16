import { describe, expect, it } from "vitest";
import { generateFormatInfo } from "../src/encoders/qr/format";

describe("QR format info", () => {
  it("generates 15-bit format info", () => {
    const info = generateFormatInfo("M", 0);
    // Format info should be a 15-bit value
    expect(info).toBeGreaterThanOrEqual(0);
    expect(info).toBeLessThan(1 << 15);
  });

  it("generates different info for different masks", () => {
    const infos = new Set<number>();
    for (let m = 0; m < 8; m++) {
      infos.add(generateFormatInfo("M", m));
    }
    expect(infos.size).toBe(8);
  });

  it("generates different info for different EC levels", () => {
    const levels = ["L", "M", "Q", "H"] as const;
    const infos = new Set<number>();
    for (const level of levels) {
      infos.add(generateFormatInfo(level, 0));
    }
    expect(infos.size).toBe(4);
  });

  // Known format info values for EC M, mask 0
  // EC M = 00, mask 0 = 000, data = 00000
  // After BCH and XOR with 0x5412:
  it("generates known value for EC M mask 0", () => {
    const info = generateFormatInfo("M", 0);
    // EC M (00) << 3 | mask 0 (000) = 0b00000 = 0
    // BCH(0) = 0, so raw = 0
    // XOR with 0x5412 = 0x5412 = 21522
    expect(info).toBe(0x5412);
  });
});
