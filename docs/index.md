# etiket

Zero-dependency barcode & QR code generator — SVG & PNG output. 40+ formats, styled QR codes, tree-shakeable. Pure TypeScript, works everywhere.

## Why etiket?

- **Zero dependencies** — No bloat, no supply chain risk
- **40+ symbologies** — 1D, postal, 2D, stacked and polychrome in one package
- **SVG and PNG** — PNG written directly, with no canvas or native dependency
- **Styled QR codes** — 12 dot types, gradients, corner styling, logo embedding
- **Tree-shakeable** — Import only what you need via sub-path exports
- **Pure ESM** — Modern, lightweight, TypeScript-first
- **Universal** — Works in browser, Node.js, Deno, Bun, workers

## Quick Example

```ts
import { barcode, qrcode, postal, qrcodePNG } from "etiket"

// Code 128 barcode
const svg = barcode("Hello World")

// Styled QR code
const qr = qrcode("https://example.com", {
  size: 300,
  ecLevel: "H",
  dotType: "dots",
  color: "#1a1a2e",
})

// Royal Mail 4-state postal barcode
const rm = postal("SN34RD1A", { type: "rm4scc" })

// PNG bytes, no canvas required
const png = qrcodePNG("https://example.com", { moduleSize: 8 })
```

## Format Families

| Family                   | Examples                                                                 |
| :----------------------- | :----------------------------------------------------------------------- |
| [1D](/barcodes/)         | Code 128, EAN/UPC, ISBN, Code 39/93, ITF, Codabar, MSI, GS1-128, DataBar |
| [Postal](/postal/)       | POSTNET, PLANET, RM4SCC, KIX, Australia Post, Japan Post, IMb            |
| [QR](/qr-code/)          | QR Code, Micro QR, rMQR                                                  |
| [2D](/2d-codes/)         | Data Matrix, PDF417, MicroPDF417, Aztec, MaxiCode, DotCode, Han Xin      |
| [Stacked](/2d-codes/)    | Codablock F, Code 16K, GS1 DataBar Stacked                               |
| [Polychrome](/2d-codes/) | JAB Code (experimental — [not conformant](/2d-codes/jabcode))            |

Run `etiket list` to print the full set from the [CLI](/getting-started/cli).

## Entry Points

| Entry               | Contents                                                               |
| :------------------ | :--------------------------------------------------------------------- |
| `etiket`            | Everything                                                             |
| `etiket/barcode`    | 1D barcodes                                                            |
| `etiket/postal`     | Postal symbologies                                                     |
| `etiket/qr`         | QR, Micro QR, rMQR and the payload helpers                             |
| `etiket/datamatrix` | Data Matrix and GS1 DataMatrix                                         |
| `etiket/pdf417`     | PDF417 and MicroPDF417                                                 |
| `etiket/aztec`      | Aztec Code                                                             |
| `etiket/2d`         | MaxiCode, DotCode, Han Xin, Codablock F, Code 16K, JAB Code            |
| `etiket/png`        | PNG output for every format                                            |
| `etiket/errors`     | `EtiketError`, `InvalidInputError`, `CapacityError`, `CheckDigitError` |
| `etiket/validators` | `validateBarcode`, `validateQRInput` and the check-digit helpers       |

## Documentation

**Getting started**

- [Installation](/getting-started/installation) — install and import
- [Quick start](/getting-started/quick-start) — the shortest path to a symbol
- [CLI](/getting-started/cli) — every subcommand and flag
- [Payload helpers](/getting-started/helpers) — WiFi, vCard, calendar, Swiss QR, GS1 Digital Link
- [Validation](/getting-started/validation) — check input before rendering
- [Error handling](/getting-started/error-handling) — the error hierarchy
- [TypeScript](/getting-started/typescript) — the exported types
- [Frameworks](/getting-started/frameworks) — React, Vue, Svelte, Angular, Astro
- [Migrating to v1](/getting-started/migration) — what changed from 0.11

**Reference**

- [API reference](/api/) — every exported function
- [Rendering](/rendering/) — SVG output and shared options
- [PNG output](/rendering/png) — raster output with no canvas
- [SVG optimisation](/rendering/optimize) — compact inline SVG
- [Low-level renderers](/rendering/low-level) — bars and matrices straight to output

**Symbologies**

- [1D barcodes](/barcodes/) — [Code 128](/barcodes/code128), [EAN](/barcodes/ean),
  [UPC](/barcodes/upc), [Code 39](/barcodes/code39), [Code 93](/barcodes/code93),
  [ITF](/barcodes/itf), [Codabar](/barcodes/codabar), [MSI](/barcodes/msi),
  [Code 11](/barcodes/code11), [Pharmacode](/barcodes/pharmacode),
  [Plessey](/barcodes/plessey), [GS1-128](/barcodes/gs1-128),
  [GS1 DataBar](/barcodes/gs1-databar), [GS1 Composite](/barcodes/gs1-composite),
  [Deutsche Post](/barcodes/deutsche-post), [HIBC](/barcodes/hibc),
  [ISBT 128](/barcodes/isbt128), [ISBN, ISSN and ISMN](/barcodes/isbn),
  [EAN-14 and SSCC-18](/barcodes/gs1-shipping),
  [Code 32 and PZN](/barcodes/pharma-national)
- [Postal](/postal/) — [POSTNET and PLANET](/postal/postnet-planet),
  [RM4SCC](/postal/rm4scc), [KIX](/postal/kix), [Australia Post](/postal/auspost),
  [Japan Post](/postal/japan-post), [USPS IMb](/postal/imb)
- [QR](/qr-code/) — [styling](/qr-code/styling), [Micro QR](/qr-code/micro-qr),
  [rMQR](/qr-code/rmqr), [Structured Append](/qr-code/structured-append),
  [kanji mode](/qr-code/kanji-mode)
- [2D](/2d-codes/) — [Data Matrix](/2d-codes/datamatrix), [PDF417](/2d-codes/pdf417),
  [MicroPDF417](/2d-codes/micropdf417), [Aztec](/2d-codes/aztec),
  [MaxiCode](/2d-codes/maxicode), [DotCode](/2d-codes/dotcode),
  [Han Xin](/2d-codes/hanxin), [Codablock F](/2d-codes/codablock-f),
  [Code 16K](/2d-codes/code16k), [JAB Code](/2d-codes/jabcode)

## How the output is verified

Producing a symbol is easy; producing one a scanner accepts is not. Every
symbology here is checked against an implementation that is not this one —
decoded back with zxing-wasm or jsQR where a decoder exists, compared module for
module with bwip-js (BWIPP) where none does. [JAB Code](/2d-codes/jabcode) is the
one exception, and says so in its own API documentation.
