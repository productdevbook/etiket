/**
 * Data Matrix ECC 200 symbol size tables
 * Based on ISO/IEC 16022
 */

export interface SymbolSize {
  rows: number
  cols: number
  dataRegionRows: number
  dataRegionCols: number
  totalDataCodewords: number
  ecCodewords: number
  interleavedBlocks: number
}

// prettier-ignore
export const SYMBOL_SIZES: readonly SymbolSize[] = [
  // Square sizes
  { rows: 10,  cols: 10,  dataRegionRows: 8,  dataRegionCols: 8,  totalDataCodewords: 3,    ecCodewords: 5,   interleavedBlocks: 1  },
  { rows: 12,  cols: 12,  dataRegionRows: 10, dataRegionCols: 10, totalDataCodewords: 5,    ecCodewords: 7,   interleavedBlocks: 1  },
  { rows: 14,  cols: 14,  dataRegionRows: 12, dataRegionCols: 12, totalDataCodewords: 8,    ecCodewords: 10,  interleavedBlocks: 1  },
  { rows: 16,  cols: 16,  dataRegionRows: 14, dataRegionCols: 14, totalDataCodewords: 12,   ecCodewords: 12,  interleavedBlocks: 1  },
  { rows: 18,  cols: 18,  dataRegionRows: 16, dataRegionCols: 16, totalDataCodewords: 18,   ecCodewords: 14,  interleavedBlocks: 1  },
  { rows: 20,  cols: 20,  dataRegionRows: 18, dataRegionCols: 18, totalDataCodewords: 22,   ecCodewords: 18,  interleavedBlocks: 1  },
  { rows: 22,  cols: 22,  dataRegionRows: 20, dataRegionCols: 20, totalDataCodewords: 30,   ecCodewords: 20,  interleavedBlocks: 1  },
  { rows: 24,  cols: 24,  dataRegionRows: 22, dataRegionCols: 22, totalDataCodewords: 36,   ecCodewords: 24,  interleavedBlocks: 1  },
  { rows: 26,  cols: 26,  dataRegionRows: 24, dataRegionCols: 24, totalDataCodewords: 44,   ecCodewords: 28,  interleavedBlocks: 1  },
  { rows: 32,  cols: 32,  dataRegionRows: 14, dataRegionCols: 14, totalDataCodewords: 62,   ecCodewords: 36,  interleavedBlocks: 1  },
  { rows: 36,  cols: 36,  dataRegionRows: 16, dataRegionCols: 16, totalDataCodewords: 86,   ecCodewords: 42,  interleavedBlocks: 1  },
  { rows: 40,  cols: 40,  dataRegionRows: 18, dataRegionCols: 18, totalDataCodewords: 114,  ecCodewords: 48,  interleavedBlocks: 1  },
  { rows: 44,  cols: 44,  dataRegionRows: 20, dataRegionCols: 20, totalDataCodewords: 144,  ecCodewords: 56,  interleavedBlocks: 1  },
  { rows: 48,  cols: 48,  dataRegionRows: 22, dataRegionCols: 22, totalDataCodewords: 174,  ecCodewords: 68,  interleavedBlocks: 1  },
  { rows: 52,  cols: 52,  dataRegionRows: 24, dataRegionCols: 24, totalDataCodewords: 204,  ecCodewords: 84,  interleavedBlocks: 2  },
  { rows: 64,  cols: 64,  dataRegionRows: 14, dataRegionCols: 14, totalDataCodewords: 280,  ecCodewords: 112, interleavedBlocks: 2  },
  { rows: 72,  cols: 72,  dataRegionRows: 16, dataRegionCols: 16, totalDataCodewords: 368,  ecCodewords: 144, interleavedBlocks: 4  },
  { rows: 80,  cols: 80,  dataRegionRows: 18, dataRegionCols: 18, totalDataCodewords: 456,  ecCodewords: 192, interleavedBlocks: 4  },
  { rows: 88,  cols: 88,  dataRegionRows: 20, dataRegionCols: 20, totalDataCodewords: 576,  ecCodewords: 224, interleavedBlocks: 4  },
  { rows: 96,  cols: 96,  dataRegionRows: 22, dataRegionCols: 22, totalDataCodewords: 696,  ecCodewords: 272, interleavedBlocks: 4  },
  { rows: 104, cols: 104, dataRegionRows: 24, dataRegionCols: 24, totalDataCodewords: 816,  ecCodewords: 336, interleavedBlocks: 6  },
  { rows: 120, cols: 120, dataRegionRows: 18, dataRegionCols: 18, totalDataCodewords: 1050, ecCodewords: 408, interleavedBlocks: 6  },
  { rows: 132, cols: 132, dataRegionRows: 20, dataRegionCols: 20, totalDataCodewords: 1304, ecCodewords: 496, interleavedBlocks: 8  },
  { rows: 144, cols: 144, dataRegionRows: 22, dataRegionCols: 22, totalDataCodewords: 1558, ecCodewords: 620, interleavedBlocks: 10 },

  // Rectangular sizes
  { rows: 8,  cols: 18, dataRegionRows: 6,  dataRegionCols: 16, totalDataCodewords: 5,  ecCodewords: 7,  interleavedBlocks: 1 },
  { rows: 8,  cols: 32, dataRegionRows: 6,  dataRegionCols: 14, totalDataCodewords: 10, ecCodewords: 11, interleavedBlocks: 1 },
  { rows: 12, cols: 26, dataRegionRows: 10, dataRegionCols: 24, totalDataCodewords: 16, ecCodewords: 14, interleavedBlocks: 1 },
  { rows: 12, cols: 36, dataRegionRows: 10, dataRegionCols: 16, totalDataCodewords: 22, ecCodewords: 18, interleavedBlocks: 1 },
  { rows: 16, cols: 36, dataRegionRows: 14, dataRegionCols: 16, totalDataCodewords: 32, ecCodewords: 24, interleavedBlocks: 1 },
  { rows: 16, cols: 48, dataRegionRows: 14, dataRegionCols: 22, totalDataCodewords: 49, ecCodewords: 28, interleavedBlocks: 1 },
]

/** Select the smallest symbol size that can hold the given number of data codewords */
export function selectSymbolSize(dataCodewords: number): SymbolSize | undefined {
  for (const size of SYMBOL_SIZES) {
    if (size.totalDataCodewords >= dataCodewords) {
      return size
    }
  }
  return undefined
}

/**
 * Compute the number of data region horizontal/vertical counts.
 * For symbols larger than a single data region, the matrix is split
 * into multiple data regions separated by alignment patterns.
 */
export function getDataRegionCount(symbol: SymbolSize): {
  horizontalRegions: number
  verticalRegions: number
} {
  const horizontalRegions = symbol.cols / (symbol.dataRegionCols + 2)
  const verticalRegions = symbol.rows / (symbol.dataRegionRows + 2)
  return { horizontalRegions, verticalRegions }
}
