/**
 * PDF417 barcode encoder — ISO/IEC 15438 implementation
 * Stacked 2D barcode with rows of codewords (each 17 modules wide)
 *
 * Supports text, byte, and numeric compaction modes with
 * Reed-Solomon error correction over GF(929).
 */

import { InvalidInputError, CapacityError } from "../../errors";
import { encodeData } from "./encoder";
import { generateECCodewords, getECCount, recommendedECLevel } from "./ec";
import { getCodewordPattern, getRowCluster, START_PATTERN, STOP_PATTERN } from "./tables";

export interface PDF417Options {
  /** Error correction level 0-8, default auto-selected based on data size */
  ecLevel?: number;
  /** Number of data columns (1-30), auto-calculated if omitted */
  columns?: number;
  /** Compact PDF417 (omits right row indicator) */
  compact?: boolean;
}

export interface PDF417Result {
  /** 2D boolean matrix (true = black bar, false = white space) */
  matrix: boolean[][];
  /** Number of rows in the symbol */
  rows: number;
  /** Number of module columns in the symbol */
  cols: number;
}

/** Maximum data codewords in a PDF417 symbol */
const MAX_DATA_CODEWORDS = 925; // 929 - 1 (length) - 3 (reserved)
/** Minimum rows */
const MIN_ROWS = 3;
/** Maximum rows */
const MAX_ROWS = 90;
/** Minimum data columns */
const MIN_COLS = 1;
/** Maximum data columns */
const MAX_COLS = 30;

/**
 * Encode text as a PDF417 barcode.
 *
 * @param text - The text to encode
 * @param options - Optional encoding parameters
 * @returns Object with boolean matrix and dimensions
 *
 * @example
 * ```ts
 * const result = encodePDF417('Hello, World!')
 * // result.matrix is a 2D boolean array
 * // result.rows and result.cols give the dimensions
 * ```
 */
export function encodePDF417(text: string, options: PDF417Options = {}): PDF417Result {
  if (text.length === 0) {
    throw new InvalidInputError("PDF417 input must not be empty");
  }

  const compact = options.compact ?? false;

  // Step 1: Encode text into data codewords
  const dataCodewords = encodeData(text);

  if (dataCodewords.length > MAX_DATA_CODEWORDS) {
    throw new CapacityError(
      `PDF417 data too large: ${dataCodewords.length} codewords exceeds maximum of ${MAX_DATA_CODEWORDS}`,
    );
  }

  // Step 2: Determine EC level
  const ecLevel = options.ecLevel ?? recommendedECLevel(dataCodewords.length);
  if (ecLevel < 0 || ecLevel > 8) {
    throw new InvalidInputError("PDF417 EC level must be 0-8");
  }
  const ecCount = getECCount(ecLevel);

  // Step 3: Calculate symbol dimensions
  // Total codewords = 1 (length descriptor) + data + EC
  const totalDataWithLength = 1 + dataCodewords.length;
  // const totalCodewords = totalDataWithLength + ecCount;

  const { rows, cols } = calculateDimensions(totalDataWithLength, ecCount, options.columns);

  // Step 4: Pad data to fill the grid
  // Total data codeword slots = rows * cols - ecCount
  const dataSlots = rows * cols;
  const paddedData: number[] = [];

  // Symbol length descriptor (total codewords including this one, excluding EC)
  paddedData.push(totalDataWithLength);

  // Data codewords
  for (const cw of dataCodewords) {
    paddedData.push(cw);
  }

  // Padding codewords (900 = text compaction latch, used as padding)
  while (paddedData.length < dataSlots - ecCount) {
    paddedData.push(900);
  }

  // Step 5: Generate EC codewords
  const ecCodewords = generateECCodewords(paddedData, ecLevel);

  // Step 6: Combine data + EC into codeword array
  const allCodewords = [...paddedData, ...ecCodewords];

  // Step 7: Build the module matrix
  const matrix = buildMatrix(allCodewords, rows, cols, ecLevel, compact);

  return {
    matrix,
    rows: matrix.length,
    cols: matrix[0]!.length,
  };
}

/**
 * Calculate the number of rows and columns for the symbol.
 */
function calculateDimensions(
  dataWithLength: number,
  ecCount: number,
  requestedCols?: number,
): { rows: number; cols: number } {
  const totalCodewords = dataWithLength + ecCount;

  if (requestedCols !== undefined) {
    if (requestedCols < MIN_COLS || requestedCols > MAX_COLS) {
      throw new InvalidInputError(
        `PDF417 columns must be ${MIN_COLS}-${MAX_COLS}, got ${requestedCols}`,
      );
    }
    const rows = Math.ceil(totalCodewords / requestedCols);
    if (rows < MIN_ROWS) {
      return { rows: MIN_ROWS, cols: requestedCols };
    }
    if (rows > MAX_ROWS) {
      throw new CapacityError(
        `PDF417 data too large: requires ${rows} rows with ${requestedCols} columns (max ${MAX_ROWS})`,
      );
    }
    return { rows, cols: requestedCols };
  }

  // Auto-determine columns: try to find a good aspect ratio
  // Target roughly 3:1 width:height ratio in codewords
  // Each row has: start(17) + left(17) + data(cols*17) + right(17) + stop(18)
  // So module width = 69 + cols*17 for full, 52 + cols*17 for compact
  // Try columns from 1 to 30, pick one that gives rows in valid range
  // with a reasonable aspect ratio

  let bestCols = MIN_COLS;
  let bestRows = MAX_ROWS;
  let bestScore = Infinity;

  for (let c = MIN_COLS; c <= MAX_COLS; c++) {
    const r = Math.ceil(totalCodewords / c);
    if (r < MIN_ROWS || r > MAX_ROWS) continue;

    // Actual total including padding
    // Score based on wasted space and aspect ratio
    const totalSlots = r * c;
    const waste = totalSlots - totalCodewords;
    const moduleWidth = 69 + c * 17;
    const aspectRatio = moduleWidth / r;
    // Target aspect ratio ~3-4 for readability
    const aspectPenalty = Math.abs(aspectRatio - 3.5) * 10;
    const score = waste + aspectPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestCols = c;
      bestRows = r;
    }
  }

  // Ensure minimum rows
  if (bestRows < MIN_ROWS) bestRows = MIN_ROWS;

  return { rows: bestRows, cols: bestCols };
}

