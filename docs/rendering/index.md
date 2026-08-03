# Rendering

etiket provides multiple rendering options for different use cases.

## SVG String (Default)

All high-level functions return SVG strings:

```ts
import { barcode, qrcode, datamatrix, pdf417, aztec } from "etiket"

const svg = barcode("Hello")
// '<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>'
```

## Data URI

For embedding directly in `<img>` tags or CSS:

```ts
import { barcodeDataURI, qrcodeDataURI } from "etiket"

const uri = qrcodeDataURI("Hello")
// 'data:image/svg+xml,...'

// Use in HTML
const html = `<img src="${uri}" alt="QR Code" />`
```

## Base64

```ts
import { barcodeBase64, qrcodeBase64 } from "etiket"

const b64 = qrcodeBase64("Hello")
// 'data:image/svg+xml;base64,...'
```

## Terminal Output

Print QR codes in the terminal using Unicode half-block characters:

```ts
import { qrcodeTerminal } from "etiket"

console.log(qrcodeTerminal("Hello"))
```

Uses `▀`, `▄`, `█` and space characters for compact display (2 rows per line).

## Low-Level Renderers

For custom rendering pipelines:

```ts
import {
  renderBarcodeSVG,
  renderQRCodeSVG,
  renderMatrixSVG,
  renderText,
  svgToDataURI,
  svgToBase64,
  svgToBase64Raw,
} from "etiket";

// Custom barcode SVG
const svg = renderBarcodeSVG(bars, {
  height: 100,
  barWidth: 3,
  color: "#333",
  showText: true,
  text: "CUSTOM",
});

// Custom QR SVG with styling
const qrSvg = renderQRCodeSVG(matrix, {
  size: 400,
  dotType: "dots",
  color: { type: "linear", rotation: 45, stops: [...] },
});

// Generic 2D matrix SVG (Data Matrix, Aztec)
const matrixSvg = renderMatrixSVG(booleanMatrix, { size: 200 });

// Terminal text
const text = renderText(matrix, { compact: true, margin: 2 });

// Convert any SVG
const uri = svgToDataURI(svg);
const b64 = svgToBase64(svg);
const raw = svgToBase64Raw(svg); // No data: prefix
```

## PNG Output

etiket writes PNG files directly — no canvas, no native dependency. The encoder
uses stored DEFLATE blocks wrapped in zlib, so output is valid but uncompressed.

```ts
import { qrcodePNG, barcodePNG, qrcodePNGDataURI } from "etiket"

const png = qrcodePNG("Hello", { moduleSize: 10, margin: 4 })
// Uint8Array — write with fs.writeFileSync('qr.png', png)

const uri = qrcodePNGDataURI("Hello")
// 'data:image/png;base64,...'
```

A dedicated sub-path keeps PNG out of SVG-only bundles:

```ts
import { qrcodePNG } from "etiket/png"
```

### Available PNG Functions

Every function has a matching `*PNGDataURI` variant.

| Family | Functions                                                                      |
| :----- | :----------------------------------------------------------------------------- |
| 1D     | `barcodePNG`                                                                   |
| Postal | `postalPNG`                                                                    |
| QR     | `qrcodePNG`, `microqrPNG`, `rmqrPNG`                                           |
| 2D     | `datamatrixPNG`, `gs1datamatrixPNG`, `pdf417PNG`, `micropdf417PNG`, `aztecPNG` |
| Other  | `maxicodePNG`, `dotcodePNG`, `hanxinPNG`, `codablockfPNG`, `code16kPNG`        |

### PNG Options

Matrix formats take `moduleSize` (pixels per module) and `margin` (quiet zone in
modules); 1D barcodes take `scale` (pixels per module), `height` and a pixel
`margin`. All accept `color` and `background` as hex strings.

```ts
barcodePNG("12345", { scale: 3, height: 100, margin: 20, color: "#003049" })
qrcodePNG("Hello", { moduleSize: 8, margin: 2, background: "#f1faee" })
postalPNG("12345", { type: "postnet", scale: 2, pitch: 4, height: 40 })
```

### Low-Level Rasterizers

```ts
import {
  renderBarcodePNG,
  renderMatrixPNG,
  renderPostalPNG,
  renderMaxiCodePNG,
  renderBarcodeRaster,
  renderMatrixRaster,
  renderPostalRaster,
  renderMaxiCodeRaster,
  encodePNG,
} from "etiket"

// Raw pixel rows: { width, height, rows } where each row is 0 = bg, 1 = fg
const raster = renderMatrixRaster(matrix, { moduleSize: 4 })

// Assemble a PNG yourself
const png = encodePNG(raster.width, raster.height, raster.rows, [0, 0, 0], [255, 255, 255], true)
```

## Raw Encoding with `encode()`

`encode()` returns the underlying data for any symbology without rendering,
which is useful when feeding a custom renderer or another imaging library.

```ts
import { encode } from "etiket"

const result = encode("Hello", { type: "qr" })

switch (result.type) {
  case "1d":
    result.bars // number[] — alternating bar/space widths in modules
    break
  case "2d":
    result.matrix // boolean[][] — module grid
    break
  case "postal":
    result.bars // 4-state letters, or 1 (tall) / 0 (short)
    break
}
```

Encoder options are passed per format:

```ts
encode("Hello", { type: "qr", qr: { ecLevel: "H" } })
encode("Hello", { type: "pdf417", pdf417: { columns: 4 } })
encode("Hello", { type: "aztec", aztec: { ecPercent: 33 } })
encode("HELLO", { type: "code39", code39CheckDigit: true })
encode("12345678", { type: "auspost", fcc: "59" })
```

`encode()` shares its 1D dispatch with `barcode()`, so the two can never
disagree about how a given input is encoded.

## Measurement Units

Barcode and postal SVGs accept a `unit` so output can be sized for print:

```ts
barcode("12345", { unit: "mm", barWidth: 0.33, height: 25 })
// <svg width="..mm" height="..mm" viewBox="0 0 .. ..">
```

Supported units: `px` (default), `mm`, `cm`, `in`, `pt`. The `viewBox` always
stays unitless, so the symbol scales correctly.

## Accessibility

Every renderer accepts accessibility metadata:

```ts
qrcode("https://example.com", {
  ariaLabel: "QR code linking to example.com",
  role: "img",
  title: "Website QR code",
  desc: "Scan to open example.com",
})
```

`title` and `desc` become child elements of the `<svg>`; `role` defaults to
`img`. All values are XML-escaped.
