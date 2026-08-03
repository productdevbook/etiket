/**
 * Rasterize barcode bars and 2D matrices to PNG pixel data
 */

import { encodePNG } from "./png-encoder"
import { parseHexColor } from "./types"
import type { BarcodePNGOptions, MatrixPNGOptions, PostalPNGOptions } from "./types"
import type { PostalBar } from "../svg/postal"

/**
 * Raster data result with raw pixel rows
 */
export interface RasterData {
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** Pixel rows — each Uint8Array where 0 = background, 1 = foreground */
  rows: Uint8Array[]
}

/**
 * Rasterize a 1D barcode bar pattern to raw pixel rows
 */
export function renderBarcodeRaster(bars: number[], options: BarcodePNGOptions = {}): RasterData {
  const { scale = 2, height = 80, margin = 10 } = options

  let totalBarWidth = 0
  for (let i = 0; i < bars.length; i++) {
    totalBarWidth += bars[i]! * scale
  }

  const width = totalBarWidth + margin * 2
  const totalHeight = height + margin * 2

  const barRow = new Uint8Array(width)
  let x = margin
  for (let i = 0; i < bars.length; i++) {
    const w = bars[i]! * scale
    if (i % 2 === 0) {
      for (let px = 0; px < w; px++) {
        if (x + px < width) barRow[x + px] = 1
      }
    }
    x += w
  }

  const marginRow = new Uint8Array(width)
  const rows: Uint8Array[] = []
  for (let y = 0; y < margin; y++) rows.push(marginRow)
  for (let y = 0; y < height; y++) rows.push(barRow)
  for (let y = 0; y < margin; y++) rows.push(marginRow)

  return { width, height: totalHeight, rows }
}

/**
 * Render a 1D barcode bar pattern as PNG
 */
export function renderBarcodePNG(bars: number[], options: BarcodePNGOptions = {}): Uint8Array {
  const { color = "#000000", background = "#ffffff" } = options
  const fg = parseHexColor(color)
  const bg = parseHexColor(background)
  const { width, height, rows } = renderBarcodeRaster(bars, options)
  return encodePNG(width, height, rows, fg, bg, false)
}

/**
 * Rasterize a postal barcode (POSTNET/PLANET heights or 4-state bars) to raw
 * pixel rows. Data is carried by each bar's vertical extent, not its width.
 */
export function renderPostalRaster(
  bars: readonly PostalBar[],
  options: PostalPNGOptions = {},
): RasterData {
  const { scale = 2, height = 40, margin = 10, trackerRatio = 1 / 3, shortRatio = 0.4 } = options
  const pitch = options.pitch ?? scale * 2

  const fourState = bars.some((b) => typeof b === "string")
  const symbolWidth = bars.length > 0 ? (bars.length - 1) * pitch + scale : 0
  const width = symbolWidth + margin * 2
  const totalHeight = height + margin * 2

  const rows: Uint8Array[] = []
  for (let y = 0; y < totalHeight; y++) rows.push(new Uint8Array(width))

  const side = (1 - trackerRatio) / 2
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!
    let top: number
    let bottom: number
    if (fourState) {
      // T = centre band, A = centre + up, D = centre + down, F = full height
      top = bar === "A" || bar === "F" ? 0 : side
      bottom = bar === "D" || bar === "F" ? 1 : side + trackerRatio
    } else {
      top = bar ? 0 : 1 - shortRatio
      bottom = 1
    }

    const x0 = margin + i * pitch
    const y0 = margin + Math.round(top * height)
    const y1 = margin + Math.round(bottom * height)
    for (let y = y0; y < y1; y++) {
      const row = rows[y]!
      for (let px = 0; px < scale; px++) {
        if (x0 + px < width) row[x0 + px] = 1
      }
    }
  }

  return { width, height: totalHeight, rows }
}

/**
 * Render a postal barcode as PNG
 */
export function renderPostalPNG(
  bars: readonly PostalBar[],
  options: PostalPNGOptions = {},
): Uint8Array {
  const { color = "#000000", background = "#ffffff" } = options
  const fg = parseHexColor(color)
  const bg = parseHexColor(background)
  const { width, height, rows } = renderPostalRaster(bars, options)
  return encodePNG(width, height, rows, fg, bg, false)
}

