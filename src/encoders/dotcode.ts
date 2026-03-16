/**
 * DotCode encoder (ISO/IEC 21471)
 * High-speed industrial 2D barcode for tobacco, pharma
 *
 * Structure:
 * - Rectangular grid of dots (not connected bars)
 * - Checkerboard-like pattern — only odd positions filled
 * - Variable size based on data
 * - GF(113) Reed-Solomon error correction
 */

import { InvalidInputError } from "../errors";

/**
 * Encode text as DotCode
 * Returns a 2D boolean matrix (true = dot present)
 */
export function encodeDotCode(text: string): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("DotCode input must not be empty");
  }

  // Encode data as codewords (simplified: ASCII encoding)
  const codewords: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code > 127) {
      // Extended: use shift + byte
      codewords.push(107); // binary shift
      codewords.push(code);
    } else {
      codewords.push(code);
    }
  }

  // Select symbol size
  // DotCode: width must be odd, height must be odd
  // Capacity ≈ (w * h) / 2 dots, each codeword = ~5 dots
  const totalCW = codewords.length;
  const ecCW = Math.max(4, Math.ceil(totalCW * 0.3)); // ~30% EC
  const neededDots = (totalCW + ecCW) * 5;
  const neededCells = neededDots * 2; // checkerboard = half filled

  // Find suitable dimensions
  let width = Math.max(7, Math.ceil(Math.sqrt(neededCells * 2.5)));
  if (width % 2 === 0) width++;
  let height = Math.max(5, Math.ceil(neededCells / width));
  if (height % 2 === 0) height++;

  // Pad codewords
  while (codewords.length < totalCW + ecCW) {
    codewords.push(109); // pad codeword
  }

  // Generate EC (simplified GF(113))
  const ec = dotcodeEC(codewords.slice(0, totalCW), ecCW);
  const allCW = [...codewords.slice(0, totalCW), ...ec];

  // Build matrix with checkerboard pattern
  const matrix: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  );

  // Place data dots in checkerboard positions
  let cwIdx = 0;
  let bitIdx = 0;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      // Checkerboard: only (r+c) % 2 === 0 positions can have dots
      if ((r + c) % 2 !== 0) continue;

      if (cwIdx < allCW.length) {
        // Each codeword contributes ~7 bits
        const bit = (allCW[cwIdx]! >> (6 - bitIdx)) & 1;
        matrix[r]![c] = bit === 1;
        bitIdx++;
        if (bitIdx >= 7) {
          bitIdx = 0;
          cwIdx++;
        }
      }
    }
  }

  return matrix;
}

/** Simplified DotCode EC over GF(113) */
function dotcodeEC(data: number[], ecCount: number): number[] {
  const GF = 113;
  const ec = Array.from({ length: ecCount }, () => 0);

  for (const byte of data) {
    const feedback = (byte + ec[0]!) % GF;
    for (let j = 0; j < ecCount - 1; j++) {
      ec[j] = (ec[j + 1]! + feedback * (j + 2)) % GF;
    }
    ec[ecCount - 1] = (feedback * (ecCount + 1)) % GF;
  }

  return ec;
}
