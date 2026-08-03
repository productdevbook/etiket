/**
 * Micro QR Code encoder (M1-M4)
 * ISO/IEC 18004 — single finder pattern, reduced quiet zone
 *
 * M1: 11x11, numeric only, error detection only
 * M2: 13x13, numeric/alphanumeric, EC L/M
 * M3: 15x15, numeric/alphanumeric/byte, EC L/M
 * M4: 17x17, numeric/alphanumeric/byte/kanji, EC L/M/Q
 */

import { CapacityError, InvalidInputError } from "../../errors"
import { pushBits, encodeNumericData, encodeAlphanumericData, encodeByteData } from "./mode"
import { generateECCodewords } from "./reed-solomon"

export interface MicroQROptions {
  version?: 1 | 2 | 3 | 4
  ecLevel?: "L" | "M" | "Q"
  mask?: 0 | 1 | 2 | 3
}

export const MICRO_QR_SIZES = [11, 13, 15, 17] as const

// Capacity table: [version][ecLevel] = { numeric, alphanumeric, byte, dataCW, ecCW }
interface MicroQRCapacity {
  numeric: number
  alphanumeric: number
  byte: number
  dataCW: number
  ecCW: number
}

const CAPACITY: Record<number, Record<string, MicroQRCapacity>> = {
  1: {
    _: { numeric: 5, alphanumeric: 0, byte: 0, dataCW: 3, ecCW: 2 },
  },
  2: {
    L: { numeric: 10, alphanumeric: 6, byte: 0, dataCW: 5, ecCW: 5 },
    M: { numeric: 8, alphanumeric: 5, byte: 0, dataCW: 4, ecCW: 6 },
  },
  3: {
    L: { numeric: 23, alphanumeric: 14, byte: 9, dataCW: 11, ecCW: 6 },
    M: { numeric: 18, alphanumeric: 11, byte: 7, dataCW: 9, ecCW: 8 },
  },
  4: {
    L: { numeric: 35, alphanumeric: 21, byte: 15, dataCW: 16, ecCW: 8 },
    M: { numeric: 30, alphanumeric: 18, byte: 13, dataCW: 14, ecCW: 10 },
    Q: { numeric: 21, alphanumeric: 12, byte: 9, dataCW: 10, ecCW: 14 },
  },
}

/**
 * Character count indicator bit lengths per version and mode
 * ISO/IEC 18004 Table 2
 */
const CC_BITS: Record<number, Record<string, number>> = {
  1: { numeric: 3 },
  2: { numeric: 4, alphanumeric: 3 },
  3: { numeric: 5, alphanumeric: 4, byte: 4 },
  4: { numeric: 6, alphanumeric: 5, byte: 5 },
}

/**
 * Symbol number mapping: version + EC level -> symbol number (0-7)
 * Used for format information encoding
 * ISO/IEC 18004 Table 10
 */
const SYMBOL_NUMBER: Record<number, Record<string, number>> = {
  1: { _: 0 },
  2: { L: 1, M: 2 },
  3: { L: 3, M: 4 },
  4: { L: 5, M: 6, Q: 7 },
}

/**
 * Micro QR format information lookup table (32 entries)
 * Index = (symbol_number << 2) | mask_pattern
 * 15-bit BCH protected values per ISO/IEC 18004 Table C.2
 */
const FORMAT_INFO_MICRO: number[] = [
  0x4445, 0x4172, 0x4e2b, 0x4b1c, 0x55ae, 0x5099, 0x5fc0, 0x5af7, 0x6793, 0x62a4, 0x6dfd, 0x68ca,
  0x7678, 0x734f, 0x7c16, 0x7921, 0x06de, 0x03e9, 0x0cb0, 0x0987, 0x1735, 0x1202, 0x1d5b, 0x186c,
  0x2508, 0x203f, 0x2f66, 0x2a51, 0x34e3, 0x31d4, 0x3e8d, 0x3bba,
]

/**
 * Micro QR mask patterns (4 masks, corresponding to standard QR masks 1, 4, 6, 7)
 * ISO/IEC 18004 Table 12
 */
const MICRO_MASK_FNS: ((r: number, c: number) => boolean)[] = [
  (r, _c) => r % 2 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
]

