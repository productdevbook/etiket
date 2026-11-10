/**
 * QR Code-only entry point for tree-shaking
 *
 * @example
 * ```ts
 * import { qrcode, encodeQR } from 'etiket/qr'
 * ```
 */

export { qrcode, qrcodeTerminal, qrcodeDataURI, qrcodeBase64 } from "./_qrcode"
export { microqr, rmqr } from "./_2d"
export type { QRCodeSVGOptions } from "./renderers/svg/types"
export type {
  QRCodeOptions,
  ErrorCorrectionLevel,
  EncodingMode,
  KanjiCodec,
  QRSymbol,
  QRSymbolOptions,
} from "./encoders/qr/types"
export type { DotType, GradientOptions, CornerOptions, LogoOptions } from "./renderers/svg/types"

export { encodeQR, encodeQRCore, encodeQRSequence } from "./encoders/qr/index"
export { encodeQRSymbol, tryEncodeQRSymbol } from "./encoders/qr/symbol"
export { kanjiCodec } from "./encoders/qr/kanji"
export type { QRSequenceOptions } from "./encoders/qr/index"
export { encodeMicroQR } from "./encoders/qr/micro"
export type { MicroQROptions } from "./encoders/qr/micro"
export { encodeRMQR } from "./encoders/rmqr"
export type { RMQROptions } from "./encoders/rmqr"
export { renderQRCodeSVG } from "./renderers/svg/qr"
export { renderMatrixSVG } from "./renderers/svg/matrix"
export type { MatrixSVGOptions } from "./renderers/svg/matrix"
export { renderText } from "./renderers/text"

// QR-based payload helpers — every one of these is a qrcode() wrapper, so this
// is where users look for them.
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
  gs1qr,
} from "./_helpers"

// PNG output
export { qrcodePNG, qrcodePNGDataURI, microqrPNG, rmqrPNG } from "./_png"
export type { MatrixPNGOptions } from "./renderers/png/types"

// Validation and errors, so a QR-only consumer can gate input and catch
// failures without importing the full entry
export { validateQRInput } from "./validators/qr"
export type { QRValidationResult } from "./validators/qr"
export { EtiketError, InvalidInputError, CapacityError, CheckDigitError } from "./errors"

// Batch generation and label sheets
export { qrcodes, qrcodeSheet } from "./_batch"
export type { BatchOptions, QRCodeSheetOptions, SheetOptions } from "./_batch"
