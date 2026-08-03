/**
 * PNG output for barcodes and 2D codes
 */

import { encodeBars } from "./_barcode"
import { encodeQR } from "./encoders/qr/index"
import { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index"
import { encodePDF417 } from "./encoders/pdf417/index"
import { encodeAztec } from "./encoders/aztec/index"
import { encodeMicroQR } from "./encoders/qr/micro"
import { encodeRMQR } from "./encoders/rmqr"
import { encodeHanXin } from "./encoders/hanxin"
import { encodeDotCode } from "./encoders/dotcode"
import { encodeMicroPDF417 } from "./encoders/micropdf417"
import { encodeCodablockF } from "./encoders/codablock-f"
import { encodeCode16K } from "./encoders/code16k"
import { encodeMaxiCode } from "./encoders/maxicode"
import {
  renderBarcodePNG,
  renderMatrixPNG,
  renderPostalPNG,
  renderMaxiCodePNG,
} from "./renderers/png/rasterize"
import { encodePostal } from "./_postal"
import type { PostalEncodingOptions } from "./_postal"
import type { BarcodeEncodingOptions } from "./_types"
import type { QRCodeOptions } from "./encoders/qr/types"
import type { MicroQROptions } from "./encoders/qr/micro"
import type { RMQROptions } from "./encoders/rmqr"
import type { HanXinOptions } from "./encoders/hanxin"
import type { MicroPDF417Options } from "./encoders/micropdf417"
import type { MaxiCodeOptions } from "./encoders/maxicode"
import type { BarcodePNGOptions, MatrixPNGOptions, PostalPNGOptions } from "./renderers/png/types"

function uint8ToBase64(data: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!)
  }
  return btoa(binary)
}

function toPNGDataURI(data: Uint8Array): string {
  return `data:image/png;base64,${uint8ToBase64(data)}`
}

/**
 * Generate a barcode as PNG
 */
export function barcodePNG(
  text: string,
  options?: BarcodeEncodingOptions & BarcodePNGOptions,
): Uint8Array {
  const bars = encodeBars(text, options)
  return renderBarcodePNG(bars, options)
}

/**
 * Generate a barcode as PNG data URI
 */
export function barcodePNGDataURI(
  text: string,
  options?: BarcodeEncodingOptions & BarcodePNGOptions,
): string {
  return toPNGDataURI(barcodePNG(text, options))
}

/**
 * Generate a postal barcode as PNG
 */
export function postalPNG(
  text: string,
  options?: PostalEncodingOptions & PostalPNGOptions,
): Uint8Array {
  const bars = encodePostal(text, options)
  return renderPostalPNG(bars, options)
}

/**
 * Generate a postal barcode as PNG data URI
 */
export function postalPNGDataURI(
  text: string,
  options?: PostalEncodingOptions & PostalPNGOptions,
): string {
  return toPNGDataURI(postalPNG(text, options))
}

/**
 * Generate a QR code as PNG
 */
export function qrcodePNG(text: string, options?: QRCodeOptions & MatrixPNGOptions): Uint8Array {
  const matrix = encodeQR(text, options)
  return renderMatrixPNG(matrix, options)
}

/**
 * Generate a QR code as PNG data URI
 */
export function qrcodePNGDataURI(text: string, options?: QRCodeOptions & MatrixPNGOptions): string {
  return toPNGDataURI(qrcodePNG(text, options))
}

/**
 * Generate a Data Matrix as PNG
 */
export function datamatrixPNG(text: string, options?: MatrixPNGOptions): Uint8Array {
  const matrix = encodeDataMatrix(text)
  return renderMatrixPNG(matrix, options)
}

/**
 * Generate a Data Matrix as PNG data URI
 */
export function datamatrixPNGDataURI(text: string, options?: MatrixPNGOptions): string {
  return toPNGDataURI(datamatrixPNG(text, options))
}

/**
 * Generate a GS1 Data Matrix as PNG
 */
export function gs1datamatrixPNG(text: string, options?: MatrixPNGOptions): Uint8Array {
  const matrix = encodeGS1DataMatrix(text)
  return renderMatrixPNG(matrix, options)
}

/**
 * Generate a GS1 Data Matrix as PNG data URI
 */
export function gs1datamatrixPNGDataURI(text: string, options?: MatrixPNGOptions): string {
  return toPNGDataURI(gs1datamatrixPNG(text, options))
}

/**
 * Generate a PDF417 barcode as PNG
 */
export function pdf417PNG(
  text: string,
  options?: { ecLevel?: number; columns?: number; compact?: boolean } & MatrixPNGOptions,
): Uint8Array {
  const { ecLevel, columns, compact, ...pngOpts } = options ?? {}
  const result = encodePDF417(text, { ecLevel, columns, compact })
  return renderMatrixPNG(result.matrix, pngOpts)
}

/**
 * Generate a PDF417 barcode as PNG data URI
 */
export function pdf417PNGDataURI(
  text: string,
  options?: { ecLevel?: number; columns?: number; compact?: boolean } & MatrixPNGOptions,
): string {
  return toPNGDataURI(pdf417PNG(text, options))
}

/**
 * Generate an Aztec Code as PNG
 */
