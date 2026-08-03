/**
 * Postal barcode entry point for tree-shaking
 *
 * Covers the height-modulated symbologies: USPS POSTNET/PLANET, Royal Mail
 * RM4SCC, Dutch KIX, Australia Post, Japan Post and USPS Intelligent Mail.
 *
 * @example
 * ```ts
 * import { postal, encodePostal } from 'etiket/postal'
 *
 * const svg = postal('SN34RD1A', { type: 'rm4scc' })
 * ```
 */

export { postal, postalDataURI, postalBase64, encodePostal } from "./_postal";
export type { PostalType, PostalEncodingOptions, PostalOptions } from "./_postal";

export { encodePOSTNET, encodePLANET } from "./encoders/postnet";
export {
  encodeRM4SCC,
  encodeKIX,
  encodeAustraliaPost,
  encodeJapanPost,
} from "./encoders/fourstate";
export type { FourState } from "./encoders/fourstate";
export { encodeIMb } from "./encoders/imb";

export { renderPostalSVG } from "./renderers/svg/postal";
export type { PostalSVGOptions, PostalBar } from "./renderers/svg/postal";
