/**
 * Postal barcode generation
 *
 * Unified entry point for the height-modulated postal symbologies: USPS
 * POSTNET/PLANET (2-state) and RM4SCC, KIX, Australia Post, Japan Post and USPS
 * Intelligent Mail (4-state).
 */

import { encodePOSTNET, encodePLANET } from "./encoders/postnet";
import {
  encodeRM4SCC,
  encodeKIX,
  encodeAustraliaPost,
  encodeJapanPost,
} from "./encoders/fourstate";
import { encodeIMb } from "./encoders/imb";
import { renderPostalSVG } from "./renderers/svg/postal";
import { svgToDataURI, svgToBase64 } from "./renderers/data-uri";
import type { PostalBar, PostalSVGOptions } from "./renderers/svg/postal";
import { InvalidInputError } from "./errors";

/** Height-modulated postal symbologies. */
export type PostalType = "postnet" | "planet" | "rm4scc" | "kix" | "auspost" | "jppost" | "imb";

export interface PostalEncodingOptions {
  /** Postal symbology. Default "postnet". */
  type?: PostalType;
  /** Australia Post Format Control Code ("11", "59" or "62"). Default "11". */
  fcc?: string;
  /**
   * Second data field, where the symbology has one:
   * - `imb` — the routing code (0, 5, 9 or 11 digits)
   * - `jppost` — the address portion following the postal code
   */
  routingCode?: string;
}

export interface PostalOptions extends PostalEncodingOptions, PostalSVGOptions {}

/**
 * Encode postal data to bar states without rendering.
 *
 * Returns 4-state letters (`"T" | "A" | "D" | "F"`) for 4-state symbologies and
 * heights (`1` tall / `0` short) for POSTNET and PLANET.
 */
export function encodePostal(text: string, options: PostalEncodingOptions = {}): PostalBar[] {
  const { type = "postnet", fcc = "11", routingCode = "" } = options;

  switch (type) {
    case "postnet":
      return encodePOSTNET(text);
    case "planet":
      return encodePLANET(text);
    case "rm4scc":
      return encodeRM4SCC(text);
    case "kix":
      return encodeKIX(text);
    case "auspost":
      return encodeAustraliaPost(fcc, text);
    case "jppost":
      return encodeJapanPost(text, routingCode || undefined);
    case "imb":
      return encodeIMb(text, routingCode);
    default:
      throw new InvalidInputError(`Unsupported postal type: ${String(type)}`);
  }
}

/**
 * Generate a postal barcode as an SVG string.
 *
 * @example
 * ```ts
 * postal("12345-6789", { type: "postnet" })
 * postal("SN34RD1A", { type: "rm4scc" })
 * postal("01234567094987654321", { type: "imb", routingCode: "01234567891" })
 * ```
 */
export function postal(text: string, options: PostalOptions = {}): string {
  const { type: _type, fcc: _fcc, routingCode: _routing, ...svgOptions } = options;
  const bars = encodePostal(text, options);
  return renderPostalSVG(bars, svgOptions);
}

/** Generate a postal barcode as a data URI */
export function postalDataURI(text: string, options?: PostalOptions): string {
  return svgToDataURI(postal(text, options));
}

/** Generate a postal barcode as a base64 string */
export function postalBase64(text: string, options?: PostalOptions): string {
  return svgToBase64(postal(text, options));
}
