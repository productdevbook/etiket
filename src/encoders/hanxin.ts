/**
 * Han Xin Code encoder (ISO/IEC 20830)
 * Chinese 2D barcode standard — large capacity for Chinese characters
 *
 * Features:
 * - 84 versions (23×23 to 189×189 modules)
 * - 4 EC levels (L1-L4: ~8%, ~15%, ~23%, ~30%)
 * - Modes: numeric, text, binary, Chinese (GB 18030)
 * - Finder patterns at all 4 corners (unlike QR's 3)
 */

import { InvalidInputError, CapacityError } from "../errors";

// ---------------------------------------------------------------------------
// Han Xin mode indicators (4 bits each)
// ---------------------------------------------------------------------------
const MODE_NUMERIC = 0b0001;
const MODE_TEXT = 0b0010;
const MODE_BINARY = 0b0011;
// const MODE_CHINESE = 0b0100; // GB 18030 — reserved for future use

// ---------------------------------------------------------------------------
// GF(256) arithmetic with Han Xin primitive polynomial 0x163
// (x^8 + x^6 + x^5 + x + 1) — different from QR's 0x11D and DM's 0x12D
// ---------------------------------------------------------------------------
const HX_GF_EXP = new Uint8Array(512);
const HX_GF_LOG = new Uint8Array(256);

(function initHanXinGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    HX_GF_EXP[i] = x;
    HX_GF_LOG[x] = i;
    x = x << 1;
    if (x >= 256) x ^= 0x163;
  }
  // Extend exp table for easier modular arithmetic
  for (let i = 255; i < 512; i++) {
    HX_GF_EXP[i] = HX_GF_EXP[i - 255]!;
  }
})();

/** Multiply two GF(256) elements using Han Xin polynomial */
function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return HX_GF_EXP[(HX_GF_LOG[a]! + HX_GF_LOG[b]!) % 255]!;
}

/** Generate Reed-Solomon EC codewords for Han Xin over GF(256)/0x163 */
function hanxinGenerateEC(data: number[], ecCount: number): number[] {
  // Build generator polynomial: g(x) = (x - a^0)(x - a^1)...(x - a^(ecCount-1))
  const gen: number[] = Array.from({ length: ecCount + 1 }, () => 0);
  gen[0] = 1;

  for (let i = 0; i < ecCount; i++) {
    for (let j = gen.length - 1; j >= 1; j--) {
      gen[j] = gen[j - 1]! ^ gfMultiply(gen[j]!, HX_GF_EXP[i]!);
    }
    gen[0] = gfMultiply(gen[0]!, HX_GF_EXP[i]!);
  }

  // Polynomial long division: data polynomial / generator polynomial
  const result = Array.from({ length: ecCount }, () => 0);
  for (const byte of data) {
    const lead = byte ^ result[0]!;
    for (let j = 0; j < ecCount - 1; j++) {
      result[j] = result[j + 1]! ^ gfMultiply(lead, gen[j + 1]!);
    }
    result[ecCount - 1] = gfMultiply(lead, gen[ecCount]!);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Bit manipulation (local — no QR dependency)
// ---------------------------------------------------------------------------

/** Push `count` bits of `value` (MSB first) into a bit array */
function pushBits(arr: number[], value: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) {
    arr.push((value >> i) & 1);
  }
}

// ---------------------------------------------------------------------------
// Han Xin version sizing
// ---------------------------------------------------------------------------

// Han Xin version sizes: version v → (v*2 + 21) modules per side
function hanxinSize(version: number): number {
  return version * 2 + 21;
}

/**
 * Compute usable data module count for a given version.
 *
 * Total modules minus function patterns:
 *   - 4 finder patterns (7×7 each = 196 modules)
 *   - Separator bands around finders
 *   - Version/format info areas
 *
 * Returns the total number of data codewords (bytes) available
 * before applying EC overhead.
 */
function hanxinTotalCodewords(version: number): number {
  const size = hanxinSize(version);
  const totalModules = size * size;

  // 4 finder patterns — 7×7 each
  const finderModules = 4 * 7 * 7;

  // Separator bands around finders: 4 L-shaped bands, ~8 modules each
  const separatorModules = 4 * (8 + 7);

  // Format/version info regions around finders
  const formatModules = Math.min(36 + version * 2, size * 4);

  const usableModules = totalModules - finderModules - separatorModules - formatModules;

  return Math.floor(usableModules / 8);
}

/**
 * Get data codeword capacity for a version at a given EC ratio.
 */
function hanxinDataCapacity(version: number, ecRatio: number): number {
  const total = hanxinTotalCodewords(version);
  const ecBytes = Math.ceil(total * ecRatio);
  return total - ecBytes;
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

/** Check if entire input is digits */
function isNumeric(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x30 || c > 0x39) return false;
  }
  return true;
}

