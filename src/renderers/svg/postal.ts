/**
 * Postal barcode SVG renderer
 *
 * Height-modulated postal symbologies encode data in the vertical extent of each
 * bar rather than in bar widths. Two families are supported:
 *
 * - 2-state (USPS POSTNET / PLANET): each bar is either tall (full height) or
 *   short (bottom fraction), both sitting on a common baseline.
 * - 4-state (RM4SCC, KIX, Australia Post, Japan Post, USPS IMb): each bar is one
 *   of Tracker (centre band only), Ascender (centre + up), Descender
 *   (centre + down) or Full (the whole height).
 *
 * Rendering these through the 1D bar-width renderer is meaningless — the height
 * information is what carries the data — hence this dedicated renderer.
 */

import type { FourState } from "../../encoders/fourstate";
import type { MeasurementUnit, SVGAccessibilityOptions } from "./types";
import { escapeAttr, escapeXml } from "./utils";

export interface PostalSVGOptions extends SVGAccessibilityOptions {
  /** Total symbol height in units (full-bar height). Default 40. */
  height?: number;
  /** Width of a single bar in units. Default 2. */
  barWidth?: number;
  /** Centre-to-centre distance between bars in units. Default barWidth * 2. */
  pitch?: number;
  /** Bar color. Default "#000". */
  color?: string;
  /** Background color, or "transparent" to omit the background rect. Default "#fff". */
  background?: string;
  /** Measurement unit for width/height attributes. Default "px". */
  unit?: MeasurementUnit;
  /** Margin on all sides in units. Default 10. */
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  /**
   * Height of the centre tracker band as a fraction of total height, for
   * 4-state symbols. Default 1/3 (equal ascender / tracker / descender).
   */
  trackerRatio?: number;
  /**
   * Height of a short bar as a fraction of total height, for 2-state
   * POSTNET/PLANET symbols. Default 0.4 (USPS spec: 0.050in of 0.125in).
   */
  shortRatio?: number;
  /** Render human-readable text below the symbol. Default false. */
  showText?: boolean;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

/** Vertical extents of a bar, as fractions from the top of the symbol. */
interface BarExtent {
  top: number;
  bottom: number;
}

/**
 * A postal bar: either a 4-state letter (`"T" | "A" | "D" | "F"`) or a 2-state
 * height flag — non-zero for tall, `0` for short — as produced by
 * `encodePOSTNET` / `encodePLANET`.
 */
export type PostalBar = FourState | number;

const FOUR_STATE = new Set<string>(["T", "A", "D", "F"]);

/** True when the bar array uses 4-state letters rather than 2-state heights. */
function isFourState(bars: readonly PostalBar[]): bars is FourState[] {
  return bars.some((b) => typeof b === "string" && FOUR_STATE.has(b));
}

function fourStateExtent(bar: FourState, trackerRatio: number): BarExtent {
  // Equal-thirds layout by default: the tracker occupies the centre band and
  // ascenders/descenders extend into the remaining space above/below it.
  const side = (1 - trackerRatio) / 2;
  switch (bar) {
    case "T":
      return { top: side, bottom: side + trackerRatio };
    case "A":
      return { top: 0, bottom: side + trackerRatio };
    case "D":
      return { top: side, bottom: 1 };
    case "F":
      return { top: 0, bottom: 1 };
  }
}

function twoStateExtent(bar: PostalBar, shortRatio: number): BarExtent {
  // Tall and short bars share a baseline; short bars rise `shortRatio` from it.
  return bar ? { top: 0, bottom: 1 } : { top: 1 - shortRatio, bottom: 1 };
}

/**
 * Render postal barcode bars as an SVG string.
 *
 * Accepts either 4-state bars (`FourState[]` from RM4SCC, KIX, Australia Post,
 * Japan Post or IMb) or 2-state heights (`number[]` from POSTNET / PLANET); the
 * family is detected from the input.
 */
export function renderPostalSVG(
  bars: readonly PostalBar[],
  options: PostalSVGOptions = {},
): string {
  const {
    height = 40,
    barWidth = 2,
    color = "#000",
    background = "#fff",
    unit = "px",
    margin = 10,
    trackerRatio = 1 / 3,
    shortRatio = 0.4,
    showText = false,
    text = "",
    fontSize = 12,
    fontFamily = "monospace",
    ariaLabel,
    role = "img",
    title,
    desc,
  } = options;

  const pitch = options.pitch ?? barWidth * 2;
  const u = unit === "px" ? "" : unit;

  const mTop = options.marginTop ?? margin;
  const mBottom = options.marginBottom ?? margin;
  const mLeft = options.marginLeft ?? margin;
  const mRight = options.marginRight ?? margin;

  const fourState = isFourState(bars);
  // Bars are laid out on `pitch` centres; the final bar only needs its own width.
  const symbolWidth = bars.length > 0 ? (bars.length - 1) * pitch + barWidth : 0;
  const textHeight = showText && text ? fontSize + 8 : 0;

  const svgWidth = symbolWidth + mLeft + mRight;
  const svgHeight = height + mTop + mBottom + textHeight;

  let svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}${u}" height="${svgHeight}${u}" role="${escapeAttr(role)}"`;
  if (ariaLabel) svgOpen += ` aria-label="${escapeAttr(ariaLabel)}"`;
  svgOpen += ">";

  const parts: string[] = [svgOpen];
  if (title) parts.push(`<title>${escapeXml(title)}</title>`);
  if (desc) parts.push(`<desc>${escapeXml(desc)}</desc>`);
  if (background !== "transparent") {
    parts.push(`<rect width="100%" height="100%" fill="${escapeAttr(background)}"/>`);
  }

  const pathParts: string[] = [];
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const extent = fourState
      ? fourStateExtent(bar as FourState, trackerRatio)
      : twoStateExtent(bar, shortRatio);
    const x = mLeft + i * pitch;
    const y = mTop + extent.top * height;
    const h = (extent.bottom - extent.top) * height;
    pathParts.push(`M${round(x)},${round(y)}h${round(barWidth)}v${round(h)}h-${round(barWidth)}z`);
  }

  if (pathParts.length > 0) {
    parts.push(`<path d="${pathParts.join("")}" fill="${escapeAttr(color)}"/>`);
  }

  if (showText && text) {
    const textY = mTop + height + fontSize + 4;
    parts.push(
      `<text x="${round(svgWidth / 2)}" y="${round(textY)}" text-anchor="middle" font-family="${escapeAttr(fontFamily)}" font-size="${fontSize}" fill="${escapeAttr(color)}">${escapeXml(text)}</text>`,
    );
  }

  parts.push("</svg>");
  return parts.join("");
}

/** Trim floating point noise from coordinates. */
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
