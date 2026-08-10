# Aztec Code

ISO/IEC 24778. A bullseye finder at the centre with data spiralling outwards in
layers. Because the finder is central and the reference grid is built in, Aztec
needs **no quiet zone** — it can sit flush against other print.

## When to Use It

- Rail and air tickets — the European rail ticket standard uses it
- Boarding passes and event admission
- Anywhere the label is crowded and a quiet zone is a luxury

## Usage

```ts
import { aztec, encodeAztec } from "etiket"

// Convenience function — returns SVG
aztec("Hello World")
aztec("Data", { ecPercent: 33, size: 200 })

// Raw encoder — returns boolean[][], true = dark module
const matrix = encodeAztec("Hello", { compact: true })
matrix.length // 15 — a 1-layer compact symbol
```

A sub-path export keeps everything else out of the bundle:

```ts
import { aztec, encodeAztec } from "etiket/aztec"

aztec("Hello")
encodeAztec("Hello")
```

## Symbol Sizes

| Variant    | Layers | Modules         |
| :--------- | :----- | :-------------- |
| Compact    | 1 – 4  | 15×15 – 27×27   |
| Full-range | 1 – 32 | 19×19 – 151×151 |

The encoder picks the smallest symbol that holds the data at the requested error
correction percentage, preferring compact when it fits. At the default 23% error
correction a full 32-layer symbol holds roughly the 3800 digits, 3000 letters or
1900 bytes ISO/IEC 24778 quotes; past that the encoder raises `CapacityError`.

## Options

| Option      | Type      | Default | Description                                       |
| :---------- | :-------- | :------ | :------------------------------------------------ |
| `ecPercent` | `number`  | `23`    | Error correction as a percentage of the data bits |
| `layers`    | `number`  | auto    | Force a layer count (1–4 compact, 1–32 full)      |
| `compact`   | `boolean` | auto    | Force the compact or the full-range form          |
| `eci`       | `number`  | auto    | ECI assignment number for the data                |

Plus the [shared matrix rendering options](/2d-codes/#shared-rendering-options).
Note that `aztec()` defaults `margin` to `0` rather than `2`, since the format
does not require a quiet zone:

```ts
import { aztec } from "etiket"

aztec("Hello") // no quiet zone
aztec("Hello", { margin: 2 }) // add one anyway
```

## Encoding Modes

Five text modes — Upper, Lower, Mixed, Punctuation and Digit — plus Binary Shift
for arbitrary bytes. The encoder switches between them to minimise the bit
stream, exactly as the ZXing reference encoder does.

ISO-8859-1 text stays byte-transparent. Anything outside it becomes UTF-8 under
an automatic ECI 000026 declaration, emitted as an FLG(n) sequence:

```ts
import { encodeAztec } from "etiket"

encodeAztec("Grüße") // ISO-8859-1, no FLG(n)
encodeAztec("日本語") // UTF-8 under ECI 000026
encodeAztec("Grüße", { eci: 3 }) // declared as ISO-8859-1
```

## PNG

```ts
import { aztecPNG, aztecPNGDataURI } from "etiket"

aztecPNG("Hello", { moduleSize: 10, margin: 0 })
aztecPNGDataURI("Hello", { moduleSize: 6 })
```

`renderMatrixPNG` defaults `margin` to 4 modules, so pass `margin: 0` if you
want the borderless symbol the format allows.

## Aztec Rune

A rune carries a single byte — 0 to 255 — in eleven modules square. It is a
compact Aztec with no data layers at all: the value goes in the mode message,
inverted against 1010 so a reader cannot mistake it for the compact symbol it
otherwise looks exactly like. Runes mark shelves, bins and fixtures, where the
number means something to the system reading it and nothing to anyone else.

```ts
import { aztecrune, aztecrunePNG, encodeAztecRune } from "etiket"

aztecrune(42)
aztecrunePNG(42, { moduleSize: 12 })
encodeAztecRune(42).length // 11
```

A value outside 0 to 255, or one that is not a whole number, raises
`InvalidInputError`.

## Caveats

- `ecPercent` is a floor, not an exact figure: the chosen symbol usually has a
  little more error correction than asked for, because layer sizes are discrete.
  The standard recommends at least 23%, which is the default.
- Forcing `layers` with `compact` unset lets the encoder still choose the family;
  set both to pin the symbol exactly.
- A `layers` value too small for the data raises `CapacityError`.
- Empty input raises `InvalidInputError`.

## CLI

```bash
etiket aztec "Hello" -o aztec.svg
etiket aztec "Hello" --ec-percent 33 --compact -o aztec.png
etiket aztec "Hello" --layers 4 --eci 26 -o pinned.svg
etiket aztecrune 42 -o rune.svg
```
