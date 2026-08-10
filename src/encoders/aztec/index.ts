/**
 * Aztec Code encoder
 *
 * Produces a 2D boolean matrix for compact (1-4 layers) and
 * full-range (1-32 layers) Aztec Code symbols per ISO/IEC 24778.
 *
 * Features:
 * - 5 text encoding modes (Upper, Lower, Mixed, Punctuation, Digit) + Binary Shift
 * - Reed-Solomon error correction with variable GF sizes
 * - Bullseye finder pattern at center (no quiet zone required)
 * - Compact mode (15x15 to 27x27) and full-range mode (19x19 to 151x151)
 *
 * Implementation follows the ZXing reference encoder for correctness.
 */

import { CapacityError, InvalidInputError } from "../../errors"
import { getWordSize, getModuleCount, getTotalBitCapacity, getBaseMatrixSize } from "./tables"
import { encodeHighLevel, stuffBits } from "./encoder"
import {
  generateCheckWords,
  encodeCompactModeMessage,
  encodeFullModeMessage,
  rsEncode,
} from "./reed-solomon"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AztecOptions {
  /** Error correction percentage (default 23, meaning 23%) */
  ecPercent?: number
  /** Force a specific number of layers (1-4 compact, 1-32 full) */
  layers?: number
  /** Force compact mode (true) or full-range mode (false) */
  compact?: boolean
  /**
   * ECI assignment number to declare via FLG(n) (0-999999).
   *
   * Omit it and the encoder stays byte-transparent for ISO-8859-1 input,
   * declaring ECI 000026 (UTF-8) automatically only when the text needs it.
   */
  eci?: number
}

/**
 * Encode text as an Aztec Code matrix.
 *
 * Text outside ISO-8859-1 is encoded as UTF-8 bytes under an automatic
 * ECI 000026 declaration; `options.eci` declares a character set explicitly.
 *
 * @param text - The text to encode
 * @param options - Encoding options
 * @returns 2D boolean array where `true` = dark module
 */
/**
 * 32 layers of full-range Aztec hold 3832 numeric characters. This is not that
 * limit but a bound on the work: past it there is nothing to search.
 */
const MAX_AZTEC_CHARACTERS = 4200

export function encodeAztec(text: string, options: AztecOptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("Aztec Code: input text must not be empty")
  }
  if (text.length > MAX_AZTEC_CHARACTERS) {
    throw new CapacityError(`Aztec Code: ${text.length} characters is past what any symbol holds`)
  }

  const ecPercent = options.ecPercent ?? 23

  // Step 1: Encode text into a bit stream
  const dataBits = encodeHighLevel(text, options.eci)

  // Step 2: Compute minimum EC bits
  const eccBits = Math.floor((dataBits.length * ecPercent) / 100) + 11
  const totalSizeBits = dataBits.length + eccBits

  // Step 3: Select symbol size
  const { layers, compact, wordSize, totalBitsInLayer, stuffedBits } = selectSize(
    dataBits,
    totalSizeBits,
    eccBits,
    options,
  )

  // Step 4: Generate check words (data + EC as a single bit stream)
  const messageBits = generateCheckWords(stuffedBits, totalBitsInLayer, wordSize)

  // Step 5: Compute messageSizeInWords for the mode message
  const messageSizeInWords = Math.floor(stuffedBits.length / wordSize)

  // Step 6: Build the mode message
  const modeMessage = compact
    ? encodeCompactModeMessage(layers, messageSizeInWords)
    : encodeFullModeMessage(layers, messageSizeInWords)

  // Step 7: Build the alignment map and matrix
  const baseMatrixSize = getBaseMatrixSize(layers, compact)
  const matrixSize = getModuleCount(layers, compact)

  const alignmentMap = buildAlignmentMap(baseMatrixSize, matrixSize, compact)

  // Step 8: Create the matrix and place data
  const matrix = createBoolMatrix(matrixSize)

  // Place data layers (done first; function patterns are drawn on top)
  placeDataLayers(matrix, messageBits, layers, compact, baseMatrixSize, alignmentMap)

  // Draw mode message around the core
  drawModeMessage(matrix, modeMessage, compact, matrixSize)

  // Draw bullseye and orientation marks (drawn last, on top of everything)
  drawBullsEye(matrix, Math.floor(matrixSize / 2), compact ? 5 : 7)

  // Draw reference grid for full-range symbols
  if (!compact) {
    drawReferenceGrid(matrix, baseMatrixSize, matrixSize)
  }

  return matrix
}

