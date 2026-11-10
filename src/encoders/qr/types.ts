/**
 * QR Code types and interfaces
 */

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H"

export type EncodingMode = "numeric" | "alphanumeric" | "byte" | "kanji" | "auto"

export interface QRCodeOptions {
  ecLevel?: ErrorCorrectionLevel
  version?: number // 1-40, auto if omitted
  /** The smallest version to consider, 1-40: the encoder takes the smallest one from here that fits. */
  minVersion?: number
  /**
   * Once the version is chosen, raise `ecLevel` as far as the data still fits
   * without growing the symbol.
   */
  boostEcc?: boolean
  mode?: EncodingMode
  mask?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 // auto if omitted
  micro?: boolean
  /**
   * Structured Append header: this symbol is `index` of `total`, and `parity`
   * is the XOR of every byte of the complete, unsplit message.
   *
   * Use `encodeQRSequence()` unless you are driving the split yourself.
   */
  structuredAppend?: {
    /** 0-based position of this symbol */
    index: number
    /** Number of symbols in the sequence (2-16) */
    total: number
    /** XOR of all bytes of the complete message */
    parity: number
  }
  /**
   * ECI (Extended Channel Interpretation) assignment number declaring the
   * character set of the data, e.g. 26 for UTF-8 or 3 for ISO-8859-1.
   */
  eci?: number
  /**
   * Encode the text as GS1 element strings: the input is a parenthesised AI
   * string such as `"(01)09501101020917(10)LOT42"`, and the symbol carries the
   * FNC1 first-position flag that tells a reader so.
   */
  gs1?: boolean
  /**
   * Application indicator for FNC1 in the second position — either two digits
   * (`"12"`) or a single letter (`"A"`), per the AIM application agreement the
   * data follows. Ignored when `gs1` is set.
   */
  applicationIndicator?: string
  /**
   * The Shift-JIS table for kanji mode. `encodeQR` passes `kanjiCodec`;
   * without it, `encodeQRCore` encodes Japanese text in byte mode.
   */
  kanji?: KanjiCodec
}

/** The Unicode to Shift-JIS mapping kanji mode encodes with, as `kanjiCodec` */
export interface KanjiCodec {
  /** The Shift-JIS value kanji mode encodes a character as, or undefined when it cannot */
  toShiftJIS(char: string): number | undefined
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

/** What `encodeQRSymbol` returns: the symbol and the choices that shaped it */
export interface QRSymbol {
  /** Version 1-40; the symbol is `4 * version + 17` modules on a side */
  version: number
  /** The error correction level actually used, after `boostEcc` */
  ecLevel: ErrorCorrectionLevel
  /** The mask pattern 0-7, whether given or chosen by penalty score */
  mask: number
  /** Modules per side */
  size: number
  /** true = dark module, `modules[row][column]` */
  modules: boolean[][]
}

/** The options `encodeQRSymbol` takes: the QR-only path leaves out kanji, GS1 and Structured Append */
export type QRSymbolOptions = Omit<
  QRCodeOptions,
  "kanji" | "gs1" | "applicationIndicator" | "structuredAppend" | "micro"
>
