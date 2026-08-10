/**
 * PDF417 barcode encoder — ISO/IEC 15438 implementation
 * Stacked 2D barcode with rows of codewords (each 17 modules wide)
 *
 * Supports text, byte, and numeric compaction modes with
 * Reed-Solomon error correction over GF(929).
 */

import type { PDF417MacroOptions } from "./macro"
import { InvalidInputError, CapacityError } from "../../errors"
import { encodeData } from "./encoder"
import { generateECCodewords, getECCount, recommendedECLevel } from "./ec"
import { buildMacroBlock, normalizeFileId, READER_INIT } from "./macro"
import { getCodewordPattern, getRowCluster, START_PATTERN, STOP_PATTERN } from "./tables"

export type { PDF417MacroOptions } from "./macro"

export interface PDF417Options {
  /** Error correction level 0-8, default auto-selected based on data size */
  ecLevel?: number
  /**
   * ECI assignment number declaring the character set of the data.
   * Left out, the encoder declares ECI 26 (UTF-8) by itself as soon as the
   * input contains something ISO-8859-15 cannot represent.
   */
  eci?: number
  /** Number of data columns (1-30), auto-calculated if omitted */
  columns?: number
  /** Compact PDF417 (omits right row indicator) */
  compact?: boolean
  /**
   * Macro PDF417 control block, marking this symbol as one segment of a larger
   * file. Prefer `encodePDF417Sequence`, which splits a message and fills this
   * in for every segment.
   */
  macro?: PDF417MacroOptions
  /**
   * Mark the symbol as a reader initialisation / programming symbol
   * (codeword 921). Such a symbol carries configuration for the scanner
   * rather than data to pass on to the host.
   */
  readerInit?: boolean
}

export interface PDF417Result {
  /** 2D boolean matrix (true = black bar, false = white space) */
  matrix: boolean[][]
  /** Number of rows in the symbol */
  rows: number
  /** Number of module columns in the symbol */
  cols: number
}

/** Maximum data codewords in a PDF417 symbol */
const MAX_DATA_CODEWORDS = 925 // 929 - 1 (length) - 3 (reserved)
/** Minimum rows */
const MIN_ROWS = 3
/** Maximum rows */
const MAX_ROWS = 90
/** Minimum data columns */
const MIN_COLS = 1
/** Maximum data columns */
const MAX_COLS = 30
/** Segments a Macro PDF417 file may hold, ISO/IEC 15438 Annex H */
const MAX_SEQUENCE_SYMBOLS = 99_999
/** Largest value a codeword can carry */
const MAX_CODEWORD_VALUE = 928
/** Pad codeword — 900 is the text compaction latch, which decodes to nothing */
const PAD_CODEWORD = 900

/**
 * 928 codewords of numeric compaction, the most any PDF417 symbol holds.
 */
