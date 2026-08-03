# EAN / EAN Addons

European Article Number — the global standard for retail products.

## EAN-13

```ts
import { barcode } from "etiket"

// 13 digits (with check digit)
barcode("4006381333931", { type: "ean13" })

// 12 digits (check digit auto-calculated)
barcode("400638133393", { type: "ean13", showText: true })
```

## EAN-8

Compact version for small packages.

```ts
// 8 digits (with check digit)
barcode("96385074", { type: "ean8" })

// 7 digits (check digit auto-calculated)
barcode("9638507", { type: "ean8" })
```

## EAN-5 (Addon)

5-digit supplemental barcode for book pricing.

```ts
// Price $24.95
barcode("52495", { type: "ean5" })
```

## EAN-2 (Addon)

2-digit supplemental barcode for periodical issue numbers.

```ts
barcode("53", { type: "ean2" })
```

## Raw Encoders

```ts
import { encodeEAN13, encodeEAN8, encodeEAN5, encodeEAN2 } from "etiket"

const { bars, guards } = encodeEAN13("4006381333931")
const { bars: bars8, guards: guards8 } = encodeEAN8("96385074")
const addon5 = encodeEAN5("52495") // number[]
const addon2 = encodeEAN2("53") // number[]
```
