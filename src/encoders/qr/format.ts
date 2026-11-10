/**
 * QR Code format and version info encoding
 * BCH encoding for format info, Golay encoding for version info
 */

import type { Module } from "./matrix"
import type { ErrorCorrectionLevel } from "./types"
import { EC_LEVEL_BITS } from "./types"
import { VERSION_INFO } from "./tables"

/**
 * Format info: 15-bit BCH code
 * 2 bits EC level + 3 bits mask -> 5 data bits -> 15 bit BCH with XOR mask 0x5412
 */
const FORMAT_MASK = 0x5412

/** Generate 15-bit format info for given EC level and mask */
export function generateFormatInfo(ecLevel: ErrorCorrectionLevel, mask: number): number {
  const data = (EC_LEVEL_BITS[ecLevel] << 3) | mask
  let bch = data << 10
  let gen = 0x537 // Generator polynomial for BCH(15,5)

  // Long division
  for (let i = 4; i >= 0; i--) {
    if (bch & (1 << (i + 10))) {
      bch ^= gen << i
    }
  }

  return ((data << 10) | bch) ^ FORMAT_MASK
}

const FORMAT_TOP_LEFT: readonly (readonly [number, number])[] = [
  [8, 0],
  [8, 1],
  [8, 2],
  [8, 3],
  [8, 4],
  [8, 5],
  [8, 7],
  [8, 8],
  [7, 8],
  [5, 8],
  [4, 8],
  [3, 8],
  [2, 8],
  [1, 8],
  [0, 8],
]

/** Visit every module of both copies of the format information, with the bit it holds */
export function forEachFormatCell(
  size: number,
  ecLevel: ErrorCorrectionLevel,
  mask: number,
  visit: (row: number, column: number, bit: 0 | 1) => void,
): void {
  const formatInfo = generateFormatInfo(ecLevel, mask)

  for (let i = 0; i < 15; i++) {
    const [r, c] = FORMAT_TOP_LEFT[i]!
    visit(r, c, ((formatInfo >> (14 - i)) & 1) as 0 | 1)
  }
  for (let i = 0; i < 7; i++) {
    visit(size - 1 - i, 8, ((formatInfo >> (14 - i)) & 1) as 0 | 1)
  }
  for (let i = 0; i < 8; i++) {
    visit(8, size - 8 + i, ((formatInfo >> (7 - i)) & 1) as 0 | 1)
  }
}

/** Write format info to the matrix at the reserved positions */
export function writeFormatInfo(
  matrix: Module[][],
  ecLevel: ErrorCorrectionLevel,
  mask: number,
): void {
  forEachFormatCell(matrix.length, ecLevel, mask, (r, c, bit) => {
    matrix[r]![c] = bit === 1
  })
}

/** Write version info for version 7+ */
export function writeVersionInfo(matrix: Module[][], version: number): void {
  if (version < 7) return
  const size = matrix.length
  const versionInfo = VERSION_INFO[version]!

  // 18 bits: bit 0 is LSB
  // Bottom-left block: 6 rows x 3 cols at rows [size-11, size-10, size-9], cols [0..5]
  // Top-right block: 3 rows x 6 cols at rows [0..5], cols [size-11, size-10, size-9]
  for (let i = 0; i < 18; i++) {
    const bit = ((versionInfo >> i) & 1) === 1
    const row = Math.floor(i / 3)
    const col = i % 3

    // Bottom-left: rows (size-11+col), cols (row)
    matrix[size - 11 + col]![row] = bit
    // Top-right: rows (row), cols (size-11+col)
    matrix[row]![size - 11 + col] = bit
  }
}
