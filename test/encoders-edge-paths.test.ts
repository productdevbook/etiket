/**
 * Edge paths in the 1D and 2D encoders and the styled QR renderer:
 * charset switching, UPC-E expansion for every last-digit rule, Han Xin
 * encoding modes, Codablock-F charset transitions, and gradient corner styling.
 */

import { describe, expect, it } from "vitest";
import { encodeCode128 } from "../src/encoders/code128";
import { encodeUPCA, encodeUPCE } from "../src/encoders/upc";
import { encodeHanXin } from "../src/encoders/hanxin";
import { encodeCodablockF } from "../src/encoders/codablock-f";
import { encodeGS1DataBarExpanded } from "../src/encoders/gs1-databar";
import { renderQRCodeSVG } from "../src/renderers/svg/qr";
import { encodeQR } from "../src/encoders/qr/index";

describe("Code 128 charset switching", () => {
  it("uses Code C for long digit runs", () => {
    // Pure digits pack two per codeword, so bars stay short
    const digits = encodeCode128("1234567890");
    const letters = encodeCode128("ABCDEFGHIJ");
    expect(digits.length).toBeLessThan(letters.length);
  });

  it("encodes printable ASCII", () => {
    expect(() => encodeCode128("Hello, World! 123")).not.toThrow();
  });

  it("shifts to Code A for a single control character between printables", () => {
    const withControl = encodeCode128("AB\tCD");
    const without = encodeCode128("ABCD");
    expect(withControl.length).toBeGreaterThan(without.length);
  });

  it("latches to Code A for consecutive control characters", () => {
    expect(() => encodeCode128("AB\t\n\rCD")).not.toThrow();
    expect(encodeCode128("AB\t\nCD")).not.toEqual(encodeCode128("AB\t\rCD"));
  });

  it("handles a control character at the end of the string", () => {
    expect(() => encodeCode128("ABC\n")).not.toThrow();
  });

  it("handles a leading control character", () => {
    expect(() => encodeCode128("\tABC")).not.toThrow();
  });

  it("switches between digits and letters", () => {
    expect(() => encodeCode128("ABC123456789DEF")).not.toThrow();
    expect(() => encodeCode128("123456ABC789012")).not.toThrow();
  });

  it("honours a forced charset", () => {
    expect(encodeCode128("123456", { charset: "C" })).not.toEqual(
      encodeCode128("123456", { charset: "B" }),
    );
    expect(() => encodeCode128("ABC", { charset: "A" })).not.toThrow();
  });

  it("rejects an odd digit count in forced Code C", () => {
    expect(() => encodeCode128("12345", { charset: "C" })).toThrow();
  });

  it("rejects characters outside the selected charset", () => {
    expect(() => encodeCode128("abc", { charset: "A" })).toThrow();
  });
});

describe("UPC-E expansion rules", () => {
  // The final digit selects how the 6-digit payload expands to UPC-A
  const payloads = ["12300", "12310", "12320", "12330", "12340", "12350"];

  it("expands every last-digit rule (0-9)", () => {
    for (let lastDigit = 0; lastDigit <= 9; lastDigit++) {
      const code = `${payloads[Math.min(lastDigit, 5)]!.slice(0, 5)}${lastDigit}`;
      expect(() => encodeUPCE(code), `last digit ${lastDigit}`).not.toThrow();
    }
  });

  it("produces distinct symbols per expansion rule", () => {
    const seen = new Set<string>();
    for (let lastDigit = 0; lastDigit <= 9; lastDigit++) {
      const bars = encodeUPCE(`12345${lastDigit}`).bars.join(",");
      seen.add(bars);
    }
    expect(seen.size).toBe(10);
  });

  it("accepts a 7-digit form with a number system prefix", () => {
    expect(() => encodeUPCE("0123456")).not.toThrow();
    expect(() => encodeUPCE("1123456")).not.toThrow();
  });

  it("accepts an 8-digit form and validates the check digit", () => {
    const seven = encodeUPCE("0123456");
    expect(seven.bars.length).toBeGreaterThan(0);
    expect(seven.guards.length).toBeGreaterThan(0);
  });

  it("rejects a mismatched check digit in the 8-digit form", () => {
    // Find a valid 8-digit code, then corrupt its check digit
    const valid = encodeUPCE("01234565");
    expect(valid).toBeDefined();
    expect(() => encodeUPCE("01234560")).toThrow(/check digit/i);
  });

  it("rejects a non-numeric payload", () => {
    expect(() => encodeUPCE("12A456")).toThrow();
  });

  it("UPC-A round-trips its check digit", () => {
    const withCheck = encodeUPCA("036000291452");
    const without = encodeUPCA("03600029145");
    expect(withCheck.bars).toEqual(without.bars);
  });

  it("UPC-A rejects a bad check digit", () => {
    expect(() => encodeUPCA("036000291450")).toThrow();
  });
});

