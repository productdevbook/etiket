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

// prettier-ignore
const EC_TABLE: Record<ErrorCorrectionLevel, ECBlockInfo[]> = {
  L: [
    { totalDataCodewords: 0, ecCodewordsPerBlock: 0, group1Blocks: 0, group1DataCW: 0, group2Blocks: 0, group2DataCW: 0 }, // v0 placeholder
    { totalDataCodewords: 19, ecCodewordsPerBlock: 7, group1Blocks: 1, group1DataCW: 19, group2Blocks: 0, group2DataCW: 0 }, // v1
    { totalDataCodewords: 34, ecCodewordsPerBlock: 10, group1Blocks: 1, group1DataCW: 34, group2Blocks: 0, group2DataCW: 0 }, // v2
    { totalDataCodewords: 55, ecCodewordsPerBlock: 15, group1Blocks: 1, group1DataCW: 55, group2Blocks: 0, group2DataCW: 0 }, // v3
    { totalDataCodewords: 80, ecCodewordsPerBlock: 20, group1Blocks: 1, group1DataCW: 80, group2Blocks: 0, group2DataCW: 0 }, // v4
    { totalDataCodewords: 108, ecCodewordsPerBlock: 26, group1Blocks: 1, group1DataCW: 108, group2Blocks: 0, group2DataCW: 0 }, // v5
    { totalDataCodewords: 136, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCW: 68, group2Blocks: 0, group2DataCW: 0 }, // v6
    { totalDataCodewords: 156, ecCodewordsPerBlock: 20, group1Blocks: 2, group1DataCW: 78, group2Blocks: 0, group2DataCW: 0 }, // v7
    { totalDataCodewords: 194, ecCodewordsPerBlock: 24, group1Blocks: 2, group1DataCW: 97, group2Blocks: 0, group2DataCW: 0 }, // v8
    { totalDataCodewords: 232, ecCodewordsPerBlock: 30, group1Blocks: 2, group1DataCW: 116, group2Blocks: 0, group2DataCW: 0 }, // v9
    { totalDataCodewords: 274, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCW: 68, group2Blocks: 2, group2DataCW: 69 }, // v10
    { totalDataCodewords: 324, ecCodewordsPerBlock: 20, group1Blocks: 4, group1DataCW: 81, group2Blocks: 0, group2DataCW: 0 }, // v11
    { totalDataCodewords: 370, ecCodewordsPerBlock: 24, group1Blocks: 2, group1DataCW: 92, group2Blocks: 2, group2DataCW: 93 }, // v12
    { totalDataCodewords: 428, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCW: 107, group2Blocks: 0, group2DataCW: 0 }, // v13
    { totalDataCodewords: 461, ecCodewordsPerBlock: 30, group1Blocks: 3, group1DataCW: 115, group2Blocks: 1, group2DataCW: 116 }, // v14
    { totalDataCodewords: 523, ecCodewordsPerBlock: 22, group1Blocks: 5, group1DataCW: 87, group2Blocks: 1, group2DataCW: 88 }, // v15
    { totalDataCodewords: 589, ecCodewordsPerBlock: 24, group1Blocks: 5, group1DataCW: 98, group2Blocks: 1, group2DataCW: 99 }, // v16
    { totalDataCodewords: 647, ecCodewordsPerBlock: 28, group1Blocks: 1, group1DataCW: 107, group2Blocks: 5, group2DataCW: 108 }, // v17
    { totalDataCodewords: 721, ecCodewordsPerBlock: 30, group1Blocks: 5, group1DataCW: 120, group2Blocks: 1, group2DataCW: 121 }, // v18
    { totalDataCodewords: 795, ecCodewordsPerBlock: 28, group1Blocks: 3, group1DataCW: 113, group2Blocks: 4, group2DataCW: 114 }, // v19
    { totalDataCodewords: 861, ecCodewordsPerBlock: 28, group1Blocks: 3, group1DataCW: 107, group2Blocks: 5, group2DataCW: 108 }, // v20
    { totalDataCodewords: 932, ecCodewordsPerBlock: 28, group1Blocks: 4, group1DataCW: 116, group2Blocks: 4, group2DataCW: 117 }, // v21
    { totalDataCodewords: 1006, ecCodewordsPerBlock: 28, group1Blocks: 2, group1DataCW: 111, group2Blocks: 7, group2DataCW: 112 }, // v22
    { totalDataCodewords: 1094, ecCodewordsPerBlock: 30, group1Blocks: 4, group1DataCW: 121, group2Blocks: 5, group2DataCW: 122 }, // v23
    { totalDataCodewords: 1174, ecCodewordsPerBlock: 30, group1Blocks: 6, group1DataCW: 117, group2Blocks: 4, group2DataCW: 118 }, // v24
    { totalDataCodewords: 1276, ecCodewordsPerBlock: 26, group1Blocks: 8, group1DataCW: 106, group2Blocks: 4, group2DataCW: 107 }, // v25
    { totalDataCodewords: 1370, ecCodewordsPerBlock: 28, group1Blocks: 10, group1DataCW: 114, group2Blocks: 2, group2DataCW: 115 }, // v26
    { totalDataCodewords: 1468, ecCodewordsPerBlock: 30, group1Blocks: 8, group1DataCW: 122, group2Blocks: 4, group2DataCW: 123 }, // v27
    { totalDataCodewords: 1531, ecCodewordsPerBlock: 30, group1Blocks: 3, group1DataCW: 117, group2Blocks: 10, group2DataCW: 118 }, // v28
    { totalDataCodewords: 1631, ecCodewordsPerBlock: 30, group1Blocks: 7, group1DataCW: 116, group2Blocks: 7, group2DataCW: 117 }, // v29
    { totalDataCodewords: 1735, ecCodewordsPerBlock: 30, group1Blocks: 5, group1DataCW: 115, group2Blocks: 10, group2DataCW: 116 }, // v30
    { totalDataCodewords: 1843, ecCodewordsPerBlock: 30, group1Blocks: 13, group1DataCW: 115, group2Blocks: 3, group2DataCW: 116 }, // v31
    { totalDataCodewords: 1955, ecCodewordsPerBlock: 30, group1Blocks: 17, group1DataCW: 115, group2Blocks: 0, group2DataCW: 0 }, // v32
    { totalDataCodewords: 2071, ecCodewordsPerBlock: 30, group1Blocks: 17, group1DataCW: 115, group2Blocks: 1, group2DataCW: 116 }, // v33
    { totalDataCodewords: 2191, ecCodewordsPerBlock: 30, group1Blocks: 13, group1DataCW: 115, group2Blocks: 6, group2DataCW: 116 }, // v34
    { totalDataCodewords: 2306, ecCodewordsPerBlock: 30, group1Blocks: 12, group1DataCW: 121, group2Blocks: 7, group2DataCW: 122 }, // v35
    { totalDataCodewords: 2434, ecCodewordsPerBlock: 30, group1Blocks: 6, group1DataCW: 121, group2Blocks: 14, group2DataCW: 122 }, // v36
    { totalDataCodewords: 2566, ecCodewordsPerBlock: 30, group1Blocks: 17, group1DataCW: 122, group2Blocks: 4, group2DataCW: 123 }, // v37
    { totalDataCodewords: 2702, ecCodewordsPerBlock: 30, group1Blocks: 4, group1DataCW: 122, group2Blocks: 18, group2DataCW: 123 }, // v38
    { totalDataCodewords: 2812, ecCodewordsPerBlock: 30, group1Blocks: 20, group1DataCW: 117, group2Blocks: 4, group2DataCW: 118 }, // v39
    { totalDataCodewords: 2956, ecCodewordsPerBlock: 30, group1Blocks: 19, group1DataCW: 118, group2Blocks: 6, group2DataCW: 119 }, // v40
  ],
  M: [
    { totalDataCodewords: 0, ecCodewordsPerBlock: 0, group1Blocks: 0, group1DataCW: 0, group2Blocks: 0, group2DataCW: 0 },
    { totalDataCodewords: 16, ecCodewordsPerBlock: 10, group1Blocks: 1, group1DataCW: 16, group2Blocks: 0, group2DataCW: 0 }, // v1
    { totalDataCodewords: 28, ecCodewordsPerBlock: 16, group1Blocks: 1, group1DataCW: 28, group2Blocks: 0, group2DataCW: 0 }, // v2
    { totalDataCodewords: 44, ecCodewordsPerBlock: 26, group1Blocks: 1, group1DataCW: 44, group2Blocks: 0, group2DataCW: 0 }, // v3
    { totalDataCodewords: 64, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCW: 32, group2Blocks: 0, group2DataCW: 0 }, // v4
    { totalDataCodewords: 86, ecCodewordsPerBlock: 24, group1Blocks: 2, group1DataCW: 43, group2Blocks: 0, group2DataCW: 0 }, // v5
    { totalDataCodewords: 108, ecCodewordsPerBlock: 16, group1Blocks: 4, group1DataCW: 27, group2Blocks: 0, group2DataCW: 0 }, // v6
    { totalDataCodewords: 124, ecCodewordsPerBlock: 18, group1Blocks: 4, group1DataCW: 31, group2Blocks: 0, group2DataCW: 0 }, // v7
    { totalDataCodewords: 154, ecCodewordsPerBlock: 22, group1Blocks: 2, group1DataCW: 38, group2Blocks: 2, group2DataCW: 39 }, // v8
    { totalDataCodewords: 182, ecCodewordsPerBlock: 22, group1Blocks: 3, group1DataCW: 36, group2Blocks: 2, group2DataCW: 37 }, // v9
    { totalDataCodewords: 216, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCW: 43, group2Blocks: 1, group2DataCW: 44 }, // v10
    { totalDataCodewords: 254, ecCodewordsPerBlock: 30, group1Blocks: 1, group1DataCW: 50, group2Blocks: 4, group2DataCW: 51 }, // v11
    { totalDataCodewords: 290, ecCodewordsPerBlock: 22, group1Blocks: 6, group1DataCW: 36, group2Blocks: 2, group2DataCW: 37 }, // v12
    { totalDataCodewords: 334, ecCodewordsPerBlock: 22, group1Blocks: 8, group1DataCW: 37, group2Blocks: 1, group2DataCW: 38 }, // v13
    { totalDataCodewords: 365, ecCodewordsPerBlock: 24, group1Blocks: 4, group1DataCW: 40, group2Blocks: 5, group2DataCW: 41 }, // v14
    { totalDataCodewords: 415, ecCodewordsPerBlock: 24, group1Blocks: 5, group1DataCW: 41, group2Blocks: 5, group2DataCW: 42 }, // v15
    { totalDataCodewords: 453, ecCodewordsPerBlock: 28, group1Blocks: 7, group1DataCW: 45, group2Blocks: 3, group2DataCW: 46 }, // v16
    { totalDataCodewords: 507, ecCodewordsPerBlock: 28, group1Blocks: 10, group1DataCW: 46, group2Blocks: 1, group2DataCW: 47 }, // v17
    { totalDataCodewords: 563, ecCodewordsPerBlock: 26, group1Blocks: 9, group1DataCW: 43, group2Blocks: 4, group2DataCW: 44 }, // v18
    { totalDataCodewords: 627, ecCodewordsPerBlock: 26, group1Blocks: 3, group1DataCW: 44, group2Blocks: 11, group2DataCW: 45 }, // v19
    { totalDataCodewords: 669, ecCodewordsPerBlock: 26, group1Blocks: 3, group1DataCW: 41, group2Blocks: 13, group2DataCW: 42 }, // v20
    { totalDataCodewords: 714, ecCodewordsPerBlock: 26, group1Blocks: 17, group1DataCW: 42, group2Blocks: 0, group2DataCW: 0 }, // v21
    { totalDataCodewords: 782, ecCodewordsPerBlock: 28, group1Blocks: 17, group1DataCW: 46, group2Blocks: 0, group2DataCW: 0 }, // v22
    { totalDataCodewords: 860, ecCodewordsPerBlock: 28, group1Blocks: 4, group1DataCW: 47, group2Blocks: 14, group2DataCW: 48 }, // v23
    { totalDataCodewords: 914, ecCodewordsPerBlock: 28, group1Blocks: 6, group1DataCW: 45, group2Blocks: 14, group2DataCW: 46 }, // v24
    { totalDataCodewords: 1000, ecCodewordsPerBlock: 28, group1Blocks: 8, group1DataCW: 47, group2Blocks: 13, group2DataCW: 48 }, // v25
    { totalDataCodewords: 1062, ecCodewordsPerBlock: 28, group1Blocks: 19, group1DataCW: 46, group2Blocks: 4, group2DataCW: 47 }, // v26
    { totalDataCodewords: 1128, ecCodewordsPerBlock: 28, group1Blocks: 22, group1DataCW: 45, group2Blocks: 3, group2DataCW: 46 }, // v27
    { totalDataCodewords: 1193, ecCodewordsPerBlock: 28, group1Blocks: 3, group1DataCW: 45, group2Blocks: 23, group2DataCW: 46 }, // v28
    { totalDataCodewords: 1267, ecCodewordsPerBlock: 28, group1Blocks: 21, group1DataCW: 45, group2Blocks: 7, group2DataCW: 46 }, // v29
    { totalDataCodewords: 1373, ecCodewordsPerBlock: 28, group1Blocks: 19, group1DataCW: 47, group2Blocks: 10, group2DataCW: 48 }, // v30
    { totalDataCodewords: 1455, ecCodewordsPerBlock: 28, group1Blocks: 2, group1DataCW: 46, group2Blocks: 29, group2DataCW: 47 }, // v31
    { totalDataCodewords: 1541, ecCodewordsPerBlock: 28, group1Blocks: 10, group1DataCW: 46, group2Blocks: 23, group2DataCW: 47 }, // v32
    { totalDataCodewords: 1631, ecCodewordsPerBlock: 28, group1Blocks: 14, group1DataCW: 46, group2Blocks: 21, group2DataCW: 47 }, // v33
    { totalDataCodewords: 1725, ecCodewordsPerBlock: 28, group1Blocks: 14, group1DataCW: 46, group2Blocks: 23, group2DataCW: 47 }, // v34
    { totalDataCodewords: 1812, ecCodewordsPerBlock: 28, group1Blocks: 12, group1DataCW: 47, group2Blocks: 26, group2DataCW: 48 }, // v35
    { totalDataCodewords: 1914, ecCodewordsPerBlock: 28, group1Blocks: 6, group1DataCW: 47, group2Blocks: 34, group2DataCW: 48 }, // v36
    { totalDataCodewords: 1992, ecCodewordsPerBlock: 28, group1Blocks: 29, group1DataCW: 46, group2Blocks: 14, group2DataCW: 47 }, // v37
    { totalDataCodewords: 2102, ecCodewordsPerBlock: 28, group1Blocks: 13, group1DataCW: 46, group2Blocks: 32, group2DataCW: 47 }, // v38
    { totalDataCodewords: 2216, ecCodewordsPerBlock: 28, group1Blocks: 40, group1DataCW: 47, group2Blocks: 7, group2DataCW: 48 }, // v39
    { totalDataCodewords: 2334, ecCodewordsPerBlock: 28, group1Blocks: 18, group1DataCW: 47, group2Blocks: 31, group2DataCW: 48 }, // v40
  ],
  Q: [
    { totalDataCodewords: 0, ecCodewordsPerBlock: 0, group1Blocks: 0, group1DataCW: 0, group2Blocks: 0, group2DataCW: 0 },
    { totalDataCodewords: 13, ecCodewordsPerBlock: 13, group1Blocks: 1, group1DataCW: 13, group2Blocks: 0, group2DataCW: 0 }, // v1
    { totalDataCodewords: 22, ecCodewordsPerBlock: 22, group1Blocks: 1, group1DataCW: 22, group2Blocks: 0, group2DataCW: 0 }, // v2
    { totalDataCodewords: 34, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCW: 17, group2Blocks: 0, group2DataCW: 0 }, // v3
    { totalDataCodewords: 48, ecCodewordsPerBlock: 26, group1Blocks: 2, group1DataCW: 24, group2Blocks: 0, group2DataCW: 0 }, // v4
    { totalDataCodewords: 62, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCW: 15, group2Blocks: 2, group2DataCW: 16 }, // v5
    { totalDataCodewords: 76, ecCodewordsPerBlock: 24, group1Blocks: 4, group1DataCW: 19, group2Blocks: 0, group2DataCW: 0 }, // v6
    { totalDataCodewords: 88, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCW: 14, group2Blocks: 4, group2DataCW: 15 }, // v7
    { totalDataCodewords: 110, ecCodewordsPerBlock: 22, group1Blocks: 4, group1DataCW: 18, group2Blocks: 2, group2DataCW: 19 }, // v8
    { totalDataCodewords: 132, ecCodewordsPerBlock: 20, group1Blocks: 4, group1DataCW: 16, group2Blocks: 4, group2DataCW: 17 }, // v9
    { totalDataCodewords: 154, ecCodewordsPerBlock: 24, group1Blocks: 6, group1DataCW: 19, group2Blocks: 2, group2DataCW: 20 }, // v10
    { totalDataCodewords: 180, ecCodewordsPerBlock: 28, group1Blocks: 4, group1DataCW: 22, group2Blocks: 4, group2DataCW: 23 }, // v11
    { totalDataCodewords: 206, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCW: 20, group2Blocks: 6, group2DataCW: 21 }, // v12
    { totalDataCodewords: 244, ecCodewordsPerBlock: 24, group1Blocks: 8, group1DataCW: 20, group2Blocks: 4, group2DataCW: 21 }, // v13
    { totalDataCodewords: 261, ecCodewordsPerBlock: 20, group1Blocks: 11, group1DataCW: 16, group2Blocks: 5, group2DataCW: 17 }, // v14
    { totalDataCodewords: 295, ecCodewordsPerBlock: 30, group1Blocks: 5, group1DataCW: 24, group2Blocks: 7, group2DataCW: 25 }, // v15
    { totalDataCodewords: 325, ecCodewordsPerBlock: 24, group1Blocks: 15, group1DataCW: 19, group2Blocks: 2, group2DataCW: 20 }, // v16
    { totalDataCodewords: 367, ecCodewordsPerBlock: 28, group1Blocks: 1, group1DataCW: 22, group2Blocks: 15, group2DataCW: 23 }, // v17
    { totalDataCodewords: 397, ecCodewordsPerBlock: 28, group1Blocks: 17, group1DataCW: 22, group2Blocks: 1, group2DataCW: 23 }, // v18
    { totalDataCodewords: 445, ecCodewordsPerBlock: 26, group1Blocks: 17, group1DataCW: 21, group2Blocks: 4, group2DataCW: 22 }, // v19
    { totalDataCodewords: 485, ecCodewordsPerBlock: 30, group1Blocks: 15, group1DataCW: 24, group2Blocks: 5, group2DataCW: 25 }, // v20
    { totalDataCodewords: 512, ecCodewordsPerBlock: 28, group1Blocks: 17, group1DataCW: 22, group2Blocks: 6, group2DataCW: 23 }, // v21
    { totalDataCodewords: 568, ecCodewordsPerBlock: 30, group1Blocks: 7, group1DataCW: 24, group2Blocks: 16, group2DataCW: 25 }, // v22
    { totalDataCodewords: 614, ecCodewordsPerBlock: 30, group1Blocks: 11, group1DataCW: 24, group2Blocks: 14, group2DataCW: 25 }, // v23
    { totalDataCodewords: 664, ecCodewordsPerBlock: 30, group1Blocks: 11, group1DataCW: 24, group2Blocks: 16, group2DataCW: 25 }, // v24
    { totalDataCodewords: 718, ecCodewordsPerBlock: 30, group1Blocks: 7, group1DataCW: 24, group2Blocks: 22, group2DataCW: 25 }, // v25
    { totalDataCodewords: 754, ecCodewordsPerBlock: 28, group1Blocks: 28, group1DataCW: 22, group2Blocks: 6, group2DataCW: 23 }, // v26
    { totalDataCodewords: 808, ecCodewordsPerBlock: 30, group1Blocks: 8, group1DataCW: 23, group2Blocks: 26, group2DataCW: 24 }, // v27
    { totalDataCodewords: 871, ecCodewordsPerBlock: 30, group1Blocks: 4, group1DataCW: 24, group2Blocks: 31, group2DataCW: 25 }, // v28
    { totalDataCodewords: 911, ecCodewordsPerBlock: 30, group1Blocks: 1, group1DataCW: 23, group2Blocks: 37, group2DataCW: 24 }, // v29
    { totalDataCodewords: 985, ecCodewordsPerBlock: 30, group1Blocks: 15, group1DataCW: 24, group2Blocks: 25, group2DataCW: 25 }, // v30
    { totalDataCodewords: 1033, ecCodewordsPerBlock: 30, group1Blocks: 42, group1DataCW: 24, group2Blocks: 1, group2DataCW: 25 }, // v31
    { totalDataCodewords: 1115, ecCodewordsPerBlock: 30, group1Blocks: 10, group1DataCW: 24, group2Blocks: 35, group2DataCW: 25 }, // v32
    { totalDataCodewords: 1171, ecCodewordsPerBlock: 30, group1Blocks: 29, group1DataCW: 24, group2Blocks: 19, group2DataCW: 25 }, // v33
    { totalDataCodewords: 1231, ecCodewordsPerBlock: 30, group1Blocks: 44, group1DataCW: 24, group2Blocks: 7, group2DataCW: 25 }, // v34
    { totalDataCodewords: 1286, ecCodewordsPerBlock: 30, group1Blocks: 39, group1DataCW: 24, group2Blocks: 14, group2DataCW: 25 }, // v35
    { totalDataCodewords: 1354, ecCodewordsPerBlock: 30, group1Blocks: 46, group1DataCW: 24, group2Blocks: 10, group2DataCW: 25 }, // v36
    { totalDataCodewords: 1426, ecCodewordsPerBlock: 30, group1Blocks: 49, group1DataCW: 24, group2Blocks: 10, group2DataCW: 25 }, // v37
    { totalDataCodewords: 1502, ecCodewordsPerBlock: 30, group1Blocks: 48, group1DataCW: 24, group2Blocks: 14, group2DataCW: 25 }, // v38
    { totalDataCodewords: 1582, ecCodewordsPerBlock: 30, group1Blocks: 43, group1DataCW: 24, group2Blocks: 22, group2DataCW: 25 }, // v39
    { totalDataCodewords: 1666, ecCodewordsPerBlock: 30, group1Blocks: 34, group1DataCW: 24, group2Blocks: 34, group2DataCW: 25 }, // v40
  ],
  H: [
    { totalDataCodewords: 0, ecCodewordsPerBlock: 0, group1Blocks: 0, group1DataCW: 0, group2Blocks: 0, group2DataCW: 0 },
    { totalDataCodewords: 9, ecCodewordsPerBlock: 17, group1Blocks: 1, group1DataCW: 9, group2Blocks: 0, group2DataCW: 0 }, // v1
    { totalDataCodewords: 16, ecCodewordsPerBlock: 28, group1Blocks: 1, group1DataCW: 16, group2Blocks: 0, group2DataCW: 0 }, // v2
    { totalDataCodewords: 26, ecCodewordsPerBlock: 22, group1Blocks: 2, group1DataCW: 13, group2Blocks: 0, group2DataCW: 0 }, // v3
    { totalDataCodewords: 36, ecCodewordsPerBlock: 16, group1Blocks: 4, group1DataCW: 9, group2Blocks: 0, group2DataCW: 0 }, // v4
    { totalDataCodewords: 46, ecCodewordsPerBlock: 22, group1Blocks: 2, group1DataCW: 11, group2Blocks: 2, group2DataCW: 12 }, // v5
    { totalDataCodewords: 60, ecCodewordsPerBlock: 28, group1Blocks: 4, group1DataCW: 15, group2Blocks: 0, group2DataCW: 0 }, // v6
    { totalDataCodewords: 66, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCW: 13, group2Blocks: 1, group2DataCW: 14 }, // v7
    { totalDataCodewords: 86, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCW: 14, group2Blocks: 2, group2DataCW: 15 }, // v8
    { totalDataCodewords: 100, ecCodewordsPerBlock: 24, group1Blocks: 4, group1DataCW: 12, group2Blocks: 4, group2DataCW: 13 }, // v9
    { totalDataCodewords: 122, ecCodewordsPerBlock: 28, group1Blocks: 6, group1DataCW: 15, group2Blocks: 2, group2DataCW: 16 }, // v10
    { totalDataCodewords: 140, ecCodewordsPerBlock: 24, group1Blocks: 3, group1DataCW: 12, group2Blocks: 8, group2DataCW: 13 }, // v11
    { totalDataCodewords: 158, ecCodewordsPerBlock: 28, group1Blocks: 7, group1DataCW: 14, group2Blocks: 4, group2DataCW: 15 }, // v12
    { totalDataCodewords: 180, ecCodewordsPerBlock: 22, group1Blocks: 12, group1DataCW: 11, group2Blocks: 4, group2DataCW: 12 }, // v13
    { totalDataCodewords: 197, ecCodewordsPerBlock: 24, group1Blocks: 11, group1DataCW: 12, group2Blocks: 5, group2DataCW: 13 }, // v14
    { totalDataCodewords: 223, ecCodewordsPerBlock: 24, group1Blocks: 11, group1DataCW: 12, group2Blocks: 7, group2DataCW: 13 }, // v15
    { totalDataCodewords: 253, ecCodewordsPerBlock: 30, group1Blocks: 3, group1DataCW: 15, group2Blocks: 13, group2DataCW: 16 }, // v16
    { totalDataCodewords: 283, ecCodewordsPerBlock: 28, group1Blocks: 2, group1DataCW: 14, group2Blocks: 17, group2DataCW: 15 }, // v17
    { totalDataCodewords: 313, ecCodewordsPerBlock: 28, group1Blocks: 2, group1DataCW: 14, group2Blocks: 19, group2DataCW: 15 }, // v18
    { totalDataCodewords: 341, ecCodewordsPerBlock: 26, group1Blocks: 9, group1DataCW: 13, group2Blocks: 16, group2DataCW: 14 }, // v19
    { totalDataCodewords: 385, ecCodewordsPerBlock: 28, group1Blocks: 15, group1DataCW: 15, group2Blocks: 10, group2DataCW: 16 }, // v20
    { totalDataCodewords: 406, ecCodewordsPerBlock: 30, group1Blocks: 19, group1DataCW: 16, group2Blocks: 6, group2DataCW: 17 }, // v21
    { totalDataCodewords: 442, ecCodewordsPerBlock: 24, group1Blocks: 34, group1DataCW: 13, group2Blocks: 0, group2DataCW: 0 }, // v22
    { totalDataCodewords: 464, ecCodewordsPerBlock: 30, group1Blocks: 16, group1DataCW: 15, group2Blocks: 14, group2DataCW: 16 }, // v23
    { totalDataCodewords: 514, ecCodewordsPerBlock: 30, group1Blocks: 30, group1DataCW: 16, group2Blocks: 2, group2DataCW: 17 }, // v24
    { totalDataCodewords: 538, ecCodewordsPerBlock: 30, group1Blocks: 22, group1DataCW: 15, group2Blocks: 13, group2DataCW: 16 }, // v25
    { totalDataCodewords: 596, ecCodewordsPerBlock: 30, group1Blocks: 33, group1DataCW: 16, group2Blocks: 4, group2DataCW: 17 }, // v26
    { totalDataCodewords: 628, ecCodewordsPerBlock: 30, group1Blocks: 12, group1DataCW: 15, group2Blocks: 28, group2DataCW: 16 }, // v27
    { totalDataCodewords: 661, ecCodewordsPerBlock: 30, group1Blocks: 11, group1DataCW: 15, group2Blocks: 31, group2DataCW: 16 }, // v28
    { totalDataCodewords: 701, ecCodewordsPerBlock: 30, group1Blocks: 19, group1DataCW: 15, group2Blocks: 26, group2DataCW: 16 }, // v29
    { totalDataCodewords: 745, ecCodewordsPerBlock: 30, group1Blocks: 23, group1DataCW: 15, group2Blocks: 25, group2DataCW: 16 }, // v30
    { totalDataCodewords: 793, ecCodewordsPerBlock: 30, group1Blocks: 23, group1DataCW: 15, group2Blocks: 28, group2DataCW: 16 }, // v31
    { totalDataCodewords: 845, ecCodewordsPerBlock: 30, group1Blocks: 19, group1DataCW: 15, group2Blocks: 35, group2DataCW: 16 }, // v32
    { totalDataCodewords: 901, ecCodewordsPerBlock: 30, group1Blocks: 11, group1DataCW: 15, group2Blocks: 46, group2DataCW: 16 }, // v33
    { totalDataCodewords: 961, ecCodewordsPerBlock: 30, group1Blocks: 59, group1DataCW: 16, group2Blocks: 1, group2DataCW: 17 }, // v34
    { totalDataCodewords: 986, ecCodewordsPerBlock: 30, group1Blocks: 22, group1DataCW: 15, group2Blocks: 41, group2DataCW: 16 }, // v35
    { totalDataCodewords: 1054, ecCodewordsPerBlock: 30, group1Blocks: 2, group1DataCW: 15, group2Blocks: 64, group2DataCW: 16 }, // v36
    { totalDataCodewords: 1096, ecCodewordsPerBlock: 30, group1Blocks: 24, group1DataCW: 15, group2Blocks: 46, group2DataCW: 16 }, // v37
    { totalDataCodewords: 1142, ecCodewordsPerBlock: 30, group1Blocks: 42, group1DataCW: 15, group2Blocks: 32, group2DataCW: 16 }, // v38
    { totalDataCodewords: 1222, ecCodewordsPerBlock: 30, group1Blocks: 10, group1DataCW: 15, group2Blocks: 67, group2DataCW: 16 }, // v39
    { totalDataCodewords: 1276, ecCodewordsPerBlock: 30, group1Blocks: 20, group1DataCW: 15, group2Blocks: 61, group2DataCW: 16 }, // v40
  ],
}

export function getECInfo(version: number, ecLevel: ErrorCorrectionLevel): ECBlockInfo {
  return EC_TABLE[ecLevel][version]!
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
  0, // v0 placeholder
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
