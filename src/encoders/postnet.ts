/**
 * USPS POSTNET and PLANET barcode encoders
 * Height-modulated barcodes used by US Postal Service (legacy, replaced by IMb in 2013)
 *
 * Both use 5-bar encoding per digit with tall (1) and short (0) bars:
 * POSTNET: tall=1, short=0
 * PLANET: tall=0, short=1 (inverted)
 */

import { InvalidInputError } from "../errors";

// POSTNET digit encoding: each digit = 5 bars (tall=1, short=0)
// Encoding uses 2-of-5 scheme where exactly 2 bars are tall
const POSTNET_PATTERNS: number[][] = [
  [1, 1, 0, 0, 0], // 0
  [0, 0, 0, 1, 1], // 1
  [0, 0, 1, 0, 1], // 2
  [0, 0, 1, 1, 0], // 3
  [0, 1, 0, 0, 1], // 4
  [0, 1, 0, 1, 0], // 5
  [0, 1, 1, 0, 0], // 6
  [1, 0, 0, 0, 1], // 7
  [1, 0, 0, 1, 0], // 8
  [1, 0, 1, 0, 0], // 9
];

/** Calculate POSTNET/PLANET check digit (sum of digits mod 10, then 10 - remainder) */
function checkDigit(digits: string): number {
  let sum = 0;
  for (const ch of digits) {
    sum += Number.parseInt(ch, 10);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Encode USPS POSTNET barcode
 * Returns array of bar heights: 1 = tall (full), 0 = short (half)
 *
 * Valid lengths: 5 (ZIP), 9 (ZIP+4), 11 (delivery point)
 * Check digit auto-calculated
 *
 * @param zip - ZIP code digits (5, 9, or 11 digits)
 * @returns Array of bar heights (1=tall, 0=short) including frame bars
 */
export function encodePOSTNET(zip: string): number[] {
  const digits = zip.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) {
    throw new InvalidInputError("POSTNET only accepts digits");
  }
  if (digits.length !== 5 && digits.length !== 9 && digits.length !== 11) {
    throw new InvalidInputError("POSTNET requires 5, 9, or 11 digits");
  }

  const check = checkDigit(digits);
  const allDigits = digits + check;

  const bars: number[] = [1]; // Start frame bar (tall)
  for (const ch of allDigits) {
    const digit = Number.parseInt(ch, 10);
    bars.push(...POSTNET_PATTERNS[digit]!);
  }
  bars.push(1); // End frame bar (tall)

  return bars;
}

/**
 * Encode USPS PLANET barcode
 * Same structure as POSTNET but with inverted bar heights (3 tall, 2 short per digit)
 *
 * @param code - 11 or 13 digit PLANET code
 * @returns Array of bar heights (1=tall, 0=short)
 */
export function encodePLANET(code: string): number[] {
  const digits = code.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) {
    throw new InvalidInputError("PLANET only accepts digits");
  }
  if (digits.length !== 11 && digits.length !== 13) {
    throw new InvalidInputError("PLANET requires 11 or 13 digits");
  }

  const check = checkDigit(digits);
  const allDigits = digits + check;

  const bars: number[] = [1]; // Start frame bar
  for (const ch of allDigits) {
    const digit = Number.parseInt(ch, 10);
    // PLANET inverts: tall becomes short, short becomes tall
    const pattern = POSTNET_PATTERNS[digit]!;
    bars.push(...pattern.map((b) => (b === 1 ? 0 : 1)));
  }
  bars.push(1); // End frame bar

  return bars;
}