export function aztecPNG(
  text: string,
  options?: { ecPercent?: number; layers?: number; compact?: boolean } & MatrixPNGOptions,
): Uint8Array {
  const { ecPercent, layers, compact, ...pngOpts } = options ?? {}
  const matrix = encodeAztec(text, { ecPercent, layers, compact })
  return renderMatrixPNG(matrix, { margin: 0, ...pngOpts })
}

/**
 * Generate an Aztec Code as PNG data URI
 */
export function aztecPNGDataURI(
  text: string,
  options?: { ecPercent?: number; layers?: number; compact?: boolean } & MatrixPNGOptions,
): string {
  return toPNGDataURI(aztecPNG(text, options))
}

/**
 * Generate a Micro QR Code as PNG
 */
export function microqrPNG(text: string, options?: MicroQROptions & MatrixPNGOptions): Uint8Array {
  const { version, ecLevel, mask, ...pngOpts } = options ?? {}
  return renderMatrixPNG(encodeMicroQR(text, { version, ecLevel, mask }), pngOpts)
}

/**
 * Generate a Micro QR Code as PNG data URI
 */
export function microqrPNGDataURI(
  text: string,
  options?: MicroQROptions & MatrixPNGOptions,
): string {
  return toPNGDataURI(microqrPNG(text, options))
}

/**
 * Generate a Rectangular Micro QR Code (rMQR) as PNG
 */
export function rmqrPNG(text: string, options?: RMQROptions & MatrixPNGOptions): Uint8Array {
  const { version, ecLevel, ...pngOpts } = options ?? {}
  return renderMatrixPNG(encodeRMQR(text, { version, ecLevel }), pngOpts)
}

/**
 * Generate a Rectangular Micro QR Code (rMQR) as PNG data URI
 */
export function rmqrPNGDataURI(text: string, options?: RMQROptions & MatrixPNGOptions): string {
  return toPNGDataURI(rmqrPNG(text, options))
}

/**
 * Generate a Han Xin Code as PNG
 */
export function hanxinPNG(text: string, options?: HanXinOptions & MatrixPNGOptions): Uint8Array {
  const { version, ecLevel, ...pngOpts } = options ?? {}
  return renderMatrixPNG(encodeHanXin(text, { version, ecLevel }), pngOpts)
}

/**
 * Generate a Han Xin Code as PNG data URI
 */
export function hanxinPNGDataURI(text: string, options?: HanXinOptions & MatrixPNGOptions): string {
  return toPNGDataURI(hanxinPNG(text, options))
}

/**
 * Generate a DotCode symbol as PNG
 */
export function dotcodePNG(text: string, options?: MatrixPNGOptions): Uint8Array {
  return renderMatrixPNG(encodeDotCode(text), options)
}

/**
 * Generate a DotCode symbol as PNG data URI
 */
export function dotcodePNGDataURI(text: string, options?: MatrixPNGOptions): string {
  return toPNGDataURI(dotcodePNG(text, options))
}

/**
 * Generate a MicroPDF417 barcode as PNG
 */
export function micropdf417PNG(
  text: string,
  options?: MicroPDF417Options & MatrixPNGOptions,
): Uint8Array {
  const { columns, ...pngOpts } = options ?? {}
  return renderMatrixPNG(encodeMicroPDF417(text, { columns }).matrix, pngOpts)
}

/**
 * Generate a MicroPDF417 barcode as PNG data URI
 */
export function micropdf417PNGDataURI(
  text: string,
  options?: MicroPDF417Options & MatrixPNGOptions,
): string {
  return toPNGDataURI(micropdf417PNG(text, options))
}

/**
 * Generate a Codablock-F stacked barcode as PNG
 */
export function codablockfPNG(
  text: string,
  options?: { columns?: number } & MatrixPNGOptions,
): Uint8Array {
  const { columns, ...pngOpts } = options ?? {}
  return renderMatrixPNG(encodeCodablockF(text, { columns }).matrix, pngOpts)
}

/**
 * Generate a Codablock-F stacked barcode as PNG data URI
 */
export function codablockfPNGDataURI(
  text: string,
  options?: { columns?: number } & MatrixPNGOptions,
): string {
  return toPNGDataURI(codablockfPNG(text, options))
}

/**
 * Generate a Code 16K stacked barcode as PNG
 */
export function code16kPNG(text: string, options?: MatrixPNGOptions): Uint8Array {
  return renderMatrixPNG(encodeCode16K(text).matrix, options)
}

/**
 * Generate a Code 16K stacked barcode as PNG data URI
 */
export function code16kPNGDataURI(text: string, options?: MatrixPNGOptions): string {
  return toPNGDataURI(code16kPNG(text, options))
}

/**
 * Generate a MaxiCode symbol as PNG (hexagonal modules)
 */
export function maxicodePNG(
  text: string,
  options?: MaxiCodeOptions & MatrixPNGOptions,
): Uint8Array {
  const { mode, postalCode, countryCode, serviceClass, ...pngOpts } = options ?? {}
  const matrix = encodeMaxiCode(text, { mode, postalCode, countryCode, serviceClass })
  return renderMaxiCodePNG(matrix, pngOpts)
}

/**
 * Generate a MaxiCode symbol as PNG data URI
 */
export function maxicodePNGDataURI(
  text: string,
  options?: MaxiCodeOptions & MatrixPNGOptions,
): string {
  return toPNGDataURI(maxicodePNG(text, options))
}
