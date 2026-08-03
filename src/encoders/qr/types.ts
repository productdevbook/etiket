/**
 * QR Code types and interfaces
 */

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H"

export type EncodingMode = "numeric" | "alphanumeric" | "byte" | "kanji" | "auto"

export interface QRCodeOptions {
  ecLevel?: ErrorCorrectionLevel
  version?: number // 1-40, auto if omitted
  mode?: EncodingMode
  mask?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 // auto if omitted
  micro?: boolean
  structuredAppend?: {
    index: number
    total: number
    parity: number
  }
}

export interface QRSegment {
  mode: "numeric" | "alphanumeric" | "byte" | "kanji" | "eci"
  data: Uint8Array | string
  charCount: number
}

/** EC level indicators: L=01, M=00, Q=11, H=10 */
export const EC_LEVEL_BITS: Record<ErrorCorrectionLevel, number> = {
  L: 0b01,
  M: 0b00,
  Q: 0b11,
  H: 0b10,
}

/** Mode indicators (4 bits) */
export const MODE_INDICATOR = {
  numeric: 0b0001,
  alphanumeric: 0b0010,
  byte: 0b0100,
  kanji: 0b1000,
  eci: 0b0111,
  structuredAppend: 0b0011,
  fnc1First: 0b0101,
  fnc1Second: 0b1001,
  terminator: 0b0000,
} as const
