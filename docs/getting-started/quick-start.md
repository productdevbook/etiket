# Quick Start

## Basic Usage

```ts
import { barcode, qrcode } from "etiket"

// Generate a Code 128 barcode
const barcodeSvg = barcode("Hello World")

// Generate a QR code
const qrSvg = qrcode("https://example.com")
```

Both functions return an SVG string that you can use anywhere:

```ts
// In the browser
document.getElementById("barcode").innerHTML = barcodeSvg

// In Node.js — write to file
import { writeFileSync } from "node:fs"
writeFileSync("barcode.svg", barcodeSvg)

// As an img src
const dataUri = `data:image/svg+xml,${encodeURIComponent(barcodeSvg)}`
```

## Tree Shaking

Import only the format you need to minimize bundle size:

```ts
import { barcode } from "etiket/barcode" // 1D barcodes only
import { qrcode } from "etiket/qr" // QR codes only
import { datamatrix } from "etiket/datamatrix"
import { pdf417 } from "etiket/pdf417"
import { aztec } from "etiket/aztec"
```

## Output Formats

etiket supports multiple output formats:

```ts
import {
  barcode,
  qrcode,
  barcodeDataURI,
  qrcodeDataURI,
  barcodeBase64,
  qrcodeBase64,
  qrcodeTerminal,
} from "etiket"

// SVG string (default)
const svg = qrcode("Hello")

// Data URI — use in <img src="...">
const uri = qrcodeDataURI("Hello")

// Base64 encoded SVG
const b64 = qrcodeBase64("Hello")

// Terminal output with Unicode blocks
const terminal = qrcodeTerminal("Hello")
console.log(terminal)
```

## Convenience Helpers

Generate QR codes for common use cases:

```ts
import { wifi, email, sms, geo, url } from "etiket"

wifi("MyNetwork", "password123")
email("hello@example.com")
sms("+1234567890", "Hello!")
geo(37.7749, -122.4194)
url("https://example.com")
```
