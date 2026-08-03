/**
 * Data URI encoding utilities
 */

/**
 * Convert SVG string to a data URI
 */
export function svgToDataURI(svg: string): string {
  // Use percent-encoding which is more compact for SVGs
  // IMPORTANT: encode % first to avoid double-encoding the % introduced by later replacements
  const encoded = svg
    .replace(/\s+/g, " ")
    .replace(/%/g, "%25")
    .replace(/"/g, "'")
    .replace(/#/g, "%23")
    .replace(/{/g, "%7B")
    .replace(/}/g, "%7D")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")

  return `data:image/svg+xml,${encoded}`
}

/**
 * Convert a UTF-8 string to a binary string suitable for btoa.
 * Replaces the deprecated unescape(encodeURIComponent(…)) pattern.
 */
function utf8ToBinary(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return binary
}

/**
 * Convert SVG string to base64 data URI
 */
export function svgToBase64(svg: string): string {
  const base64 = btoa(utf8ToBinary(svg))
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Convert SVG string to a plain base64 string (no data URI prefix)
 */
export function svgToBase64Raw(svg: string): string {
  return btoa(utf8ToBinary(svg))
}
