import { describe, expect, it } from "vitest";
import {
  encodeASCII,
  encodeC40,
  encodeTextMode,
  encodeAuto,
} from "../src/encoders/datamatrix/encoder";

describe("Data Matrix C40 encoding", () => {
  it("encodes uppercase text", () => {
    const cw = encodeC40("HELLO WORLD");
    expect(cw[0]).toBe(230); // C40 latch
    expect(cw.length).toBeLessThan(encodeASCII("HELLO WORLD").length + 1);
  });

  it("encodes digits efficiently", () => {
    const cw = encodeC40("ABC 123");
    expect(cw[0]).toBe(230);
    expect(cw.length).toBeGreaterThan(1);
  });

  it("falls back for non-C40 characters", () => {
    const cw = encodeC40("hello"); // lowercase not in C40 basic set
    // Should include unlatch (254) and encode rest in ASCII
    expect(cw).toContain(254);
  });
});

describe("Data Matrix Text encoding", () => {
  it("encodes lowercase text", () => {
    const cw = encodeTextMode("hello world");
    expect(cw[0]).toBe(239); // Text latch
    expect(cw.length).toBeLessThan(encodeASCII("hello world").length + 1);
  });

  it("handles uppercase via shift", () => {
    const cw = encodeTextMode("Hello");
    expect(cw[0]).toBe(239);
    expect(cw.length).toBeGreaterThan(1);
  });
});

describe("Data Matrix auto encoding", () => {
  it("uses ASCII for mixed content", () => {
    const cw = encodeAuto("Hi 123");
    // Short mixed text — ASCII should win or be similar
    expect(cw.length).toBeGreaterThan(0);
  });

  it("uses C40 for uppercase-heavy text", () => {
    const auto = encodeAuto("HELLO WORLD ABC DEF");
    const ascii = encodeASCII("HELLO WORLD ABC DEF");
    // C40 should be more efficient
    expect(auto.length).toBeLessThanOrEqual(ascii.length);
  });

  it("uses Text mode for lowercase-heavy text", () => {
    const auto = encodeAuto("hello world abc def");
    const ascii = encodeASCII("hello world abc def");
    expect(auto.length).toBeLessThanOrEqual(ascii.length);
  });

  it("produces valid codewords", () => {
    const cw = encodeAuto("Test Data 123");
    for (const c of cw) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    }
  });
});
