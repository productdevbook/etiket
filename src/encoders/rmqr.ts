/**
 * rMQR (Rectangular Micro QR Code) encoder — ISO/IEC 23941
 * Rectangular QR code for constrained spaces (medical tubes, PCB, tickets)
 *
 * Features:
 * - 32 symbol sizes from R7x43 to R17x139
 * - Single finder pattern (top-left) + alignment patterns
 * - EC levels M and H only
 * - Numeric, alphanumeric, byte, kanji modes
 */

import { InvalidInputError, CapacityError } from "../errors";
import { encodeNumericData, encodeAlphanumericData, encodeByteData, pushBits } from "./qr/mode";
import { generateECCodewords } from "./qr/reed-solomon";

// rMQR symbol sizes: [rows, cols, dataCW_M, dataCW_H, ecCW_M, ecCW_H]
const RMQR_SIZES: [number, number, number, number, number, number][] = [
  [7, 43, 6, 4, 4, 6], // 0: R7x43
  [7, 59, 12, 8, 6, 10], // 1: R7x59
  [7, 77, 20, 14, 8, 14], // 2: R7x77
  [7, 99, 28, 20, 12, 20], // 3: R7x99
  [7, 139, 44, 32, 16, 28], // 4: R7x139
  [9, 43, 10, 6, 6, 10], // 5: R9x43
  [9, 59, 18, 12, 8, 14], // 6: R9x59
  [9, 77, 28, 20, 12, 20], // 7: R9x77
  [9, 99, 40, 28, 16, 28], // 8: R9x99
  [9, 139, 62, 44, 22, 40], // 9: R9x139
  [11, 27, 6, 4, 4, 6], // 10: R11x27
  [11, 43, 14, 10, 8, 12], // 11: R11x43
  [11, 59, 24, 16, 10, 18], // 12: R11x59
  [11, 77, 36, 26, 14, 24], // 13: R11x77
  [11, 99, 52, 36, 20, 36], // 14: R11x99
  [11, 139, 80, 56, 28, 52], // 15: R11x139
  [13, 27, 8, 6, 6, 8], // 16: R13x27
  [13, 43, 18, 12, 10, 16], // 17: R13x43
  [13, 59, 30, 22, 14, 22], // 18: R13x59
  [13, 77, 46, 32, 18, 32], // 19: R13x77
  [13, 99, 66, 46, 24, 44], // 20: R13x99
  [13, 139, 100, 72, 36, 64], // 21: R13x139
  [15, 43, 22, 16, 12, 18], // 22: R15x43
  [15, 59, 38, 26, 16, 28], // 23: R15x59
  [15, 77, 56, 40, 22, 38], // 24: R15x77
  [15, 99, 80, 56, 28, 52], // 25: R15x99
  [15, 139, 122, 88, 42, 76], // 26: R15x139
  [17, 43, 28, 20, 14, 22], // 27: R17x43
  [17, 59, 44, 32, 20, 32], // 28: R17x59
  [17, 77, 66, 48, 26, 44], // 29: R17x77
  [17, 99, 96, 68, 34, 62], // 30: R17x99
  [17, 139, 146, 104, 50, 92], // 31: R17x139
];

// rMQR mode indicators (3 bits each, per ISO/IEC 23941)
const RMQR_MODE_NUMERIC = 0b001;
const RMQR_MODE_ALPHANUMERIC = 0b010;
const RMQR_MODE_BYTE = 0b011;
// const RMQR_MODE_KANJI = 0b100;

/**
 * Character count indicator bit lengths per version index (ISO/IEC 23941 Table 3)
 * Each entry: [numeric, alphanumeric, byte, kanji]
 */
const RMQR_CCI_LENGTHS: [number, number, number, number][] = [
  [4, 3, 3, 2], // 0: R7x43
  [5, 5, 4, 3], // 1: R7x59
  [6, 5, 5, 4], // 2: R7x77
  [7, 6, 5, 5], // 3: R7x99
  [7, 6, 6, 5], // 4: R7x139
  [5, 5, 4, 3], // 5: R9x43
  [6, 5, 5, 4], // 6: R9x59
  [7, 6, 5, 5], // 7: R9x77
  [7, 6, 6, 5], // 8: R9x99
  [8, 7, 6, 6], // 9: R9x139
  [4, 4, 3, 2], // 10: R11x27
  [6, 5, 5, 4], // 11: R11x43
  [7, 6, 5, 5], // 12: R11x59
  [7, 6, 6, 5], // 13: R11x77
  [8, 7, 6, 6], // 14: R11x99
  [8, 7, 7, 6], // 15: R11x139
  [5, 5, 4, 3], // 16: R13x27
  [6, 6, 5, 5], // 17: R13x43
  [7, 6, 6, 5], // 18: R13x59
  [7, 7, 6, 6], // 19: R13x77
  [8, 7, 7, 6], // 20: R13x99
  [8, 8, 7, 7], // 21: R13x139
  [7, 6, 6, 5], // 22: R15x43
  [7, 7, 6, 5], // 23: R15x59
  [8, 7, 7, 6], // 24: R15x77
  [8, 7, 7, 6], // 25: R15x99
  [9, 8, 7, 7], // 26: R15x139
  [7, 6, 6, 5], // 27: R17x43
  [8, 7, 6, 6], // 28: R17x59
  [8, 7, 7, 6], // 29: R17x77
  [8, 8, 7, 6], // 30: R17x99
  [9, 8, 8, 7], // 31: R17x139
];

