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

## Two-Track Pharmacode

The two-track variant carries its data in bar _position_ rather than bar width:
each base-three digit is a short bar on the lower track, a short bar on the
upper track, or a full height bar across both. That makes it height-modulated,
so it renders through the [postal renderer](/postal/).

```ts
import { postal, encodePharmacode2 } from "etiket"

postal("1234", { type: "pharmacode2" })
encodePharmacode2(1234) // ["D", "D", "A", "F", "D", "F", "D"]
```

| Range     | 4 to 64570080                                     |
| :-------- | :------------------------------------------------ |
| Bar state | `"D"` lower track, `"A"` upper, `"F"` full height |

Two tracks rather than three is what `trackerRatio` expresses: `postal()`
defaults it to `0` for this symbology, so a short bar is half the symbol rather
than the two thirds a four-state postal bar takes. Pass `trackerRatio` yourself
to override it.

A value outside the range, or one that is not a whole number, raises
`InvalidInputError`.
