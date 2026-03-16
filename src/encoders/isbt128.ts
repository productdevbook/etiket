/**
 * ISBT 128 encoder for blood bank labeling
 * International Society of Blood Transfusion standard
 *
 * ISBT 128 uses Code 128 as the symbology with specific data structures
 * for donation identification, blood components, expiry dates, etc.
 */

import { InvalidInputError } from "../errors";

/**
 * Encode ISBT 128 Donation Identification Number (DIN)
 * Format: =FLLLLLYYYNNNNNN where:
 *   = : ISBT flag character
 *   F : Facility ID (2 chars country code from ICCBBA)
 *   LLLLL : Facility number (5 chars)
 *   YYY : Year + day-of-year or sequential
 *   NNNNNN : Donation number (6 chars)
 *
 * @param countryCode - 2-char country facility code
 * @param facilityNumber - 5-char facility number
 * @param year - 2-digit year
 * @param donationNumber - Up to 6 chars donation sequence
 * @returns ISBT 128 formatted string for Code 128 encoding
 */
export function encodeISBT128DIN(
  countryCode: string,
  facilityNumber: string,
  year: string,
  donationNumber: string,
): string {
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new InvalidInputError("ISBT 128 country code must be 2 uppercase letters");
  }
  if (facilityNumber.length > 5) {
    throw new InvalidInputError("ISBT 128 facility number must be max 5 characters");
  }
  if (!/^\d{2}$/.test(year)) {
    throw new InvalidInputError("ISBT 128 year must be exactly 2 digits");
  }
  if (
    donationNumber.length < 1 ||
    donationNumber.length > 6 ||
    !/^[A-Z0-9]+$/.test(donationNumber)
  ) {
    throw new InvalidInputError("ISBT 128 donation number must be 1-6 alphanumeric characters");
  }

  const facility = facilityNumber.padStart(5, "0");
  const donation = donationNumber.padStart(6, "0");
  return `=${countryCode}${facility}${year}${donation}`;
}

/**
 * Encode ISBT 128 Blood Component code
 * 5-character product code from ICCBBA product description codes
 *
 * @param productCode - 5-char ICCBBA product code (e.g., "E0791" for red blood cells)
 * @returns ISBT 128 formatted string
 */
export function encodeISBT128Component(productCode: string): string {
  if (productCode.length !== 5) {
    throw new InvalidInputError("ISBT 128 product code must be exactly 5 characters");
  }
  return `=${productCode}`;
}

/**
 * Encode ISBT 128 Expiry Date
 * Format: &YYMMDD (& prefix for expiry)
 *
 * @param date - Date string in YYMMDD format
 * @returns ISBT 128 formatted expiry string
 */
export function encodeISBT128Expiry(date: string): string {
  if (!/^\d{6}$/.test(date)) {
    throw new InvalidInputError("ISBT 128 expiry date must be 6 digits (YYMMDD)");
  }
  return `&${date}`;
}

/**
 * Encode ISBT 128 Blood Group
 * Format: %BG where BG is the ABO/Rh code
 *
 * @param bloodGroup - Blood group code (e.g., "51" for O Pos, "55" for A Pos)
 * @returns ISBT 128 formatted blood group string
 */
export function encodeISBT128BloodGroup(bloodGroup: string): string {
  if (bloodGroup.length < 1 || bloodGroup.length > 5) {
    throw new InvalidInputError("ISBT 128 blood group code must be 1-5 characters");
  }
  return `%${bloodGroup}`;
}
