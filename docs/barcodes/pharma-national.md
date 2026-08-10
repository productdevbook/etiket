# Code 32 and PZN

Two national pharmaceutical numbering schemes, both carried by
[Code 39](/barcodes/code39). Neither changes the symbology: what each defines is
how a national product number becomes the characters Code 39 encodes, and how
its check digit is worked out.

## When to Use It

- **Code 32** — Italian medicine packs, where the _Codice Farmaceutico_ is
  printed as `A` followed by nine digits
- **PZN** — German medicine packs, where the _Pharmazentralnummer_ is printed as
  `PZN - ` followed by the digits

## Code 32

Nine digits — eight significant plus a Luhn check — are written in base 32 over
an alphabet with the vowels left out, and those six characters are the symbol.
The `A` in the printed number is not part of it.

```ts
import { barcode, encodeCode32 } from "etiket"

barcode("12345678", { type: "code32", showText: true, text: "A123456788" })
encodeCode32("123456788") // check digit verified rather than computed
```

| Alphabet | `0123456789BCDFGHJKLMNPQRSTUVWXYZ` |
| :------- | :--------------------------------- |
| Input    | 8 digits, or 9 with the check      |
| Check    | Luhn over the eight, modulo 10     |

Passing eight digits computes the check; passing nine verifies it and raises
`CheckDigitError` on a mismatch.

## PZN

The digits are weighted and summed modulo 11 — from 2 for the older seven digit
scheme, from 1 for the eight digit one that replaced it. A remainder of 10 has
no single digit representation, so such a number is not a valid PZN and is
rejected.

```ts
import { barcode, encodePZN } from "etiket"

barcode("123456", { type: "pzn" }) // PZN-7
barcode("1234567", { type: "pzn8" }) // PZN-8
encodePZN("1234567", { pzn8: true })
```

| Scheme | Type   | Input                         | Weights |
| :----- | :----- | :---------------------------- | :------ |
| PZN-7  | `pzn`  | 6 digits, or 7 with the check | 2 to 7  |
| PZN-8  | `pzn8` | 7 digits, or 8 with the check | 1 to 7  |

The symbol is Code 39 over a leading `-` and the digits, which is why a PZN
scans as `-1234562` rather than as the number a pharmacist reads. Pass `text` to
print the human readable form.

```ts
import { barcode } from "etiket"

barcode("123456", { type: "pzn", showText: true, text: "PZN - 1234562" })
```
