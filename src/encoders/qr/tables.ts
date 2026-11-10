/**
 * QR Code lookup tables for versions 1-40, all EC levels
 * Based on ISO/IEC 18004:2015
 */

import type { ErrorCorrectionLevel } from "./types"

/**
 * Character count indicator bit lengths by version group and mode
 * [V1-9, V10-26, V27-40]
 */
export const CHAR_COUNT_BITS: Record<string, [number, number, number]> = {
  numeric: [10, 12, 14],
  alphanumeric: [9, 11, 13],
  byte: [8, 16, 16],
  kanji: [8, 10, 12],
}

/** Get character count bits for a version and mode */
export function getCharCountBits(version: number, mode: string): number {
  const bits = CHAR_COUNT_BITS[mode]
  if (!bits) return 8
  if (version <= 9) return bits[0]
  if (version <= 26) return bits[1]
  return bits[2]
}

/**
 * Alphanumeric character values
 */
export const ALPHANUMERIC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"

/**
 * Error correction block information for each version and EC level
 * Format: [totalCodewords, ecCodewordsPerBlock, group1Blocks, group1DataCW, group2Blocks, group2DataCW]
 */
interface ECBlockInfo {
  totalDataCodewords: number
  ecCodewordsPerBlock: number
  group1Blocks: number
  group1DataCW: number
  group2Blocks: number
  group2DataCW: number
}

/**
 * [ecCodewordsPerBlock, group1Blocks, group1DataCW, group2Blocks] for versions 1-40,
 * one row per EC level. A group 2 block holds one more data codeword than a group 1
 * block, and the total follows from the rest.
 */
