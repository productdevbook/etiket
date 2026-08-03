# Codabar

Self-checking barcode used in libraries, blood banks, and FedEx airbills.

## Usage

```ts
import { barcode } from "etiket"

barcode("12345", { type: "codabar" })

// Custom start/stop characters (A, B, C, or D)
barcode("12345", { type: "codabar", codabarStart: "A", codabarStop: "B" })
```

Character set: `0-9`, `-`, `$`, `:`, `/`, `.`, `+`

Start/stop: `A`, `B`, `C`, `D` (auto-detected if present in input, defaults to `A...A`)

## Raw Encoder

```ts
import { encodeCodabar } from "etiket"

const bars = encodeCodabar("12345", { start: "A", stop: "B" })
```
