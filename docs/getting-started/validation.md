# Input Validation

etiket provides validation utilities to check inputs before encoding.

## Validate Barcode Input

```ts
import { validateBarcode, isValidInput } from "etiket"

// Returns { valid: true } or { valid: false, error: "..." }
validateBarcode("4006381333931", "ean13")
// → { valid: true }

validateBarcode("ABC", "ean13")
// → { valid: false, error: "EAN-13 requires 12 or 13 digits" }

// Boolean shorthand
isValidInput("HELLO", "code39") // true
isValidInput("hello", "code39") // false (lowercase not allowed)
```

## Validate QR Input

```ts
import { validateQRInput } from "etiket"

validateQRInput("Hello World", "M")
// → { valid: true }

validateQRInput("A".repeat(10000), "H")
// → { valid: false, error: "Data too long for QR code..." }
```

## Check Digits

```ts
import { calculateEANCheckDigit, verifyEANCheckDigit } from "etiket"

// Calculate check digit for EAN/UPC
calculateEANCheckDigit([4, 0, 0, 6, 3, 8, 1, 3, 3, 3, 9, 3])
// → 1

// Verify an existing check digit
verifyEANCheckDigit("4006381333931") // true
verifyEANCheckDigit("4006381333932") // false
```

## Error Classes

etiket throws specific error types:

```ts
import { InvalidInputError, CapacityError, CheckDigitError } from "etiket"

try {
  barcode("abc", { type: "ean13" })
} catch (e) {
  if (e instanceof InvalidInputError) {
    console.log(e.message) // "EAN-13 requires 12 or 13 digits"
  }
}
```

| Error Class         | When                            |
| :------------------ | :------------------------------ |
| `InvalidInputError` | Wrong characters, wrong length  |
| `CapacityError`     | Data too long for the format    |
| `CheckDigitError`   | Check digit verification failed |
