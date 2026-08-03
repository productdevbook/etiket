/**
 * USPS Intelligent Mail barcode (IMb / OneCode / USPS4CB) encoder
 * 65-bar 4-state barcode per USPS-B-3200
 *
 * Encodes: 20-digit tracking code + optional routing code (0/5/9/11 digits)
 * Output: Array of 65 bar states (FourState: T/A/D/F)
 */

import { InvalidInputError } from "../errors";
import type { FourState } from "./fourstate";

/**
 * Bar construction table from USPS-B-3200 Appendix (Table 22)
 * Each entry: [descender_character, descender_bit, ascender_character, ascender_bit]
 * Characters A-J map to indices 0-9
 */
// prettier-ignore
const BAR_TABLE: [number, number, number, number][] = [
  [7,  2,   4,  3],  // bar 1:  H 2  E 3
  [1, 10,   0,  0],  // bar 2:  B 10 A 0
  [9, 12,   2,  8],  // bar 3:  J 12 C 8
  [5,  5,   6, 11],  // bar 4:  F 5  G 11
  [8,  9,   3,  1],  // bar 5:  I 9  D 1
  [0,  1,   5, 12],  // bar 6:  A 1  F 12
  [2,  5,   1,  8],  // bar 7:  C 5  B 8
  [4,  4,   9, 11],  // bar 8:  E 4  J 11
  [6,  3,   8, 10],  // bar 9:  G 3  I 10
  [3,  9,   7,  6],  // bar 10: D 9  H 6
  [5, 11,   1,  4],  // bar 11: F 11 B 4
  [8,  5,   2, 12],  // bar 12: I 5  C 12
  [9, 10,   0,  2],  // bar 13: J 10 A 2
  [7,  1,   6,  7],  // bar 14: H 1  G 7
  [3,  6,   4,  9],  // bar 15: D 6  E 9
  [0,  3,   8,  6],  // bar 16: A 3  I 6
  [6,  4,   2,  7],  // bar 17: G 4  C 7
  [1,  1,   9,  9],  // bar 18: B 1  J 9
  [7, 10,   5,  2],  // bar 19: H 10 F 2
  [4,  0,   3,  8],  // bar 20: E 0  D 8
  [6,  2,   0,  4],  // bar 21: G 2  A 4
  [8, 11,   1,  0],  // bar 22: I 11 B 0
  [9,  8,   3, 12],  // bar 23: J 8  D 12
  [2,  6,   7,  7],  // bar 24: C 6  H 7
  [5,  1,   4, 10],  // bar 25: F 1  E 10
  [1, 12,   6,  9],  // bar 26: B 12 G 9
  [7,  3,   8,  0],  // bar 27: H 3  I 0
  [5,  8,   9,  7],  // bar 28: F 8  J 7
  [4,  6,   2, 10],  // bar 29: E 6  C 10
  [3,  4,   0,  5],  // bar 30: D 4  A 5
  [8,  4,   5,  7],  // bar 31: I 4  F 7
  [7, 11,   1,  9],  // bar 32: H 11 B 9
  [6,  0,   9,  6],  // bar 33: G 0  J 6
  [0,  6,   4,  8],  // bar 34: A 6  E 8
  [2,  1,   3,  2],  // bar 35: C 1  D 2
  [5,  9,   8, 12],  // bar 36: F 9  I 12
  [4, 11,   6,  1],  // bar 37: E 11 G 1
  [9,  5,   7,  4],  // bar 38: J 5  H 4
  [3,  3,   1,  2],  // bar 39: D 3  B 2
  [0,  7,   2,  0],  // bar 40: A 7  C 0
  [1,  3,   4,  1],  // bar 41: B 3  E 1
  [6, 10,   3,  5],  // bar 42: G 10 D 5
  [8,  7,   9,  4],  // bar 43: I 7  J 4
  [2, 11,   5,  6],  // bar 44: C 11 F 6
  [0,  8,   7, 12],  // bar 45: A 8  H 12
  [4,  2,   8,  1],  // bar 46: E 2  I 1
  [5, 10,   3,  0],  // bar 47: F 10 D 0
  [9,  3,   0,  9],  // bar 48: J 3  A 9
  [6,  5,   2,  4],  // bar 49: G 5  C 4
  [7,  8,   1,  7],  // bar 50: H 8  B 7
  [5,  0,   4,  5],  // bar 51: F 0  E 5
  [2,  3,   0, 10],  // bar 52: C 3  A 10
  [6, 12,   9,  2],  // bar 53: G 12 J 2
  [3, 11,   1,  6],  // bar 54: D 11 B 6
  [8,  8,   7,  9],  // bar 55: I 8  H 9
  [5,  4,   0, 11],  // bar 56: F 4  A 11
  [1,  5,   2,  2],  // bar 57: B 5  C 2
  [9,  1,   4, 12],  // bar 58: J 1  E 12
  [8,  3,   6,  6],  // bar 59: I 3  G 6
  [7,  0,   3,  7],  // bar 60: H 0  D 7
  [4,  7,   7,  5],  // bar 61: E 7  H 5
  [0, 12,   1, 11],  // bar 62: A 12 B 11
  [2,  9,   9,  0],  // bar 63: C 9  J 0
  [6,  8,   5,  3],  // bar 64: G 8  F 3
  [3, 10,   8,  2],  // bar 65: D 10 I 2
];

