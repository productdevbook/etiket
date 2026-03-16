/**
 * MicroPDF417 encoder (ISO/IEC 24728)
 * Compact variant of PDF417 for small items
 *
 * Features:
 * - 1-4 data columns (vs 1-30 in PDF417)
 * - 4-44 rows
 * - No start/stop patterns (uses Row Address Patterns instead)
 * - Smaller than standard PDF417 for short data
 */

import { InvalidInputError, CapacityError } from "../errors";
import { getCodewordPattern, getRowCluster } from "./pdf417/tables";
import { encodeData } from "./pdf417/encoder";
import { generateECCodewords } from "./pdf417/ec";

// MicroPDF417 symbol sizes: [columns, rows, dataCW, ecCW]
const SYMBOL_SIZES: [number, number, number, number][] = [
  [1, 11, 1, 6], // smallest
  [1, 14, 4, 6],
  [1, 17, 7, 6],
  [1, 20, 10, 6],
  [1, 24, 14, 7],
  [1, 28, 18, 7],
  [2, 8, 4, 8],
  [2, 11, 10, 8],
  [2, 14, 16, 8],
  [2, 17, 22, 10],
  [2, 20, 28, 11],
  [2, 23, 34, 12],
  [2, 26, 40, 14],
  [3, 6, 4, 10],
  [3, 8, 10, 10],
  [3, 10, 16, 12],
  [3, 12, 22, 14],
  [3, 15, 31, 16],
  [3, 20, 46, 18],
  [3, 26, 64, 20],
  [3, 32, 82, 24],
  [3, 38, 100, 28],
  [3, 44, 118, 32],
  [4, 4, 4, 8],
  [4, 6, 12, 8],
  [4, 8, 20, 10],
  [4, 10, 28, 12],
  [4, 12, 36, 14],
  [4, 15, 48, 16],
  [4, 20, 68, 22],
  [4, 26, 88, 28],
  [4, 32, 108, 32],
  [4, 38, 128, 36],
  [4, 44, 148, 40],
];

export interface MicroPDF417Options {
  columns?: 1 | 2 | 3 | 4;
}

export interface MicroPDF417Result {
  matrix: boolean[][];
  rows: number;
  cols: number;
}

/**
 * Encode text as MicroPDF417
 */
export function encodeMicroPDF417(
  text: string,
  options: MicroPDF417Options = {},
): MicroPDF417Result {
  if (text.length === 0) {
    throw new InvalidInputError("MicroPDF417 input must not be empty");
  }

  // Encode data to codewords
  const dataCW = encodeData(text);

  // Select symbol size
  const symbol = selectSize(dataCW.length, options.columns);
  if (!symbol) {
    throw new CapacityError(`Data too long for MicroPDF417: ${dataCW.length} codewords needed`);
  }

  const [cols, rows, maxDataCW, ecCW] = symbol;

  // Pad data codewords
  while (dataCW.length < maxDataCW) {
    dataCW.push(900); // text compaction latch as pad
  }

  // Generate EC codewords
  const ecLevel = Math.ceil(Math.log2(ecCW)) - 1;
  const ec = generateECCodewords(dataCW, Math.max(0, Math.min(ecLevel, 8)));

  // Combine
  const allCW = [...dataCW, ...ec.slice(0, ecCW)];

  // Build matrix
  // const moduleWidth = cols * 17 + 17 + 17; // data + left RAP + right RAP
  const matrix: boolean[][] = [];

  for (let row = 0; row < rows; row++) {
    const cluster = getRowCluster(row);
    const rowModules: boolean[] = [];

    // Left Row Address Pattern (simplified: use cluster 0 codeword for row indicator)
    const leftRAP = getCodewordPattern(row % 929, cluster);
    for (const w of leftRAP) {
      for (let i = 0; i < w; i++) {
        rowModules.push(rowModules.length % 2 === 0);
      }
    }

    // Data codewords for this row
    for (let col = 0; col < cols; col++) {
      const cwIndex = row * cols + col;
      const cw = cwIndex < allCW.length ? allCW[cwIndex]! : 0;
      const pattern = getCodewordPattern(cw % 929, cluster);
      let isBar = true;
      for (const w of pattern) {
        for (let i = 0; i < w; i++) {
          rowModules.push(isBar);
        }
        isBar = !isBar;
      }
    }

    // Right Row Address Pattern
    const rightRAP = getCodewordPattern((row + 1) % 929, cluster);
    let isBar = true;
    for (const w of rightRAP) {
      for (let i = 0; i < w; i++) {
        rowModules.push(isBar);
      }
      isBar = !isBar;
    }

    // Termination bar
    rowModules.push(true);

    matrix.push(rowModules);
  }

  return { matrix, rows, cols: matrix[0]?.length ?? 0 };
}

function selectSize(
  dataCWCount: number,
  requestedCols?: number,
): [number, number, number, number] | undefined {
  for (const size of SYMBOL_SIZES) {
    const [cols, _rows, maxData, _ec] = size;
    if (requestedCols && cols !== requestedCols) continue;
    if (dataCWCount <= maxData) return size;
  }
  return undefined;
}
