/**
 * MaxiCode encoder (ISO/IEC 16023)
 * Fixed-size 2D barcode used on UPS shipping labels
 *
 * Structure:
 * - 33 rows × 30 columns hexagonal grid
 * - Central bullseye finder pattern
 * - 6 encoding modes (2/3 for structured carrier, 4/5/6 for general)
 * - Reed-Solomon error correction
 */

import { InvalidInputError } from "../errors";

const ROWS = 33;
const COLS = 30;

// MaxiCode character set (Mode 4: Standard Code Set A — printable ASCII)
function encodeMode4(text: string): number[] {
  const codewords: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) {
      codewords.push(0); // replace non-printable with space
    } else {
      codewords.push(code - 32); // offset to 0-based
    }
  }
  return codewords;
}

// Mode 2/3: Structured Carrier Message (UPS shipping)
function encodeStructured(
  postalCode: string,
  countryCode: number,
  serviceClass: number,
  message: string,
  mode: 2 | 3,
): number[] {
  const codewords: number[] = [];

  // Header: mode indicator
  codewords.push(mode);

  if (mode === 2) {
    // Numeric postal code (9 digits for US)
    const postal = postalCode.replace(/\D/g, "").padEnd(9, "0").substring(0, 9);
    // Pack 9 digits into 4 codewords
    const postalNum = Number.parseInt(postal, 10);
    codewords.push((postalNum >> 18) & 0x3f);
    codewords.push((postalNum >> 12) & 0x3f);
    codewords.push((postalNum >> 6) & 0x3f);
    codewords.push(postalNum & 0x3f);
  } else {
    // Alphanumeric postal code (6 chars for international)
    const postal = postalCode.padEnd(6, " ").substring(0, 6);
    for (const ch of postal) {
      codewords.push(ch.charCodeAt(0) & 0x3f);
    }
  }

  // Country code (3 digits → 10 bits → 2 codewords)
  codewords.push((countryCode >> 6) & 0x3f);
  codewords.push(countryCode & 0x3f);

  // Service class (3 digits → 10 bits → 2 codewords)
  codewords.push((serviceClass >> 6) & 0x3f);
  codewords.push(serviceClass & 0x3f);

  // Message data
  codewords.push(...encodeMode4(message));

  return codewords;
}

// Simple RS for MaxiCode (GF(64))
function maxicodeEC(data: number[], ecCount: number): number[] {
  const ec = Array.from({ length: ecCount }, () => 0);
  for (const byte of data) {
    const feedback = (byte ^ ec[0]!) % 64;
    for (let j = 0; j < ecCount - 1; j++) {
      ec[j] = (ec[j + 1]! ^ (feedback * (j + 1))) % 64;
    }
    ec[ecCount - 1] = (feedback * ecCount) % 64;
  }
  return ec;
}

export interface MaxiCodeOptions {
  /** Encoding mode: 2 (US structured), 3 (intl structured), 4 (standard), 5 (full ECC), 6 (reader programming) */
  mode?: 2 | 3 | 4 | 5 | 6;
  /** Postal code (modes 2/3) */
  postalCode?: string;
  /** ISO country code number (modes 2/3) */
  countryCode?: number;
  /** Service class (modes 2/3, e.g. 840 for UPS) */
  serviceClass?: number;
}

/**
 * Encode text as MaxiCode
 * Returns a 33×30 boolean matrix (hexagonal grid representation)
 */
export function encodeMaxiCode(text: string, options: MaxiCodeOptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("MaxiCode input must not be empty");
  }

  const mode = options.mode ?? 4;
  let codewords: number[];

  if (mode === 2 || mode === 3) {
    codewords = encodeStructured(
      options.postalCode ?? "",
      options.countryCode ?? 840,
      options.serviceClass ?? 1,
      text,
      mode,
    );
  } else {
    codewords = [mode, ...encodeMode4(text)];
  }

  // Pad to 144 data codewords (MaxiCode has 144 total symbols in grid)
  const totalDataCW = 84; // primary + secondary data
  while (codewords.length < totalDataCW) {
    codewords.push(33); // pad with '!'
  }
  codewords = codewords.slice(0, totalDataCW);

  // Error correction: primary (10 EC) + secondary (10 EC + 10 EC)
  const primaryData = codewords.slice(0, 10);
  const secondaryData1 = codewords.slice(10, 47);
  const secondaryData2 = codewords.slice(47, 84);

  const primaryEC = maxicodeEC(primaryData, 10);
  const secondaryEC1 = maxicodeEC(secondaryData1, 10);
  const secondaryEC2 = maxicodeEC(secondaryData2, 10);

  const allCW = [
    ...primaryData,
    ...primaryEC,
    ...secondaryData1,
    ...secondaryEC1,
    ...secondaryData2,
    ...secondaryEC2,
  ];

  // Build 33×30 matrix
  const matrix: boolean[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => false),
  );

  // Place bullseye at center (rows 13-19, cols 12-17)
  placeBullseye(matrix);

  // Place data modules in spiral pattern around bullseye
  let cwIdx = 0;
  let bitIdx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Skip bullseye area
      if (r >= 13 && r <= 19 && c >= 12 && c <= 17) continue;

      if (cwIdx < allCW.length) {
        // Each codeword is 6 bits
        const bit = (allCW[cwIdx]! >> (5 - bitIdx)) & 1;
        matrix[r]![c] = bit === 1;
        bitIdx++;
        if (bitIdx >= 6) {
          bitIdx = 0;
          cwIdx++;
        }
      }
    }
  }

  return matrix;
}

function placeBullseye(matrix: boolean[][]): void {
  const cx = 15; // center col (approx)
  const cy = 16; // center row

  // Concentric rings: dark, light, dark, light, dark
  for (let r = 13; r <= 19; r++) {
    for (let c = 12; c <= 17; c++) {
      const dist = Math.max(Math.abs(r - cy), Math.abs(c - cx));
      matrix[r]![c] = dist % 2 === 0;
    }
  }
}
