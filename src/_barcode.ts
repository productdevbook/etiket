/**
 * 1D barcode generation
 */

import { encodeCode128 } from "./encoders/code128";
import {
  encodeGS1DataBarOmni,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
} from "./encoders/gs1-databar";
import { encodeEAN13, encodeEAN8 } from "./encoders/ean";
import { encodeCode39, encodeCode39Extended } from "./encoders/code39";
import { encodeCode93, encodeCode93Extended } from "./encoders/code93";
import { encodeITF, encodeITF14 } from "./encoders/itf";
import { encodeUPCA, encodeUPCE } from "./encoders/upc";
import { encodeEAN2, encodeEAN5 } from "./encoders/ean-addon";
import { encodeCodabar } from "./encoders/codabar";
import { encodeMSI } from "./encoders/msi";
import { encodePharmacode } from "./encoders/pharmacode";
import { encodeCode11 } from "./encoders/code11";
import { encodeGS1128 } from "./encoders/gs1-128";
import { encodeIdentcode, encodeLeitcode } from "./encoders/deutsche-post";
import { encodePlessey } from "./encoders/plessey";
import { renderBarcodeSVG } from "./renderers/svg/barcode";
import { renderPostalSVG } from "./renderers/svg/postal";
import { svgToDataURI, svgToBase64 } from "./renderers/data-uri";
import { encodePostal } from "./_postal";
import { InvalidInputError } from "./errors";
import type { BarcodeEncodingOptions, BarcodeOptions } from "./_types";

/** Types whose data lives in bar height rather than bar width. */
const POSTAL_TYPES = new Set<string>(["postnet", "planet"]);

/**
 * Encode barcode text to bar width pattern
 */
export function encodeBars(text: string, options: BarcodeEncodingOptions = {}): number[] {
  const {
    type = "code128",
    msiCheckDigit,
    code39CheckDigit,
    codabarStart,
    codabarStop,
    code128Charset,
  } = options;

  switch (type) {
    case "code128":
      return encodeCode128(text, code128Charset ? { charset: code128Charset } : undefined);
    case "ean13":
      return encodeEAN13(text).bars;
    case "ean8":
      return encodeEAN8(text).bars;
    case "code39":
      return encodeCode39(text, { checkDigit: code39CheckDigit });
    case "code39ext":
      return encodeCode39Extended(text, { checkDigit: code39CheckDigit });
    case "code93":
      return encodeCode93(text);
    case "code93ext":
      return encodeCode93Extended(text);
    case "itf":
      return encodeITF(text);
    case "itf14":
      return encodeITF14(text);
    case "upca":
      return encodeUPCA(text).bars;
    case "upce":
      return encodeUPCE(text).bars;
    case "ean2":
      return encodeEAN2(text);
    case "ean5":
      return encodeEAN5(text);
    case "codabar":
      return encodeCodabar(text, { start: codabarStart, stop: codabarStop });
    case "msi":
      return encodeMSI(text, { checkDigit: msiCheckDigit });
    case "pharmacode":
      return encodePharmacode(Number(text));
    case "code11":
      return encodeCode11(text);
    case "gs1-128":
      return encodeGS1128(text);
    case "identcode":
      return encodeIdentcode(text);
    case "leitcode":
      return encodeLeitcode(text);
    case "postnet":
    case "planet":
      // POSTNET/PLANET encode data in bar *height*, not bar width, so they have
      // no meaningful bar-width pattern. Use encodePostal()/postal() instead.
      throw new InvalidInputError(
        `${type} is a height-modulated postal symbology — use encodePostal()/postal() instead of encodeBars()`,
      );
    case "plessey":
      return encodePlessey(text);
    case "gs1-databar":
      return encodeGS1DataBarOmni(text);
    case "gs1-databar-limited":
      return encodeGS1DataBarLimited(text);
    case "gs1-databar-expanded":
      return encodeGS1DataBarExpanded(text);
    default:
      throw new Error(`Unsupported barcode type: ${type}`);
  }
}

/**
 * Generate a barcode as SVG string
 */
export function barcode(text: string, options: BarcodeOptions = {}): string {
  const {
    type: _type,
    msiCheckDigit: _msi,
    code39CheckDigit: _c39,
    codabarStart: _cbStart,
    codabarStop: _cbStop,
    code128Charset: _c128,
    ...svgOptions
  } = options;

  // POSTNET/PLANET are height-modulated: render them with the postal renderer
  // so the tall/short distinction that carries the data is preserved.
  if (options.type && POSTAL_TYPES.has(options.type)) {
    const postalBars = encodePostal(text, { type: options.type as "postnet" | "planet" });
    return renderPostalSVG(postalBars, {
      ...svgOptions,
      text: svgOptions.showText !== false ? (svgOptions.text ?? text) : undefined,
      showText: svgOptions.showText ?? false,
    });
  }

  const bars = encodeBars(text, options);

  return renderBarcodeSVG(bars, {
    ...svgOptions,
    text: svgOptions.showText !== false ? (svgOptions.text ?? text) : undefined,
    showText: svgOptions.showText ?? false,
  });
}

/**
 * Generate a barcode as data URI
 */
export function barcodeDataURI(text: string, options?: BarcodeOptions): string {
  return svgToDataURI(barcode(text, options));
}

/**
 * Generate a barcode as base64 string
 */
export function barcodeBase64(text: string, options?: BarcodeOptions): string {
  return svgToBase64(barcode(text, options));
}
