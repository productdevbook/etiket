# MSI Plessey

Numeric barcode used in warehouse shelves and inventory management.

## Usage

```ts
import { barcode } from "etiket"

// Default: Mod 10 check digit
barcode("12345", { type: "msi" })

// Different check digit algorithms
barcode("12345", { type: "msi", msiCheckDigit: "mod10" })
barcode("12345", { type: "msi", msiCheckDigit: "mod11" })
barcode("12345", { type: "msi", msiCheckDigit: "mod1010" })
barcode("12345", { type: "msi", msiCheckDigit: "mod1110" })
barcode("12345", { type: "msi", msiCheckDigit: "none" })
```

## Check Digit Types

| Type      | Description                       |
| :-------- | :-------------------------------- |
| `mod10`   | Luhn algorithm (default)          |
| `mod11`   | Weighted sum, weights 2-7 cycling |
| `mod1010` | Double Mod 10                     |
| `mod1110` | Mod 11 then Mod 10                |
| `none`    | No check digit                    |

## Raw Encoder

```ts
import { encodeMSI } from "etiket"

const bars = encodeMSI("12345", { checkDigit: "mod1010" })
```