/**
 * Encode an Aztec Rune: a value of 0 to 255 in an 11x11 symbol.
 *
 * A rune is a compact Aztec with no data layers at all. The byte goes in the
 * mode message, as two 4-bit words with five Reed-Solomon check words after
 * them, and every word is then inverted against 1010 — which is what stops a
 * reader mistaking a rune for the compact symbol it otherwise looks exactly
 * like.
 *
 * @param value - 0 to 255
 * @returns 2D boolean array where `true` = dark module
 *
 * @example
 * ```ts
 * encodeAztecRune(42)
 * ```
 */
export function encodeAztecRune(value: number): boolean[][] {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new InvalidInputError(`Aztec Rune value must be an integer 0-255 (got ${String(value)})`)
  }

  const words = [(value >> 4) & 0x0f, value & 0x0f]
  const modeMessage: number[] = []
  for (const word of [...words, ...rsEncode(words, 5, 4)]) {
    const inverted = word ^ 0b1010
    for (let bit = 3; bit >= 0; bit--) modeMessage.push((inverted >> bit) & 1)
  }

  const matrix = createBoolMatrix(RUNE_SIZE)
  drawModeMessage(matrix, modeMessage, true, RUNE_SIZE)
  drawBullsEye(matrix, Math.floor(RUNE_SIZE / 2), 5)
  return matrix
}

/** A rune is a compact symbol with no layers: 4 * 0 + 11 modules across. */
const RUNE_SIZE = 11

// ---------------------------------------------------------------------------
// Size selection — matches ZXing's approach
// ---------------------------------------------------------------------------

interface SizeResult {
  layers: number
  compact: boolean
  wordSize: number
  totalBitsInLayer: number
  stuffedBits: number[]
}

/**
 * Select the smallest symbol that fits the data with the requested EC level.
 * Matches the ZXing encoder's size selection algorithm.
 */
