# ITF / ITF-14

Interleaved 2 of 5 — high-density numeric barcode used in distribution and logistics.

## ITF

```ts
import { barcode } from "etiket"

// Even number of digits required (odd count gets leading 0)
barcode("1234567890", { type: "itf" })
```

## ITF-14

14-digit variant used for shipping containers and cartons. Supports bearer bars.

```ts
// 14 digits
barcode("00012345678905", { type: "itf14" })

// 13 digits (check digit auto-calculated)
barcode("0001234567890", { type: "itf14" })

// With bearer bars
barcode("00012345678905", {
  type: "itf14",
  bearerBars: true,
  bearerBarWidth: 4,
})
```

## Raw Encoders

```ts
import { encodeITF, encodeITF14 } from "etiket"

const bars = encodeITF("1234567890")
const bars14 = encodeITF14("00012345678905")
```
