# 1D Barcodes

etiket supports 40 types of 1D barcode. All are generated with the `barcode()` function.

```ts
import { barcode } from "etiket"

const svg = barcode("data", { type: "code128" })
```

## Supported Formats

| Format                                         | Type                    | Characters             | Check Digit       |
| :--------------------------------------------- | :---------------------- | :--------------------- | :---------------- |
| [Code 128](/barcodes/code128)                  | `code128`               | Full ASCII             | Auto (mod 103)    |
| [Code 39](/barcodes/code39)                    | `code39`                | 0-9, A-Z, -.$/+% space | Optional (mod 43) |
| [Code 39 Extended](/barcodes/code39)           | `code39ext`             | Full ASCII             | Optional (mod 43) |
| [Code 93](/barcodes/code93)                    | `code93`                | 0-9, A-Z, -.$/+% space | Auto (C + K)      |
| [Code 93 Extended](/barcodes/code93)           | `code93ext`             | Full ASCII             | Auto (C + K)      |
| [EAN-13](/barcodes/ean)                        | `ean13`                 | 0-9 (12-13 digits)     | Auto (mod 10)     |
| [EAN-8](/barcodes/ean)                         | `ean8`                  | 0-9 (7-8 digits)       | Auto (mod 10)     |
| [EAN-5](/barcodes/ean)                         | `ean5`                  | 0-9 (5 digits)         | Parity-based      |
| [EAN-2](/barcodes/ean)                         | `ean2`                  | 0-9 (2 digits)         | Parity-based      |
| [UPC-A](/barcodes/upc)                         | `upca`                  | 0-9 (11-12 digits)     | Auto (mod 10)     |
| [UPC-E](/barcodes/upc)                         | `upce`                  | 0-9 (6-8 digits)       | Auto (mod 10)     |
| [ITF](/barcodes/itf)                           | `itf`                   | 0-9 (even count)       | —                 |
| [ITF-14](/barcodes/itf)                        | `itf14`                 | 0-9 (13-14 digits)     | Auto (mod 10)     |
| [Codabar](/barcodes/codabar)                   | `codabar`               | 0-9, -$:/.+            | —                 |
| [MSI Plessey](/barcodes/msi)                   | `msi`                   | 0-9                    | Configurable      |
| [Pharmacode](/barcodes/pharmacode)             | `pharmacode`            | 3-131070               | —                 |
| [Code 11](/barcodes/code11)                    | `code11`                | 0-9, -                 | Auto (C + K)      |
| [GS1-128](/barcodes/gs1-128)                   | `gs1-128`               | AI-based               | Auto              |
| [Identcode](/barcodes/deutsche-post)           | `identcode`             | 0-9 (11-12 digits)     | Auto (mod 10)     |
| [Leitcode](/barcodes/deutsche-post)            | `leitcode`              | 0-9 (13-14 digits)     | Auto (mod 10)     |
| [Plessey](/barcodes/plessey)                   | `plessey`               | 0-9, A-F               | Auto (CRC)        |
| [GS1 DataBar Omni](/barcodes/gs1-databar)      | `gs1-databar`           | 0-9 (13-14 digits)     | Auto              |
| [GS1 DataBar Truncated](/barcodes/gs1-databar) | `gs1-databar-truncated` | 0-9 (13-14 digits)     | Auto              |
| [GS1 DataBar Limited](/barcodes/gs1-databar)   | `gs1-databar-limited`   | 0-9 (indicator 0/1)    | Auto              |
| [GS1 DataBar Expanded](/barcodes/gs1-databar)  | `gs1-databar-expanded`  | AI-based               | Auto              |
| [EAN-14](/barcodes/gs1-shipping)               | `ean14`                 | 0-9 (13-14 digits)     | Auto (mod 10)     |
| [SSCC-18](/barcodes/gs1-shipping)              | `sscc18`                | 0-9 (17-18 digits)     | Auto (mod 10)     |
| [ISBN](/barcodes/isbn)                         | `isbn`                  | ISBN-10 or ISBN-13     | Auto (mod 10)     |
| [ISSN](/barcodes/isbn)                         | `issn`                  | ISSN, 8 characters     | Auto (mod 10)     |
| [ISMN](/barcodes/isbn)                         | `ismn`                  | ISMN, M- or 9790-      | Auto (mod 10)     |
| [Code 32](/barcodes/pharma-national)           | `code32`                | 0-9 (8-9 digits)       | Auto (Luhn)       |
| [PZN-7](/barcodes/pharma-national)             | `pzn`                   | 0-9 (6-7 digits)       | Auto (mod 11)     |
| [PZN-8](/barcodes/pharma-national)             | `pzn8`                  | 0-9 (7-8 digits)       | Auto (mod 11)     |
| [Industrial 2 of 5](/barcodes/code2of5)        | `industrial2of5`        | 0-9                    | Optional (mod 10) |
| [IATA 2 of 5](/barcodes/code2of5)              | `iata2of5`              | 0-9                    | Optional (mod 10) |
| [Matrix 2 of 5](/barcodes/code2of5)            | `matrix2of5`            | 0-9                    | Optional (mod 10) |
| [COOP 2 of 5](/barcodes/code2of5)              | `coop2of5`              | 0-9                    | Optional (mod 10) |
| [Datalogic 2 of 5](/barcodes/code2of5)         | `datalogic2of5`         | 0-9                    | Optional (mod 10) |
| [POSTNET](/postal/postnet-planet)              | `postnet`               | 0-9 (5, 9 or 11)       | Auto (mod 10)     |
| [PLANET](/postal/postnet-planet)               | `planet`                | 0-9 (11 or 13)         | Auto (mod 10)     |

