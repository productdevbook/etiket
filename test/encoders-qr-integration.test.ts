import { describe, expect, it } from "vitest";
import { encodeQR } from "../src/index";

describe("QR code integration", () => {
  it("encodes short text (version 1)", () => {
    const matrix = encodeQR("Hello");
    expect(matrix.length).toBe(21); // Version 1 = 21x21
    expect(matrix[0]!.length).toBe(21);
  });

  it("produces square matrix", () => {
    const matrix = encodeQR("Test");
    expect(matrix.length).toBe(matrix[0]!.length);
  });

  it("matrix contains only boolean values", () => {
    const matrix = encodeQR("Data");
    for (const row of matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("has finder patterns in correct corners", () => {
    const matrix = encodeQR("Test");
    const size = matrix.length;

    // Top-left finder: 7x7, outer ring dark
    expect(matrix[0]![0]).toBe(true); // Top-left corner of finder
    expect(matrix[0]![6]).toBe(true); // Top-right corner of finder
    expect(matrix[6]![0]).toBe(true); // Bottom-left corner of finder
    expect(matrix[6]![6]).toBe(true); // Bottom-right corner of finder
    expect(matrix[3]![3]).toBe(true); // Center of finder

    // White row between finder and rest
    expect(matrix[0]![7]).toBe(false); // Separator

    // Top-right finder
    expect(matrix[0]![size - 1]).toBe(true);
    expect(matrix[0]![size - 7]).toBe(true);

    // Bottom-left finder
    expect(matrix[size - 1]![0]).toBe(true);
    expect(matrix[size - 7]![0]).toBe(true);
  });

  it("scales version with data length", () => {
    const short = encodeQR("Hi");
    const long = encodeQR("This is a much longer text that needs more capacity");
    expect(long.length).toBeGreaterThan(short.length);
  });

  it("supports all EC levels", () => {
    for (const ecLevel of ["L", "M", "Q", "H"] as const) {
      const matrix = encodeQR("Test", { ecLevel });
      expect(matrix.length).toBeGreaterThanOrEqual(21); // At least version 1
      expect(matrix[0]!.length).toBe(matrix.length); // Square
    }
  });

  it("supports numeric mode", () => {
    const matrix = encodeQR("1234567890", { mode: "numeric" });
    expect(matrix.length).toBeGreaterThanOrEqual(21);
  });

  it("supports alphanumeric mode", () => {
    const matrix = encodeQR("HELLO WORLD", { mode: "alphanumeric" });
    expect(matrix.length).toBeGreaterThanOrEqual(21);
  });

  it("supports byte mode", () => {
    const matrix = encodeQR("hello world", { mode: "byte" });
    expect(matrix.length).toBeGreaterThanOrEqual(21);
  });

  it("auto mode detection works", () => {
    // Should auto-detect numeric
    const numeric = encodeQR("12345");
    // Should auto-detect alphanumeric
    const alpha = encodeQR("HELLO");
    // Should auto-detect byte
    const byte = encodeQR("hello");

    // All should produce valid matrices
    expect(numeric.length).toBeGreaterThanOrEqual(21);
    expect(alpha.length).toBeGreaterThanOrEqual(21);
    expect(byte.length).toBeGreaterThanOrEqual(21);
  });

  it("supports explicit version selection", () => {
    const matrix = encodeQR("Hi", { version: 5 });
    expect(matrix.length).toBe(5 * 4 + 17); // 37
  });

  it("supports explicit mask selection", () => {
    // Different masks should produce different matrices
    const m0 = encodeQR("Test", { mask: 0 });
    const m1 = encodeQR("Test", { mask: 1 });

    // Same size
    expect(m0.length).toBe(m1.length);

    // But different content (at least some modules differ)
    let diffs = 0;
    for (let r = 0; r < m0.length; r++) {
      for (let c = 0; c < m0[r]!.length; c++) {
        if (m0[r]![c] !== m1[r]![c]) diffs++;
      }
    }
    expect(diffs).toBeGreaterThan(0);
  });

  it("encodes URLs", () => {
    const matrix = encodeQR("https://example.com/path?query=value");
    expect(matrix.length).toBeGreaterThanOrEqual(21);
  });

  it("encodes emoji (multi-byte UTF-8)", () => {
    const matrix = encodeQR("Hello 👋");
    expect(matrix.length).toBeGreaterThanOrEqual(21);
  });

  it("produces larger version for more data", () => {
    const small = encodeQR("A".repeat(10), { ecLevel: "L" });
    const large = encodeQR("A".repeat(200), { ecLevel: "L" });
    expect(large.length).toBeGreaterThan(small.length);
  });

  it("timing patterns present", () => {
    const matrix = encodeQR("Test");
    // Row 6 (timing pattern) should alternate between dark and light
    // Starting from column 8 to size-9
    const size = matrix.length;
    for (let c = 8; c < size - 8; c++) {
      expect(matrix[6]![c]).toBe(c % 2 === 0);
    }
  });
});
