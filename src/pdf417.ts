/**
 * PDF417-only entry point for tree-shaking
 */

export { pdf417 } from "./_2d";
export { encodePDF417 } from "./encoders/pdf417/index";
export type { PDF417Options } from "./encoders/pdf417/index";
export { encodeMicroPDF417 } from "./encoders/micropdf417";
export type { MicroPDF417Options } from "./encoders/micropdf417";
export { renderMatrixSVG } from "./renderers/svg/matrix";
export type { MatrixSVGOptions } from "./renderers/svg/matrix";
