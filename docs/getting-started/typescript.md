# TypeScript Types

etiket is written in TypeScript and ships its own declarations — there is no
`@types/etiket`. Every option object and every result shape is a named exported
interface, so you can hold one in a variable, build it up conditionally, or
accept it in your own function signature.

```ts
import type { BarcodeOptions } from "etiket"
import { barcode } from "etiket"

const labelStyle: BarcodeOptions = {
  type: "code128",
  moduleSize: 2,
  height: 60,
  showText: true,
}

function label(sku: string, overrides: BarcodeOptions = {}): string {
  return barcode(sku, { ...labelStyle, ...overrides })
}

label("SKU-001")
label("SKU-002", { height: 30 })
```

All types below are exported from the package root, and from the sub-path that
owns them.

## Symbology Selectors

| Type          | Definition                                                | Used by                  |
| :------------ | :-------------------------------------------------------- | :----------------------- |
| `BarcodeType` | The 40 width-modulated linear symbologies                 | `barcode`, `encodeBars`  |
| `EncodeType`  | `BarcodeType` plus the postal, 2D and stacked symbologies | `encode`                 |
| `PostalType`  | The seven postal symbologies plus `"pharmacode2"`         | `postal`, `encodePostal` |

```ts
import type { BarcodeType, EncodeType, PostalType } from "etiket"
import { barcode, encode, postal } from "etiket"

const linear: BarcodeType = "code39"
const anything: EncodeType = "aztec"
const mail: PostalType = "rm4scc"

barcode("HELLO", { type: linear })
encode("Hello", { type: anything })
postal("SN34RD1A", { type: mail })
```

## Option Types

### Barcode

| Type                     | What it is                                                    |
| :----------------------- | :------------------------------------------------------------ |
| `BarcodeEncodingOptions` | Symbology choice and per-symbology encoder switches           |
| `BarcodeSVGOptions`      | Geometry, colour, text and accessibility for the SVG renderer |
| `BarcodeOptions`         | Both of the above — what `barcode()` takes                    |

```ts
import type { BarcodeEncodingOptions, BarcodeSVGOptions, BarcodeOptions } from "etiket"
import { encodeBars, renderBarcodeSVG, barcode } from "etiket"

const encoding: BarcodeEncodingOptions = { type: "msi", msiCheckDigit: "mod1010" }
const drawing: BarcodeSVGOptions = { moduleSize: 2, height: 60, textPosition: "top" }
const both: BarcodeOptions = { ...encoding, ...drawing }

renderBarcodeSVG(encodeBars("1234", encoding), drawing)
barcode("1234", both)
```

`BarcodeSVGOptions` fields: `width`, `height`, `moduleSize` (`barWidth` is the
deprecated alias), `barGap`, `unit`, `color`, `background`, `showText`, `text`,
`fontSize`, `fontFamily`, `margin`, `marginTop`, `marginBottom`, `marginLeft`,
`marginRight`, `textAlign`, `textPosition`, `rotation`, `bearerBars`,
`bearerBarWidth`, `guardBars`, `guardExtension`, `textSegments`, plus everything
in `SVGAccessibilityOptions`.

### Postal

| Type                    | What it is                                    |
| :---------------------- | :-------------------------------------------- |
| `PostalEncodingOptions` | `type`, `fcc`, `routingCode`                  |
| `PostalSVGOptions`      | Bar geometry: heights, pitch, ratios, margins |
| `PostalOptions`         | Both — what `postal()` takes                  |
| `PostalBar`             | `FourState \| number` — one bar's state       |
| `FourState`             | `"T" \| "A" \| "D" \| "F"`                    |

`PostalBar` is the currency between `encodePostal()` and the postal renderers.
4-state symbologies yield letters — Tracker, Ascender, Descender, Full — while
POSTNET and PLANET yield `1` for a tall bar and `0` for a short one.

