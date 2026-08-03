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
export type { QRCodeOptions, ErrorCorrectionLevel, EncodingMode } from "./encoders/qr/types"
export type { DotType, GradientOptions, CornerOptions, LogoOptions } from "./renderers/svg/types"

export { encodeQR } from "./encoders/qr/index"
export { encodeMicroQR } from "./encoders/qr/micro"
export type { MicroQROptions } from "./encoders/qr/micro"
export { encodeRMQR } from "./encoders/rmqr"
export type { RMQROptions } from "./encoders/rmqr"
export { renderQRCodeSVG } from "./renderers/svg/qr"
export { renderMatrixSVG } from "./renderers/svg/matrix"
export type { MatrixSVGOptions } from "./renderers/svg/matrix"
export { renderText } from "./renderers/text"
