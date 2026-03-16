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
import { encodePOSTNET, encodePLANET } from "./encoders/postnet";
import { encodePlessey } from "./encoders/plessey";
import { renderBarcodeSVG } from "./renderers/svg/barcode";
import { svgToDataURI, svgToBase64 } from "./renderers/data-uri";
import type { BarcodeOptions } from "./_types";

/**
 * Generate a barcode as SVG string
 */
export function barcode(text: string, options: BarcodeOptions = {}): string {
  const {
    type = "code128",
    msiCheckDigit,
    code39CheckDigit,
    codabarStart,
    codabarStop,
    code128Charset,
    ...svgOptions
  } = options;

  let bars: number[];

  switch (type) {
    case "code128":
      bars = encodeCode128(text, code128Charset ? { charset: code128Charset } : undefined);
      break;
    case "ean13":
      bars = encodeEAN13(text).bars;
      break;
    case "ean8":
      bars = encodeEAN8(text).bars;
      break;
    case "code39":
      bars = encodeCode39(text, { checkDigit: code39CheckDigit });
      break;
    case "code39ext":
      bars = encodeCode39Extended(text, { checkDigit: code39CheckDigit });
      break;
    case "code93":
      bars = encodeCode93(text);
      break;
    case "code93ext":
      bars = encodeCode93Extended(text);
      break;
    case "itf":
      bars = encodeITF(text);
      break;
    case "itf14":
      bars = encodeITF14(text);
      break;
    case "upca":
      bars = encodeUPCA(text).bars;
      break;
    case "upce":
      bars = encodeUPCE(text).bars;
      break;
    case "ean2":
      bars = encodeEAN2(text);
      break;
    case "ean5":
      bars = encodeEAN5(text);
      break;
    case "codabar":
      bars = encodeCodabar(text, { start: codabarStart, stop: codabarStop });
      break;
    case "msi":
      bars = encodeMSI(text, { checkDigit: msiCheckDigit });
      break;
    case "pharmacode":
      bars = encodePharmacode(Number(text));
      break;
    case "code11":
      bars = encodeCode11(text);
      break;
    case "gs1-128":
      bars = encodeGS1128(text);
      break;
    case "identcode":
      bars = encodeIdentcode(text);
      break;
    case "leitcode":
      bars = encodeLeitcode(text);
      break;
    case "postnet": {
      const heights = encodePOSTNET(text);
      bars = [];
      for (const _h of heights) {
        bars.push(1);
        bars.push(1);
      }
      bars.pop();
      break;
    }
    case "planet": {
      const heights = encodePLANET(text);
      bars = [];
      for (const _h of heights) {
        bars.push(1);
        bars.push(1);
      }
      bars.pop();
      break;
    }
    case "plessey":
      bars = encodePlessey(text);
      break;
    case "gs1-databar":
      bars = encodeGS1DataBarOmni(text);
      break;
    case "gs1-databar-limited":
      bars = encodeGS1DataBarLimited(text);
      break;
    case "gs1-databar-expanded":
      bars = encodeGS1DataBarExpanded(text);
      break;
    default:
      throw new Error(`Unsupported barcode type: ${type}`);
  }

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
