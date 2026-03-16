import { describe, expect, it } from "vitest";
import { encodeKanjiData, unicodeToShiftJIS } from "../src/encoders/qr/mode";
import { encodeQR } from "../src/encoders/qr/index";

describe("Kanji encoding", () => {
  it("encodeKanjiData produces 13 bits per character", () => {
    // SJIS value 0x8140 (first valid)
    const bits = encodeKanjiData([0x8140]);
    expect(bits.length).toBe(13);
  });

  it("encodeKanjiData produces correct bits for known value", () => {
    // 0x8140: adjusted = 0, hi=0, lo=0, value = 0*0xC0 + 0 = 0
    const bits = encodeKanjiData([0x8140]);
    expect(bits.every((b) => b === 0)).toBe(true); // all zeros for value 0
  });

  it("unicodeToShiftJIS converts CJK characters", () => {
    // U+3042 (あ) should map to SJIS range
    const values = unicodeToShiftJIS("あ");
    expect(values.length).toBe(1);
    expect(values[0]).toBeGreaterThanOrEqual(0x8140);
  });

  it("unicodeToShiftJIS throws for non-CJK", () => {
    expect(() => unicodeToShiftJIS("A")).toThrow();
  });

  it("encodeQR with kanji mode produces valid matrix", () => {
    // Use CJK character that falls in supported range
    const matrix = encodeQR("あいう", { mode: "kanji" });
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix[0]!.length).toBe(matrix.length);
  });

  it("kanji matrix contains only booleans", () => {
    const matrix = encodeQR("あいう", { mode: "kanji" });
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("kanji mode produces different output than byte mode", () => {
    const kanji = encodeQR("あいう", { mode: "kanji" });
    const byte = encodeQR("あいう", { mode: "byte" });
    // Size might differ (kanji is more compact for CJK)
    const kanjiStr = kanji.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    const byteStr = byte.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("");
    expect(kanjiStr).not.toBe(byteStr);
  });
});
