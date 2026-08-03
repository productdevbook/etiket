/**
 * ICO → PNG conversion across every DIB variant the converter supports.
 *
 * The PNG encoder uses stored (uncompressed) DEFLATE blocks, so these tests
 * decode the produced PNG and assert on real pixel values rather than merely
 * checking that conversion did not throw.
 */

import { describe, expect, it } from "vitest";
import { icoToPngDataURI } from "../src/renderers/svg/ico";

// ---------------------------------------------------------------------------
// PNG reading (stored-DEFLATE only — sufficient for this project's encoder)
// ---------------------------------------------------------------------------

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface DecodedPNG {
  width: number;
  height: number;
  colorType: number;
  /** RGBA pixel accessor */
  pixel(x: number, y: number): [number, number, number, number];
}

/** Concatenate the IDAT payloads and undo the zlib + stored-DEFLATE framing. */
function inflateStored(zlib: Uint8Array): Uint8Array {
  // Skip the 2-byte zlib header; walk stored blocks until the final one.
  let pos = 2;
  const out: number[] = [];
  for (;;) {
    const isFinal = zlib[pos]! & 1;
    const len = zlib[pos + 1]! | (zlib[pos + 2]! << 8);
    pos += 5;
    for (let i = 0; i < len; i++) out.push(zlib[pos + i]!);
    pos += len;
    if (isFinal) break;
  }
  return new Uint8Array(out);
}

function decodePNG(data: Uint8Array): DecodedPNG {
  expect(Array.from(data.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: number[] = [];

  while (pos < data.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...data.slice(pos + 4, pos + 8));
    const body = data.subarray(pos + 8, pos + 8 + len);

    if (type === "IHDR") {
      width = view.getUint32(pos + 8);
      height = view.getUint32(pos + 12);
      bitDepth = body[8]!;
      colorType = body[9]!;
    } else if (type === "IDAT") {
      for (const b of body) idat.push(b);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }

  expect(bitDepth).toBe(8);
  const raw = inflateStored(new Uint8Array(idat));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * channels + 1; // +1 filter byte per scanline

  return {
    width,
    height,
    colorType,
    pixel(x, y) {
      const row = y * stride;
      expect(raw[row], "only filter type 0 is produced").toBe(0);
      const i = row + 1 + x * channels;
      if (channels === 4) {
        return [raw[i]!, raw[i + 1]!, raw[i + 2]!, raw[i + 3]!];
      }
      return [raw[i]!, raw[i + 1]!, raw[i + 2]!, 255];
    },
  };
}

function convert(ico: Uint8Array): DecodedPNG {
  const uri = icoToPngDataURI(ico);
  expect(uri.startsWith("data:image/png;base64,")).toBe(true);
  return decodePNG(base64ToUint8(uri.slice("data:image/png;base64,".length)));
}

// ---------------------------------------------------------------------------
// ICO construction
// ---------------------------------------------------------------------------

interface DibSpec {
  width: number;
  height: number;
  bpp: number;
  /** BGRA color table entries, for bpp <= 8 */
  palette?: Array<[number, number, number]>;
  /** Pixel values: color index for indexed, [r,g,b,a] otherwise */
  pixels: (x: number, y: number) => number | [number, number, number, number];
  /** AND-mask bit (1 = transparent) */
  mask?: (x: number, y: number) => number;
  compression?: number;
}

/** Build a BMP-DIB ICO image body (BITMAPINFOHEADER + palette + pixels + mask). */
function buildDib(spec: DibSpec): Uint8Array {
  const { width, height, bpp, compression = 0 } = spec;
  const headerSize = 40;
  const paletteEntries = bpp <= 8 ? 1 << bpp : 0;
  const paletteSize = paletteEntries * 4;
  const rowStride = Math.ceil((width * bpp) / 32) * 4;
  const pixelSize = rowStride * height;
  const maskStride = Math.ceil(width / 32) * 4;
  const maskSize = maskStride * height;

  const buf = new Uint8Array(headerSize + paletteSize + pixelSize + maskSize);
  const view = new DataView(buf.buffer);

  view.setUint32(0, headerSize, true);
  view.setInt32(4, width, true);
  view.setInt32(8, height * 2, true); // ICO doubles height (XOR + AND masks)
  view.setUint16(12, 1, true);
  view.setUint16(14, bpp, true);
  view.setUint32(16, compression, true);
  view.setUint32(32, paletteEntries, true); // colorsUsed

  // Palette (BGRA)
  if (spec.palette) {
    for (const [i, [r, g, b]] of spec.palette.entries()) {
      const o = headerSize + i * 4;
      buf[o] = b;
      buf[o + 1] = g;
      buf[o + 2] = r;
      buf[o + 3] = 0;
    }
  }

  // Pixels, bottom-up
  const pixelOff = headerSize + paletteSize;
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // row 0 of the image sits last in the file
    const row = pixelOff + srcY * rowStride;
    for (let x = 0; x < width; x++) {
      const value = spec.pixels(x, y);
      if (bpp === 32) {
        const [r, g, b, a] = value as [number, number, number, number];
        const i = row + x * 4;
        buf[i] = b;
        buf[i + 1] = g;
        buf[i + 2] = r;
        buf[i + 3] = a;
      } else if (bpp === 24) {
        const [r, g, b] = value as [number, number, number, number];
        const i = row + x * 3;
        buf[i] = b;
        buf[i + 1] = g;
        buf[i + 2] = r;
      } else if (bpp === 8) {
        buf[row + x] = value as number;
      } else if (bpp === 4) {
        const idx = value as number;
        const i = row + (x >> 1);
        buf[i] = x & 1 ? (buf[i]! & 0xf0) | (idx & 0x0f) : (buf[i]! & 0x0f) | ((idx & 0x0f) << 4);
      } else {
        const idx = value as number;
        const i = row + (x >> 3);
        if (idx) buf[i] = buf[i]! | (1 << (7 - (x & 7)));
      }
    }
  }

  // AND mask, bottom-up
  if (spec.mask) {
    const maskOff = pixelOff + pixelSize;
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y;
      const row = maskOff + srcY * maskStride;
      for (let x = 0; x < width; x++) {
        if (spec.mask(x, y)) {
          const i = row + (x >> 3);
          buf[i] = buf[i]! | (1 << (7 - (x & 7)));
        }
      }
    }
  }

  return buf;
}

