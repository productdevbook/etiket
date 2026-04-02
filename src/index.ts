/**
 * etiket — Zero-dependency barcode & QR code SVG generator
 *
 * @example
 * ```ts
 * import { barcode, qrcode } from 'etiket'
 *
 * const svg = barcode('1234567890', { type: 'code128' })
 * const qr = qrcode('https://example.com')
 * ```
 */

// --- High-level API ---
export { barcode, barcodeDataURI, barcodeBase64, encodeBars } from "./_barcode";
export { qrcode, qrcodeTerminal, qrcodeDataURI, qrcodeBase64 } from "./_qrcode";
export { datamatrix, gs1datamatrix, pdf417, aztec } from "./_2d";
export { encode } from "./_encode";
export {
  wifi,
  url,
  email,
  sms,
  geo,
  phone,
  vcard,
  mecard,
  event,
  swissQR,
  gs1DigitalLink,
} from "./_helpers";

// --- Types ---
export type {
  BarcodeType,
  BarcodeEncodingOptions,
  BarcodeOptions,
  EncodeType,
  EncodeOptions,
  EncodeResult,
  Encode1DResult,
  Encode2DResult,
} from "./_types";
export type { BarcodeSVGOptions, QRCodeSVGOptions } from "./renderers/svg/types";
export type { QRCodeOptions } from "./encoders/qr/types";
export type {
  DotType,
  GradientOptions,
  LinearGradientOptions,
  RadialGradientOptions,
  CornerOptions,
  LogoOptions,
  MeasurementUnit,
  SVGAccessibilityOptions,
} from "./renderers/svg/types";
export type { ErrorCorrectionLevel, EncodingMode } from "./encoders/qr/types";

// --- Raw encoders ---
export { encodeCode128 } from "./encoders/code128";
export type { Code128Charset, Code128Options } from "./encoders/code128";
export { encodeEAN13, encodeEAN8 } from "./encoders/ean";
export { encodeQR } from "./encoders/qr/index";
export { encodeMicroQR } from "./encoders/qr/micro";
export type { MicroQROptions } from "./encoders/qr/micro";
export { encodeCode39, encodeCode39Extended } from "./encoders/code39";
export { encodeCode93, encodeCode93Extended } from "./encoders/code93";
export { encodeITF, encodeITF14 } from "./encoders/itf";
export { encodeUPCA, encodeUPCE } from "./encoders/upc";
export { encodeEAN2, encodeEAN5 } from "./encoders/ean-addon";
export { encodeCodabar } from "./encoders/codabar";
export { encodeMSI } from "./encoders/msi";
export type { MSICheckDigitType } from "./encoders/msi";
export { encodePharmacode } from "./encoders/pharmacode";
export { encodeCode11 } from "./encoders/code11";
export { encodeGS1128 } from "./encoders/gs1-128";
export { encodeIdentcode, encodeLeitcode } from "./encoders/deutsche-post";
export { encodePOSTNET, encodePLANET } from "./encoders/postnet";
export { encodePlessey } from "./encoders/plessey";
export { encodeGS1Composite } from "./encoders/gs1-composite";
export type { CompositeType, GS1CompositeResult } from "./encoders/gs1-composite";
export {
  encodeGS1DataBarOmni,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
} from "./encoders/gs1-databar";
export {
  encodeRM4SCC,
  encodeKIX,
  encodeAustraliaPost,
  encodeJapanPost,
} from "./encoders/fourstate";
export type { FourState } from "./encoders/fourstate";
export { encodeIMb } from "./encoders/imb";
export { encodeCodablockF } from "./encoders/codablock-f";
export { encodeCode16K } from "./encoders/code16k";
export { encodeMaxiCode } from "./encoders/maxicode";
export type { MaxiCodeOptions } from "./encoders/maxicode";
export { encodeRMQR } from "./encoders/rmqr";
export type { RMQROptions } from "./encoders/rmqr";
export { encodeDotCode } from "./encoders/dotcode";
export { encodeHanXin } from "./encoders/hanxin";
export type { HanXinOptions } from "./encoders/hanxin";
export { encodeJABCode, JAB_COLORS_4, JAB_COLORS_8 } from "./encoders/jabcode";
export type { JABCodeOptions, JABCodeResult } from "./encoders/jabcode";
export { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index";
export { encodePDF417 } from "./encoders/pdf417/index";
export type { PDF417Options } from "./encoders/pdf417/index";
export { encodeMicroPDF417 } from "./encoders/micropdf417";
export type { MicroPDF417Options } from "./encoders/micropdf417";
export { encodeAztec } from "./encoders/aztec/index";
export type { AztecOptions } from "./encoders/aztec/index";
export { encodeHIBCPrimary, encodeHIBCSecondary, encodeHIBCConcatenated } from "./encoders/hibc";
export {
  encodeISBT128DIN,
  encodeISBT128Component,
  encodeISBT128Expiry,
  encodeISBT128BloodGroup,
  iso7064Mod37_2,
} from "./encoders/isbt128";

// --- PNG ---
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
export type { BarcodePNGOptions, MatrixPNGOptions } from "./renderers/png/types";
export {
  renderBarcodeRaster,
  renderMatrixRaster,
  renderBarcodePNG,
  renderMatrixPNG,
} from "./renderers/png/rasterize";
export type { RasterData } from "./renderers/png/rasterize";
export { encodePNG } from "./renderers/png/png-encoder";

// --- Renderers ---
export { renderBarcodeSVG } from "./renderers/svg/barcode";
export { renderQRCodeSVG } from "./renderers/svg/qr";
export { renderMatrixSVG, renderMaxiCodeSVG } from "./renderers/svg/matrix";
export type { MatrixSVGOptions } from "./renderers/svg/matrix";
export { renderText } from "./renderers/text";
export { svgToDataURI, svgToBase64, svgToBase64Raw } from "./renderers/data-uri";
export { optimizeSVG } from "./renderers/svg/optimize";

// --- Errors ---
export { EtiketError, InvalidInputError, CapacityError, CheckDigitError } from "./errors";

// --- Validators ---
export {
  validateBarcode,
  isValidInput,
  calculateEANCheckDigit,
  verifyEANCheckDigit,
  validateBarcodeInput,
} from "./validators/barcode";
export { validateQRInput } from "./validators/qr";
export type { QRValidationResult } from "./validators/qr";
