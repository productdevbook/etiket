/**
 * The QR symbol builder shared by `encodeQRCore` and `encodeQRSymbol`. It
 * imports neither the Shift-JIS table nor the GS1 parser, so a bundle that
 * reaches the QR encoder through `encodeQRSymbol` carries neither.
 */

import type { QRCodeOptions, QRSymbol, QRSymbolOptions } from "./types"
import { encodeData } from "./data"
import { createMatrix, placeFunctionPatterns, placeData } from "./matrix"
import { selectBestMask, applyMask } from "./mask"
import { writeFormatInfo, writeVersionInfo } from "./format"
import { CapacityError, InvalidInputError } from "../../errors"

/** Build the symbol for text that is already the payload to encode */
export function buildQRSymbol(text: string, options: QRCodeOptions): QRSymbol {
  const { version, ecLevel, bits } = encodeData(text, options)
  const size = version * 4 + 17

  const matrix = createMatrix(size)
  placeFunctionPatterns(matrix, version)
  placeData(matrix, bits, version)

  const mask = selectBestMask(matrix, size, version, options.mask)
  applyMask(matrix, mask, size, version)

  writeFormatInfo(matrix, ecLevel, mask)
  if (version >= 7) {
    writeVersionInfo(matrix, version)
  }

  const modules = matrix.map((row) => row.map((cell) => cell === true))
  return { version, ecLevel, mask, size, modules }
}

const LEFT_OUT = ["kanji", "gs1", "applicationIndicator", "structuredAppend"] as const

/**
 * Encode text as a QR code and return the symbol with the version, error
 * correction level and mask it was built with.
 *
 * This is the narrow path: no kanji mode, GS1 or Structured Append, so a bundle
 * that imports only this leaves them out. An empty string is a byte segment of
 * length 0. Throws `CapacityError` when the data does not fit; use
 * {@link tryEncodeQRSymbol} to get `null` instead.
 *
 * @example
 * ```ts
 * const { version, ecLevel, modules } = encodeQRSymbol("hello", { ecLevel: "L", boostEcc: true })
 * ```
 */
export function encodeQRSymbol(text: string, options: QRSymbolOptions = {}): QRSymbol {
  for (const key of LEFT_OUT) {
    if (key in options) {
      throw new InvalidInputError(
        `encodeQRSymbol does not take the "${key}" option: use encodeQRCore or encodeQR for it`,
      )
    }
  }
  return buildQRSymbol(text, options)
}

/**
 * {@link encodeQRSymbol} that returns `null` when the data does not fit any
 * symbol the options allow, instead of throwing `CapacityError`. Invalid options
 * still throw.
 */
export function tryEncodeQRSymbol(text: string, options: QRSymbolOptions = {}): QRSymbol | null {
  try {
    return encodeQRSymbol(text, options)
  } catch (error) {
    if (error instanceof CapacityError) return null
    throw error
  }
}
