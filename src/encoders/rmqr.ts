/**
 * rMQR (Rectangular Micro QR Code) encoder — ISO/IEC 23941
 * Rectangular QR code for constrained spaces (medical tubes, PCB, tickets)
 *
 * Features:
 * - 32 symbol sizes from R7x43 to R17x139
 * - Single finder pattern (top-left) + alignment patterns
 * - EC levels M and H only
 * - Numeric, alphanumeric, byte, kanji modes
 */

import { InvalidInputError, CapacityError } from "../errors"
import { encodeNumericData, encodeAlphanumericData, encodeByteData, pushBits } from "./qr/mode"
import { generateECCodewords } from "./qr/reed-solomon"

// rMQR symbol sizes from Zint/ISO 23941: [rows, cols, dataCW_M, dataCW_H, ecCW_M, ecCW_H]
// prettier-ignore
const RMQR_SIZES: [number, number, number, number, number, number][] = [
  [7,43,6,3,7,10],[7,59,12,7,9,14],[7,77,20,10,12,22],[7,99,28,14,16,30],[7,139,44,24,24,44],
  [9,43,12,7,9,14],[9,59,21,11,12,22],[9,77,31,17,18,32],[9,99,42,22,24,44],[9,139,63,33,36,66],
  [11,27,7,5,8,10],[11,43,19,11,12,20],[11,59,31,15,16,32],[11,77,43,23,24,44],[11,99,57,29,32,60],[11,139,84,42,48,90],
  [13,27,12,7,9,14],[13,43,27,13,14,28],[13,59,38,20,22,40],[13,77,53,29,32,56],[13,99,73,35,40,78],[13,139,106,54,60,112],
  [15,43,33,15,18,36],[15,59,48,26,26,48],[15,77,67,31,36,72],[15,99,88,48,48,88],[15,139,127,69,72,130],
  [17,43,39,21,22,40],[17,59,56,28,32,60],[17,77,78,38,44,84],[17,99,100,56,60,104],[17,139,152,76,80,156],
];

// rMQR mode indicators (3 bits each, per ISO/IEC 23941)
const RMQR_MODE_NUMERIC = 0b001
const RMQR_MODE_ALPHANUMERIC = 0b010
const RMQR_MODE_BYTE = 0b011
// const RMQR_MODE_KANJI = 0b100;

/**
 * Character count indicator bit lengths per version index (ISO/IEC 23941 Table 3)
 * Each entry: [numeric, alphanumeric, byte, kanji]
 */
const RMQR_CCI_LENGTHS: [number, number, number, number][] = [
  [4, 3, 3, 2], // 0: R7x43
  [5, 5, 4, 3], // 1: R7x59
  [6, 5, 5, 4], // 2: R7x77
  [7, 6, 5, 5], // 3: R7x99
  [7, 6, 6, 5], // 4: R7x139
  [5, 5, 4, 3], // 5: R9x43
  [6, 5, 5, 4], // 6: R9x59
  [7, 6, 5, 5], // 7: R9x77
  [7, 6, 6, 5], // 8: R9x99
  [8, 7, 6, 6], // 9: R9x139
  [4, 4, 3, 2], // 10: R11x27
  [6, 5, 5, 4], // 11: R11x43
  [7, 6, 5, 5], // 12: R11x59
  [7, 6, 6, 5], // 13: R11x77
  [8, 7, 6, 6], // 14: R11x99
  [8, 7, 7, 6], // 15: R11x139
  [5, 5, 4, 3], // 16: R13x27
  [6, 6, 5, 5], // 17: R13x43
  [7, 6, 6, 5], // 18: R13x59
  [7, 7, 6, 6], // 19: R13x77
  [8, 7, 7, 6], // 20: R13x99
  [8, 8, 7, 7], // 21: R13x139
  [7, 6, 6, 5], // 22: R15x43
  [7, 7, 6, 5], // 23: R15x59
  [8, 7, 7, 6], // 24: R15x77
  [8, 7, 7, 6], // 25: R15x99
  [9, 8, 7, 7], // 26: R15x139
  [7, 6, 6, 5], // 27: R17x43
  [8, 7, 6, 6], // 28: R17x59
  [8, 7, 7, 6], // 29: R17x77
  [8, 8, 7, 6], // 30: R17x99
  [9, 8, 8, 7], // 31: R17x139
]

