/**
 * Unified encode() function — raw encoding without SVG rendering
 */

import { encodeBars } from "./_barcode"
import { encodePostal } from "./_postal"
import { encodeQR } from "./encoders/qr/index"
import { encodeMicroQR } from "./encoders/qr/micro"
import { encodeRMQR } from "./encoders/rmqr"
import { encodeDataMatrix, encodeGS1DataMatrix } from "./encoders/datamatrix/index"
import { encodePDF417 } from "./encoders/pdf417/index"
import { encodeMicroPDF417 } from "./encoders/micropdf417"
import { encodeAztec, encodeAztecRune } from "./encoders/aztec/index"
import { encodeMaxiCode } from "./encoders/maxicode"
import { encodeDotCode } from "./encoders/dotcode"
import { encodeHanXin } from "./encoders/hanxin"
import { encodeCodablockF } from "./encoders/codablock-f"
import { encodeCode16K } from "./encoders/code16k"
import type { BarcodeType, EncodeOptions, EncodeResult, EncodeType } from "./_types"
import type { PostalType } from "./_postal"

const POSTAL_TYPES = new Set<EncodeType>([
  "postnet",
  "planet",
  "rm4scc",
  "kix",
  "auspost",
  "jppost",
  "imb",
  "pharmacode2",
])

/**
 * Encode data without rendering — returns raw bars, a matrix, or postal bar
 * states depending on the symbology family.
 *
 * The `type` field on the result discriminates the three families:
 * - `"1d"` — `bars` holds alternating bar/space widths in modules
 * - `"2d"` — `matrix` holds the module grid
 * - `"postal"` — `bars` holds 4-state letters or POSTNET/PLANET height flags
 */
export function encode(text: string, options: EncodeOptions = {}): EncodeResult {
  const { type = "code128" } = options

  // 2D codes
  switch (type) {
    case "qr":
      return { type: "2d", matrix: encodeQR(text, options.qr) }
    case "microqr":
      return { type: "2d", matrix: encodeMicroQR(text, options.microqr) }
    case "rmqr":
      return { type: "2d", matrix: encodeRMQR(text, options.rmqr) }
    case "datamatrix":
      return { type: "2d", matrix: encodeDataMatrix(text, options.datamatrix) }
    case "gs1-datamatrix":
      return { type: "2d", matrix: encodeGS1DataMatrix(text, options.datamatrix) }
    case "pdf417":
      return { type: "2d", matrix: encodePDF417(text, options.pdf417).matrix }
    case "micropdf417":
      return { type: "2d", matrix: encodeMicroPDF417(text, options.micropdf417).matrix }
    case "aztec":
      return { type: "2d", matrix: encodeAztec(text, options.aztec) }
    case "aztecrune":
      return { type: "2d", matrix: encodeAztecRune(Number(text)) }
    case "maxicode":
      return { type: "2d", matrix: encodeMaxiCode(text, options.maxicode) }
    case "dotcode":
      return { type: "2d", matrix: encodeDotCode(text) }
    case "hanxin":
      return { type: "2d", matrix: encodeHanXin(text, options.hanxin) }
    case "codablock-f":
      return { type: "2d", matrix: encodeCodablockF(text, options.codablockf).matrix }
    case "code16k":
      return { type: "2d", matrix: encodeCode16K(text).matrix }
  }

  // Height-modulated postal codes
  if (POSTAL_TYPES.has(type)) {
    return {
      type: "postal",
      bars: encodePostal(text, {
        type: type as PostalType,
        fcc: options.fcc,
        routingCode: options.routingCode,
      }),
    }
  }

  // 1D codes — share the dispatch used by barcode() so the two cannot diverge.
  // Every 2D and postal type has been handled above, so what remains is a
  // BarcodeType (or an unknown value, which encodeBars() rejects).
  return { type: "1d", bars: encodeBars(text, { ...options, type: type as BarcodeType }) }
}