/**
 * Rasterize a 2D matrix (QR, DataMatrix, Aztec, PDF417) to raw pixel rows
 */
export function renderMatrixRaster(
  matrix: boolean[][],
  options: MatrixPNGOptions = {},
): RasterData {
  const { moduleSize = 10, margin = 4 } = options

  const matRows = matrix.length
  const matCols = matRows > 0 ? matrix[0]!.length : 0

  const width = (matCols + margin * 2) * moduleSize
  const height = (matRows + margin * 2) * moduleSize

  const marginRow = new Uint8Array(width)
  const rows: Uint8Array[] = []
  const marginPixels = margin * moduleSize
  for (let y = 0; y < marginPixels; y++) rows.push(marginRow)

  for (let r = 0; r < matRows; r++) {
    const row = new Uint8Array(width)
    for (let c = 0; c < matCols; c++) {
      if (matrix[r]![c]) {
        const startX = (margin + c) * moduleSize
        for (let px = 0; px < moduleSize; px++) {
          row[startX + px] = 1
        }
      }
    }
    for (let y = 0; y < moduleSize; y++) rows.push(row)
  }

  for (let y = 0; y < marginPixels; y++) rows.push(marginRow)

  return { width, height, rows }
}

/**
 * Rasterize a MaxiCode 33×30 matrix to raw pixel rows.
 *
 * MaxiCode modules are hexagons on a staggered grid — odd rows are offset by
 * half a module and rows are spaced sqrt(3)/2 apart — so they cannot be drawn
 * by the square-module matrix rasterizer. Each module is filled as a disc,
 * matching the SVG renderer.
 */
export function renderMaxiCodeRaster(
  matrix: boolean[][],
  options: MatrixPNGOptions = {},
): RasterData {
  const { moduleSize = 10, margin = 2 } = options

  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  const pitch = moduleSize
  const rowPitch = pitch * 0.866 // sqrt(3)/2
  const radius = pitch * 0.55 // discs just touch, as in the SVG renderer
  const pad = pitch * margin

  const width = Math.round(cols * pitch + pitch / 2 + pad * 2)
  const height = Math.round(rows * rowPitch + pad * 2)

  const pixels: Uint8Array[] = []
  for (let y = 0; y < height; y++) pixels.push(new Uint8Array(width))

  const r2 = radius * radius
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!matrix[row]![col]) continue
      const xOffset = row % 2 === 1 ? pitch / 2 : 0
      const cx = pad + col * pitch + pitch / 2 + xOffset
      const cy = pad + row * rowPitch + rowPitch / 2

      const minY = Math.max(0, Math.floor(cy - radius))
      const maxY = Math.min(height - 1, Math.ceil(cy + radius))
      const minX = Math.max(0, Math.floor(cx - radius))
      const maxX = Math.min(width - 1, Math.ceil(cx + radius))

      for (let y = minY; y <= maxY; y++) {
        const dy = y + 0.5 - cy
        const pixelRow = pixels[y]!
        for (let x = minX; x <= maxX; x++) {
          const dx = x + 0.5 - cx
          if (dx * dx + dy * dy <= r2) pixelRow[x] = 1
        }
      }
    }
  }

  return { width, height, rows: pixels }
}

/**
 * Render a MaxiCode symbol as PNG
 */
export function renderMaxiCodePNG(matrix: boolean[][], options: MatrixPNGOptions = {}): Uint8Array {
  const { color = "#000000", background = "#ffffff" } = options
  const fg = parseHexColor(color)
  const bg = parseHexColor(background)
  const { width, height, rows } = renderMaxiCodeRaster(matrix, options)
  return encodePNG(width, height, rows, fg, bg, true)
}

/**
 * Render a 2D matrix (QR, DataMatrix, Aztec, PDF417) as PNG
 */
export function renderMatrixPNG(matrix: boolean[][], options: MatrixPNGOptions = {}): Uint8Array {
  const { color = "#000000", background = "#ffffff" } = options
  const fg = parseHexColor(color)
  const bg = parseHexColor(background)
  const { width, height, rows } = renderMatrixRaster(matrix, options)
  return encodePNG(width, height, rows, fg, bg, true)
}