POSTNET and PLANET are height-modulated: `barcode()` routes them to the
[postal renderer](/postal/), which also covers RM4SCC, KIX, Australia Post,
Japan Post and USPS Intelligent Mail.

The three stacked [GS1 DataBar](/barcodes/gs1-databar) variants return a module
matrix rather than bar widths, so they have their own functions —
`gs1databarStacked()`, `gs1databarStackedOmni()` and
`gs1databarExpandedStacked()` — instead of a `barcode()` type.

Some formats are data layers rather than symbologies: they produce a **string**
that you then encode with one of the types above.

| Layer                                    | Functions                                                              |
| :--------------------------------------- | :--------------------------------------------------------------------- |
| [HIBC](/barcodes/hibc)                   | `encodeHIBCPrimary`, `encodeHIBCSecondary`, `encodeHIBCConcatenated`   |
| [ISBT 128](/barcodes/isbt128)            | `encodeISBT128DIN`, `encodeISBT128Component`, `encodeISBT128Expiry`, … |
| [GS1 Composite](/barcodes/gs1-composite) | `encodeGS1Composite` — returns the 2D component of a composite symbol  |

## Common Options

Every `barcode()` call takes the encoding options for its type plus the shared
rendering options below. They are the `BarcodeSVGOptions` set, and the postal
renderer accepts most of them too — see [Postal](/postal/) for its differences.

| Option                                    | Type                                   | Default     | Description                                     |
| :---------------------------------------- | :------------------------------------- | :---------- | :---------------------------------------------- |
| `height`                                  | `number`                               | `80`        | Bar height in units                             |
| `moduleSize`                              | `number`                               | `2`         | Width of one module in units                    |
| `barWidth`                                | `number`                               | —           | Deprecated alias for `moduleSize`; wins if set  |
| `barGap`                                  | `number`                               | `0`         | Extra spacing between bars, halved on each side |
| `color`                                   | `string`                               | `#000`      | Bar colour                                      |
| `background`                              | `string`                               | `#fff`      | Background; `transparent` omits the rect        |
| `showText`                                | `boolean`                              | `false`     | Render the human-readable text                  |
| `text`                                    | `string`                               | the input   | Override the displayed text                     |
| `fontSize`                                | `number`                               | `14`        | Text size                                       |
| `fontFamily`                              | `string`                               | `monospace` | Text font                                       |
| `textAlign`                               | `"center" \| "left" \| "right"`        | `"center"`  | Text alignment                                  |
| `textPosition`                            | `"bottom" \| "top"`                    | `"bottom"`  | Which side of the bars the text goes            |
| `margin`                                  | `number`                               | `10`        | Quiet zone on all sides                         |
| `marginTop` / `Bottom` / `Left` / `Right` | `number`                               | `margin`    | Per-side override                               |
| `rotation`                                | `0 \| 90 \| 180 \| 270`                | `0`         | Rotate the whole symbol                         |
| `unit`                                    | `"px" \| "mm" \| "cm" \| "in" \| "pt"` | `"px"`      | Unit for the width/height attributes            |
| `bearerBars`                              | `boolean`                              | `false`     | Draw bearer bars (ITF-14 and friends)           |
| `bearerBarWidth`                          | `number`                               | `4`         | Bearer bar thickness                            |
| `ariaLabel` / `role` / `title` / `desc`   | `string`                               | —           | Accessibility metadata                          |

```ts
import { barcode } from "etiket"

barcode("data", {
  type: "code128",
  height: 80,
  moduleSize: 2,
  color: "#000",
  background: "#fff",
  showText: true,
  text: "custom text",
  fontSize: 14,
  fontFamily: "monospace",
  margin: 10,
  textAlign: "center",
  textPosition: "top",
  rotation: 90,
})

// Print sizing: millimetres, with per-side quiet zones
barcode("4006381333931", {
  type: "ean13",
  unit: "mm",
  moduleSize: 0.33,
  height: 25,
  marginLeft: 3.63,
  marginRight: 2.31,
})
```

`BarcodeSVGOptions` also declares a `width` field, but the 1D renderer ignores
it: a linear symbol's width follows from its bar pattern and `moduleSize`. Set
`moduleSize` to size the symbol, or scale the returned SVG with CSS.