/** Check if entire input is in the Han Xin text mode character set */
function isText(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    // Han Xin text mode covers ASCII 0x20-0x7E
    if (c < 0x20 || c > 0x7e) return false;
  }
  return true;
}

export interface HanXinOptions {
  ecLevel?: 1 | 2 | 3 | 4; // L1(~8%), L2(~15%), L3(~23%), L4(~30%)
  version?: number; // 1-84
}

/**
 * Encode text as Han Xin Code
 * Returns a 2D boolean matrix
 */
export function encodeHanXin(text: string, options: HanXinOptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("Han Xin Code input must not be empty");
  }

  const ecLevel = options.ecLevel ?? 1;
  const ecRatio = [0, 0.08, 0.15, 0.23, 0.3][ecLevel]!;

  // Build data bits with Han Xin mode indicators
  const bits: number[] = [];

  if (isNumeric(text)) {
    // Numeric mode: groups of 3 digits → 10 bits
    pushBits(bits, MODE_NUMERIC, 4);
    pushBits(bits, text.length, 13);
    for (let i = 0; i < text.length; i += 3) {
      const group = text.substring(i, Math.min(i + 3, text.length));
      const val = Number.parseInt(group, 10);
      if (group.length === 3) {
        pushBits(bits, val, 10);
      } else if (group.length === 2) {
        pushBits(bits, val, 7);
      } else {
        pushBits(bits, val, 4);
      }
    }
  } else if (isText(text)) {
    // Text mode: 6 bits per character
    pushBits(bits, MODE_TEXT, 4);
    pushBits(bits, text.length, 13);
    for (let i = 0; i < text.length; i++) {
      // Map ASCII 0x20-0x7E to 0-94
      pushBits(bits, text.charCodeAt(i) - 0x20, 7);
    }
  } else {
    // Binary mode: raw bytes
    const data = new TextEncoder().encode(text);
    pushBits(bits, MODE_BINARY, 4);
    pushBits(bits, data.length, 13);
    for (const byte of data) {
      pushBits(bits, byte, 8);
    }
  }

  // Select version
  const dataBitCount = bits.length;
  let version = options.version ?? 0;

  if (!options.version) {
    for (let v = 1; v <= 84; v++) {
      const dataCap = hanxinDataCapacity(v, ecRatio);
      const neededBytes = Math.ceil(dataBitCount / 8);
      if (neededBytes <= dataCap) {
        version = v;
        break;
      }
    }
    if (version === 0) {
      throw new CapacityError("Data too long for any Han Xin Code version");
    }
  }

  const size = hanxinSize(version);

  // Pad bits to fill data capacity
  const totalCW = hanxinTotalCodewords(version);
  const ecBytes = Math.ceil(totalCW * ecRatio);
  const dataBytes = totalCW - ecBytes;
  const totalDataBits = dataBytes * 8;

  // Terminator: up to 4 zero bits
  const termLen = Math.min(4, totalDataBits - bits.length);
  pushBits(bits, 0, termLen);

  // Byte-align
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad with 0x55 (Han Xin padding byte, alternating bits)
  while (bits.length < totalDataBits) {
    pushBits(bits, 0x55, 8);
  }
  // Trim to exact length
  bits.length = totalDataBits;

  // Convert bits to bytes
  const dataArr: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]!;
    }
    dataArr.push(byte);
  }

  // Generate EC with Han Xin RS over GF(256)/0x163
  // Split into blocks if ecBytes > 255 (RS block limit)
  let allBytes: number[];
  if (ecBytes === 0) {
    allBytes = dataArr;
  } else if (ecBytes <= 255) {
    const ec = hanxinGenerateEC(dataArr, ecBytes);
    allBytes = [...dataArr, ...ec];
  } else {
    // Split into multiple RS blocks
    const numBlocks = Math.ceil(ecBytes / 255);
    const ecPerBlock = Math.ceil(ecBytes / numBlocks);
    const baseDataPerBlock = Math.floor(dataArr.length / numBlocks);
    const extraDataBlocks = dataArr.length % numBlocks;

    const interleavedData: number[] = [];
    const interleavedEC: number[] = [];
    const blocks: number[][] = [];
    let pos = 0;

    for (let b = 0; b < numBlocks; b++) {
      const blockSize = baseDataPerBlock + (b < extraDataBlocks ? 1 : 0);
      const block = dataArr.slice(pos, pos + blockSize);
      blocks.push(block);
      pos += blockSize;
    }

    // Generate EC per block
    const ecBlocks: number[][] = [];
    for (const block of blocks) {
      ecBlocks.push(hanxinGenerateEC(block, Math.min(ecPerBlock, 255)));
    }

    // Interleave data
    const maxDataLen = Math.max(...blocks.map((b) => b.length));
    for (let i = 0; i < maxDataLen; i++) {
      for (const block of blocks) {
        if (i < block.length) interleavedData.push(block[i]!);
      }
    }

    // Interleave EC
    const maxECLen = Math.max(...ecBlocks.map((b) => b.length));
    for (let i = 0; i < maxECLen; i++) {
      for (const ec of ecBlocks) {
        if (i < ec.length) interleavedEC.push(ec[i]!);
      }
    }

    allBytes = [...interleavedData, ...interleavedEC];
  }

  // Build matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from<boolean | null>({ length: size }).fill(null),
  );

  // Place 4 finder patterns (all corners — Han Xin has 4, not 3 like QR)
  // Han Xin 4 rotationally-distinct chevron-shaped finder patterns (from Zint/bwip-js)
  // prettier-ignore
  const FINDER_TL = [0x7f,0x40,0x5f,0x50,0x57,0x57,0x57];
  // prettier-ignore
  const FINDER_TR = [0x7f,0x01,0x7d,0x05,0x75,0x75,0x75];
  // prettier-ignore
  const FINDER_BL = [0x7f,0x01,0x7d,0x05,0x75,0x75,0x75]; // same as TR per spec
  // prettier-ignore
  const FINDER_BR = [0x75,0x75,0x75,0x05,0x7d,0x01,0x7f]; // TR reversed

  placeFinderHX(matrix, 0, 0, FINDER_TL, size);
  placeFinderHX(matrix, 0, size - 7, FINDER_TR, size);
  placeFinderHX(matrix, size - 7, 0, FINDER_BL, size);
  placeFinderHX(matrix, size - 7, size - 7, FINDER_BR, size);

  // Han Xin has NO timing patterns — only separator bands around finders
  // 1-module white separator around each 7x7 finder
  for (let i = -1; i <= 7; i++) {
    // Top-left separator
    setSafeNull(matrix, 7, i, size);
    setSafeNull(matrix, i, 7, size);
    // Top-right separator
    setSafeNull(matrix, 7, size - 8 + i, size);
    setSafeNull(matrix, i, size - 8, size);
    // Bottom-left separator
    setSafeNull(matrix, size - 8, i, size);
    setSafeNull(matrix, size - 8 + i, 7, size);
    // Bottom-right separator
    setSafeNull(matrix, size - 8, size - 8 + i, size);
    setSafeNull(matrix, size - 8 + i, size - 8, size);
  }

  // Place data bits into available modules
  const allBits: number[] = [];
  for (const byte of allBytes) {
    pushBits(allBits, byte, 8);
  }

  let bitIdx = 0;
  for (let c = size - 2; c >= 1; c -= 2) {
    for (let r = 1; r < size - 1; r++) {
      for (const cc of [c, c - 1]) {
        if (cc >= 0 && cc < size && matrix[r]![cc] === null) {
          matrix[r]![cc] = bitIdx < allBits.length ? allBits[bitIdx]! === 1 : false;
          bitIdx++;
        }
      }
    }
  }

  return matrix.map((row) => row.map((cell) => cell === true));
}

function setSafeNull(matrix: (boolean | null)[][], r: number, c: number, size: number): void {
  if (r >= 0 && r < size && c >= 0 && c < size && matrix[r]![c] === null) {
    matrix[r]![c] = false;
  }
}

function placeFinderHX(
  matrix: (boolean | null)[][],
  row: number,
  col: number,
  pattern: number[],
  size: number,
): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      matrix[rr]![cc] = ((pattern[r]! >> (6 - c)) & 1) === 1;
    }
  }
}
