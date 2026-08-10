/**
 * Data Matrix ECC 200 encoder
 * Supports ASCII encoding mode for text input
 *
 * Based on ISO/IEC 16022
 */

import { InvalidInputError, CapacityError } from "../../errors"
import { encodeAuto, encodeCandidates, padCodewords } from "./encoder"
import { maxCapacity, selectSymbolSize } from "./tables"
import type { DataMatrixSizeOptions, SymbolSize } from "./tables"
import type { DataMatrixCandidate, DataMatrixEncodeOptions } from "./encoder"
import { generateInterleavedEC } from "./reed-solomon"
import { placeModules } from "./placement"
import { parseAIString, isVariableLength } from "../gs1-128"

/**
 * Encode text as a Data Matrix ECC 200 symbol.
 * Returns a 2D boolean array (true = dark module).
 *
 * @param text - The text to encode (ASCII characters 0-255)
 * @param options - Symbol shape / size selection (square by default)
 * @returns 2D boolean matrix representing the Data Matrix symbol
 *
 * @example
 * ```ts
 * const matrix = encodeDataMatrix('Hello')
 * // matrix[row][col] === true means dark module
 *
 * // Rectangular, including the ISO 21471 DMRE sizes
 * const wide = encodeDataMatrix('Hello', { shape: 'rectangle', dmre: true })
 *
 * // Exact size
 * const fixed = encodeDataMatrix('Hello', { symbolSize: '26x64' })
 * ```
 */
export function encodeDataMatrix(
  text: string,
  options: DataMatrixSizeOptions & DataMatrixEncodeOptions = {},
): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("Data Matrix input must not be empty")
  }

  // Steps 1 and 2: encode the text every way the standard allows and take the
  // one that reaches the smallest symbol
  const chosen = smallestSymbol(encodeCandidates(text, { eci: options.eci }), options)
  if (!chosen) {
    throw new CapacityError(
      capacityMessage("Data Matrix", encodeAuto(text, { eci: options.eci }).length, options),
    )
  }
  const { codewords: dataCodewords, symbol } = chosen

  // Step 3: Pad data codewords to fill symbol capacity
  const paddedData = padCodewords(dataCodewords, symbol.totalDataCodewords)

  // Step 4: Generate error correction codewords
  const ecCodewords = generateInterleavedEC(
    paddedData,
    symbol.ecCodewords,
    symbol.interleavedBlocks,
  )

  // Step 5: Combine data and EC codewords
  const allCodewords = [...paddedData, ...ecCodewords]

  // Step 6: Place codewords into the matrix with finder patterns
  return placeModules(allCodewords, symbol)
}

/**
 * Encode a GS1 DataMatrix symbol with FNC1 and Application Identifiers.
 * Accepts parenthesized AI format: "(01)12345678901234(21)SERIAL"
 *
 * @param text - GS1 AI string in parenthesized format
 * @param options - Symbol shape / size selection (square by default)
 * @returns 2D boolean matrix
 */
export function encodeGS1DataMatrix(
  text: string,
  options: DataMatrixSizeOptions = {},
): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("GS1 DataMatrix input must not be empty")
  }

  const fields = parseAIString(text)

  // Build codewords: FNC1 (232) + AI data with FNC1 separators
  const codewords: number[] = [232] // FNC1 in first position

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!
    // Encode AI digits
    for (const ch of field.ai) {
      codewords.push(ch.charCodeAt(0) + 1)
    }
    // Encode data
    for (const ch of field.data) {
      codewords.push(ch.charCodeAt(0) + 1)
    }
    // FNC1 separator after variable-length fields (except last)
    if (i < fields.length - 1 && isVariableLength(field.ai)) {
      codewords.push(232)
    }
  }

  // Select symbol, pad, EC, place — same as standard DataMatrix
  const symbol = selectSymbolSize(codewords.length, options)
  if (!symbol) {
    throw new CapacityError(capacityMessage("GS1 DataMatrix", codewords.length, options))
  }

  const paddedData = padCodewords(codewords, symbol.totalDataCodewords)
  const ecCodewords = generateInterleavedEC(
    paddedData,
    symbol.ecCodewords,
    symbol.interleavedBlocks,
  )
  const allCodewords = [...paddedData, ...ecCodewords]
  return placeModules(allCodewords, symbol)
}

/**
 * The smallest symbol any mode can finish cleanly in, and the stream it takes.
 *
 * Symbols are tried smallest first because whether a mode needs its unlatch —
 * and so how long its stream is — depends on how much of the symbol is left
 * after it. Within a symbol the shortest stream wins, and then the earlier
 * mode, so the choice does not turn on a size two candidates share.
 */
function smallestSymbol(
  candidates: DataMatrixCandidate[],
  options: DataMatrixSizeOptions,
): { codewords: number[]; symbol: SymbolSize } | undefined {
  let symbol = selectSymbolSize(1, options)
  while (symbol) {
    let best: number[] | undefined
    for (const candidate of candidates) {
      const codewords = candidate.encode(symbol.totalDataCodewords)
      if (codewords && (!best || codewords.length < best.length)) best = codewords
    }
    if (best) return { codewords: best, symbol }

    const next = selectSymbolSize(symbol.totalDataCodewords + 1, options)
    if (!next || next.totalDataCodewords <= symbol.totalDataCodewords) return undefined
    symbol = next
  }
  return undefined
}

/** Build a capacity error message that names the limit actually in force */
function capacityMessage(label: string, needed: number, options: DataMatrixSizeOptions): string {
  if (options.symbolSize !== undefined) {
    const size =
      typeof options.symbolSize === "string"
        ? options.symbolSize
        : `${options.symbolSize.rows}x${options.symbolSize.cols}`
    return `Data too long for ${label} symbol ${size}: ${needed} codewords needed`
  }
  const shape = options.shape ?? "square"
  const limit = maxCapacity(options)
  return `Data too long for ${label}: ${needed} codewords needed, maximum is ${limit} for ${shape} symbols${options.dmre ? " (DMRE enabled)" : ""}`
}
