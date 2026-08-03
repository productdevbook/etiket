# Pharmacode

Binary barcode used in pharmaceutical packaging. Readable in both directions.

## Usage

```ts
import { barcode } from "etiket"

// Value must be 3-131070
barcode("1234", { type: "pharmacode" })
barcode("50000", { type: "pharmacode" })
```

## Raw Encoder

```ts
import { encodePharmacode } from "etiket"

const bars = encodePharmacode(1234)
```