const MAX_PDF417_CHARACTERS = 2900

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
    throw new InvalidInputError("PDF417 input must not be empty")
  }
  if (text.length > MAX_PDF417_CHARACTERS) {
    throw new CapacityError(
      `Data too long for PDF417: ${text.length} characters is past what any symbol holds`,
    )
  }

  const compact = options.compact ?? false

  // Step 1: Encode text into data codewords, and the macro control block that
  // has to trail them
  const bodyCodewords = buildBodyCodewords(text, options)
  const macroBlock = options.macro ? buildMacroBlock(options.macro) : []
  const dataLength = bodyCodewords.length + macroBlock.length

  if (dataLength > MAX_DATA_CODEWORDS) {
    throw new CapacityError(
      `PDF417 data too large: ${dataLength} codewords exceeds maximum of ${MAX_DATA_CODEWORDS}`,
    )
  }

  // Step 2: Determine EC level
  const ecLevel = options.ecLevel ?? recommendedECLevel(dataLength)
  if (ecLevel < 0 || ecLevel > 8) {
    throw new InvalidInputError("PDF417 EC level must be 0-8")
  }
  const ecCount = getECCount(ecLevel)

  // Step 3: Calculate symbol dimensions
  // Total codewords = 1 (length descriptor) + data + EC
  const totalDataWithLength = 1 + dataLength

  const { rows, cols } = calculateDimensions(totalDataWithLength, ecCount, options.columns)

  // Step 4: Pad data to fill the grid
  // Total data codeword slots = rows * cols - ecCount
  const dataSlots = rows * cols
  const padCount = dataSlots - ecCount - totalDataWithLength
  const paddedData: number[] = []

  if (macroBlock.length > 0) {
    // A reader takes everything after the 928 marker as part of the control
    // block, pad codewords included — so the padding goes in front of the
    // block and the symbol length descriptor has to cover it.
    const descriptor = totalDataWithLength + padCount
    if (descriptor > MAX_CODEWORD_VALUE) {
      throw new CapacityError(
        `Macro PDF417 symbol needs a length descriptor of ${descriptor}, above the ${MAX_CODEWORD_VALUE} a codeword holds`,
      )
    }
    paddedData.push(descriptor, ...bodyCodewords)
    // 900 latches text compaction; a run of them decodes to nothing
    for (let i = 0; i < padCount; i++) {
      paddedData.push(PAD_CODEWORD)
    }
    paddedData.push(...macroBlock)
  } else {
    // Symbol length descriptor: the descriptor itself, the data and the pads,
    // excluding EC (ISO/IEC 15438 5.5.1). Leaving the pads out decodes anyway,
    // because a reader tolerates a short count and the pad is a no-op latch —
    // but it puts every EC codeword out of step with the reference.
    const descriptor = totalDataWithLength + padCount
    if (descriptor > MAX_CODEWORD_VALUE) {
      throw new CapacityError(
        `PDF417 symbol needs a length descriptor of ${descriptor}, above the ${MAX_CODEWORD_VALUE} a codeword holds`,
      )
    }
    paddedData.push(descriptor, ...bodyCodewords)
    for (let i = 0; i < padCount; i++) {
      paddedData.push(PAD_CODEWORD)
    }
  }

  // Step 5: Generate EC codewords
  const ecCodewords = generateECCodewords(paddedData, ecLevel)

  // Step 6: Combine data + EC into codeword array
  const allCodewords = [...paddedData, ...ecCodewords]

  // Step 7: Build the module matrix
  const matrix = buildMatrix(allCodewords, rows, cols, ecLevel, compact)

  return {
    matrix,
    rows: matrix.length,
    cols: matrix[0]!.length,
  }
}

/** Descriptive macro fields that stay the same across every segment */
export type PDF417SharedMacroOptions = Omit<
  PDF417MacroOptions,
  "segmentIndex" | "fileId" | "segmentCount" | "lastSegment"
>

export interface PDF417SequenceOptions extends Omit<PDF417Options, "macro"> {
  /**
   * How many symbols to split the message into (1-99999).
   * Omit to use the fewest symbols that hold the data.
   */
  symbols?: number
  /**
   * Identifier shared by every symbol of the sequence, as a decimal string in
   * groups of three digits (each group 000-899). Derived from the message when
   * omitted, so the segments of one message always agree and the segments of
   * two different messages almost never do.
   */
  fileId?: string
  /** Descriptive macro fields (file name, sender, addressee, ...) for every segment */
  macro?: PDF417SharedMacroOptions
}

/**
 * Encode text as a Macro PDF417 sequence: a set of symbols, each carrying a
 * control block, that a reader reassembles into the original message.
 *
 * The segment index, the segment count and the terminator on the final symbol
 * are all worked out here — the caller supplies the message and, at most, how
 * many symbols to spread it over.
 *
 * Returns a single ordinary symbol when the data fits in one, with no macro
 * control block: a file of one segment is not worth the overhead.
 *
 * @param text - The complete message
 * @param options - Symbol count, file identity and the usual PDF417 options
 * @returns One result per symbol, in sequence order
 *
 * @example
 * ```ts
 * const symbols = encodePDF417Sequence(longText, { symbols: 3 })
 * // symbols[0], symbols[1], symbols[2] scan back as one message
 * ```
 */
export function encodePDF417Sequence(
  text: string,
  options: PDF417SequenceOptions = {},
): PDF417Result[] {
  if (text.length === 0) {
    throw new InvalidInputError("PDF417 input must not be empty")
  }

  const { symbols: requested, fileId, macro, ...pdf417Options } = options
  if (
    requested !== undefined &&
    (!Number.isInteger(requested) || requested < 1 || requested > MAX_SEQUENCE_SYMBOLS)
  ) {
    throw new InvalidInputError(
      `A Macro PDF417 sequence holds 1 to ${MAX_SEQUENCE_SYMBOLS} symbols, got ${requested}`,
    )
  }

  const id = fileId === undefined ? defaultFileId(text) : normalizeFileId(fileId)
  const chars = [...text]

  // Start from the count the data volume calls for; chunking and the mode
  // latches each chunk needs can still push it up by one or two
  const first = requested ?? estimateSymbolCount(text, id, macro, pdf417Options)
  const last = requested ?? MAX_SEQUENCE_SYMBOLS

  for (let total = first; total <= last; total++) {
    const chunks = splitEvenly(chars, total)
    if (chunks.length !== total) continue

    const sequence = tryEncodeSequence(chunks, total, id, macro, pdf417Options)
    if (sequence) return sequence
    if (requested !== undefined) {
      throw new CapacityError(
        `Data does not fit in ${total} PDF417 symbol${total === 1 ? "" : "s"} at EC level ${pdf417Options.ecLevel ?? "auto"}`,
      )
    }
  }

  throw new CapacityError(
    `Data does not fit in a Macro PDF417 sequence of ${MAX_SEQUENCE_SYMBOLS} symbols`,
  )
}

