/**
 * Reed-Solomon error correction for QR codes
 * GF(256) arithmetic with primitive polynomial 0x11D
 */

// Galois Field GF(256) lookup tables
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

// Initialize GF(256) tables with primitive polynomial 0x11D
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x >= 256) x ^= 0x11d;
  }
  // Extend exp table for easier modular arithmetic
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

/** Multiply two GF(256) elements */
export function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!;
}

/** Generate error correction codewords for a data block */
export function generateECCodewords(data: number[], ecCount: number): number[] {
  // Build generator polynomial
  const gen: number[] = Array.from({ length: ecCount + 1 }, () => 0);
  gen[0] = 1;
  for (let i = 0; i < ecCount; i++) {
    // Multiply gen by (x - alpha^i)
    for (let j = gen.length - 1; j >= 1; j--) {
      gen[j] = gen[j - 1]! ^ gfMultiply(gen[j]!, GF_EXP[i]!);
    }
    gen[0] = gfMultiply(gen[0]!, GF_EXP[i]!);
  }

  // Polynomial division
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
 * Add error correction to data bytes
 * Handles block splitting, EC generation, and interleaving
 */
export function addErrorCorrection(
  dataBytes: number[],
  ecCodewordsPerBlock: number,
  group1Blocks: number,
  group1DataCW: number,
  group2Blocks: number,
  group2DataCW: number,
): number[] {
  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let pos = 0;

  // Group 1 blocks
  for (let b = 0; b < group1Blocks; b++) {
    const block = dataBytes.slice(pos, pos + group1DataCW);
    blocks.push(block);
    ecBlocks.push(generateECCodewords(block, ecCodewordsPerBlock));
    pos += group1DataCW;
  }

  // Group 2 blocks
  for (let b = 0; b < group2Blocks; b++) {
    const block = dataBytes.slice(pos, pos + group2DataCW);
    blocks.push(block);
    ecBlocks.push(generateECCodewords(block, ecCodewordsPerBlock));
    pos += group2DataCW;
  }

  // Interleave data codewords
  const result: number[] = [];
  const maxDataLen = Math.max(group1DataCW, group2DataCW);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]!);
    }
  }

  // Interleave EC codewords
  for (let i = 0; i < ecCodewordsPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) result.push(ec[i]!);
    }
  }

  return result;
}
