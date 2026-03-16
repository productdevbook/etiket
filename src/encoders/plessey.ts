/**
 * Plessey and UK Plessey (MSI predecessor) barcode encoder
 * Used in UK library systems (Anker, Sircam)
 *
 * Plessey encoding: each hex digit (0-F) is encoded as 4 bar/space pairs
 * where 0 = narrow bar + narrow space, 1 = wide bar + wide space
 */

import { InvalidInputError } from "../errors";

// Plessey encoding: each hex digit maps to 4-bit pattern
// Each bit: 0 = narrow(1) bar + narrow(1) space, 1 = wide(2) bar + wide(2) space
const PLESSEY_PATTERNS: Record<string, number[]> = {
  "0": [0, 0, 0, 0],
  "1": [1, 0, 0, 0],
  "2": [0, 1, 0, 0],
  "3": [1, 1, 0, 0],
  "4": [0, 0, 1, 0],
  "5": [1, 0, 1, 0],
  "6": [0, 1, 1, 0],
  "7": [1, 1, 1, 0],
  "8": [0, 0, 0, 1],
  "9": [1, 0, 0, 1],
  A: [0, 1, 0, 1],
  B: [1, 1, 0, 1],
  C: [0, 0, 1, 1],
  D: [1, 0, 1, 1],
  E: [0, 1, 1, 1],
  F: [1, 1, 1, 1],
};

// Start: narrow bar, narrow space, wide bar, wide space (1,1,2,2 -> "01" pattern)
const START_PATTERN = [1, 1, 2, 2];
// Stop: wide bar, narrow space (2,1) — termination
const STOP_PATTERN = [2, 1];

/**
 * Calculate Plessey CRC check digits
 * Uses a CRC polynomial for 2 check digits
 */
function plesseyCRC(digits: string): [number, number] {
  // Simple modulo-based check for Plessey
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < digits.length; i++) {
    const val = Number.parseInt(digits[i]!, 16);
    sum1 = (sum1 + val * (i + 1)) % 16;
    sum2 = (sum2 + val * (i + 2)) % 16;
  }
  return [sum1, sum2];
}

/**
 * Encode Plessey barcode
 * Character set: 0-9, A-F (hexadecimal)
 *
 * @param text - Hex digits to encode
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodePlessey(text: string): number[] {
  const upper = text.toUpperCase();
  if (!/^[0-9A-F]+$/.test(upper)) {
    throw new InvalidInputError("Plessey only accepts hexadecimal characters (0-9, A-F)");
  }
  if (upper.length === 0) {
    throw new InvalidInputError("Plessey input must not be empty");
  }

  const [crc1, crc2] = plesseyCRC(upper);
  const dataWithCheck = upper + crc1.toString(16).toUpperCase() + crc2.toString(16).toUpperCase();

  const bars: number[] = [...START_PATTERN];

  for (const ch of dataWithCheck) {
    const pattern = PLESSEY_PATTERNS[ch]!;
    for (const bit of pattern) {
      bars.push(bit === 0 ? 1 : 2); // bar: narrow or wide
      bars.push(bit === 0 ? 1 : 2); // space: narrow or wide
    }
  }

  bars.push(...STOP_PATTERN);
  return bars;
}
