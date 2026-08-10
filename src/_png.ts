/**
 * PNG output for barcodes and 2D codes
 */

import { encodeBars } from "./_barcode"
import { encodeQR } from "./encoders/qr/index"
import { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index"
import type { DataMatrixSizeOptions } from "./encoders/datamatrix/tables"
import type { DataMatrixEncodeOptions } from "./encoders/datamatrix/encoder"
import type { PDF417Options } from "./encoders/pdf417/index"
import type { AztecOptions } from "./encoders/aztec/index"
import { encodePDF417 } from "./encoders/pdf417/index"
import { encodeAztec, encodeAztecRune } from "./encoders/aztec/index"
import { encodeMicroQR } from "./encoders/qr/micro"
import { encodeRMQR } from "./encoders/rmqr"
import { encodeHanXin } from "./encoders/hanxin"
import { encodeDotCode } from "./encoders/dotcode"
import type { DotCodeOptions } from "./encoders/dotcode"
import { encodeMicroPDF417 } from "./encoders/micropdf417"
import { encodeCodablockF } from "./encoders/codablock-f"
import { encodeCode16K } from "./encoders/code16k"
import {
  encodeGS1DataBarStacked,
  encodeGS1DataBarStackedOmni,
  encodeGS1DataBarExpandedStacked,
} from "./encoders/gs1-databar"
import { encodeMaxiCode } from "./encoders/maxicode"
import { encodeJABCode } from "./encoders/jabcode"
import { encodeGS1CompositeSymbol } from "./encoders/gs1-composite"
import type { CompositeLinearType, GS1CompositeOptions } from "./encoders/gs1-composite"
import {
  renderBarcodePNG,
  renderColorMatrixPNG,
  renderMatrixPNG,
  renderPostalPNG,
  renderMaxiCodePNG,
} from "./renderers/png/rasterize"
import { encodePostal } from "./_postal"
import type { ColorMatrixPNGOptions } from "./renderers/png/types"
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
export function datamatrixPNG(
  text: string,
  options?: DataMatrixSizeOptions & DataMatrixEncodeOptions & MatrixPNGOptions,
): Uint8Array {
  const { shape, dmre, symbolSize, eci, ...pngOpts } = options ?? {}
  const matrix = encodeDataMatrix(text, { shape, dmre, symbolSize, eci })
  return renderMatrixPNG(matrix, pngOpts)
}

/**
 * Generate a Data Matrix as PNG data URI
 */
export function datamatrixPNGDataURI(
  text: string,
  options?: DataMatrixSizeOptions & DataMatrixEncodeOptions & MatrixPNGOptions,
): string {
  return toPNGDataURI(datamatrixPNG(text, options))
}

/**
 * Generate a GS1 Data Matrix as PNG
 */
export function gs1datamatrixPNG(
  text: string,
  options?: DataMatrixSizeOptions & MatrixPNGOptions,
): Uint8Array {
  const { shape, dmre, symbolSize, ...pngOpts } = options ?? {}
  const matrix = encodeGS1DataMatrix(text, { shape, dmre, symbolSize })
  return renderMatrixPNG(matrix, pngOpts)
}

/**
 * Generate a GS1 Data Matrix as PNG data URI
 */
export function gs1datamatrixPNGDataURI(
  text: string,
  options?: DataMatrixSizeOptions & MatrixPNGOptions,
): string {
  return toPNGDataURI(gs1datamatrixPNG(text, options))
}

/**
 * Generate a PDF417 barcode as PNG
 */
export function pdf417PNG(text: string, options?: PDF417Options & MatrixPNGOptions): Uint8Array {
  const { ecLevel, columns, compact, eci, ...pngOpts } = options ?? {}
  const result = encodePDF417(text, { ecLevel, columns, compact, eci })
  return renderMatrixPNG(result.matrix, pngOpts)
}

/**
 * Generate a PDF417 barcode as PNG data URI
 */
export function pdf417PNGDataURI(text: string, options?: PDF417Options & MatrixPNGOptions): string {
  return toPNGDataURI(pdf417PNG(text, options))
}

/**
 * Generate an Aztec Code as PNG
 */
export function aztecPNG(text: string, options?: AztecOptions & MatrixPNGOptions): Uint8Array {
  const { ecPercent, layers, compact, eci, ...pngOpts } = options ?? {}
  const matrix = encodeAztec(text, { ecPercent, layers, compact, eci })
  return renderMatrixPNG(matrix, { margin: 0, ...pngOpts })
}

/**
 * Generate an Aztec Code as PNG data URI
 */
export function aztecPNGDataURI(text: string, options?: AztecOptions & MatrixPNGOptions): string {
  return toPNGDataURI(aztecPNG(text, options))
}

/**
 * Generate an Aztec Rune as PNG
 */
export function aztecrunePNG(value: number, options?: MatrixPNGOptions): Uint8Array {
  return renderMatrixPNG(encodeAztecRune(value), { margin: 0, ...options })
}

/**
 * Generate an Aztec Rune as PNG data URI
 */
export function aztecrunePNGDataURI(value: number, options?: MatrixPNGOptions): string {
  return toPNGDataURI(aztecrunePNG(value, options))
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
export function dotcodePNG(text: string, options?: DotCodeOptions & MatrixPNGOptions): Uint8Array {
  const { rows, columns, mask, ...pngOpts } = options ?? {}
  return renderMatrixPNG(encodeDotCode(text, { rows, columns, mask }), pngOpts)
}

/**
 * Generate a DotCode symbol as PNG data URI
 */
export function dotcodePNGDataURI(
  text: string,
  options?: DotCodeOptions & MatrixPNGOptions,
): string {
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
  const result = encodeCodablockF(text, { columns })
  return renderMatrixPNG(result.matrix, {
    rowHeight: 8,
    ...pngOpts,
    rowHeights: stackedRowHeights(result, pngOpts.rowHeight ?? 8),
  })
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
  const result = encodeCode16K(text)
  return renderMatrixPNG(result.matrix, {
    rowHeight: 8,
    ...options,
    rowHeights: stackedRowHeights(result, options?.rowHeight ?? 8),
  })
}

/**
 * Row heights for a stacked symbology: data rows at the requested height, the
 * separator rows at the single module the specification gives them.
 */
function stackedRowHeights(
  result: { matrix: boolean[][]; separatorRows: number[] },
  rowHeight: number,
): number[] {
  const separators = new Set(result.separatorRows)
  return result.matrix.map((_, index) => (separators.has(index) ? 1 : rowHeight))
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

/**
 * Generate a GS1 DataBar Stacked symbol as PNG.
 *
 * The stacked DataBar variants return a full module matrix, so they rasterize
 * at the default square module height.
 */
export function gs1databarStackedPNG(text: string, options?: MatrixPNGOptions): Uint8Array {
  return renderMatrixPNG(encodeGS1DataBarStacked(text), options)
}

/** Generate a GS1 DataBar Stacked symbol as PNG data URI */
export function gs1databarStackedPNGDataURI(text: string, options?: MatrixPNGOptions): string {
  return toPNGDataURI(gs1databarStackedPNG(text, options))
}

/** Generate a GS1 DataBar Stacked Omnidirectional symbol as PNG */
export function gs1databarStackedOmniPNG(text: string, options?: MatrixPNGOptions): Uint8Array {
  return renderMatrixPNG(encodeGS1DataBarStackedOmni(text), options)
}

/** Generate a GS1 DataBar Stacked Omnidirectional symbol as PNG data URI */
export function gs1databarStackedOmniPNGDataURI(text: string, options?: MatrixPNGOptions): string {
  return toPNGDataURI(gs1databarStackedOmniPNG(text, options))
}

/** Generate a GS1 DataBar Expanded Stacked symbol as PNG */
export function gs1databarExpandedStackedPNG(
  text: string,
  options?: { segments?: number } & MatrixPNGOptions,
): Uint8Array {
  const { segments, ...pngOpts } = options ?? {}
  return renderMatrixPNG(encodeGS1DataBarExpandedStacked(text, { segments }), pngOpts)
}

/** Generate a GS1 DataBar Expanded Stacked symbol as PNG data URI */
export function gs1databarExpandedStackedPNGDataURI(
  text: string,
  options?: { segments?: number } & MatrixPNGOptions,
): string {
  return toPNGDataURI(gs1databarExpandedStackedPNG(text, options))
}

/**
 * Generate a JAB Code as PNG.
 *
 * JAB Code is polychrome, so it goes through the true-colour PNG path rather
 * than the two-colour one every other symbology uses.
 *
 * @experimental JAB Code output is not ISO/IEC 23634 conformant — see the
 * caveat on {@link jabcode}.
 */
export function jabcodePNG(
  text: string,
  options?: { colors?: 4 | 8; ecPercent?: number } & ColorMatrixPNGOptions,
): Uint8Array {
  const { colors, ecPercent, ...pngOpts } = options ?? {}
  const result = encodeJABCode(text, { colors, ecPercent })
  return renderColorMatrixPNG(result.matrix, result.palette, pngOpts)
}

/**
 * Generate a JAB Code as PNG data URI
 *
 * @experimental See {@link jabcodePNG}.
 */
export function jabcodePNGDataURI(
  text: string,
  options?: { colors?: 4 | 8; ecPercent?: number } & ColorMatrixPNGOptions,
): string {
  return toPNGDataURI(jabcodePNG(text, options))
}

/**
 * Generate a complete GS1 Composite symbol as PNG.
 *
 * @param linearType - The primary symbology carrying the item identifier
 * @param data - `"<linear data>|<composite data>"`
 */
export function gs1compositePNG(
  linearType: CompositeLinearType,
  data: string,
  options?: GS1CompositeOptions & MatrixPNGOptions,
): Uint8Array {
  const { type, columns, linear, linearWidth, ...pngOpts } = options ?? {}
  const result = encodeGS1CompositeSymbol(linearType, data, {
    type,
    columns,
    linear,
    linearWidth,
  })
  return renderMatrixPNG(result.matrix, { ...pngOpts, rowHeights: result.rowHeights })
}

/** Generate a complete GS1 Composite symbol as a PNG data URI */
export function gs1compositePNGDataURI(
  linearType: CompositeLinearType,
  data: string,
  options?: GS1CompositeOptions & MatrixPNGOptions,
): string {
  return toPNGDataURI(gs1compositePNG(linearType, data, options))
}