/**
 * Encode text as a Micro QR code
 * Returns a 2D boolean matrix (true = dark module)
 */
export function encodeMicroQR(text: string, options: MicroQROptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("Micro QR input must not be empty")
  }

  // Detect mode
  const isNum = /^\d+$/.test(text)
  const isAlpha = !isNum && /^[0-9A-Z $%*+\-./:]+$/.test(text)
  const mode: "numeric" | "alphanumeric" | "byte" = isNum
    ? "numeric"
    : isAlpha
      ? "alphanumeric"
      : "byte"

  // Select version
  const { version, cap, ecKey } = selectMicroVersion(text, mode, options)
  const size = version * 2 + 9 // M1=11, M2=13, M3=15, M4=17

  // Encode data
  const data = new TextEncoder().encode(text)
  const bits = buildMicroDataBits(text, data, mode, version, cap)

  // Convert to full 8-bit codewords (RS needs full bytes)
  const dataBytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]!
    }
    dataBytes.push(byte)
  }

  // Error correction (computed on full 8-bit codewords)
  const ecBytes = cap.ecCW > 0 ? generateECCodewords(dataBytes, cap.ecCW) : []

  // Build final bit array
  // M1 and M3 have a 4-bit final data codeword (ISO/IEC 18004 7.4.10)
  // RS is computed on full 8-bit CW, then last data CW is truncated to 4 bits
  const allBits: number[] = []
  const hasFourBitCW = version === 1 || version === 3
  if (hasFourBitCW) {
    // Full data codewords except last
    for (let i = 0; i < dataBytes.length - 1; i++) {
      pushBits(allBits, dataBytes[i]!, 8)
    }
    // Last data codeword: only top 4 bits (right-shift by 4)
    pushBits(allBits, dataBytes[dataBytes.length - 1]! >> 4, 4)
    // EC codewords (all full 8-bit)
    for (const ec of ecBytes) {
      pushBits(allBits, ec, 8)
    }
  } else {
    for (const byte of [...dataBytes, ...ecBytes]) {
      pushBits(allBits, byte, 8)
    }
  }

  // Build matrix with function patterns
  const matrix = buildFunctionPatterns(size)

  // Reserve format info area (set to 0x0 so data placement skips it)
  reserveMicroFormatInfo(matrix, size)

  // Place data using Micro QR zigzag
  placeMicroData(matrix, allBits, size, version)

  // Find and apply best mask
  const symbolNum = SYMBOL_NUMBER[version]![ecKey]!
  const bestMask = selectMicroMask(matrix, size, options.mask)

  // Apply mask to data modules only
  applyMicroMask(matrix, bestMask, size)

  // Write format information
  writeMicroFormatInfo(matrix, symbolNum, bestMask)

  // Convert to boolean (anything > 0 is dark)
  return matrix.map((row) => row.map((cell) => cell === 1))
}

function selectMicroVersion(
  text: string,
  mode: string,
  options: MicroQROptions,
): { version: number; cap: MicroQRCapacity; ecKey: string } {
  const requestedEc = options.ecLevel

  // Determine the EC key for the given version
  function getEcKey(v: number): string {
    if (v === 1) return "_"
    if (requestedEc && CAPACITY[v]![requestedEc]) return requestedEc
    return "L"
  }

  if (options.version) {
    const v = options.version
    const ecKey = getEcKey(v)
    const caps = CAPACITY[v]
    const cap = caps?.[ecKey]
    if (!cap) throw new CapacityError(`Micro QR M${v} does not support EC level ${ecKey}`)
    return { version: v, cap, ecKey }
  }

  const dataLen = mode === "byte" ? new TextEncoder().encode(text).length : text.length

  for (let v = 1; v <= 4; v++) {
    const ecKey = getEcKey(v)
    const caps = CAPACITY[v]!
    const cap = caps[ecKey]
    if (!cap) continue
    const modeKey = mode as keyof MicroQRCapacity
    if (typeof cap[modeKey] === "number" && dataLen <= (cap[modeKey] as number)) {
      return { version: v, cap, ecKey }
    }
  }

  throw new CapacityError(`Data too long for Micro QR Code with ${mode} mode`)
}

