/**
 * Shared types for etiket
 */

import type { BarcodeSVGOptions } from "./renderers/svg/types"
import type { PostalBar } from "./renderers/svg/postal"
import type { QRCodeOptions } from "./encoders/qr/types"
import type { MicroQROptions } from "./encoders/qr/micro"
import type { RMQROptions } from "./encoders/rmqr"
import type { PDF417Options } from "./encoders/pdf417/index"
import type { MicroPDF417Options } from "./encoders/micropdf417"
import type { AztecOptions } from "./encoders/aztec/index"
import type { MaxiCodeOptions } from "./encoders/maxicode"
import type { HanXinOptions } from "./encoders/hanxin"
import type { DataMatrixSizeOptions } from "./encoders/datamatrix/tables"
import type { MailmarkOptions } from "./encoders/mailmark"

/** Width-modulated linear symbologies rendered by `barcode()`. */
// prettier-ignore
export const BARCODE_TYPES = [
  "code128",
  "ean13",
  "ean8",
  "code39",
  "code39ext",
  "code93",
  "code93ext",
  "itf",
  "itf14",
  "upca",
  "upce",
  "ean2",
  "ean5",
  "codabar",
  "msi",
  "pharmacode",
  "code11",
  "gs1-128",
  "identcode",
  "leitcode",
  "postnet",
  "planet",
  "plessey",
  "gs1-databar",
  "gs1-databar-limited",
  "gs1-databar-expanded",
  "gs1-databar-truncated",
  "ean14",
  "sscc18",
  "isbn",
  "issn",
  "ismn",
  "code32",
  "pzn",
  "pzn8",
  "industrial2of5",
  "iata2of5",
  "matrix2of5",
  "coop2of5",
  "datalogic2of5",
] as const

/** Width-modulated linear symbologies rendered by `barcode()`. */
export type BarcodeType = (typeof BARCODE_TYPES)[number]

export interface BarcodeEncodingOptions {
  type?: BarcodeType
  msiCheckDigit?: "mod10" | "mod11" | "mod1010" | "mod1110" | "none"
  code39CheckDigit?: boolean
  codabarStart?: string
  codabarStop?: string
  code128Charset?: "auto" | "A" | "B" | "C"
  /** Two digit ISSN sequence variant. Defaults to `"00"`. */
  issnVariant?: string
  /** Append a Code 25 check digit, or `"verify"` one already on the end. */
  code2of5CheckDigit?: boolean | "verify"
}

export interface BarcodeOptions extends BarcodeEncodingOptions, BarcodeSVGOptions {}

/** The symbologies `encode()` handles beyond the linear ones. */
// prettier-ignore
export const EXTRA_ENCODE_TYPES = [
  "rm4scc",
  "kix",
  "auspost",
  "jppost",
  "imb",
  "pharmacode2",
  "qr",
  "microqr",
  "rmqr",
  "datamatrix",
  "gs1-datamatrix",
  "mailmark",
  "pdf417",
  "micropdf417",
  "aztec",
  "aztecrune",
  "maxicode",
  "dotcode",
  "hanxin",
  "codablock-f",
  "code16k",
] as const

/** Every symbology `encode()` can produce raw output for. */
export const ENCODE_TYPES = [...BARCODE_TYPES, ...EXTRA_ENCODE_TYPES] as const

/** Every symbology `encode()` can produce raw output for. */
export type EncodeType = (typeof ENCODE_TYPES)[number]

export interface EncodeOptions extends Omit<BarcodeEncodingOptions, "type"> {
  type?: EncodeType

  /** Australia Post Format Control Code: "11", "45", "59", "62", "87" or "92". */
  fcc?: string
  /** Second data field for IMb (routing code) and Japan Post (address). */
  routingCode?: string

  /** Per-symbology encoder options. */
  qr?: QRCodeOptions
  microqr?: MicroQROptions
  rmqr?: RMQROptions
  pdf417?: PDF417Options
  micropdf417?: MicroPDF417Options
  aztec?: AztecOptions
  maxicode?: MaxiCodeOptions
  hanxin?: HanXinOptions
  codablockf?: { columns?: number }
  datamatrix?: DataMatrixSizeOptions
  mailmark?: MailmarkOptions
}

export interface Encode1DResult {
  type: "1d"
  /** Alternating bar/space widths in modules, starting with a bar. */
  bars: number[]
}

export interface Encode2DResult {
  type: "2d"
  matrix: boolean[][]
}

export interface EncodePostalResult {
  type: "postal"
  /** 4-state letters, or 1 (tall) / 0 (short) for POSTNET and PLANET. */
  bars: PostalBar[]
}

export type EncodeResult = Encode1DResult | Encode2DResult | EncodePostalResult