```ts
import type { PostalBar, PostalSVGOptions, PostalOptions, FourState } from "etiket"
import { encodePostal, renderPostalSVG } from "etiket"

const geometry: PostalSVGOptions = { height: 40, moduleSize: 2, pitch: 4, trackerRatio: 1 / 3 }
const everything: PostalOptions = { type: "rm4scc", ...geometry }

const bars: PostalBar[] = encodePostal("SN34RD1A", { type: "rm4scc" })
const first = bars[0] as FourState
first // "A"

renderPostalSVG(bars, geometry)
void everything
```

### QR

| Type                   | What it is                                                                    |
| :--------------------- | :---------------------------------------------------------------------------- |
| `QRCodeOptions`        | Encoder: EC level, version, mode, mask, ECI, GS1, Micro QR, Structured Append |
| `QRCodeSVGOptions`     | Renderer: size, dot shapes, gradients, corners, logo                          |
| `ErrorCorrectionLevel` | `"L" \| "M" \| "Q" \| "H"`                                                    |
| `EncodingMode`         | `"numeric" \| "alphanumeric" \| "byte" \| "kanji" \| "auto"`                  |
| `MicroQROptions`       | `version` (1–4), `ecLevel` (`L`/`M`/`Q`), `mask` (0–3)                        |
| `RMQROptions`          | `ecLevel` (`M`/`H`), `version` (0–31), `eci`                                  |
| `MailmarkType`         | `7 \| 9 \| 29` — the Royal Mail barcode types                                 |
| `MailmarkOptions`      | `{ type?: MailmarkType }`                                                     |
| `QRSequenceOptions`    | `QRCodeOptions` minus `structuredAppend`, plus `symbols`                      |

```ts
import type { QRCodeOptions, QRCodeSVGOptions, ErrorCorrectionLevel, EncodingMode } from "etiket"
import { qrcode } from "etiket"

const ec: ErrorCorrectionLevel = "H"
const mode: EncodingMode = "byte"

const encoding: QRCodeOptions = { ecLevel: ec, mode, eci: 26 }
const styling: QRCodeSVGOptions = {
  size: 320,
  margin: 4,
  dotType: "classy-rounded",
  background: "transparent",
}

qrcode("https://example.com", { ...encoding, ...styling })
```

`QRCodeOptions.micro` asks for a Micro QR symbol; `structuredAppend` carries the
`{ index, total, parity }` header by hand — prefer `encodeQRSequence()`, which
fills it in. `gs1` marks the payload as GS1 element strings and
`applicationIndicator` sets FNC1 in the second position.

### Styling

| Type                      | What it is                                                          |
| :------------------------ | :------------------------------------------------------------------ |
| `DotType`                 | 12 module shapes, from `"square"` to `"tiny-square"`                |
| `LinearGradientOptions`   | `{ type: "linear"; rotation?; stops }`                              |
| `RadialGradientOptions`   | `{ type: "radial"; stops }`                                         |
| `GradientOptions`         | Either of the two                                                   |
| `CornerOptions`           | Finder pattern shape and colour, outer and inner                    |
| `LogoOptions`             | Inline SVG, path data or image URL, plus size and background        |
| `MeasurementUnit`         | `"px" \| "mm" \| "in" \| "pt" \| "cm"`                              |
| `SVGAccessibilityOptions` | `ariaLabel`, `role`, `title`, `desc` — every renderer accepts these |

```ts
import type {
  DotType,
  GradientOptions,
  CornerOptions,
  LogoOptions,
  MeasurementUnit,
  SVGAccessibilityOptions,
} from "etiket"
import { qrcode, barcode } from "etiket"

const dots: DotType = "extra-rounded"
const brand: GradientOptions = {
  type: "linear",
  rotation: 45,
  stops: [
    { offset: 0, color: "#0f172a" },
    { offset: 1, color: "#2563eb" },
  ],
}
const corners: CornerOptions = { outerShape: "rounded", innerShape: "dots", innerColor: "#2563eb" }
const logo: LogoOptions = {
  path: "M20 20 H80 V80 H20 Z",
  size: 0.25,
  margin: 4,
  hideBackgroundDots: true,
}
const a11y: SVGAccessibilityOptions = {
  ariaLabel: "QR code linking to example.com",
  title: "Website QR code",
}
const print: MeasurementUnit = "mm"

qrcode("https://example.com", {
  dotType: dots,
  color: brand,
  corners: { topLeft: corners, topRight: corners, bottomLeft: corners },
  logo,
  ...a11y,
})

barcode("12345", { unit: print, moduleSize: 0.33, height: 25 })
```

