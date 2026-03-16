/**
 * PDF417-only entry point for tree-shaking
 */

export { pdf417 } from "./_2d";
export { encodePDF417 } from "./encoders/pdf417/index";
export type { PDF417Options } from "./encoders/pdf417/index";
export { renderMatrixSVG } from "./renderers/svg/matrix";
