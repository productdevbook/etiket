/**
 * QR Code encoding modes - detection and encoding
 */

import { ALPHANUMERIC_CHARS } from "./tables";

/** Check if a string can be encoded in numeric mode */
export function isNumeric(text: string): boolean {
  return /^\d+$/.test(text);
}

/** Check if a string can be encoded in alphanumeric mode */
export function isAlphanumeric(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (ALPHANUMERIC_CHARS.indexOf(text[i]!) === -1) return false;
  }
  return true;
}

/** Check if a string can be encoded in Kanji mode (Shift JIS double-byte) */
export function isKanji(_text: string): boolean {
  // Kanji detection requires checking Shift JIS encoding ranges
  // For now, return false - users can explicitly set kanji mode
  return false;
}

/** Auto-detect the best encoding mode for the given text */
export function detectMode(text: string): "numeric" | "alphanumeric" | "byte" | "kanji" {
  if (isNumeric(text)) return "numeric";
  if (isAlphanumeric(text)) return "alphanumeric";
  return "byte";
}

/** Get alphanumeric character value (0-44) */
export function getAlphanumericValue(char: string): number {
  const idx = ALPHANUMERIC_CHARS.indexOf(char);
  if (idx === -1) throw new Error(`Invalid alphanumeric character: ${char}`);
  return idx;
}

/** Encode numeric data to bits */
export function encodeNumericData(text: string): number[] {
  const bits: number[] = [];
  let i = 0;

  // Process groups of 3 digits -> 10 bits
  while (i + 2 < text.length) {
    const val = Number.parseInt(text.substring(i, i + 3), 10);
    pushBits(bits, val, 10);
    i += 3;
  }

  // Remaining 2 digits -> 7 bits
  if (i + 1 < text.length) {
    const val = Number.parseInt(text.substring(i, i + 2), 10);
    pushBits(bits, val, 7);
    i += 2;
  }

  // Remaining 1 digit -> 4 bits
  if (i < text.length) {
    const val = Number.parseInt(text[i]!, 10);
    pushBits(bits, val, 4);
  }

  return bits;
}

/** Encode alphanumeric data to bits */
export function encodeAlphanumericData(text: string): number[] {
  const bits: number[] = [];
  let i = 0;

  // Process pairs -> 11 bits each
  while (i + 1 < text.length) {
    const val = getAlphanumericValue(text[i]!) * 45 + getAlphanumericValue(text[i + 1]!);
    pushBits(bits, val, 11);
    i += 2;
  }

  // Remaining single character -> 6 bits
  if (i < text.length) {
    pushBits(bits, getAlphanumericValue(text[i]!), 6);
  }

  return bits;
}

/** Encode byte data to bits */
export function encodeByteData(data: Uint8Array): number[] {
  const bits: number[] = [];
  for (const byte of data) {
    pushBits(bits, byte, 8);
  }
  return bits;
}

/**
 * Encode Kanji data to bits (13 bits per character)
 * Input must be pre-converted to Shift JIS double-byte values
 */
export function encodeKanjiData(sjisValues: number[]): number[] {
  const bits: number[] = [];
  for (const code of sjisValues) {
    let adjusted: number;
    if (code >= 0x8140 && code <= 0x9ffc) {
      adjusted = code - 0x8140;
    } else if (code >= 0xe040 && code <= 0xebbf) {
      adjusted = code - 0xc140;
    } else {
      throw new Error(`Invalid Shift JIS kanji value: 0x${code.toString(16)}`);
    }
    const hi = (adjusted >> 8) & 0xff;
    const lo = adjusted & 0xff;
    const value = hi * 0xc0 + lo;
    pushBits(bits, value, 13);
  }
  return bits;
}

/**
 * Convert a Unicode string to Shift JIS double-byte values for Kanji encoding.
 * This is a simplified mapping — covers common CJK characters.
 * For full support, a complete Unicode-to-SJIS table would be needed.
 */
export function unicodeToShiftJIS(text: string): number[] {
  const values: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Simple mapping for common ranges
    // Full SJIS mapping would require a large lookup table
    // For now, encode the code point directly if in Kanji range
    if (code >= 0x3000 && code <= 0x9fff) {
      // Approximate mapping: many CJK characters fall in SJIS 0x8140-0x9FFC range
      // This is a simplification — production use would need a full mapping table
      const sjis = 0x8140 + (code - 0x3000);
      if (sjis <= 0x9ffc) {
        values.push(sjis);
      } else {
        values.push(0xe040 + (code - 0x3000 - (0x9ffc - 0x8140)));
      }
    } else {
      throw new Error(`Character U+${code.toString(16)} cannot be encoded as Kanji`);
    }
  }
  return values;
}

/** Push a value as the specified number of bits (MSB first) */
export function pushBits(arr: number[], value: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) {
    arr.push((value >> i) & 1);
  }
}