function buildMicroDataBits(
  text: string,
  data: Uint8Array,
  mode: string,
  version: number,
  cap: MicroQRCapacity,
): number[] {
  const bits: number[] = []

  // Mode indicator (variable length for Micro QR)
  // M1: no mode indicator (numeric only)
  // M2: 1 bit (0=numeric, 1=alphanumeric)
  // M3: 2 bits (00=numeric, 01=alpha, 10=byte)
  // M4: 3 bits (000=numeric, 001=alpha, 010=byte)
  if (version === 2) {
    pushBits(bits, mode === "numeric" ? 0 : 1, 1)
  } else if (version === 3) {
    pushBits(bits, mode === "numeric" ? 0 : mode === "alphanumeric" ? 1 : 2, 2)
  } else if (version === 4) {
    pushBits(bits, mode === "numeric" ? 0 : mode === "alphanumeric" ? 1 : 2, 3)
  }

  // Character count indicator (correct bit lengths per ISO spec)
  const ccBits = CC_BITS[version]![mode]!
  const count = mode === "byte" ? data.length : text.length
  pushBits(bits, count, ccBits)

  // Data encoding
  if (mode === "numeric") bits.push(...encodeNumericData(text))
  else if (mode === "alphanumeric") bits.push(...encodeAlphanumericData(text))
  else bits.push(...encodeByteData(data))

  // Terminator + padding
  const totalBits = cap.dataCW * 8
  const termLen = Math.min(
    version === 1 ? 3 : version === 2 ? 5 : version === 3 ? 7 : 9,
    totalBits - bits.length,
  )
  pushBits(bits, 0, termLen)

  // M1 and M3: zero-pad to fill remaining capacity (4-bit final CW)
  // M2 and M4: pad to byte boundary then add alternating 0xEC/0x11
  if (version === 1 || version === 3) {
    while (bits.length < totalBits) bits.push(0)
  } else {
    while (bits.length % 8 !== 0) bits.push(0)
    let toggle = true
    while (bits.length < totalBits) {
      pushBits(bits, toggle ? 236 : 17, 8)
      toggle = !toggle
    }
  }

  return bits
}

/**
 * Build matrix with function patterns (finder, separator, timing)
 * Uses numeric values: 0x2 = data region, 0x0 = function pattern (light), 0x1 = function pattern (dark)
 */
function buildFunctionPatterns(size: number): number[][] {
  // Initialize all cells as data region (0x2)
  const matrix: number[][] = Array.from({ length: size }, () =>
    Array.from<number>({ length: size }).fill(0x2),
  )

  // Place 7x7 finder pattern at (0,0) with separator
  // The finder includes a white separator row/column
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (r === 7 || c === 7) {
        // Separator (white)
        matrix[r]![c] = 0
      } else {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        matrix[r]![c] = isOuter || isInner ? 1 : 0
      }
    }
  }

  // Timing patterns along row 0 and column 0
  for (let i = 8; i < size; i++) {
    matrix[0]![i] = i % 2 === 0 ? 1 : 0
    matrix[i]![0] = i % 2 === 0 ? 1 : 0
  }

  return matrix
}

/**
 * Reserve format information area around finder pattern
 * Sets cells to 0x0 so data placement skips them
 */
function reserveMicroFormatInfo(matrix: number[][], size: number): void {
  // Format info goes along row 8 (columns 1-8) and column 8 (rows 1-8)
  for (let i = 1; i <= 8; i++) {
    if (i < size) {
      matrix[8]![i] = 0
      matrix[i]![8] = 0
    }
  }
}

/**
 * Place data bits using Micro QR zigzag pattern
 * Similar to standard QR but:
 * - No timing column 6 skip
 * - M1/M3 need direction adjustment (inc=2)
 */
