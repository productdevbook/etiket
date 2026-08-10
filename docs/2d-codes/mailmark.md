# Royal Mail Mailmark

Mailmark is not a symbology of its own. It is a [Data Matrix](/2d-codes/datamatrix)
of a fixed size carrying a fixed data layout, which is how Royal Mail tracks
machine-readable mail through its network.

## When to Use It

- UK business mail entered under a Mailmark contract
- Anywhere the recipient's systems expect the Royal Mail 2D barcode rather than
  the [4-state](/postal/rm4scc) one

## Usage

```ts
import { mailmark, mailmarkPNG } from "etiket"

mailmark("JGB 012100123456789AB19XY1A 0                ", { type: 9 })
mailmarkPNG("JGB 012100123456789AB19XY1A 0                ", { type: 7, moduleSize: 8 })
```

## Barcode Types

Royal Mail's three barcode types are three symbol sizes:

| `type` | Symbol  | Carries                         |
| -----: | :------ | :------------------------------ |
|    `7` | 24 × 24 | The 45 character header alone   |
|    `9` | 32 × 32 | The header and customer content |
|   `29` | 16 × 48 | The same, in a letterbox shape  |

`type` defaults to `7`.

## The Data

Every Mailmark item begins with `JGB ` and a 45 character header — format,
version, class, supply chain and item identifiers, destination postcode and DPS
— space padded to length. Customer content follows it, where the symbol has
room.

```ts
import { encodeMailmark } from "etiket"

encodeMailmark("JGB 012100123456789AB19XY1A 0                ").length // 24
```

The data holds uppercase letters, digits and spaces only. Anything else raises
`InvalidInputError`, pointing at `datamatrix()` with the same `symbolSize` for
callers who need it — that is the same symbol without the Mailmark rules.

Data too long for the type raises `CapacityError`.
