/**
 * Barcode-only entry point for tree-shaking
 *
 * @example
 * ```ts
 * import { barcode, encodeCode128 } from 'etiket/barcode'
 * ```
 */

export { barcode, barcodeDataURI, barcodeBase64, encodeBars } from "./_barcode"
export { BARCODE_TYPES } from "./_types"
export type { BarcodeType, BarcodeOptions, BarcodeEncodingOptions } from "./_types"
export type { BarcodeSVGOptions } from "./renderers/svg/types"

export { encodeCode128 } from "./encoders/code128"
export type { Code128Charset, Code128Options } from "./encoders/code128"
export { encodeEAN13, encodeEAN8 } from "./encoders/ean"
export { encodeCode39, encodeCode39Extended } from "./encoders/code39"
export { encodeCode93, encodeCode93Extended } from "./encoders/code93"
export { encodeITF, encodeITF14 } from "./encoders/itf"
export { encodeUPCA, encodeUPCE } from "./encoders/upc"
export { encodeEAN2, encodeEAN5 } from "./encoders/ean-addon"
export { encodeCodabar } from "./encoders/codabar"
export { encodeMSI } from "./encoders/msi"
export type { MSICheckDigitType } from "./encoders/msi"
export { encodePharmacode } from "./encoders/pharmacode"
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
export {
  encodeGS1DataBarOmni,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
  encodeGS1DataBarTruncated,
  encodeGS1DataBarStacked,
  encodeGS1DataBarStackedOmni,
  encodeGS1DataBarExpandedStacked,
} from "./encoders/gs1-databar"
export { gs1databarStacked, gs1databarStackedOmni, gs1databarExpandedStacked } from "./_2d"
export { renderBarcodeSVG } from "./renderers/svg/barcode"
export { svgToDataURI, svgToBase64 } from "./renderers/data-uri"

// Industry encoders that build on the linear symbologies
export { encodeGS1Composite, encodeGS1CompositeSymbol } from "./encoders/gs1-composite"
export type {
  CompositeType,
  CompositeLinearType,
  GS1CompositeOptions,
  GS1CompositeResult,
  GS1CompositeSymbolResult,
} from "./encoders/gs1-composite"
export { encodeHIBCPrimary, encodeHIBCSecondary, encodeHIBCConcatenated } from "./encoders/hibc"
export {
  encodeISBT128DIN,
  encodeISBT128Component,
  encodeISBT128Expiry,
  encodeISBT128BloodGroup,
  iso7064Mod37_2,
} from "./encoders/isbt128"

// PNG output
export { barcodePNG, barcodePNGDataURI } from "./_png"
export type { BarcodePNGOptions } from "./renderers/png/types"

// Validation and errors, so a barcode-only consumer can gate input and catch
// failures without importing the full entry
export {
  validateBarcode,
  isValidInput,
  validateBarcodeInput,
  calculateEANCheckDigit,
  verifyEANCheckDigit,
} from "./validators/barcode"
export { EtiketError, InvalidInputError, CapacityError, CheckDigitError } from "./errors"

// Batch generation and label sheets
export { barcodes, barcodeSheet } from "./_batch"
export type { BatchOptions, BarcodeSheetOptions, SheetOptions } from "./_batch"
