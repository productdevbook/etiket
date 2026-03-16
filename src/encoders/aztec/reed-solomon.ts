/**
 * Reed-Solomon error correction for Aztec Code
 *
 * Aztec uses variable Galois Field sizes depending on symbol layers:
 *   GF(16)   / 4-bit:  compact layer 1
 *   GF(64)   / 6-bit:  compact layers 2-4, full layers 1-2
 *   GF(256)  / 8-bit:  full layers 3-8
 *   GF(1024) / 10-bit: full layers 9-22
 *   GF(4096) / 12-bit: full layers 23-32
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

  // Build generator polynomial: g(x) = (x - a^0)(x - a^1)...(x - a^(ecCount-1))
  const gen = Array.from<number>({ length: ecCount + 1 }).fill(0);
  gen[0] = 1;

  for (let i = 0; i < ecCount; i++) {
    for (let j = gen.length - 1; j >= 1; j--) {
      gen[j] = gen[j - 1]! ^ gfMul(gf, gen[j]!, gf.exp[i]!);
    }
    gen[0] = gfMul(gf, gen[0]!, gf.exp[i]!);
  }

  // Polynomial long division: data polynomial / generator polynomial
  const result = Array.from<number>({ length: ecCount }).fill(0);
  for (const cw of data) {
    const lead = cw ^ result[0]!;
    for (let j = 0; j < ecCount - 1; j++) {
      result[j] = result[j + 1]! ^ gfMul(gf, lead, gen[j + 1]!);
    }
    result[ecCount - 1] = gfMul(gf, lead, gen[ecCount]!);
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
