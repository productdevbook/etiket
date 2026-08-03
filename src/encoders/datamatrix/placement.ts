/**
 * Data Matrix module placement algorithm
 * Implements the standard ECC 200 diagonal placement pattern
 * and finder/alignment pattern generation.
 */

import type { SymbolSize } from "./tables"
import { getDataRegionCount } from "./tables"

/**
 * Build the module placement mapping for the data region.
 * Returns a flat array where index = codeword bit position,
 * value = [row, col] in the mapping matrix.
 *
 * The mapping matrix dimensions are:
 *   mappingRows = dataRegionRows * verticalRegions
 *   mappingCols = dataRegionCols * horizontalRegions
 *
 * These are the "logical" coordinates without finder/alignment patterns.
 */
export function buildPlacementMap(mappingRows: number, mappingCols: number): number[] {
  const totalModules = mappingRows * mappingCols
  // Array storing which bit position goes in which cell
  // placed[row * mappingCols + col] = bit position (0-based), -1 = unassigned
  const placed = new Int32Array(totalModules).fill(-1)

  let bitPos = 0
  let row = 4
  let col = 0

  // Main diagonal sweep
  while (row < mappingRows || col < mappingCols) {
    // Going up-right
    if (row === mappingRows && col === 0) {
      bitPos = placeCorner1(placed, mappingRows, mappingCols, bitPos)
    }
    if (row === mappingRows - 2 && col === 0 && mappingCols % 4 !== 0) {
      bitPos = placeCorner2(placed, mappingRows, mappingCols, bitPos)
    }
    if (row === mappingRows - 2 && col === 0 && mappingCols % 8 === 4) {
      bitPos = placeCorner3(placed, mappingRows, mappingCols, bitPos)
    }
    if (row === mappingRows + 4 && col === 2 && mappingCols % 8 === 0) {
      bitPos = placeCorner4(placed, mappingRows, mappingCols, bitPos)
    }

    // Sweep up-right
    while (row >= 0 && col < mappingCols) {
      if (row < mappingRows && col >= 0 && placed[row * mappingCols + col] === -1) {
        bitPos = placeUtah(placed, mappingRows, mappingCols, row, col, bitPos)
      }
      row -= 2
      col += 2
    }
    row += 1
    col += 3

    // Sweep down-left
    while (row < mappingRows && col >= 0) {
      if (row >= 0 && col < mappingCols && placed[row * mappingCols + col] === -1) {
        bitPos = placeUtah(placed, mappingRows, mappingCols, row, col, bitPos)
      }
      row += 2
      col -= 2
    }
    row += 3
    col += 1
  }

  // Fill unused corners with fixed pattern (required by spec)
  // Per ISO 16022: the bottom-right corner gets a fixed dark module,
  // and the module diagonally above-left also gets dark.
  // Use special marker -2 to indicate "always dark" modules.
  if (placed[(mappingRows - 1) * mappingCols + (mappingCols - 1)] === -1) {
    placed[(mappingRows - 1) * mappingCols + (mappingCols - 1)] = -2 // bottom-right: dark
    placed[(mappingRows - 2) * mappingCols + (mappingCols - 2)] = -2 // diagonal: dark
  }

  return Array.from(placed)
}

/**
 * Place a standard Utah-shaped module (8 modules for one codeword byte).
 * The Utah shape places bits from MSB to LSB in an L-shaped pattern.
 */
function placeUtah(
  placed: Int32Array,
  numRows: number,
  numCols: number,
  row: number,
  col: number,
  bitPos: number,
): number {
  placeModule(placed, numRows, numCols, row - 2, col - 2, bitPos, 0)
  placeModule(placed, numRows, numCols, row - 2, col - 1, bitPos, 1)
  placeModule(placed, numRows, numCols, row - 1, col - 2, bitPos, 2)
  placeModule(placed, numRows, numCols, row - 1, col - 1, bitPos, 3)
  placeModule(placed, numRows, numCols, row - 1, col, bitPos, 4)
  placeModule(placed, numRows, numCols, row, col - 2, bitPos, 5)
  placeModule(placed, numRows, numCols, row, col - 1, bitPos, 6)
  placeModule(placed, numRows, numCols, row, col, bitPos, 7)
  return bitPos + 8
}