/**
 * Build the boolean module matrix for the PDF417 symbol.
 *
 * Each row contains:
 * - Start pattern (17 modules)
 * - Left row indicator codeword (17 modules)
 * - Data codewords (cols * 17 modules)
 * - Right row indicator codeword (17 modules) — omitted in compact mode
 * - Stop pattern (18 modules) — or 1-module stop in compact mode
 */
function buildMatrix(
  allCodewords: number[],
  rows: number,
  cols: number,
  ecLevel: number,
  compact: boolean,
): boolean[][] {
  const modulesPerRow = compact
    ? 17 + 17 + cols * 17 + 1 // start + left indicator + data + 1-module stop
    : 17 + 17 + cols * 17 + 17 + 18; // start + left indicator + data + right indicator + stop

  const matrix: boolean[][] = [];

  for (let row = 0; row < rows; row++) {
    const cluster = getRowCluster(row);
    const rowModules: boolean[] = Array.from({ length: modulesPerRow }, () => false);
    let modulePos = 0;

    // Start pattern
    modulePos = writePattern(rowModules, modulePos, START_PATTERN as number[]);

    // Left row indicator
    const leftIndicator = computeLeftIndicator(row, rows, cols, ecLevel);
    const leftPattern = getCodewordPattern(leftIndicator, cluster);
    modulePos = writePattern(rowModules, modulePos, leftPattern);

    // Data codewords for this row
    for (let col = 0; col < cols; col++) {
      const cwIndex = row * cols + col;
      const cw = cwIndex < allCodewords.length ? allCodewords[cwIndex]! : 900; // padding
      const pattern = getCodewordPattern(cw, cluster);
      modulePos = writePattern(rowModules, modulePos, pattern);
    }

    if (compact) {
      // Compact mode: 1-module stop bar
      rowModules[modulePos] = true;
    } else {
      // Right row indicator
      const rightIndicator = computeRightIndicator(row, rows, cols, ecLevel);
      const rightPattern = getCodewordPattern(rightIndicator, cluster);
      modulePos = writePattern(rowModules, modulePos, rightPattern);

      // Stop pattern
      writePattern(rowModules, modulePos, STOP_PATTERN as number[]);
    }

    matrix.push(rowModules);
  }

  return matrix;
}

/**
 * Write a bar/space pattern to the module row.
 * Alternating: first element is bar (true), second is space (false), etc.
 * Returns the new module position.
 */
function writePattern(modules: boolean[], startPos: number, pattern: number[]): number {
  let pos = startPos;
  for (let i = 0; i < pattern.length; i++) {
    const width = pattern[i]!;
    const isBar = i % 2 === 0; // even index = bar, odd index = space
    for (let w = 0; w < width; w++) {
      if (pos < modules.length) {
        modules[pos] = isBar;
      }
      pos++;
    }
  }
  return pos;
}

/**
 * Compute left row indicator codeword value.
 *
 * Left indicators encode different info based on cluster:
 * - Cluster 0 (row % 3 == 0): (row/3) * 30 + (rows-1)/3
 * - Cluster 3 (row % 3 == 1): (row/3) * 30 + ecLevel * 3 + (rows-1) % 3
 * - Cluster 6 (row % 3 == 2): (row/3) * 30 + (cols-1)
 */
function computeLeftIndicator(row: number, rows: number, cols: number, ecLevel: number): number {
  const clusterIndex = row % 3;
  const rowGroup = Math.floor(row / 3);

  switch (clusterIndex) {
    case 0:
      return rowGroup * 30 + Math.floor((rows - 1) / 3);
    case 1:
      return rowGroup * 30 + ecLevel * 3 + ((rows - 1) % 3);
    case 2:
      return rowGroup * 30 + (cols - 1);
    default:
      return 0;
  }
}

/**
 * Compute right row indicator codeword value.
 *
 * Right indicators encode different info based on cluster:
 * - Cluster 0 (row % 3 == 0): (row/3) * 30 + (cols-1)
 * - Cluster 3 (row % 3 == 1): (row/3) * 30 + (rows-1)/3
 * - Cluster 6 (row % 3 == 2): (row/3) * 30 + ecLevel * 3 + (rows-1) % 3
 */
function computeRightIndicator(row: number, rows: number, cols: number, ecLevel: number): number {
  const clusterIndex = row % 3;
  const rowGroup = Math.floor(row / 3);

  switch (clusterIndex) {
    case 0:
      return rowGroup * 30 + (cols - 1);
    case 1:
      return rowGroup * 30 + Math.floor((rows - 1) / 3);
    case 2:
      return rowGroup * 30 + ecLevel * 3 + ((rows - 1) % 3);
    default:
      return 0;
  }
}

export type { PDF417Options as PDF417EncoderOptions };
