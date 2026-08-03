/**
 * 2D barcode generation (Data Matrix, PDF417, Aztec, and the stacked,
 * polychrome and compact 2D symbologies)
 */

import { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index";
import { encodePDF417 } from "./encoders/pdf417/index";
import { encodeMicroPDF417 } from "./encoders/micropdf417";
import { encodeAztec } from "./encoders/aztec/index";
import { encodeMicroQR } from "./encoders/qr/micro";
import { encodeRMQR } from "./encoders/rmqr";
import { encodeMaxiCode } from "./encoders/maxicode";
import { encodeDotCode } from "./encoders/dotcode";
import { encodeHanXin } from "./encoders/hanxin";
import { encodeCodablockF } from "./encoders/codablock-f";
import { encodeCode16K } from "./encoders/code16k";
import { encodeJABCode } from "./encoders/jabcode";
import { renderMatrixSVG, renderMaxiCodeSVG } from "./renderers/svg/matrix";
import { renderColorMatrixSVG } from "./renderers/svg/color-matrix";
import type { MatrixSVGOptions } from "./renderers/svg/matrix";
import type { ColorMatrixSVGOptions } from "./renderers/svg/color-matrix";
import type { MicroQROptions } from "./encoders/qr/micro";
import type { RMQROptions } from "./encoders/rmqr";
import type { MaxiCodeOptions } from "./encoders/maxicode";
import type { HanXinOptions } from "./encoders/hanxin";
import type { MicroPDF417Options } from "./encoders/micropdf417";

/**
 * Generate a Data Matrix as SVG string
 */
export function datamatrix(text: string, options?: MatrixSVGOptions): string {
  const matrix = encodeDataMatrix(text);
  return renderMatrixSVG(matrix, options);
}

/**
 * Generate a GS1 DataMatrix as SVG string
 */
export function gs1datamatrix(text: string, options?: MatrixSVGOptions): string {
  const matrix = encodeGS1DataMatrix(text);
  return renderMatrixSVG(matrix, options);
}

/**
 * Generate a PDF417 barcode as SVG string
 */
export function pdf417(
  text: string,
  options?: {
    ecLevel?: number;
    columns?: number;
    compact?: boolean;
    width?: number;
    height?: number;
  } & MatrixSVGOptions,
): string {
  const { ecLevel, columns, compact, ...svgOpts } = options ?? {};
  const result = encodePDF417(text, { ecLevel, columns, compact });
  return renderMatrixSVG(result.matrix, { size: svgOpts.width ?? 400, ...svgOpts });
}

/**
 * Generate an Aztec Code as SVG string
 */
export function aztec(
  text: string,
  options?: {
    ecPercent?: number;
    layers?: number;
    compact?: boolean;
  } & MatrixSVGOptions,
): string {
  const { ecPercent, layers, compact, ...svgOpts } = options ?? {};
  const matrix = encodeAztec(text, { ecPercent, layers, compact });
  return renderMatrixSVG(matrix, { margin: 0, ...svgOpts });
}

/**
 * Generate a Micro QR Code (M1–M4) as SVG string
 */
export function microqr(text: string, options: MicroQROptions & MatrixSVGOptions = {}): string {
  const { version, ecLevel, mask, ...svgOpts } = options;
  const matrix = encodeMicroQR(text, { version, ecLevel, mask });
  return renderMatrixSVG(matrix, svgOpts);
}

/**
 * Generate a Rectangular Micro QR Code (rMQR) as SVG string
 */
export function rmqr(text: string, options: RMQROptions & MatrixSVGOptions = {}): string {
  const { version, ecLevel, ...svgOpts } = options;
  const matrix = encodeRMQR(text, { version, ecLevel });
  return renderMatrixSVG(matrix, svgOpts);
}

/**
 * Generate a MaxiCode symbol as SVG string.
 *
 * MaxiCode uses hexagonal modules around a bullseye finder, so it is rendered
 * with the dedicated hexagonal renderer rather than the square matrix one.
 */
export function maxicode(text: string, options: MaxiCodeOptions & MatrixSVGOptions = {}): string {
  const { mode, postalCode, countryCode, serviceClass, ...svgOpts } = options;
  const matrix = encodeMaxiCode(text, { mode, postalCode, countryCode, serviceClass });
  return renderMaxiCodeSVG(matrix, svgOpts);
}

/**
 * Generate a DotCode symbol as SVG string
 */
export function dotcode(text: string, options: MatrixSVGOptions = {}): string {
  return renderMatrixSVG(encodeDotCode(text), options);
}

/**
 * Generate a Han Xin Code as SVG string
 */
export function hanxin(text: string, options: HanXinOptions & MatrixSVGOptions = {}): string {
  const { version, ecLevel, ...svgOpts } = options;
  const matrix = encodeHanXin(text, { version, ecLevel });
  return renderMatrixSVG(matrix, svgOpts);
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
  const { columns, ...svgOpts } = options;
  const result = encodeMicroPDF417(text, { columns });
  return renderMatrixSVG(result.matrix, { rowHeight: 2, ...svgOpts });
}

/**
 * Generate a Codablock-F stacked barcode as SVG string
 */
export function codablockf(
  text: string,
  options: { columns?: number } & MatrixSVGOptions = {},
): string {
  const { columns, ...svgOpts } = options;
  const result = encodeCodablockF(text, { columns });
  return renderMatrixSVG(result.matrix, { rowHeight: 8, ...svgOpts });
}

/**
 * Generate a Code 16K stacked barcode as SVG string
 */
export function code16k(text: string, options: MatrixSVGOptions = {}): string {
  const result = encodeCode16K(text);
  return renderMatrixSVG(result.matrix, { rowHeight: 8, ...options });
}

/**
 * Generate a JAB Code (polychrome 2D symbol) as SVG string
 */
export function jabcode(
  text: string,
  options: { colors?: 4 | 8; ecPercent?: number } & ColorMatrixSVGOptions = {},
): string {
  const { colors, ecPercent, ...svgOpts } = options;
  const result = encodeJABCode(text, { colors, ecPercent });
  return renderColorMatrixSVG(result.matrix, result.palette, svgOpts);
}
