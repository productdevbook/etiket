/**
 * Codablock F encoder — stacked Code 128 barcode
 * Used in healthcare and electronics for compact labeling
 *
 * Structure: multiple rows of Code 128 with row indicators
 * Each row: Start C + row indicator + data codewords + check + Stop
 */

import { InvalidInputError, CapacityError } from "../errors";

// Code 128 constants
const START_C = 105;
const CODE_A = 101;
const CODE_B = 100;
const CODE_C = 99;

// Full Code 128 encoding patterns (bar/space widths), indices 0-105
// Each pattern is 6 elements: bar, space, bar, space, bar, space
const PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], // 0
  [2, 2, 2, 1, 2, 2], // 1
  [2, 2, 2, 2, 2, 1], // 2
  [1, 2, 1, 2, 2, 3], // 3
  [1, 2, 1, 3, 2, 2], // 4
  [1, 3, 1, 2, 2, 2], // 5
  [1, 2, 2, 2, 1, 3], // 6
  [1, 2, 2, 3, 1, 2], // 7
  [1, 3, 2, 2, 1, 2], // 8
  [2, 2, 1, 2, 1, 3], // 9
  [2, 2, 1, 3, 1, 2], // 10
  [2, 3, 1, 2, 1, 2], // 11
  [1, 1, 2, 2, 3, 2], // 12
  [1, 2, 2, 1, 3, 2], // 13
  [1, 2, 2, 2, 3, 1], // 14
  [1, 1, 3, 2, 2, 2], // 15
  [1, 2, 3, 1, 2, 2], // 16
  [1, 2, 3, 2, 2, 1], // 17
  [2, 2, 3, 2, 1, 1], // 18
  [2, 2, 1, 1, 3, 2], // 19
  [2, 2, 1, 2, 3, 1], // 20
  [2, 1, 3, 2, 1, 2], // 21
  [2, 2, 3, 1, 1, 2], // 22
  [3, 1, 2, 1, 3, 1], // 23
  [3, 1, 1, 2, 2, 2], // 24
  [3, 2, 1, 1, 2, 2], // 25
  [3, 2, 1, 2, 2, 1], // 26
  [3, 1, 2, 2, 1, 2], // 27
  [3, 2, 2, 1, 1, 2], // 28
  [3, 2, 2, 2, 1, 1], // 29
  [2, 1, 2, 1, 2, 3], // 30
  [2, 1, 2, 3, 2, 1], // 31
  [2, 3, 2, 1, 2, 1], // 32
  [1, 1, 1, 3, 2, 3], // 33
  [1, 3, 1, 1, 2, 3], // 34
  [1, 3, 1, 3, 2, 1], // 35
  [1, 1, 2, 3, 1, 3], // 36
  [1, 3, 2, 1, 1, 3], // 37
  [1, 3, 2, 3, 1, 1], // 38
  [2, 1, 1, 3, 1, 3], // 39
  [2, 3, 1, 1, 1, 3], // 40
  [2, 3, 1, 3, 1, 1], // 41
  [1, 1, 2, 1, 3, 3], // 42
  [1, 1, 2, 3, 3, 1], // 43
  [1, 3, 2, 1, 3, 1], // 44
  [1, 1, 3, 1, 2, 3], // 45
  [1, 1, 3, 3, 2, 1], // 46
  [1, 3, 3, 1, 2, 1], // 47
  [3, 1, 3, 1, 2, 1], // 48
  [2, 1, 1, 3, 3, 1], // 49
  [2, 3, 1, 1, 3, 1], // 50
  [2, 1, 3, 1, 1, 3], // 51
  [2, 1, 3, 3, 1, 1], // 52
  [2, 1, 3, 1, 3, 1], // 53
  [3, 1, 1, 1, 2, 3], // 54
  [3, 1, 1, 3, 2, 1], // 55
  [3, 3, 1, 1, 2, 1], // 56
  [3, 1, 2, 1, 1, 3], // 57
  [3, 1, 2, 3, 1, 1], // 58
  [3, 3, 2, 1, 1, 1], // 59
  [3, 1, 4, 1, 1, 1], // 60
  [2, 2, 1, 4, 1, 1], // 61
  [4, 3, 1, 1, 1, 1], // 62
  [1, 1, 1, 2, 2, 4], // 63
  [1, 1, 1, 4, 2, 2], // 64
  [1, 2, 1, 1, 2, 4], // 65
  [1, 2, 1, 4, 2, 1], // 66
  [1, 4, 1, 1, 2, 2], // 67
  [1, 4, 1, 2, 2, 1], // 68
  [1, 1, 2, 2, 1, 4], // 69
  [1, 1, 2, 4, 1, 2], // 70
  [1, 2, 2, 1, 1, 4], // 71
  [1, 2, 2, 4, 1, 1], // 72
  [1, 4, 2, 1, 1, 2], // 73
  [1, 4, 2, 2, 1, 1], // 74
  [2, 4, 1, 2, 1, 1], // 75
  [2, 2, 1, 1, 1, 4], // 76
  [4, 1, 3, 1, 1, 1], // 77
  [2, 4, 1, 1, 1, 2], // 78
  [1, 3, 4, 1, 1, 1], // 79
  [1, 1, 1, 2, 4, 2], // 80
  [1, 2, 1, 1, 4, 2], // 81
  [1, 2, 1, 2, 4, 1], // 82
  [1, 1, 4, 2, 1, 2], // 83
  [1, 2, 4, 1, 1, 2], // 84
  [1, 2, 4, 2, 1, 1], // 85
  [4, 1, 1, 2, 1, 2], // 86
  [4, 2, 1, 1, 1, 2], // 87
  [4, 2, 1, 2, 1, 1], // 88
  [2, 1, 2, 1, 4, 1], // 89
  [2, 1, 4, 1, 2, 1], // 90
  [4, 1, 2, 1, 2, 1], // 91
  [1, 1, 1, 1, 4, 3], // 92
  [1, 1, 1, 3, 4, 1], // 93
  [1, 3, 1, 1, 4, 1], // 94
  [1, 1, 4, 1, 1, 3], // 95
  [1, 1, 4, 3, 1, 1], // 96 (CODE_A)
  [4, 1, 1, 1, 1, 3], // 97 (CODE_B)
  [4, 1, 1, 3, 1, 1], // 98 (CODE_C)
  [1, 1, 3, 1, 4, 1], // 99 (CODE_C)
  [1, 1, 4, 1, 3, 1], // 100 (CODE_B)
  [3, 1, 1, 1, 4, 1], // 101 (CODE_A)
  [4, 1, 1, 1, 3, 1], // 102 (FNC1)
  [2, 1, 1, 4, 1, 2], // 103 (START_A)
  [2, 1, 1, 2, 1, 4], // 104 (START_B)
  [2, 1, 1, 2, 3, 2], // 105 (START_C)
];

