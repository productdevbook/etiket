/**
 * Custom error classes for etiket
 */

export class EtiketError extends Error {
  override name = "EtiketError"
}

export class InvalidInputError extends EtiketError {
  override name = "InvalidInputError"
}

export class CapacityError extends EtiketError {
  override name = "CapacityError"
}

export class CheckDigitError extends EtiketError {
  override name = "CheckDigitError"
}
