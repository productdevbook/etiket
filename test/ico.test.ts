import { describe, expect, it } from "vitest";
import { icoToPngDataURI } from "../src/renderers/svg/ico";

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Create a 32bpp BMP-based ICO */
function createBmpICO(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): Uint8Array {
  const bpp = 32;
  const pixelDataSize = width * height * 4;
  const andMaskRowStride = Math.ceil(width / 32) * 4;
  const andMaskSize = andMaskRowStride * height;
  const headerSize = 40;
  const imageSize = headerSize + pixelDataSize + andMaskSize;
  const totalSize = 6 + 16 + imageSize;

  const buf = new Uint8Array(totalSize);
  const view = new DataView(buf.buffer);

  // ICO header
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);

  // Directory entry
  buf[6] = width < 256 ? width : 0;
  buf[7] = height < 256 ? height : 0;
  view.setUint16(10, 1, true);
  view.setUint16(12, bpp, true);
  view.setUint32(14, imageSize, true);
  view.setUint32(18, 22, true);

  // BITMAPINFOHEADER
  const imgOff = 22;
  view.setUint32(imgOff, headerSize, true);
  view.setInt32(imgOff + 4, width, true);
  view.setInt32(imgOff + 8, height * 2, true);
  view.setUint16(imgOff + 12, 1, true);
  view.setUint16(imgOff + 14, bpp, true);

  // Pixel data (BGRA, bottom-up)
  const pixelOff = imgOff + headerSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = pixelOff + (y * width + x) * 4;
      buf[i] = b;
      buf[i + 1] = g;
      buf[i + 2] = r;
      buf[i + 3] = a;
    }
  }

  return buf;
}

/** Create a PNG-embedded ICO */
function createPngICO(pngData: Uint8Array): Uint8Array {
  const totalSize = 6 + 16 + pngData.length;
  const buf = new Uint8Array(totalSize);
  const view = new DataView(buf.buffer);

  // ICO header
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);

  // Directory entry
  buf[6] = 16; // width
  buf[7] = 16; // height
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngData.length, true);
  view.setUint32(18, 22, true);

  // Embedded PNG data
  buf.set(pngData, 22);

  return buf;
}

describe("ICO to PNG converter", () => {
  it("converts 32bpp BMP-based ICO to PNG data URI", () => {
    const ico = createBmpICO(4, 4, 255, 0, 0);
    const result = icoToPngDataURI(ico);

    expect(result).toMatch(/^data:image\/png;base64,/);

    // Verify it's a valid PNG by checking the signature
    const b64 = result.replace("data:image/png;base64,", "");
    const png = base64ToUint8(b64);
    // PNG signature: 137 80 78 71 13 10 26 10
    expect(png[0]).toBe(137);
    expect(png[1]).toBe(80);
    expect(png[2]).toBe(78);
    expect(png[3]).toBe(71);
  });

  it("extracts PNG from PNG-embedded ICO", () => {
    // Create a minimal valid PNG to embed
    const fakePng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
    const ico = createPngICO(fakePng);
    const result = icoToPngDataURI(ico);

    expect(result).toMatch(/^data:image\/png;base64,/);

    // The extracted PNG should start with PNG signature
    const b64 = result.replace("data:image/png;base64,", "");
    const extracted = base64ToUint8(b64);
    expect(extracted[0]).toBe(137);
    expect(extracted[1]).toBe(80);
  });

  it("selects the largest entry from multi-entry ICO", () => {
    // Create ICO with 2 entries: 4x4 and 8x8
    const bpp = 32;

    const small = createImageData(4, 4, 255, 0, 0);
    const large = createImageData(8, 8, 0, 255, 0);

    const totalSize = 6 + 16 * 2 + small.length + large.length;
    const buf = new Uint8Array(totalSize);
    const view = new DataView(buf.buffer);

    // Header
    view.setUint16(2, 1, true);
    view.setUint16(4, 2, true);

    // Entry 1: 4x4 (directory entry fields: +0 w, +1 h, +4 planes, +6 bpp, +8 size, +12 offset)
    const entry1Off = 6;
    buf[entry1Off] = 4;
    buf[entry1Off + 1] = 4;
    view.setUint16(entry1Off + 4, 1, true);
    view.setUint16(entry1Off + 6, bpp, true);
    view.setUint32(entry1Off + 8, small.length, true);
    const data1Off = 6 + 16 * 2;
    view.setUint32(entry1Off + 12, data1Off, true);

    // Entry 2: 8x8
    const entry2Off = 6 + 16;
    buf[entry2Off] = 8;
    buf[entry2Off + 1] = 8;
    view.setUint16(entry2Off + 4, 1, true);
    view.setUint16(entry2Off + 6, bpp, true);
    view.setUint32(entry2Off + 8, large.length, true);
    const data2Off = data1Off + small.length;
    view.setUint32(entry2Off + 12, data2Off, true);

    buf.set(small, data1Off);
    buf.set(large, data2Off);

    const result = icoToPngDataURI(buf);
    // Should select 8x8 (larger) and produce PNG with width=8
    const b64 = result.replace("data:image/png;base64,", "");
    const png = base64ToUint8(b64);
    // PNG IHDR starts after signature (8 bytes) + length (4) + type (4) = offset 16
    const pngView = new DataView(png.buffer);
    const pngWidth = pngView.getUint32(16);
    expect(pngWidth).toBe(8);
  });

  it("throws on invalid ICO data", () => {
    expect(() => icoToPngDataURI(new Uint8Array([1, 2, 3, 4, 5, 6]))).toThrow("Invalid ICO");
  });

  it("preserves alpha channel from 32bpp ICO", () => {
    // Create a 1x1 ICO with semi-transparent pixel
    const ico = createBmpICO(1, 1, 255, 0, 0, 128);
    const result = icoToPngDataURI(ico);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });
});

/** Create BMP DIB data (BITMAPINFOHEADER + pixels + AND mask) for a solid color */
function createImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): Uint8Array {
  const headerSize = 40;
  const pixelDataSize = width * height * 4;
  const andMaskRowStride = Math.ceil(width / 32) * 4;
  const andMaskSize = andMaskRowStride * height;
  const totalSize = headerSize + pixelDataSize + andMaskSize;

  const buf = new Uint8Array(totalSize);
  const view = new DataView(buf.buffer);

  view.setUint32(0, headerSize, true);
  view.setInt32(4, width, true);
  view.setInt32(8, height * 2, true);
  view.setUint16(12, 1, true);
  view.setUint16(14, 32, true);

  const pixelOff = headerSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = pixelOff + (y * width + x) * 4;
      buf[i] = b;
      buf[i + 1] = g;
      buf[i + 2] = r;
      buf[i + 3] = 255;
    }
  }

  return buf;
}
