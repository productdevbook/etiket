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
import { barcode, qrcode, postal, qrcodePNG } from "etiket";

// Code 128 barcode
const svg = barcode("Hello World");

// Styled QR code
const qr = qrcode("https://example.com", {
  size: 300,
  ecLevel: "H",
  dotType: "dots",
  color: "#1a1a2e",
});

// Royal Mail 4-state postal barcode
const rm = postal("SN34RD1A", { type: "rm4scc" });

// PNG bytes, no canvas required
const png = qrcodePNG("https://example.com", { moduleSize: 8 });
```

## Format Families

| Family                   | Examples                                                               |
| :----------------------- | :--------------------------------------------------------------------- |
| [1D](/barcodes/)         | Code 128, EAN/UPC, Code 39/93, ITF, Codabar, MSI, GS1-128, GS1 DataBar |
| [Postal](/postal/)       | POSTNET, PLANET, RM4SCC, KIX, Australia Post, Japan Post, IMb          |
| [QR](/qr-code/)          | QR Code, Micro QR, rMQR                                                |
| [2D](/2d-codes/)         | Data Matrix, PDF417, MicroPDF417, Aztec, MaxiCode, DotCode, Han Xin    |
| [Stacked](/2d-codes/)    | Codablock-F, Code 16K                                                  |
| [Polychrome](/2d-codes/) | JAB Code                                                               |

Run `etiket list` to print the full set from the [CLI](/getting-started/cli).

## Entry Points

| Entry               | Contents                       |
| :------------------ | :----------------------------- |
| `etiket`            | Everything                     |
| `etiket/barcode`    | 1D barcodes                    |
| `etiket/postal`     | Postal symbologies             |
| `etiket/qr`         | QR, Micro QR, rMQR             |
| `etiket/datamatrix` | Data Matrix and GS1 DataMatrix |
| `etiket/pdf417`     | PDF417 and MicroPDF417         |
| `etiket/aztec`      | Aztec Code                     |
| `etiket/png`        | PNG output for every format    |
