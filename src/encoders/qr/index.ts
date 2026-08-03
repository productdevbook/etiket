/**
 * QR Code encoder — Full ISO/IEC 18004 implementation
 * Supports versions 1-40, all EC levels (L/M/Q/H), all encoding modes
 */

import type { QRCodeOptions } from "./types";
import { encodeData } from "./data";
import { createMatrix, placeFunctionPatterns, placeData } from "./matrix";
import { selectBestMask, applyMask } from "./mask";
import { writeFormatInfo, writeVersionInfo } from "./format";
import { InvalidInputError } from "../../errors";

export type { QRCodeOptions, ErrorCorrectionLevel, EncodingMode, QRSegment } from "./types";

/**
 * Encode text as a QR code matrix
 * Returns a 2D boolean array (true = dark module)
 */
export function encodeQR(text: string, options: QRCodeOptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("QR Code input must not be empty");
  }
  const { version, ecLevel, bits } = encodeData(text, options);
  const size = version * 4 + 17;

  // Create matrix and place function patterns
  const matrix = createMatrix(size);
  placeFunctionPatterns(matrix, version);

  // Place data bits
  placeData(matrix, bits, version);

  // Select and apply best mask
  const bestMask = selectBestMask(matrix, size, version, options.mask);
  applyMask(matrix, bestMask, size, version);

  // Write format info
  writeFormatInfo(matrix, ecLevel, bestMask);

  // Write version info
  if (version >= 7) {
    writeVersionInfo(matrix, version);
  }

  // Convert to boolean array (null -> false)
  return matrix.map((row) => row.map((cell) => cell === true));
}
