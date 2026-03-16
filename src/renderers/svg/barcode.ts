/**
 * 1D Barcode SVG renderer (enhanced)
 */

import type { BarcodeSVGOptions } from "./types";
import { escapeAttr } from "./utils";

/**
 * Render 1D barcode bars as SVG string
 */
export function renderBarcodeSVG(bars: number[], options: BarcodeSVGOptions = {}): string {
  const {
    height = 80,
    barWidth = 2,
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
  } = options;
  const u = unit === "px" ? "" : unit;

  const mTop = options.marginTop ?? margin;
  const mBottom = options.marginBottom ?? margin;
  const mLeft = options.marginLeft ?? margin;
  const mRight = options.marginRight ?? margin;

  // Calculate total width from bar widths
  let totalUnits = 0;
  for (const w of bars) totalUnits += w;

  const barcodeWidth = totalUnits * barWidth;
  const textHeight = showText ? fontSize + 8 : 0;
  const bearerHeight = bearerBars ? bearerBarWidth * 2 : 0;

  const contentWidth = barcodeWidth + mLeft + mRight;
  const contentHeight = height + mTop + mBottom + textHeight + bearerHeight;

  // For rotation, swap dimensions
  const svgWidth = rotation === 90 || rotation === 270 ? contentHeight : contentWidth;
  const svgHeight = rotation === 90 || rotation === 270 ? contentWidth : contentHeight;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}${u}" height="${svgHeight}${u}">`,
  ];

  if (background !== "transparent") {
    parts.push(`<rect width="100%" height="100%" fill="${escapeAttr(background)}"/>`);
  }

  // Apply rotation transform
  if (rotation !== 0) {
    const cx = svgWidth / 2;
    const cy = svgHeight / 2;
    parts.push(
      `<g transform="rotate(${rotation},${cx},${cy}) translate(${(svgWidth - contentWidth) / 2},${(svgHeight - contentHeight) / 2})">`,
    );
  }

  const textIsTop = textPosition === "top";
  const textOffset = textIsTop ? textHeight : 0;
  const barTop = mTop + (bearerBars ? bearerBarWidth : 0) + textOffset;
  const barHeight = height;

  // Bearer bars (top and bottom, for ITF-14)
  if (bearerBars) {
    const bbTop = mTop + textOffset;
    parts.push(
      `<rect x="${mLeft}" y="${bbTop}" width="${barcodeWidth}" height="${bearerBarWidth}" fill="${escapeAttr(color)}"/>`,
    );
    parts.push(
      `<rect x="${mLeft}" y="${barTop + barHeight}" width="${barcodeWidth}" height="${bearerBarWidth}" fill="${escapeAttr(color)}"/>`,
    );
    parts.push(
      `<rect x="${mLeft}" y="${bbTop}" width="${bearerBarWidth}" height="${barHeight + bearerHeight}" fill="${escapeAttr(color)}"/>`,
    );
    parts.push(
      `<rect x="${mLeft + barcodeWidth - bearerBarWidth}" y="${bbTop}" width="${bearerBarWidth}" height="${barHeight + bearerHeight}" fill="${escapeAttr(color)}"/>`,
    );
  }

  // Draw bars
  let x = mLeft;
  let isBar = true;
  const halfGap = barGap / 2;
  for (const w of bars) {
    const barPixelWidth = w * barWidth;
    if (isBar) {
      const gappedWidth = barPixelWidth - barGap;
      if (gappedWidth > 0) {
        parts.push(
          `<rect x="${x + halfGap}" y="${barTop}" width="${gappedWidth}" height="${barHeight}" fill="${escapeAttr(color)}"/>`,
        );
      }
    }
    x += barPixelWidth;
    isBar = !isBar;
  }

  // Text
  if (showText && text) {
    let textY: number;
    if (textIsTop) {
      textY = mTop + fontSize;
    } else {
      textY = barTop + barHeight + (bearerBars ? bearerBarWidth : 0) + fontSize + 4;
    }

    let textX: number;
    let anchor: string;

    switch (textAlign) {
      case "left":
        textX = mLeft;
        anchor = "start";
        break;
      case "right":
        textX = contentWidth - mRight;
        anchor = "end";
        break;
      default:
        textX = contentWidth / 2;
        anchor = "middle";
    }

    parts.push(
      `<text x="${textX}" y="${textY}" text-anchor="${anchor}" font-family="${escapeAttr(fontFamily)}" font-size="${fontSize}" fill="${escapeAttr(color)}">${escapeXml(text)}</text>`,
    );
  }

  if (rotation !== 0) {
    parts.push("</g>");
  }

  parts.push("</svg>");
  return parts.join("");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
