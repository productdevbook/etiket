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
  svg?: string;
  path?: string;
  size?: number; // 0.1 to 0.5, default 0.3
  margin?: number;
  hideBackgroundDots?: boolean;
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

export interface BarcodeSVGOptions {
  width?: number;
  height?: number;
  barWidth?: number;
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
