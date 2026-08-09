# API Reference

Every symbol `etiket` exports, grouped by what it does — every function,
constant and type, with its signature and a worked example.

If you are looking for the exported **types**, see
[TypeScript types](/getting-started/typescript). For the payload helpers see
[Helpers](/getting-started/helpers), for the error classes
[Error handling](/getting-started/error-handling).

## Entry Points

Everything is available from the package root. The sub-paths exist so a bundle
that only draws QR codes does not carry the Data Matrix tables.

| Import              | Contains                                                                 |
| :------------------ | :----------------------------------------------------------------------- |
| `etiket`            | Everything below                                                         |
| `etiket/barcode`    | 1D barcodes, GS1 DataBar, industry encoders, validators, errors          |
| `etiket/postal`     | POSTNET, PLANET, RM4SCC, KIX, Australia Post, Japan Post, IMb            |
| `etiket/qr`         | QR, Micro QR, rMQR, the payload helpers, QR PNG, QR validation           |
| `etiket/2d`         | MaxiCode, DotCode, Han Xin, MicroPDF417, Codablock F, Code 16K, JAB Code |
| `etiket/datamatrix` | Data Matrix and GS1 Data Matrix                                          |
| `etiket/pdf417`     | PDF417 and MicroPDF417                                                   |
| `etiket/aztec`      | Aztec Code                                                               |
| `etiket/png`        | PNG output for every family                                              |
| `etiket/errors`     | `EtiketError` and its subclasses                                         |
| `etiket/validators` | `validateBarcode`, `validateQRInput` and friends                         |

```ts
import { barcode } from "etiket/barcode"
import { qrcode } from "etiket/qr"

barcode("SKU-001").startsWith("<svg") // true
qrcode("https://example.com").startsWith("<svg") // true
```

## 1D Barcodes

| Function                         | Returns    | Description                            |
| :------------------------------- | :--------- | :------------------------------------- |
| `barcode(text, options?)`        | `string`   | Linear barcode as an SVG document      |
| `barcodeDataURI(text, options?)` | `string`   | The same SVG as `data:image/svg+xml,…` |
| `barcodeBase64(text, options?)`  | `string`   | The same SVG as a base64 data URI      |
| `encodeBars(text, options?)`     | `number[]` | Bar/space widths, no rendering         |

```ts
barcode(text: string, options?: BarcodeOptions): string
encodeBars(text: string, options?: BarcodeEncodingOptions): number[]
```

`BarcodeOptions` is `BarcodeEncodingOptions & BarcodeSVGOptions` — the encoder
knobs and the renderer knobs in one object.

```ts
import { barcode, barcodeDataURI, barcodeBase64, encodeBars } from "etiket"

barcode("Hello World")
barcode("4006381333931", { type: "ean13", showText: true })
barcode("HELLO", { type: "code39", code39CheckDigit: true, height: 60 })

barcodeDataURI("SKU-001").startsWith("data:image/svg+xml,") // true
barcodeBase64("SKU-001").startsWith("data:image/svg+xml;base64,") // true

encodeBars("12345", { type: "code128" })
// [2, 1, 1, 2, 3, 2, ...] — alternating bar/space widths in modules
```

### Encoding options