### 2D encoders

| Type                         | Fields                                                                        |
| :--------------------------- | :---------------------------------------------------------------------------- |
| `DataMatrixShape`            | `"square" \| "rectangle" \| "auto"`                                           |
| `DataMatrixSizeOptions`      | `shape`, `dmre`, `symbolSize`                                                 |
| `DataMatrixEncodeOptions`    | `eci`, `structuredAppend`                                                     |
| `DataMatrixStructuredAppend` | `index` (from 1), `total` (2–16), `fileId`                                    |
| `DataMatrixSequenceOptions`  | The size and encode options, plus `symbols` and `fileId`                      |
| `DataMatrixSymbolSize`       | One row of the size table: rows, cols, data regions, codewords                |
| `PDF417Options`              | `ecLevel`, `columns`, `compact`, `eci`, `macro`, `readerInit`                 |
| `MicroPDF417Options`         | `columns` (1–4)                                                               |
| `AztecOptions`               | `ecPercent`, `layers`, `compact`, `eci`                                       |
| `MaxiCodeOptions`            | `mode` (2–6), `postalCode`, `countryCode`, `serviceClass`, `structuredAppend` |
| `MaxiCodeStructuredAppend`   | `index` (from 1), `total` (2–8)                                               |
| `MaxiCodeSequenceOptions`    | `MaxiCodeOptions` without `structuredAppend`, plus `symbols`                  |
| `DotCodeOptions`             | `rows`, `columns`, `mask`                                                     |
| `HanXinOptions`              | `ecLevel` (1–4), `version` (1–84), `mask` (1–4)                               |
| `JABCodeOptions`             | `colors` (4 or 8), `ecPercent`                                                |
| `JABCodeResult`              | `matrix` of palette indices, `rows`, `cols`, `palette`                        |
| `CompositeType`              | `"CC-A" \| "CC-B" \| "CC-C"`                                                  |
| `CompositeLinearType`        | The linear symbology a composite component sits above                         |
| `GS1CompositeOptions`        | `type`, `columns`, `linear`, `linearWidth`                                    |
| `GS1CompositeResult`         | `composite`, `type`, `rows`, `cols`, `columns`                                |
| `GS1CompositeSymbolResult`   | The complete symbol: `matrix`, `rowHeights`, `linear`, `separator`, …         |
| `PDF417MacroOptions`         | One symbol's Macro PDF417 control block                                       |
| `PDF417SharedMacroOptions`   | The macro fields that stay the same across a sequence                         |
| `PDF417SequenceOptions`      | `PDF417Options` without `macro`, plus `symbols` and `fileId`                  |

