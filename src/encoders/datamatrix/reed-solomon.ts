/**
 * Reed-Solomon error correction for Data Matrix ECC 200
 * Uses GF(256) with primitive polynomial 0x12D (x^8 + x^5 + x^3 + x^2 + 1)
 */

// Galois Field GF(256) lookup tables for polynomial 0x12D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

// Initialize GF(256) tables with primitive polynomial 0x12D
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x >= 256) x ^= 0x12d;
  }
  // Extend exp table for easier modular arithmetic
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

/** Multiply two GF(256) elements */
function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!;
}

/**
 * Generate Reed-Solomon error correction codewords for a single data block.
 *
 * @param data - Data codewords for one interleaved block
 * @param ecCount - Number of EC codewords to generate
 * @returns Array of EC codewords
 */
export function generateECCodewords(data: number[], ecCount: number): number[] {
  // Build generator polynomial
  // g(x) = (x - a^0)(x - a^1)...(x - a^(ecCount-1))
  const gen: number[] = Array.from({ length: ecCount + 1 }, () => 0);
  gen[0] = 1;

  for (let i = 0; i < ecCount; i++) {
    for (let j = gen.length - 1; j >= 1; j--) {
      gen[j] = gen[j - 1]! ^ gfMultiply(gen[j]!, GF_EXP[i]!);
    }
    gen[0] = gfMultiply(gen[0]!, GF_EXP[i]!);
  }

  // Polynomial long division: data polynomial / generator polynomial
  const result = Array.from({ length: ecCount }, () => 0);
  for (const byte of data) {
    const lead = byte ^ result[0]!;
    for (let j = 0; j < ecCount - 1; j++) {
      result[j] = result[j + 1]! ^ gfMultiply(lead, gen[j + 1]!);
    }
    result[ecCount - 1] = gfMultiply(lead, gen[ecCount]!);
  }

  return result;
}

/**
 * Generate error correction codewords for a complete Data Matrix symbol.
 * Handles block interleaving for larger symbols.
 *
 * @param dataCodewords - All data codewords (already padded to capacity)
 * @param ecCodewordsTotal - Total number of EC codewords for the symbol
 * @param interleavedBlocks - Number of interleaved blocks
 * @returns Array of EC codewords in interleaved order
 */
export function generateInterleavedEC(
  dataCodewords: number[],
  ecCodewordsTotal: number,
  interleavedBlocks: number,
): number[] {
  const ecPerBlock = ecCodewordsTotal / interleavedBlocks;
  const dataLength = dataCodewords.length;
  const baseBlockSize = Math.floor(dataLength / interleavedBlocks);
  const largerBlocks = dataLength % interleavedBlocks;

  // Split data into interleaved blocks
  const blocks: number[][] = [];
  let pos = 0;

  for (let b = 0; b < interleavedBlocks; b++) {
    // First (interleavedBlocks - largerBlocks) blocks get baseBlockSize codewords,
    // remaining largerBlocks blocks get baseBlockSize + 1
    const blockSize = b < interleavedBlocks - largerBlocks ? baseBlockSize : baseBlockSize + 1;
    blocks.push(dataCodewords.slice(pos, pos + blockSize));
    pos += blockSize;
  }

  // Generate EC for each block
  const ecBlocks: number[][] = [];
  for (const block of blocks) {
    ecBlocks.push(generateECCodewords(block, ecPerBlock));
  }

  // Interleave EC codewords
  const result: number[] = [];
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < interleavedBlocks; b++) {
      result.push(ecBlocks[b]![i]!);
    }
  }

  return result;
}
