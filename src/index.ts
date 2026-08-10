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
export { barcode, barcodeDataURI, barcodeBase64, encodeBars } from "./_barcode"
export { qrcode, qrcodeTerminal, qrcodeDataURI, qrcodeBase64 } from "./_qrcode"
export {
  datamatrix,
  gs1datamatrix,
  pdf417,
  aztec,
  aztecrune,
  mailmark,
  microqr,
  rmqr,
  maxicode,
  dotcode,
  hanxin,
  micropdf417,
  codablockf,
  code16k,
  jabcode,
  gs1composite,
  gs1databarStacked,
  gs1databarStackedOmni,
  gs1databarExpandedStacked,
} from "./_2d"
export { postal, postalDataURI, postalBase64, encodePostal } from "./_postal"
export type { PostalType, PostalEncodingOptions, PostalOptions } from "./_postal"
export { encode } from "./_encode"
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

// --- Types ---
/** The symbology names, at runtime — handy for building a picker */
export { BARCODE_TYPES, ENCODE_TYPES } from "./_types"
export type {
  BarcodeType,
  BarcodeEncodingOptions,
  BarcodeOptions,
  EncodeType,
  EncodeOptions,
  EncodeResult,
  Encode1DResult,
  Encode2DResult,
  EncodePostalResult,
} from "./_types"
export type { BarcodeSVGOptions, QRCodeSVGOptions } from "./renderers/svg/types"
export type { QRCodeOptions } from "./encoders/qr/types"
export type {
  DotType,
  GradientOptions,
  LinearGradientOptions,
  RadialGradientOptions,
  CornerOptions,
  LogoOptions,
  MeasurementUnit,
  SVGAccessibilityOptions,
} from "./renderers/svg/types"
export type { ErrorCorrectionLevel, EncodingMode } from "./encoders/qr/types"

