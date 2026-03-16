/**
 * Micro QR Code encoder (M1-M4)
 * ISO/IEC 18004 Annex — single finder pattern, reduced quiet zone
 *
 * M1: 11x11, numeric only, no EC
 * M2: 13x13, numeric/alphanumeric, EC L/M
 * M3: 15x15, numeric/alphanumeric/byte, EC L/M
 * M4: 17x17, numeric/alphanumeric/byte, EC L/M/Q
 */

import { CapacityError, InvalidInputError } from "../../errors";
import { pushBits, encodeNumericData, encodeAlphanumericData, encodeByteData } from "./mode";
import { generateECCodewords } from "./reed-solomon";

export interface MicroQROptions {
  version?: 1 | 2 | 3 | 4;
  ecLevel?: "L" | "M" | "Q";
}

export const MICRO_QR_SIZES = [11, 13, 15, 17] as const;

// Capacity table: [version][ecLevel] = { numeric, alphanumeric, byte, dataBits, ecCW }
interface MicroQRCapacity {
  numeric: number;
  alphanumeric: number;
  byte: number;
  dataCW: number;
  ecCW: number;
}

const CAPACITY: Record<number, Record<string, MicroQRCapacity>> = {
  1: {
    _: { numeric: 5, alphanumeric: 0, byte: 0, dataCW: 3, ecCW: 2 },
  },
  2: {
    L: { numeric: 10, alphanumeric: 6, byte: 0, dataCW: 5, ecCW: 5 },
    M: { numeric: 8, alphanumeric: 5, byte: 0, dataCW: 4, ecCW: 6 },
  },
  3: {
    L: { numeric: 23, alphanumeric: 14, byte: 9, dataCW: 11, ecCW: 6 },
    M: { numeric: 18, alphanumeric: 11, byte: 7, dataCW: 9, ecCW: 8 },
  },
  4: {
    L: { numeric: 35, alphanumeric: 21, byte: 15, dataCW: 16, ecCW: 8 },
    M: { numeric: 30, alphanumeric: 18, byte: 13, dataCW: 14, ecCW: 10 },
    Q: { numeric: 21, alphanumeric: 12, byte: 9, dataCW: 10, ecCW: 14 },
  },
};

/**
 * Encode text as a Micro QR code
 * Returns a 2D boolean matrix (true = dark module)
 */
export function encodeMicroQR(text: string, options: MicroQROptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("Micro QR input must not be empty");
  }

  // Detect mode
  const isNum = /^\d+$/.test(text);
  const isAlpha = !isNum && /^[0-9A-Z $%*+\-./:]+$/.test(text);
  const mode: "numeric" | "alphanumeric" | "byte" = isNum
    ? "numeric"
    : isAlpha
      ? "alphanumeric"
      : "byte";

  // Select version
  const { version, cap } = selectMicroVersion(text, mode, options);
  const size = version * 2 + 9; // M1=11, M2=13, M3=15, M4=17

  // Encode data
  const data = new TextEncoder().encode(text);
  const bits = buildMicroDataBits(text, data, mode, version, cap);

  // Convert to bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]!;
    }
    dataBytes.push(byte);
  }

  // Error correction
  const ecBytes = cap.ecCW > 0 ? generateECCodewords(dataBytes, cap.ecCW) : [];
  const allBytes = [...dataBytes, ...ecBytes];

  // Build matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from<boolean | null>({ length: size }).fill(null),
  );

  // Place finder pattern (top-left only)
  placeMicroFinder(matrix);

  // Timing patterns
  for (let i = 0; i < size; i++) {
    if (matrix[0]![i] === null) matrix[0]![i] = i % 2 === 0;
    if (matrix[i]![0] === null) matrix[i]![0] = i % 2 === 0;
  }

  // Place data
  const allBits: number[] = [];
  for (const byte of allBytes) {
    pushBits(allBits, byte, 8);
  }
  placeMicroData(matrix, allBits, size);

  // Convert to boolean
  return matrix.map((row) => row.map((cell) => cell === true));
}

