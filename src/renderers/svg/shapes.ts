/**
 * Module shape generators for QR code SVG rendering
 * Each function returns an SVG path data string for a module at (x, y) with given size
 */

import type { DotType } from "./types"

/** Generate SVG path for a single module at the given position */
export function getModulePath(
  x: number,
  y: number,
  size: number,
  dotType: DotType,
  dotSize: number = 1,
): string {
  const s = size * dotSize
  const offset = (size - s) / 2

  switch (dotType) {
    case "square":
      return squarePath(x + offset, y + offset, s)
    case "rounded":
      return roundedPath(x + offset, y + offset, s, s * 0.25)
    case "dots":
      return circlePath(x + size / 2, y + size / 2, s / 2)
    case "diamond":
      return diamondPath(x + size / 2, y + size / 2, s)
    case "classy":
      return classyPath(x + offset, y + offset, s)
    case "classy-rounded":
      return classyRoundedPath(x + offset, y + offset, s)
    case "extra-rounded":
      return roundedPath(x + offset, y + offset, s, s * 0.5)
    case "vertical-line":
      return verticalLinePath(x + offset, y, size, s)
    case "horizontal-line":
      return horizontalLinePath(x, y + offset, size, s)
    case "small-square":
      return squarePath(x + size * 0.15, y + size * 0.15, size * 0.7)
    case "tiny-square":
      return squarePath(x + size * 0.25, y + size * 0.25, size * 0.5)
    default:
      return squarePath(x + offset, y + offset, s)
  }
}

function squarePath(x: number, y: number, s: number): string {
  return `M${x},${y}h${s}v${s}h-${s}z`
}

function roundedPath(x: number, y: number, s: number, r: number): string {
  r = Math.min(r, s / 2)
  return (
    `M${x + r},${y}` +
    `h${s - 2 * r}` +
    `a${r},${r},0,0,1,${r},${r}` +
    `v${s - 2 * r}` +
    `a${r},${r},0,0,1,-${r},${r}` +
    `h-${s - 2 * r}` +
    `a${r},${r},0,0,1,-${r},-${r}` +
    `v-${s - 2 * r}` +
    `a${r},${r},0,0,1,${r},-${r}z`
  )
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy}` + `a${r},${r},0,1,0,${2 * r},0` + `a${r},${r},0,1,0,-${2 * r},0z`
}

function diamondPath(cx: number, cy: number, s: number): string {
  const half = s / 2
  return `M${cx},${cy - half}` + `l${half},${half}` + `l-${half},${half}` + `l-${half},-${half}z`
}

function classyPath(x: number, y: number, s: number): string {
  // Classy style: square with one rounded corner (top-right)
  const r = s * 0.35
  return (
    `M${x},${y}` + `h${s - r}` + `a${r},${r},0,0,1,${r},${r}` + `v${s - r}` + `h-${s}` + `v-${s}z`
  )
}

function classyRoundedPath(x: number, y: number, s: number): string {
  // Classy rounded: rounded corners on top-right and bottom-left
  const r = s * 0.35
  return (
    `M${x},${y}` +
    `h${s - r}` +
    `a${r},${r},0,0,1,${r},${r}` +
    `v${s - 2 * r}` +
    `a${r},${r},0,0,1,-${r},${r}` +
    `h-${s - r}` +
    `v-${s}z`
  )
}

function verticalLinePath(x: number, y: number, fullSize: number, width: number): string {
  return `M${x},${y}h${width}v${fullSize}h-${width}z`
}

function horizontalLinePath(x: number, y: number, fullSize: number, height: number): string {
  return `M${x},${y}h${fullSize}v${height}h-${fullSize}z`
}

/** Generate SVG path for finder pattern outer ring */
export function getFinderOuterPath(
  x: number,
  y: number,
  moduleSize: number,
  shape: string = "square",
): string {
  const s = moduleSize * 7

  switch (shape) {
    case "rounded": {
      const r = moduleSize * 1.5
      return (
        outerRoundedRect(x, y, s, s, r) +
        innerRoundedRect(
          x + moduleSize,
          y + moduleSize,
          s - 2 * moduleSize,
          s - 2 * moduleSize,
          r * 0.5,
        )
      )
    }
    case "dots": {
      const r = s / 2
      const ri = r - moduleSize
      return circlePath(x + r, y + r, r) + circlePath(x + r, y + r, ri)
    }
    case "extra-rounded": {
      const r = moduleSize * 2.5
      return (
        outerRoundedRect(x, y, s, s, r) +
        innerRoundedRect(
          x + moduleSize,
          y + moduleSize,
          s - 2 * moduleSize,
          s - 2 * moduleSize,
          r * 0.6,
        )
      )
    }
    case "classy": {
      const r = moduleSize * 1.5
      // Outer with one rounded corner
      return (
        outerRoundedRect(x, y, s, s, r) +
        innerRoundedRect(
          x + moduleSize,
          y + moduleSize,
          s - 2 * moduleSize,
          s - 2 * moduleSize,
          r * 0.5,
        )
      )
    }
    default: {
      // Square: outer rect minus inner rect (frame)
      return (
        `M${x},${y}h${s}v${s}h-${s}z` +
        `M${x + moduleSize},${y + moduleSize}v${s - 2 * moduleSize}h${s - 2 * moduleSize}v-${s - 2 * moduleSize}z`
      )
    }
  }
}

/** Generate SVG path for finder pattern inner square */
export function getFinderInnerPath(
  x: number,
  y: number,
  moduleSize: number,
  shape: string = "square",
): string {
  const s = moduleSize * 3
  const cx = x + moduleSize * 3.5
  const cy = y + moduleSize * 3.5

  switch (shape) {
    case "dots":
      return circlePath(cx, cy, s / 2)
    case "rounded":
      return roundedPath(x + moduleSize * 2, y + moduleSize * 2, s, moduleSize * 0.75)
    default:
      return squarePath(x + moduleSize * 2, y + moduleSize * 2, s)
  }
}

function outerRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${x + r},${y}` +
    `h${w - 2 * r}a${r},${r},0,0,1,${r},${r}` +
    `v${h - 2 * r}a${r},${r},0,0,1,-${r},${r}` +
    `h-${w - 2 * r}a${r},${r},0,0,1,-${r},-${r}` +
    `v-${h - 2 * r}a${r},${r},0,0,1,${r},-${r}z`
  )
}

function innerRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  // Same shape as outerRoundedRect — fill-rule="evenodd" creates the hole regardless of winding
  return outerRoundedRect(x, y, w, h, r)
}
