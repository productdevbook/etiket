/**
 * QR Code matrix construction
 * Function patterns, data placement, alignment patterns
 */

import { ALIGNMENT_POSITIONS } from "./tables";

export type Module = boolean | null;

/** Create an empty matrix of the given size */
export function createMatrix(size: number): Module[][] {
  return Array.from({ length: size }, () => Array.from<Module>({ length: size }).fill(null));
}

/** Place all function patterns on the matrix */
export function placeFunctionPatterns(matrix: Module[][], version: number): void {
  const size = matrix.length;

  // Finder patterns (3 corners)
  placeFinder(matrix, 0, 0);
  placeFinder(matrix, size - 7, 0);
  placeFinder(matrix, 0, size - 7);

  // Timing patterns
  placeTiming(matrix, size);

  // Alignment patterns
  placeAlignmentPatterns(matrix, version);

  // Dark module
  matrix[4 * version + 9]![8] = true;

  // Reserve format info areas
  reserveFormatInfo(matrix, size);

  // Reserve version info areas (v7+)
  if (version >= 7) {
    reserveVersionInfo(matrix, size);
  }
}

/** Place a 7x7 finder pattern with separator at (row, col) */
function placeFinder(matrix: Module[][], row: number, col: number): void {
  const size = matrix.length;

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[row + r]![col + c] = isOuter || isInner;
    }
  }

  // Separator (white border)
  for (let i = -1; i <= 7; i++) {
    setSafe(matrix, row - 1, col + i, false, size);
    setSafe(matrix, row + 7, col + i, false, size);
    setSafe(matrix, row + i, col - 1, false, size);
    setSafe(matrix, row + i, col + 7, false, size);
  }
}

function setSafe(matrix: Module[][], r: number, c: number, val: boolean, size: number): void {
  if (r >= 0 && r < size && c >= 0 && c < size) {
    matrix[r]![c] = val;
  }
}

/** Place timing patterns (row 6 and column 6) */
function placeTiming(matrix: Module[][], size: number): void {
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6]![i] === null) matrix[6]![i] = i % 2 === 0;
    if (matrix[i]![6] === null) matrix[i]![6] = i % 2 === 0;
  }
}

/** Place alignment patterns for version 2+ */
function placeAlignmentPatterns(matrix: Module[][], version: number): void {
  if (version < 2) return;
  const positions = ALIGNMENT_POSITIONS[version - 1]!;

  for (const row of positions) {
    for (const col of positions) {
      // Skip if overlapping with finder patterns
      if (matrix[row]![col] !== null) continue;
      placeAlignment(matrix, row, col);
    }
  }
}

/** Place a single 5x5 alignment pattern centered at (row, col) */
function placeAlignment(matrix: Module[][], row: number, col: number): void {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      matrix[row + r]![col + c] = isOuter || isCenter;
    }
  }
}

/** Reserve format info areas (will be written after masking) */
function reserveFormatInfo(matrix: Module[][], size: number): void {
  // Around top-left finder
  for (let i = 0; i <= 8; i++) {
    if (i < size && matrix[8]![i] === null) matrix[8]![i] = false;
    if (i < size && matrix[i]![8] === null) matrix[i]![8] = false;
  }

  // Bottom-left
  for (let i = 0; i < 7; i++) {
    if (matrix[size - 1 - i]![8] === null) matrix[size - 1 - i]![8] = false;
  }

  // Top-right
  for (let i = 0; i < 8; i++) {
    if (matrix[8]![size - 1 - i] === null) matrix[8]![size - 1 - i] = false;
  }
}

/** Reserve version info areas for version 7+ */
function reserveVersionInfo(matrix: Module[][], size: number): void {
  // Bottom-left block: rows [size-11, size-10, size-9], cols [0..5]
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 3; c++) {
      if (matrix[size - 11 + c]![r] === null) matrix[size - 11 + c]![r] = false;
    }
  }
  // Top-right block: rows [0..5], cols [size-11, size-10, size-9]
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 3; c++) {
      if (matrix[r]![size - 11 + c] === null) matrix[r]![size - 11 + c] = false;
    }
  }
}

/**
 * Place data bits in the matrix using the zigzag pattern
 * Right-to-left, alternating upward/downward, 2-column wide
 */
export function placeData(matrix: Module[][], bits: number[], _version: number): void {
  const size = matrix.length;
  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col >= 1; col -= 2) {
    // Skip timing column
    if (col === 6) col = 5;

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (matrix[row]![c] === null) {
          matrix[row]![c] = bitIdx < bits.length ? bits[bitIdx]! === 1 : false;
          bitIdx++;
        }
      }
    }

    upward = !upward;
  }
}

/**
 * Check if a module is a data module (not a function pattern)
 */
export function isDataModule(r: number, c: number, size: number, version: number): boolean {
  // Finder patterns + separators
  if (r < 9 && c < 9) return false; // top-left
  if (r < 9 && c >= size - 8) return false; // top-right
  if (r >= size - 8 && c < 9) return false; // bottom-left

  // Timing patterns
  if (r === 6 || c === 6) return false;

  // Alignment patterns
  if (version >= 2) {
    const positions = ALIGNMENT_POSITIONS[version - 1]!;
    for (const ar of positions) {
      for (const ac of positions) {
        // Skip alignment patterns that overlap with finder
        if (ar < 9 && ac < 9) continue;
        if (ar < 9 && ac >= size - 8) continue;
        if (ar >= size - 8 && ac < 9) continue;

        if (r >= ar - 2 && r <= ar + 2 && c >= ac - 2 && c <= ac + 2) return false;
      }
    }
  }

  // Version info (v7+)
  if (version >= 7) {
    if (r < 6 && c >= size - 11 && c <= size - 9) return false;
    if (c < 6 && r >= size - 11 && r <= size - 9) return false;
  }

  // Dark module
  if (r === 4 * version + 9 && c === 8) return false;

  return true;
}