const STOP_PATTERN = [2, 3, 3, 1, 1, 1, 2];

export interface CodablockFResult {
  matrix: boolean[][];
  rows: number;
  cols: number;
}

/** Count consecutive digit characters from a given position */
function countDigitsFrom(text: string, pos: number): number {
  let count = 0;
  while (pos + count < text.length) {
    const c = text.charCodeAt(pos + count);
    if (c < 48 || c > 57) break;
    count++;
  }
  return count;
}

/**
 * Determine the optimal Code 128 charset for a character.
 * Returns "A" for control chars (0-31), "B" for printable ASCII (32-126), or null if unsupported.
 */
function charsetFor(charCode: number): "A" | "B" | null {
  if (charCode >= 0 && charCode < 32) return "A";
  if (charCode >= 32 && charCode <= 126) return "B";
  return null;
}

/**
 * Encode text into Code 128 codeword values with automatic charset switching.
 * Supports Code A (control chars), Code B (printable ASCII), and Code C (digit pairs).
 */
function encodeValues(text: string): number[] {
  const values: number[] = [];
  let pos = 0;

  // Determine initial charset
  const initialDigits = countDigitsFrom(text, 0);
  let currentCharset: "A" | "B" | "C";
  if (initialDigits >= 4 || (initialDigits >= 2 && initialDigits === text.length)) {
    currentCharset = "C";
  } else if (text.length > 0 && text.charCodeAt(0) < 32) {
    currentCharset = "A";
  } else {
    currentCharset = "B";
  }

  while (pos < text.length) {
    if (currentCharset === "C") {
      const digits = countDigitsFrom(text, pos);
      if (digits >= 2) {
        // Encode digit pairs
        const pairCount = Math.floor(digits / 2);
        for (let i = 0; i < pairCount; i++) {
          const d1 = text.charCodeAt(pos) - 48;
          const d2 = text.charCodeAt(pos + 1) - 48;
          values.push(d1 * 10 + d2);
          pos += 2;
        }
      } else {
        // Switch out of Code C
        const charCode = pos < text.length ? text.charCodeAt(pos) : -1;
        const cs = charCode >= 0 ? charsetFor(charCode) : "B";
        if (cs === "A") {
          values.push(CODE_A);
          currentCharset = "A";
        } else {
          values.push(CODE_B);
          currentCharset = "B";
        }
      }
    } else {
      // Code A or Code B
      const numRun = countDigitsFrom(text, pos);
      if (numRun >= 4 || (numRun >= 2 && pos + numRun >= text.length)) {
        values.push(CODE_C);
        currentCharset = "C";
        continue;
      }

      const charCode = text.charCodeAt(pos);
      const needed = charsetFor(charCode);
      if (needed === null) {
        throw new InvalidInputError(
          `Codablock F: unsupported character "${text[pos]}" (code ${charCode})`,
        );
      }

      if (needed !== currentCharset) {
        if (needed === "A") {
          values.push(CODE_A);
          currentCharset = "A";
        } else {
          values.push(CODE_B);
          currentCharset = "B";
        }
      }

      if (currentCharset === "A") {
        // Code A: control chars 0-31 → values 64-95, printable 32-95 → values 0-63
        if (charCode < 32) {
          values.push(charCode + 64);
        } else {
          values.push(charCode - 32);
        }
      } else {
        // Code B: printable 32-126 → values 0-94
        values.push(charCode - 32);
      }
      pos++;
    }
  }

  return values;
}