// prettier-ignore
const EC_TABLE: Record<ErrorCorrectionLevel, number[][]> = {
  L: [
    [],
    [7, 1, 19, 0],
    [10, 1, 34, 0],
    [15, 1, 55, 0],
    [20, 1, 80, 0],
    [26, 1, 108, 0],
    [18, 2, 68, 0],
    [20, 2, 78, 0],
    [24, 2, 97, 0],
    [30, 2, 116, 0],
    [18, 2, 68, 2],
    [20, 4, 81, 0],
    [24, 2, 92, 2],
    [26, 4, 107, 0],
    [30, 3, 115, 1],
    [22, 5, 87, 1],
    [24, 5, 98, 1],
    [28, 1, 107, 5],
    [30, 5, 120, 1],
    [28, 3, 113, 4],
    [28, 3, 107, 5],
    [28, 4, 116, 4],
    [28, 2, 111, 7],
    [30, 4, 121, 5],
    [30, 6, 117, 4],
    [26, 8, 106, 4],
    [28, 10, 114, 2],
    [30, 8, 122, 4],
    [30, 3, 117, 10],
    [30, 7, 116, 7],
    [30, 5, 115, 10],
    [30, 13, 115, 3],
    [30, 17, 115, 0],
    [30, 17, 115, 1],
    [30, 13, 115, 6],
    [30, 12, 121, 7],
    [30, 6, 121, 14],
    [30, 17, 122, 4],
    [30, 4, 122, 18],
    [30, 20, 117, 4],
    [30, 19, 118, 6],
  ],
  M: [
    [],
    [10, 1, 16, 0],
    [16, 1, 28, 0],
    [26, 1, 44, 0],
    [18, 2, 32, 0],
    [24, 2, 43, 0],
    [16, 4, 27, 0],
    [18, 4, 31, 0],
    [22, 2, 38, 2],
    [22, 3, 36, 2],
    [26, 4, 43, 1],
    [30, 1, 50, 4],
    [22, 6, 36, 2],
    [22, 8, 37, 1],
    [24, 4, 40, 5],
    [24, 5, 41, 5],
    [28, 7, 45, 3],
    [28, 10, 46, 1],
    [26, 9, 43, 4],
    [26, 3, 44, 11],
    [26, 3, 41, 13],
    [26, 17, 42, 0],
    [28, 17, 46, 0],
    [28, 4, 47, 14],
    [28, 6, 45, 14],
    [28, 8, 47, 13],
    [28, 19, 46, 4],
    [28, 22, 45, 3],
    [28, 3, 45, 23],
    [28, 21, 45, 7],
    [28, 19, 47, 10],
    [28, 2, 46, 29],
    [28, 10, 46, 23],
    [28, 14, 46, 21],
    [28, 14, 46, 23],
    [28, 12, 47, 26],
    [28, 6, 47, 34],
    [28, 29, 46, 14],
    [28, 13, 46, 32],
    [28, 40, 47, 7],
    [28, 18, 47, 31],
  ],
  Q: [
    [],
    [13, 1, 13, 0],
    [22, 1, 22, 0],
    [18, 2, 17, 0],
    [26, 2, 24, 0],
    [18, 2, 15, 2],
    [24, 4, 19, 0],
    [18, 2, 14, 4],
    [22, 4, 18, 2],
    [20, 4, 16, 4],
    [24, 6, 19, 2],
    [28, 4, 22, 4],
    [26, 4, 20, 6],
    [24, 8, 20, 4],
    [20, 11, 16, 5],
    [30, 5, 24, 7],
    [24, 15, 19, 2],
    [28, 1, 22, 15],
    [28, 17, 22, 1],
    [26, 17, 21, 4],
    [30, 15, 24, 5],
    [28, 17, 22, 6],
    [30, 7, 24, 16],
    [30, 11, 24, 14],
    [30, 11, 24, 16],
    [30, 7, 24, 22],
    [28, 28, 22, 6],
    [30, 8, 23, 26],
    [30, 4, 24, 31],
    [30, 1, 23, 37],
    [30, 15, 24, 25],
    [30, 42, 24, 1],
    [30, 10, 24, 35],
    [30, 29, 24, 19],
    [30, 44, 24, 7],
    [30, 39, 24, 14],
    [30, 46, 24, 10],
    [30, 49, 24, 10],
    [30, 48, 24, 14],
    [30, 43, 24, 22],
    [30, 34, 24, 34],
  ],
  H: [
    [],
    [17, 1, 9, 0],
    [28, 1, 16, 0],
    [22, 2, 13, 0],
    [16, 4, 9, 0],
    [22, 2, 11, 2],
    [28, 4, 15, 0],
    [26, 4, 13, 1],
    [26, 4, 14, 2],
    [24, 4, 12, 4],
    [28, 6, 15, 2],
    [24, 3, 12, 8],
    [28, 7, 14, 4],
    [22, 12, 11, 4],
    [24, 11, 12, 5],
    [24, 11, 12, 7],
    [30, 3, 15, 13],
    [28, 2, 14, 17],
    [28, 2, 14, 19],
    [26, 9, 13, 16],
    [28, 15, 15, 10],
    [30, 19, 16, 6],
    [24, 34, 13, 0],
    [30, 16, 15, 14],
    [30, 30, 16, 2],
    [30, 22, 15, 13],
    [30, 33, 16, 4],
    [30, 12, 15, 28],
    [30, 11, 15, 31],
    [30, 19, 15, 26],
    [30, 23, 15, 25],
    [30, 23, 15, 28],
    [30, 19, 15, 35],
    [30, 11, 15, 46],
    [30, 59, 16, 1],
    [30, 22, 15, 41],
    [30, 2, 15, 64],
    [30, 24, 15, 46],
    [30, 42, 15, 32],
    [30, 10, 15, 67],
    [30, 20, 15, 61],
  ],
}

export function getECInfo(version: number, ecLevel: ErrorCorrectionLevel): ECBlockInfo {
  const [ecCodewordsPerBlock, group1Blocks, group1DataCW, group2Blocks] =
    EC_TABLE[ecLevel][version]!
  const group2DataCW = group2Blocks > 0 ? group1DataCW + 1 : 0
  return {
    totalDataCodewords: group1Blocks * group1DataCW + group2Blocks * group2DataCW,
    ecCodewordsPerBlock,
    group1Blocks,
    group1DataCW,
    group2Blocks,
    group2DataCW,
  }
}

