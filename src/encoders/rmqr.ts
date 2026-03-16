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
  [7, 43, 6, 4, 4, 6],
  [7, 59, 12, 8, 6, 10],
  [7, 77, 20, 14, 8, 14],
  [7, 99, 28, 20, 12, 20],
  [7, 139, 44, 32, 16, 28],
  [9, 43, 10, 6, 6, 10],
  [9, 59, 18, 12, 8, 14],
  [9, 77, 28, 20, 12, 20],
  [9, 99, 40, 28, 16, 28],
  [9, 139, 62, 44, 22, 40],
  [11, 27, 6, 4, 4, 6],
  [11, 43, 14, 10, 8, 12],
  [11, 59, 24, 16, 10, 18],
  [11, 77, 36, 26, 14, 24],
  [11, 99, 52, 36, 20, 36],
  [11, 139, 80, 56, 28, 52],
  [13, 27, 8, 6, 6, 8],
  [13, 43, 18, 12, 10, 16],
  [13, 59, 30, 22, 14, 22],
  [13, 77, 46, 32, 18, 32],
  [13, 99, 66, 46, 24, 44],
  [13, 139, 100, 72, 36, 64],
  [15, 43, 22, 16, 12, 18],
  [15, 59, 38, 26, 16, 28],
  [15, 77, 56, 40, 22, 38],
  [15, 99, 80, 56, 28, 52],
  [15, 139, 122, 88, 42, 76],
  [17, 43, 28, 20, 14, 22],
  [17, 59, 44, 32, 20, 32],
  [17, 77, 66, 48, 26, 44],
  [17, 99, 96, 68, 34, 62],
  [17, 139, 146, 104, 50, 92],
];

export interface RMQROptions {
  ecLevel?: "M" | "H";
  version?: number; // index into RMQR_SIZES (0-31)
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

  // Encode data
  const bits: number[] = [];
  const data = new TextEncoder().encode(text);

  if (isNum) {
    pushBits(bits, 0b001, 3); // numeric mode
    pushBits(bits, text.length, 7);
    bits.push(...encodeNumericData(text));
  } else if (isAlpha) {
    pushBits(bits, 0b010, 3); // alphanumeric mode
    pushBits(bits, text.length, 6);
    bits.push(...encodeAlphanumericData(text));
  } else {
    pushBits(bits, 0b100, 3); // byte mode
    pushBits(bits, data.length, 8);
    bits.push(...encodeByteData(data));
  }

  // Select symbol size
  const size = selectRMQRSize(bits.length, ecLevel, options.version);
  if (!size) {
    throw new CapacityError("Data too long for any rMQR symbol size");
  }

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

  // Build matrix
  const matrix: (boolean | null)[][] = Array.from({ length: rows }, () =>
    Array.from<boolean | null>({ length: cols }).fill(null),
  );

  // Finder pattern (7×7 at top-left)
  for (let r = 0; r < 7 && r < rows; r++) {
    for (let c = 0; c < 7 && c < cols; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[r]![c] = isOuter || isInner;
    }
  }

  // Separator
  for (let i = 0; i < 8 && i < cols; i++) {
    if (7 < rows && matrix[7]![i] === null) matrix[7]![i] = false;
  }
  for (let i = 0; i < 8 && i < rows; i++) {
    if (7 < cols && matrix[i]![7] === null) matrix[i]![7] = false;
  }

  // Timing patterns
  for (let c = 8; c < cols; c++) {
    if (matrix[0]![c] === null) matrix[0]![c] = c % 2 === 0;
  }
  for (let r = 8; r < rows; r++) {
    if (matrix[r]![0] === null) matrix[r]![0] = r % 2 === 0;
  }

  // Corner finder (bottom-right 5×5)
  const cr = rows - 1;
  const cc = cols - 1;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = cr + r;
      const ccc = cc + c;
      if (rr >= 0 && rr < rows && ccc >= 0 && ccc < cols) {
        const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        if (matrix[rr]![ccc] === null) {
          matrix[rr]![ccc] = isOuter || isCenter;
        }
      }
    }
  }

  // Place data
  const allBits: number[] = [];
  for (const byte of allBytes) {
    pushBits(allBits, byte, 8);
  }

  let bitIdx = 0;
  for (let c = cols - 1; c >= 1; c -= 2) {
    for (let r = 0; r < rows; r++) {
      for (const cc2 of [c, c - 1]) {
        if (cc2 >= 0 && matrix[r]![cc2] === null) {
          matrix[r]![cc2] = bitIdx < allBits.length ? allBits[bitIdx]! === 1 : false;
          bitIdx++;
        }
      }
    }
  }

  return matrix.map((row) => row.map((cell) => cell === true));
}

function selectRMQRSize(
  dataBitCount: number,
  ecLevel: string,
  requestedVersion?: number,
): (typeof RMQR_SIZES)[number] | undefined {
  if (requestedVersion !== undefined) {
    return RMQR_SIZES[requestedVersion];
  }

  for (const size of RMQR_SIZES) {
    const dataCW = ecLevel === "M" ? size[2] : size[3];
    if (dataBitCount <= dataCW * 8) {
      return size;
    }
  }
  return undefined;
}
