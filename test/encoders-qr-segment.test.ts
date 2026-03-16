import { describe, expect, it } from "vitest";
import { optimizeSegments } from "../src/encoders/qr/segment";

describe("QR segment optimization", () => {
  it("returns empty for empty string", () => {
    expect(optimizeSegments("", 1)).toEqual([]);
  });

  it("pure numeric → single numeric segment", () => {
    const segs = optimizeSegments("12345678", 1);
    expect(segs.length).toBe(1);
    expect(segs[0]!.mode).toBe("numeric");
    expect(segs[0]!.charCount).toBe(8);
  });

  it("pure alphanumeric → single alphanumeric segment", () => {
    const segs = optimizeSegments("HELLO WORLD", 1);
    expect(segs.length).toBe(1);
    expect(segs[0]!.mode).toBe("alphanumeric");
  });

  it("pure byte → single byte segment", () => {
    const segs = optimizeSegments("hello world", 1);
    expect(segs.length).toBe(1);
    expect(segs[0]!.mode).toBe("byte");
  });

  it("long numeric run after text switches to numeric", () => {
    // 20 digits is long enough to justify a mode switch
    const segs = optimizeSegments("ABC" + "1".repeat(20), 1);
    expect(segs.length).toBe(2);
    expect(segs[0]!.mode).toBe("alphanumeric");
    expect(segs[1]!.mode).toBe("numeric");
  });

  it("short numeric run in alphanumeric stays alphanumeric", () => {
    // "AB12CD" — the "12" is too short to justify switching to numeric
    const segs = optimizeSegments("AB12CD", 1);
    // Should be 1 or 2 segments, but 12 should NOT be a separate numeric segment
    // because alphanumeric can encode digits too
    const modes = segs.map((s) => s.mode);
    expect(modes).not.toContain("numeric");
  });

  it("preserves all characters", () => {
    const text = "ABC123def456";
    const segs = optimizeSegments(text, 1);
    const reconstructed = segs.map((s) => new TextDecoder().decode(s.data as Uint8Array)).join("");
    expect(reconstructed).toBe(text);
  });

  it("works at higher versions", () => {
    const segs = optimizeSegments("12345ABCDE", 20);
    expect(segs.length).toBeGreaterThanOrEqual(1);
  });

  it("all segments have valid modes", () => {
    const segs = optimizeSegments("Hello 123 World!", 5);
    for (const seg of segs) {
      expect(["numeric", "alphanumeric", "byte"]).toContain(seg.mode);
      expect(seg.charCount).toBeGreaterThan(0);
    }
  });
});