| Option             | Type                                                     | Default     |
| :----------------- | :------------------------------------------------------- | :---------- |
| `type`             | [`BarcodeType`](#barcodetype)                            | `"code128"` |
| `code128Charset`   | `"auto" \| "A" \| "B" \| "C"`                            | `"auto"`    |
| `code39CheckDigit` | `boolean`                                                | `false`     |
| `msiCheckDigit`    | `"mod10" \| "mod11" \| "mod1010" \| "mod1110" \| "none"` | `"none"`    |
| `codabarStart`     | `string`                                                 | `"A"`       |
| `codabarStop`      | `string`                                                 | `"A"`       |

### SVG options

`BarcodeSVGOptions` — shared by `barcode()` and `renderBarcodeSVG()`.

| Option                                  | Type                            | Default         |
| :-------------------------------------- | :------------------------------ | :-------------- |
| `moduleSize`                            | `number`                        | `2`             |
| `barWidth`                              | `number` (deprecated alias)     | —               |
| `width`                                 | `number`                        | auto            |
| `height`                                | `number`                        | `100`           |
| `barGap`                                | `number`                        | `0`             |
| `unit`                                  | `MeasurementUnit`               | `"px"`          |
| `color` / `background`                  | `string`                        | `#000` / `#fff` |
| `showText` / `text`                     | `boolean` / `string`            | `false` / data  |
| `fontSize` / `fontFamily`               | `number` / `string`             | `14` / sans     |
| `textAlign`                             | `"center" \| "left" \| "right"` | `"center"`      |
| `textPosition`                          | `"bottom" \| "top"`             | `"bottom"`      |
| `rotation`                              | `0 \| 90 \| 180 \| 270`         | `0`             |
| `margin`, `marginTop/Bottom/Left/Right` | `number`                        | `10`            |
| `bearerBars` / `bearerBarWidth`         | `boolean` / `number`            | `false` / `4`   |
| `ariaLabel`, `role`, `title`, `desc`    | `string`                        | —               |

```ts
import { barcode } from "etiket"

barcode("1234567890123", {
  type: "itf14",
  moduleSize: 3,
  height: 80,
  barGap: 0.2,
  bearerBars: true,
  rotation: 90,
  textPosition: "top",
  showText: true,
  ariaLabel: "ITF-14 shipping code",
})
```

### BarcodeType

`code128`, `ean13`, `ean8`, `code39`, `code39ext`, `code93`, `code93ext`, `itf`,
`itf14`, `upca`, `upce`, `ean2`, `ean5`, `codabar`, `msi`, `pharmacode`,
`code11`, `gs1-128`, `identcode`, `leitcode`, `postnet`, `planet`, `plessey`,
`gs1-databar`, `gs1-databar-limited`, `gs1-databar-expanded`,
`gs1-databar-truncated`.

`postnet` and `planet` are height-modulated: `barcode()` quietly routes them
through the postal renderer, and `encodeBars()` throws for them.

## Postal

Height-modulated symbologies, where the data lives in each bar's vertical
extent rather than its width.

```ts
postal(text: string, options?: PostalOptions): string
postalDataURI(text: string, options?: PostalOptions): string
postalBase64(text: string, options?: PostalOptions): string
encodePostal(text: string, options?: PostalEncodingOptions): PostalBar[]
```

```ts
import { postal, postalDataURI, postalBase64, encodePostal } from "etiket"

postal("12345-6789", { type: "postnet" })
postal("SN34RD1A", { type: "rm4scc", height: 30 })
postal("12345678", { type: "auspost", fcc: "11" })
postal("01234567094987654321", { type: "imb", routingCode: "01234567891" })

postalDataURI("12345678901", { type: "planet" }).startsWith("data:image/svg+xml,") // true
postalBase64("12345", { type: "postnet" }).includes("base64") // true

encodePostal("SN34RD1A", { type: "rm4scc" })
// ["F", "A", "T", ...] — 4-state letters
encodePostal("12345", { type: "postnet" })
// [1, 0, 1, ...] — 1 = tall, 0 = short
```

| Option        | Type                                                                           | Default     |
| :------------ | :----------------------------------------------------------------------------- | :---------- |
| `type`        | `"postnet" \| "planet" \| "rm4scc" \| "kix" \| "auspost" \| "jppost" \| "imb"` | `"postnet"` |
| `fcc`         | `string` — Australia Post Format Control Code                                  | `"11"`      |
| `routingCode` | `string` — IMb routing code, or the Japan Post address field                   | `""`        |

The renderer half (`PostalSVGOptions`) adds `height`, `moduleSize`, `pitch`,
`trackerRatio`, `shortRatio`, `color`, `background`, `unit`, the four margins,
`showText`, `text`, `fontSize`, `fontFamily` and the accessibility fields.

```ts
import { postal } from "etiket"

postal("SN34RD1A", {
  type: "rm4scc",
  height: 40,
  moduleSize: 2,
  pitch: 4,
  trackerRatio: 1 / 3,
  showText: true,
  text: "SN34 RD1A",
})
```

## QR Codes

```ts
qrcode(text: string, options?: QRCodeSVGOptions & QRCodeOptions): string
qrcodeDataURI(text: string, options?: QRCodeSVGOptions & QRCodeOptions): string
qrcodeBase64(text: string, options?: QRCodeSVGOptions & QRCodeOptions): string
qrcodeTerminal(text: string, options?: QRCodeOptions): string
```

```ts
import { qrcode, qrcodeDataURI, qrcodeBase64, qrcodeTerminal } from "etiket"

qrcode("https://example.com")
qrcode("https://example.com", { ecLevel: "H", size: 400, dotType: "dots" })
qrcodeDataURI("Hello").startsWith("data:image/svg+xml,") // true
qrcodeBase64("Hello").startsWith("data:image/svg+xml;base64,") // true
qrcodeTerminal("Hello").split("\n").length > 1 // true
```

Encoder options (`QRCodeOptions`): `ecLevel`, `version`, `mode`, `mask`,
`micro`, `eci`, `gs1`, `applicationIndicator`, `structuredAppend`.
Renderer options (`QRCodeSVGOptions`): `size`, `margin`, `unit`, `color`,
`background`, `dotType`, `dotSize`, `shape`, `corners`, `logo`,
`xmlDeclaration` and the accessibility fields. Both are described in
[TypeScript types](/getting-started/typescript).

Passing a `logo` without an explicit `ecLevel` upgrades the symbol to EC `H`,
because the logo covers modules.

## 2D and Stacked Symbologies

Every one of these returns an SVG string and takes
[`MatrixSVGOptions`](/getting-started/typescript#matrixsvgoptions) —
`size`, `margin`, `color`, `background`, `rowHeight`, `rowHeights` and the
accessibility fields — on top of its own encoder options.

| Function                                    | Encoder options                                                 |
| :------------------------------------------ | :-------------------------------------------------------------- |
| `datamatrix(text, options?)`                | `shape`, `dmre`, `symbolSize`, `eci`                            |
| `gs1datamatrix(text, options?)`             | `shape`, `dmre`, `symbolSize`                                   |
| `pdf417(text, options?)`                    | `ecLevel`, `columns`, `compact`, `eci`, plus `width` / `height` |
| `micropdf417(text, options?)`               | `columns`                                                       |
| `aztec(text, options?)`                     | `ecPercent`, `layers`, `compact`, `eci`                         |
| `microqr(text, options?)`                   | `version`, `ecLevel`, `mask`                                    |
| `rmqr(text, options?)`                      | `version`, `ecLevel`                                            |
| `maxicode(text, options?)`                  | `mode`, `postalCode`, `countryCode`, `serviceClass`             |
| `dotcode(text, options?)`                   | `rows`, `columns`, `mask`                                       |
| `hanxin(text, options?)`                    | `version`, `ecLevel`                                            |
| `codablockf(text, options?)`                | `columns`                                                       |
| `code16k(text, options?)`                   | —                                                               |
| `jabcode(text, options?)`                   | `colors`, `ecPercent`, `palette`                                |
| `gs1databarStacked(text, options?)`         | —                                                               |
| `gs1databarStackedOmni(text, options?)`     | —                                                               |
| `gs1databarExpandedStacked(text, options?)` | `segments`                                                      |
| `gs1composite(linearType, data, options?)`  | `type`, `columns`, `linear`, `linearWidth`                      |

```ts
import {
  datamatrix,
  gs1datamatrix,
  pdf417,
  micropdf417,
  aztec,
  microqr,
  rmqr,
  maxicode,
  dotcode,
  hanxin,
  codablockf,
  code16k,
  jabcode,
  gs1databarStacked,
  gs1databarStackedOmni,
  gs1databarExpandedStacked,
  gs1composite,
} from "etiket"

datamatrix("Hello", { shape: "rectangle", dmre: true, size: 200 })
gs1datamatrix("(01)09501101020917(10)LOT42")
pdf417("Hello", { columns: 4, ecLevel: 3, width: 400 })
micropdf417("Hello", { columns: 2 })
aztec("Hello", { ecPercent: 33 })
microqr("12345", { version: 2, ecLevel: "L" })
rmqr("Hello", { ecLevel: "M" })
maxicode("Hello", { mode: 4 })
dotcode("Hello")
hanxin("Hello", { ecLevel: 2 })
codablockf("Hello World", { columns: 8 })
code16k("Hello")
jabcode("Hello", { colors: 8 })
gs1databarStacked("0361414199999")
gs1databarStackedOmni("0361414199999")
gs1databarExpandedStacked("(01)90012345678908(3103)001750", { segments: 4 })
gs1composite("databar-omni", "(01)09521234543213|(11)990102")
```

`gs1composite()` is the odd one out: it takes the linear symbology as its first
argument and a `"<linear data>|<composite data>"` string as its second, and
returns the complete symbol — the linear component with its linkage flag set,
the separator, and the 2D component above it. The primary can be `ean13`,
`ean8`, `upca`, `upce`, `gs1-128` or any of the DataBar family: `databar-omni`,
`databar-truncated`, `databar-limited`, `databar-stacked`,
`databar-stacked-omni`, `databar-expanded` and `databar-expanded-stacked`.
Only a `gs1-128` primary can carry a CC-C component.

MaxiCode modes 2 and 3 carry a structured primary message and need the postal
fields; a malformed postal code is an error rather than a silently mangled
symbol.

```ts
import { maxicode } from "etiket"

maxicode("UPS shipment", {
  mode: 2,
  postalCode: "123456789",
  countryCode: 840,
  serviceClass: 1,
})
```

JAB Code is polychrome and goes through its own renderer, so it takes
`ColorMatrixSVGOptions` (`MatrixSVGOptions` plus `palette`).

## Raw Encoding

```ts
encode(text: string, options?: EncodeOptions): EncodeResult
```

`encode()` skips rendering and hands back the underlying data. The result is a
discriminated union, so the family is always explicit.

```ts
import { encode } from "etiket"

const result = encode("Hello", { type: "qr", qr: { ecLevel: "H" } })

if (result.type === "2d") {
  result.matrix.length // module rows
}

encode("12345", { type: "code128" }).type // "1d"
encode("12345", { type: "postnet" }).type // "postal"
encode("Hello", { type: "pdf417", pdf417: { columns: 4 } }).type // "2d"
encode("12345678", { type: "auspost", fcc: "11" }).type // "postal"
```

Per-symbology encoder options go in a namespaced field: `qr`, `microqr`,
`rmqr`, `datamatrix`, `pdf417`, `micropdf417`, `aztec`, `maxicode`, `hanxin`,
`codablockf`. The 1D options (`code128Charset`, `msiCheckDigit`, …) sit at the
top level, as do `fcc` and `routingCode`.

`encode()`'s 1D branch calls `encodeBars()`, so the two can never disagree about
how a given input is encoded.

## Payload Helpers

Each returns a rendered QR SVG. Full detail and realistic payloads in
[Helpers](/getting-started/helpers).

| Function                       | Payload                        |
| :----------------------------- | :----------------------------- |
| `url(url, options?)`           | The URL as-is                  |
| `email(address, options?)`     | `mailto:`                      |
| `phone(number, options?)`      | `tel:`                         |
| `sms(number, body?, options?)` | `sms:` with an optional body   |
| `geo(lat, lng, options?)`      | `geo:`                         |
| `wifi(ssid, password, opts?)`  | `WIFI:` join string            |
| `vcard(contact, options?)`     | vCard 3.0                      |
| `mecard(contact, options?)`    | MeCard                         |
| `event(event, options?)`       | iCalendar `VEVENT`             |
| `swissQR(data, options?)`      | Swiss QR-bill payload          |
| `gs1DigitalLink(data, opts?)`  | GS1 Digital Link URL           |
| `gs1qr(text, options?)`        | GS1 element strings under FNC1 |

## Batch and Label Sheets

```ts
barcodes(values: string[], options?: BarcodeOptions & BatchOptions): string[]
qrcodes(values: string[], options?: QRCodeSVGOptions & QRCodeOptions & BatchOptions): string[]
barcodeSheet(values: string[], options?: BarcodeSheetOptions): string
qrcodeSheet(values: string[], options?: QRCodeSheetOptions): string
```

`barcodes()` and `qrcodes()` are a loop with an `onProgress` callback.
`barcodeSheet()` and `qrcodeSheet()` are the reason the API exists: one SVG
document holding a grid of symbols, which is what a print workflow needs.

```ts
import { barcodes, qrcodes, barcodeSheet, qrcodeSheet } from "etiket"

const svgs = barcodes(["SKU-001", "SKU-002"], {
  type: "code128",
  height: 50,
  onProgress: (done, total) => {
    void `${done}/${total}`
  },
})
svgs.length // 2

qrcodes(["https://example.com/1", "https://example.com/2"], { size: 200 }).length // 2

const sheet = barcodeSheet(["SKU-001", "SKU-002", "SKU-003", "SKU-004"], {
  type: "code128",
  columns: 2,
  gap: 10,
  padding: 20,
  background: "#ffffff",
  labelSize: 9,
  ariaLabel: "Warehouse label sheet",
})
sheet.startsWith("<svg") // true

qrcodeSheet(["T-1", "T-2", "T-3"], { columns: 3, labels: ["Row A", "Row B", "Row C"] })
qrcodeSheet(["T-1", "T-2"], { labels: false }) // no captions
```

`SheetOptions`: `columns` (default 2), `gap` (10), `padding` (`gap`),
`background` (`#fff`, or `"transparent"`), `labels` (the values, or `false`),
`labelSize` (10), `labelFont`, `ariaLabel`. An empty `values` array and a
non-positive `columns` both throw `InvalidInputError`.

## PNG Output

Every family has a `*PNG` function returning a `Uint8Array` and a matching
`*PNGDataURI` returning `data:image/png;base64,…`. See
[PNG output](/rendering/png) for the options and the pixel format.

| Family      | `*PNG`                                                                             | `*PNGDataURI`                                                                                           |
| :---------- | :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| 1D          | `barcodePNG`                                                                       | `barcodePNGDataURI`                                                                                     |
| Postal      | `postalPNG`                                                                        | `postalPNGDataURI`                                                                                      |
| QR          | `qrcodePNG`, `microqrPNG`, `rmqrPNG`                                               | `qrcodePNGDataURI`, `microqrPNGDataURI`, `rmqrPNGDataURI`                                               |
| Data Matrix | `datamatrixPNG`, `gs1datamatrixPNG`                                                | `datamatrixPNGDataURI`, `gs1datamatrixPNGDataURI`                                                       |
| PDF417      | `pdf417PNG`, `micropdf417PNG`                                                      | `pdf417PNGDataURI`, `micropdf417PNGDataURI`                                                             |
| Aztec       | `aztecPNG`                                                                         | `aztecPNGDataURI`                                                                                       |
| Stacked     | `codablockfPNG`, `code16kPNG`                                                      | `codablockfPNGDataURI`, `code16kPNGDataURI`                                                             |
| Other       | `maxicodePNG`, `dotcodePNG`, `hanxinPNG`, `jabcodePNG`                             | `maxicodePNGDataURI`, `dotcodePNGDataURI`, `hanxinPNGDataURI`, `jabcodePNGDataURI`                      |
| DataBar     | `gs1databarStackedPNG`, `gs1databarStackedOmniPNG`, `gs1databarExpandedStackedPNG` | `gs1databarStackedPNGDataURI`, `gs1databarStackedOmniPNGDataURI`, `gs1databarExpandedStackedPNGDataURI` |
| Composite   | `gs1compositePNG`                                                                  | `gs1compositePNGDataURI`                                                                                |

```ts
import { qrcodePNG, barcodePNG, qrcodePNGDataURI } from "etiket"

qrcodePNG("Hello", { moduleSize: 8, margin: 4 }) instanceof Uint8Array // true
barcodePNG("12345", { moduleSize: 3, height: 100 }) instanceof Uint8Array // true
qrcodePNGDataURI("Hello").startsWith("data:image/png;base64,") // true
```

`gs1compositePNG` and `gs1compositePNGDataURI` take the linear symbology first,
matching `gs1composite()`:

```ts
import { gs1compositePNG, gs1compositePNGDataURI } from "etiket"

gs1compositePNG("databar-omni", "(01)09521234543213|(11)990102", { moduleSize: 4 })

const uri = gs1compositePNGDataURI("databar-omni", "(01)09521234543213|(11)990102")
uri.startsWith("data:image/png;base64,") // true
```

## Renderers

SVG renderers take already-encoded data. See
[Low-level renderers](/rendering/low-level) for signatures and worked examples.

| Function                                          | Input                          |
| :------------------------------------------------ | :----------------------------- |
| `renderBarcodeSVG(bars, options?)`                | `number[]` bar widths          |
| `renderPostalSVG(bars, options?)`                 | `PostalBar[]`                  |
| `renderQRCodeSVG(matrix, options?)`               | `boolean[][]`, QR styling      |
| `renderMatrixSVG(matrix, options?)`               | `boolean[][]`                  |
| `renderMaxiCodeSVG(matrix, options?)`             | `boolean[][]`, hexagonal grid  |
| `renderColorMatrixSVG(matrix, palette, options?)` | `number[][]` palette indices   |
| `renderText(matrix, options?)`                    | `boolean[][]` → Unicode blocks |
| `svgToDataURI(svg)`                               | SVG string                     |
| `svgToBase64(svg)`                                | SVG string                     |
| `svgToBase64Raw(svg)`                             | SVG string, no `data:` prefix  |
| `optimizeSVG(svg, options?)`                      | SVG string                     |

Rasterizers and the PNG chunk writer: `renderBarcodeRaster`,
`renderMatrixRaster`, `renderPostalRaster`, `renderMaxiCodeRaster` (returning
[`RasterData`](/getting-started/typescript#rasterdata)), `renderBarcodePNG`,
`renderMatrixPNG`, `renderPostalPNG`, `renderMaxiCodePNG` and `encodePNG`.

## Validation

```ts
validateBarcode(text: string, type: string): { valid: boolean; error?: string }
validateBarcodeInput(text: string, type: string): { valid: boolean; error?: string; checkDigit?: number }
isValidInput(text: string, type: string): boolean
validateQRInput(text: string, ecLevel?: ErrorCorrectionLevel): QRValidationResult
calculateEANCheckDigit(digits: number[]): number
verifyEANCheckDigit(text: string): boolean
```

```ts
import {
  validateBarcode,
  validateBarcodeInput,
  isValidInput,
  validateQRInput,
  calculateEANCheckDigit,
  verifyEANCheckDigit,
} from "etiket"

validateBarcode("4006381333931", "ean13") // { valid: true }
validateBarcode("ABC", "ean13").error // "EAN-13 requires 12 or 13 digits"
validateBarcode("anything", "not-a-symbology").error // "Unknown barcode type: not-a-symbology"

validateBarcodeInput("400638133393", "ean13").checkDigit // 1
isValidInput("HELLO", "code39") // true

validateQRInput("Hello World", "M").version // 1

calculateEANCheckDigit([4, 0, 0, 6, 3, 8, 1, 3, 3, 3, 9, 3]) // 1
verifyEANCheckDigit("4006381333931") // true
```

`validateBarcodeInput()` adds the check digit the data implies for `ean13`,
`ean8`, `upca`, `upce`, `itf14`, `identcode`, `leitcode`, `postnet` and
`planet`. More in [Input validation](/getting-started/validation).

## Errors

`EtiketError` ← `InvalidInputError` ← `CheckDigitError`, and `EtiketError` ←
`CapacityError`. Every reachable throw is one of these. See
[Error handling](/getting-started/error-handling).

## Raw Encoders

The encoders behind the high-level functions. Use them when you want the data
without etiket's renderer.

### Linear

| Function                                            | Returns                                                |
| :-------------------------------------------------- | :----------------------------------------------------- |
| `encodeCode128(text, options?)`                     | `number[]`                                             |
| `encodeEAN13(text)` / `encodeEAN8(text)`            | `{ bars: number[]; guards: number[] }`                 |
| `encodeUPCA(text)` / `encodeUPCE(text)`             | `{ bars: number[]; guards: number[] }`                 |
| `encodeEAN2(text)` / `encodeEAN5(text)`             | `number[]`                                             |
| `encodeCode39(text, options?)`                      | `number[]`                                             |
| `encodeCode39Extended(text, options?)`              | `number[]`                                             |
| `encodeCode93(text)` / `encodeCode93Extended(text)` | `number[]`                                             |
| `encodeITF(text)` / `encodeITF14(text)`             | `number[]`                                             |
| `encodeCodabar(text, options?)`                     | `number[]`                                             |
| `encodeMSI(text, options?)`                         | `number[]`                                             |
| `encodePharmacode(value)`                           | `number[]` — takes a **number**                        |
| `encodeCode11(text)`                                | `number[]`                                             |
| `encodeGS1128(text, options?)`                      | `number[]` — `options.linkage` sets the composite flag |
| `encodeIdentcode(text)` / `encodeLeitcode(text)`    | `number[]`                                             |
| `encodePlessey(text)`                               | `number[]`                                             |

```ts
import {
  encodeCode128,
  encodeEAN13,
  encodeUPCA,
  encodeEAN5,
  encodeCode39,
  encodeCode93Extended,
  encodeITF14,
  encodeCodabar,
  encodeMSI,
  encodePharmacode,
  encodeCode11,
  encodeGS1128,
  encodeIdentcode,
  encodeLeitcode,
  encodePlessey,
} from "etiket"

encodeCode128("Hello", { charset: "B" })
encodeEAN13("400638133393").guards // guard bar indices
encodeUPCA("03600029145").bars
encodeEAN5("52495")
encodeCode39("HELLO", { checkDigit: true })
encodeCode93Extended("Hello")
encodeITF14("1234567890123")
encodeCodabar("12345", { start: "A", stop: "B" })
encodeMSI("1234", { checkDigit: "mod1010" })
encodePharmacode(1234)
encodeCode11("1234-5")
encodeGS1128("(01)09501101020917(10)LOT42")
encodeIdentcode("56312300001")
encodeLeitcode("2131500001234")
encodePlessey("12345")
```

### GS1 DataBar and Composite

| Function                                               | Returns                                          |
| :----------------------------------------------------- | :----------------------------------------------- |
| `encodeGS1DataBarOmni(gtin, options?)`                 | `number[]`                                       |
| `encodeGS1DataBarTruncated(gtin, options?)`            | `number[]`                                       |
| `encodeGS1DataBarLimited(gtin, options?)`              | `number[]`                                       |
| `encodeGS1DataBarExpanded(data, options?)`             | `number[]`                                       |
| `encodeGS1DataBarStacked(gtin, options?)`              | `boolean[][]`                                    |
| `encodeGS1DataBarStackedOmni(gtin, options?)`          | `boolean[][]`                                    |
| `encodeGS1DataBarExpandedStacked(data, options?)`      | `boolean[][]`                                    |
| `encodeGS1Composite(data, options?)`                   | `GS1CompositeResult` — the 2D component only     |
| `encodeGS1CompositeSymbol(linearType, data, options?)` | `GS1CompositeSymbolResult` — the complete symbol |

Every DataBar encoder takes `{ linkage?: boolean }`, which sets the flag saying
a 2D composite component sits above the symbol. Expanded Stacked also takes
`segments` (even, 2–22, default 4).

```ts
import {
  encodeGS1DataBarOmni,
  encodeGS1DataBarTruncated,
  encodeGS1DataBarLimited,
  encodeGS1DataBarExpanded,
  encodeGS1DataBarStacked,
  encodeGS1DataBarStackedOmni,
  encodeGS1DataBarExpandedStacked,
  encodeGS1Composite,
  encodeGS1CompositeSymbol,
} from "etiket"

encodeGS1DataBarOmni("0361414199999")
encodeGS1DataBarTruncated("0361414199999")
encodeGS1DataBarLimited("0161414199999")
encodeGS1DataBarExpanded("(01)90012345678908")
encodeGS1DataBarStacked("0361414199999").length // module rows
encodeGS1DataBarStackedOmni("0361414199999", { linkage: true }).length
encodeGS1DataBarExpandedStacked("(01)90012345678908(3103)001750", { segments: 4 })

const composite = encodeGS1Composite("(17)260101(10)BATCH01", { type: "CC-A", columns: 4 })
composite.type // "CC-A", or an automatic upgrade when the data overflows
composite.rows
composite.cols
composite.columns
composite.composite // boolean[][]

const symbol = encodeGS1CompositeSymbol("databar-omni", "(01)09521234543213|(11)990102")
symbol.linearType // "databar-omni"
symbol.matrix.length === symbol.rowHeights.length // true
symbol.linear.length > 0 // true — the linear component's bar/space widths
symbol.linearOffset >= 0 // true
```

`encodeGS1CompositeSymbol()` splits its `data` argument on `|`: the linear
component's element string comes first, the composite component's second. It
returns the whole symbol — `matrix` with a `rowHeights` entry per row — plus the
pieces (`composite`, `separator`, `linear`) if you want to lay them out
yourself.

### Postal

| Function                                              | Returns                      |
| :---------------------------------------------------- | :--------------------------- |
| `encodePOSTNET(zip)` / `encodePLANET(code)`           | `number[]` — 1 tall, 0 short |
| `encodeRM4SCC(text)` / `encodeKIX(text)`              | `FourState[]`                |
| `encodeAustraliaPost(fcc, dpid, custInfo?, options?)` | `FourState[]`                |
| `encodeJapanPost(zipcode, address?)`                  | `FourState[]`                |
| `encodeIMb(trackingCode, routingCode?)`               | `FourState[]`                |

```ts
import {
  encodePOSTNET,
  encodePLANET,
  encodeRM4SCC,
  encodeKIX,
  encodeAustraliaPost,
  encodeJapanPost,
  encodeIMb,
} from "etiket"

encodePOSTNET("12345-6789")
encodePLANET("12345678901")
encodeRM4SCC("SN34RD1A")
encodeKIX("2500GG75XX")
encodeAustraliaPost("59", "12345678", "ABC", { custInfoEncoding: "character" })
encodeJapanPost("1234567", "1-2-3")
encodeIMb("01234567094987654321", "01234567891")
```

`encodeAustraliaPost` accepts FCC `"11"`, `"45"`, `"59"`, `"62"`, `"87"` and
`"92"`; `custInfoEncoding` is `"character"` (3 bars per character, the default)
or `"numeric"` (2 bars per digit).

### 2D

| Function                               | Returns                                   |
| :------------------------------------- | :---------------------------------------- |
| `encodeQR(text, options?)`             | `boolean[][]`                             |
| `encodeQRSequence(text, options?)`     | `boolean[][][]`                           |
| `encodeMicroQR(text, options?)`        | `boolean[][]`                             |
| `encodeRMQR(text, options?)`           | `boolean[][]`                             |
| `encodeDataMatrix(text, options?)`     | `boolean[][]`                             |
| `encodeGS1DataMatrix(text, options?)`  | `boolean[][]`                             |
| `encodePDF417(text, options?)`         | `{ matrix, rows, cols }`                  |
| `encodePDF417Sequence(text, options?)` | `{ matrix, rows, cols }[]` — Macro PDF417 |
| `encodeMicroPDF417(text, options?)`    | `{ matrix, rows, cols }`                  |
| `encodeAztec(text, options?)`          | `boolean[][]`                             |
| `encodeMaxiCode(text, options?)`       | `boolean[][]` — 33×30                     |
| `encodeDotCode(text, options?)`        | `boolean[][]`                             |
| `encodeHanXin(text, options?)`         | `boolean[][]`                             |
| `encodeCodablockF(text, options?)`     | `{ matrix, rows, cols, separatorRows }`   |
| `encodeCode16K(text)`                  | `{ matrix, rows, cols, separatorRows }`   |
| `encodeJABCode(text, options?)`        | `JABCodeResult`                           |

```ts
import {
  encodeQR,
  encodeQRSequence,
  encodeMicroQR,
  encodeRMQR,
  encodeDataMatrix,
  encodeGS1DataMatrix,
  encodePDF417,
  encodePDF417Sequence,
  encodeMicroPDF417,
  encodeAztec,
  encodeMaxiCode,
  encodeDotCode,
  encodeHanXin,
  encodeCodablockF,
  encodeCode16K,
  encodeJABCode,
} from "etiket"

encodeQR("Hello", { ecLevel: "H", mode: "byte" }).length // 21 for version 1
encodeQRSequence("A".repeat(200), { symbols: 3 }).length // 3
encodeMicroQR("12345", { version: 2, ecLevel: "L" })
encodeRMQR("Hello", { ecLevel: "M" })
encodeDataMatrix("Hello", { shape: "auto", dmre: true })
encodeGS1DataMatrix("(01)09501101020917")
encodePDF417("Hello", { columns: 4 }).rows
encodePDF417Sequence("A".repeat(3000), { symbols: 3 }).length // 3
encodeMicroPDF417("Hello", { columns: 2 }).cols
encodeAztec("Hello", { ecPercent: 33 })
encodeMaxiCode("Hello", { mode: 4 }).length // 33
encodeDotCode("Hello")
encodeHanXin("Hello", { ecLevel: 2 })

const codablock = encodeCodablockF("Hello World", { columns: 8 })
codablock.matrix.length === 2 * codablock.rows + 1 // true — separators included
codablock.separatorRows.length // 1-module rows

const c16k = encodeCode16K("Hello")
c16k.matrix.length === 2 * c16k.rows + 1 // true

const jab = encodeJABCode("Hello", { colors: 8 })
jab.palette.length // 8
```

### Data-Format Encoders

These return a **string** to feed into a symbology, not a bar pattern.

| Function                                                              | Returns                        |
| :-------------------------------------------------------------------- | :----------------------------- |
| `encodeHIBCPrimary(lic, product, unitOfMeasure?)`                     | `string`                       |
| `encodeHIBCSecondary(expiry?, lot?)`                                  | `string`                       |
| `encodeHIBCConcatenated(lic, product, options?)`                      | `string`                       |
| `encodeISBT128DIN(countryCode, facilityNumber, year, donationNumber)` | `string`                       |
| `encodeISBT128Component(productCode)`                                 | `string`                       |
| `encodeISBT128Expiry(date)`                                           | `string`                       |
| `encodeISBT128BloodGroup(bloodGroup)`                                 | `string`                       |
| `iso7064Mod37_2(data)`                                                | `string` — one check character |

```ts
import {
  barcode,
  encodeHIBCPrimary,
  encodeHIBCSecondary,
  encodeHIBCConcatenated,
  encodeISBT128DIN,
  encodeISBT128Component,
  encodeISBT128Expiry,
  encodeISBT128BloodGroup,
  iso7064Mod37_2,
} from "etiket"

const primary = encodeHIBCPrimary("A123", "12345", 0)
primary // "+A123123450T"
barcode(primary, { type: "code128" }).startsWith("<svg") // true

encodeHIBCSecondary("251231", "LOT42")
encodeHIBCConcatenated("A123", "12345", { expiry: "251231", lot: "LOT42" })

encodeISBT128DIN("US", "12345", "24", "000001") // "=US12345240000016"
encodeISBT128Component("E0791")
encodeISBT128Expiry("251231") // "&251231"
encodeISBT128BloodGroup("51") // "%51"
iso7064Mod37_2("US1234524000001").length // 1
```

## Constants

| Constant                  | Type                    | What it is                                                  |
| :------------------------ | :---------------------- | :---------------------------------------------------------- |
| `JAB_COLORS_4`            | `readonly string[]`     | The 4-colour JAB Code palette                               |
| `JAB_COLORS_8`            | `readonly string[]`     | The 8-colour JAB Code palette                               |
| `DATAMATRIX_SYMBOL_SIZES` | `readonly SymbolSize[]` | Every Data Matrix symbol size, square, rectangular and DMRE |

```ts
import { JAB_COLORS_4, JAB_COLORS_8, DATAMATRIX_SYMBOL_SIZES, jabcode } from "etiket"

JAB_COLORS_4.length // 4
JAB_COLORS_8.length // 8
jabcode("Hello", { palette: JAB_COLORS_8, colors: 8 })

DATAMATRIX_SYMBOL_SIZES.filter((s) => s.dmre).length // the ISO 21471 sizes
DATAMATRIX_SYMBOL_SIZES[0]?.rows // 10
```

`BARCODE_TYPES` and `ENCODE_TYPES` are the runtime counterparts of the
`BarcodeType` and `EncodeType` unions — the list a `<select>` or a CLI
completion needs, without hand-maintaining a second copy.

```ts
import { BARCODE_TYPES, ENCODE_TYPES, barcode } from "etiket"

BARCODE_TYPES.includes("code128") // true
ENCODE_TYPES.length > BARCODE_TYPES.length // true

for (const type of BARCODE_TYPES.slice(0, 1)) {
  barcode("12345678", { type }).startsWith("<svg") // true
}
```