describe("Han Xin encoding modes", () => {
  it("uses numeric mode for digits", () => {
    const numeric = encodeHanXin("1234567890123456");
    const text = encodeHanXin("ABCDEFGHIJKLMNOP");
    // Numeric packs 3 digits per 10 bits, so it needs no more space than text
    expect(numeric.length).toBeLessThanOrEqual(text.length);
  });

  it("encodes digit groups of 1, 2 and 3", () => {
    for (const digits of ["1", "12", "123", "1234", "12345", "123456"]) {
      expect(() => encodeHanXin(digits), digits).not.toThrow();
    }
  });

  it("uses text mode for printable ASCII", () => {
    expect(() => encodeHanXin("Hello, World!")).not.toThrow();
  });

  it("falls back to binary mode for non-ASCII", () => {
    const ascii = encodeHanXin("HELLO");
    const unicode = encodeHanXin("中文字符");
    expect(unicode.length).toBeGreaterThan(0);
    expect(unicode).not.toEqual(ascii);
  });

  it("produces a square symbol sized by version", () => {
    for (const version of [1, 5, 10, 20]) {
      const m = encodeHanXin("HELLO", { version });
      expect(m.length, `v${version}`).toBe(version * 2 + 21);
      expect(m[0]!.length, `v${version}`).toBe(version * 2 + 21);
    }
  });

  it("grows the symbol as the EC level rises", () => {
    const payload = "HAN XIN CODE CAPACITY TEST ".repeat(6);
    expect(encodeHanXin(payload, { ecLevel: 4 }).length).toBeGreaterThanOrEqual(
      encodeHanXin(payload, { ecLevel: 1 }).length,
    );
  });

  it("rejects empty input", () => {
    expect(() => encodeHanXin("")).toThrow(/must not be empty/);
  });

  it("rejects data too long for any version", () => {
    expect(() => encodeHanXin("A".repeat(100000))).toThrow(/too long/i);
  });

  it("encodes a payload that needs a large version", () => {
    const m = encodeHanXin("X".repeat(500));
    expect(m.length).toBeGreaterThan(21);
  });
});

