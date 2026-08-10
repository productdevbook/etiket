# Code 25

The discrete 2 of 5 family: five symbologies that differ only in their element
tables. Two of every five elements are wide, and which two says which digit.

## When to Use It

Only where an existing system demands one. None of these is self-checking and
none has a mandatory check digit, so a reader cannot tell a misread from a good
read — which is what [ITF](/barcodes/itf) fixed, and why it replaced them
everywhere it could.

- **Industrial** — warehousing and film, the original of the family
- **IATA** — air cargo container and baggage tags
- **Matrix** — German post and industrial labelling
- **COOP** — Scandinavian retail
- **Datalogic** — a Datalogic house variant of Matrix

## Usage

```ts
import { barcode } from "etiket"

barcode("1234567890", { type: "industrial2of5" })
barcode("1234567890", { type: "iata2of5" })
barcode("1234567890", { type: "matrix2of5" })
barcode("1234567890", { type: "coop2of5" })
barcode("1234567890", { type: "datalogic2of5" })
```

## Width

Industrial and IATA carry the data in the bars alone, with a narrow space
between each — ten elements per digit. Matrix, COOP and Datalogic use the spaces
as well, which takes six.

| Type             | Elements per digit | Guards            |
| :--------------- | -----------------: | :---------------- |
| `industrial2of5` |                 10 | wide              |
| `iata2of5`       |                 10 | narrow            |
| `matrix2of5`     |                  6 | wide              |
| `coop2of5`       |                  6 | wide, four module |
| `datalogic2of5`  |                  6 | narrow            |

## Check Digit

Optional, and off by default. It is the usual modulo 10 with the digits weighted
3 and 1 from the right.

```ts
import { barcode, encodeCode2of5 } from "etiket"

barcode("1234567890", { type: "matrix2of5", code2of5CheckDigit: true })
encodeCode2of5("1234567890", { version: "matrix", checkDigit: true })

// Or check one the data already carries
encodeCode2of5("12345678902", { version: "matrix", checkDigit: "verify" })
```

A mismatch raises `CheckDigitError`; a non-digit anywhere in the input raises
`InvalidInputError`.
