/**
 * 2D barcode round-trip tests — encode with etiket, decode with zxing-wasm
 * Verifies that generated 2D barcodes are actually scannable
 */

import { describe, expect, it } from "vitest";
import { readBarcodes } from "zxing-wasm/reader";
import { encodeQR, encodeMicroQR, encodeDataMatrix, encodePDF417, encodeAztec } from "../src/index";

/**
 * Convert a boolean matrix to a grayscale PNG-like ImageData buffer
 * that zxing-wasm can decode. Uses a simple BMP-style approach.
 */
function matrixToImageData(
  matrix: boolean[][],
  scale = 6,
  margin = 6,
): { data: Uint8ClampedArray; width: number; height: number } {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const width = (cols + margin * 2) * scale;
  const height = (rows + margin * 2) * scale;
  const data = new Uint8ClampedArray(width * height * 4);

  // White background
  data.fill(255);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mr = Math.floor(y / scale) - margin;
      const mc = Math.floor(x / scale) - margin;
      if (mr >= 0 && mr < rows && mc >= 0 && mc < cols && matrix[mr]![mc]) {
        const idx = (y * width + x) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      }
    }
  }

  return { data, width, height };
}

/**
 * Decode a boolean matrix using zxing-wasm
 */
async function decodeMatrix(matrix: boolean[][]): Promise<string | null> {
  const { data, width, height } = matrixToImageData(matrix);
  const imageData = { data, width, height };
  const results = await readBarcodes(imageData as ImageData, { tryHarder: true });
  return results.length > 0 ? results[0]!.text : null;
}

describe("QR Code round-trip (zxing-wasm)", () => {
  it("decodes simple text", async () => {
    expect(await decodeMatrix(encodeQR("Hello World"))).toBe("Hello World");
  });

  it("decodes URL", async () => {
    expect(await decodeMatrix(encodeQR("https://example.com"))).toBe("https://example.com");
  });

  it("decodes with EC level H", async () => {
    expect(await decodeMatrix(encodeQR("EC-H TEST", { ecLevel: "H" }))).toBe("EC-H TEST");
  });

  it("decodes version 1", async () => {
    expect(await decodeMatrix(encodeQR("V1", { version: 1 }))).toBe("V1");
  });

  it("decodes version 10", async () => {
    const text = "VERSION 10 WITH ENOUGH DATA";
    expect(await decodeMatrix(encodeQR(text, { version: 10 }))).toBe(text);
  });

  it("decodes version 40", async () => {
    const text = "V40 " + "X".repeat(80);
    expect(await decodeMatrix(encodeQR(text, { version: 40 }))).toBe(text);
  });

  it("decodes all 8 mask patterns", async () => {
    for (let mask = 0; mask < 8; mask++) {
      const result = await decodeMatrix(
        encodeQR("MASK" + mask, { mask: mask as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 }),
      );
      expect(result).toBe("MASK" + mask);
    }
  });
});

describe("Micro QR round-trip (zxing-wasm)", () => {
  it("decodes numeric data", async () => {
    expect(await decodeMatrix(encodeMicroQR("12345"))).toBe("12345");
  });

  it("decodes short numeric", async () => {
    expect(await decodeMatrix(encodeMicroQR("0"))).toBe("0");
  });
});

describe("Data Matrix round-trip (zxing-wasm)", () => {
  it("decodes simple text", async () => {
    expect(await decodeMatrix(encodeDataMatrix("Hello World"))).toBe("Hello World");
  });

  it("decodes numeric data", async () => {
    expect(await decodeMatrix(encodeDataMatrix("1234567890"))).toBe("1234567890");
  });

  it("decodes URL", async () => {
    expect(await decodeMatrix(encodeDataMatrix("https://example.com"))).toBe("https://example.com");
  });

  it("decodes special characters", async () => {
    expect(await decodeMatrix(encodeDataMatrix("test@example.com"))).toBe("test@example.com");
  });
});

describe("PDF417 round-trip (zxing-wasm)", () => {
  it("decodes simple text", async () => {
    const matrix = encodePDF417("Hello World");
    expect(await decodeMatrix(matrix.matrix)).toBe("Hello World");
  });

  it("decodes numeric data", async () => {
    const matrix = encodePDF417("1234567890");
    expect(await decodeMatrix(matrix.matrix)).toBe("1234567890");
  });

  it("decodes longer text", async () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const matrix = encodePDF417(text);
    expect(await decodeMatrix(matrix.matrix)).toBe(text);
  });
});

describe("Aztec round-trip (zxing-wasm)", () => {
  it("decodes simple text", async () => {
    expect(await decodeMatrix(encodeAztec("Hello World"))).toBe("Hello World");
  });

  it("decodes numeric data", async () => {
    expect(await decodeMatrix(encodeAztec("1234567890"))).toBe("1234567890");
  });

  it("decodes URL", async () => {
    expect(await decodeMatrix(encodeAztec("https://example.com"))).toBe("https://example.com");
  });
});