/** Wrap image bodies in an ICO container. */
function buildICO(
  images: Array<{ width: number; height: number; bpp: number; body: Uint8Array }>,
  options: { type?: number; reserved?: number; count?: number } = {},
): Uint8Array {
  const dirSize = 6 + images.length * 16;
  const total = dirSize + images.reduce((sum, img) => sum + img.body.length, 0);
  const buf = new Uint8Array(total);
  const view = new DataView(buf.buffer);

  view.setUint16(0, options.reserved ?? 0, true);
  view.setUint16(2, options.type ?? 1, true);
  view.setUint16(4, options.count ?? images.length, true);

  let offset = dirSize;
  for (const [i, img] of images.entries()) {
    const e = 6 + i * 16;
    buf[e] = img.width < 256 ? img.width : 0;
    buf[e + 1] = img.height < 256 ? img.height : 0;
    view.setUint16(e + 4, 1, true); // planes
    view.setUint16(e + 6, img.bpp, true);
    view.setUint32(e + 8, img.body.length, true);
    view.setUint32(e + 12, offset, true);
    buf.set(img.body, offset);
    offset += img.body.length;
  }

  return buf;
}

function dibICO(spec: DibSpec): Uint8Array {
  return buildICO([
    { width: spec.width, height: spec.height, bpp: spec.bpp, body: buildDib(spec) },
  ]);
}

describe("ICO — 32bpp BGRA", () => {
  it("converts colors and preserves the alpha channel", () => {
    const png = convert(dibICO({ width: 4, height: 4, bpp: 32, pixels: () => [10, 20, 30, 128] }));
    expect(png.width).toBe(4);
    expect(png.height).toBe(4);
    expect(png.pixel(0, 0)).toEqual([10, 20, 30, 128]);
    expect(png.pixel(3, 3)).toEqual([10, 20, 30, 128]);
  });

  it("preserves row order (top-down output from bottom-up BMP)", () => {
    const png = convert(
      dibICO({
        width: 2,
        height: 2,
        bpp: 32,
        pixels: (_x, y) => (y === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255]),
      }),
    );
    expect(png.pixel(0, 0)).toEqual([255, 0, 0, 255]);
    expect(png.pixel(0, 1)).toEqual([0, 0, 255, 255]);
  });

  it("preserves column order", () => {
    const png = convert(
      dibICO({
        width: 2,
        height: 1,
        bpp: 32,
        pixels: (x) => (x === 0 ? [1, 2, 3, 255] : [250, 251, 252, 255]),
      }),
    );
    expect(png.pixel(0, 0)).toEqual([1, 2, 3, 255]);
    expect(png.pixel(1, 0)).toEqual([250, 251, 252, 255]);
  });
});

