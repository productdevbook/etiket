/**
 * 2D barcode generation (Data Matrix, PDF417, Aztec)
 */

import { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index";
import { encodePDF417 } from "./encoders/pdf417/index";
import { encodeAztec } from "./encoders/aztec/index";
import { renderMatrixSVG } from "./renderers/svg/matrix";

/**
 * Generate a Data Matrix as SVG string
 */
export function datamatrix(
  text: string,
  options?: { size?: number; color?: string; background?: string; margin?: number },
): string {
  const matrix = encodeDataMatrix(text);
  return renderMatrixSVG(matrix, options);
}

/**
 * Generate a GS1 DataMatrix as SVG string
 */
export function gs1datamatrix(
  text: string,
  options?: { size?: number; color?: string; background?: string; margin?: number },
): string {
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
    color?: string;
    background?: string;
  },
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
    size?: number;
    color?: string;
    background?: string;
    margin?: number;
  },
): string {
  const { ecPercent, layers, compact, ...svgOpts } = options ?? {};
  const matrix = encodeAztec(text, { ecPercent, layers, compact });
  return renderMatrixSVG(matrix, { margin: 0, ...svgOpts });
}
