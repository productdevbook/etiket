/**
 * Logo embedding in QR codes
 * Calculates which modules to hide and generates the logo SVG element
 */

import { InvalidInputError } from "../../errors";
import type { LogoOptions } from "./types";
import { escapeAttr } from "./utils";

const SVG_DANGEROUS_PATTERN = /<script[\s>]|javascript:|on[a-z]+\s*=|<foreignObject[\s>]/i;

export interface LogoPlacement {
  /** SVG element string for the logo */
  svg: string;
  /** Set of module coordinates to hide: `${row},${col}` */
  hiddenModules: Set<string>;
}

/**
 * Calculate logo placement and which modules to hide
 */
export function calculateLogoPlacement(
  options: LogoOptions,
  moduleCount: number,
  moduleSize: number,
  margin: number,
): LogoPlacement {
  const logoSize = options.size ?? 0.3;
  const logoMargin = options.margin ?? 0;
  const hideBackground = options.hideBackgroundDots ?? true;

  // Logo dimensions in pixels
  const totalSize = moduleCount * moduleSize;
  const logoPixelSize = totalSize * logoSize;
  const logoX = margin * moduleSize + (totalSize - logoPixelSize) / 2;
  const logoY = margin * moduleSize + (totalSize - logoPixelSize) / 2;

  // Calculate hidden modules
  const hiddenModules = new Set<string>();

  if (hideBackground) {
    const startModule = Math.floor(
      (moduleCount - moduleCount * logoSize) / 2 - logoMargin / moduleSize,
    );
    const endModule = Math.ceil(
      (moduleCount + moduleCount * logoSize) / 2 + logoMargin / moduleSize,
    );

    for (let r = Math.max(0, startModule); r < Math.min(moduleCount, endModule); r++) {
      for (let c = Math.max(0, startModule); c < Math.min(moduleCount, endModule); c++) {
        hiddenModules.add(`${r},${c}`);
      }
    }
  }

  // Generate logo SVG
  let svg = "";

  if (options.backgroundColor) {
    const bgPad = logoMargin;
    svg += `<rect x="${logoX - bgPad}" y="${logoY - bgPad}" width="${logoPixelSize + 2 * bgPad}" height="${logoPixelSize + 2 * bgPad}" fill="${escapeAttr(options.backgroundColor)}" rx="4"/>`;
  }

  if (options.svg) {
    // Inline SVG logo — placed within a nested SVG to properly scale regardless of viewBox
    if (SVG_DANGEROUS_PATTERN.test(options.svg)) {
      throw new InvalidInputError(
        "logo.svg contains potentially dangerous content (script, event handlers, or foreignObject)",
      );
    }
    svg += `<svg x="${logoX}" y="${logoY}" width="${logoPixelSize}" height="${logoPixelSize}" viewBox="0 0 1 1">`;
    svg += `<g transform="scale(${1})">${options.svg}</g></svg>`;
  } else if (options.path) {
    // SVG path data — assumes 100x100 coordinate space
    svg += `<path d="${escapeAttr(options.path)}" transform="translate(${logoX},${logoY}) scale(${logoPixelSize / 100})" fill="currentColor"/>`;
  } else if (options.imageUrl) {
    // External image URL or data URI — embedded via SVG <image> element
    if (!/^(https?:|data:image\/)/i.test(options.imageUrl)) {
      throw new InvalidInputError("imageUrl must use https:, http:, or data:image/ scheme");
    }
    const imgW = options.imageWidth ?? logoPixelSize;
    const imgH = options.imageHeight ?? logoPixelSize;
    // Center the image within the logo area
    const imgX = logoX + (logoPixelSize - imgW) / 2;
    const imgY = logoY + (logoPixelSize - imgH) / 2;
    svg += `<image href="${escapeAttr(options.imageUrl)}" x="${imgX}" y="${imgY}" width="${imgW}" height="${imgH}"/>`;
  }

  return { svg, hiddenModules };
}
