/**
 * Barcode input validation utilities
 */

// import { InvalidInputError, CheckDigitError } from "../errors";

/** Validate and calculate EAN/UPC check digit (modulo 10 weighted) */
export function calculateEANCheckDigit(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i]! * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

/** Verify EAN/UPC check digit */
export function verifyEANCheckDigit(text: string): boolean {
  const digits = text.replace(/\D/g, "").split("").map(Number);
  if (digits.length < 2) return false;
  const check = digits.pop()!;
  return calculateEANCheckDigit(digits) === check;
}

/** Validate barcode input for a given type */
export function validateBarcode(text: string, type: string): { valid: boolean; error?: string } {
  switch (type) {
    case "code128":
      if (text.length === 0) return { valid: false, error: "Text cannot be empty" };
      return { valid: true };

    case "ean13": {
      const digits = text.replace(/\D/g, "");
      if (digits.length !== 12 && digits.length !== 13) {
        return { valid: false, error: "EAN-13 requires 12 or 13 digits" };
      }
      if (!/^\d+$/.test(digits)) {
        return { valid: false, error: "EAN-13 must contain only digits" };
      }
      if (digits.length === 13 && !verifyEANCheckDigit(digits)) {
        return { valid: false, error: "Invalid EAN-13 check digit" };
      }
      return { valid: true };
    }

    case "ean8": {
      const digits = text.replace(/\D/g, "");
      if (digits.length !== 7 && digits.length !== 8) {
        return { valid: false, error: "EAN-8 requires 7 or 8 digits" };
      }
      if (digits.length === 8 && !verifyEANCheckDigit(digits)) {
        return { valid: false, error: "Invalid EAN-8 check digit" };
      }
      return { valid: true };
    }

    case "code39": {
      const valid = /^[0-9A-Z-. $/+%]*$/.test(text);
      if (!valid)
        return { valid: false, error: "Code 39 only accepts 0-9, A-Z, -, ., space, $, /, +, %" };
      return { valid: true };
    }

    case "code93": {
      const valid = /^[0-9A-Z-. $/+%]*$/.test(text);
      if (!valid)
        return { valid: false, error: "Code 93 only accepts 0-9, A-Z, -, ., space, $, /, +, %" };
      return { valid: true };
    }

    case "itf": {
      if (!/^\d+$/.test(text)) return { valid: false, error: "ITF only accepts digits" };
      return { valid: true };
    }

    case "itf14": {
      const digits = text.replace(/\D/g, "");
      if (digits.length !== 13 && digits.length !== 14) {
        return { valid: false, error: "ITF-14 requires 13 or 14 digits" };
      }
      return { valid: true };
    }

    case "upca": {
      const digits = text.replace(/\D/g, "");
      if (digits.length !== 11 && digits.length !== 12) {
        return { valid: false, error: "UPC-A requires 11 or 12 digits" };
      }
      return { valid: true };
    }

    case "upce": {
      const digits = text.replace(/\D/g, "");
      if (digits.length < 6 || digits.length > 8) {
        return { valid: false, error: "UPC-E requires 6-8 digits" };
      }
      return { valid: true };
    }

    case "codabar": {
      if (!/^[0-9-$:/.+ABCDabcd]*$/.test(text)) {
        return {
          valid: false,
          error: "Codabar only accepts 0-9, -, $, :, /, ., +, and A-D start/stop",
        };
      }
      return { valid: true };
    }

    case "msi": {
      if (!/^\d+$/.test(text)) return { valid: false, error: "MSI only accepts digits" };
      return { valid: true };
    }

    case "pharmacode": {
      const num = Number(text);
      if (!Number.isInteger(num) || num < 3 || num > 131070) {
        return { valid: false, error: "Pharmacode requires integer value 3-131070" };
      }
      return { valid: true };
    }

    case "code11": {
      if (!/^[0-9-]*$/.test(text)) {
        return { valid: false, error: "Code 11 only accepts 0-9 and dash (-)" };
      }
      return { valid: true };
    }

    case "code39ext":
    case "code93ext": {
      // Full ASCII (0-127)
      for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) > 127) {
          return { valid: false, error: `${type} only accepts ASCII characters (0-127)` };
        }
      }
      return { valid: true };
    }

    case "ean2": {
      const digits = text.replace(/\D/g, "");
      if (digits.length !== 2) {
        return { valid: false, error: "EAN-2 requires exactly 2 digits" };
      }
      return { valid: true };
    }

    case "ean5": {
      const digits = text.replace(/\D/g, "");
      if (digits.length !== 5) {
        return { valid: false, error: "EAN-5 requires exactly 5 digits" };
      }
      return { valid: true };
    }

    case "gs1-128": {
      if (text.length === 0) {
        return { valid: false, error: "GS1-128 text cannot be empty" };
      }
      // Check parenthesized format for valid AI structure
      if (text.includes("(")) {
        const aiPattern = /\((\d{2,4})\)/;
        if (!aiPattern.test(text)) {
          return { valid: false, error: "GS1-128 has invalid Application Identifier format" };
        }
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

/** Check if input is valid for a barcode type (boolean convenience) */
export function isValidInput(text: string, type: string): boolean {
  return validateBarcode(text, type).valid;
}

/**
 * Calculate ITF-14 check digit (mod 10, weights starting at 3)
 */
function calculateITF14CheckDigit(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i]! * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Calculate UPC-A check digit (mod 10, weights starting at 3)
 */
function calculateUPCACheckDigit(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i]! * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Validate barcode input and return metadata including check digit where applicable.
 *
 * Reuses `validateBarcode` for basic validation, then computes the check digit
 * for barcode types that support it (EAN-13, EAN-8, UPC-A, ITF-14).
 */
export function validateBarcodeInput(
  text: string,
  type: string,
): { valid: boolean; error?: string; checkDigit?: number } {
  const result = validateBarcode(text, type);
  if (!result.valid) {
    return result;
  }

  // Compute check digit for types that support it
  switch (type) {
    case "ean13": {
      const digits = text.replace(/\D/g, "").split("").map(Number);
      const dataDigits = digits.slice(0, 12);
      const checkDigit = calculateEANCheckDigit(dataDigits);
      return { valid: true, checkDigit };
    }

    case "ean8": {
      const digits = text.replace(/\D/g, "").split("").map(Number);
      const dataDigits = digits.slice(0, 7);
      const checkDigit = calculateEANCheckDigit(dataDigits);
      return { valid: true, checkDigit };
    }

    case "upca": {
      const digits = text.replace(/\D/g, "").split("").map(Number);
      const dataDigits = digits.slice(0, 11);
      const checkDigit = calculateUPCACheckDigit(dataDigits);
      return { valid: true, checkDigit };
    }

    case "itf14": {
      const digits = text.replace(/\D/g, "").split("").map(Number);
      const dataDigits = digits.slice(0, 13);
      const checkDigit = calculateITF14CheckDigit(dataDigits);
      return { valid: true, checkDigit };
    }

    default:
      return { valid: true };
  }
}