function selectMicroVersion(
  text: string,
  mode: string,
  options: MicroQROptions,
): { version: number; cap: MicroQRCapacity } {
  const ecLevel = options.ecLevel ?? (mode === "numeric" ? "_" : "L");

  if (options.version) {
    const v = options.version;
    const caps = CAPACITY[v];
    const cap = caps?.[ecLevel] ?? caps?.["L"] ?? caps?.["_"];
    if (!cap) throw new CapacityError(`Micro QR M${v} does not support EC level ${ecLevel}`);
    return { version: v, cap };
  }

  const dataLen = mode === "byte" ? new TextEncoder().encode(text).length : text.length;

  for (let v = 1; v <= 4; v++) {
    const caps = CAPACITY[v]!;
    const cap = caps[ecLevel] ?? caps["L"] ?? caps["_"];
    if (!cap) continue;
    const modeKey = mode as keyof MicroQRCapacity;
    if (typeof cap[modeKey] === "number" && dataLen <= (cap[modeKey] as number)) {
      return { version: v, cap };
    }
  }

  throw new CapacityError(`Data too long for Micro QR Code with ${mode} mode`);
}

function buildMicroDataBits(
  text: string,
  data: Uint8Array,
  mode: string,
  version: number,
  cap: MicroQRCapacity,
): number[] {
  const bits: number[] = [];

  // Mode indicator (variable length for Micro QR)
  // M1: no mode indicator (numeric only)
  // M2: 1 bit (0=numeric, 1=alphanumeric)
  // M3: 2 bits (00=numeric, 01=alpha, 10=byte)
  // M4: 3 bits (000=numeric, 001=alpha, 010=byte)
  if (version === 2) {
    pushBits(bits, mode === "numeric" ? 0 : 1, 1);
  } else if (version === 3) {
    pushBits(bits, mode === "numeric" ? 0 : mode === "alphanumeric" ? 1 : 2, 2);
  } else if (version === 4) {
    pushBits(bits, mode === "numeric" ? 0 : mode === "alphanumeric" ? 1 : 2, 3);
  }

  // Character count
  const ccBits =
    version <= 2
      ? mode === "numeric"
        ? 3
        : 2
      : mode === "numeric"
        ? 4
        : mode === "alphanumeric"
          ? 3
          : version === 3
            ? 4
            : 4;
  const count = mode === "byte" ? data.length : text.length;
  pushBits(bits, count, ccBits);

  // Data
  if (mode === "numeric") bits.push(...encodeNumericData(text));
  else if (mode === "alphanumeric") bits.push(...encodeAlphanumericData(text));
  else bits.push(...encodeByteData(data));

  // Terminator + padding
  const totalBits = cap.dataCW * 8;
  const termLen = Math.min(
    version === 1 ? 3 : version === 2 ? 5 : version === 3 ? 7 : 9,
    totalBits - bits.length,
  );
  pushBits(bits, 0, termLen);

  while (bits.length % 8 !== 0) bits.push(0);

  let toggle = true;
  while (bits.length < totalBits) {
    pushBits(bits, toggle ? 236 : 17, 8);
    toggle = !toggle;
  }

  return bits;
}

function placeMicroFinder(matrix: (boolean | null)[][]): void {
  // 7x7 finder at (0,0) — same as standard QR
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[r]![c] = isOuter || isInner;
    }
  }
  // Separator
  for (let i = 0; i < 8; i++) {
    if (i < matrix.length && matrix[7]) matrix[7]![i] = false;
    if (i < matrix.length) matrix[i]![7] = false;
  }
}

function placeMicroData(matrix: (boolean | null)[][], bits: number[], size: number): void {
  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col >= 1; col -= 2) {
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (c >= 0 && matrix[row]![c] === null) {
          matrix[row]![c] = bitIdx < bits.length ? bits[bitIdx]! === 1 : false;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }
}
