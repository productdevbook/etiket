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
  aztecrunePNG,
  aztecrunePNGDataURI,
  mailmarkPNG,
  mailmarkPNGDataURI,
  postalPNG,
  postalPNGDataURI,
  microqrPNG,
  microqrPNGDataURI,
  rmqrPNG,
  rmqrPNGDataURI,
  hanxinPNG,
  hanxinPNGDataURI,
  dotcodePNG,
  dotcodePNGDataURI,
  micropdf417PNG,
  micropdf417PNGDataURI,
  codablockfPNG,
  codablockfPNGDataURI,
  code16kPNG,
  gs1databarStackedPNG,
  gs1databarStackedPNGDataURI,
  gs1databarStackedOmniPNG,
  gs1databarStackedOmniPNGDataURI,
  gs1databarExpandedStackedPNG,
  gs1databarExpandedStackedPNGDataURI,
  code16kPNGDataURI,
  jabcodePNG,
  jabcodePNGDataURI,
  gs1compositePNG,
  gs1compositePNGDataURI,
  maxicodePNG,
  maxicodePNGDataURI,
} from "./_png"
export type { BarcodeEncodingOptions } from "./_types"
export type { PostalEncodingOptions, PostalType } from "./_postal"
export type { BarcodePNGOptions, MatrixPNGOptions, PostalPNGOptions } from "./renderers/png/types"
export {
  renderBarcodeRaster,
  renderMatrixRaster,
  renderPostalRaster,
  renderBarcodePNG,
  renderMatrixPNG,
  renderPostalPNG,
  renderMaxiCodeRaster,
  renderMaxiCodePNG,
} from "./renderers/png/rasterize"
export type { RasterData } from "./renderers/png/rasterize"
export { encodePNG } from "./renderers/png/png-encoder"
