/**
 * QR Code round-trip tests — encode with etiket, decode with jsQR
 * Verifies that generated QR codes are actually scannable
 */

import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { encodeQR } from "../src/encoders/qr/index";

/** Convert a boolean QR matrix to RGBA image data that jsQR can decode */
function matrixToImageData(matrix: boolean[][]): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const size = matrix.length;
  const scale = 4;
  const border = 4;
  const imgSize = (size + border * 2) * scale;
  const data = new Uint8ClampedArray(imgSize * imgSize * 4);

  for (let y = 0; y < imgSize; y++) {
    for (let x = 0; x < imgSize; x++) {
      const mx = Math.floor(x / scale) - border;
      const my = Math.floor(y / scale) - border;
      const isDark = mx >= 0 && mx < size && my >= 0 && my < size && matrix[my]![mx];
      const idx = (y * imgSize + x) * 4;
      const v = isDark ? 0 : 255;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }

  return { data, width: imgSize, height: imgSize };
}

/** Encode text as QR and decode it back, returning decoded string or null */
function roundTrip(text: string, options?: Parameters<typeof encodeQR>[1]): string | null {
  const matrix = encodeQR(text, options);
  const { data, width, height } = matrixToImageData(matrix);
  const result = jsQR(data, width, height);
  return result?.data ?? null;
}

describe("QR round-trip (encode → decode)", () => {
  it("decodes simple alphanumeric text", () => {
    expect(roundTrip("HELLO")).toBe("HELLO");
    expect(roundTrip("HELLO WORLD")).toBe("HELLO WORLD");
    expect(roundTrip("TEST 123")).toBe("TEST 123");
  });

  it("decodes numeric data", () => {
    expect(roundTrip("1234567890")).toBe("1234567890");
    expect(roundTrip("0")).toBe("0");
    expect(roundTrip("00000000")).toBe("00000000");
  });

  it("decodes byte mode (lowercase, special chars)", () => {
    expect(roundTrip("hello world")).toBe("hello world");
    expect(roundTrip("Hello, World!")).toBe("Hello, World!");
    expect(roundTrip("test@example.com")).toBe("test@example.com");
  });

  it("decodes URLs", () => {
    expect(roundTrip("https://example.com")).toBe("https://example.com");
    expect(roundTrip("https://example.com/path?q=test&lang=en")).toBe(
      "https://example.com/path?q=test&lang=en",
    );
  });

  it("decodes WiFi strings", () => {
    const wifi = "WIFI:T:WPA;S:MyNetwork;P:password123;;";
    expect(roundTrip(wifi)).toBe(wifi);
  });

  it("works with all EC levels", () => {
    const text = "EC LEVEL TEST";
    expect(roundTrip(text, { ecLevel: "L" })).toBe(text);
    expect(roundTrip(text, { ecLevel: "M" })).toBe(text);
    expect(roundTrip(text, { ecLevel: "Q" })).toBe(text);
    expect(roundTrip(text, { ecLevel: "H" })).toBe(text);
  });

  it("works with all 8 mask patterns", () => {
    const text = "MASK TEST";
    for (let mask = 0; mask < 8; mask++) {
      expect(roundTrip(text, { mask: mask as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 })).toBe(text);
    }
  });

  it("works with forced versions (1-6)", () => {
    expect(roundTrip("AB", { version: 2 })).toBe("AB");
    expect(roundTrip("VERSION 5 TEST", { version: 5 })).toBe("VERSION 5 TEST");
    expect(roundTrip("VERSION 6 DATA", { version: 6 })).toBe("VERSION 6 DATA");
  });

  it("works with version 7+ (version info encoding)", () => {
    const text = "VERSION 7+ DATA WITH ENOUGH CONTENT TO ENCODE";
    expect(roundTrip(text, { version: 7 })).toBe(text);
    expect(roundTrip(text, { version: 10 })).toBe(text);
    expect(roundTrip(text, { version: 15 })).toBe(text);
  });

  it("decodes longer data (multi-version)", () => {
    const medium = "A".repeat(100);
    expect(roundTrip(medium)).toBe(medium);

    const long = "The quick brown fox jumps over the lazy dog. 1234567890";
    expect(roundTrip(long)).toBe(long);
  });

  it("decodes vCard data", () => {
    const vcard = "BEGIN:VCARD\nVERSION:3.0\nN:Doe;John\nTEL:+1234567890\nEND:VCARD";
    expect(roundTrip(vcard)).toBe(vcard);
  });
});
