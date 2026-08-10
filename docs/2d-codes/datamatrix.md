# Data Matrix

ECC 200 (ISO/IEC 16022) — a square or rectangular matrix with an L-shaped finder
and Reed-Solomon error correction. The densest of the mainstream 2D symbologies
at small sizes, which is why it ends up on things that are physically tiny.

## When to Use It

- Direct part marking: electronics, surgical instruments, aerospace components
- Pharmaceutical packaging (usually as [GS1 DataMatrix](#gs1-datamatrix))
- Anywhere the label is a few millimetres across and a QR code will not fit

## Usage

```ts
import { datamatrix, encodeDataMatrix } from "etiket"

// Convenience function — returns SVG
datamatrix("Hello World")
datamatrix("Data", { size: 200, color: "#333" })

// Raw encoder — returns boolean[][], true = dark module
const matrix = encodeDataMatrix("Hello")
```

A sub-path export keeps the rest of the library out of the bundle:

```ts
import { datamatrix, encodeDataMatrix } from "etiket/datamatrix"

datamatrix("Hello")
encodeDataMatrix("Hello")
```

## Symbol Sizes

| Family               | Sizes | Range           | Data codewords |
| :------------------- | :---- | :-------------- | :------------- |
| Square (ISO 16022)   | 24    | 10×10 – 144×144 | 3 – 1558       |
| Rectangular          | 6     | 8×18 – 16×48    | 5 – 49         |
| DMRE (ISO/IEC 21471) | 18    | 8×48 – 26×64    | 18 – 118       |

The largest symbol holds 1558 data codewords, which works out at **3116 digits**
(ASCII mode packs a digit pair into one codeword), about **2330 characters**
through C40 or Text mode, or 1558 characters in plain ASCII mode.

By default only the square sizes are considered — they are the sizes every
reader supports. Widen the search with `shape` and `dmre`:

```ts
import { datamatrix, encodeDataMatrix, DATAMATRIX_SYMBOL_SIZES } from "etiket"

// Rectangular ISO 16022 sizes only
datamatrix("Hello", { shape: "rectangle" })

// Smallest symbol of either shape
datamatrix("Hello", { shape: "auto" })

// Allow the ISO 21471 rectangular extension sizes as well
encodeDataMatrix("A longer payload that wants a wide symbol", {
  shape: "rectangle",
  dmre: true,
})

// Force an exact size — throws CapacityError when the data does not fit
encodeDataMatrix("Hello", { symbolSize: "26x64" })
encodeDataMatrix("Hello", { symbolSize: { rows: 26, cols: 64 } })

// The table itself is exported
DATAMATRIX_SYMBOL_SIZES.filter((s) => s.dmre).length // 18
```

## Options

| Option       | Type                                | Default    | Description                          |
| :----------- | :---------------------------------- | :--------- | :----------------------------------- |
| `shape`      | `"square" \| "rectangle" \| "auto"` | `"square"` | Which family of sizes to choose from |
| `dmre`       | `boolean`                           | `false`    | Allow the ISO 21471 DMRE sizes       |
| `symbolSize` | `string \| { rows, cols }`          | auto       | Force an exact size, e.g. `"26x64"`  |
| `eci`        | `number`                            | auto       | ECI assignment number for the data   |

Plus the [shared matrix rendering options](/2d-codes/#shared-rendering-options)
— `size`, `margin`, `color`, `background` and the accessibility metadata.

## Encoding Modes

Every applicable mode is tried and the shortest codeword stream wins, so the
encoder can never pick a mode that turns out longer:

| Mode     | Latch | Efficiency        | Good for                        |
| :------- | :---- | :---------------- | :------------------------------ |
| ASCII    | —     | 1 char / codeword | Mixed text; digit pairs are 2:1 |
| C40      | 230   | 3 chars / 2 CW    | Uppercase and digits            |
| Text     | 239   | 3 chars / 2 CW    | Lowercase and digits            |
| X12      | 238   | 3 chars / 2 CW    | ANSI X12 EDI                    |
| EDIFACT  | 240   | 4 chars / 3 CW    | ASCII 32–94                     |
| Base 256 | 231   | 1 byte / codeword | Binary and non-Latin-1 text     |

X12 and EDIFACT only apply when the whole run qualifies — X12 needs a character
count that is a multiple of 3 and no character outside `A-Z 0-9 space CR * >`.

## Character Sets and ECI

Latin-1 text goes out byte-transparently. Anything a Latin-1 byte cannot hold is
encoded as UTF-8 in Base 256 under an automatic ECI 26 declaration:

```ts
import { encodeDataMatrix } from "etiket"

encodeDataMatrix("Grüße") // Latin-1, no ECI needed
encodeDataMatrix("日本語") // UTF-8 bytes under ECI 26, automatically

// Declare a character set explicitly (3 = ISO-8859-1, 26 = UTF-8)
encodeDataMatrix("Grüße", { eci: 3 })
```

## Structured Append

A message too long for one symbol goes across up to sixteen, which a reader
puts back together in order.

```ts
import { encodeDataMatrixSequence, encodeDataMatrix } from "etiket"

const symbols = encodeDataMatrixSequence(longText, { symbols: 3 })
symbols.length // 3

// Or place one symbol of a sequence by hand
encodeDataMatrix(part, { structuredAppend: { index: 2, total: 3, fileId: [17, 42] } })
```

Each symbol opens with four codewords — a marker, its position and the count,
and a two byte file identifier that tells one sequence from another — so a
sequence holds a little less than the sum of its parts. `fileId` defaults to
`[1, 1]`; give the same one to every symbol of a sequence and a different one
to sequences that might be scanned together.

With no `symbols` count the encoder takes the fewest that hold the message, and
never fewer than two: a sequence of one is not something the standard allows.

## GS1 DataMatrix

`gs1datamatrix()` takes a parenthesised Application Identifier string and emits
the FNC1 first-position flag plus FNC1 separators after variable-length fields:

```ts
import { gs1datamatrix, encodeGS1DataMatrix } from "etiket"

gs1datamatrix("(01)09501101020917(10)LOT42")
encodeGS1DataMatrix("(01)09501101020917(17)261231(10)LOT42")
```

## PNG

```ts
import { datamatrixPNG, gs1datamatrixPNG, datamatrixPNGDataURI } from "etiket"

datamatrixPNG("Hello", { moduleSize: 10, margin: 4 })
gs1datamatrixPNG("(01)09501101020917", { moduleSize: 8 })
datamatrixPNGDataURI("Hello")
```

## Caveats

- `gs1datamatrix()` and `encodeGS1DataMatrix()` accept the size options but not
  `eci` — GS1 element strings are ASCII by definition.
- DMRE sizes are off by default because not every reader implements ISO 21471.
  Turn them on only when you control the scanning fleet.
- `symbolSize` is a hard constraint: too much data raises `CapacityError`, and an
  unknown size raises `InvalidInputError` listing the sizes that exist.
- Empty input raises `InvalidInputError`.

## CLI

```bash
etiket datamatrix "Hello" -o dm.svg
etiket datamatrix "(01)09501101020917" --gs1 -o gs1.svg
etiket datamatrix "Hello" --shape rectangle --dmre -o wide.svg
etiket datamatrix "Hello" --symbol-size 26x64 --eci 26 -o fixed.png
```
