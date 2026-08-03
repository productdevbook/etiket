/**
 * Color matrix SVG renderer
 *
 * Renders a matrix of palette indices, as produced by polychrome symbologies
 * such as JAB Code, where each module carries more than one bit of data.
 */

import type { MatrixSVGOptions } from "./matrix"
import { escapeAttr, escapeXml } from "./utils"

export interface ColorMatrixSVGOptions extends MatrixSVGOptions {
  /** Color palette indexed by module value. Overrides the encoder's palette. */
  palette?: readonly string[]
}

/**
 * Render a matrix of palette indices as SVG.
 *
 * Modules sharing a palette entry are merged into a single `<path>`, keeping the
 * output compact regardless of palette size.
 */
export function renderColorMatrixSVG(
  matrix: number[][],
  palette: readonly string[],
  options: ColorMatrixSVGOptions = {},
): string {
  const {
    size = 200,
    background = "#fff",
    margin = 2,
    rowHeight = 1,
    ariaLabel,
    role = "img",
    title,
    desc,
  } = options
  const colors = options.palette ?? palette

  const rowCount = matrix.length
  const colCount = matrix[0]?.length ?? 0
  const maxDim = Math.max(rowCount, colCount)
  const moduleSize = size / (maxDim + margin * 2)
  const moduleHeight = moduleSize * rowHeight

  const svgWidth = (colCount + margin * 2) * moduleSize
  const svgHeight = rowCount * moduleHeight + margin * 2 * moduleSize

  let svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" role="${escapeAttr(role)}"`
  if (ariaLabel) svgOpen += ` aria-label="${escapeAttr(ariaLabel)}"`
  svgOpen += ">"

  const parts: string[] = [svgOpen]
  if (title) parts.push(`<title>${escapeXml(title)}</title>`)
  if (desc) parts.push(`<desc>${escapeXml(desc)}</desc>`)
  if (background !== "transparent") {
    parts.push(`<rect width="100%" height="100%" fill="${escapeAttr(background)}"/>`)
  }

  // Group modules by palette index so each color needs only one path element.
  const byColor = new Map<number, string[]>()
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const value = matrix[r]![c] ?? 0
      const x = (c + margin) * moduleSize
      const y = margin * moduleSize + r * moduleHeight
      const segments = byColor.get(value) ?? []
      segments.push(`M${x},${y}h${moduleSize}v${moduleHeight}h-${moduleSize}z`)
      byColor.set(value, segments)
    }
  }

  for (const [value, segments] of [...byColor.entries()].sort((a, b) => a[0] - b[0])) {
    const fill = colors[value] ?? "#000"
    parts.push(`<path d="${segments.join("")}" fill="${escapeAttr(fill)}"/>`)
  }

  parts.push("</svg>")
  return parts.join("")
}
