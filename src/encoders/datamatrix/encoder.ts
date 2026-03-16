/**
 * Data Matrix data encoder — ASCII encoding mode
 * Converts input text into data codewords per ISO/IEC 16022
 */

import { InvalidInputError } from "../../errors";

/**
 * Encode text into Data Matrix data codewords using ASCII encoding.
 *
 * ASCII encoding rules:
 * - ASCII values 0-127: codeword = value + 1
 * - Digit pairs "00"-"99": codeword = pair_value + 130 (single codeword for two digits)
 * - Extended ASCII 128-255: codeword 235 (Upper Shift) followed by value - 127
 */
export function encodeASCII(text: string): number[] {
  const codewords: number[] = [];
  let i = 0;

  while (i < text.length) {
    const charCode = text.charCodeAt(i);

    if (charCode > 255) {
      throw new InvalidInputError(
        `Data Matrix ASCII mode does not support character: "${text[i]}" (U+${charCode.toString(16).padStart(4, "0")})`,
      );
    }

    // Check for digit pair optimization
    if (
      charCode >= 48 &&
      charCode <= 57 && // current char is '0'-'9'
      i + 1 < text.length &&
      text.charCodeAt(i + 1) >= 48 &&
      text.charCodeAt(i + 1) <= 57 // next char is '0'-'9'
    ) {
      const pairValue = (charCode - 48) * 10 + (text.charCodeAt(i + 1) - 48);
      codewords.push(pairValue + 130);
      i += 2;
    } else if (charCode >= 128) {
      // Extended ASCII: Upper Shift + (value - 127)
      codewords.push(235);
      codewords.push(charCode - 127);
      i++;
    } else {
      // Standard ASCII: value + 1
      codewords.push(charCode + 1);
      i++;
    }
  }

  return codewords;
}

/**
 * Pad data codewords to fill the symbol capacity.
 * Uses pad value 129 with the 253-state randomization algorithm.
 */
export function padCodewords(codewords: number[], capacity: number): number[] {
  const padded = [...codewords];

  if (padded.length < capacity) {
    // First pad codeword is always 129
    padded.push(129);
  }

  // Remaining pad codewords use the 253-state randomization
  while (padded.length < capacity) {
    const position = padded.length + 1; // 1-based position
    const randomized = randomizePad(129, position);
    padded.push(randomized);
  }

  return padded;
}

/**
 * 253-state randomization algorithm for pad codewords.
 * Ensures pad values appear pseudo-random to avoid false patterns.
 */
function randomizePad(padValue: number, position: number): number {
  const pseudoRandom = ((149 * position) % 253) + 1;
  const result = padValue + pseudoRandom;
  return result <= 254 ? result : result - 254;
}

// C40 character set values
// Set 0 (basic): space=3, 0-9=4-13, A-Z=14-39
// Set 1 (shift 1): control chars 0-31
// Set 2 (shift 2): !"#$%&'()*+,-./:;<=>?@[\]^_
// Set 3 (shift 3): `a-z{|}~DEL
function c40Value(ch: number): { set: number; value: number } {
  if (ch === 32) return { set: 0, value: 3 }; // space
  if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 }; // 0-9
  if (ch >= 65 && ch <= 90) return { set: 0, value: ch - 65 + 14 }; // A-Z
  if (ch >= 0 && ch <= 31) return { set: 1, value: ch }; // control
  if (ch >= 33 && ch <= 47) return { set: 2, value: ch - 33 }; // !"#$%&'()*+,-./
  if (ch >= 58 && ch <= 64) return { set: 2, value: ch - 58 + 15 }; // :;<=>?@
  if (ch >= 91 && ch <= 95) return { set: 2, value: ch - 91 + 22 }; // [\]^_
  if (ch >= 96 && ch <= 127) return { set: 3, value: ch - 96 }; // `a-z{|}~
  return { set: -1, value: 0 }; // not C40 encodable
}

// Text mode: same as C40 but swaps upper/lowercase
function textValue(ch: number): { set: number; value: number } {
  if (ch === 32) return { set: 0, value: 3 };
  if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 };
  if (ch >= 97 && ch <= 122) return { set: 0, value: ch - 97 + 14 }; // a-z in basic set
  if (ch >= 0 && ch <= 31) return { set: 1, value: ch };
  if (ch >= 33 && ch <= 47) return { set: 2, value: ch - 33 };
  if (ch >= 58 && ch <= 64) return { set: 2, value: ch - 58 + 15 };
  if (ch >= 91 && ch <= 95) return { set: 2, value: ch - 91 + 22 };
  if (ch === 96) return { set: 3, value: 0 }; // backtick
  if (ch >= 65 && ch <= 90) return { set: 3, value: ch - 65 + 1 }; // A-Z in shift 3
  if (ch >= 123 && ch <= 127) return { set: 3, value: ch - 123 + 27 };
  return { set: -1, value: 0 };
}

/**
 * Encode text using C40 mode (efficient for uppercase + digits)
 * 3 characters → 2 codewords
 * Latch: codeword 230
 */
export function encodeC40(text: string): number[] {
  return encodeC40Text(text, 230, c40Value);
}

/**
 * Encode text using Text mode (efficient for lowercase + digits)
 * 3 characters → 2 codewords
 * Latch: codeword 239
 */
export function encodeTextMode(text: string): number[] {
  return encodeC40Text(text, 239, textValue);
}

function encodeC40Text(
  text: string,
  latchCW: number,
  valueFn: (ch: number) => { set: number; value: number },
): number[] {
  const codewords: number[] = [latchCW]; // Latch to C40/Text
  const values: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    const { set, value } = valueFn(ch);
    if (set === -1) {
      // Fall back to ASCII for this character — unlatch
      // For simplicity, encode rest as ASCII
      codewords.push(254); // Unlatch to ASCII
      const remaining = text.substring(i);
      codewords.push(...encodeASCII(remaining));
      return codewords;
    }
    if (set > 0) {
      values.push(set - 1); // Shift indicator (0=shift1, 1=shift2, 2=shift3)
      values.push(value);
    } else {
      values.push(value);
    }
  }

  // Pack triplets into codeword pairs
  let i = 0;
  while (i + 2 < values.length) {
    const v = values[i]! * 1600 + values[i + 1]! * 40 + values[i + 2]! + 1;
    codewords.push(Math.floor(v / 256));
    codewords.push(v % 256);
    i += 3;
  }

  // Handle remaining 1 or 2 values — unlatch to ASCII
  if (i < values.length) {
    codewords.push(254); // Unlatch
  }

  return codewords;
}

/**
 * Auto-select best encoding mode for the given text
 * Returns the most efficient encoding
 */
export function encodeAuto(text: string): number[] {
  // Count uppercase vs lowercase to decide
  let upper = 0;
  let lower = 0;
  let digits = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) upper++;
    else if (c >= 97 && c <= 122) lower++;
    else if (c >= 48 && c <= 57) digits++;
  }

  // C40 is best for uppercase-heavy, Text for lowercase-heavy
  const asciiCW = encodeASCII(text);

  if (upper + digits > text.length * 0.6) {
    const c40CW = encodeC40(text);
    if (c40CW.length < asciiCW.length) return c40CW;
  }

  if (lower + digits > text.length * 0.6) {
    const textCW = encodeTextMode(text);
    if (textCW.length < asciiCW.length) return textCW;
  }

  return asciiCW;
}
