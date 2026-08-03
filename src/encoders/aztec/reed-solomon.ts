/**
 * Reed-Solomon error correction for Aztec Code
 *
 * Aztec uses variable Galois Field sizes depending on symbol layers:
 *   GF(64)   / 6-bit:  layers 1-2
 *   GF(256)  / 8-bit:  layers 3-8
 *   GF(1024) / 10-bit: layers 9-22
 *   GF(4096) / 12-bit: layers 23-32
 *
 * Mode message always uses GF(16) / 4-bit.
 *
 * Primitive polynomials:
 *   GF(16):   x^4  + x + 1                     (0x13)
 *   GF(64):   x^6  + x + 1                     (0x43)
 *   GF(256):  x^8  + x^5 + x^3 + x^2 + 1      (0x12D)
 *   GF(1024): x^10 + x^3 + 1                   (0x409)
 *   GF(4096): x^12 + x^6 + x^4 + x + 1        (0x1069)
 */

import { GF_POLY } from "./tables";

// ---------------------------------------------------------------------------
// Galois Field arithmetic
// ---------------------------------------------------------------------------

interface GFTables {
  exp: number[];
  log: number[];
  size: number; // 2^wordSize
  max: number; // size - 1
}

/** Cache of initialized GF tables keyed by word size */
const gfCache = new Map<number, GFTables>();

/** Initialize or retrieve GF lookup tables for a given word size */
function getGF(wordSize: number): GFTables {
  const cached = gfCache.get(wordSize);
  if (cached) return cached;

  const poly = GF_POLY[wordSize];
  if (poly === undefined) {
    throw new Error(`No primitive polynomial defined for GF(2^${wordSize})`);
  }

  const size = 1 << wordSize;
  const max = size - 1;
  const exp = Array.from<number>({ length: size * 2 });
  const log = Array.from<number>({ length: size }).fill(0);

  let x = 1;
  for (let i = 0; i < max; i++) {
    exp[i] = x;
    log[x] = i;
    x = x << 1;
    if (x >= size) x ^= poly;
  }
  // Extend exp table for easier modular arithmetic
  for (let i = max; i < size * 2; i++) {
    exp[i] = exp[i - max]!;
  }

  const tables: GFTables = { exp, log, size, max };
  gfCache.set(wordSize, tables);
  return tables;
}

/** Multiply two GF elements */
function gfMul(gf: GFTables, a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return gf.exp[(gf.log[a]! + gf.log[b]!) % gf.max]!;
}

// ---------------------------------------------------------------------------
// Reed-Solomon encoding
// ---------------------------------------------------------------------------

/**
 * Generate Reed-Solomon error correction codewords.
 *
 * @param data - Data codewords (values within GF(2^wordSize))
 * @param ecCount - Number of error correction codewords to generate
 * @param wordSize - Codeword size in bits (4, 6, 8, 10, or 12)
 * @returns Array of `ecCount` error correction codewords
 */
export function rsEncode(data: number[], ecCount: number, wordSize: number): number[] {
  const gf = getGF(wordSize);

  // Build generator polynomial: g(x) = (x - a^1)(x - a^2)...(x - a^ecCount)
  // Aztec RS uses roots starting at a^1, not a^0.
  // Coefficients stored in descending degree: gen[0]*x^n + gen[1]*x^(n-1) + ... + gen[n]
  let gen = [1];
  for (let i = 1; i <= ecCount; i++) {
    const root = gf.exp[i]!;
    const newGen = Array.from<number>({ length: gen.length + 1 }).fill(0);
    for (let j = 0; j < gen.length; j++) {
      newGen[j] ^= gen[j]!;
      newGen[j + 1] ^= gfMul(gf, gen[j]!, root);
    }
    gen = newGen;
  }

  // Polynomial long division: (data * x^ecCount) mod gen
  // Create dividend = data codewords followed by ecCount zeros
  const dividend = [...data, ...Array.from<number>({ length: ecCount }).fill(0)];

  for (let i = 0; i < data.length; i++) {
    if (dividend[i] !== 0) {
      const coeff = dividend[i]!;
      for (let j = 0; j < gen.length; j++) {
        dividend[i + j] ^= gfMul(gf, coeff, gen[j]!);
      }
    }
  }

  // The remainder is the last ecCount entries of the dividend
  return dividend.slice(data.length);
}

