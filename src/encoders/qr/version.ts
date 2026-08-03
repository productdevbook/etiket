/**
 * QR Code version selection
 * Versions 1-40, size = 4*V + 17 modules per side
 */

import type { ErrorCorrectionLevel } from "./types"
import { getECInfo, getCharCountBits } from "./tables"
import { detectMode, isNumeric, isAlphanumeric } from "./mode"

/** Calculate data capacity in bits for a given version and EC level */
export function getDataCapacityBits(version: number, ecLevel: ErrorCorrectionLevel): number {
  const info = getECInfo(version, ecLevel)
  return info.totalDataCodewords * 8
}

/**
 * Select the smallest QR version that can encode the given data
 * Returns version number (1-40)
 */
export function selectVersion(
  text: string,
  ecLevel: ErrorCorrectionLevel,
  mode?: string,
  requestedVersion?: number,
): number {
  const resolvedMode = mode === "auto" || !mode ? detectMode(text) : mode
  const data = new TextEncoder().encode(text)

  if (requestedVersion) {
    // Verify the requested version can hold the data
    const capacity = getDataCapacityBits(requestedVersion, ecLevel)
    const needed = calculateBitsNeeded(text, data, resolvedMode, requestedVersion)
    if (needed > capacity) {
      throw new Error(`Data too long for QR version ${requestedVersion} with EC level ${ecLevel}`)
    }
    return requestedVersion
  }

  // Find smallest version that fits
  for (let v = 1; v <= 40; v++) {
    const capacity = getDataCapacityBits(v, ecLevel)
    const needed = calculateBitsNeeded(text, data, resolvedMode, v)
    if (needed <= capacity) return v
  }

  throw new Error(`Data too long for any QR code version with EC level ${ecLevel}`)
}

/** Calculate total bits needed to encode data in a given mode */
function calculateBitsNeeded(
  text: string,
  data: Uint8Array,
  mode: string,
  version: number,
): number {
  const charCountBits = getCharCountBits(version, mode)

  // Mode indicator (4 bits) + char count + data
  let dataBits: number

  switch (mode) {
    case "numeric":
      dataBits =
        Math.floor(text.length / 3) * 10 +
        (text.length % 3 === 2 ? 7 : text.length % 3 === 1 ? 4 : 0)
      return 4 + charCountBits + dataBits
    case "alphanumeric":
      dataBits = Math.floor(text.length / 2) * 11 + (text.length % 2 === 1 ? 6 : 0)
      return 4 + charCountBits + dataBits
    case "byte":
      return 4 + charCountBits + data.length * 8
    case "kanji":
      return 4 + charCountBits + text.length * 13
    default:
      return 4 + charCountBits + data.length * 8
  }
}

/** Get the module count (size) for a version */
export function getModuleCount(version: number): number {
  return version * 4 + 17
}

/**
 * Determine the optimal encoding mode based on data content
 * Uses simple mode selection (not optimal segmentation for now)
 */
export function selectMode(
  text: string,
  requestedMode?: string,
): "numeric" | "alphanumeric" | "byte" | "kanji" {
  if (requestedMode && requestedMode !== "auto") {
    return requestedMode as "numeric" | "alphanumeric" | "byte" | "kanji"
  }
  if (isNumeric(text)) return "numeric"
  if (isAlphanumeric(text)) return "alphanumeric"
  return "byte"
}
