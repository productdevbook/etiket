/**
 * 1D barcode generation
 */

import { encodeCode128 } from "./encoders/code128"
import {
  encodeGS1DataBarOmni,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
  encodeGS1DataBarTruncated,
} from "./encoders/gs1-databar"
import { encodeEAN13, encodeEAN8 } from "./encoders/ean"
import { encodeCode39, encodeCode39Extended } from "./encoders/code39"
import { encodeCode93, encodeCode93Extended } from "./encoders/code93"
import { encodeITF, encodeITF14 } from "./encoders/itf"
import { encodeUPCA, encodeUPCE } from "./encoders/upc"
import { encodeEAN2, encodeEAN5 } from "./encoders/ean-addon"
import { encodeCodabar } from "./encoders/codabar"
import { encodeMSI } from "./encoders/msi"
import { encodePharmacode } from "./encoders/pharmacode"
import { encodeCode11 } from "./encoders/code11"
import { encodeEAN14, encodeGS1128, encodeSSCC18 } from "./encoders/gs1-128"
import { encodeISBN, encodeISMN, encodeISSN } from "./encoders/isbn"
import { encodeCode2of5 } from "./encoders/code2of5"
import { encodeCode32, encodePZN } from "./encoders/pharma-national"
import { encodeIdentcode, encodeLeitcode } from "./encoders/deutsche-post"
import { encodePlessey } from "./encoders/plessey"
import { renderBarcodeSVG } from "./renderers/svg/barcode"
import { eanLayout } from "./renderers/svg/ean-layout"
import { renderPostalSVG } from "./renderers/svg/postal"
import { svgToDataURI, svgToBase64 } from "./renderers/data-uri"
import { encodePostal } from "./_postal"
import { InvalidInputError } from "./errors"
import type { BarcodeEncodingOptions, BarcodeOptions } from "./_types"

/** Types whose data lives in bar height rather than bar width. */
const POSTAL_TYPES = new Set<string>(["postnet", "planet"])

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
    issnVariant,
    code2of5CheckDigit,
  } = options

  switch (type) {
    case "code128":
      return encodeCode128(text, code128Charset ? { charset: code128Charset } : undefined)
    case "ean13":
      return encodeEAN13(text).bars
    case "ean8":
      return encodeEAN8(text).bars
    case "code39":
      return encodeCode39(text, { checkDigit: code39CheckDigit })
    case "code39ext":
      return encodeCode39Extended(text, { checkDigit: code39CheckDigit })
    case "code93":
      return encodeCode93(text)
    case "code93ext":
      return encodeCode93Extended(text)
    case "itf":
      return encodeITF(text)
    case "itf14":
      return encodeITF14(text)
    case "upca":
      return encodeUPCA(text).bars
    case "upce":
      return encodeUPCE(text).bars
    case "ean2":
      return encodeEAN2(text)
    case "ean5":
      return encodeEAN5(text)
    case "codabar":
      return encodeCodabar(text, { start: codabarStart, stop: codabarStop })
    case "msi":
      return encodeMSI(text, { checkDigit: msiCheckDigit })
    case "pharmacode":
      return encodePharmacode(Number(text))
    case "code11":
      return encodeCode11(text)
    case "gs1-128":
      return encodeGS1128(text)
    case "identcode":
      return encodeIdentcode(text)
    case "leitcode":
      return encodeLeitcode(text)
    case "postnet":
    case "planet":
      // POSTNET/PLANET encode data in bar *height*, not bar width, so they have
      // no meaningful bar-width pattern. Use encodePostal()/postal() instead.
      throw new InvalidInputError(
        `${type} is a height-modulated postal symbology — use encodePostal()/postal() instead of encodeBars()`,
      )
    case "plessey":
      return encodePlessey(text)
    case "gs1-databar":
      return encodeGS1DataBarOmni(text)
    case "gs1-databar-limited":
      return encodeGS1DataBarLimited(text)
    case "gs1-databar-expanded":
      return encodeGS1DataBarExpanded(text)
    case "gs1-databar-truncated":
      return encodeGS1DataBarTruncated(text)
    case "ean14":
      return encodeEAN14(text)
    case "sscc18":
      return encodeSSCC18(text)
    case "isbn":
      return encodeISBN(text).bars
    case "issn":
      return encodeISSN(text, { variant: issnVariant }).bars
    case "ismn":
      return encodeISMN(text).bars
    case "code32":
      return encodeCode32(text)
    case "pzn":
    case "pzn8":
      return encodePZN(text, { pzn8: type === "pzn8" })
    case "industrial2of5":
    case "iata2of5":
    case "matrix2of5":
    case "coop2of5":
    case "datalogic2of5":
      return encodeCode2of5(text, {
        version: type.slice(0, -4) as "industrial",
        checkDigit: code2of5CheckDigit,
      })
    default:
      throw new InvalidInputError(`Unsupported barcode type: ${type}`)
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
    issnVariant: _issn,
    code2of5CheckDigit: _c25,
    ...svgOptions
  } = options

  // POSTNET/PLANET are height-modulated: render them with the postal renderer
  // so the tall/short distinction that carries the data is preserved.
  if (options.type && POSTAL_TYPES.has(options.type)) {
    const postalBars = encodePostal(text, { type: options.type as "postnet" | "planet" })
    return renderPostalSVG(postalBars, {
      ...svgOptions,
      text: svgOptions.showText !== false ? (svgOptions.text ?? text) : undefined,
      showText: svgOptions.showText ?? false,
    })
  }

  // A retail symbol prints its digits in the gaps its guard bars leave, with
  // the ones that fall outside the symbol in the quiet zones. Only worth doing
  // when the caller wants the standard text: `text` means they want their own.
  const retail = RETAIL_TYPES[options.type ?? ""]
  if (retail && svgOptions.showText === true && svgOptions.text === undefined) {
    const symbol = retail(text)
    const layout = eanLayout(options.type as "ean13", symbol.digits, symbol.guards)
    if (layout) {
      // The quiet zones of ISO/IEC 15420, which are also where the outside
      // digits go: eleven modules to the left, seven to the right.
      const moduleSize = svgOptions.moduleSize ?? svgOptions.barWidth ?? 2
      return renderBarcodeSVG(symbol.bars, {
        ...svgOptions,
        marginLeft: svgOptions.marginLeft ?? Math.max(svgOptions.margin ?? 10, 11 * moduleSize),
        marginRight: svgOptions.marginRight ?? Math.max(svgOptions.margin ?? 10, 7 * moduleSize),
        ...layout,
        showText: true,
      })
    }
  }

  const bars = encodeBars(text, options)

  return renderBarcodeSVG(bars, {
    ...svgOptions,
    text: svgOptions.showText !== false ? (svgOptions.text ?? text) : undefined,
    showText: svgOptions.showText ?? false,
  })
}

/** The symbologies whose human readable text follows the retail layout. */
const RETAIL_TYPES: Record<
  string,
  ((text: string) => { bars: number[]; guards: number[]; digits: string }) | undefined
> = {
  ean13: encodeEAN13,
  ean8: encodeEAN8,
  upca: encodeUPCA,
  upce: encodeUPCE,
}

/**
 * Generate a barcode as data URI
 */
export function barcodeDataURI(text: string, options?: BarcodeOptions): string {
  return svgToDataURI(barcode(text, options))
}

/**
 * Generate a barcode as base64 string
 */
export function barcodeBase64(text: string, options?: BarcodeOptions): string {
  return svgToBase64(barcode(text, options))
}