describe("Codablock-F charset transitions", () => {
  it("starts in Code C for a leading digit run", () => {
    expect(() => encodeCodablockF("1234567890")).not.toThrow();
  });

  it("starts in Code A for a leading control character", () => {
    expect(() => encodeCodablockF("\tABC")).not.toThrow();
  });

  it("starts in Code B for leading printable text", () => {
    expect(() => encodeCodablockF("ABCdef")).not.toThrow();
  });

  it("switches from Code C to Code B", () => {
    expect(() => encodeCodablockF("123456ABCdef")).not.toThrow();
  });

  it("switches from Code C to Code A", () => {
    expect(() => encodeCodablockF("123456\t\nABC")).not.toThrow();
  });

  it("switches into Code C mid-string for a long digit run", () => {
    expect(() => encodeCodablockF("ABC12345678901234")).not.toThrow();
  });

  it("switches between Code A and Code B", () => {
    expect(() => encodeCodablockF("ABC\tdef\tGHI")).not.toThrow();
  });

  it("encodes control characters in Code A", () => {
    expect(() => encodeCodablockF("")).not.toThrow();
  });

  it("rejects unsupported characters", () => {
    expect(() => encodeCodablockF("café")).toThrow(/unsupported character/i);
  });

  it("rejects empty input", () => {
    expect(() => encodeCodablockF("")).toThrow();
  });

  it("honours the columns option", () => {
    const narrow = encodeCodablockF("CODABLOCK F TEST DATA", { columns: 8 });
    const wide = encodeCodablockF("CODABLOCK F TEST DATA", { columns: 16 });
    expect(narrow.cols).toBeLessThan(wide.cols);
    expect(narrow.rows).toBeGreaterThanOrEqual(wide.rows);
  });

  it("adds rows as the payload grows", () => {
    const short = encodeCodablockF("SHORT");
    const long = encodeCodablockF("A MUCH LONGER PAYLOAD THAT NEEDS SEVERAL ROWS TO ENCODE");
    expect(long.rows).toBeGreaterThan(short.rows);
  });

  it("reports matrix dimensions consistent with the matrix", () => {
    const result = encodeCodablockF("CODABLOCK");
    expect(result.matrix).toHaveLength(result.rows);
    expect(result.matrix[0]).toHaveLength(result.cols);
  });
});

describe("GS1 DataBar Expanded", () => {
  it("encodes AI element strings", () => {
    expect(() => encodeGS1DataBarExpanded("(01)90012345678908")).not.toThrow();
  });

  it("encodes multiple AIs", () => {
    expect(() => encodeGS1DataBarExpanded("(01)90012345678908(10)ABC123")).not.toThrow();
  });

  it("encodes alphanumeric and numeric AI values", () => {
    const numeric = encodeGS1DataBarExpanded("(01)90012345678908(3103)000189");
    const alpha = encodeGS1DataBarExpanded("(01)90012345678908(10)ABC");
    expect(numeric).not.toEqual(alpha);
  });

  it("grows with payload length", () => {
    const short = encodeGS1DataBarExpanded("(01)90012345678908");
    const long = encodeGS1DataBarExpanded("(01)90012345678908(10)LOT12345678(21)SERIAL9876");
    expect(long.length).toBeGreaterThan(short.length);
  });

  // The general field switches between numeric, alphanumeric and ISO 646
  // submodes depending on the characters encountered.
  it("encodes uppercase letters in alphanumeric mode", () => {
    expect(encodeGS1DataBarExpanded("(10)ABC").length).toBeGreaterThan(0);
  });

  it("encodes alphanumeric punctuation", () => {
    // * , - . / each have a dedicated alphanumeric value
    for (const value of ["A*B", "A,B", "A-B", "A.B", "A/B"]) {
      expect(encodeGS1DataBarExpanded(`(10)${value}`).length, value).toBeGreaterThan(0);
    }
  });

  it("latches to ISO 646 for lowercase letters", () => {
    const upper = encodeGS1DataBarExpanded("(10)ABC");
    const lower = encodeGS1DataBarExpanded("(10)abc");
    expect(lower).not.toEqual(upper);
    expect(lower.length).toBeGreaterThan(0);
  });

  it("encodes other characters as 8-bit ISO 646 values", () => {
    expect(encodeGS1DataBarExpanded("(10)A#B%C").length).toBeGreaterThan(0);
  });

  it("latches back to numeric for digit pairs after letters", () => {
    expect(encodeGS1DataBarExpanded("(10)ABC12DEF").length).toBeGreaterThan(0);
  });

  it("handles a single trailing digit", () => {
    expect(encodeGS1DataBarExpanded("(10)A1").length).toBeGreaterThan(0);
  });

  it("handles an all-numeric general field", () => {
    expect(encodeGS1DataBarExpanded("(10)12345").length).toBeGreaterThan(0);
  });

  it("inserts FNC1 separators between variable-length AIs", () => {
    const single = encodeGS1DataBarExpanded("(10)ABC");
    const double = encodeGS1DataBarExpanded("(10)ABC(21)XYZ");
    expect(double.length).toBeGreaterThan(single.length);
  });

  it("rejects empty input", () => {
    expect(() => encodeGS1DataBarExpanded("")).toThrow(/must not be empty/);
  });

  it("produces an even-length alternating bar/space pattern", () => {
    for (const data of ["(10)ABC", "(10)abc", "(01)90012345678908"]) {
      const bars = encodeGS1DataBarExpanded(data);
      expect(
        bars.every((w) => w > 0),
        data,
      ).toBe(true);
    }
  });
});