```ts
import type {
  DataMatrixShape,
  DataMatrixSizeOptions,
  DataMatrixSymbolSize,
  PDF417Options,
  AztecOptions,
  MaxiCodeOptions,
  CompositeType,
  CompositeLinearType,
  GS1CompositeOptions,
  GS1CompositeResult,
  GS1CompositeSymbolResult,
  JABCodeResult,
} from "etiket"
import {
  encodeDataMatrix,
  encodeGS1Composite,
  encodeGS1CompositeSymbol,
  encodeJABCode,
  DATAMATRIX_SYMBOL_SIZES,
} from "etiket"

const shape: DataMatrixShape = "rectangle"
const size: DataMatrixSizeOptions = { shape, dmre: true }
const largest: DataMatrixSymbolSize | undefined = DATAMATRIX_SYMBOL_SIZES.find(
  (entry) => entry.rows === 144,
)
largest?.totalDataCodewords // 1558

encodeDataMatrix("Hello", size)

const pdf: PDF417Options = { ecLevel: 3, columns: 4, compact: false }
const az: AztecOptions = { ecPercent: 33, compact: true }
const maxi: MaxiCodeOptions = { mode: 3, postalCode: "SW1A1", countryCode: 826, serviceClass: 1 }
void [pdf, az, maxi]

const cc: CompositeType = "CC-A"
const linearType: CompositeLinearType = "databar-omni"
const compositeOptions: GS1CompositeOptions = { type: cc, columns: 4 }
const composite: GS1CompositeResult = encodeGS1Composite("(17)260101(10)BATCH01", compositeOptions)
composite.rows

const whole: GS1CompositeSymbolResult = encodeGS1CompositeSymbol(
  linearType,
  "(01)09521234543213|(11)990102",
)
whole.rowHeights.length === whole.matrix.length // true

const jab: JABCodeResult = encodeJABCode("Hello")
jab.palette.length // 4
```

### Macro PDF417

`encodePDF417Sequence()` splits a message across several symbols, each carrying
a Macro control block. `PDF417SequenceOptions` drives the split;
`PDF417SharedMacroOptions` carries the descriptive fields that are the same on
every segment, and `PDF417MacroOptions` is the per-symbol block underneath —
reach for it only if you are driving the split yourself through
`PDF417Options.macro`.

```ts
import type { PDF417SequenceOptions, PDF417SharedMacroOptions, PDF417MacroOptions } from "etiket"
import { encodePDF417Sequence, encodePDF417 } from "etiket"

const shared: PDF417SharedMacroOptions = { fileName: "manifest.txt", sender: "Warehouse 4" }
const sequence: PDF417SequenceOptions = { symbols: 3, macro: shared }

encodePDF417Sequence("A".repeat(3000), sequence).length // 3

const block: PDF417MacroOptions = { segmentIndex: 0, fileId: "017053", lastSegment: false }
encodePDF417("segment one", { macro: block }).rows > 0 // true
```

### 1D encoders

| Type                | Definition                                                        |
| :------------------ | :---------------------------------------------------------------- |
| `Code128Charset`    | `"auto" \| "A" \| "B" \| "C"`                                     |
| `Code128Options`    | `{ charset?: Code128Charset }`                                    |
| `MSICheckDigitType` | `"mod10" \| "mod11" \| "mod1010" \| "mod1110" \| "none"`          |
| `GS1128Linkage`     | `"A" \| "C"` — which composite component the symbol links to      |
| `GS1128Options`     | `{ linkage?: GS1128Linkage }`                                     |
| `ISSNOptions`       | `{ variant?: string }` — the two digit sequence variant           |
| `PZNOptions`        | `{ pzn8?: boolean }` — the eight digit scheme                     |
| `Code2of5Version`   | `"industrial" \| "iata" \| "matrix" \| "coop" \| "datalogic"`     |
| `Code2of5Options`   | `{ version?: Code2of5Version; checkDigit?: boolean \| "verify" }` |

```ts
import type {
  Code128Charset,
  Code128Options,
  GS1128Linkage,
  GS1128Options,
  Code2of5Options,
  Code2of5Version,
  ISSNOptions,
  MSICheckDigitType,
  PZNOptions,
} from "etiket"
import {
  encodeCode128,
  encodeCode2of5,
  encodeGS1128,
  encodeISSN,
  encodeMSI,
  encodePZN,
} from "etiket"

const charset: Code128Charset = "C"
const opts: Code128Options = { charset }
const check: MSICheckDigitType = "mod1010"
const linkage: GS1128Linkage = "A"
const gs1Opts: GS1128Options = { linkage }
const issnOpts: ISSNOptions = { variant: "01" }
const pznOpts: PZNOptions = { pzn8: true }
const version: Code2of5Version = "matrix"
const c25Opts: Code2of5Options = { version, checkDigit: true }

encodeCode128("12345678", opts)
encodeMSI("1234", { checkDigit: check })
encodeGS1128("(01)09501101020917", gs1Opts)
encodeISSN("0317-8471", issnOpts)
encodePZN("1234567", pznOpts)
encodeCode2of5("1234567890", c25Opts)
```

