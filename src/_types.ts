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

/** Width-modulated linear symbologies rendered by `barcode()`. */
export type BarcodeType =
  | "code128"
  | "ean13"
  | "ean8"
  | "code39"
  | "code39ext"
  | "code93"
  | "code93ext"
  | "itf"
  | "itf14"
  | "upca"
  | "upce"
  | "ean2"
  | "ean5"
  | "codabar"
  | "msi"
  | "pharmacode"
  | "code11"
  | "gs1-128"
  | "identcode"
  | "leitcode"
  | "postnet"
  | "planet"
  | "plessey"
  | "gs1-databar"
  | "gs1-databar-limited"
  | "gs1-databar-expanded"

export interface BarcodeEncodingOptions {
  type?: BarcodeType
  msiCheckDigit?: "mod10" | "mod11" | "mod1010" | "mod1110" | "none"
  code39CheckDigit?: boolean
  codabarStart?: string
  codabarStop?: string
  code128Charset?: "auto" | "A" | "B" | "C"
}

export interface BarcodeOptions extends BarcodeEncodingOptions, BarcodeSVGOptions {}

/** Every symbology `encode()` can produce raw output for. */
export type EncodeType =
  | BarcodeType
  // 4-state and height-modulated postal
  | "rm4scc"
  | "kix"
  | "auspost"
  | "jppost"
  | "imb"
  // 2D and stacked
  | "qr"
  | "microqr"
  | "rmqr"
  | "datamatrix"
  | "gs1-datamatrix"
  | "pdf417"
  | "micropdf417"
  | "aztec"
  | "maxicode"
  | "dotcode"
  | "hanxin"
  | "codablock-f"
  | "code16k"

export interface EncodeOptions extends Omit<BarcodeEncodingOptions, "type"> {
  type?: EncodeType

  /** Australia Post Format Control Code ("11", "59" or "62"). */
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