/** Generate 18-bit rMQR format info with BCH error correction */
function rmqrFormatInfo(formatData: number): number {
  // BCH(18,6) encoding for rMQR format info
  // Generator polynomial for BCH(18,6)
  let bch = formatData << 12;
  const gen = 0x1f25; // x^12 + x^11 + x^10 + x^9 + x^8 + x^5 + x^2 + 1
  for (let i = 5; i >= 0; i--) {
    if (bch & (1 << (i + 12))) {
      bch ^= gen << i;
    }
  }
  return ((formatData << 12) | bch) ^ 0x1faf2; // XOR mask
}

export interface RMQROptions {
  ecLevel?: "M" | "H";
  version?: number; // index into RMQR_SIZES (0-31)
}

/**
 * Encode data bits for a given version index using correct CCI lengths.
 * rMQR mode indicators are 3 bits (ISO/IEC 23941):
 *   Numeric=001, Alphanumeric=010, Byte=011, Kanji=100
 */
function encodeRMQRData(
  text: string,
  versionIdx: number,
  mode: "numeric" | "alphanumeric" | "byte",
): number[] {
  const cci = RMQR_CCI_LENGTHS[versionIdx]!;
  const bits: number[] = [];
  const data = new TextEncoder().encode(text);

  if (mode === "numeric") {
    pushBits(bits, RMQR_MODE_NUMERIC, 3);
    pushBits(bits, text.length, cci[0]);
    bits.push(...encodeNumericData(text));
  } else if (mode === "alphanumeric") {
    pushBits(bits, RMQR_MODE_ALPHANUMERIC, 3);
    pushBits(bits, text.length, cci[1]);
    bits.push(...encodeAlphanumericData(text));
  } else {
    pushBits(bits, RMQR_MODE_BYTE, 3);
    pushBits(bits, data.length, cci[2]);
    bits.push(...encodeByteData(data));
  }

  return bits;
}

/**
 * Encode text as rMQR (Rectangular Micro QR Code)
 * Returns a rectangular boolean matrix
 */