## Result Types

### EncodeResult

`encode()` returns a discriminated union. Switch on `type` and the payload
narrows.

| Type                 | Shape                                     |
| :------------------- | :---------------------------------------- |
| `Encode1DResult`     | `{ type: "1d"; bars: number[] }`          |
| `Encode2DResult`     | `{ type: "2d"; matrix: boolean[][] }`     |
| `EncodePostalResult` | `{ type: "postal"; bars: PostalBar[] }`   |
| `EncodeResult`       | The union of the three                    |
| `EncodeOptions`      | `type` plus the per-symbology option bags |

```ts
import type { EncodeResult, EncodeOptions } from "etiket"
import { encode } from "etiket"

function moduleCount(result: EncodeResult): number {
  switch (result.type) {
    case "1d":
      return result.bars.reduce((sum, width) => sum + width, 0)
    case "2d":
      return result.matrix.length * (result.matrix[0]?.length ?? 0)
    case "postal":
      return result.bars.length
  }
}

const options: EncodeOptions = { type: "qr", qr: { ecLevel: "Q" } }
moduleCount(encode("Hello", options)) > 0 // true
moduleCount(encode("12345", { type: "code128" })) > 0 // true
moduleCount(encode("12345", { type: "postnet" })) > 0 // true
```

### QRValidationResult

```ts
import type { QRValidationResult } from "etiket"
import { validateQRInput } from "etiket"

const result: QRValidationResult = validateQRInput("Hello World", "M")
result.valid // true
result.version // 1
result.mode // "byte"
result.dataLength // 11
result.maxCapacity // 2331
```

`error` is present only when `valid` is `false`; `version` only when it is
`true`. See [Input validation](/getting-started/validation).

## Rendering Types

| Type                    | Used by                                                  |
| :---------------------- | :------------------------------------------------------- |
| `MatrixSVGOptions`      | `renderMatrixSVG`, `renderMaxiCodeSVG`, every 2D wrapper |
| `ColorMatrixSVGOptions` | `renderColorMatrixSVG`, `jabcode`                        |
| `PostalSVGOptions`      | `renderPostalSVG`, `postal`                              |
| `QRCodeSVGOptions`      | `renderQRCodeSVG`, `qrcode`                              |
| `BarcodeSVGOptions`     | `renderBarcodeSVG`, `barcode`                            |

### MatrixSVGOptions

`size` (default 200), `color`, `background`, `margin` in modules (default 2),
`rowHeight`, `rowHeights`, plus the accessibility fields.
`ColorMatrixSVGOptions` adds `palette`.

```ts
import type { MatrixSVGOptions, ColorMatrixSVGOptions } from "etiket"
import { encodeDataMatrix, encodeJABCode, renderMatrixSVG, renderColorMatrixSVG } from "etiket"

const matrixStyle: MatrixSVGOptions = { size: 240, margin: 2, color: "#111", background: "#fff" }
renderMatrixSVG(encodeDataMatrix("Hello"), matrixStyle)

const jab = encodeJABCode("Hello")
const colorStyle: ColorMatrixSVGOptions = { ...matrixStyle, palette: jab.palette }
renderColorMatrixSVG(jab.matrix, jab.palette, colorStyle)
```

`rowHeights` exists for the stacked symbologies, whose separator rows are one
module tall while the data rows are eight.

## PNG Types

| Type                    | Used by                                                 |
| :---------------------- | :------------------------------------------------------ |
| `BarcodePNGOptions`     | `barcodePNG`, `renderBarcodePNG`, `renderBarcodeRaster` |
| `PostalPNGOptions`      | `postalPNG`, `renderPostalPNG`, `renderPostalRaster`    |
| `MatrixPNGOptions`      | every 2D `*PNG`, `renderMatrixPNG`, `renderMaxiCodePNG` |
| `ColorMatrixPNGOptions` | Palette-indexed PNG options — `jabcodePNG()`            |
| `TextRenderOptions`     | Terminal output options — `renderText()`                |
| `RasterData`            | what the four `*Raster` functions return                |

