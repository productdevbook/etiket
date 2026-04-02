/**
 * PNG output entry point for tree-shaking
 *
 * @example
 * ```ts
 * import { barcodePNG, qrcodePNG } from 'etiket/png'
 * ```
 */

export {
  barcodePNG,
  barcodePNGDataURI,
  qrcodePNG,
  qrcodePNGDataURI,
  datamatrixPNG,
  datamatrixPNGDataURI,
  gs1datamatrixPNG,
  gs1datamatrixPNGDataURI,
  pdf417PNG,
  pdf417PNGDataURI,
  aztecPNG,
  aztecPNGDataURI,
} from "./_png";
export type { BarcodeEncodingOptions } from "./_types";
export type { BarcodePNGOptions, MatrixPNGOptions } from "./renderers/png/types";
export { renderBarcodeRaster, renderMatrixRaster, renderBarcodePNG, renderMatrixPNG } from "./renderers/png/rasterize";
export type { RasterData } from "./renderers/png/rasterize";
export { encodePNG } from "./renderers/png/png-encoder";