describe("ICO — 24bpp BGR", () => {
  it("converts colors as fully opaque", () => {
    const png = convert(
      dibICO({ width: 4, height: 4, bpp: 24, pixels: () => [200, 100, 50, 255] }),
    );
    expect(png.pixel(0, 0)).toEqual([200, 100, 50, 255]);
  });

  it("handles 4-byte row padding", () => {
    // width 3 * 3 bytes = 9 → padded to 12
    const png = convert(
      dibICO({
        width: 3,
        height: 2,
        bpp: 24,
        pixels: (x) => [x * 10, x * 20, x * 30, 255],
      }),
    );
    expect(png.pixel(0, 0)).toEqual([0, 0, 0, 255]);
    expect(png.pixel(1, 0)).toEqual([10, 20, 30, 255]);
    expect(png.pixel(2, 0)).toEqual([20, 40, 60, 255]);
  });

  it("applies the AND mask for transparency", () => {
    const png = convert(
      dibICO({
        width: 2,
        height: 2,
        bpp: 24,
        pixels: () => [255, 255, 255, 255],
        mask: (x) => (x === 1 ? 1 : 0),
      }),
    );
    expect(png.pixel(0, 0)[3]).toBe(255);
    expect(png.pixel(1, 0)[3]).toBe(0);
  });
});

describe("ICO — indexed color", () => {
  it("decodes 8bpp via the palette", () => {
    const png = convert(
      dibICO({
        width: 2,
        height: 1,
        bpp: 8,
        palette: [
          [0, 0, 0],
          [255, 0, 0],
          [0, 255, 0],
        ],
        pixels: (x) => x + 1,
      }),
    );
    expect(png.pixel(0, 0)).toEqual([255, 0, 0, 255]);
    expect(png.pixel(1, 0)).toEqual([0, 255, 0, 255]);
  });

  it("decodes 4bpp packed nibbles", () => {
    const png = convert(
      dibICO({
        width: 4,
        height: 1,
        bpp: 4,
        palette: [
          [0, 0, 0],
          [255, 0, 0],
          [0, 255, 0],
          [0, 0, 255],
        ],
        pixels: (x) => x,
      }),
    );
    expect(png.pixel(0, 0)).toEqual([0, 0, 0, 255]);
    expect(png.pixel(1, 0)).toEqual([255, 0, 0, 255]);
    expect(png.pixel(2, 0)).toEqual([0, 255, 0, 255]);
    expect(png.pixel(3, 0)).toEqual([0, 0, 255, 255]);
  });

  it("decodes 1bpp packed bits", () => {
    const png = convert(
      dibICO({
        width: 8,
        height: 1,
        bpp: 1,
        palette: [
          [0, 0, 0],
          [255, 255, 255],
        ],
        pixels: (x) => x % 2,
      }),
    );
    expect(png.pixel(0, 0)).toEqual([0, 0, 0, 255]);
    expect(png.pixel(1, 0)).toEqual([255, 255, 255, 255]);
    expect(png.pixel(6, 0)).toEqual([0, 0, 0, 255]);
    expect(png.pixel(7, 0)).toEqual([255, 255, 255, 255]);
  });

  it("applies the AND mask to indexed images", () => {
    const png = convert(
      dibICO({
        width: 2,
        height: 1,
        bpp: 8,
        palette: [
          [0, 0, 0],
          [10, 20, 30],
        ],
        pixels: () => 1,
        mask: (x) => (x === 0 ? 1 : 0),
      }),
    );
    expect(png.pixel(0, 0)[3]).toBe(0);
    expect(png.pixel(1, 0)).toEqual([10, 20, 30, 255]);
  });
});

