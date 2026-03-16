/**
 * Barcode-only entry point for tree-shaking
 *
 * @example
 * ```ts
 * import { barcode, encodeCode128 } from 'etiket/barcode'
 * ```
 */

export { barcode } from "./index";
export type { BarcodeType, BarcodeOptions, BarcodeSVGOptions } from "./index";

// Encoders
export { encodeCode128 } from "./encoders/code128";
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


export interface BarcodeData {
  bars: number[];
  text: string;
  type: string;
  checkDigit?: string;
}

export function barcodeData(text: string): BarcodeData {
  const encoded = encodeCode128(text); // existing encoder

  return {
    bars: encoded.bars,
    text: text,
    type: "CODE128",
    checkDigit: encoded.checkDigit
  };
}
// Renderer
export { renderBarcodeSVG } from "./renderers/svg/barcode";
