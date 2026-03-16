/**
 * QR code generation and output functions
 */

import { encodeQR } from "./encoders/qr/index";
import { renderQRCodeSVG } from "./renderers/svg/qr";
import { renderText } from "./renderers/text";
import { svgToDataURI, svgToBase64 } from "./renderers/data-uri";
import type { QRCodeSVGOptions } from "./renderers/svg/types";
import type { QRCodeOptions } from "./encoders/qr/types";

/**
 * Generate a QR code as SVG string
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
 * Generate a QR code as data URI
 */
export function qrcodeDataURI(text: string, options?: QRCodeSVGOptions & QRCodeOptions): string {
  return svgToDataURI(qrcode(text, options));
}

/**
 * Generate a QR code as base64 string
 */
export function qrcodeBase64(text: string, options?: QRCodeSVGOptions & QRCodeOptions): string {
  return svgToBase64(qrcode(text, options));
}
