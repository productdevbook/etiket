/**
 * QR Code input validation
 */

import type { ErrorCorrectionLevel } from "../encoders/qr/types"
import { selectVersion } from "../encoders/qr/version"
import { detectMode } from "../encoders/qr/mode"

/** Maximum data capacity by EC level and mode (version 40) */
const MAX_CAPACITY: Record<ErrorCorrectionLevel, Record<string, number>> = {
  L: { numeric: 7089, alphanumeric: 4296, byte: 2953 },
  M: { numeric: 5596, alphanumeric: 3391, byte: 2331 },
  Q: { numeric: 3993, alphanumeric: 2420, byte: 1663 },
  H: { numeric: 3057, alphanumeric: 1852, byte: 1273 },
}

export interface QRValidationResult {
  valid: boolean
  error?: string
  /** Minimum QR version needed (1-40), only when valid */
  version?: number
  /** Detected encoding mode */
  mode?: "numeric" | "alphanumeric" | "byte"
  /** Data length in the detected mode's units */
  dataLength?: number
  /** Maximum capacity for the detected mode and EC level */
  maxCapacity?: number
}

/** Validate QR code input */
export function validateQRInput(
  text: string,
  ecLevel: ErrorCorrectionLevel = "M",
): QRValidationResult {
  if (text.length === 0) {
    return { valid: false, error: "Text cannot be empty" }
  }

  // Detect mode
  const mode = detectMode(text) as "numeric" | "alphanumeric" | "byte"

  const caps = MAX_CAPACITY[ecLevel]
  const maxCapacity = caps[mode]!

  // Determine data length in the mode's units
  let dataLength: number
  if (mode === "byte") {
    dataLength = new TextEncoder().encode(text).length
  } else {
    dataLength = text.length
  }

  if (dataLength > maxCapacity) {
    return {
      valid: false,
      error: `Data too long for QR code with EC level ${ecLevel} (${mode} mode). Maximum ${maxCapacity} ${mode === "byte" ? "bytes" : "chars"}, got ${dataLength}`,
      mode,
      dataLength,
      maxCapacity,
    }
  }

  // Use selectVersion to find the minimum QR version
  let version: number
  try {
    version = selectVersion(text, ecLevel)
  } catch {
    return {
      valid: false,
      error: `Data too long for any QR code version with EC level ${ecLevel}`,
      mode,
      dataLength,
      maxCapacity,
    }
  }

  return {
    valid: true,
    version,
    mode,
    dataLength,
    maxCapacity,
  }
}