/**
 * Alignment pattern positions for each version (2-40)
 * Version 1 has no alignment patterns
 */
// prettier-ignore
export const ALIGNMENT_POSITIONS: number[][] = [
  [],             // v1
  [6, 18],        // v2
  [6, 22],        // v3
  [6, 26],        // v4
  [6, 30],        // v5
  [6, 34],        // v6
  [6, 22, 38],    // v7
  [6, 24, 42],    // v8
  [6, 26, 46],    // v9
  [6, 28, 50],    // v10
  [6, 30, 54],    // v11
  [6, 32, 58],    // v12
  [6, 34, 62],    // v13
  [6, 26, 46, 66], // v14
  [6, 26, 48, 70], // v15
  [6, 26, 50, 74], // v16
  [6, 30, 54, 78], // v17
  [6, 30, 56, 82], // v18
  [6, 30, 58, 86], // v19
  [6, 34, 62, 90], // v20
  [6, 28, 50, 72, 94],  // v21
  [6, 26, 50, 74, 98],  // v22
  [6, 30, 54, 78, 102], // v23
  [6, 28, 54, 80, 106], // v24
  [6, 32, 58, 84, 110], // v25
  [6, 30, 58, 86, 114], // v26
  [6, 34, 62, 90, 118], // v27
  [6, 26, 50, 74, 98, 122],  // v28
  [6, 30, 54, 78, 102, 126], // v29
  [6, 26, 52, 78, 104, 130], // v30
  [6, 30, 56, 82, 108, 134], // v31
  [6, 34, 60, 86, 112, 138], // v32
  [6, 30, 58, 86, 114, 142], // v33
  [6, 34, 62, 90, 118, 146], // v34
  [6, 30, 54, 78, 102, 126, 150], // v35
  [6, 24, 50, 76, 102, 128, 154], // v36
  [6, 28, 54, 80, 106, 132, 158], // v37
  [6, 32, 58, 84, 110, 136, 162], // v38
  [6, 26, 54, 82, 110, 138, 166], // v39
  [6, 30, 58, 86, 114, 142, 170], // v40
]

/**
 * Remainder bits after data placement for each version
 */
// prettier-ignore
export const REMAINDER_BITS: number[] = [
  0, // index 0 is unused: versions are 1-40
  0, 7, 7, 7, 7, 7, 0, 0, 0, 0, // v1-v10
  0, 0, 0, 3, 3, 3, 3, 3, 3, 3, // v11-v20
  4, 4, 4, 4, 4, 4, 0, 0, 0, 0, // v21-v30
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // v31-v40
]

/**
 * Version info bit strings for versions 7-40
 * 18-bit BCH code
 */
// prettier-ignore
export const VERSION_INFO: number[] = [
  0,0,0,0,0,0,0, // v0-v6 (no version info)
  0x07C94, // v7
  0x085BC, // v8
  0x09A99, // v9
  0x0A4D3, // v10
  0x0BBF6, // v11
  0x0C762, // v12
  0x0D847, // v13
  0x0E60D, // v14
  0x0F928, // v15
  0x10B78, // v16
  0x1145D, // v17
  0x12A17, // v18
  0x13532, // v19
  0x149A6, // v20
  0x15683, // v21
  0x168C9, // v22
  0x177EC, // v23
  0x18EC4, // v24
  0x191E1, // v25
  0x1AFAB, // v26
  0x1B08E, // v27
  0x1CC1A, // v28
  0x1D33F, // v29
  0x1ED75, // v30
  0x1F250, // v31
  0x209D5, // v32
  0x216F0, // v33
  0x228BA, // v34
  0x2379F, // v35
  0x24B0B, // v36
  0x2542E, // v37
  0x26A64, // v38
  0x27541, // v39
  0x28C69, // v40
]
