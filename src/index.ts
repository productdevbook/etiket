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
export { barcode, barcodeDataURI, barcodeBase64 } from "./_barcode";
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
export {
  encodeRM4SCC,
  encodeKIX,
  encodeAustraliaPost,
  encodeJapanPost,
} from "./encoders/fourstate";
export type { FourState } from "./encoders/fourstate";
export { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index";
export { encodePDF417 } from "./encoders/pdf417/index";
export type { PDF417Options } from "./encoders/pdf417/index";
export { encodeAztec } from "./encoders/aztec/index";
export type { AztecOptions } from "./encoders/aztec/index";
export { encodeHIBCPrimary, encodeHIBCSecondary, encodeHIBCConcatenated } from "./encoders/hibc";
export {
  encodeISBT128DIN,
  encodeISBT128Component,
  encodeISBT128Expiry,
  encodeISBT128BloodGroup,
} from "./encoders/isbt128";

// --- Renderers ---
export { renderBarcodeSVG } from "./renderers/svg/barcode";
export { renderQRCodeSVG } from "./renderers/svg/qr";
export { renderMatrixSVG } from "./renderers/svg/matrix";
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
