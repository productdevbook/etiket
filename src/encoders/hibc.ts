/**
 * HIBC (Health Industry Bar Code) encoder
 * Data formatting layer for medical device labeling (ANSI/HIBC 2.6)
 *
 * HIBC Primary: +LIC ProductNumber UnitOfMeasure CheckDigit
 * HIBC Secondary: +$$ ExpiryDate LotNumber CheckDigit
 */

import { InvalidInputError } from "../errors";

const HIBC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";

/** Calculate HIBC mod 43 check digit */
function hibcCheckDigit(data: string): string {
  let sum = 0;
  for (const ch of data) {
    const idx = HIBC_CHARS.indexOf(ch);
    if (idx === -1) throw new InvalidInputError(`Invalid HIBC character: "${ch}"`);
    sum += idx;
  }
  return HIBC_CHARS[sum % 43]!;
}

/**
 * Encode HIBC Primary data (LIC + product info)
 * Returns the formatted HIBC string ready for barcode encoding
 *
 * @param lic - Labeler Identification Code (4 chars, uppercase alphanumeric)
 * @param product - Product/Catalog number (1-18 chars)
 * @param unitOfMeasure - Unit of measure digit (0-9, default 0)
 */
export function encodeHIBCPrimary(lic: string, product: string, unitOfMeasure = 0): string {
  if (!/^[A-Z][A-Z0-9]{3}$/.test(lic)) {
    throw new InvalidInputError("HIBC LIC must be 4 characters: letter + 3 alphanumeric");
  }
  if (product.length < 1 || product.length > 18) {
    throw new InvalidInputError("HIBC product number must be 1-18 characters");
  }
  if (!/^[0-9A-Z\-. $/+%]+$/.test(product)) {
    throw new InvalidInputError(
      "HIBC product number contains invalid characters (must be uppercase alphanumeric or - . $ / + %)",
    );
  }
  if (unitOfMeasure < 0 || unitOfMeasure > 9) {
    throw new InvalidInputError("HIBC unit of measure must be 0-9");
  }

  const data = `+${lic}${product}${unitOfMeasure}`;
  const check = hibcCheckDigit(data);
  return `${data}${check}`;
}

/**
 * Encode HIBC Secondary data (expiry + lot/batch)
 * Returns the formatted HIBC string ready for barcode encoding
 *
 * @param expiry - Expiry date (YYYYMMDD or YYMMDD or YYMM)
 * @param lot - Lot/batch number (up to 18 chars)
 */
export function encodeHIBCSecondary(expiry?: string, lot?: string): string {
  if (!expiry && !lot) {
    throw new InvalidInputError("HIBC Secondary requires at least expiry or lot");
  }
  if (lot && !/^[0-9A-Z\-. $/+%]+$/.test(lot)) {
    throw new InvalidInputError(
      "HIBC lot number contains invalid characters (must be uppercase alphanumeric or - . $ / + %)",
    );
  }
  let data = "+$$";

  if (expiry) {
    // Date format indicator + date
    if (expiry.length === 4) {
      // YYMM
      data += `2${expiry}`;
    } else if (expiry.length === 6) {
      // YYMMDD
      data += `3${expiry}`;
    } else if (expiry.length === 8) {
      // YYYYMMDD
      data += `4${expiry}`;
    } else {
      throw new InvalidInputError("HIBC expiry must be YYMM, YYMMDD, or YYYYMMDD");
    }
  }

  if (lot) {
    data += lot;
  }

  const check = hibcCheckDigit(data);
  return `${data}${check}`;
}

/**
 * Encode HIBC concatenated (primary + secondary in one barcode)
 */
export function encodeHIBCConcatenated(
  lic: string,
  product: string,
  options?: { unitOfMeasure?: number; expiry?: string; lot?: string },
): string {
  const primary = encodeHIBCPrimary(lic, product, options?.unitOfMeasure);
  // Remove check digit from primary for concatenation
  const primaryData = primary.slice(0, -1);

  let secondary = "";
  if (options?.expiry || options?.lot) {
    const sec = encodeHIBCSecondary(options.expiry, options.lot);
    // Remove "+$$" prefix and check digit for concatenation
    secondary = "/" + sec.slice(3, -1);
  }

  const combined = `${primaryData}${secondary}`;
  const check = hibcCheckDigit(combined);
  return `${combined}${check}`;
}