/** Encode every chunk, or return undefined if any of them overflows */
function tryEncodeSequence(
  chunks: string[],
  total: number,
  fileId: string,
  macro: PDF417SharedMacroOptions | undefined,
  pdf417Options: PDF417Options,
): PDF417Result[] | undefined {
  const results: PDF417Result[] = []
  for (const [index, chunk] of chunks.entries()) {
    try {
      results.push(
        encodePDF417(chunk, {
          ...pdf417Options,
          macro:
            total > 1
              ? {
                  ...macro,
                  segmentIndex: index,
                  fileId,
                  segmentCount: total,
                  lastSegment: index === total - 1,
                }
              : undefined,
        }),
      )
    } catch (error) {
      if (error instanceof CapacityError) return undefined
      throw error
    }
  }
  return results
}

/** Fewest symbols the compacted data could possibly need */
function estimateSymbolCount(
  text: string,
  fileId: string,
  macro: PDF417SharedMacroOptions | undefined,
  pdf417Options: PDF417Options,
): number {
  const dataLength = encodeData(text, { eci: pdf417Options.eci }).length
  const overhead =
    buildMacroBlock({
      ...macro,
      segmentIndex: 0,
      fileId,
      segmentCount: MAX_SEQUENCE_SYMBOLS,
      lastSegment: true,
    }).length + (pdf417Options.readerInit ? 1 : 0)

  const capacity = MAX_DATA_CODEWORDS - overhead
  if (capacity < 1) {
    throw new CapacityError("Macro PDF417 control block leaves no room for data")
  }
  return Math.max(1, Math.ceil(dataLength / capacity))
}

/**
 * Six-digit file ID derived from the message with FNV-1a, so every segment of
 * one message carries the same identifier without the caller inventing one.
 */
function defaultFileId(text: string): string {
  let hash = 0x811c_9dc5
  for (const byte of new TextEncoder().encode(text)) {
    hash = Math.imul(hash ^ byte, 0x0100_0193) >>> 0
  }
  const high = hash % 900
  const low = Math.floor(hash / 900) % 900
  return `${String(high).padStart(3, "0")}${String(low).padStart(3, "0")}`
}

/** Split code points into `count` chunks of as equal a size as possible */
function splitEvenly(chars: string[], count: number): string[] {
  const chunks: string[] = []
  const size = Math.ceil(chars.length / count)
  for (let i = 0; i < chars.length; i += size) {
    chunks.push(chars.slice(i, i + size).join(""))
  }
  return chunks
}

/**
 * Assemble the data codewords of a symbol, macro control block aside.
 * Reader initialisation has to come first, before any ECI declaration.
 */
function buildBodyCodewords(text: string, options: PDF417Options): number[] {
  const codewords: number[] = []

  if (options.readerInit) {
    codewords.push(READER_INIT)
  }

  for (const cw of encodeData(text, { eci: options.eci })) {
    codewords.push(cw)
  }

  return codewords
}

/**
 * Calculate the number of rows and columns for the symbol.
 */
