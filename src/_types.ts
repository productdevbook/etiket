/**
 * Shared types for etiket
 */

import type { BarcodeSVGOptions } from "./renderers/svg/types";

export type BarcodeType =
  | "code128"
  | "ean13"
  | "ean8"
  | "code39"
  | "code39ext"
  | "code93"
  | "code93ext"
  | "itf"
  | "itf14"
  | "upca"
  | "upce"
  | "ean2"
  | "ean5"
  | "codabar"
  | "msi"
  | "pharmacode"
  | "code11"
  | "gs1-128"
  | "identcode"
  | "leitcode"
  | "postnet"
  | "planet"
  | "plessey"
  | "gs1-databar"
  | "gs1-databar-limited"
  | "gs1-databar-expanded";

export interface BarcodeOptions extends BarcodeSVGOptions {
  type?: BarcodeType;
  msiCheckDigit?: "mod10" | "mod11" | "mod1010" | "mod1110" | "none";
  code39CheckDigit?: boolean;
  codabarStart?: string;
  codabarStop?: string;
  code128Charset?: "auto" | "A" | "B" | "C";
}

export type EncodeType = BarcodeType | "qr" | "datamatrix" | "pdf417" | "aztec";

export interface EncodeOptions {
  type?: EncodeType;
  msiCheckDigit?: "mod10" | "mod11" | "mod1010" | "mod1110" | "none";
  code128Charset?: "auto" | "A" | "B" | "C";
}

export interface Encode1DResult {
  type: "1d";
  bars: number[];
}

export interface Encode2DResult {
  type: "2d";
  matrix: boolean[][];
}

export type EncodeResult = Encode1DResult | Encode2DResult;
