# etiket

Zero-dependency barcode & QR code generator — SVG & PNG output. 40+ formats, styled QR codes, tree-shakeable. Pure TypeScript, works everywhere.

## Why etiket?

- **Zero dependencies** — No bloat, no supply chain risk
- **20+ barcode formats** — 1D, 2D, QR codes all in one package
- **Styled QR codes** — 12 dot types, gradients, corner styling, logo embedding
- **Tree-shakeable** — Import only what you need via sub-path exports
- **Pure ESM** — Modern, lightweight, TypeScript-first
- **Universal** — Works in browser, Node.js, Deno, Bun, workers

## Quick Example

```ts
import { barcode, qrcode } from "etiket";

// Code 128 barcode
const svg = barcode("Hello World");

// Styled QR code
const qr = qrcode("https://example.com", {
  size: 300,
  ecLevel: "H",
  dotType: "dots",
  color: "#1a1a2e",
});
```

## Bundle Size

| Entry               | Size (gzip) |
| :------------------ | :---------- |
| `etiket`            | ~24KB       |
| `etiket/barcode`    | ~8KB        |
| `etiket/qr`         | ~10KB       |
| `etiket/datamatrix` | ~5KB        |
| `etiket/pdf417`     | ~6KB        |
| `etiket/aztec`      | ~7KB        |