/** Place a single module, wrapping around if needed */
function placeModule(
  placed: Int32Array,
  numRows: number,
  numCols: number,
  row: number,
  col: number,
  bitPos: number,
  bitOffset: number,
): void {
  // Wrap around
  if (row < 0) {
    row += numRows
    col += 4 - ((numRows + 4) % 8)
  }
  if (col < 0) {
    col += numCols
    row += 4 - ((numCols + 4) % 8)
  }

  if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
    placed[row * numCols + col] = bitPos + bitOffset
  }
}

/**
 * Corner case 1: when row == numRows and col == 0
 */
function placeCorner1(
  placed: Int32Array,
  numRows: number,
  numCols: number,
  bitPos: number,
): number {
  placeModule(placed, numRows, numCols, numRows - 1, 0, bitPos, 0)
  placeModule(placed, numRows, numCols, numRows - 1, 1, bitPos, 1)
  placeModule(placed, numRows, numCols, numRows - 1, 2, bitPos, 2)
  placeModule(placed, numRows, numCols, 0, numCols - 2, bitPos, 3)
  placeModule(placed, numRows, numCols, 0, numCols - 1, bitPos, 4)
  placeModule(placed, numRows, numCols, 1, numCols - 1, bitPos, 5)
  placeModule(placed, numRows, numCols, 2, numCols - 1, bitPos, 6)
  placeModule(placed, numRows, numCols, 3, numCols - 1, bitPos, 7)
  return bitPos + 8
}

/**
 * Corner case 2: when row == numRows-2, col == 0, numCols % 4 != 0
 */
function placeCorner2(
  placed: Int32Array,
  numRows: number,
  numCols: number,
  bitPos: number,
): number {
  placeModule(placed, numRows, numCols, numRows - 3, 0, bitPos, 0)
  placeModule(placed, numRows, numCols, numRows - 2, 0, bitPos, 1)
  placeModule(placed, numRows, numCols, numRows - 1, 0, bitPos, 2)
  placeModule(placed, numRows, numCols, 0, numCols - 4, bitPos, 3)
  placeModule(placed, numRows, numCols, 0, numCols - 3, bitPos, 4)
  placeModule(placed, numRows, numCols, 0, numCols - 2, bitPos, 5)
  placeModule(placed, numRows, numCols, 0, numCols - 1, bitPos, 6)
  placeModule(placed, numRows, numCols, 1, numCols - 1, bitPos, 7)
  return bitPos + 8
}

/**
 * Corner case 3: when row == numRows-2, col == 0, numCols % 8 == 4
 */
function placeCorner3(
  placed: Int32Array,
  numRows: number,
  numCols: number,
  bitPos: number,
): number {
  placeModule(placed, numRows, numCols, numRows - 3, 0, bitPos, 0)
  placeModule(placed, numRows, numCols, numRows - 2, 0, bitPos, 1)
  placeModule(placed, numRows, numCols, numRows - 1, 0, bitPos, 2)
  placeModule(placed, numRows, numCols, 0, numCols - 2, bitPos, 3)
  placeModule(placed, numRows, numCols, 0, numCols - 1, bitPos, 4)
  placeModule(placed, numRows, numCols, 1, numCols - 1, bitPos, 5)
  placeModule(placed, numRows, numCols, 2, numCols - 1, bitPos, 6)
  placeModule(placed, numRows, numCols, 3, numCols - 1, bitPos, 7)
  return bitPos + 8
}

/**
 * Corner case 4: when row == numRows+4, col == 2, numCols % 8 == 0
 */
function placeCorner4(
  placed: Int32Array,
  numRows: number,
  numCols: number,
  bitPos: number,
): number {
  placeModule(placed, numRows, numCols, numRows - 1, 0, bitPos, 0)
  placeModule(placed, numRows, numCols, numRows - 1, numCols - 1, bitPos, 1)
  placeModule(placed, numRows, numCols, 0, numCols - 3, bitPos, 2)
  placeModule(placed, numRows, numCols, 0, numCols - 2, bitPos, 3)
  placeModule(placed, numRows, numCols, 0, numCols - 1, bitPos, 4)
  placeModule(placed, numRows, numCols, 1, numCols - 3, bitPos, 5)
  placeModule(placed, numRows, numCols, 1, numCols - 2, bitPos, 6)
  placeModule(placed, numRows, numCols, 1, numCols - 1, bitPos, 7)
  return bitPos + 8
}

