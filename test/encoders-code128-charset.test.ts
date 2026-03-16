import { describe, expect, it } from "vitest";
import { encodeCode128 } from "../src/encoders/code128";

describe("encodeCode128 — forced charset selection", () => {
  // --- Charset A ---

  it("charset A encodes uppercase letters and digits", () => {
    const bars = encodeCode128("HELLO123", { charset: "A" });
    expect(bars.length).toBeGreaterThan(0);
    expect(Array.isArray(bars)).toBe(true);
  });

  it("charset A encodes control characters", () => {
    // \x01 = SOH, \x02 = STX — both valid in Code 128A
    const bars = encodeCode128("\x01\x02\x03", { charset: "A" });
    expect(bars.length).toBeGreaterThan(0);
  });

  it("charset A throws on lowercase letters", () => {
    expect(() => encodeCode128("hello", { charset: "A" })).toThrow("not encodable in Code 128A");
  });

  it("charset A throws on characters beyond ASCII 95", () => {
    // '`' is ASCII 96, not in charset A range
    expect(() => encodeCode128("`", { charset: "A" })).toThrow("not encodable in Code 128A");
  });

  // --- Charset B ---

  it("charset B encodes printable ASCII (lowercase and uppercase)", () => {
    const bars = encodeCode128("Hello World!", { charset: "B" });
    expect(bars.length).toBeGreaterThan(0);
  });

  it("charset B encodes all printable ASCII characters", () => {
    const bars = encodeCode128("AaBb12!@#$%^&*()", { charset: "B" });
    expect(bars.length).toBeGreaterThan(0);
  });

  it("charset B throws on control characters", () => {
    expect(() => encodeCode128("\x01Hello", { charset: "B" })).toThrow(
      "not encodable in Code 128B",
    );
  });

  // --- Charset C ---

  it("charset C encodes even-length digit strings", () => {
    const bars = encodeCode128("123456", { charset: "C" });
    expect(bars.length).toBeGreaterThan(0);
  });

  it("charset C encodes digit pairs 00-99", () => {
    const bars = encodeCode128("00990102", { charset: "C" });
    expect(bars.length).toBeGreaterThan(0);
  });

  it("charset C throws on odd-length digit strings", () => {
    expect(() => encodeCode128("12345", { charset: "C" })).toThrow("even number of digits");
  });

  it("charset C throws on non-digit characters", () => {
    expect(() => encodeCode128("12AB56", { charset: "C" })).toThrow("not encodable in Code 128C");
  });

  it("charset C throws on letters", () => {
    expect(() => encodeCode128("Hello", { charset: "C" })).toThrow("not encodable in Code 128C");
  });

  // --- Auto mode (default) ---

  it("auto mode still works as before (no options)", () => {
    const bars = encodeCode128("Hello World");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("auto mode still works as before (explicit auto)", () => {
    const bars = encodeCode128("Hello World", { charset: "auto" });
    expect(bars.length).toBeGreaterThan(0);
  });

  it("auto mode produces same result as no options", () => {
    const noOpts = encodeCode128("Hello World");
    const autoOpts = encodeCode128("Hello World", { charset: "auto" });
    expect(noOpts).toEqual(autoOpts);
  });

  // --- Different charsets produce different patterns ---

  it("different charsets produce different bar patterns for same input", () => {
    // "AB" is encodable in both A and B but with different start codes
    const barsA = encodeCode128("AB", { charset: "A" });
    const barsB = encodeCode128("AB", { charset: "B" });
    // They should differ because they use different start codes (START_A vs START_B),
    // which leads to different checksums
    expect(barsA).not.toEqual(barsB);
  });

  it("charset C is more compact for pure digit strings", () => {
    // Code 128C encodes digit pairs, so it should produce fewer bars
    const barsB = encodeCode128("12345678", { charset: "B" });
    const barsC = encodeCode128("12345678", { charset: "C" });
    expect(barsC.length).toBeLessThan(barsB.length);
  });

  // --- Deterministic output ---

  it("same input and charset produce same output", () => {
    const bars1 = encodeCode128("TEST", { charset: "A" });
    const bars2 = encodeCode128("TEST", { charset: "A" });
    expect(bars1).toEqual(bars2);
  });

  // --- Bar width validation ---

  it("all forced charset outputs produce valid bar widths", () => {
    const charsets = [
      { charset: "A" as const, text: "HELLO" },
      { charset: "B" as const, text: "Hello" },
      { charset: "C" as const, text: "123456" },
    ];

    for (const { charset, text } of charsets) {
      const bars = encodeCode128(text, { charset });
      for (const w of bars) {
        expect(w).toBeGreaterThanOrEqual(1);
        expect(w).toBeLessThanOrEqual(4);
        expect(Number.isInteger(w)).toBe(true);
      }
    }
  });
});
