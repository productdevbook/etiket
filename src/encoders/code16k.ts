/**
 * Code 16K encoder — stacked barcode based on Code 128
 * Used in healthcare and electronics
 *
 * Structure: 2-16 rows, each with start pattern + 5 symbol characters + stop pattern
 * Uses Code 128 bar patterns with row-specific start codes
 */

import { InvalidInputError, CapacityError } from "../errors";

// Code 128 encoding patterns (bar/space widths)
// Each pattern is 6 elements: bar, space, bar, space, bar, space (11 modules total)
// prettier-ignore
const PATTERNS: number[][] = [
  [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
  [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
  [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
  [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
  [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
  [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
  [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
  [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
  [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
  [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
  [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
  [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
  [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
  [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
  [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
  [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
  [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
  [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
  [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
  [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
  [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
  [2,1,1,2,3,2],
];

const STOP_PATTERN = [2, 3, 3, 1, 1, 1, 2]; // 7 elements, 13 modules

// Code 16K uses Code 128 value 96 (CODE_A) as the start for each row
// The first data codeword in each row encodes mode + row information
const CODE_B = 100;

export interface Code16KResult {
  matrix: boolean[][];
  rows: number;
  cols: number;
}

/**
 * Encode text as Code 16K
 *
 * @param text - Printable ASCII text
 * @returns Stacked barcode matrix
 */
export function encodeCode16K(text: string): Code16KResult {
  if (text.length === 0) {
    throw new InvalidInputError("Code 16K input must not be empty");
  }

  // Encode as Code 128B values
  const values: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) {
      throw new InvalidInputError(`Code 16K: unsupported character (code ${code})`);
    }
    values.push(code - 32);
  }

  // 5 data symbol characters per row, max 16 rows
  const cwPerRow = 5;
  const rows = Math.min(16, Math.max(2, Math.ceil(values.length / cwPerRow)));

  if (values.length > rows * cwPerRow) {
    throw new CapacityError("Code 16K: data exceeds maximum capacity (16 rows × 5 codewords)");
  }

  // Pad to fill rows
  while (values.length < rows * cwPerRow) {
    values.push(0); // space padding (Code B value 0 = space)
  }

  const matrix: boolean[][] = [];

  for (let r = 0; r < rows; r++) {
    // Build codeword sequence for this row
    const rowCodes: number[] = [];

    // Start symbol: Code 128 Start B (value 104)
    rowCodes.push(104);

    // First codeword: row indicator using CODE_B + row number mod
    // For Code 16K, the first symbol after start encodes the row mode
    rowCodes.push(CODE_B); // Switch to Code B
    rowCodes.push(r); // Row number as first data codeword

    // Data codewords for this row
    for (let c = 0; c < cwPerRow; c++) {
      rowCodes.push(values[r * cwPerRow + c]!);
    }

    // Calculate check digit (mod 103, same as Code 128)
    let checksum = rowCodes[0]!;
    for (let i = 1; i < rowCodes.length; i++) {
      checksum += rowCodes[i]! * i;
    }
    rowCodes.push(checksum % 103);

    // Convert codewords to module pattern
    const modules: boolean[] = [];
    let isBar = true;

    // Encode all codewords using Code 128 patterns
    for (const cw of rowCodes) {
      const pattern = PATTERNS[cw]!;
      for (const w of pattern) {
        for (let i = 0; i < w; i++) {
          modules.push(isBar);
        }
        isBar = !isBar;
      }
    }

    // Stop pattern
    for (const w of STOP_PATTERN) {
      for (let i = 0; i < w; i++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }

    matrix.push(modules);
  }

  return { matrix, rows, cols: matrix[0]?.length ?? 0 };
}