function selectSize(
  dataBits: number[],
  totalSizeBits: number,
  eccBits: number,
  options: AztecOptions,
): SizeResult {
  const MAX_NB_BITS = 32

  if (options.layers !== undefined) {
    const compact = options.compact ?? options.layers <= 4
    const layers = options.layers
    const totalBitsInLayer = getTotalBitCapacity(layers, compact)
    const wordSize = getWordSize(layers)
    const usableBitsInLayers = totalBitsInLayer - (totalBitsInLayer % wordSize)
    const stuffedBits = stuffBits(dataBits, wordSize)
    if (stuffedBits.length + eccBits > usableBitsInLayers) {
      throw new CapacityError(
        `Aztec Code: data exceeds capacity of ${compact ? "compact" : "full"} ${layers}-layer symbol`,
      )
    }
    if (compact && stuffedBits.length > wordSize * 64) {
      throw new CapacityError(`Aztec Code: data exceeds capacity of compact ${layers}-layer symbol`)
    }
    return { layers, compact, wordSize, totalBitsInLayer, stuffedBits }
  }

  let wordSize = 0
  let stuffedBits: number[] | null = null

  for (let i = 0; ; i++) {
    if (i > MAX_NB_BITS) {
      throw new CapacityError(`Aztec Code: data (${dataBits.length} bits) exceeds maximum capacity`)
    }

    const compact = i <= 3
    const layers = compact ? i + 1 : i
    const totalBitsInLayer = getTotalBitCapacity(layers, compact)

    if (totalSizeBits > totalBitsInLayer) {
      continue
    }

    const newWordSize = getWordSize(layers)
    if (stuffedBits === null || wordSize !== newWordSize) {
      wordSize = newWordSize
      stuffedBits = stuffBits(dataBits, wordSize)
    }

    const usableBitsInLayers = totalBitsInLayer - (totalBitsInLayer % wordSize)

    if (compact && stuffedBits.length > wordSize * 64) {
      continue
    }

    if (stuffedBits.length + eccBits <= usableBitsInLayers) {
      // Check if compact is explicitly excluded
      if (compact && options.compact === false) continue
      if (!compact && options.compact === true) continue

      return {
        layers,
        compact,
        wordSize,
        totalBitsInLayer,
        stuffedBits,
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Matrix construction
// ---------------------------------------------------------------------------

/** Create a boolean matrix initialized to all false */
function createBoolMatrix(size: number): boolean[][] {
  return Array.from({ length: size }, () => Array.from<boolean>({ length: size }).fill(false))
}

// ---------------------------------------------------------------------------
// Alignment map — maps base coordinates to final matrix coordinates
// ---------------------------------------------------------------------------

/**
 * Build the alignment map that translates logical (base matrix) coordinates
 * to physical (final matrix) coordinates.
 *
 * For compact mode, this is an identity mapping.
 * For full-range mode, reference grid lines are inserted every 15 rows/cols
 * from the center, which shifts coordinate positions.
 */
function buildAlignmentMap(baseMatrixSize: number, matrixSize: number, compact: boolean): number[] {
  const alignmentMap = Array.from<number>({ length: baseMatrixSize })

  if (compact) {
    for (let i = 0; i < baseMatrixSize; i++) {
      alignmentMap[i] = i
    }
  } else {
    const origCenter = Math.floor(baseMatrixSize / 2)
    const center = Math.floor(matrixSize / 2)

    for (let i = 0; i < origCenter; i++) {
      const newOffset = i + Math.floor(i / 15)
      alignmentMap[origCenter - i - 1] = center - newOffset - 1
      alignmentMap[origCenter + i] = center + newOffset + 1
    }
  }

  return alignmentMap
}

// ---------------------------------------------------------------------------
// Data layer placement — ZXing's 4-quadrant algorithm
// ---------------------------------------------------------------------------

/**
 * Place data bits into layers using the ZXing 4-quadrant algorithm.
 *
 * For each layer i (0-indexed, starting from outermost):
 *   rowSize = (layers - i) * 4 + (compact ? 9 : 12)
 *
 * Each layer is split into 4 sides (quadrants), each using rowSize * 2 bits.
 * The 4 quadrants are: top, right, bottom, left.
 * Within each quadrant, bits are placed in pairs (outer module, inner module)
 * for each position along the side.
 */
function placeDataLayers(
  matrix: boolean[][],
  messageBits: number[],
  layers: number,
  compact: boolean,
  baseMatrixSize: number,
  alignmentMap: number[],
): void {
  let rowOffset = 0

  for (let i = 0; i < layers; i++) {
    const rowSize = (layers - i) * 4 + (compact ? 9 : 12)

    for (let j = 0; j < rowSize; j++) {
      const columnOffset = j * 2

      for (let k = 0; k < 2; k++) {
        // ZXing: set(x, y) where x=col, y=row -> matrix[y][x] = matrix[row][col]
        // Top side: set(alignmentMap[i*2+k], alignmentMap[i*2+j])
        if (messageBits[rowOffset + columnOffset + k]) {
          matrix[alignmentMap[i * 2 + j]!]![alignmentMap[i * 2 + k]!] = true
        }

        // Right side: set(alignmentMap[i*2+j], alignmentMap[base-1-i*2-k])
        if (messageBits[rowOffset + rowSize * 2 + columnOffset + k]) {
          matrix[alignmentMap[baseMatrixSize - 1 - i * 2 - k]!]![alignmentMap[i * 2 + j]!] = true
        }

        // Bottom side: set(alignmentMap[base-1-i*2-k], alignmentMap[base-1-i*2-j])
        if (messageBits[rowOffset + rowSize * 4 + columnOffset + k]) {
          matrix[alignmentMap[baseMatrixSize - 1 - i * 2 - j]!]![
            alignmentMap[baseMatrixSize - 1 - i * 2 - k]!
          ] = true
        }

        // Left side: set(alignmentMap[base-1-i*2-j], alignmentMap[i*2+k])
        if (messageBits[rowOffset + rowSize * 6 + columnOffset + k]) {
          matrix[alignmentMap[i * 2 + k]!]![alignmentMap[baseMatrixSize - 1 - i * 2 - j]!] = true
        }
      }
    }

    rowOffset += rowSize * 8
  }
}

// ---------------------------------------------------------------------------
// Mode message placement
// ---------------------------------------------------------------------------

/**
 * Draw the mode message around the core.
 *
 * For compact (28 bits): 7 bits per side, positioned at center +/- 3 to center +/- 3
 * on the ring at distance 5 from center.
 *
 * For full-range (40 bits): 10 bits per side, positioned at center +/- 5 to center +/- 5
 * on the ring at distance 7 from center, with a gap for the center reference grid line.
 *
 * Matches ZXing's drawModeMessage exactly.
 */
function drawModeMessage(
  matrix: boolean[][],
  modeMessage: number[],
  compact: boolean,
  matrixSize: number,
): void {
  const center = Math.floor(matrixSize / 2)

  // ZXing: set(x, y) -> matrix[y][x] (row=y, col=x)
  if (compact) {
    for (let i = 0; i < 7; i++) {
      const offset = center - 3 + i
      // set(offset, center-5) -> matrix[center-5][offset]
      if (modeMessage[i]) {
        matrix[center - 5]![offset] = true
      }
      // set(center+5, offset) -> matrix[offset][center+5]
      if (modeMessage[i + 7]) {
        matrix[offset]![center + 5] = true
      }
      // set(offset, center+5) -> matrix[center+5][offset]
      if (modeMessage[20 - i]) {
        matrix[center + 5]![offset] = true
      }
      // set(center-5, offset) -> matrix[offset][center-5]
      if (modeMessage[27 - i]) {
        matrix[offset]![center - 5] = true
      }
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const offset = center - 5 + i + Math.floor(i / 5)
      // set(offset, center-7) -> matrix[center-7][offset]
      if (modeMessage[i]) {
        matrix[center - 7]![offset] = true
      }
      // set(center+7, offset) -> matrix[offset][center+7]
      if (modeMessage[i + 10]) {
        matrix[offset]![center + 7] = true
      }
      // set(offset, center+7) -> matrix[center+7][offset]
      if (modeMessage[29 - i]) {
        matrix[center + 7]![offset] = true
      }
      // set(center-7, offset) -> matrix[offset][center-7]
      if (modeMessage[39 - i]) {
        matrix[offset]![center - 7] = true
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Bullseye finder pattern with orientation marks
// ---------------------------------------------------------------------------

/**
 * Draw the bullseye (concentric dark squares) and orientation marks.
 *
 * The bullseye consists of dark squares at even distances from center
 * (distances 0, 2, 4 for compact; 0, 2, 4, 6 for full-range).
 *
 * Orientation marks are 6 specific dark modules at the corners of the
 * outermost ring (distance = size parameter), creating an asymmetric
 * pattern for scanner orientation detection.
 *
 * This is drawn LAST so it overwrites any data/mode modules in the center area.
 *
 * Matches ZXing's drawBullsEye exactly.
 */
function drawBullsEye(matrix: boolean[][], center: number, size: number): void {
  // Draw concentric dark squares at even distances
  // ZXing: set(x, y) -> matrix[y][x] (row=y, col=x)
  for (let i = 0; i < size; i += 2) {
    for (let j = center - i; j <= center + i; j++) {
      // set(j, center-i) -> matrix[center-i][j]
      matrix[center - i]![j] = true
      // set(j, center+i) -> matrix[center+i][j]
      matrix[center + i]![j] = true
      // set(center-i, j) -> matrix[j][center-i]
      matrix[j]![center - i] = true
      // set(center+i, j) -> matrix[j][center+i]
      matrix[j]![center + i] = true
    }
  }

  // Orientation marks — 6 dark modules that create an asymmetric pattern.
  // ZXing: set(x, y) -> matrix[y][x]
  // set(center-size, center-size) -> matrix[center-size][center-size]
  matrix[center - size]![center - size] = true
  // set(center-size+1, center-size) -> matrix[center-size][center-size+1]
  matrix[center - size]![center - size + 1] = true
  // set(center-size, center-size+1) -> matrix[center-size+1][center-size]
  matrix[center - size + 1]![center - size] = true
  // set(center+size, center-size) -> matrix[center-size][center+size]
  matrix[center - size]![center + size] = true
  // set(center+size, center-size+1) -> matrix[center-size+1][center+size]
  matrix[center - size + 1]![center + size] = true
  // set(center+size, center+size-1) -> matrix[center+size-1][center+size]
  matrix[center + size - 1]![center + size] = true
}

// ---------------------------------------------------------------------------
// Reference grid (full-range only)
// ---------------------------------------------------------------------------

/**
 * Draw reference grid lines for full-range Aztec symbols.
 *
 * Reference grid lines appear every 16 columns/rows from the center.
 * On each grid line, every other module is dark (those aligned with center parity).
 * Grid lines are drawn on top of data to ensure they are visible.
 *
 * Matches ZXing's reference grid drawing:
 *   for (int i = 0, j = 0; i < baseMatrixSize/2 - 1; i += 15, j += 16)
 *     draw alternating modules on rows/cols at center +/- j
 */
function drawReferenceGrid(matrix: boolean[][], baseMatrixSize: number, matrixSize: number): void {
  const center = Math.floor(matrixSize / 2)
  const centerParity = center & 1

  for (let i = 0, j = 0; i < Math.floor(baseMatrixSize / 2) - 1; i += 15, j += 16) {
    for (let k = centerParity; k < matrixSize; k += 2) {
      // Horizontal lines at rows center-j and center+j
      matrix[center - j]![k] = true
      matrix[center + j]![k] = true
      // Vertical lines at cols center-j and center+j
      matrix[k]![center - j] = true
      matrix[k]![center + j] = true
    }
  }
}
