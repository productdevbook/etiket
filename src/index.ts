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
import { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index";
import { encodePDF417 } from "./encoders/pdf417/index";
import { encodeAztec } from "./encoders/aztec/index";
import { renderBarcodeSVG } from "./renderers/svg/barcode";
import { renderMatrixSVG } from "./renderers/svg/matrix";
import { renderQRCodeSVG } from "./renderers/svg/qr";
import { renderText } from "./renderers/text";
import { svgToDataURI, svgToBase64, svgToBase64Raw } from "./renderers/data-uri";
import type { BarcodeSVGOptions, QRCodeSVGOptions } from "./renderers/svg/types";
import type { QRCodeOptions } from "./encoders/qr/types";

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
  | "leitcode";

export interface BarcodeOptions extends BarcodeSVGOptions {
  type?: BarcodeType;
  /** MSI check digit type */
  msiCheckDigit?: "mod10" | "mod11" | "mod1010" | "mod1110" | "none";
  /** Code 39 check digit */
  code39CheckDigit?: boolean;
  /** Codabar start/stop characters */
  codabarStart?: string;
  codabarStop?: string;
  /** Force Code 128 charset (A, B, or C). Only used when type is 'code128'. Defaults to 'auto'. */
  code128Charset?: "auto" | "A" | "B" | "C";
}

export type { BarcodeSVGOptions, QRCodeSVGOptions, QRCodeOptions };

// Re-export renderer types
export type {
  DotType,
  GradientOptions,
  LinearGradientOptions,
  RadialGradientOptions,
  CornerOptions,
  LogoOptions,
} from "./renderers/svg/types";

// Re-export QR types
export type { ErrorCorrectionLevel, EncodingMode } from "./encoders/qr/types";

/**
 * Generate a barcode as SVG string
 *
 * @param text - The text/number to encode
 * @param options - Barcode options (type, dimensions, colors)
 * @returns SVG string
 *
 * @example
 * ```ts
 * // Code 128 (default)
 * barcode('Hello World')
 *
 * // EAN-13
 * barcode('4006381333931', { type: 'ean13' })
 *
 * // Code 39 with check digit
 * barcode('HELLO', { type: 'code39', code39CheckDigit: true })
 *
 * // ITF-14 with bearer bars
 * barcode('00012345678905', { type: 'itf14', bearerBars: true })
 * ```
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
      bars = encodeCode128(text, { charset: code128Charset });
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
 * Generate a QR code as SVG string
 *
 * @param text - The text/URL to encode
 * @param options - QR code options (size, colors, styling)
 * @returns SVG string
 *
 * @example
 * ```ts
 * qrcode('https://example.com')
 * qrcode('Hello', { size: 300, color: '#333' })
 * qrcode('Test', { ecLevel: 'H', dotType: 'dots' })
 * ```
 */
export function qrcode(text: string, options: QRCodeSVGOptions & QRCodeOptions = {}): string {
  const {
    size,
    margin,
    color,
    background,
    dotType,
    dotSize,
    shape,
    corners,
    logo,
    xmlDeclaration,
    ...qrOptions
  } = options;
  const matrix = encodeQR(text, qrOptions);
  return renderQRCodeSVG(matrix, {
    size,
    margin,
    color,
    background,
    dotType,
    dotSize,
    shape,
    corners,
    logo,
    xmlDeclaration,
  });
}

/**
 * Generate a QR code as terminal-printable string
 */
export function qrcodeTerminal(text: string, options?: QRCodeOptions): string {
  const matrix = encodeQR(text, options);
  return renderText(matrix);
}

/**
 * Generate a barcode as data URI
 */
export function barcodeDataURI(text: string, options?: BarcodeOptions): string {
  return svgToDataURI(barcode(text, options));
}

/**
 * Generate a QR code as data URI
 */
export function qrcodeDataURI(text: string, options?: QRCodeSVGOptions & QRCodeOptions): string {
  return svgToDataURI(qrcode(text, options));
}

/**
 * Generate a barcode as base64 string
 */
export function barcodeBase64(text: string, options?: BarcodeOptions): string {
  return svgToBase64(barcode(text, options));
}

/**
 * Generate a QR code as base64 string
 */
export function qrcodeBase64(text: string, options?: QRCodeSVGOptions & QRCodeOptions): string {
  return svgToBase64(qrcode(text, options));
}

/**
 * Generate a Data Matrix as SVG string
 */
export function datamatrix(
  text: string,
  options?: { size?: number; color?: string; background?: string; margin?: number },
): string {
  const matrix = encodeDataMatrix(text);
  return renderMatrixSVG(matrix, options);
}

/**
 * Generate a GS1 DataMatrix as SVG string
 * Accepts parenthesized AI format: "(01)12345678901234(21)SERIAL"
 */
export function gs1datamatrix(
  text: string,
  options?: { size?: number; color?: string; background?: string; margin?: number },
): string {
  const matrix = encodeGS1DataMatrix(text);
  return renderMatrixSVG(matrix, options);
}

/**
 * Generate a PDF417 barcode as SVG string
 */
export function pdf417(
  text: string,
  options?: {
    ecLevel?: number;
    columns?: number;
    compact?: boolean;
    width?: number;
    height?: number;
    color?: string;
    background?: string;
  },
): string {
  const { ecLevel, columns, compact, ...svgOpts } = options ?? {};
  const result = encodePDF417(text, { ecLevel, columns, compact });
  return renderMatrixSVG(result.matrix, { size: svgOpts.width ?? 400, ...svgOpts });
}

/**
 * Generate an Aztec Code as SVG string
 */
export function aztec(
  text: string,
  options?: {
    ecPercent?: number;
    layers?: number;
    compact?: boolean;
    size?: number;
    color?: string;
    background?: string;
    margin?: number;
  },
): string {
  const { ecPercent, layers, compact, ...svgOpts } = options ?? {};
  const matrix = encodeAztec(text, { ecPercent, layers, compact });
  return renderMatrixSVG(matrix, { margin: 0, ...svgOpts });
}

// Convenience functions
/**
 * Generate a WiFi QR code
 */
export function wifi(
  ssid: string,
  password: string,
  options?: QRCodeSVGOptions &
    QRCodeOptions & {
      encryption?: "WPA" | "WEP" | "nopass";
      hidden?: boolean;
    },
): string {
  const { encryption = "WPA", hidden, ...qrOpts } = options ?? {};
  let text = `WIFI:T:${encryption};S:${escapeWifi(ssid)};P:${escapeWifi(password)};`;
  if (hidden) text += "H:true;";
  text += ";";
  return qrcode(text, qrOpts);
}

/**
 * Generate a URL QR code
 */
export function url(urlString: string, options?: QRCodeSVGOptions & QRCodeOptions): string {
  return qrcode(urlString, options);
}

/**
 * Generate an email QR code
 */
export function email(address: string, options?: QRCodeSVGOptions & QRCodeOptions): string {
  return qrcode(`mailto:${address}`, options);
}

/**
 * Generate an SMS QR code
 */
export function sms(
  number: string,
  body?: string,
  options?: QRCodeSVGOptions & QRCodeOptions,
): string {
  const text = body ? `sms:${number}?body=${encodeURIComponent(body)}` : `sms:${number}`;
  return qrcode(text, options);
}

/**
 * Generate a geo location QR code
 */
export function geo(lat: number, lng: number, options?: QRCodeSVGOptions & QRCodeOptions): string {
  return qrcode(`geo:${lat},${lng}`, options);
}

/**
 * Generate a phone call QR code
 */
export function phone(number: string, options?: QRCodeSVGOptions & QRCodeOptions): string {
  return qrcode(`tel:${number}`, options);
}

/**
 * Generate a vCard QR code
 */
export function vcard(
  contact: {
    firstName: string;
    lastName?: string;
    phone?: string;
    email?: string;
    org?: string;
    title?: string;
    url?: string;
    address?: string;
  },
  options?: QRCodeSVGOptions & QRCodeOptions,
): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${contact.lastName ?? ""};${contact.firstName};;;`,
    `FN:${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ""}`,
  ];
  if (contact.phone) lines.push(`TEL:${contact.phone}`);
  if (contact.email) lines.push(`EMAIL:${contact.email}`);
  if (contact.org) lines.push(`ORG:${contact.org}`);
  if (contact.title) lines.push(`TITLE:${contact.title}`);
  if (contact.url) lines.push(`URL:${contact.url}`);
  if (contact.address) lines.push(`ADR:;;${contact.address};;;;`);
  lines.push("END:VCARD");
  return qrcode(lines.join("\n"), options);
}

/**
 * Generate a MeCard QR code (simpler than vCard, used by Android)
 */
export function mecard(
  contact: {
    name: string;
    phone?: string;
    email?: string;
    url?: string;
    address?: string;
  },
  options?: QRCodeSVGOptions & QRCodeOptions,
): string {
  let text = `MECARD:N:${contact.name};`;
  if (contact.phone) text += `TEL:${contact.phone};`;
  if (contact.email) text += `EMAIL:${contact.email};`;
  if (contact.url) text += `URL:${contact.url};`;
  if (contact.address) text += `ADR:${contact.address};`;
  text += ";";
  return qrcode(text, options);
}

/**
 * Generate a calendar event QR code (iCalendar format)
 */
export function event(
  ev: {
    title: string;
    start: Date | string;
    end?: Date | string;
    location?: string;
    description?: string;
  },
  options?: QRCodeSVGOptions & QRCodeOptions,
): string {
  const fmt = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  };
  const lines = ["BEGIN:VEVENT", `SUMMARY:${ev.title}`, `DTSTART:${fmt(ev.start)}`];
  if (ev.end) lines.push(`DTEND:${fmt(ev.end)}`);
  if (ev.location) lines.push(`LOCATION:${ev.location}`);
  if (ev.description) lines.push(`DESCRIPTION:${ev.description}`);
  lines.push("END:VEVENT");
  return qrcode(lines.join("\n"), options);
}

/**
 * Generate a Swiss QR Code for QR-bill payments (mandatory in Switzerland since 2022)
 */
export function swissQR(
  data: {
    iban: string;
    creditor: {
      name: string;
      street?: string;
      houseNumber?: string;
      postalCode: string;
      city: string;
      country: string;
    };
    amount?: number;
    currency?: "CHF" | "EUR";
    debtor?: {
      name: string;
      street?: string;
      houseNumber?: string;
      postalCode: string;
      city: string;
      country: string;
    };
    reference?: string;
    referenceType?: "QRR" | "SCOR" | "NON";
    additionalInfo?: string;
  },
  options?: QRCodeSVGOptions & QRCodeOptions,
): string {
  const lines: string[] = [
    "SPC", // QR Type
    "0200", // Version
    "1", // Coding type (UTF-8)
    data.iban.replace(/\s/g, ""), // IBAN
    "S", // Address type (structured)
    data.creditor.name,
    data.creditor.street ?? "",
    data.creditor.houseNumber ?? "",
    data.creditor.postalCode,
    data.creditor.city,
    data.creditor.country,
    "",
    "",
    "",
    "",
    "",
    "",
    "", // Ultimate creditor (reserved, empty)
    data.amount !== undefined ? data.amount.toFixed(2) : "",
    data.currency ?? "CHF",
    // Debtor
    data.debtor ? "S" : "",
    data.debtor?.name ?? "",
    data.debtor?.street ?? "",
    data.debtor?.houseNumber ?? "",
    data.debtor?.postalCode ?? "",
    data.debtor?.city ?? "",
    data.debtor?.country ?? "",
    data.referenceType ?? "NON",
    data.reference ?? "",
    data.additionalInfo ?? "",
    "EPD", // Trailer
  ];
  return qrcode(lines.join("\n"), { ecLevel: "M", ...options });
}

/**
 * Generate a GS1 Digital Link QR code
 * Converts AI data into a resolvable URL format per GS1 Digital Link standard
 *
 * @param data - Object with AI keys and values, e.g. { gtin: "09520123456788", batch: "ABC123" }
 * @param options - QR code options + optional domain (default "https://id.gs1.org")
 */
export function gs1DigitalLink(
  data: {
    gtin: string;
    batch?: string;
    serial?: string;
    expiry?: string;
    weight?: string;
    lot?: string;
    [key: string]: string | undefined;
  },
  options?: QRCodeSVGOptions & QRCodeOptions & { domain?: string },
): string {
  const { domain = "https://id.gs1.org", ...qrOpts } = options ?? {};

  // Build URI path: /01/GTIN[/10/batch][/21/serial][/17/expiry]...
  let path = `/01/${data.gtin}`;
  if (data.batch ?? data.lot) path += `/10/${data.batch ?? data.lot}`;
  if (data.serial) path += `/21/${data.serial}`;
  if (data.expiry) path += `/17/${data.expiry}`;
  if (data.weight) path += `/3103/${data.weight}`;

  // Add any extra AIs as path segments
  const knownKeys = new Set(["gtin", "batch", "serial", "expiry", "weight", "lot"]);
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.has(key) && value) {
      path += `/${key}/${value}`;
    }
  }

  const uri = `${domain}${path}`;
  return qrcode(uri, qrOpts);
}

function escapeWifi(str: string): string {
  return str.replace(/([\\;,:"'])/g, "\\$1");
}

// --- Unified encode() function for raw output ---

/** Supported types for the unified encode() function */
export type EncodeType = BarcodeType | "qr" | "datamatrix" | "pdf417" | "aztec";

/** Options for the unified encode() function */
export interface EncodeOptions {
  /** The barcode/matrix type. Defaults to 'code128'. */
  type?: EncodeType;
  /** Force Code 128 charset (only used when type is 'code128'). */
  code128Charset?: "auto" | "A" | "B" | "C";
  /** MSI check digit type (only used when type is 'msi'). */
  msiCheckDigit?: "mod10" | "mod11" | "mod1010" | "mod1110" | "none";
  /** Code 39 check digit (only used when type is 'code39' or 'code39ext'). */
  code39CheckDigit?: boolean;
  /** Codabar start character (only used when type is 'codabar'). */
  codabarStart?: string;
  /** Codabar stop character (only used when type is 'codabar'). */
  codabarStop?: string;
}

/** Result from encoding a 1D barcode */
export interface Encode1DResult {
  type: "1d";
  bars: number[];
}

/** Result from encoding a 2D matrix code */
export interface Encode2DResult {
  type: "2d";
  matrix: boolean[][];
}

/** Result from the unified encode() function */
export type EncodeResult = Encode1DResult | Encode2DResult;

/**
 * Encode text into raw barcode/matrix data without rendering
 *
 * Returns raw encoding data suitable for custom rendering:
 * - For 1D barcodes: `{ type: '1d', bars: number[] }` (bar widths)
 * - For 2D codes (QR, Data Matrix, PDF417, Aztec): `{ type: '2d', matrix: boolean[][] }`
 *
 * @param text - The text/data to encode
 * @param options - Encoding options (type, charset, etc.)
 * @returns Raw encoding result
 *
 * @example
 * ```ts
 * // Default Code 128
 * const result = encode('Hello')
 * // result.type === '1d', result.bars === [2, 1, 1, 2, ...]
 *
 * // QR code
 * const qr = encode('https://example.com', { type: 'qr' })
 * // qr.type === '2d', qr.matrix === [[true, false, ...], ...]
 * ```
 */
export function encode(text: string, options: EncodeOptions = {}): EncodeResult {
  const {
    type = "code128",
    code128Charset,
    msiCheckDigit,
    code39CheckDigit,
    codabarStart,
    codabarStop,
  } = options;

  // 2D types
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

  // 1D types
  let bars: number[];

  switch (type) {
    case "code128":
      bars = encodeCode128(text, { charset: code128Charset });
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
    default:
      throw new Error(`Unsupported encode type: ${type}`);
  }

  return { type: "1d", bars };
}

// Re-export encoders for advanced usage
export { encodeCode128 } from "./encoders/code128";
export type { Code128Charset, Code128Options } from "./encoders/code128";
export { encodeEAN13, encodeEAN8 } from "./encoders/ean";
export { encodeQR } from "./encoders/qr/index";
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
export { encodeHIBCPrimary, encodeHIBCSecondary, encodeHIBCConcatenated } from "./encoders/hibc";
export { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index";
export { encodePDF417 } from "./encoders/pdf417/index";
export type { PDF417Options } from "./encoders/pdf417/index";
export { encodeAztec } from "./encoders/aztec/index";
export type { AztecOptions } from "./encoders/aztec/index";

// Re-export renderers
export { renderBarcodeSVG } from "./renderers/svg/barcode";
export { renderQRCodeSVG } from "./renderers/svg/qr";
export { renderMatrixSVG } from "./renderers/svg/matrix";
export { renderText } from "./renderers/text";
export { svgToDataURI, svgToBase64, svgToBase64Raw } from "./renderers/data-uri";
export { optimizeSVG } from "./renderers/svg/optimize";

// Re-export error classes
export { EtiketError, InvalidInputError, CapacityError, CheckDigitError } from "./errors";

// Re-export validators
export {
  validateBarcode,
  isValidInput,
  calculateEANCheckDigit,
  verifyEANCheckDigit,
  validateQRInput,
  validateBarcodeInput,
} from "./validators/index";
export type { QRValidationResult } from "./validators/index";
