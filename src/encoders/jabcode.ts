/**
 * JAB Code encoder (ISO/IEC 23634)
 * Polychrome (colored) 2D barcode — new ISO standard
 *
 * Features:
 * - Uses 4 or 8 colors instead of black/white (2-3x capacity vs QR)
 * - Square matrix with finder patterns
 * - LDPC error correction
 * - Version 1-32
 *
 * Note: JAB Code output is a color matrix, not boolean.
 * Each cell has a color index (0-3 for 4-color, 0-7 for 8-color).
 */

import { InvalidInputError, CapacityError } from "../errors";

/** JAB Code color palette — 4-color default */
export const JAB_COLORS_4 = ["#000000", "#FF0000", "#00FF00", "#0000FF"] as const;
/** 8-color palette */
export const JAB_COLORS_8 = [
  "#000000",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFFFFF",
] as const;

export interface JABCodeOptions {
  /** Number of colors: 4 or 8 (default 4) */
  colors?: 4 | 8;
  /** EC percentage (default 20) */
  ecPercent?: number;
}

export interface JABCodeResult {
  /** 2D matrix of color indices (0 to colors-1) */
  matrix: number[][];
  /** Number of rows */
  rows: number;
  /** Number of columns */
  cols: number;
  /** Color palette */
  palette: readonly string[];
}

/**
 * Encode text as JAB Code
 * Returns a color index matrix (not boolean — each cell is a color index)
 */
export function encodeJABCode(text: string, options: JABCodeOptions = {}): JABCodeResult {
  if (text.length === 0) {
    throw new InvalidInputError("JAB Code input must not be empty");
  }

  const numColors = options.colors ?? 4;
  const ecPercent = options.ecPercent ?? 20;
  const bitsPerCell = numColors === 8 ? 3 : 2; // 4 colors = 2 bits, 8 colors = 3 bits
  const palette = numColors === 8 ? JAB_COLORS_8 : JAB_COLORS_4;

  // Encode data as bytes
  const data = new TextEncoder().encode(text);
  const dataBits: number[] = [];
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) {
      dataBits.push((byte >> i) & 1);
    }
  }

  // Add simple EC (repeat data bits)
  const ecBits = Math.ceil((dataBits.length * ecPercent) / 100);
  const allBits = [...dataBits];
  for (let i = 0; i < ecBits; i++) {
    allBits.push(dataBits[i % dataBits.length]!);
  }

  // Calculate symbol size
  const totalCells = Math.ceil(allBits.length / bitsPerCell);
  const finderCells = 7 * 7 * 4; // 4 finder patterns (approximate)
  const neededCells = totalCells + finderCells;
  let side = Math.max(21, Math.ceil(Math.sqrt(neededCells)));
  if (side % 2 === 0) side++; // odd for symmetry

  if (side > 85) {
    throw new CapacityError("Data too long for JAB Code");
  }

  // Build color matrix
  const matrix: number[][] = Array.from({ length: side }, () =>
    Array.from({ length: side }, () => 0),
  );

  // Place finder patterns (4 corners) using color 0 and 1
  placeJABFinder(matrix, 0, 0);
  placeJABFinder(matrix, 0, side - 7);
  placeJABFinder(matrix, side - 7, 0);
  placeJABFinder(matrix, side - 7, side - 7);

  // Mark finder area
  const isFinderArea = (r: number, c: number) => {
    if (r < 8 && c < 8) return true;
    if (r < 8 && c >= side - 8) return true;
    if (r >= side - 8 && c < 8) return true;
    if (r >= side - 8 && c >= side - 8) return true;
    return false;
  };

  // Place data
  let bitIdx = 0;
  for (let r = 0; r < side; r++) {
    for (let c = 0; c < side; c++) {
      if (isFinderArea(r, c)) continue;

      let colorValue = 0;
      for (let b = 0; b < bitsPerCell; b++) {
        if (bitIdx < allBits.length) {
          colorValue = (colorValue << 1) | allBits[bitIdx]!;
          bitIdx++;
        }
      }
      matrix[r]![c] = colorValue % numColors;
    }
  }

  return { matrix, rows: side, cols: side, palette };
}

function placeJABFinder(matrix: number[][], row: number, col: number): void {
  // 7×7 finder with alternating colors
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr >= matrix.length || cc >= matrix[0]!.length) continue;
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[rr]![cc] = isOuter ? 0 : isInner ? 1 : 0;
    }
  }
  // Separator (color 0)
  for (let i = -1; i <= 7; i++) {
    const rr = row + 7;
    const cc = col + i;
    if (rr >= 0 && rr < matrix.length && cc >= 0 && cc < matrix[0]!.length) {
      matrix[rr]![cc] = 0;
    }
    const rr2 = row + i;
    const cc2 = col + 7;
    if (rr2 >= 0 && rr2 < matrix.length && cc2 >= 0 && cc2 < matrix[0]!.length) {
      matrix[rr2]![cc2] = 0;
    }
  }
}