// --- Raw encoders ---
export { encodeCode128 } from "./encoders/code128"
export type { Code128Charset, Code128Options } from "./encoders/code128"
export { encodeEAN13, encodeEAN8 } from "./encoders/ean"
export { encodeQR, encodeQRSequence } from "./encoders/qr/index"
export type { QRSequenceOptions } from "./encoders/qr/index"
export { encodeMicroQR } from "./encoders/qr/micro"
export type { MicroQROptions } from "./encoders/qr/micro"
export { encodeCode39, encodeCode39Extended } from "./encoders/code39"
export { encodeCode93, encodeCode93Extended } from "./encoders/code93"
export { encodeITF, encodeITF14 } from "./encoders/itf"
export { encodeUPCA, encodeUPCE } from "./encoders/upc"
export { encodeEAN2, encodeEAN5 } from "./encoders/ean-addon"
export { encodeCodabar } from "./encoders/codabar"
export { encodeMSI } from "./encoders/msi"
export type { MSICheckDigitType } from "./encoders/msi"
export { encodePharmacode, encodePharmacode2 } from "./encoders/pharmacode"
export { encodeCode11 } from "./encoders/code11"
export { encodeGS1128 } from "./encoders/gs1-128"
export type { GS1128Options, GS1128Linkage } from "./encoders/gs1-128"
export { encodeEAN14, encodeSSCC18 } from "./encoders/gs1-128"
export { encodeISBN, encodeISSN, encodeISMN } from "./encoders/isbn"
export type { ISSNOptions } from "./encoders/isbn"
export { encodeCode32, encodePZN } from "./encoders/pharma-national"
export type { PZNOptions } from "./encoders/pharma-national"
export { encodeCode2of5 } from "./encoders/code2of5"
export type { Code2of5Options, Code2of5Version } from "./encoders/code2of5"
export { encodeIdentcode, encodeLeitcode } from "./encoders/deutsche-post"
export { encodePOSTNET, encodePLANET } from "./encoders/postnet"
export { encodePlessey } from "./encoders/plessey"
export { encodeGS1Composite, encodeGS1CompositeSymbol } from "./encoders/gs1-composite"
export type {
  CompositeType,
  CompositeLinearType,
  GS1CompositeOptions,
  GS1CompositeResult,
  GS1CompositeSymbolResult,
} from "./encoders/gs1-composite"
export {
  encodeGS1DataBarOmni,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
  encodeGS1DataBarTruncated,
  encodeGS1DataBarStacked,
  encodeGS1DataBarStackedOmni,
  encodeGS1DataBarExpandedStacked,
} from "./encoders/gs1-databar"
export { encodeRM4SCC, encodeKIX, encodeAustraliaPost, encodeJapanPost } from "./encoders/fourstate"
export type { FourState } from "./encoders/fourstate"
export { encodeIMb } from "./encoders/imb"
export { encodeCodablockF } from "./encoders/codablock-f"
export { encodeCode16K } from "./encoders/code16k"
export { encodeMaxiCode } from "./encoders/maxicode"
export type { MaxiCodeOptions } from "./encoders/maxicode"
export { encodeRMQR } from "./encoders/rmqr"
export type { RMQROptions } from "./encoders/rmqr"
export { encodeDotCode } from "./encoders/dotcode"
export type { DotCodeOptions } from "./encoders/dotcode"
export { encodeHanXin } from "./encoders/hanxin"
export type { HanXinOptions } from "./encoders/hanxin"
export { encodeJABCode, JAB_COLORS_4, JAB_COLORS_8 } from "./encoders/jabcode"
export type { JABCodeOptions, JABCodeResult } from "./encoders/jabcode"
export { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index"
export type {
  DataMatrixShape,
  DataMatrixSizeOptions,
  SymbolSize as DataMatrixSymbolSize,
} from "./encoders/datamatrix/tables"
export { SYMBOL_SIZES as DATAMATRIX_SYMBOL_SIZES } from "./encoders/datamatrix/tables"
export { encodePDF417, encodePDF417Sequence } from "./encoders/pdf417/index"
export type {
  PDF417SequenceOptions,
  PDF417MacroOptions,
  PDF417SharedMacroOptions,
} from "./encoders/pdf417/index"
export type { PDF417Options } from "./encoders/pdf417/index"
export { encodeMicroPDF417 } from "./encoders/micropdf417"
export type { MicroPDF417Options } from "./encoders/micropdf417"
export { encodeAztec, encodeAztecRune } from "./encoders/aztec/index"
export { encodeMailmark } from "./encoders/mailmark"
export type { MailmarkOptions, MailmarkType } from "./encoders/mailmark"
export type { AztecOptions } from "./encoders/aztec/index"
export { encodeHIBCPrimary, encodeHIBCSecondary, encodeHIBCConcatenated } from "./encoders/hibc"
export {
  encodeISBT128DIN,
  encodeISBT128Component,
  encodeISBT128Expiry,
  encodeISBT128BloodGroup,
  iso7064Mod37_2,
} from "./encoders/isbt128"

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
export type {
  BarcodePNGOptions,
  ColorMatrixPNGOptions,
  MatrixPNGOptions,
  PostalPNGOptions,
} from "./renderers/png/types"
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

// --- Renderers ---
export { renderBarcodeSVG } from "./renderers/svg/barcode"
export { renderQRCodeSVG } from "./renderers/svg/qr"
export { renderMatrixSVG, renderMaxiCodeSVG } from "./renderers/svg/matrix"
export type { MatrixSVGOptions } from "./renderers/svg/matrix"
export { renderPostalSVG } from "./renderers/svg/postal"
export type { PostalSVGOptions, PostalBar } from "./renderers/svg/postal"
export { renderColorMatrixSVG } from "./renderers/svg/color-matrix"
export type { ColorMatrixSVGOptions } from "./renderers/svg/color-matrix"
export { renderText } from "./renderers/text"
export type { TextRenderOptions } from "./renderers/text"
export { svgToDataURI, svgToBase64, svgToBase64Raw } from "./renderers/data-uri"
export { optimizeSVG } from "./renderers/svg/optimize"

// --- Errors ---
export { EtiketError, InvalidInputError, CapacityError, CheckDigitError } from "./errors"

// --- Validators ---
export {
  validateBarcode,
  isValidInput,
  calculateEANCheckDigit,
  verifyEANCheckDigit,
  validateBarcodeInput,
} from "./validators/barcode"
export { validateQRInput } from "./validators/qr"
export type { QRValidationResult } from "./validators/qr"

// Batch generation and label sheets
export { barcodes, qrcodes, barcodeSheet, qrcodeSheet } from "./_batch"
export type { BatchOptions, SheetOptions, BarcodeSheetOptions, QRCodeSheetOptions } from "./_batch"
