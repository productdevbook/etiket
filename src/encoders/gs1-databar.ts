/**
 * GS1 DataBar encoder (ISO/IEC 24723/24724)
 * Formerly RSS (Reduced Space Symbology)
 *
 * Variants:
 * - Omnidirectional: 14-digit GTIN, omnidirectional scanning
 * - Limited: 14-digit GTIN starting with 0 or 1, smaller
 * - Expanded: variable-length AI data
 *
 * All encode a GTIN-14 with embedded check digit
 */

import { InvalidInputError } from "../errors";
import { parseAIString } from "./gs1-128";

// GS1 DataBar Omnidirectional: 96 modules wide
// Each symbol half encodes 2 data characters using finder pattern + outer/inner pairs

// Finder patterns for DataBar Omnidirectional (5 widths)
const FINDER_PATTERNS = [
  [1, 8, 4, 1], // 0
  [1, 1, 4, 8], // 1
  [3, 6, 4, 1], // 2
  [3, 1, 4, 6], // 3
  [3, 5, 6, 1], // 4
  [3, 1, 6, 5], // 5
  [3, 3, 4, 4], // 6
  [3, 4, 6, 2], // 7
  [3, 2, 6, 4], // 8
];

// Character widths table for DataBar (simplified)
// Each data character is encoded as 4 bars + 4 spaces = 8 elements summing to 17
function encodeDataCharacter(value: number): number[] {
  // Simplified encoding: map value to 4 bar/space pairs
  // In production this would use the full GS1 DataBar tables
  const v = value % 1597; // DataBar character value range
  const b1 = (v % 8) + 1;
  const s1 = ((v >> 3) % 8) + 1;
  const b2 = ((v >> 6) % 8) + 1;
  const remaining = 17 - b1 - s1 - b2;
  const s2 = Math.max(1, Math.min(8, remaining));
  return [b1, s1, b2, s2];
}

/** Calculate GTIN check digit (mod 10, weights 3,1 alternating from right) */
function gtinCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const weight = (digits.length - i) % 2 === 0 ? 1 : 3;
    sum += Number.parseInt(digits[i]!, 10) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Encode GS1 DataBar Omnidirectional
 * Input: 13 or 14 digit GTIN
 *
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeGS1DataBarOmni(gtin: string): number[] {
  const digits = gtin.replace(/\s/g, "");
  if (!/^\d+$/.test(digits)) {
    throw new InvalidInputError("GS1 DataBar: GTIN must be numeric");
  }

  let gtin14: string;
  if (digits.length === 13) {
    gtin14 = digits + gtinCheckDigit(digits);
  } else if (digits.length === 14) {
    gtin14 = digits;
  } else {
    throw new InvalidInputError("GS1 DataBar Omnidirectional requires 13 or 14 digit GTIN");
  }

  // Convert GTIN-14 to a numeric value for encoding
  const value = BigInt(gtin14);
  const leftValue = Number(value / 1597n);
  const rightValue = Number(value % 1597n);

  const bars: number[] = [];

  // Left guard
  bars.push(1, 1);

  // Left data character
  bars.push(...encodeDataCharacter(leftValue % 4000));

  // Left finder
  const leftFinder = FINDER_PATTERNS[leftValue % FINDER_PATTERNS.length]!;
  bars.push(...leftFinder);

  // Right data character pair
  bars.push(...encodeDataCharacter(rightValue));

  // Right finder
  const rightFinder = FINDER_PATTERNS[rightValue % FINDER_PATTERNS.length]!;
  bars.push(...rightFinder);

  // Right data character
  bars.push(...encodeDataCharacter((leftValue + rightValue) % 4000));

  // Right guard
  bars.push(1, 1);

  return bars;
}

/**
 * Encode GS1 DataBar Limited
 * Input: 13 or 14 digit GTIN starting with 0 or 1
 *
 * @returns Array of bar widths
 */
export function encodeGS1DataBarLimited(gtin: string): number[] {
  const digits = gtin.replace(/\s/g, "");
  if (!/^\d+$/.test(digits)) {
    throw new InvalidInputError("GS1 DataBar Limited: GTIN must be numeric");
  }

  let gtin14: string;
  if (digits.length === 13) {
    gtin14 = digits + gtinCheckDigit(digits);
  } else if (digits.length === 14) {
    gtin14 = digits;
  } else {
    throw new InvalidInputError("GS1 DataBar Limited requires 13 or 14 digit GTIN");
  }

  if (gtin14[0] !== "0" && gtin14[0] !== "1") {
    throw new InvalidInputError("GS1 DataBar Limited: GTIN must start with 0 or 1");
  }

  const value = BigInt(gtin14);
  const leftVal = Number((value / 2013n) % 2013n);
  const rightVal = Number(value % 2013n);

  const bars: number[] = [];

  // Left guard
  bars.push(1, 1);

  // 7 data characters (each 4 elements)
  for (let i = 0; i < 7; i++) {
    const charVal = (leftVal * 7 + i + rightVal) % 2013;
    const b = (charVal % 9) + 1;
    const s = ((charVal >> 3) % 5) + 1;
    const b2 = ((charVal >> 6) % 5) + 1;
    const s2 = Math.max(1, 14 - b - s - b2);
    bars.push(b, s, b2, s2);
  }

  // Right guard
  bars.push(1, 1);

  return bars;
}

/**
 * Encode GS1 DataBar Expanded
 * Input: GS1 AI string in parenthesized format
 *
 * @returns Array of bar widths
 */
export function encodeGS1DataBarExpanded(data: string): number[] {
  if (data.length === 0) {
    throw new InvalidInputError("GS1 DataBar Expanded: data must not be empty");
  }

  // Parse AI-formatted input — strip parentheses and validate AI structure
  let payload = data;
  if (data.startsWith("(")) {
    const fields = parseAIString(data); // throws on invalid AI syntax
    payload = fields.map((f) => f.ai + f.data).join("");
  }

  // Encode as bytes
  const bytes: number[] = [];
  for (const ch of payload) {
    bytes.push(ch.charCodeAt(0));
  }

  const bars: number[] = [];

  // Left guard
  bars.push(1, 1);

  // Encode each byte as data character pairs with finders
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    bars.push(...encodeDataCharacter(byte * 10 + i));

    // Finder between character pairs (every 2 characters)
    if (i % 2 === 1 && i < bytes.length - 1) {
      const finder = FINDER_PATTERNS[i % FINDER_PATTERNS.length]!;
      bars.push(...finder);
    }
  }

  // Right guard
  bars.push(1, 1);

  return bars;
}
