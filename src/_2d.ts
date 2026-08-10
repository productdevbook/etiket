/**
 * 2D barcode generation (Data Matrix, PDF417, Aztec, and the stacked,
 * polychrome and compact 2D symbologies)
 */

import { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index"
import { encodePDF417 } from "./encoders/pdf417/index"
import { encodeMicroPDF417 } from "./encoders/micropdf417"
import { encodeAztec, encodeAztecRune } from "./encoders/aztec/index"
import { encodeMailmark } from "./encoders/mailmark"
import type { MailmarkOptions } from "./encoders/mailmark"
import { encodeMicroQR } from "./encoders/qr/micro"
import { encodeRMQR } from "./encoders/rmqr"
import { encodeMaxiCode } from "./encoders/maxicode"
import { encodeDotCode } from "./encoders/dotcode"
import type { DotCodeOptions } from "./encoders/dotcode"
import { encodeHanXin } from "./encoders/hanxin"
import { encodeCodablockF } from "./encoders/codablock-f"
import { encodeCode16K } from "./encoders/code16k"
import { encodeJABCode } from "./encoders/jabcode"
import { encodeGS1CompositeSymbol } from "./encoders/gs1-composite"
import type { CompositeLinearType, GS1CompositeOptions } from "./encoders/gs1-composite"
import {
  encodeGS1DataBarStacked,
  encodeGS1DataBarStackedOmni,
  encodeGS1DataBarExpandedStacked,
} from "./encoders/gs1-databar"
import { renderMatrixSVG, renderMaxiCodeSVG } from "./renderers/svg/matrix"
import { renderColorMatrixSVG } from "./renderers/svg/color-matrix"
import type { MatrixSVGOptions } from "./renderers/svg/matrix"
import type { ColorMatrixSVGOptions } from "./renderers/svg/color-matrix"
import type { MicroQROptions } from "./encoders/qr/micro"
import type { RMQROptions } from "./encoders/rmqr"
import type { MaxiCodeOptions } from "./encoders/maxicode"
import type { HanXinOptions } from "./encoders/hanxin"
import type { MicroPDF417Options } from "./encoders/micropdf417"
import type { PDF417Options } from "./encoders/pdf417/index"
import type { AztecOptions } from "./encoders/aztec/index"
import type { JABCodeOptions } from "./encoders/jabcode"
import type { DataMatrixSizeOptions } from "./encoders/datamatrix/tables"
import type { DataMatrixEncodeOptions } from "./encoders/datamatrix/encoder"

/**
 * Generate a Data Matrix as SVG string
 */
export function datamatrix(
  text: string,
  options?: DataMatrixSizeOptions & DataMatrixEncodeOptions & MatrixSVGOptions,
): string {
  const { shape, dmre, symbolSize, eci, ...svgOpts } = options ?? {}
  const matrix = encodeDataMatrix(text, { shape, dmre, symbolSize, eci })
  return renderMatrixSVG(matrix, svgOpts)
}

/**
 * Generate a GS1 DataMatrix as SVG string
 */
export function gs1datamatrix(
  text: string,
  options?: DataMatrixSizeOptions & MatrixSVGOptions,
): string {
  const { shape, dmre, symbolSize, ...svgOpts } = options ?? {}
  const matrix = encodeGS1DataMatrix(text, { shape, dmre, symbolSize })
  return renderMatrixSVG(matrix, svgOpts)
}

/** Options accepted by {@link pdf417} */
export interface PDF417SVGOptions extends PDF417Options, MatrixSVGOptions {
  /** Overall symbol width in pixels; defaults to 400 */
  width?: number
  /** Overall symbol height in pixels */
  height?: number
}

/**
 * Generate a PDF417 barcode as SVG string
 */
export function pdf417(text: string, options?: PDF417SVGOptions): string {
  const { ecLevel, columns, compact, eci, ...svgOpts } = options ?? {}
  const result = encodePDF417(text, { ecLevel, columns, compact, eci })
  return renderMatrixSVG(result.matrix, { size: svgOpts.width ?? 400, ...svgOpts })
}

/**
 * Generate an Aztec Code as SVG string
 */
export function aztec(text: string, options?: AztecOptions & MatrixSVGOptions): string {
  const { ecPercent, layers, compact, eci, ...svgOpts } = options ?? {}
  const matrix = encodeAztec(text, { ecPercent, layers, compact, eci })
  return renderMatrixSVG(matrix, { margin: 0, ...svgOpts })
}

/**
 * Generate an Aztec Rune — a value of 0 to 255 in an 11x11 symbol — as SVG.
 *
 * @example
 * ```ts
 * const svg = aztecrune(42)
 * ```
 */
export function aztecrune(value: number, options: MatrixSVGOptions = {}): string {
  return renderMatrixSVG(encodeAztecRune(value), { margin: 0, ...options })
}

/**
 * Generate a Royal Mail Mailmark 2D barcode as SVG.
 *
 * @example
 * ```ts
 * const svg = mailmark("JGB 012100123456789AB19XY1A 0            ", { type: 9 })
 * ```
 */
export function mailmark(text: string, options: MailmarkOptions & MatrixSVGOptions = {}): string {
  const { type, ...svgOpts } = options
  return renderMatrixSVG(encodeMailmark(text, { type }), svgOpts)
}

/**
 * Generate a Micro QR Code (M1–M4) as SVG string
 */
export function microqr(text: string, options: MicroQROptions & MatrixSVGOptions = {}): string {
  const { version, ecLevel, mask, ...svgOpts } = options
  const matrix = encodeMicroQR(text, { version, ecLevel, mask })
  return renderMatrixSVG(matrix, svgOpts)
}

/**
 * Generate a Rectangular Micro QR Code (rMQR) as SVG string
 */
export function rmqr(text: string, options: RMQROptions & MatrixSVGOptions = {}): string {
  const { version, ecLevel, ...svgOpts } = options
  const matrix = encodeRMQR(text, { version, ecLevel })
  return renderMatrixSVG(matrix, svgOpts)
}

/**
 * Generate a MaxiCode symbol as SVG string.
 *
 * MaxiCode uses hexagonal modules around a bullseye finder, so it is rendered
 * with the dedicated hexagonal renderer rather than the square matrix one.
 */
export function maxicode(text: string, options: MaxiCodeOptions & MatrixSVGOptions = {}): string {
  const { mode, postalCode, countryCode, serviceClass, ...svgOpts } = options
  const matrix = encodeMaxiCode(text, { mode, postalCode, countryCode, serviceClass })
  return renderMaxiCodeSVG(matrix, svgOpts)
}

/**
 * Generate a DotCode symbol as SVG string
 */
export function dotcode(text: string, options: DotCodeOptions & MatrixSVGOptions = {}): string {
  const { rows, columns, mask, ...svgOpts } = options
  return renderMatrixSVG(encodeDotCode(text, { rows, columns, mask }), svgOpts)
}

/**
 * Generate a Han Xin Code as SVG string
 */
export function hanxin(text: string, options: HanXinOptions & MatrixSVGOptions = {}): string {
  const { version, ecLevel, ...svgOpts } = options
  const matrix = encodeHanXin(text, { version, ecLevel })
  return renderMatrixSVG(matrix, svgOpts)
}

/**
 * Generate a MicroPDF417 barcode as SVG string.
 *
 * Rows default to 2× the module width, matching the stacked-symbology aspect
 * ratio recommended by the specification.
 */
export function micropdf417(
  text: string,
  options: MicroPDF417Options & MatrixSVGOptions = {},
): string {
  const { columns, ...svgOpts } = options
  const result = encodeMicroPDF417(text, { columns })
  return renderMatrixSVG(result.matrix, { rowHeight: 2, ...svgOpts })
}

/** Options accepted by {@link codablockf} */
export interface CodablockFSVGOptions extends MatrixSVGOptions {
  /** Number of data columns per row */
  columns?: number
}

/**
 * Generate a Codablock-F stacked barcode as SVG string
 */
export function codablockf(text: string, options: CodablockFSVGOptions = {}): string {
  const { columns, ...svgOpts } = options
  const result = encodeCodablockF(text, { columns })
  return renderMatrixSVG(result.matrix, {
    rowHeight: 8,
    ...svgOpts,
    rowHeights: stackedRowHeights(result, svgOpts.rowHeight ?? 8),
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
 * Generate a Code 16K stacked barcode as SVG string
 */
export function code16k(text: string, options: MatrixSVGOptions = {}): string {
  const result = encodeCode16K(text)
  return renderMatrixSVG(result.matrix, {
    rowHeight: 8,
    ...options,
    rowHeights: stackedRowHeights(result, options.rowHeight ?? 8),
  })
}

/**
 * Generate a complete GS1 Composite symbol as SVG — the 2D component, the
 * separator pattern and the linear component with its linkage flag set.
 *
 * @param linearType - The primary symbology carrying the item identifier
 * @param data - `"<linear data>|<composite data>"`
 *
 * @example
 * ```ts
 * const svg = gs1composite("databar-omni", "0101234567890128|(17)260101(10)LOT42")
 * ```
 */
export function gs1composite(
  linearType: CompositeLinearType,
  data: string,
  options: GS1CompositeOptions & MatrixSVGOptions = {},
): string {
  const { type, columns, linear, linearWidth, ...svgOpts } = options
  const result = encodeGS1CompositeSymbol(linearType, data, {
    type,
    columns,
    linear,
    linearWidth,
  })
  return renderMatrixSVG(result.matrix, { ...svgOpts, rowHeights: result.rowHeights })
}

/**
 * Generate a GS1 DataBar Stacked symbol as SVG string.
 *
 * The stacked DataBar variants return a full module matrix, so they render at
 * the default square module height rather than a stacked row height.
 */
export function gs1databarStacked(text: string, options: MatrixSVGOptions = {}): string {
  return renderMatrixSVG(encodeGS1DataBarStacked(text), options)
}

/**
 * Generate a GS1 DataBar Stacked Omnidirectional symbol as SVG string
 */
export function gs1databarStackedOmni(text: string, options: MatrixSVGOptions = {}): string {
  return renderMatrixSVG(encodeGS1DataBarStackedOmni(text), options)
}

/**
 * Generate a GS1 DataBar Expanded Stacked symbol as SVG string
 */
export function gs1databarExpandedStacked(
  text: string,
  options: { segments?: number } & MatrixSVGOptions = {},
): string {
  const { segments, ...svgOpts } = options
  return renderMatrixSVG(encodeGS1DataBarExpandedStacked(text, { segments }), svgOpts)
}

/**
 * Generate a JAB Code (polychrome 2D symbol) as SVG string
 *
 * @experimental Not ISO/IEC 23634 conformant and unverifiable — see
 * {@link encodeJABCode}.
 */
export function jabcode(
  text: string,
  options: JABCodeOptions & ColorMatrixSVGOptions = {},
): string {
  const { colors, ecPercent, ...svgOpts } = options
  const result = encodeJABCode(text, { colors, ecPercent })
  return renderColorMatrixSVG(result.matrix, result.palette, svgOpts)
}
