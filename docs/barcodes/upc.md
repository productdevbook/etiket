# UPC

Universal Product Code — the standard for retail in North America.

## UPC-A

```ts
import { barcode } from "etiket"

// 12 digits (with check digit)
barcode("012345678905", { type: "upca", showText: true })

// 11 digits (check digit auto-calculated)
barcode("01234567890", { type: "upca" })
```

## UPC-E

Compressed 8-digit version for small packages. Uses zero-suppression encoding.

```ts
// 8 digits (number system + 6 digits + check)
barcode("01234565", { type: "upce" })

// 6 digits (number system 0 implied, check auto-calculated)
barcode("123456", { type: "upce" })
```

## What the Input May Contain

Digits, and the spaces and hyphens a number is printed with — `0-36000-29145-2`
is the same symbol as `036000291452`. Anything else raises `InvalidInputError`
rather than being stripped.

## Raw Encoders

```ts
import { encodeUPCA, encodeUPCE } from "etiket"

const { bars, guards } = encodeUPCA("012345678905")
const { bars: barsE, guards: guardsE } = encodeUPCE("01234565")
```