/**
 * Build the N-of-13 lookup table used to convert codewords to characters.
 * For n=5: 1287 entries (C(13,5) = 1287). For n=2: 78 entries (C(13,2) = 78).
 *
 * The table maps codeword indices to 13-bit patterns with exactly n bits set.
 * Palindromic (bit-reverse-symmetric) patterns go at the end, non-palindromic
 * pairs go at the beginning (forward, then reverse).
 */
function initNOf13Table(n: number, tableLength: number): number[] {
  const table: number[] = Array.from({ length: tableLength });
  let lo = 0;
  let hi = tableLength - 1;

  for (let i = 0; i < 8192; i++) {
    // Count number of 1-bits
    let bitCount = 0;
    let tmp = i;
    while (tmp) {
      bitCount += tmp & 1;
      tmp >>>= 1;
    }
    if (bitCount !== n) continue;

    // Compute 13-bit reversal
    let rev = 0;
    tmp = i;
    for (let b = 0; b < 13; b++) {
      rev = (rev << 1) | (tmp & 1);
      tmp >>>= 1;
    }

    // Skip if we already visited this pair (reverse < forward)
    if (rev < i) continue;

    if (i === rev) {
      // Palindromic: place at end
      table[hi] = i;
      hi--;
    } else {
      // Non-palindromic: place forward then reverse
      table[lo] = i;
      lo++;
      table[lo] = rev;
      lo++;
    }
  }

  return table;
}

// Pre-compute the character lookup tables
const TABLE_5_OF_13 = initNOf13Table(5, 1287);
const TABLE_2_OF_13 = initNOf13Table(2, 78);

/**
 * Encode USPS Intelligent Mail barcode
 *
 * @param trackingCode - 20-digit tracking code (barcode ID + service type + mailer ID + serial)
 * @param routingCode - ZIP code: empty (0 digits), ZIP5 (5 digits), ZIP+4 (9 digits), or delivery point (11 digits)
 * @returns Array of 65 FourState values
 */