/**
 * Place all codewords into the final matrix using the placement map.
 * Adds finder patterns (L-shape) and clock track (alternating) borders.
 *
 * @param allCodewords - Data codewords followed by EC codewords
 * @param symbol - Symbol size definition
 * @returns 2D boolean matrix (true = dark module)
 */
export function placeModules(allCodewords: number[], symbol: SymbolSize): boolean[][] {
  const { horizontalRegions, verticalRegions } = getDataRegionCount(symbol)
  const mappingRows = symbol.dataRegionRows * verticalRegions
  const mappingCols = symbol.dataRegionCols * horizontalRegions

  // Build placement map
  const placementMap = buildPlacementMap(mappingRows, mappingCols)

  // Create the mapping (logical) matrix
  const mappingMatrix: boolean[][] = Array.from({ length: mappingRows }, () =>
    Array.from<boolean>({ length: mappingCols }).fill(false),
  )

  // Place codeword bits into the mapping matrix
  for (let r = 0; r < mappingRows; r++) {
    for (let c = 0; c < mappingCols; c++) {
      const bitIndex = placementMap[r * mappingCols + c]!
      if (bitIndex === -2) {
        // Fixed dark module (bottom-right corner pattern)
        mappingMatrix[r]![c] = true
      } else if (bitIndex >= 0) {
        const codewordIndex = Math.floor(bitIndex / 8)
        const bitOffset = bitIndex % 8
        if (codewordIndex < allCodewords.length) {
          // MSB first: bit 0 is the most significant bit
          const bitValue = (allCodewords[codewordIndex]! >> (7 - bitOffset)) & 1
          mappingMatrix[r]![c] = bitValue === 1
        }
      }
    }
  }

  // Build the final matrix with finder patterns and alignment patterns
  const finalMatrix: boolean[][] = Array.from({ length: symbol.rows }, () =>
    Array.from<boolean>({ length: symbol.cols }).fill(false),
  )

  // Draw finder patterns and clock tracks for each data region
  for (let vr = 0; vr < verticalRegions; vr++) {
    for (let hr = 0; hr < horizontalRegions; hr++) {
      const regionStartRow = vr * (symbol.dataRegionRows + 2)
      const regionStartCol = hr * (symbol.dataRegionCols + 2)

      // Clock track: alternating top edge and right edge
      for (let c = 0; c < symbol.dataRegionCols + 2; c++) {
        // Top alternating line: even columns dark, odd columns light
        finalMatrix[regionStartRow]![regionStartCol + c] = c % 2 === 0
      }
      for (let r = 0; r < symbol.dataRegionRows + 2; r++) {
        // Right alternating line: even rows light, odd rows dark
        finalMatrix[regionStartRow + r]![regionStartCol + symbol.dataRegionCols + 1] = r % 2 !== 0
      }

      // L-shaped finder pattern (drawn after clock track so solid edges take precedence at corners)
      for (let c = 0; c < symbol.dataRegionCols + 2; c++) {
        // Bottom solid line
        finalMatrix[regionStartRow + symbol.dataRegionRows + 1]![regionStartCol + c] = true
      }
      for (let r = 0; r < symbol.dataRegionRows + 2; r++) {
        // Left solid line
        finalMatrix[regionStartRow + r]![regionStartCol] = true
      }

      // Copy data modules from mapping matrix into the data region
      for (let dr = 0; dr < symbol.dataRegionRows; dr++) {
        for (let dc = 0; dc < symbol.dataRegionCols; dc++) {
          const mappingRow = vr * symbol.dataRegionRows + dr
          const mappingCol = hr * symbol.dataRegionCols + dc
          const finalRow = regionStartRow + 1 + dr
          const finalCol = regionStartCol + 1 + dc
          finalMatrix[finalRow]![finalCol] = mappingMatrix[mappingRow]![mappingCol]!
        }
      }
    }
  }

  return finalMatrix
}
