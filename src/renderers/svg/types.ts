/**
 * SVG rendering types and interfaces
 */

export type DotType =
  | "square"
  | "rounded"
  | "dots"
  | "diamond"
  | "classy"
  | "classy-rounded"
  | "extra-rounded"
  | "vertical-line"
  | "horizontal-line"
  | "small-square"
  | "tiny-square"

export interface LinearGradientOptions {
  type: "linear"
  rotation?: number
  stops: Array<{ offset: number; color: string }>
}

export interface RadialGradientOptions {
  type: "radial"
  stops: Array<{ offset: number; color: string }>
}

export type GradientOptions = LinearGradientOptions | RadialGradientOptions

export interface CornerOptions {
  outerShape?: "square" | "rounded" | "dots" | "extra-rounded" | "classy"
  innerShape?: "square" | "dots" | "rounded"
  outerColor?: string | GradientOptions
  innerColor?: string | GradientOptions
}

export interface LogoOptions {
  /** Inline SVG markup (rendered inside a nested <svg>) */
  svg?: string
  /** SVG path data (assumes 100x100 coordinate space) */
  path?: string
  /** Image data URI (e.g. "data:image/png;base64,...") or external URL (PNG, JPEG, GIF, SVG only) */
  imageUrl?: string
  /** Image width in SVG coordinate units (defaults to logo area size if omitted) */
  imageWidth?: number
  /** Image height in SVG coordinate units (defaults to logo area size if omitted) */
  imageHeight?: number
  /** Logo size as fraction of QR size (0.1 to 0.5, default 0.3) */
  size?: number
  /** Padding around logo in pixels */
  margin?: number
  /** Remove QR modules behind the logo (default true) */
  hideBackgroundDots?: boolean
  /** Background color behind the logo */
  backgroundColor?: string
}

/** Accessibility options for SVG output */
export interface SVGAccessibilityOptions {
  /** aria-label attribute for the SVG element */
  ariaLabel?: string
  /** ARIA role attribute (default: "img") */
  role?: string
  /** Title element added as first child of SVG */
  title?: string
  /** Description element added after title */
  desc?: string
}

export interface QRCodeSVGOptions extends SVGAccessibilityOptions {
  size?: number
  margin?: number // in modules (quiet zone)
  /** Measurement unit for size (default 'px'). Affects SVG width/height attributes. */
  unit?: MeasurementUnit
  color?: string | GradientOptions
  background?: string | GradientOptions | "transparent"
  dotType?: DotType
  dotSize?: number // 0.1 to 1, default 1
  shape?: "square" | "circle" // overall QR code shape, default 'square'
  corners?: {
    topLeft?: CornerOptions
    topRight?: CornerOptions
    bottomLeft?: CornerOptions
  }
  logo?: LogoOptions
  xmlDeclaration?: boolean
}

/** Measurement unit for SVG dimensions */
export type MeasurementUnit = "px" | "mm" | "in" | "pt" | "cm"

export interface BarcodeSVGOptions extends SVGAccessibilityOptions {
  /**
   * Total symbol width in units, margins included. The module width is derived
   * from it, so this and `moduleSize` are two ways of saying the same thing —
   * `moduleSize` wins if both are given.
   */
  width?: number
  height?: number
  /**
   * Width of one module in units.
   *
   * @deprecated Prefer `moduleSize`, which every renderer accepts. `barWidth`
   * keeps working and takes precedence when both are given.
   */
  barWidth?: number
  /** Width of one module in units — the name every renderer accepts */
  moduleSize?: number
  /** Measurement unit for dimensions (default 'px'). Affects SVG width/height attributes. */
  unit?: MeasurementUnit
  /** Extra spacing between bars. Each bar is narrowed by barGap/2 on each side. Default 0. */
  barGap?: number
  color?: string
  background?: string
  showText?: boolean
  text?: string
  fontSize?: number
  fontFamily?: string
  margin?: number
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
  textAlign?: "center" | "left" | "right"
  textPosition?: "bottom" | "top"
  rotation?: 0 | 90 | 180 | 270
  bearerBars?: boolean
  bearerBarWidth?: number
  /**
   * Element indices of bars that run past the others into the text band. The
   * guard patterns of an EAN or UPC symbol do this, which is what makes the
   * digits sit in the gaps between them.
   */
  guardBars?: number[]
  /** How far a guard bar runs past the others, in modules. Default 5. */
  guardExtension?: number
  /**
   * Human readable text placed by module position rather than as one centred
   * string — an EAN-13 prints its lead digit in the left quiet zone and its two
   * halves under their own six digits. Takes precedence over `text`, and always
   * sits below the symbol.
   */
  textSegments?: { text: string; center: number }[]
}