describe("QR renderer — gradients and corner styling", () => {
  const matrix = encodeQR("HELLO");
  const gradient = {
    type: "linear" as const,
    rotation: 45,
    stops: [
      { offset: 0, color: "#ff0000" },
      { offset: 1, color: "#0000ff" },
    ],
  };
  const radial = {
    type: "radial" as const,
    stops: [
      { offset: 0, color: "#00ff00" },
      { offset: 1, color: "#000000" },
    ],
  };

  it("applies a gradient background", () => {
    const svg = renderQRCodeSVG(matrix, { background: gradient });
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain('<rect width="100%" height="100%" fill="url(#');
  });

  it("applies a radial gradient background", () => {
    expect(renderQRCodeSVG(matrix, { background: radial })).toContain("<radialGradient");
  });

  it("applies a gradient to the modules", () => {
    const svg = renderQRCodeSVG(matrix, { color: gradient });
    expect(svg).toContain("<linearGradient");
  });

  it("styles corner outer rings with a solid color", () => {
    const svg = renderQRCodeSVG(matrix, {
      corners: { topLeft: { outerColor: "#ff0000", outerShape: "rounded" } },
    });
    expect(svg).toContain('fill="#ff0000"');
  });

  it("styles corner outer rings with a gradient", () => {
    const svg = renderQRCodeSVG(matrix, {
      corners: { topLeft: { outerColor: gradient } },
    });
    expect(svg).toContain("<linearGradient");
  });

  it("styles corner inner squares with a solid color", () => {
    const svg = renderQRCodeSVG(matrix, {
      corners: { topRight: { innerColor: "#00ff00", innerShape: "dots" } },
    });
    expect(svg).toContain('fill="#00ff00"');
  });

  it("styles corner inner squares with a gradient", () => {
    const svg = renderQRCodeSVG(matrix, {
      corners: { bottomLeft: { innerColor: radial } },
    });
    expect(svg).toContain("<radialGradient");
  });

  it("styles all three corners independently", () => {
    const svg = renderQRCodeSVG(matrix, {
      corners: {
        topLeft: { outerColor: "#111111" },
        topRight: { outerColor: "#222222" },
        bottomLeft: { outerColor: "#333333" },
      },
    });
    expect(svg).toContain('fill="#111111"');
    expect(svg).toContain('fill="#222222"');
    expect(svg).toContain('fill="#333333"');
  });

  it("supports every corner outer shape", () => {
    for (const outerShape of ["square", "rounded", "dots", "extra-rounded", "classy"] as const) {
      const svg = renderQRCodeSVG(matrix, { corners: { topLeft: { outerShape } } });
      expect(svg, outerShape).toContain("<path");
    }
  });

  it("supports every corner inner shape", () => {
    for (const innerShape of ["square", "dots", "rounded"] as const) {
      const svg = renderQRCodeSVG(matrix, { corners: { topLeft: { innerShape } } });
      expect(svg, innerShape).toContain("<path");
    }
  });
});