// Pre-computed rMQR format info tables from Zint (ISO/IEC 23941)
// Index = version_index + (ecLevel == "H" ? 32 : 0)
// prettier-ignore
const RMQR_FORMAT_LEFT: number[] = [
  0x1fab2,0x1e597,0x1dbdd,0x1c4f8,0x1b86c,0x1a749,0x19903,0x18626,
  0x17f0e,0x1602b,0x15e61,0x14144,0x13dd0,0x122f5,0x11cbf,0x1039a,
  0x0f1ca,0x0eeef,0x0d0a5,0x0cf80,0x0b314,0x0ac31,0x0927b,0x08d5e,
  0x07476,0x06b53,0x05519,0x04a3c,0x036a8,0x0298d,0x017c7,0x008e2,
  0x3f367,0x3ec42,0x3d208,0x3cd2d,0x3b1b9,0x3ae9c,0x390d6,0x38ff3,
  0x376db,0x369fe,0x357b4,0x34891,0x33405,0x32b20,0x3156a,0x30a4f,
  0x2f81f,0x2e73a,0x2d970,0x2c655,0x2bac1,0x2a5e4,0x29bae,0x2848b,
  0x27da3,0x26286,0x25ccc,0x243e9,0x23f7d,0x22058,0x21e12,0x20137,
];
// prettier-ignore
const RMQR_FORMAT_RIGHT: number[] = [
  0x20a7b,0x2155e,0x22b14,0x23431,0x248a5,0x25780,0x269ca,0x276ef,
  0x28fc7,0x290e2,0x2aea8,0x2b18d,0x2cd19,0x2d23c,0x2ec76,0x2f353,
  0x30103,0x31e26,0x3206c,0x33f49,0x343dd,0x35cf8,0x362b2,0x37d97,
  0x384bf,0x39b9a,0x3a5d0,0x3baf5,0x3c661,0x3d944,0x3e70e,0x3f82b,
  0x003ae,0x01c8b,0x022c1,0x03de4,0x04170,0x05e55,0x0601f,0x07f3a,
  0x08612,0x09937,0x0a77d,0x0b858,0x0c4cc,0x0dbe9,0x0e5a3,0x0fa86,
  0x108d6,0x117f3,0x129b9,0x1369c,0x14a08,0x1552d,0x16b67,0x17442,
  0x18d6a,0x1924f,0x1ac05,0x1b320,0x1cfb4,0x1d091,0x1eedb,0x1f1fe,
];

export interface RMQROptions {
  ecLevel?: "M" | "H"
  version?: number // index into RMQR_SIZES (0-31)
}

/**
 * Encode data bits for a given version index using correct CCI lengths.
 * rMQR mode indicators are 3 bits (ISO/IEC 23941):
 *   Numeric=001, Alphanumeric=010, Byte=011, Kanji=100
 */
function encodeRMQRData(
  text: string,
  versionIdx: number,
  mode: "numeric" | "alphanumeric" | "byte",
): number[] {
  const cci = RMQR_CCI_LENGTHS[versionIdx]!
  const bits: number[] = []
  const data = new TextEncoder().encode(text)

  if (mode === "numeric") {
    pushBits(bits, RMQR_MODE_NUMERIC, 3)
    pushBits(bits, text.length, cci[0])
    bits.push(...encodeNumericData(text))
  } else if (mode === "alphanumeric") {
    pushBits(bits, RMQR_MODE_ALPHANUMERIC, 3)
    pushBits(bits, text.length, cci[1])
    bits.push(...encodeAlphanumericData(text))
  } else {
    pushBits(bits, RMQR_MODE_BYTE, 3)
    pushBits(bits, data.length, cci[2])
    bits.push(...encodeByteData(data))
  }

  return bits
}

/**
 * Encode text as rMQR (Rectangular Micro QR Code)
 * Returns a rectangular boolean matrix
 */