function calculateDimensions(
  dataWithLength: number,
  ecCount: number,
  requestedCols?: number,
): { rows: number; cols: number } {
  const totalCodewords = dataWithLength + ecCount

  if (requestedCols !== undefined) {
    if (requestedCols < MIN_COLS || requestedCols > MAX_COLS) {
      throw new InvalidInputError(
        `PDF417 columns must be ${MIN_COLS}-${MAX_COLS}, got ${requestedCols}`,
      )
    }
    const rows = Math.ceil(totalCodewords / requestedCols)
    if (rows < MIN_ROWS) {
      return { rows: MIN_ROWS, cols: requestedCols }
    }
    if (rows > MAX_ROWS) {
      throw new CapacityError(
        `PDF417 data too large: requires ${rows} rows with ${requestedCols} columns (max ${MAX_ROWS})`,
      )
    }
    return { rows, cols: requestedCols }
  }

  // Auto-determine columns: try to find a good aspect ratio
  // Target roughly 3:1 width:height ratio in codewords
  // Each row has: start(17) + left(17) + data(cols*17) + right(17) + stop(18)
  // So module width = 69 + cols*17 for full, 52 + cols*17 for compact
  // Try columns from 1 to 30, pick one that gives rows in valid range
  // with a reasonable aspect ratio

  let bestCols = MIN_COLS
  let bestRows = MAX_ROWS
  let bestScore = Infinity

  for (let c = MIN_COLS; c <= MAX_COLS; c++) {
    const r = Math.ceil(totalCodewords / c)
    if (r < MIN_ROWS || r > MAX_ROWS) continue

    // Actual total including padding
    // Score based on wasted space and aspect ratio
    const totalSlots = r * c
    const waste = totalSlots - totalCodewords
    const moduleWidth = 69 + c * 17
    const aspectRatio = moduleWidth / r
    // Target aspect ratio ~3-4 for readability
    const aspectPenalty = Math.abs(aspectRatio - 3.5) * 10
    const score = waste + aspectPenalty

    if (score < bestScore) {
      bestScore = score
      bestCols = c
      bestRows = r
    }
  }

  // Ensure minimum rows
  if (bestRows < MIN_ROWS) bestRows = MIN_ROWS

  return { rows: bestRows, cols: bestCols }
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
    : 17 + 17 + cols * 17 + 17 + 18 // start + left indicator + data + right indicator + stop

  const matrix: boolean[][] = []

  for (let row = 0; row < rows; row++) {
    const cluster = getRowCluster(row)
    const rowModules: boolean[] = Array.from({ length: modulesPerRow }, () => false)
    let modulePos = 0

    // Start pattern
    modulePos = writePattern(rowModules, modulePos, START_PATTERN as number[])

    // Left row indicator
    const leftIndicator = computeLeftIndicator(row, rows, cols, ecLevel)
    const leftPattern = getCodewordPattern(leftIndicator, cluster)
    modulePos = writePattern(rowModules, modulePos, leftPattern)

    // Data codewords for this row
    for (let col = 0; col < cols; col++) {
      const cwIndex = row * cols + col
      const cw = cwIndex < allCodewords.length ? allCodewords[cwIndex]! : 900 // padding
      const pattern = getCodewordPattern(cw, cluster)
      modulePos = writePattern(rowModules, modulePos, pattern)
    }

    if (compact) {
      // Compact mode: 1-module stop bar
      rowModules[modulePos] = true
    } else {
      // Right row indicator
      const rightIndicator = computeRightIndicator(row, rows, cols, ecLevel)
      const rightPattern = getCodewordPattern(rightIndicator, cluster)
      modulePos = writePattern(rowModules, modulePos, rightPattern)

      // Stop pattern
      writePattern(rowModules, modulePos, STOP_PATTERN as number[])
    }

    matrix.push(rowModules)
  }

  return matrix
}

/**
 * Write a bar/space pattern to the module row.
 * Alternating: first element is bar (true), second is space (false), etc.
 * Returns the new module position.
 */
function writePattern(modules: boolean[], startPos: number, pattern: number[]): number {
  let pos = startPos
  for (let i = 0; i < pattern.length; i++) {
    const width = pattern[i]!
    const isBar = i % 2 === 0 // even index = bar, odd index = space
    for (let w = 0; w < width; w++) {
      if (pos < modules.length) {
        modules[pos] = isBar
      }
      pos++
    }
  }
  return pos
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
  const clusterIndex = row % 3
  const rowGroup = Math.floor(row / 3)

  switch (clusterIndex) {
    case 0:
      return rowGroup * 30 + Math.floor((rows - 1) / 3)
    case 1:
      return rowGroup * 30 + ecLevel * 3 + ((rows - 1) % 3)
    case 2:
      return rowGroup * 30 + (cols - 1)
    default:
      return 0
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
  const clusterIndex = row % 3
  const rowGroup = Math.floor(row / 3)

  switch (clusterIndex) {
    case 0:
      return rowGroup * 30 + (cols - 1)
    case 1:
      return rowGroup * 30 + Math.floor((rows - 1) / 3)
    case 2:
      return rowGroup * 30 + ecLevel * 3 + ((rows - 1) % 3)
    default:
      return 0
  }
}

export type { PDF417Options as PDF417EncoderOptions }
