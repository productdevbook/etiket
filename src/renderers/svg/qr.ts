/**
 * QR Code SVG renderer with styling support
 */

import type { QRCodeSVGOptions, CornerOptions } from "./types";
import { getModulePath, getFinderOuterPath, getFinderInnerPath } from "./shapes";
import { isGradient, generateGradientDef, resetGradientCounter } from "./gradient";
import { calculateLogoPlacement } from "./logo";
import { escapeAttr } from "./utils";

/**
 * Render a QR code matrix as an SVG string with optional styling
 */
export function renderQRCodeSVG(matrix: boolean[][], options: QRCodeSVGOptions = {}): string {
  const {
    size = 200,
    color = "#000",
    background = "#fff",
    margin = 4,
    dotType = "square",
    dotSize = 1,
    shape = "square",
    corners,
    logo,
    xmlDeclaration = false,
  } = options;

  resetGradientCounter();

  const moduleCount = matrix.length;
  const totalModules = moduleCount + margin * 2;
  const moduleSize = size / totalModules;

  const defs: string[] = [];
  const parts: string[] = [];

  if (xmlDeclaration) {
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  }

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
  );

  // Background
  if (background !== "transparent") {
    if (isGradient(background)) {
      const grad = generateGradientDef(background);
      defs.push(grad.svg);
      parts.push(`<rect width="100%" height="100%" fill="url(#${grad.id})"/>`);
    } else {
      parts.push(`<rect width="100%" height="100%" fill="${escapeAttr(background as string)}"/>`);
    }
  }

  // Resolve module color
  let moduleColor = "#000";
  if (isGradient(color)) {
    const grad = generateGradientDef(color);
    defs.push(grad.svg);
    moduleColor = `url(#${grad.id})`;
  } else {
    moduleColor = escapeAttr(color as string);
  }

  // Calculate logo hidden modules
  let hiddenModules: Set<string> | undefined;
  let logoSvg = "";
  if (logo) {
    const placement = calculateLogoPlacement(logo, moduleCount, moduleSize, margin);
    hiddenModules = placement.hiddenModules;
    logoSvg = placement.svg;
  }

  // Determine finder pattern positions
  const finderPositions = [
    { row: 0, col: 0, key: "topLeft" as const },
    { row: 0, col: moduleCount - 7, key: "topRight" as const },
    { row: moduleCount - 7, col: 0, key: "bottomLeft" as const },
  ];

  // Build finder pattern set for exclusion
  const finderModules = new Set<string>();
  for (const fp of finderPositions) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        finderModules.add(`${fp.row + r},${fp.col + c}`);
      }
    }
  }

  // Render finder patterns with custom styling
  if (corners) {
    for (const fp of finderPositions) {
      const cornerOpts: CornerOptions | undefined = corners[fp.key];
      const x = (fp.col + margin) * moduleSize;
      const y = (fp.row + margin) * moduleSize;

      // Outer ring
      const outerShape = cornerOpts?.outerShape ?? "square";
      let outerColor = moduleColor;
      if (cornerOpts?.outerColor) {
        if (isGradient(cornerOpts.outerColor)) {
          const grad = generateGradientDef(cornerOpts.outerColor);
          defs.push(grad.svg);
          outerColor = `url(#${grad.id})`;
        } else {
          outerColor = escapeAttr(cornerOpts.outerColor);
        }
      }
      parts.push(
        `<path d="${getFinderOuterPath(x, y, moduleSize, outerShape)}" fill="${outerColor}" fill-rule="evenodd"/>`,
      );

      // Inner square
      const innerShape = cornerOpts?.innerShape ?? "square";
      let innerColor = moduleColor;
      if (cornerOpts?.innerColor) {
        if (isGradient(cornerOpts.innerColor)) {
          const grad = generateGradientDef(cornerOpts.innerColor);
          defs.push(grad.svg);
          innerColor = `url(#${grad.id})`;
        } else {
          innerColor = escapeAttr(cornerOpts.innerColor);
        }
      }
      parts.push(
        `<path d="${getFinderInnerPath(x, y, moduleSize, innerShape)}" fill="${innerColor}"/>`,
      );
    }
  } else {
    // Default finder patterns (rendered as modules)
    finderModules.clear(); // Let them be rendered as normal modules
  }

  // Render data modules
  const pathParts: string[] = [];
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!matrix[r]![c]) continue;
      if (hiddenModules?.has(`${r},${c}`)) continue;
      if (finderModules.has(`${r},${c}`)) continue;

      const x = (c + margin) * moduleSize;
      const y = (r + margin) * moduleSize;
      pathParts.push(getModulePath(x, y, moduleSize, dotType, dotSize));
    }
  }

  if (pathParts.length > 0) {
    parts.push(`<path d="${pathParts.join("")}" fill="${moduleColor}"/>`);
  }

  // Add logo
  if (logoSvg) {
    parts.push(logoSvg);
  }

  // Circle shape: wrap content in clipPath
  if (shape === "circle") {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;
    defs.push(
      `<clipPath id="etiket-circle-clip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`,
    );
    // Extract all content after the <svg> tag (and optional background rect)
    const bgIndex = xmlDeclaration ? 2 : 1;
    const contentStart = background !== "transparent" ? bgIndex + 1 : bgIndex;
    const content = parts.splice(contentStart);
    parts.push(`<g clip-path="url(#etiket-circle-clip)">`);
    parts.push(...content);
    parts.push("</g>");
  }

  // Insert defs if any
  if (defs.length > 0) {
    parts.splice(xmlDeclaration ? 2 : 1, 0, `<defs>${defs.join("")}</defs>`);
  }

  parts.push("</svg>");
  return parts.join("");
}