export function encodeRMQR(text: string, options: RMQROptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("rMQR input must not be empty")
  }

  const ecLevel = options.ecLevel ?? "M"
  const isNum = /^\d+$/.test(text)
  const isAlpha = !isNum && /^[0-9A-Z $%*+\-./:]+$/.test(text)
  const mode: "numeric" | "alphanumeric" | "byte" = isNum
    ? "numeric"
    : isAlpha
      ? "alphanumeric"
      : "byte"

  // Select symbol size — CCI length depends on version, so iterate to find the
  // smallest version whose data capacity fits the encoded bit stream.
  let sizeIdx = -1
  let bits: number[] = []

  if (options.version !== undefined) {
    // User requested a specific version
    sizeIdx = options.version
    bits = encodeRMQRData(text, sizeIdx, mode)
    const size = RMQR_SIZES[sizeIdx]
    if (!size) {
      throw new CapacityError("Invalid rMQR version index")
    }
    const dataCW = ecLevel === "M" ? size[2] : size[3]
    if (bits.length > dataCW * 8) {
      throw new CapacityError("Data too long for requested rMQR symbol size")
    }
  } else {
    for (let i = 0; i < RMQR_SIZES.length; i++) {
      const size = RMQR_SIZES[i]!
      const dataCW = ecLevel === "M" ? size[2] : size[3]
      const candidateBits = encodeRMQRData(text, i, mode)
      if (candidateBits.length <= dataCW * 8) {
        sizeIdx = i
        bits = candidateBits
        break
      }
    }
    if (sizeIdx === -1) {
      throw new CapacityError("Data too long for any rMQR symbol size")
    }
  }

  const size = RMQR_SIZES[sizeIdx]!
  const [rows, cols, dataCW_M, dataCW_H, ecCW_M, ecCW_H] = size
  const dataCW = ecLevel === "M" ? dataCW_M : dataCW_H
  const ecCW = ecLevel === "M" ? ecCW_M : ecCW_H

  // Pad bits to data capacity
  const totalDataBits = dataCW * 8
  const termLen = Math.min(3, totalDataBits - bits.length)
  pushBits(bits, 0, termLen)
  while (bits.length % 8 !== 0) bits.push(0)
  let toggle = true
  while (bits.length < totalDataBits) {
    pushBits(bits, toggle ? 236 : 17, 8)
    toggle = !toggle
  }

  // Convert to bytes
  const dataBytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]!
    }
    dataBytes.push(byte)
  }

  // EC
  const ecBytes = generateECCodewords(dataBytes, ecCW)
  const allBytes = [...dataBytes, ...ecBytes]

  // Build matrix (null = data area, boolean = function pattern)
  const matrix: (boolean | null)[][] = Array.from({ length: rows }, () =>
    Array.from<boolean | null>({ length: cols }).fill(null),
  )

  // Follow EXACT Zint rmqr_setup_grid order:
  // 1. Timing patterns FIRST (all 4 edges)
  for (let c = 0; c < cols; c++) {
    matrix[0]![c] = !(c & 1)
    matrix[rows - 1]![c] = !(c & 1)
  }
  for (let r = 0; r < rows; r++) {
    matrix[r]![0] = !(r & 1)
    matrix[r]![cols - 1] = !(r & 1)
  }

  // 2. Finder pattern (7×7 at top-left) - OVERRIDES timing
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
      matrix[r]![c] = isOuter || isInner
    }
  }

  // 3. Bottom-right alignment (5×5) - OVERRIDES timing
  const arx = cols - 5
  const ary = rows - 5
  const AP = [0x1f, 0x11, 0x15, 0x11, 0x1f]
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      matrix[ary + r]![arx + c] = ((AP[r]! >> (4 - c)) & 1) === 1
    }
  }

  // 4. Corner finder patterns
  matrix[rows - 2]![0] = true
  matrix[rows - 2]![1] = false
  matrix[rows - 1]![1] = true
  matrix[0]![cols - 2] = true
  matrix[1]![cols - 2] = false
  matrix[1]![cols - 1] = true

  // 5. Separator
  for (let r = 0; r < 7; r++) matrix[r]![7] = false
  if (rows > 7) for (let c = 0; c < 8; c++) matrix[7]![c] = false

  // 4b. Sub-alignment vertical timing columns (rMQR-specific)
  // Column positions from rmqr_table_d1, indexed by width group
  // These must be placed BEFORE data, as they are function patterns
  const widthGroupIdx = [43, 59, 77, 99, 139].indexOf(cols)
  // prettier-ignore
  const SUB_ALIGN: number[][] = [
    [21], [19,39], [25,51], [23,49,75], [27,55,83,111],
  ];
  if (widthGroupIdx >= 0) {
    for (const ac of SUB_ALIGN[widthGroupIdx]!) {
      // Vertical timing column
      for (let r = 0; r < rows; r++) {
        matrix[r]![ac] = r % 2 === 0
      }
      // Top square (2x2 dark at rows 1-2, cols ac±1)
      if (ac - 1 >= 0) {
        matrix[1]![ac - 1] = true
        matrix[2]![ac - 1] = true
      }
      if (ac + 1 < cols) {
        matrix[1]![ac + 1] = true
        matrix[2]![ac + 1] = true
      }
      // Bottom square (2x2 dark at rows v_size-3/-2, cols ac±1)
      if (ac - 1 >= 0) {
        matrix[rows - 3]![ac - 1] = true
        matrix[rows - 2]![ac - 1] = true
      }
      if (ac + 1 < cols) {
        matrix[rows - 3]![ac + 1] = true
        matrix[rows - 2]![ac + 1] = true
      }
    }
  }

  // 5. Format info from pre-computed Zint tables (18 bits each side)
  const fmtIdx = sizeIdx + (ecLevel === "H" ? 32 : 0)
  const leftFmt = RMQR_FORMAT_LEFT[fmtIdx]!
  const rightFmt = RMQR_FORMAT_RIGHT[fmtIdx]!

  // Left format info: rows 1-5, cols 8-10 (bit = j*5+i), rows 1-3 col 11 (bits 15-17)
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      matrix[i + 1]![j + 8] = ((leftFmt >> (j * 5 + i)) & 1) === 1
    }
  }
  matrix[1]![11] = ((leftFmt >> 15) & 1) === 1
  matrix[2]![11] = ((leftFmt >> 16) & 1) === 1
  matrix[3]![11] = ((leftFmt >> 17) & 1) === 1

  // Right format info: rows (rows-6)-(rows-2), cols (cols-8)-(cols-6), + 3 extra
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      matrix[i + rows - 6]![j + cols - 8] = ((rightFmt >> (j * 5 + i)) & 1) === 1
    }
  }
  matrix[rows - 6]![cols - 5] = ((rightFmt >> 15) & 1) === 1
  matrix[rows - 6]![cols - 4] = ((rightFmt >> 16) & 1) === 1
  matrix[rows - 6]![cols - 3] = ((rightFmt >> 17) & 1) === 1

  // 6. Place data bits (column-pair zigzag, skip timing columns)
  const allBits: number[] = []
  for (const byte of allBytes) {
    pushBits(allBits, byte, 8)
  }

  // Record which cells are data (null) before placement
  const isData: boolean[][] = matrix.map((row) => row.map((cell) => cell === null))

  // 6b. Data placement: exact Zint qr_populate_grid algorithm for rMQR
  // x_start = cols - 3 (righthand timing pattern)
  // Start from bottom (y = rows-1), going up, right col first then left
  let i = 0
  const n = allBits.length
  let y = rows - 1
  let direction = 1 // 1 = up, 0 = down
  let row = 0
  const xStart = cols - 3

  while (i < n) {
    const x = xStart - row * 2
    if (x < 0) break

    // Right column of pair (x + 1)
    if (x + 1 < cols && matrix[y]![x + 1] === null) {
      matrix[y]![x + 1] = allBits[i]! === 1
      i++
    }

    // Left column of pair (x)
    if (i < n && x >= 0 && matrix[y]![x] === null) {
      matrix[y]![x] = allBits[i]! === 1
      i++
    }

    if (direction === 1) {
      y--
      if (y === -1) {
        row++
        y = 0
        direction = 0
      }
    } else {
      y++
      if (y === rows) {
        row++
        y = rows - 1
        direction = 1
      }
    }
  }

  // Fill remaining data cells with 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r]![c] === null) matrix[r]![c] = false
    }
  }

  // 7. Apply mask: (row/2 + col/3) % 2 == 0 (fixed mask per ISO/IEC 23941)
  const result = matrix.map((row) => row.map((cell) => cell === true))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Only mask data modules (recorded before data placement)
      if (isData[r]![c]) {
        if ((Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0) {
          result[r]![c] = !result[r]![c]
        }
      }
    }
  }

  return result
}