/**
 * Generate check words (combined data + EC) as a bit array.
 *
 * This matches the ZXing generateCheckWords approach:
 * 1. Convert stuffed data bits into codewords (first N positions of a totalWords array).
 * 2. RS-encode in place (filling remaining positions with EC codewords).
 * 3. Output startPad zero bits + all codewords as bits.
 *
 * @param stuffedBits - Stuffed data bit array
 * @param totalBits - Total bit capacity for the symbol
 * @param wordSize - Codeword size in bits
 * @returns Bit array of length totalBits containing data + EC
 */
export function generateCheckWords(
  stuffedBits: number[],
  totalBits: number,
  wordSize: number,
): number[] {
  const messageSizeInWords = Math.floor(stuffedBits.length / wordSize);
  const totalWords = Math.floor(totalBits / wordSize);

  // Convert stuffed bits to codewords (first messageSizeInWords positions filled)
  const messageWords = Array.from<number>({ length: totalWords }).fill(0);
  for (let i = 0; i < messageSizeInWords; i++) {
    let value = 0;
    for (let j = 0; j < wordSize; j++) {
      value |= (stuffedBits[i * wordSize + j]! ? 1 : 0) << (wordSize - j - 1);
    }
    messageWords[i] = value;
  }

  // RS-encode: fills positions messageSizeInWords..totalWords-1 with EC
  const ecCount = totalWords - messageSizeInWords;
  const ec = rsEncode(messageWords.slice(0, messageSizeInWords), ecCount, wordSize);
  for (let i = 0; i < ecCount; i++) {
    messageWords[messageSizeInWords + i] = ec[i]!;
  }

  // Convert to bits with startPad
  const startPad = totalBits % wordSize;
  const result: number[] = [];

  // Add padding zeros at the start
  for (let i = 0; i < startPad; i++) {
    result.push(0);
  }

  // Add all codewords as bits
  for (const cw of messageWords) {
    for (let b = wordSize - 1; b >= 0; b--) {
      result.push((cw >> b) & 1);
    }
  }

  return result;
}

/**
 * Encode the compact mode message with Reed-Solomon.
 *
 * Compact mode message: 2 data codewords + 5 check codewords, all 4-bit (28 bits total).
 * Data: 2 bits (layers-1) + 6 bits (dataCW-1), split into two 4-bit words.
 *
 * @param layers - Number of layers (1-4)
 * @param dataCodewords - Number of data codewords in the symbol
 * @returns 28-bit array (MSB first)
 */
export function encodeCompactModeMessage(layers: number, dataCodewords: number): number[] {
  const val = ((layers - 1) << 6) | (dataCodewords - 1);
  const cw0 = (val >> 4) & 0x0f;
  const cw1 = val & 0x0f;

  const ec = rsEncode([cw0, cw1], 5, 4);

  // Convert all 7 codewords to a 28-bit array
  const bits: number[] = [];
  for (const cw of [cw0, cw1, ...ec]) {
    for (let b = 3; b >= 0; b--) {
      bits.push((cw >> b) & 1);
    }
  }
  return bits;
}

/**
 * Encode the full-range mode message with Reed-Solomon.
 * Full: 5 bits layers + 11 bits data word count → 16 data bits.
 * Encoded with RS over GF(16):
 *   4 data codewords of 4 bits = 16 bits
 *   6 check codewords of 4 bits = 24 bits
 *   Total: 10 codewords = 40 bits
 *
 * @param layers - Number of layers (1-32)
 * @param dataCodewords - Number of data codewords in the symbol
 * @returns 40-bit array (MSB first)
 */
export function encodeFullModeMessage(layers: number, dataCodewords: number): number[] {
  // Pack 16 bits: 5 bits (layers-1) + 11 bits (dataCW-1)
  const val = ((layers - 1) << 11) | (dataCodewords - 1);
  const cw0 = (val >> 12) & 0x0f;
  const cw1 = (val >> 8) & 0x0f;
  const cw2 = (val >> 4) & 0x0f;
  const cw3 = val & 0x0f;

  const ec = rsEncode([cw0, cw1, cw2, cw3], 6, 4);

  // Convert all 10 codewords to a 40-bit array
  const bits: number[] = [];
  for (const cw of [cw0, cw1, cw2, cw3, ...ec]) {
    for (let b = 3; b >= 0; b--) {
      bits.push((cw >> b) & 1);
    }
  }
  return bits;
}
