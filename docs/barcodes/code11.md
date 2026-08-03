# Code 11

Barcode used in telecommunications for labeling equipment.

## Usage

```ts
import { barcode } from "etiket"

barcode("123-456", { type: "code11" })
```

Character set: `0-9`, `-`

Check digits are automatic:

- Data length <= 10: one check digit (C)
- Data length > 10: two check digits (C + K)

## Raw Encoder

```ts
import { encodeCode11 } from "etiket"

const bars = encodeCode11("123-456")
```
