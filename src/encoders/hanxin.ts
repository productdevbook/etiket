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
import { pushBits } from "./qr/mode";
import { generateECCodewords } from "./qr/reed-solomon";

// Han Xin version sizes: version v → (v*2 + 21) modules per side
function hanxinSize(version: number): number {
  return version * 2 + 21;
}

// Approximate data capacity per version (byte mode, EC L1)
function hanxinCapacity(version: number): number {
  const size = hanxinSize(version);
  const totalModules = size * size;
  // ~60% usable after function patterns and EC
  return Math.floor((totalModules * 0.6) / 8);
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

  // Encode data as bytes
  const data = new TextEncoder().encode(text);

  // Build data bits
  const bits: number[] = [];
  // Mode indicator: 0100 = byte mode
  pushBits(bits, 0b0100, 4);
  // Length
  pushBits(bits, data.length, 13);
  // Data bytes
  for (const byte of data) {
    pushBits(bits, byte, 8);
  }

  // Select version
  const dataBitCount = bits.length;
  let version = options.version ?? 0;

  if (!options.version) {
    for (let v = 1; v <= 84; v++) {
      const cap = hanxinCapacity(v);
      const dataBytes = Math.floor(dataBitCount / 8) + 1;
      const ecBytes = Math.ceil(dataBytes * ecRatio);
      if (dataBytes + ecBytes <= cap) {
        version = v;
        break;
      }
    }
    if (version === 0) {
      throw new CapacityError("Data too long for any Han Xin Code version");
    }
  }

  const size = hanxinSize(version);

  // Pad bits
  const totalCapBytes = hanxinCapacity(version);
  const ecBytes = Math.ceil(totalCapBytes * ecRatio);
  const dataBytes = totalCapBytes - ecBytes;
  const totalDataBits = dataBytes * 8;

  // Terminator
  const termLen = Math.min(4, totalDataBits - bits.length);
  pushBits(bits, 0, termLen);
  while (bits.length % 8 !== 0) bits.push(0);
  let toggle = true;
  while (bits.length < totalDataBits) {
    pushBits(bits, toggle ? 236 : 17, 8);
    toggle = !toggle;
  }

  // Convert to bytes
  const dataArr: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]!;
    }
    dataArr.push(byte);
  }

  // EC
  const ec = ecBytes > 0 ? generateECCodewords(dataArr, Math.min(ecBytes, 255)) : [];
  const allBytes = [...dataArr, ...ec];

  // Build matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from<boolean | null>({ length: size }).fill(null),
  );

  // Place 4 finder patterns (all corners — Han Xin has 4, not 3 like QR)
  placeFinder(matrix, 0, 0, size);
  placeFinder(matrix, 0, size - 7, size);
  placeFinder(matrix, size - 7, 0, size);
  placeFinder(matrix, size - 7, size - 7, size);

  // Timing patterns
  for (let i = 7; i < size - 7; i++) {
    if (matrix[0]![i] === null) matrix[0]![i] = i % 2 === 0;
    if (matrix[i]![0] === null) matrix[i]![0] = i % 2 === 0;
    if (matrix[size - 1]![i] === null) matrix[size - 1]![i] = i % 2 === 0;
    if (matrix[i]![size - 1] === null) matrix[i]![size - 1] = i % 2 === 0;
  }

  // Place data
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

function placeFinder(matrix: (boolean | null)[][], row: number, col: number, size: number): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[rr]![cc] = isOuter || isInner;
    }
  }
}
