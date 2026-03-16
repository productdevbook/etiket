/**
 * SVG output optimization utilities
 */

/**
 * Optimize SVG string for smaller output size
 * - Rounds decimal numbers to specified precision
 * - Removes trailing zeros (e.g., "4.00" → "4")
 * - Optionally removes width/height for responsive SVGs (viewBox only)
 */
export function optimizeSVG(
  svg: string,
  options: {
    /** Decimal precision for numbers (default 2) */
    precision?: number;
    /** Remove width/height attributes for fully responsive SVG */
    responsive?: boolean;
  } = {},
): string {
  const { precision = 2, responsive = false } = options;

  let result = svg;

  // Round decimal numbers in path data and attributes
  result = result.replace(/\d+\.\d+/g, (match) => {
    const num = Number.parseFloat(match);
    const rounded = Number.parseFloat(num.toFixed(precision));
    return String(rounded);
  });

  // Remove width/height for responsive SVG (keep viewBox)
  if (responsive) {
    result = result.replace(/ width="[^"]*"/, "");
    result = result.replace(/ height="[^"]*"/, "");
  }

  return result;
}