function placeMicroData(matrix: number[][], bits: number[], size: number, version: number): void {
  // For M1 and M3, we need to adjust the upward/downward direction
  // This is the "inc" trick from segno: inc=2 for M1/M3, inc=0 for M2/M4
  const inc = version === 1 || version === 3 ? 2 : 0
  let bitIdx = 0

  for (let right = size - 1; right >= 1; right -= 2) {
    for (let vertical = 0; vertical < size; vertical++) {
      for (let z = 0; z < 2; z++) {
        const j = right - z
        if (j < 0) continue
        const upwards = ((right + inc) & 2) === 0
        const i = upwards ? size - 1 - vertical : vertical
        if (matrix[i]![j] === 0x2) {
          matrix[i]![j] = bitIdx < bits.length ? bits[bitIdx]! : 0
          bitIdx++
        }
      }
    }
  }
}

/**
 * Check if a module is a data module (value 0x2 in function pattern matrix)
 * For masking: we need to determine which modules are data vs function
 */
function isMicroDataModule(matrix: number[][], r: number, c: number): boolean {
  // After data placement, data modules have value 0 or 1 (from data bits)
  // Function pattern modules also have value 0 or 1 but were set before data placement
  // We need a different approach: check against the function pattern layout

  // Finder pattern + separator: rows 0-7, cols 0-7
  if (r <= 7 && c <= 7) return false

  // Timing row 0
  if (r === 0) return false
  // Timing col 0
  if (c === 0) return false

  // Format info: row 8 cols 1-8, and col 8 rows 1-8
  if (r === 8 && c >= 1 && c <= 8) return false
  if (c === 8 && r >= 1 && r <= 8) return false

  return true
}

/**
 * Micro QR mask evaluation
 * ISO/IEC 18004 7.8.3.2
 * Sum of bottom row and rightmost column (excluding timing patterns)
 * Higher score = better mask (opposite of standard QR)
 */
function evaluateMicroMask(matrix: number[][], size: number): number {
  let sum1 = 0 // rightmost column
  let sum2 = 0 // bottom row

  for (let i = 1; i < size; i++) {
    sum1 += matrix[i]![size - 1]! // rightmost column, rows 1..size-1
    sum2 += matrix[size - 1]![i]! // bottom row, cols 1..size-1
  }

  // Formula: min(sum1,sum2) * 16 + max(sum1,sum2)
  return sum1 <= sum2 ? sum1 * 16 + sum2 : sum2 * 16 + sum1
}

/**
 * Select best mask for Micro QR
 * Evaluates all 4 masks, picks the one with HIGHEST score
 */
function selectMicroMask(matrix: number[][], size: number, requestedMask?: number): number {
  if (requestedMask !== undefined && requestedMask >= 0 && requestedMask <= 3) {
    return requestedMask
  }

  let bestMask = 0
  let bestScore = -1

  for (let mask = 0; mask < 4; mask++) {
    // Make a copy
    const copy = matrix.map((row) => [...row])
    // Apply mask
    applyMicroMask(copy, mask, size)
    // Evaluate
    const score = evaluateMicroMask(copy, size)
    if (score > bestScore) {
      bestScore = score
      bestMask = mask
    }
  }

  return bestMask
}

/**
 * Apply mask pattern to data modules only
 */
function applyMicroMask(matrix: number[][], mask: number, size: number): void {
  const fn = MICRO_MASK_FNS[mask]!
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isMicroDataModule(matrix, r, c)) {
        if (fn(r, c)) {
          matrix[r]![c] = matrix[r]![c]! ^ 1 // flip bit
        }
      }
    }
  }
}

/**
 * Write 15-bit format information to Micro QR matrix
 * ISO/IEC 18004 7.9.2
 * Placed along row 8 (horizontal) and column 8 (vertical)
 */
function writeMicroFormatInfo(matrix: number[][], symbolNum: number, mask: number): void {
  const formatIdx = (symbolNum << 2) | mask
  const formatInfo = FORMAT_INFO_MICRO[formatIdx]!

  // Vertical strip: column 8, rows 1-8 (bottom to top = LSB to MSB, bits 0-7)
  for (let i = 0; i < 8; i++) {
    const bit = (formatInfo >> i) & 1
    matrix[i + 1]![8] = bit
  }

  // Horizontal strip: row 8, columns 1-8 (left to right, bits 14 down to 7)
  for (let i = 0; i < 8; i++) {
    const bit = (formatInfo >> (14 - i)) & 1
    matrix[8]![i + 1] = bit
  }
}
