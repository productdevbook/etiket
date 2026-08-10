# EAN-14 and SSCC-18

Two fixed shapes of [GS1-128](/barcodes/gs1-128): one application identifier,
one element of known length, and the check digit worked out for you. They exist
because those two elements — the trade item and the logistic unit — account for
most of what goes on a shipping label.

## When to Use It

- **EAN-14** — a GTIN-14 on a case or pallet of trade items, under AI (01)
- **SSCC-18** — the serial shipping container code that identifies the pallet
  itself, under AI (00)

## Usage

```ts
import { barcode } from "etiket"

barcode("1234567890123", { type: "ean14" })
barcode("10614141192837465", { type: "sscc18" })
```

The application identifier may be written out, so a string copied from a GS1
element string works unchanged:

```ts
import { barcode } from "etiket"

barcode("(01)1234567890123", { type: "ean14" })
```

## Check Digit

Both use the standard GS1 modulo 10 check, weighting the digits 3 and 1 from the
right. Leave it off and it is computed; supply it and it is verified, with a
mismatch raising `CheckDigitError`.

| Format  | AI     | Digits without the check | With it |
| :------ | :----- | -----------------------: | ------: |
| EAN-14  | `(01)` |                       13 |      14 |
| SSCC-18 | `(00)` |                       17 |      18 |

## Low-Level Encoding

```ts
import { encodeEAN14, encodeSSCC18 } from "etiket"

encodeEAN14("1234567890123")
encodeSSCC18("10614141192837465")
```

Both return the bar widths of an ordinary GS1-128, so a reader reports them as
`(01)12345678901231` and `(00)106141411928374657`. For anything beyond a single
element, use [GS1-128](/barcodes/gs1-128) directly.