/**
 * Encode text as Codablock F (stacked Code 128)
 *
 * @param text - Text to encode
 * @param options - columns: data columns per row (default 4-10 auto)
 */
export function encodeCodablockF(text: string, options?: { columns?: number }): CodablockFResult {
  if (text.length === 0) {
    throw new InvalidInputError("Codablock F input must not be empty");
  }

  // Encode text into Code 128 codeword values
  const values = encodeValues(text);

  // Determine columns per row
  const cols = options?.columns ?? Math.min(10, Math.max(4, Math.ceil(values.length / 5)));
  const maxDataPerRow = cols;

  // Split into rows
  const rowData: number[][] = [];
  for (let i = 0; i < values.length; i += maxDataPerRow) {
    rowData.push(values.slice(i, i + maxDataPerRow));
  }

  if (rowData.length > 44) {
    throw new CapacityError("Codablock F: data exceeds maximum 44 rows");
  }

  // Build each row as bar pattern
  const matrix: boolean[][] = [];

  for (let r = 0; r < rowData.length; r++) {
    const row = rowData[r]!;
    const codes: number[] = [START_C]; // Start Code C

    // Row indicator: row number encoded as Code C value
    codes.push(r);

    // Switch to Code B for data
    codes.push(CODE_B);

    // Data codewords
    for (const v of row) {
      codes.push(v);
    }

    // Pad remaining columns
    while (codes.length - 3 < maxDataPerRow) {
      codes.push(0); // space padding
    }

    // Checksum
    let checksum = codes[0]!;
    for (let i = 1; i < codes.length; i++) {
      checksum += codes[i]! * i;
    }
    codes.push(checksum % 103);

    // Convert to bar pattern
    const modules: boolean[] = [];

    for (const code of codes) {
      const pattern = PATTERNS[code]!;
      let isBar = true;
      for (const w of pattern) {
        for (let i = 0; i < w; i++) {
          modules.push(isBar);
        }
        isBar = !isBar;
      }
    }

    // Stop pattern
    let isBar = true;
    for (const w of STOP_PATTERN) {
      for (let i = 0; i < w; i++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }

    matrix.push(modules);
  }

  return {
    matrix,
    rows: matrix.length,
    cols: matrix[0]?.length ?? 0,
  };
}
