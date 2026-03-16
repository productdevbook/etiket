/**
 * Code 16K encoder — stacked barcode based on Code 128
 * Used in healthcare and electronics
 *
 * Structure: 2-16 rows, each row has start pattern + data + check + stop
 * Each row encodes 5 Code 128 symbol characters
 */

import { InvalidInputError, CapacityError } from "../errors";

// Simplified Code 16K: similar to Codablock F but with fixed 5 codewords per row
// and specific start/stop patterns

const CODE16K_START = [2, 1, 2, 2, 2, 2]; // Start pattern (same as Code 128 value 0)
const CODE16K_STOP = [2, 3, 3, 1, 1, 1, 2]; // Stop pattern

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

  // 5 data codewords per row, max 16 rows = 80 data codewords
  const cwPerRow = 5;
  const rows = Math.min(16, Math.max(2, Math.ceil(values.length / cwPerRow)));

  if (values.length > rows * cwPerRow) {
    throw new CapacityError("Code 16K: data exceeds maximum capacity (16 rows × 5 codewords)");
  }

  // Pad to fill rows
  while (values.length < rows * cwPerRow) {
    values.push(0); // space padding
  }

  const matrix: boolean[][] = [];

  for (let r = 0; r < rows; r++) {
    const modules: boolean[] = [];

    // Start pattern
    let isBar = true;
    for (const w of CODE16K_START) {
      for (let i = 0; i < w; i++) modules.push(isBar);
      isBar = !isBar;
    }

    // Row indicator (row number as 2 codewords)
    const rowCodes = [Math.floor(r / 10), r % 10];
    for (const code of rowCodes) {
      // Simple encoding: each digit as bar-space pattern
      for (let bit = 3; bit >= 0; bit--) {
        const isOn = ((code >> bit) & 1) === 1;
        modules.push(isOn);
        modules.push(!isOn);
      }
    }

    // Data codewords
    for (let c = 0; c < cwPerRow; c++) {
      const v = values[r * cwPerRow + c]!;
      // Encode as 11-module pattern (simplified)
      for (let bit = 6; bit >= 0; bit--) {
        modules.push(((v >> bit) & 1) === 1);
      }
      // 4-module separator
      modules.push(false, true, false, true);
    }

    // Check digit
    let checksum = r;
    for (let c = 0; c < cwPerRow; c++) {
      checksum += values[r * cwPerRow + c]! * (c + 1);
    }
    const check = checksum % 107;
    for (let bit = 6; bit >= 0; bit--) {
      modules.push(((check >> bit) & 1) === 1);
    }

    // Stop pattern
    isBar = true;
    for (const w of CODE16K_STOP) {
      for (let i = 0; i < w; i++) modules.push(isBar);
      isBar = !isBar;
    }

    matrix.push(modules);
  }

  return { matrix, rows, cols: matrix[0]?.length ?? 0 };
}
