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
  | "tiny-square";

export interface LinearGradientOptions {
  type: "linear";
  rotation?: number;
  stops: Array<{ offset: number; color: string }>;
}

export interface RadialGradientOptions {
  type: "radial";
  stops: Array<{ offset: number; color: string }>;
}

export type GradientOptions = LinearGradientOptions | RadialGradientOptions;

export interface CornerOptions {
  outerShape?: "square" | "rounded" | "dots" | "extra-rounded" | "classy";
  innerShape?: "square" | "dots" | "rounded";
  outerColor?: string | GradientOptions;
  innerColor?: string | GradientOptions;
}

export interface LogoOptions {
  /** Inline SVG markup (rendered inside a nested <svg>) */
  svg?: string;
  /** SVG path data (assumes 100x100 coordinate space) */
  path?: string;
  /** Image data URI (e.g. "data:image/png;base64,...") or external URL */
  imageUrl?: string;
  /** Image width/height in pixels (required when using imageUrl) */
  imageWidth?: number;
  imageHeight?: number;
  /** Logo size as fraction of QR size (0.1 to 0.5, default 0.3) */
  size?: number;
  /** Padding around logo in pixels */
  margin?: number;
  /** Remove QR modules behind the logo (default true) */
  hideBackgroundDots?: boolean;
  /** Background color behind the logo */
  backgroundColor?: string;
}

export interface QRCodeSVGOptions {
  size?: number;
  margin?: number; // in modules (quiet zone)
  color?: string | GradientOptions;
  background?: string | GradientOptions | "transparent";
  dotType?: DotType;
  dotSize?: number; // 0.1 to 1, default 1
  shape?: "square" | "circle"; // overall QR code shape, default 'square'
  corners?: {
    topLeft?: CornerOptions;
    topRight?: CornerOptions;
    bottomLeft?: CornerOptions;
  };
  logo?: LogoOptions;
  xmlDeclaration?: boolean;
}

/** Measurement unit for SVG dimensions */
export type MeasurementUnit = "px" | "mm" | "in" | "pt" | "cm";

export interface BarcodeSVGOptions {
  width?: number;
  height?: number;
  barWidth?: number;
  /** Measurement unit for dimensions (default 'px'). Affects SVG width/height attributes. */
  unit?: MeasurementUnit;
  /** Extra spacing between bars. Each bar is narrowed by barGap/2 on each side. Default 0. */
  barGap?: number;
  color?: string;
  background?: string;
  showText?: boolean;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  textAlign?: "center" | "left" | "right";
  textPosition?: "bottom" | "top";
  rotation?: 0 | 90 | 180 | 270;
  bearerBars?: boolean;
  bearerBarWidth?: number;
}
