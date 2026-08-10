# 2D Codes

Besides QR Code, etiket supports a full range of 2D, stacked and polychrome
symbologies. Every format has a convenience function returning SVG, a raw encoder
returning the module matrix, and PNG output.

| Format                                                | Function          | Raw encoder           | PNG                  |
| :---------------------------------------------------- | :---------------- | :-------------------- | :------------------- |
| [Data Matrix](/2d-codes/datamatrix)                   | `datamatrix()`    | `encodeDataMatrix`    | `datamatrixPNG()`    |
| [GS1 DataMatrix](/2d-codes/datamatrix#gs1-datamatrix) | `gs1datamatrix()` | `encodeGS1DataMatrix` | `gs1datamatrixPNG()` |
| [PDF417](/2d-codes/pdf417)                            | `pdf417()`        | `encodePDF417`        | `pdf417PNG()`        |
| [MicroPDF417](/2d-codes/micropdf417)                  | `micropdf417()`   | `encodeMicroPDF417`   | `micropdf417PNG()`   |
| [Aztec](/2d-codes/aztec)                              | `aztec()`         | `encodeAztec`         | `aztecPNG()`         |
| [Aztec Rune](/2d-codes/aztec#aztec-rune)              | `aztecrune()`     | `encodeAztecRune`     | `aztecrunePNG()`     |
| [Micro QR](/qr-code/micro-qr)                         | `microqr()`       | `encodeMicroQR`       | `microqrPNG()`       |
| [rMQR](/qr-code/rmqr)                                 | `rmqr()`          | `encodeRMQR`          | `rmqrPNG()`          |
| [MaxiCode](/2d-codes/maxicode)                        | `maxicode()`      | `encodeMaxiCode`      | `maxicodePNG()`      |
| [DotCode](/2d-codes/dotcode)                          | `dotcode()`       | `encodeDotCode`       | `dotcodePNG()`       |
| [Han Xin](/2d-codes/hanxin)                           | `hanxin()`        | `encodeHanXin`        | `hanxinPNG()`        |
| [Codablock F](/2d-codes/codablock-f)                  | `codablockf()`    | `encodeCodablockF`    | `codablockfPNG()`    |
| [Code 16K](/2d-codes/code16k)                         | `code16k()`       | `encodeCode16K`       | `code16kPNG()`       |
| [JAB Code](/2d-codes/jabcode)                         | `jabcode()`       | `encodeJABCode`       | `jabcodePNG()`       |

Data Matrix, PDF417 and Aztec have sub-path entries of their own
(`etiket/datamatrix`, `etiket/pdf417`, `etiket/aztec`); the rest are on
`etiket/2d`.

```ts
import { maxicode, encodeDotCode } from "etiket/2d"

maxicode("HELLO")
encodeDotCode("HELLO")
```

## Choosing a Format

| If you need                            | Use                                  |
| :------------------------------------- | :----------------------------------- |
| Maximum density on a tiny label        | [Data Matrix](/2d-codes/datamatrix)  |
| A large payload on a scuffable label   | [PDF417](/2d-codes/pdf417)           |
| No quiet zone                          | [Aztec](/2d-codes/aztec)             |
| A parcel carrier symbol                | [MaxiCode](/2d-codes/maxicode)       |
| High-speed inkjet marking              | [DotCode](/2d-codes/dotcode)         |
| The Chinese national standard          | [Han Xin](/2d-codes/hanxin)          |
| Linear scanning hardware, long payload | [Codablock F](/2d-codes/codablock-f) |
| A narrow strip rather than a square    | [rMQR](/qr-code/rmqr)                |

## Shared Rendering Options

Every format above except [JAB Code](/2d-codes/jabcode) renders through
`renderMatrixSVG` and accepts:

| Option                                  | Type       | Default   | Description                                  |
| :-------------------------------------- | :--------- | :-------- | :------------------------------------------- |
| `size`                                  | `number`   | `200`     | SVG size in pixels                           |
| `margin`                                | `number`   | `2`       | Quiet zone in modules                        |
| `color`                                 | `string`   | `#000`    | Module colour                                |
| `background`                            | `string`   | `#fff`    | Background; `transparent` omits the rect     |
| `rowHeight`                             | `number`   | see below | Row height as a multiple of the module width |
| `rowHeights`                            | `number[]` | —         | Per-row heights, for mixed-height symbols    |
| `ariaLabel` / `role` / `title` / `desc` | `string`   | —         | Accessibility metadata                       |

`rowHeight` defaults to `1` — square modules — for every format **except** the
stacked ones, and a few functions override other defaults too:

| Function        | Option      | Default | Why                                |
| :-------------- | :---------- | :------ | :--------------------------------- |
| `aztec()`       | `margin`    | `0`     | Aztec needs no quiet zone          |
| `maxicode()`    | `size`      | `400`   | Hexagonal modules need the room    |
| `pdf417()`      | `width`     | `400`   | Sets the overall symbol width      |
| `micropdf417()` | `rowHeight` | `2`     | Stacked aspect ratio from the spec |
| `codablockf()`  | `rowHeight` | `8`     | Tall rows, 1-module separators     |
| `code16k()`     | `rowHeight` | `8`     | Tall rows, 1-module separators     |

`jabcode()` is the exception in kind, not just in defaults: it renders through
`renderColorMatrixSVG`, which has **no `color` option** and takes a `palette`
instead. See its [page](/2d-codes/jabcode) for the full option set.

The PNG functions take `moduleSize` (pixels per module) and a `margin` in
modules, plus the same `rowHeight` / `rowHeights` and colours — see
[Rendering](/rendering/).

## Stacked Symbologies

[Codablock F](/2d-codes/codablock-f), [Code 16K](/2d-codes/code16k) and
[MicroPDF417](/2d-codes/micropdf417) stack rows of linear barcodes, so their rows
are taller than a module is wide.

Codablock F and Code 16K return a matrix that **includes the separator rows** —
`2 * rows + 1` entries — together with a `separatorRows` array listing which are
which. The convenience functions render separators 1 module tall and data rows at
`rowHeight`:

```ts
import { codablockf, code16k, micropdf417, encodeCode16K } from "etiket"

codablockf("CODABLOCK F DATA", { columns: 8 })
code16k("CODE 16K DATA")
micropdf417("MICRO", { columns: 2 })

// Square modules instead of tall rows — useful for inspecting the matrix
code16k("DATA", { rowHeight: 1 })

const result = encodeCode16K("DATA")
result.rows // data rows
result.matrix.length // 2 * rows + 1
result.separatorRows // indices of the separator rows
```

| Format      | Option    | Description                    |
| :---------- | :-------- | :----------------------------- |
| Codablock F | `columns` | `4`–`62` data columns per row  |
| MicroPDF417 | `columns` | `1`–`4` data columns           |
| Code 16K    | —         | Rows chosen from the data size |

## GS1 DataBar Stacked

The three stacked [GS1 DataBar](/barcodes/gs1-databar) variants also produce
module matrices rather than bar widths, so they live with the 2D functions:

```ts
import { gs1databarStacked, gs1databarStackedOmni, gs1databarExpandedStacked } from "etiket"

gs1databarStacked("2001234567890")
gs1databarStackedOmni("2001234567890")
gs1databarExpandedStacked("(01)90012345678908(3103)001750", { segments: 4 })
```
