/**
 * Unified encode() function — raw encoding without SVG rendering
 */

import { encodeCode128 } from "./encoders/code128";
import { encodeEAN13, encodeEAN8 } from "./encoders/ean";
import { encodeQR } from "./encoders/qr/index";
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
import {
  encodeGS1DataBarOmni,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
} from "./encoders/gs1-databar";
import { encodePOSTNET, encodePLANET } from "./encoders/postnet";
import { encodePlessey } from "./encoders/plessey";
import { encodeDataMatrix } from "./encoders/datamatrix/index";
import { encodePDF417 } from "./encoders/pdf417/index";
import { encodeAztec } from "./encoders/aztec/index";
import type { EncodeOptions, EncodeResult } from "./_types";

/**
 * Encode data without rendering — returns raw bars or matrix
 */
export function encode(text: string, options: EncodeOptions = {}): EncodeResult {
  const { type = "code128", msiCheckDigit, code128Charset } = options;

  // 2D codes
  switch (type) {
    case "qr":
      return { type: "2d", matrix: encodeQR(text) };
    case "datamatrix":
      return { type: "2d", matrix: encodeDataMatrix(text) };
    case "pdf417":
      return { type: "2d", matrix: encodePDF417(text).matrix };
    case "aztec":
      return { type: "2d", matrix: encodeAztec(text) };
  }

  // 1D codes
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
      bars = encodeCode39(text);
      break;
    case "code39ext":
      bars = encodeCode39Extended(text);
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
      bars = encodeCodabar(text);
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
    case "gs1-databar":
      bars = encodeGS1DataBarOmni(text);
      break;
    case "gs1-databar-limited":
      bars = encodeGS1DataBarLimited(text);
      break;
    case "gs1-databar-expanded":
      bars = encodeGS1DataBarExpanded(text);
      break;
    case "leitcode":
      bars = encodeLeitcode(text);
      break;
    case "postnet":
      return { type: "1d", bars: encodePOSTNET(text) };
    case "planet":
      return { type: "1d", bars: encodePLANET(text) };
    case "plessey":
      bars = encodePlessey(text);
      break;
    default:
      throw new Error(`Unsupported encode type: ${type}`);
  }

  return { type: "1d", bars };
}
