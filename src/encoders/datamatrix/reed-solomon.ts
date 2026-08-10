/**
 * Reed-Solomon error correction for Data Matrix ECC 200
 * Uses GF(256) with primitive polynomial 0x12D (x^8 + x^5 + x^3 + x^2 + 1)
 */

// Galois Field GF(256) lookup tables for polynomial 0x12D
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)

// Initialize GF(256) tables with primitive polynomial 0x12D
;(function initGF() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x = x << 1
    if (x >= 256) x ^= 0x12d
  }
  // Extend exp table for easier modular arithmetic
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!
  }
})()

/** Multiply two GF(256) elements */
function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!
}

/**
 * Generate Reed-Solomon error correction codewords for a single data block.
 *
 * @param data - Data codewords for one interleaved block
 * @param ecCount - Number of EC codewords to generate
 * @returns Array of EC codewords
 */
export function generateECCodewords(data: number[], ecCount: number): number[] {
  // Build generator polynomial per ISO 16022:
  // g(x) = (x - a^1)(x - a^2)...(x - a^ecCount)
  const gen: number[] = Array.from({ length: ecCount + 1 }, () => 0)
  gen[0] = 1

  for (let i = 1; i <= ecCount; i++) {
    for (let j = gen.length - 1; j >= 1; j--) {
      gen[j] = gen[j - 1]! ^ gfMultiply(gen[j]!, GF_EXP[i]!)
    }
    gen[0] = gfMultiply(gen[0]!, GF_EXP[i]!)
  }

  // Polynomial long division: data polynomial / generator polynomial
  // gen[0] = constant term, gen[ecCount] = leading coefficient (1)
  // Division needs coefficients in descending degree order
  const result = Array.from({ length: ecCount }, () => 0)
  for (const byte of data) {
    const lead = byte ^ result[0]!
    for (let j = 0; j < ecCount - 1; j++) {
      result[j] = result[j + 1]! ^ gfMultiply(lead, gen[ecCount - 1 - j]!)
    }
    result[ecCount - 1] = gfMultiply(lead, gen[0]!)
  }

  return result
}

/**
 * Generate error correction codewords for a complete Data Matrix symbol.
 *
 * ISO/IEC 16022 8.5 splits the larger symbols into Reed-Solomon blocks by
 * taking every nth codeword rather than a contiguous run of them, so that a
 * burst of damage is spread across the blocks instead of landing in one. The
 * error codewords are woven back the same way, after the data.
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
  const ecPerBlock = ecCodewordsTotal / interleavedBlocks
  const result = Array.from<number>({ length: ecCodewordsTotal }).fill(0)

  for (let block = 0; block < interleavedBlocks; block++) {
    const data: number[] = []
    for (let i = block; i < dataCodewords.length; i += interleavedBlocks) {
      data.push(dataCodewords[i]!)
    }
    const ec = generateECCodewords(data, ecPerBlock)
    for (let i = 0; i < ecPerBlock; i++) result[i * interleavedBlocks + block] = ec[i]!
  }

  return result
}
