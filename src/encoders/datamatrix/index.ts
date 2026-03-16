/**
 * Data Matrix ECC 200 encoder
 * Supports ASCII encoding mode for text input
 *
 * Based on ISO/IEC 16022
 */

import { InvalidInputError, CapacityError } from "../../errors";
import { encodeASCII, encodeAuto, padCodewords } from "./encoder";
import { selectSymbolSize } from "./tables";
import { generateInterleavedEC } from "./reed-solomon";
import { placeModules } from "./placement";
import { parseAIString, isVariableLength } from "../gs1-128";

/**
 * Encode text as a Data Matrix ECC 200 symbol.
 * Returns a 2D boolean array (true = dark module).
 *
 * @param text - The text to encode (ASCII characters 0-255)
 * @returns 2D boolean matrix representing the Data Matrix symbol
 *
 * @example
 * ```ts
 * const matrix = encodeDataMatrix('Hello')
 * // matrix[row][col] === true means dark module
 * ```
 */
export function encodeDataMatrix(text: string): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("Data Matrix input must not be empty");
  }

  // Step 1: Encode text to data codewords (auto-select best mode)
  const dataCodewords = encodeAuto(text);

  // Step 2: Select the smallest symbol size that fits the data
  const symbol = selectSymbolSize(dataCodewords.length);
  if (!symbol) {
    throw new CapacityError(
      `Data too long for Data Matrix: ${dataCodewords.length} codewords needed, maximum is 1558`,
    );
  }

  // Step 3: Pad data codewords to fill symbol capacity
  const paddedData = padCodewords(dataCodewords, symbol.totalDataCodewords);

  // Step 4: Generate error correction codewords
  const ecCodewords = generateInterleavedEC(
    paddedData,
    symbol.ecCodewords,
    symbol.interleavedBlocks,
  );

  // Step 5: Combine data and EC codewords
  const allCodewords = [...paddedData, ...ecCodewords];

  // Step 6: Place codewords into the matrix with finder patterns
  return placeModules(allCodewords, symbol);
}

/**
 * Encode a GS1 DataMatrix symbol with FNC1 and Application Identifiers.
 * Accepts parenthesized AI format: "(01)12345678901234(21)SERIAL"
 *
 * @param text - GS1 AI string in parenthesized format
 * @returns 2D boolean matrix
 */
export function encodeGS1DataMatrix(text: string): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("GS1 DataMatrix input must not be empty");
  }

  const fields = parseAIString(text);

  // Build codewords: FNC1 (232) + AI data with FNC1 separators
  const codewords: number[] = [232]; // FNC1 in first position

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!;
    // Encode AI digits
    for (const ch of field.ai) {
      codewords.push(ch.charCodeAt(0) + 1);
    }
    // Encode data
    for (const ch of field.data) {
      codewords.push(ch.charCodeAt(0) + 1);
    }
    // FNC1 separator after variable-length fields (except last)
    if (i < fields.length - 1 && isVariableLength(field.ai)) {
      codewords.push(232);
    }
  }

  // Select symbol, pad, EC, place — same as standard DataMatrix
  const symbol = selectSymbolSize(codewords.length);
  if (!symbol) {
    throw new CapacityError(
      `Data too long for GS1 DataMatrix: ${codewords.length} codewords needed`,
    );
  }

  const paddedData = padCodewords(codewords, symbol.totalDataCodewords);
  const ecCodewords = generateInterleavedEC(
    paddedData,
    symbol.ecCodewords,
    symbol.interleavedBlocks,
  );
  const allCodewords = [...paddedData, ...ecCodewords];
  return placeModules(allCodewords, symbol);
}