### RasterData

```ts
import type { RasterData, MatrixPNGOptions } from "etiket"
import { encodeQR, renderMatrixRaster, encodePNG } from "etiket"

const options: MatrixPNGOptions = { moduleSize: 4, margin: 2 }
const raster: RasterData = renderMatrixRaster(encodeQR("Hello"), options)

raster.width // pixels
raster.height // pixels
raster.rows.length === raster.height // true — one Uint8Array per row, 0 = bg, 1 = fg

encodePNG(raster.width, raster.height, raster.rows, [0, 0, 0], [255, 255, 255], true)
```

## Batch Types

| Type                  | What it is                                                                                              |
| :-------------------- | :------------------------------------------------------------------------------------------------------ |
| `BatchOptions`        | `{ onProgress?: (done: number, total: number) => void }`                                                |
| `SheetOptions`        | Grid layout: `columns`, `gap`, `padding`, `background`, `labels`, `labelSize`, `labelFont`, `ariaLabel` |
| `BarcodeSheetOptions` | `BarcodeOptions & SheetOptions`                                                                         |
| `QRCodeSheetOptions`  | `QRCodeSVGOptions & QRCodeOptions & SheetOptions`                                                       |

```ts
import type { BatchOptions, SheetOptions, BarcodeSheetOptions } from "etiket"
import { barcodes, barcodeSheet } from "etiket"

let seen = 0
const progress: BatchOptions = {
  onProgress: (done, total) => {
    seen = done + total - total
  },
}

const layout: SheetOptions = { columns: 3, gap: 12, padding: 24, labelSize: 9 }
const sheetStyle: BarcodeSheetOptions = { type: "code128", height: 40, ...layout }

barcodes(["A", "B", "C"], { type: "code128", ...progress })
seen // 3

barcodeSheet(["A", "B", "C"], sheetStyle).startsWith("<svg") // true
```

## Types That Are Not Exported

A handful of internal shapes are reachable through inference but have no
exported name. Use `Parameters<>` / `ReturnType<>` if you need to hold one.

`TextRenderOptions` and `ColorMatrixPNGOptions` used to be on this list; both
are exported now, so the argument to `renderText()` and to `jabcodePNG()` can be
named directly.

| Shape                                             | Where it appears                               |
| :------------------------------------------------ | :--------------------------------------------- |
| `{ eci?: number }`                                | The Data Matrix encoder half of `datamatrix()` |
| `{ width?: number; height?: number }`             | The PDF417 SVG overrides on `pdf417()`         |
| `{ columns?: number }`                            | `codablockf()` and `encodeCodablockF()`        |
| `{ segments?: number }`                           | `gs1databarExpandedStacked()`                  |
| `{ linkage?: boolean }`                           | Every GS1 DataBar encoder                      |
| `{ custInfoEncoding?: "character" \| "numeric" }` | `encodeAustraliaPost()`                        |
| `{ matrix, rows, cols }`                          | `encodePDF417()`, `encodeMicroPDF417()`        |
| `{ matrix, rows, cols, separatorRows }`           | `encodeCodablockF()`, `encodeCode16K()`        |

```ts
import { encodePDF417, encodeCode16K, renderText, encodeQR } from "etiket"

type PDF417Result = ReturnType<typeof encodePDF417>
type Code16KResult = ReturnType<typeof encodeCode16K>
type TextOptions = NonNullable<Parameters<typeof renderText>[1]>

const pdf: PDF417Result = encodePDF417("Hello")
const c16k: Code16KResult = encodeCode16K("Hello")
const textOptions: TextOptions = { compact: true, margin: 2, invert: false }

pdf.rows > 0 // true
c16k.separatorRows.length > 0 // true
renderText(encodeQR("Hello"), textOptions).length > 0 // true
```
