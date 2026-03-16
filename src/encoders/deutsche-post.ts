/**
 * Deutsche Post Leitcode and Identcode barcodes
 * Based on Interleaved 2 of 5 with modulo 10 check digit (weights 4,9)
 */

import { InvalidInputError } from "../errors";
import { encodeITF } from "./itf";

/**
 * Calculate Deutsche Post check digit (mod 10, weights 4 and 9 alternating)
 */
function dpCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const weight = i % 2 === 0 ? 4 : 9;
    sum += Number.parseInt(digits[i]!, 10) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Encode Deutsche Post Identcode (12 digits: 11 data + 1 check)
 * Structure: mail center (2) + customer ID (3) + delivery number (6) + check digit
 *
 * @param text - 11 digits (check auto-calculated) or 12 digits (with check)
 * @returns Bar widths array (Interleaved 2 of 5 encoding)
 */
export function encodeIdentcode(text: string): number[] {
  const digits = text.replace(/\s/g, "");
  if (!/^\d+$/.test(digits)) {
    throw new InvalidInputError("Identcode only accepts digits");
  }

  let data: string;
  if (digits.length === 11) {
    data = digits + dpCheckDigit(digits);
  } else if (digits.length === 12) {
    data = digits;
  } else {
    throw new InvalidInputError("Identcode requires 11 or 12 digits");
  }

  return encodeITF(data);
}

/**
 * Encode Deutsche Post Leitcode (14 digits: 13 data + 1 check)
 * Structure: postal code (5) + street ID (3) + house number (3) + product code (2) + check digit
 *
 * @param text - 13 digits (check auto-calculated) or 14 digits (with check)
 * @returns Bar widths array (Interleaved 2 of 5 encoding)
 */
export function encodeLeitcode(text: string): number[] {
  const digits = text.replace(/\s/g, "");
  if (!/^\d+$/.test(digits)) {
    throw new InvalidInputError("Leitcode only accepts digits");
  }

  let data: string;
  if (digits.length === 13) {
    data = digits + dpCheckDigit(digits);
  } else if (digits.length === 14) {
    data = digits;
  } else {
    throw new InvalidInputError("Leitcode requires 13 or 14 digits");
  }

  return encodeITF(data);
}