export function encodeIMb(trackingCode: string, routingCode: string = ""): FourState[] {
  const track = trackingCode.replace(/\s/g, "");
  const route = routingCode.replace(/[\s-]/g, "");

  if (!/^\d{20}$/.test(track)) {
    throw new InvalidInputError("IMb tracking code must be exactly 20 digits");
  }
  if (route.length !== 0 && route.length !== 5 && route.length !== 9 && route.length !== 11) {
    throw new InvalidInputError("IMb routing code must be 0, 5, 9, or 11 digits");
  }
  if (route.length > 0 && !/^\d+$/.test(route)) {
    throw new InvalidInputError("IMb routing code must contain only digits");
  }

  // Step 1: Convert routing code + tracking code to binary value
  let binary = convertRoutingCode(route);
  binary = convertTrackingCode(binary, track);

  // Step 2: CRC-11 Frame Check Sequence
  const fcs = crc11(binary);

  // Step 3: Convert to 10 codewords
  const codewords = binaryToCodewords(binary);

  // Step 4: Integrate FCS into codewords
  // Double cw[9] for orientation detection
  codewords[9]! *= 2;
  // If FCS bit 10 is set, add 659 to cw[0]
  if (fcs & (1 << 10)) {
    codewords[0]! += 659;
  }

  // Step 5: Convert codewords to 13-bit characters using lookup tables
  const characters: number[] = Array.from({ length: 10 });
  for (let i = 0; i < 10; i++) {
    const cw = codewords[i]!;
    if (cw <= 1286) {
      characters[i] = TABLE_5_OF_13[cw]!;
    } else {
      characters[i] = TABLE_2_OF_13[cw - 1287]!;
    }
  }

  // Step 6: Apply FCS bits to flip characters (XOR with 0x1FFF)
  for (let i = 0; i < 10; i++) {
    if (fcs & (1 << i)) {
      characters[i]! ^= 0x1fff;
    }
  }

  // Step 7: Map characters to 65 bars using bar construction table
  const bars: FourState[] = Array.from({ length: 65 });
  for (let i = 0; i < 65; i++) {
    const [descChar, descBit, ascChar, ascBit] = BAR_TABLE[i]!;
    const ascend = (characters[ascChar]! & (1 << ascBit)) !== 0;
    const descend = (characters[descChar]! & (1 << descBit)) !== 0;

    if (ascend && descend) {
      bars[i] = "F";
    } else if (ascend) {
      bars[i] = "A";
    } else if (descend) {
      bars[i] = "D";
    } else {
      bars[i] = "T";
    }
  }

  return bars;
}

/** Convert routing code to initial binary value per USPS-B-3200 */
function convertRoutingCode(route: string): bigint {
  if (route.length === 0) return 0n;
  if (route.length === 5) return BigInt(route) + 1n;
  if (route.length === 9) return BigInt(route) + 100001n;
  // route.length === 11
  return BigInt(route) + 1000100001n;
}

/** Encode tracking code into binary value digit by digit per USPS-B-3200 */
function convertTrackingCode(binary: bigint, track: string): bigint {
  binary = binary * 10n + BigInt(track[0]!);
  binary = binary * 5n + BigInt(track[1]!);
  for (let i = 2; i < 20; i++) {
    binary = binary * 10n + BigInt(track[i]!);
  }
  return binary;
}

/**
 * CRC-11 Frame Check Sequence per USPS-B-3200
 * Polynomial: x^11 + x^9 + x^8 + x^7 + x^5 + x^4 + x + 1 = 0x0F35
 * Computed over 13 bytes (104 bits, with top 2 bits unused) of the binary value.
 */
function crc11(value: bigint): number {
  // Convert to 13 bytes (big-endian)
  const bytes: number[] = Array.from({ length: 13 });
  let v = value;
  for (let i = 12; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }

  const genPoly = 0x0f35;
  let fcs = 0x07ff; // initial value: all 11 bits set

  // Process first byte: skip the 2 most significant bits (only 6 bits used)
  let data = bytes[0]! << 5;
  for (let bit = 2; bit < 8; bit++) {
    if ((fcs ^ data) & 0x400) {
      fcs = (fcs << 1) ^ genPoly;
    } else {
      fcs = fcs << 1;
    }
    fcs &= 0x7ff;
    data <<= 1;
  }

  // Process remaining 12 bytes (all 8 bits each)
  for (let byteIdx = 1; byteIdx < 13; byteIdx++) {
    data = bytes[byteIdx]! << 3;
    for (let bit = 0; bit < 8; bit++) {
      if ((fcs ^ data) & 0x400) {
        fcs = (fcs << 1) ^ genPoly;
      } else {
        fcs = fcs << 1;
      }
      fcs &= 0x7ff;
      data <<= 1;
    }
  }

  return fcs;
}

/** Convert binary value to 10 codewords per USPS-B-3200 */
function binaryToCodewords(value: bigint): number[] {
  const codewords: number[] = Array.from({ length: 10 });
  let remaining = value;

  // Extract from LSB: cw[9] is base 636, cw[8..1] are base 1365, cw[0] is remainder
  codewords[9] = Number(remaining % 636n);
  remaining = remaining / 636n;

  for (let i = 8; i >= 1; i--) {
    codewords[i] = Number(remaining % 1365n);
    remaining = remaining / 1365n;
  }

  codewords[0] = Number(remaining);

  return codewords;
}
