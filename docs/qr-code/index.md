# QR Code

Full ISO/IEC 18004 implementation. Versions 1-40, all error correction levels, multiple encoding modes, and extensive styling options.

## Basic Usage

```ts
import { qrcode } from "etiket"

qrcode("https://example.com")
qrcode("Hello World", { size: 300 })
```

## Error Correction

| Level | Recovery | Best For                  |
| :---- | :------- | :------------------------ |
| `L`   | ~7%      | Maximum data capacity     |
| `M`   | ~15%     | General use (default)     |
| `Q`   | ~25%     | Industrial environments   |
| `H`   | ~30%     | Required when using logos |

```ts
import { qrcode } from "etiket"

qrcode("data", { ecLevel: "H" })
```

## Encoding Modes

etiket auto-detects the optimal mode and can mix several in one symbol, or you
can force a single mode for the whole payload:

| Mode           | Characters                     | Efficiency         |
| :------------- | :----------------------------- | :----------------- |
| `numeric`      | `0-9`                          | 3.3 digits/10 bits |
| `alphanumeric` | `0-9`, `A-Z`, ` $%*+-./:`      | 2 chars/11 bits    |
| `byte`         | Any (UTF-8)                    | 1 byte/8 bits      |
| `kanji`        | Shift-JIS double byte          | 1 char/13 bits     |
| `auto`         | Any — picks the cheapest split | default            |

```ts
import { qrcode } from "etiket"

qrcode("12345", { mode: "numeric" })
qrcode("HELLO", { mode: "alphanumeric" })
qrcode("hello", { mode: "byte" })
qrcode("漢字テスト", { mode: "kanji" })
qrcode("auto detected") // mode: "auto" (default)
```

With `auto`, a segment optimiser runs a dynamic program over all four modes and
picks the cheapest split for the version being tried — a short digit run inside
alphanumeric text is left where it is, because the mode switch would cost more
than it saves. Forcing a mode encodes the whole payload as one segment.

See [Kanji Mode](/qr-code/kanji-mode) for the Shift-JIS details.

## Version Selection

Versions 1-40 control the QR code size (21x21 to 177x177 modules). Auto-selected by default based on data length and EC level.

```ts
import { qrcode } from "etiket"

// Auto (smallest version that fits)
qrcode("data")

// Force specific version
qrcode("data", { version: 10 }) // 57x57 modules
```

`minVersion` starts the search at that version, so a symbol never comes out
smaller than a size you have reserved for it. `boostEcc` runs after the version
is chosen and raises the error correction level as far as the data still fits
without growing the symbol:

```ts
import { qrcode } from "etiket"

qrcode("data", { minVersion: 5 }) // version 5 or larger, whichever fits
qrcode("data", { ecLevel: "L", boostEcc: true }) // version 1, level H
```

`minVersion` above a fixed `version` throws `InvalidInputError`.

## Mask Pattern

8 mask patterns are evaluated and the best one is automatically selected. You can override:

```ts
import { qrcode } from "etiket"

qrcode("data", { mask: 3 }) // Force mask pattern 3
```

## Encoder Options

Every option below is accepted by `qrcode()`, `encodeQR()`, `qrcodePNG()` and the
payload helpers, alongside the [styling options](/qr-code/styling).

| Option                 | Type                       | Default | Description                                   |
| :--------------------- | :------------------------- | :------ | :-------------------------------------------- |
| `ecLevel`              | `"L" \| "M" \| "Q" \| "H"` | `"M"`   | Error correction level                        |
| `version`              | `1-40`                     | auto    | Symbol version                                |
| `minVersion`           | `1-40`                     | `1`     | Smallest version to consider                  |
| `boostEcc`             | `boolean`                  | `false` | Raise `ecLevel` while the symbol stays as is  |
| `mode`                 | see above                  | `auto`  | Force a single encoding mode                  |
| `mask`                 | `0-7`                      | auto    | Force a mask pattern                          |
| `eci`                  | `number`                   | —       | ECI assignment number, e.g. 26 for UTF-8      |
| `gs1`                  | `boolean`                  | `false` | Encode a parenthesised AI string as GS1 data  |
| `applicationIndicator` | `string`                   | —       | FNC1 in the second position: `"12"` or `"A"`  |
| `structuredAppend`     | `{ index, total, parity }` | —       | [Sequence header](/qr-code/structured-append) |

## Symbol Metadata

`encodeQRSymbol()` returns the matrix together with what shaped it: the version,
the error correction level actually used (after `boostEcc`) and the mask. It is
the narrow QR path: no kanji mode, GS1 or Structured Append, so a bundle that
imports only it leaves them out. `tryEncodeQRSymbol()` returns `null` when the
data does not fit, for render paths that must not throw.

```ts
import { encodeQRSymbol, tryEncodeQRSymbol } from "etiket/qr"

const { version, ecLevel, mask, size, modules } = encodeQRSymbol("hello", {
  ecLevel: "L",
  boostEcc: true,
})
// version 1, ecLevel "H", size 21, modules[row][column] is true for a dark module

tryEncodeQRSymbol("A".repeat(10_000)) // null
```

An empty string is a byte segment of length 0, so `encodeQRSymbol("")` is a
valid version 1 symbol (as is `encodeQRCore("")`). Byte mode writes a lone UTF-16
surrogate as U+FFFD, as `TextEncoder` does. Invalid options (a version outside
1-40, for one) throw from both functions; only `CapacityError` becomes `null`.
`encodeQR()` and `qrcode()` still reject an empty string.

## Character Sets and ECI

Byte-mode data is UTF-8. Declare a character set explicitly when the reader needs
telling:

```ts
import { qrcode } from "etiket"

qrcode("Grüße", { eci: 26 }) // UTF-8
qrcode("Grüße", { eci: 3 }) // ISO-8859-1
qrcode("日本語", { eci: 20 }) // Shift-JIS
```

The ECI header costs 12 to 28 bits out of the version's capacity.

## GS1 QR Code

`gs1: true` — or the `gs1qr()` helper — encodes a parenthesised Application
Identifier string under the FNC1 first-position flag, which is what tells a
reader the payload is GS1 element strings:

```ts
import { qrcode, gs1qr } from "etiket"

gs1qr("(01)09501101020917(10)LOT42")
qrcode("(01)09501101020917(10)LOT42", { gs1: true })
```

Variable-length AIs are terminated with an FNC1 separator, written as `%` in
alphanumeric mode (a literal `%` doubles to `%%`) and as GS `0x1D` in byte mode.

For an FNC1 in the _second_ position — the AIM application-agreement form — pass
`applicationIndicator` instead, either two digits or a single letter:

```ts
import { qrcode } from "etiket"

qrcode("AB1234", { applicationIndicator: "A" })
qrcode("AB1234", { applicationIndicator: "12" })
```

`gs1` wins if both are set.

## Related Pages

| Page                                            | Covers                                    |
| :---------------------------------------------- | :---------------------------------------- |
| [Styling](/qr-code/styling)                     | Dot types, gradients, corners, logos      |
| [Micro QR](/qr-code/micro-qr)                   | M1–M4, the compact variant                |
| [rMQR](/qr-code/rmqr)                           | The rectangular variant                   |
| [Structured Append](/qr-code/structured-append) | Splitting one message across many symbols |
| [Kanji Mode](/qr-code/kanji-mode)               | Shift-JIS encoding at 13 bits per char    |

## Raw Encoder

```ts
import { encodeQR } from "etiket"

const matrix = encodeQR("Hello", { ecLevel: "H" })
// boolean[][] — true = dark module
matrix.length // 21 — version 1
```