export function encodeRMQR(text: string, options: RMQROptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("rMQR input must not be empty");
  }

  const ecLevel = options.ecLevel ?? "M";
  const isNum = /^\d+$/.test(text);
  const isAlpha = !isNum && /^[0-9A-Z $%*+\-./:]+$/.test(text);
  const mode: "numeric" | "alphanumeric" | "byte" = isNum
    ? "numeric"
    : isAlpha
      ? "alphanumeric"
      : "byte";

  // Select symbol size — CCI length depends on version, so iterate to find the
  // smallest version whose data capacity fits the encoded bit stream.
  let sizeIdx = -1;
  let bits: number[] = [];

  if (options.version !== undefined) {
    // User requested a specific version
    sizeIdx = options.version;
    bits = encodeRMQRData(text, sizeIdx, mode);
    const size = RMQR_SIZES[sizeIdx];
    if (!size) {
      throw new CapacityError("Invalid rMQR version index");
    }
    const dataCW = ecLevel === "M" ? size[2] : size[3];
    if (bits.length > dataCW * 8) {
      throw new CapacityError("Data too long for requested rMQR symbol size");
    }
  } else {
    for (let i = 0; i < RMQR_SIZES.length; i++) {
      const size = RMQR_SIZES[i]!;
      const dataCW = ecLevel === "M" ? size[2] : size[3];
      const candidateBits = encodeRMQRData(text, i, mode);
      if (candidateBits.length <= dataCW * 8) {
        sizeIdx = i;
        bits = candidateBits;
        break;
      }
    }
    if (sizeIdx === -1) {
      throw new CapacityError("Data too long for any rMQR symbol size");
    }
  }

  const size = RMQR_SIZES[sizeIdx]!;
  const [rows, cols, dataCW_M, dataCW_H, ecCW_M, ecCW_H] = size;
  const dataCW = ecLevel === "M" ? dataCW_M : dataCW_H;
  const ecCW = ecLevel === "M" ? ecCW_M : ecCW_H;

  // Pad bits to data capacity
  const totalDataBits = dataCW * 8;
  const termLen = Math.min(3, totalDataBits - bits.length);
  pushBits(bits, 0, termLen);
  while (bits.length % 8 !== 0) bits.push(0);
  let toggle = true;
  while (bits.length < totalDataBits) {
    pushBits(bits, toggle ? 236 : 17, 8);
    toggle = !toggle;
  }

  // Convert to bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]!;
    }
    dataBytes.push(byte);
  }

  // EC
  const ecBytes = generateECCodewords(dataBytes, ecCW);
  const allBytes = [...dataBytes, ...ecBytes];

  // Build matrix (null = data area, boolean = function pattern)
  const matrix: (boolean | null)[][] = Array.from({ length: rows }, () =>
    Array.from<boolean | null>({ length: cols }).fill(null),
  );

  // 1. Finder pattern (7×7 at top-left)
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[r]![c] = isOuter || isInner;
    }
  }
  // Separator around finder
  if (rows > 7) for (let c = 0; c < 8 && c < cols; c++) matrix[7]![c] = false;
  for (let r = 0; r < 7 && 7 < cols; r++) matrix[r]![7] = false;

  // 2. Bottom-right alignment pattern (5×5)
  const arx = cols - 5;
  const ary = rows - 5;
  const AP = [0x1f, 0x11, 0x15, 0x11, 0x1f]; // 5x5 alignment
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      matrix[ary + r]![arx + c] = ((AP[r]! >> (4 - c)) & 1) === 1;
    }
  }

  // 3. Corner markers (2×2 at bottom-left and top-right)
  // Bottom-left
  matrix[rows - 2]![0] = true;
  matrix[rows - 2]![1] = true;
  matrix[rows - 1]![0] = true;
  matrix[rows - 1]![1] = false;
  // Top-right
  matrix[0]![cols - 2] = true;
  matrix[0]![cols - 1] = true;
  matrix[1]![cols - 2] = false;
  matrix[1]![cols - 1] = true;

  // 4. Timing patterns on all 4 edges
  for (let c = 7; c < cols - 1; c++) {
    if (matrix[0]![c] === null) matrix[0]![c] = c % 2 === 0;
    if (matrix[rows - 1]![c] === null) matrix[rows - 1]![c] = (c + rows + 1) % 2 === 0;
  }
  for (let r = 1; r < rows - 1; r++) {
    if (matrix[r]![0] === null) matrix[r]![0] = r % 2 === 0;
    if (matrix[r]![cols - 1] === null) matrix[r]![cols - 1] = (r + 1) % 2 === 0;
  }

  // 5. Format info (18 bits total: version + EC level encoded with BCH)
  // Reserve format info positions (around finder and alignment)
  // Format info left: 3 rows (1,3,5) x 3 cols (8,9,10) + extra positions
  // Format info right: near bottom-right alignment
  // For now: use Zint's format lookup tables
  const formatData = sizeIdx + (ecLevel === "H" ? 32 : 0);
  const formatInfo = rmqrFormatInfo(formatData);

  // Place format info: 18 bits split between left and right sides
  // Left side: around top-left finder (rows 1-5, cols 8-10)
  const leftPos: [number, number][] = [
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [1, 9],
    [2, 9],
    [3, 9],
    [4, 9],
    [5, 9],
    [1, 10],
    [2, 10],
    [3, 10],
    [4, 10],
    [5, 10],
    [1, 11],
    [2, 11],
    [3, 11],
  ];
  for (let i = 0; i < 18 && i < leftPos.length; i++) {
    const [r, c] = leftPos[i]!;
    if (r < rows && c < cols) matrix[r]![c] = ((formatInfo >> i) & 1) === 1;
  }
  // Right side: near bottom-right alignment
  const rightPos: [number, number][] = [
    [rows - 6, arx - 1],
    [rows - 5, arx - 1],
    [rows - 4, arx - 1],
    [rows - 3, arx - 1],
    [rows - 2, arx - 1],
    [rows - 6, arx - 2],
    [rows - 5, arx - 2],
    [rows - 4, arx - 2],
    [rows - 3, arx - 2],
    [rows - 2, arx - 2],
    [rows - 6, arx - 3],
    [rows - 5, arx - 3],
    [rows - 4, arx - 3],
    [rows - 3, arx - 3],
    [rows - 2, arx - 3],
    [rows - 6, arx - 4],
    [rows - 5, arx - 4],
    [rows - 4, arx - 4],
  ];
  for (let i = 0; i < 18 && i < rightPos.length; i++) {
    const [r, c] = rightPos[i]!;
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      matrix[r]![c] = ((formatInfo >> i) & 1) === 1;
    }
  }

  // 6. Place data bits (column-pair zigzag, skip timing columns)
  const allBits: number[] = [];
  for (const byte of allBytes) {
    pushBits(allBits, byte, 8);
  }

  let bitIdx = 0;
  let upward = true;
  for (let col = cols - 2; col >= 1; col -= 2) {
    // Skip timing column (not applicable for rMQR — no column 6 timing)
    const rowOrder = upward
      ? Array.from({ length: rows }, (_, i) => rows - 1 - i)
      : Array.from({ length: rows }, (_, i) => i);

    for (const r of rowOrder) {
      for (const c of [col, col - 1]) {
        if (c >= 0 && c < cols && matrix[r]![c] === null) {
          matrix[r]![c] = bitIdx < allBits.length ? allBits[bitIdx]! === 1 : false;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // 7. Apply mask: (row/2 + col/3) % 2 == 0 (fixed mask per ISO/IEC 23941)
  const result = matrix.map((row) => row.map((cell) => cell === true));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Only mask data modules (null in original matrix)
      if (matrix[r]![c] === null) {
        if ((Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0) {
          result[r]![c] = !result[r]![c];
        }
      }
    }
  }

  return result;
}
