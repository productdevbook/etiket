<p align="center">
  <br>
  <b style="font-size: 2em;">etiket</b>
  <br><br>
  Zero-dependency barcode & QR code SVG generator.
  <br>
  40+ formats, styled QR codes, tree-shakeable. Pure TypeScript, works everywhere.
  <br><br>
  <a href="https://npmjs.com/package/etiket"><img src="https://img.shields.io/npm/v/etiket?style=flat&colorA=18181B&colorB=F0DB4F" alt="npm version"></a>
  <a href="https://npmjs.com/package/etiket"><img src="https://img.shields.io/npm/dm/etiket?style=flat&colorA=18181B&colorB=F0DB4F" alt="npm downloads"></a>
  <a href="https://bundlephobia.com/result?p=etiket"><img src="https://img.shields.io/bundlephobia/minzip/etiket?style=flat&colorA=18181B&colorB=F0DB4F" alt="bundle size"></a>
  <a href="https://github.com/productdevbook/etiket/blob/main/LICENSE"><img src="https://img.shields.io/github/license/productdevbook/etiket?style=flat&colorA=18181B&colorB=F0DB4F" alt="license"></a>
</p>

> [!IMPORTANT]
> **Scan-verified formats (16):** QR Code, Data Matrix, PDF417, Aztec, Micro QR, rMQR, MaxiCode, Code 128, EAN-13, EAN-8, UPC-A, Code 39, Code 93, ITF, Codabar, GS1-128 — all verified with round-trip encode/decode tests using zxing-wasm, rxing (Rust), and gozxing (Go).
>
> **Experimental formats:** MicroPDF417, DotCode, Han Xin, JAB Code — no open-source barcode decoder exists for these formats (even bwip-js/Zint reference images cannot be scanned). Encoders produce structurally valid output. PRs welcome.
>
> **Contributions welcome!** If you find a scanning issue or want to improve an encoder, please [open an issue](https://github.com/productdevbook/etiket/issues) or submit a PR. See [Contributing](#contributing) below.

## Quick Start

```sh
npm install etiket
```

```ts
import { barcode, qrcode } from "etiket";

const svg = barcode("Hello World");
const qr = qrcode("https://example.com", { dotType: "dots", ecLevel: "H" });
```

## CLI

```sh
npx etiket qr "Hello World" -o qr.svg
npx etiket qr "Hello" --terminal
npx etiket qr "Hello" --size 300 --ec H --dot-type dots
npx etiket barcode "4006381333931" --type ean13 --show-text -o barcode.svg
npx etiket datamatrix "Hello" -o dm.svg
npx etiket pdf417 "Hello" -o pdf.svg
npx etiket aztec "Hello" -o aztec.svg
npx etiket wifi "MyNetwork" "secret123" -o wifi.svg
```

## Tree Shaking

Import only what you need:

```ts
import { barcode } from "etiket/barcode"; // 1D barcodes only
import { qrcode } from "etiket/qr"; // QR codes only
import { datamatrix } from "etiket/datamatrix";
import { pdf417 } from "etiket/pdf417";
import { aztec } from "etiket/aztec";
```

## Supported Formats

### 1D Barcodes

| Format                   | Type                   | Description                    |
| :----------------------- | :--------------------- | :----------------------------- |
| **Code 128**             | `code128`              | Auto charset (A/B/C)           |
| **Code 39**              | `code39`               | 43-char set, optional check    |
| **Code 39 Ext**          | `code39ext`            | Full ASCII                     |
| **Code 93**              | `code93`               | Higher density, 2 check digits |
| **Code 93 Ext**          | `code93ext`            | Full ASCII                     |
| **EAN-13**               | `ean13`                | Auto check digit               |
| **EAN-8**                | `ean8`                 | Auto check digit               |
| **EAN-5**                | `ean5`                 | Addon (book price)             |
| **EAN-2**                | `ean2`                 | Addon (issue number)           |
| **UPC-A**                | `upca`                 | 12-digit, auto check digit     |
| **UPC-E**                | `upce`                 | Compressed 8-digit             |
| **ITF**                  | `itf`                  | Interleaved 2 of 5             |
| **ITF-14**               | `itf14`                | 14-digit with bearer bars      |
| **Codabar**              | `codabar`              | Libraries, blood banks         |
| **MSI Plessey**          | `msi`                  | Mod10/11/1010/1110             |
| **Pharmacode**           | `pharmacode`           | Pharmaceutical                 |
| **Code 11**              | `code11`               | Telecommunications             |
| **GS1-128**              | `gs1-128`              | AI parsing, FNC1, 100+ AIs     |
| **GS1 DataBar**          | `gs1-databar`          | Omnidirectional, 14-digit GTIN |
| **GS1 DataBar Limited**  | `gs1-databar-limited`  | GTIN starting with 0/1         |
| **GS1 DataBar Expanded** | `gs1-databar-expanded` | Variable-length AI data        |
| **Identcode**            | `identcode`            | Deutsche Post / DHL            |
| **Leitcode**             | `leitcode`             | Deutsche Post routing          |
| **POSTNET**              | `postnet`              | USPS legacy postal             |
| **PLANET**               | `planet`               | USPS confirmation tracking     |
| **Plessey**              | `plessey`              | UK library systems             |

### 2D Codes

| Format             | Function              | Description                                 |
| :----------------- | :-------------------- | :------------------------------------------ |
| **QR Code**        | `qrcode()`            | Versions 1-40, all EC levels, all modes     |
| **Micro QR**       | `encodeMicroQR()`     | M1-M4 (11x11 to 17x17)                      |
| **Data Matrix**    | `datamatrix()`        | ECC 200, ASCII/C40/Text auto encoding       |
| **GS1 DataMatrix** | `gs1datamatrix()`     | FNC1 + AI parsing                           |
| **PDF417**         | `pdf417()`            | Text/Byte/Numeric, 9 EC levels, ISO-8859-15 |
| **MicroPDF417**    | `encodeMicroPDF417()` | Compact PDF417 for small items              |
| **Aztec**          | `aztec()`             | Compact + full-range, no quiet zone         |
| **MaxiCode**       | `encodeMaxiCode()`    | 33×30 hexagonal, UPS shipping labels        |
| **rMQR**           | `encodeRMQR()`        | Rectangular Micro QR (R7x43 to R17x139)     |
| **Codablock F**    | `encodeCodablockF()`  | Stacked Code 128                            |
| **Code 16K**       | `encodeCode16K()`     | Stacked barcode, 2-16 rows                  |
| **DotCode**        | `encodeDotCode()`     | Checkerboard dots, high-speed printing      |
| **Han Xin**        | `encodeHanXin()`      | Chinese market, 84 versions, 4 finders      |
| **JAB Code**       | `encodeJABCode()`     | Polychrome (4/8 color), ISO/IEC 23634       |

### 4-State Postal Barcodes

| Format             | Function                | Description           |
| :----------------- | :---------------------- | :-------------------- |
| **RM4SCC**         | `encodeRM4SCC()`        | Royal Mail (UK)       |
| **KIX**            | `encodeKIX()`           | PostNL (Netherlands)  |
| **Australia Post** | `encodeAustraliaPost()` | Australia Post        |
| **Japan Post**     | `encodeJapanPost()`     | Japan Post (Kasutama) |
| **USPS IMb**       | `encodeIMb()`           | Intelligent Mail (US) |

## Usage

### Barcodes

```ts
import { barcode } from "etiket";

barcode("Hello World"); // Code 128 (default)
barcode("4006381333931", { type: "ean13", showText: true });
barcode("00012345678905", { type: "itf14", bearerBars: true });
barcode("(01)12345678901234(17)260101", { type: "gs1-128" });
barcode("HELLO", { type: "code39", code39CheckDigit: true });
```

| Option         | Type                            | Default       | Description                 |
| :------------- | :------------------------------ | :------------ | :-------------------------- |
| `type`         | `BarcodeType`                   | `'code128'`   | Barcode format              |
| `height`       | `number`                        | `80`          | Bar height in pixels        |
| `barWidth`     | `number`                        | `2`           | Width multiplier per module |
| `color`        | `string`                        | `'#000'`      | Bar color                   |
| `background`   | `string`                        | `'#fff'`      | Background color            |
| `showText`     | `boolean`                       | `false`       | Show human-readable text    |
| `textPosition` | `'bottom' \| 'top'`             | `'bottom'`    | Text position               |
| `fontSize`     | `number`                        | `14`          | Text font size              |
| `fontFamily`   | `string`                        | `'monospace'` | Text font family            |
| `margin`       | `number`                        | `10`          | Margin around barcode       |
| `marginTop`    | `number`                        | `margin`      | Top margin                  |
| `marginBottom` | `number`                        | `margin`      | Bottom margin               |
| `marginLeft`   | `number`                        | `margin`      | Left margin                 |
| `marginRight`  | `number`                        | `margin`      | Right margin                |
| `textAlign`    | `'center' \| 'left' \| 'right'` | `'center'`    | Text alignment              |
| `rotation`     | `0 \| 90 \| 180 \| 270`         | `0`           | Barcode rotation            |
| `bearerBars`   | `boolean`                       | `false`       | Bearer bars (ITF-14)        |
| `barGap`       | `number`                        | `0`           | Extra spacing between bars  |
| `unit`         | `'px' \| 'mm' \| 'in' \| 'cm'`  | `'px'`        | Measurement unit            |
| `ariaLabel`    | `string`                        | —             | SVG aria-label attribute    |
| `title`        | `string`                        | —             | SVG `<title>` element       |
| `desc`         | `string`                        | —             | SVG `<desc>` element        |

### QR Codes

```ts
import { qrcode } from "etiket";

qrcode("https://example.com");
qrcode("Hello", { size: 300, ecLevel: "H", dotType: "rounded" });

// With gradient
qrcode("Test", {
  color: {
    type: "linear",
    rotation: 45,
    stops: [
      { offset: 0, color: "#ff0000" },
      { offset: 1, color: "#0000ff" },
    ],
  },
});

// With corner styling
qrcode("Test", {
  dotType: "dots",
  corners: {
    topLeft: { outerShape: "rounded", innerShape: "dots", outerColor: "#ff0000" },
    topRight: { outerShape: "extra-rounded" },
    bottomLeft: { outerShape: "dots" },
  },
});
```

| Option           | Type                                              | Default    | Description            |
| :--------------- | :------------------------------------------------ | :--------- | :--------------------- |
| `size`           | `number`                                          | `200`      | SVG size in pixels     |
| `ecLevel`        | `'L' \| 'M' \| 'Q' \| 'H'`                        | `'M'`      | Error correction level |
| `version`        | `number`                                          | auto       | QR version (1-40)      |
| `mode`           | `'numeric' \| 'alphanumeric' \| 'byte' \| 'auto'` | `'auto'`   | Encoding mode          |
| `mask`           | `0-7`                                             | auto       | Mask pattern           |
| `color`          | `string \| GradientOptions`                       | `'#000'`   | Module color           |
| `background`     | `string \| GradientOptions`                       | `'#fff'`   | Background color       |
| `margin`         | `number`                                          | `4`        | Quiet zone in modules  |
| `dotType`        | `DotType`                                         | `'square'` | Module shape           |
| `dotSize`        | `number`                                          | `1`        | Module size (0.1-1)    |
| `shape`          | `'square' \| 'circle'`                            | `'square'` | Overall QR shape       |
| `corners`        | `object`                                          | —          | Finder pattern styling |
| `logo`           | `LogoOptions`                                     | —          | Center logo embedding  |
| `xmlDeclaration` | `boolean`                                         | `false`    | Add XML declaration    |
| `unit`           | `'px' \| 'mm' \| 'in' \| 'cm'`                    | `'px'`     | Measurement unit       |
| `ariaLabel`      | `string`                                          | —          | SVG aria-label         |
| `title`          | `string`                                          | —          | SVG `<title>` element  |
| `desc`           | `string`                                          | —          | SVG `<desc>` element   |

**Dot types:** `square`, `rounded`, `dots`, `diamond`, `classy`, `classy-rounded`, `extra-rounded`, `vertical-line`, `horizontal-line`, `small-square`, `tiny-square`

### 2D Codes

```ts
import { datamatrix, pdf417, aztec } from "etiket";

datamatrix("Hello World");
pdf417("Hello World", { ecLevel: 4, columns: 5 });
aztec("Hello World", { ecPercent: 33 });
```

## Output Formats

```ts
import {
  barcode,
  qrcode,
  barcodeDataURI,
  qrcodeDataURI,
  barcodeBase64,
  qrcodeBase64,
  qrcodeTerminal,
} from "etiket";

const svg = qrcode("Hello"); // SVG string
const uri = qrcodeDataURI("Hello"); // data:image/svg+xml,...
const b64 = qrcodeBase64("Hello"); // data:image/svg+xml;base64,...
const term = qrcodeTerminal("Hello"); // Terminal (UTF-8 blocks)
```

## Convenience Helpers

```ts
import { wifi, email, sms, geo, url, phone, vcard, mecard, event } from "etiket";

wifi("MyNetwork", "password123"); // WiFi QR
email("test@example.com"); // mailto: QR
sms("+1234567890", "Hello!"); // SMS QR
geo(37.7749, -122.4194); // Location QR
url("https://example.com"); // URL QR
phone("+1234567890"); // tel: QR

// vCard QR
vcard({
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890",
  email: "john@example.com",
  org: "Acme Inc",
});

// MeCard QR (simpler, used by Android)
mecard({ name: "John Doe", phone: "+1234567890", email: "john@example.com" });

// Calendar event QR
event({
  title: "Meeting",
  start: "2026-04-01T10:00:00",
  end: "2026-04-01T11:00:00",
  location: "Office",
});
```

## Validation

```ts
import { validateBarcode, isValidInput, validateQRInput } from "etiket";

validateBarcode("4006381333931", "ean13"); // { valid: true }
validateBarcode("ABC", "ean13"); // { valid: false, error: '...' }
isValidInput("HELLO", "code39"); // true
```

## Swiss QR Code

Generate QR-bill payment codes (mandatory in Switzerland since 2022):

```ts
import { swissQR } from "etiket";

swissQR({
  iban: "CH4431999123000889012",
  creditor: { name: "Max Muster", postalCode: "8000", city: "Zürich", country: "CH" },
  amount: 1949.75,
  currency: "CHF",
  reference: "210000000003139471430009017",
  referenceType: "QRR",
});
```

## Raw Encoders

Access encoding functions directly for custom rendering:

```ts
import {
  encodeCode128,
  encodeEAN13,
  encodeQR,
  encodeDataMatrix,
  encodePDF417,
  encodeAztec,
  renderBarcodeSVG,
  renderQRCodeSVG,
  renderMatrixSVG,
} from "etiket";

const bars = encodeCode128("data"); // number[] (bar/space widths)
const matrix = encodeQR("data"); // boolean[][] (QR matrix)
const dm = encodeDataMatrix("data"); // boolean[][] (Data Matrix)

const svg = renderBarcodeSVG(bars, { height: 100 });
const qrSvg = renderQRCodeSVG(matrix, { size: 400, dotType: "dots" });
```

## Industry Standards

```ts
import {
  swissQR,
  gs1datamatrix,
  gs1DigitalLink,
  encodeHIBCPrimary,
  encodeHIBCSecondary,
} from "etiket";

// Swiss QR-bill (mandatory in Switzerland since 2022)
swissQR({
  iban: "CH4431999123000889012",
  creditor: { name: "Max Muster", postalCode: "8000", city: "Zürich", country: "CH" },
  amount: 1949.75,
  currency: "CHF",
});

// GS1 DataMatrix (healthcare, supply chain)
gs1datamatrix("(01)12345678901234(17)260101(10)BATCH01");

// GS1 Digital Link (2027 retail migration)
gs1DigitalLink({ gtin: "09520123456788", batch: "ABC123", serial: "12345" });

// HIBC (medical device labeling, FDA UDI)
const hibc = encodeHIBCPrimary("A123", "PROD456");
barcode(hibc, { type: "code128" }); // Encode in any symbology

// ISBT 128 (blood bank labeling, ISO 7064 Mod 37-2 check character)
const din = encodeISBT128DIN("US", "12345", "26", "000001");
barcode(din, { type: "code128" });

// MaxiCode (UPS shipping labels)
const mc = encodeMaxiCode("Test shipment", {
  mode: 2,
  postalCode: "12345",
  countryCode: 840,
  serviceClass: 1,
});
```

## SVG Accessibility

All SVG renderers support accessibility attributes out of the box:

```ts
barcode("123456789", {
  type: "ean13",
  ariaLabel: "EAN-13 barcode for product 123456789",
  title: "Product Barcode",
  desc: "EAN-13 barcode encoding the GTIN 123456789",
});

qrcode("https://example.com", {
  ariaLabel: "QR code linking to example.com",
  title: "Website QR Code",
});

// CSS currentColor support for theme-aware barcodes
barcode("HELLO", { color: "currentColor", background: "transparent" });
```

## Features

- Zero dependencies
- Pure ESM, edge-runtime compatible (Cloudflare Workers, Deno, Bun)
- TypeScript-first with strict types (tsgo)
- Tree-shakeable sub-path exports
- CLI tool (`npx etiket`)
- SVG string output (no DOM required) + `optimizeSVG()` for compact inline
- SVG accessibility (`ariaLabel`, `role`, `title`, `desc`)
- Measurement units (`px`, `mm`, `in`, `cm`, `pt`) for print use cases
- CSS `currentColor` support for theme-aware barcodes
- Auto EC upgrade to H when QR logo is present
- GS1 support (100+ AIs, Digital Link, GS1 DataMatrix, GS1 DataBar)
- HIBC medical device encoding + ISBT 128 blood bank labeling
- Swiss QR-bill payments
- 4-state postal barcodes (RM4SCC, KIX, Australia Post, Japan Post, USPS IMb)
- Works in browser, Node.js, Deno, Bun, Cloudflare Workers

## Comparison

| Feature                              |       etiket       | [uqr](https://github.com/unjs/uqr) | [bwip-js](https://github.com/metafloor/bwip-js) | [JsBarcode](https://github.com/lindell/JsBarcode) | [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) |
| :----------------------------------- | :----------------: | :--------------------------------: | :---------------------------------------------: | :-----------------------------------------------: | :--------------------------------------------------------------: |
| Zero dependencies                    | :white_check_mark: |         :white_check_mark:         |                  :x: (1.5MB+)                   |                   :x: (xmldom)                    |                           :x: (qrcode)                           |
| TypeScript-first                     | :white_check_mark: |         :white_check_mark:         |                       :x:                       |                        :x:                        |                             Partial                              |
| Tree-shakeable                       | :white_check_mark: |                :x:                 |                       :x:                       |                        :x:                        |                               :x:                                |
| 1D barcodes (22 types)               | :white_check_mark: |                :x:                 |            :white_check_mark: (100+)            |              :white_check_mark: (13)              |                               :x:                                |
| QR Code (v1-40, all EC)              | :white_check_mark: |         :white_check_mark:         |               :white_check_mark:                |                        :x:                        |                        :white_check_mark:                        |
| Data Matrix                          | :white_check_mark: |                :x:                 |               :white_check_mark:                |                        :x:                        |                               :x:                                |
| PDF417                               | :white_check_mark: |                :x:                 |               :white_check_mark:                |                        :x:                        |                               :x:                                |
| Aztec Code                           | :white_check_mark: |                :x:                 |               :white_check_mark:                |                        :x:                        |                               :x:                                |
| QR dot styling (12 types)            | :white_check_mark: |                :x:                 |                       :x:                       |                        :x:                        |                        :white_check_mark:                        |
| QR gradients                         | :white_check_mark: |                :x:                 |                       :x:                       |                        :x:                        |                        :white_check_mark:                        |
| QR corner styling                    | :white_check_mark: |                :x:                 |                       :x:                       |                        :x:                        |                        :white_check_mark:                        |
| QR logo embedding                    | :white_check_mark: |                :x:                 |                       :x:                       |                        :x:                        |                        :white_check_mark:                        |
| CLI tool                             | :white_check_mark: |                :x:                 |               :white_check_mark:                |                        :x:                        |                               :x:                                |
| Terminal output                      | :white_check_mark: |         :white_check_mark:         |                       :x:                       |                        :x:                        |                               :x:                                |
| Convenience helpers (WiFi, vCard...) | :white_check_mark: |                :x:                 |                       :x:                       |                        :x:                        |                               :x:                                |
| Input validation                     | :white_check_mark: |                :x:                 |                       :x:                       |                        :x:                        |                               :x:                                |
| SVG output                           | :white_check_mark: |         :white_check_mark:         |               :white_check_mark:                |                :white_check_mark:                 |                        :white_check_mark:                        |
| PNG/Canvas output                    |        :x:         |                :x:                 |               :white_check_mark:                |                :white_check_mark:                 |                        :white_check_mark:                        |
| Pure ESM                             | :white_check_mark: |         :white_check_mark:         |                    :x: (CJS)                    |                     :x: (CJS)                     |                            :x: (CJS)                             |
| Bundle size (gzip)                   |       ~24KB        |               ~12KB                |                     ~160KB                      |                       ~15KB                       |                            ~30KB+deps                            |

**etiket is the only library that combines** 1D barcodes + 2D codes + styled QR codes + zero dependencies + tree-shaking in a single package.

## Inspiration & Credits

Built from scratch, inspired by these excellent libraries:

- [uqr](https://github.com/unjs/uqr) — Pure SVG QR approach, terminal rendering
- [bwip-js](https://github.com/metafloor/bwip-js) — Comprehensive barcode format reference (100+ types)
- [JsBarcode](https://github.com/lindell/JsBarcode) — Encoding table validation, barcode rendering patterns
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) — QR styling concepts (dot types, gradients, corners, logos)

Standards: [ISO/IEC 15417](https://www.iso.org/standard/43896.html) (Code 128), [ISO/IEC 15420](https://www.iso.org/standard/46143.html) (EAN/UPC), [ISO/IEC 18004](https://www.iso.org/standard/62021.html) (QR), [ISO/IEC 16022](https://www.iso.org/standard/44230.html) (Data Matrix), [ISO/IEC 15438](https://www.iso.org/standard/43816.html) (PDF417), [ISO/IEC 24778](https://www.iso.org/standard/41548.html) (Aztec), [ISO/IEC 24724](https://www.iso.org/standard/51426.html) (GS1 DataBar), [ISO/IEC 16023](https://www.iso.org/standard/29835.html) (MaxiCode), [ISO/IEC 23941](https://www.iso.org/standard/77404.html) (rMQR), [ISO/IEC 20830](https://www.iso.org/standard/69321.html) (Han Xin), [ISO/IEC 23634](https://www.iso.org/standard/76478.html) (JAB Code), [AIM ISS DotCode 4.0](https://www.aimglobal.org) (DotCode), [USPS-B-3200](https://postalpro.usps.com/mailing/intelligent-mail-barcode) (IMb).

## Contributing

Contributions are welcome! Here are some areas where help is especially appreciated:

**Encoder improvements needed:**

- **rMQR** — Format info encoding and alignment pattern placement need work
- **MicroPDF417** — RAP (Row Address Pattern) index calculations need verification against ISO/IEC 24728
- **MaxiCode** — Hexagonal module placement algorithm needs correction per ISO/IEC 16023
- **DotCode** — Dot placement and mask pattern per AIM ISS DotCode 4.0
- **Han Xin** — GB 18030 Chinese character encoding mode
- **Code 16K** — Row-specific start patterns per AIM BC7-2000

**Other contributions:**

- PNG/raster output support ([#3](https://github.com/productdevbook/etiket/issues/3))
- Data Matrix DMRE rectangular sizes ([#71](https://github.com/productdevbook/etiket/issues/71))
- GS1 DataBar stacked variants ([#61](https://github.com/productdevbook/etiket/issues/61))
- Round-trip scan tests for experimental formats
- Documentation improvements

```bash
pnpm install    # Install dependencies
pnpm dev        # Run tests in watch mode
pnpm test       # Lint + typecheck + test
pnpm build      # Build for production
```

## License

Published under the [MIT](https://github.com/productdevbook/etiket/blob/main/LICENSE) license.