describe("ICO — entry selection", () => {
  it("picks the largest entry", () => {
    const small = buildDib({ width: 2, height: 2, bpp: 32, pixels: () => [255, 0, 0, 255] });
    const large = buildDib({ width: 8, height: 8, bpp: 32, pixels: () => [0, 255, 0, 255] });
    const png = convert(
      buildICO([
        { width: 2, height: 2, bpp: 32, body: small },
        { width: 8, height: 8, bpp: 32, body: large },
      ]),
    );
    expect(png.width).toBe(8);
    expect(png.pixel(0, 0)).toEqual([0, 255, 0, 255]);
  });

  it("picks the largest entry regardless of order", () => {
    const large = buildDib({ width: 8, height: 8, bpp: 32, pixels: () => [0, 255, 0, 255] });
    const small = buildDib({ width: 2, height: 2, bpp: 32, pixels: () => [255, 0, 0, 255] });
    const png = convert(
      buildICO([
        { width: 8, height: 8, bpp: 32, body: large },
        { width: 2, height: 2, bpp: 32, body: small },
      ]),
    );
    expect(png.width).toBe(8);
  });

  it("treats a stored dimension of 0 as 256", () => {
    // A 256px entry is stored as 0 in the directory; it must win over a 16px one
    const big = buildDib({ width: 256, height: 256, bpp: 32, pixels: () => [1, 2, 3, 255] });
    const small = buildDib({ width: 16, height: 16, bpp: 32, pixels: () => [9, 9, 9, 255] });
    const png = convert(
      buildICO([
        { width: 16, height: 16, bpp: 32, body: small },
        { width: 256, height: 256, bpp: 32, body: big },
      ]),
    );
    expect(png.width).toBe(256);
  });
});

describe("ICO — PNG-embedded entries", () => {
  it("passes an embedded PNG through unchanged", () => {
    // Build a minimal in-ICO PNG payload; the converter should hand it back as-is
    const inner = new Uint8Array(32);
    inner.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
    for (let i = 8; i < inner.length; i++) inner[i] = i;

    const ico = buildICO([{ width: 32, height: 32, bpp: 32, body: inner }]);
    const uri = icoToPngDataURI(ico);
    const decoded = base64ToUint8(uri.slice("data:image/png;base64,".length));
    expect([...decoded]).toEqual([...inner]);
  });
});

describe("ICO — error handling", () => {
  it("rejects a non-zero reserved field", () => {
    const body = buildDib({ width: 2, height: 2, bpp: 32, pixels: () => [0, 0, 0, 255] });
    const ico = buildICO([{ width: 2, height: 2, bpp: 32, body }], { reserved: 1 });
    expect(() => icoToPngDataURI(ico)).toThrow(/Invalid ICO/);
  });

  it("rejects an unknown image type", () => {
    const body = buildDib({ width: 2, height: 2, bpp: 32, pixels: () => [0, 0, 0, 255] });
    const ico = buildICO([{ width: 2, height: 2, bpp: 32, body }], { type: 7 });
    expect(() => icoToPngDataURI(ico)).toThrow(/Invalid ICO/);
  });

  it("accepts CUR files (type 2)", () => {
    const body = buildDib({ width: 2, height: 2, bpp: 32, pixels: () => [7, 8, 9, 255] });
    const ico = buildICO([{ width: 2, height: 2, bpp: 32, body }], { type: 2 });
    expect(convert(ico).pixel(0, 0)).toEqual([7, 8, 9, 255]);
  });

  it("rejects a zero image count", () => {
    const body = buildDib({ width: 2, height: 2, bpp: 32, pixels: () => [0, 0, 0, 255] });
    const ico = buildICO([{ width: 2, height: 2, bpp: 32, body }], { count: 0 });
    expect(() => icoToPngDataURI(ico)).toThrow(/Invalid ICO/);
  });

  it("rejects unsupported BMP compression", () => {
    const ico = dibICO({
      width: 2,
      height: 2,
      bpp: 32,
      pixels: () => [0, 0, 0, 255],
      compression: 1, // RLE8
    });
    expect(() => icoToPngDataURI(ico)).toThrow(/Unsupported BMP compression/);
  });

  it("accepts BITFIELDS compression (3)", () => {
    const ico = dibICO({
      width: 2,
      height: 2,
      bpp: 32,
      pixels: () => [4, 5, 6, 255],
      compression: 3,
    });
    expect(convert(ico).pixel(0, 0)).toEqual([4, 5, 6, 255]);
  });

  it("rejects an unsupported bit depth", () => {
    const ico = dibICO({ width: 2, height: 2, bpp: 16, pixels: () => [0, 0, 0, 255] });
    expect(() => icoToPngDataURI(ico)).toThrow(/Unsupported BMP bit depth/);
  });
});
