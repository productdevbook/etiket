# ISBN, ISSN and ISMN

The three publishing identifiers are not symbologies of their own. Each is a
numbering scheme with its own check digit that maps onto an EAN-13 payload, and
that mapping is the whole of the work: the scheme's check digit is dropped on
the way, and EAN-13 computes its own.

## When to Use It

- Book covers and dust jackets, where the ISBN is printed above the symbol
- Periodicals, where the sequence variant distinguishes issue from price code
- Printed music, which uses the 9790 prefix set aside for it

## Usage

```ts
import { barcode } from "etiket"

barcode("978-0-306-40615-7", { type: "isbn" })
barcode("0-306-40615-2", { type: "isbn" }) // ISBN-10, moved to the 978 prefix
barcode("0317-8471", { type: "issn" })
barcode("M-2306-7118-7", { type: "ismn" })
```

Hyphens and spaces are ignored, so the printed form can be passed straight
through. The check digit may be left off and is computed; when it is there it is
verified, and a mismatch raises `CheckDigitError`.

## What Reaches the Symbol

| Input                | EAN-13 payload  |
| :------------------- | :-------------- |
| ISBN-10 `0306406152` | `9780306406157` |
| ISBN-13              | itself          |
| ISSN `0317-8471`     | `9770317847001` |
| ISMN `M-2306-7118-7` | `9790230671187` |

An ISBN-10 or ISSN check digit of `X` is accepted; it stands for 10 in the
scheme's modulo 11 arithmetic and never reaches the symbol.

## Sequence Variant

The two digits after the ISSN in the symbol are the sequence variant — the issue
or price code. They take the place of the ISSN's own check digit and default to
`00`.

```ts
import { barcode, encodeISSN } from "etiket"

barcode("0317-8471", { type: "issn", issnVariant: "01" })
encodeISSN("0317-8471", { variant: "01" }).bars
```

## Add-Ons

The five digit price add-on printed beside a book's ISBN is a separate symbol.
Render it with [EAN-5](/barcodes/ean) and place it to the right of the ISBN.

```ts
import { barcode } from "etiket"

const isbn = barcode("978-0-306-40615-7", { type: "isbn" })
const price = barcode("52495", { type: "ean5" })
```

## Low-Level Encoding

```ts
import { encodeISBN, encodeISSN, encodeISMN } from "etiket"

encodeISBN("0-306-40615-2").bars
encodeISSN("0317-8471").guards // guard bar indices, as EAN-13 returns them
encodeISMN("M-2306-7118-7").bars
```
