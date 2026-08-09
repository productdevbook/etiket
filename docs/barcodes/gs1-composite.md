# GS1 Composite

A composite symbol is a linear barcode with a 2D component printed above it. The
linear part carries the primary identifier — usually the GTIN — and the 2D part
carries the attribute data that will not fit: batch, expiry, serial, weight.

## When to Use It

- Healthcare packaging that needs GTIN plus expiry and lot in a small footprint
- Variable-measure retail items where the linear symbol must stay scannable at
  the till
- Any GS1 application where the AI data outgrows the linear symbology

## Component Types

| Type   | Built on    | Capacity    | Typical use                       |
| :----- | :---------- | :---------- | :-------------------------------- |
| `CC-A` | MicroPDF417 | 56 digits   | A few short AIs                   |
| `CC-B` | MicroPDF417 | 338 digits  | Batch, expiry and serial together |
| `CC-C` | PDF417      | 2361 digits | GS1-128 primaries with bulk data  |

Capacity is the longest element string of ISO/IEC 24723, AI digits included.
Alphanumeric data costs more per character and reaches those limits sooner.

## Usage

```ts
import { encodeGS1Composite } from "etiket"

const result = encodeGS1Composite("(17)260101(10)BATCH01", "CC-A")
result.type // "CC-A"
result.rows // 14
result.cols // 55
result.composite // boolean[][] — the 2D component
```

The type defaults to `CC-A`:

```ts
import { encodeGS1Composite } from "etiket"

encodeGS1Composite("(10)BATCH01").type // "CC-A"
```

## Rendering a Complete Symbol

`gs1composite()` emits the whole thing: the linear component with its linkage
flag set, the separator pattern and the 2D component above it. The two halves of
the data are separated by a `|`.

```ts
import { gs1composite } from "etiket"

const svg = gs1composite("databar-omni", "(01)09521234543213|(17)260101(10)LOT42")
svg.startsWith("<svg") // true
```

`gs1compositePNG()` and `gs1compositePNGDataURI()` do the same as a raster.

### Primary Symbologies

| `linearType`               | Primary data               | Default 2D columns |
| :------------------------- | :------------------------- | -----------------: |
| `ean13`                    | 12 or 13 digits            |                  4 |
| `ean8`                     | 7 or 8 digits              |                  3 |
| `upca`                     | 11 or 12 digits            |                  4 |
| `upce`                     | 6 to 8 digits              |                  2 |
| `gs1-128`                  | AI element string          |                  4 |
| `databar-omni`             | GTIN-13/14                 |                  4 |
| `databar-truncated`        | GTIN-13/14                 |                  4 |
| `databar-limited`          | GTIN-13/14 starting 0 or 1 |                  3 |
| `databar-stacked`          | GTIN-13/14                 |                  2 |
| `databar-stacked-omni`     | GTIN-13/14                 |                  2 |
| `databar-expanded`         | AI element string          |                  4 |
| `databar-expanded-stacked` | AI element string          |                  4 |

`encodeGS1CompositeSymbol()` returns the same symbol as data: the module matrix
and the height in modules of each of its rows, plus the three parts on their own.

```ts
import { encodeGS1CompositeSymbol } from "etiket"

const symbol = encodeGS1CompositeSymbol("gs1-128", "(01)03612345678904|(10)LOT42")
symbol.type // "CC-A"
symbol.matrix.length === symbol.rowHeights.length // true
symbol.linear.length > 0 // the bar widths of the primary component
```

## Version Selection

The version starts at `CC-A` and is upgraded automatically when the data does
not fit: `CC-A` to `CC-B`, and `CC-B` to `CC-C` behind a GS1-128, whose width
sets the column count of the PDF417. Pass `type` to start somewhere else.

```ts
import { encodeGS1CompositeSymbol } from "etiket"

encodeGS1CompositeSymbol("gs1-128", "(01)03612345678904|(10)LOT42", { type: "CC-C" }).type // "CC-C"
```

`CC-C` needs a GS1-128 primary at least 68 modules wide; anything else raises
`CapacityError`, as does data too large for the largest symbol of its version.

## Caveats

- A parenthesised input is validated as an AI string and raises
  `InvalidInputError` when malformed. Input with no `(` is passed through as raw
  element string data, unvalidated.
- An unknown composite type raises `InvalidInputError`; empty data does too, and
  so does data with no `|` separator.
- The stacked primaries have no single row of bars, so `linear` comes back empty
  for them and `linearRows` carries their modules instead.
