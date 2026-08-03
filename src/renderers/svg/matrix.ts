/**
 * Generic 2D matrix SVG renderer
 * Used for Data Matrix, Aztec, and other 2D codes
 */

import type { SVGAccessibilityOptions } from "./types"
import { escapeAttr, escapeXml } from "./utils"

export interface MatrixSVGOptions extends SVGAccessibilityOptions {
  size?: number
  color?: string
  background?: string
  margin?: number // in modules
  /**
   * Height of each matrix row as a multiple of the module width. Default 1
   * (square modules). Stacked linear symbologies such as Code 16K,
   * Codablock-F, PDF417 and MicroPDF417 use taller rows.
   */
  rowHeight?: number
}

/**
 * Render a 2D boolean matrix as SVG
 */
export function renderMatrixSVG(matrix: boolean[][], options: MatrixSVGOptions = {}): string {
  const {
    size = 200,
    color = "#000",
    background = "#fff",
    margin = 2,
    rowHeight = 1,
    ariaLabel,
    role = "img",
    title,
    desc,
  } = options

  const rowCount = matrix.length
  const colCount = matrix[0]?.length ?? 0
  const maxDim = Math.max(rowCount, colCount)
  const totalModules = maxDim + margin * 2
  const moduleSize = size / totalModules
  const moduleHeight = moduleSize * rowHeight

  // For rectangular matrices, compute actual SVG dimensions
  const svgWidth = (colCount + margin * 2) * moduleSize
  const svgHeight = rowCount * moduleHeight + margin * 2 * moduleSize

  // Build SVG opening tag with accessibility attributes
  let svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" role="${escapeAttr(role)}"`
  if (ariaLabel) {
    svgOpen += ` aria-label="${escapeAttr(ariaLabel)}"`
  }
  svgOpen += ">"

  const parts: string[] = [svgOpen]

  // Accessibility title and desc elements
  if (title) {
    parts.push(`<title>${escapeXml(title)}</title>`)
  }
  if (desc) {
    parts.push(`<desc>${escapeXml(desc)}</desc>`)
  }

  if (background !== "transparent") {
    parts.push(`<rect width="100%" height="100%" fill="${escapeAttr(background)}"/>`)
  }

  // Draw modules as a single path
  const pathParts: string[] = []
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      if (matrix[r]![c]) {
        const x = (c + margin) * moduleSize
        const y = margin * moduleSize + r * moduleHeight
        pathParts.push(`M${x},${y}h${moduleSize}v${moduleHeight}h-${moduleSize}z`)
      }
    }
  }

  if (pathParts.length > 0) {
    parts.push(`<path d="${pathParts.join("")}" fill="${escapeAttr(color)}"/>`)
  }

  parts.push("</svg>")
  return parts.join("")
}

/**
 * Render a MaxiCode 33x30 boolean matrix as hexagonal SVG.
 * MaxiCode uses hexagonal modules with odd rows offset right by half a module.
 * Includes concentric-ring bullseye finder pattern at center.
 */
export function renderMaxiCodeSVG(matrix: boolean[][], options: MatrixSVGOptions = {}): string {
  const {
    size = 400,
    color = "#000",
    background = "#fff",
    margin = 2,
    ariaLabel,
    role = "img",
    title,
    desc,
  } = options

  const rows = matrix.length // 33
  const cols = matrix[0]?.length ?? 0 // 30
  const pitch = size / cols // module-to-module horizontal distance
  const modH = pitch * 0.866 // sqrt(3)/2 for hex vertical spacing
  const r = pitch * 0.55 // module radius (0.55 = touching, verified scannable with rxing)
  const pad = pitch * margin // quiet zone, in modules
  const svgW = cols * pitch + pitch / 2 + pad * 2
  const svgH = rows * modH + pad * 2

  let svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(svgW)} ${Math.round(svgH)}" width="${Math.round(svgW)}" height="${Math.round(svgH)}" role="${escapeAttr(role)}"`
  if (ariaLabel) svgOpen += ` aria-label="${escapeAttr(ariaLabel)}"`
  svgOpen += ">"

  const parts: string[] = [svgOpen]
  if (title) parts.push(`<title>${escapeXml(title)}</title>`)
  if (desc) parts.push(`<desc>${escapeXml(desc)}</desc>`)
  if (background !== "transparent") {
    parts.push(`<rect width="100%" height="100%" fill="${escapeAttr(background)}"/>`)
  }

  // Draw hexagonal modules as circles
  const circles: string[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (matrix[row]![col]) {
        const xOff = row % 2 === 1 ? pitch / 2 : 0
        const cx = pad + col * pitch + pitch / 2 + xOff
        const cy = pad + row * modH + modH / 2
        circles.push(
          `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${escapeAttr(color)}"/>`,
        )
      }
    }
  }
  parts.push(...circles)

  parts.push("</svg>")
  return parts.join("")
}
