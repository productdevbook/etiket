/**
 * Rasterize barcode bars and 2D matrices to PNG pixel data
 */

import { encodePNG } from "./png-encoder";
import { parseHexColor } from "./types";
import type { BarcodePNGOptions, MatrixPNGOptions } from "./types";

/**
 * Raster data result with raw pixel rows
 */
export interface RasterData {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Pixel rows — each Uint8Array where 0 = background, 1 = foreground */
  rows: Uint8Array[];
}

/**
 * Rasterize a 1D barcode bar pattern to raw pixel rows
 */
export function renderBarcodeRaster(bars: number[], options: BarcodePNGOptions = {}): RasterData {
  const { scale = 2, height = 80, margin = 10 } = options;

  let totalBarWidth = 0;
  for (let i = 0; i < bars.length; i++) {
    totalBarWidth += bars[i]! * scale;
  }

  const width = totalBarWidth + margin * 2;
  const totalHeight = height + margin * 2;

  const barRow = new Uint8Array(width);
  let x = margin;
  for (let i = 0; i < bars.length; i++) {
    const w = bars[i]! * scale;
    if (i % 2 === 0) {
      for (let px = 0; px < w; px++) {
        if (x + px < width) barRow[x + px] = 1;
      }
    }
    x += w;
  }

  const marginRow = new Uint8Array(width);
  const rows: Uint8Array[] = [];
  for (let y = 0; y < margin; y++) rows.push(marginRow);
  for (let y = 0; y < height; y++) rows.push(barRow);
  for (let y = 0; y < margin; y++) rows.push(marginRow);

  return { width, height: totalHeight, rows };
}

/**
 * Render a 1D barcode bar pattern as PNG
 */
export function renderBarcodePNG(bars: number[], options: BarcodePNGOptions = {}): Uint8Array {
  const { color = "#000000", background = "#ffffff" } = options;
  const fg = parseHexColor(color);
  const bg = parseHexColor(background);
  const { width, height, rows } = renderBarcodeRaster(bars, options);
  return encodePNG(width, height, rows, fg, bg, false);
}

/**
 * Rasterize a 2D matrix (QR, DataMatrix, Aztec, PDF417) to raw pixel rows
 */
export function renderMatrixRaster(
  matrix: boolean[][],
  options: MatrixPNGOptions = {},
): RasterData {
  const { moduleSize = 10, margin = 4 } = options;

  const matRows = matrix.length;
  const matCols = matRows > 0 ? matrix[0]!.length : 0;

  const width = (matCols + margin * 2) * moduleSize;
  const height = (matRows + margin * 2) * moduleSize;

  const marginRow = new Uint8Array(width);
  const rows: Uint8Array[] = [];
  const marginPixels = margin * moduleSize;
  for (let y = 0; y < marginPixels; y++) rows.push(marginRow);

  for (let r = 0; r < matRows; r++) {
    const row = new Uint8Array(width);
    for (let c = 0; c < matCols; c++) {
      if (matrix[r]![c]) {
        const startX = (margin + c) * moduleSize;
        for (let px = 0; px < moduleSize; px++) {
          row[startX + px] = 1;
        }
      }
    }
    for (let y = 0; y < moduleSize; y++) rows.push(row);
  }

  for (let y = 0; y < marginPixels; y++) rows.push(marginRow);

  return { width, height, rows };
}

/**
 * Render a 2D matrix (QR, DataMatrix, Aztec, PDF417) as PNG
 */
export function renderMatrixPNG(matrix: boolean[][], options: MatrixPNGOptions = {}): Uint8Array {
  const { color = "#000000", background = "#ffffff" } = options;
  const fg = parseHexColor(color);
  const bg = parseHexColor(background);
  const { width, height, rows } = renderMatrixRaster(matrix, options);
  return encodePNG(width, height, rows, fg, bg, true);
}
