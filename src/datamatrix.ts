/**
 * Data Matrix-only entry point for tree-shaking
 */

export { datamatrix, gs1datamatrix } from "./_2d";
export { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index";
export { renderMatrixSVG } from "./renderers/svg/matrix";
export type { MatrixSVGOptions } from "./renderers/svg/matrix";
