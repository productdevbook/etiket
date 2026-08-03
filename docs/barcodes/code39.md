# Code 39

Widely used in non-retail, logistics, and defense. Self-checking symbology.

## Usage

```ts
import { barcode } from "etiket"

// Standard Code 39 (0-9, A-Z, -.$/+% space)
barcode("HELLO-123", { type: "code39" })

// With optional check digit
barcode("HELLO", { type: "code39", code39CheckDigit: true })

// Extended Code 39 (full ASCII)
barcode("hello world", { type: "code39ext" })
```

## Character Set

**Standard:** `0-9`, `A-Z`, `-`, `.`, `$`, `/`, `+`, `%`, space

**Extended:** Full ASCII (0-127) via shift character pairs (`$`, `%`, `/`, `+`)

## Options

| Option             | Type      | Default | Description               |
| :----------------- | :-------- | :------ | :------------------------ |
| `code39CheckDigit` | `boolean` | `false` | Add modulo-43 check digit |

## Raw Encoder

```ts
import { encodeCode39, encodeCode39Extended } from "etiket"

const bars = encodeCode39("HELLO", { checkDigit: true })
const extBars = encodeCode39Extended("hello")
```
