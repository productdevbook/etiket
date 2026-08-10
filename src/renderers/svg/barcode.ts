/**
 * 1D Barcode SVG renderer (enhanced)
 */

import type { BarcodeSVGOptions } from "./types"
import { escapeAttr, escapeXml } from "./utils"

/**
 * Render 1D barcode bars as SVG string
 */
export function renderBarcodeSVG(bars: number[], options: BarcodeSVGOptions = {}): string {
  const {
    height = 80,
    barWidth = options.moduleSize ?? 2,
    barGap = 0,
    color = "#000",
    background = "#fff",
    showText = false,
    text = "",
    fontSize = 14,
    fontFamily = "monospace",
    margin = 10,
    textAlign = "center",
    textPosition = "bottom",
    rotation = 0,
    unit = "px",
    bearerBars = false,
    bearerBarWidth = 4,
    ariaLabel,
    role = "img",
    title,
    desc,
    guardBars,
    guardExtension = 5,
    textSegments,
  } = options
  const u = unit === "px" ? "" : unit

  const mTop = options.marginTop ?? margin
  const mBottom = options.marginBottom ?? margin
  const mLeft = options.marginLeft ?? margin
  const mRight = options.marginRight ?? margin

  // Calculate total width from bar widths
  let totalUnits = 0
  for (const w of bars) totalUnits += w

  // `width` asks for a total symbol width; back out the module width from it,
  // unless the caller pinned the module width directly
  const pinnedModule = options.moduleSize ?? options.barWidth
  const moduleWidth =
    options.width !== undefined && pinnedModule === undefined && totalUnits > 0
      ? Math.max((options.width - mLeft - mRight) / totalUnits, 0)
      : barWidth

  const barcodeWidth = totalUnits * moduleWidth
  // Guard bars run past the others into the band the digits sit in, so that
  // band has to be at least as deep as they reach.
  const guards = new Set(guardBars)
  const guardDrop = guards.size > 0 ? guardExtension * moduleWidth : 0
  const textHeight = Math.max(showText ? fontSize + 8 : 0, guardDrop === 0 ? 0 : guardDrop + 4)
  const bearerHeight = bearerBars ? bearerBarWidth * 2 : 0

  const contentWidth = barcodeWidth + mLeft + mRight
  const contentHeight = height + mTop + mBottom + textHeight + bearerHeight

  // For rotation, swap dimensions
  const svgWidth = rotation === 90 || rotation === 270 ? contentHeight : contentWidth
  const svgHeight = rotation === 90 || rotation === 270 ? contentWidth : contentHeight

  // Build SVG opening tag with accessibility attributes
  let svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}${u}" height="${svgHeight}${u}" role="${escapeAttr(role)}"`
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

  // Apply rotation transform
  if (rotation !== 0) {
    const cx = svgWidth / 2
    const cy = svgHeight / 2
    parts.push(
      `<g transform="rotate(${rotation},${cx},${cy}) translate(${(svgWidth - contentWidth) / 2},${(svgHeight - contentHeight) / 2})">`,
    )
  }

  const textIsTop = textPosition === "top"
  const textOffset = textIsTop ? textHeight : 0
  const barTop = mTop + (bearerBars ? bearerBarWidth : 0) + textOffset
  const barHeight = height

  // Bearer bars (top and bottom, for ITF-14)
  if (bearerBars) {
    const bbTop = mTop + textOffset
    parts.push(
      `<rect x="${mLeft}" y="${bbTop}" width="${barcodeWidth}" height="${bearerBarWidth}" fill="${escapeAttr(color)}"/>`,
    )
    parts.push(
      `<rect x="${mLeft}" y="${barTop + barHeight}" width="${barcodeWidth}" height="${bearerBarWidth}" fill="${escapeAttr(color)}"/>`,
    )
    parts.push(
      `<rect x="${mLeft}" y="${bbTop}" width="${bearerBarWidth}" height="${barHeight + bearerHeight}" fill="${escapeAttr(color)}"/>`,
    )
    parts.push(
      `<rect x="${mLeft + barcodeWidth - bearerBarWidth}" y="${bbTop}" width="${bearerBarWidth}" height="${barHeight + bearerHeight}" fill="${escapeAttr(color)}"/>`,
    )
  }

  // Draw bars
  let x = mLeft
  let isBar = true
  const halfGap = barGap / 2
  for (const [index, w] of bars.entries()) {
    const barPixelWidth = w * moduleWidth
    if (isBar) {
      const gappedWidth = barPixelWidth - barGap
      if (gappedWidth > 0) {
        const drawnHeight = guards.has(index) ? barHeight + guardDrop : barHeight
        parts.push(
          `<rect x="${x + halfGap}" y="${barTop}" width="${gappedWidth}" height="${drawnHeight}" fill="${escapeAttr(color)}"/>`,
        )
      }
    }
    x += barPixelWidth
    isBar = !isBar
  }

  // Text placed by module position: the EAN and UPC layout, where the digits
  // sit in the gaps the extended guard bars leave.
  if (showText && textSegments && textSegments.length > 0) {
    const baseline = barTop + barHeight + guardDrop
    for (const segment of textSegments) {
      parts.push(
        `<text x="${mLeft + segment.center * moduleWidth}" y="${baseline}" text-anchor="middle" font-family="${escapeAttr(fontFamily)}" font-size="${fontSize}" fill="${escapeAttr(color)}">${escapeXml(segment.text)}</text>`,
      )
    }
  } else if (showText && text) {
    let textY: number
    if (textIsTop) {
      textY = mTop + fontSize
    } else {
      textY = barTop + barHeight + (bearerBars ? bearerBarWidth : 0) + fontSize + 4
    }

    let textX: number
    let anchor: string

    switch (textAlign) {
      case "left":
        textX = mLeft
        anchor = "start"
        break
      case "right":
        textX = contentWidth - mRight
        anchor = "end"
        break
      default:
        textX = contentWidth / 2
        anchor = "middle"
    }

    parts.push(
      `<text x="${textX}" y="${textY}" text-anchor="${anchor}" font-family="${escapeAttr(fontFamily)}" font-size="${fontSize}" fill="${escapeAttr(color)}">${escapeXml(text)}</text>`,
    )
  }

  if (rotation !== 0) {
    parts.push("</g>")
  }

  parts.push("</svg>")
  return parts.join("")
}
