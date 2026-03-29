/**
 * Barcode-only entry point for tree-shaking
 *
 * @example
 * ```ts
 * import { barcode, encodeCode128 } from 'etiket/barcode'
 * ```
 */

export { barcode, barcodeDataURI, barcodeBase64, encodeBars } from "./_barcode";
export type { BarcodeType, BarcodeOptions, BarcodeEncodingOptions } from "./_types";
export type { BarcodeSVGOptions } from "./renderers/svg/types";

export { encodeCode128 } from "./encoders/code128";
export type { Code128Charset, Code128Options } from "./encoders/code128";
export { encodeEAN13, encodeEAN8 } from "./encoders/ean";
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
  encodeGS1DataBarOmni,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
} from "./encoders/gs1-databar";
export { renderBarcodeSVG } from "./renderers/svg/barcode";
