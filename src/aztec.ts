/**
 * Aztec Code-only entry point for tree-shaking
 */

export { aztec, aztecrune } from "./_2d"
export { encodeAztec, encodeAztecRune } from "./encoders/aztec/index"
export type { AztecOptions } from "./encoders/aztec/index"
export { renderMatrixSVG } from "./renderers/svg/matrix"
export type { MatrixSVGOptions } from "./renderers/svg/matrix"
