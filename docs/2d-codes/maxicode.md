# MaxiCode

ISO/IEC 16023. A fixed-size symbol — always 33 rows of 30 hexagonal modules,
about one inch square — with a bullseye finder at the centre. Designed to be read
off a parcel travelling past a fixed scanner at speed.

## When to Use It

- Parcel carrier labels, notably UPS
- Any conveyor-sorted item where the symbol must be read at a known size

Anywhere else, a Data Matrix or QR code carries more data in less space.

## Usage

```ts
import { maxicode, encodeMaxiCode } from "etiket"

// Convenience function — returns SVG
maxicode("HELLO")

// Structured Carrier Message for a US destination
maxicode("HELLO", {
  mode: 2,
  postalCode: "123456789",
  countryCode: 840,
  serviceClass: 1,
})

// Raw encoder — a 33x30 boolean matrix
const matrix = encodeMaxiCode("HELLO")
matrix.length // 33
matrix[0]!.length // 30
```

Modules are hexagons on a staggered grid, so MaxiCode gets its own renderer
(`renderMaxiCodeSVG` / `renderMaxiCodePNG`) rather than the square matrix one.

## Modes

| Mode | Purpose                                       | Message capacity |
| :--- | :-------------------------------------------- | :--------------- |
| `2`  | Structured Carrier Message, numeric postcode  | 84 codewords     |
| `3`  | Structured Carrier Message, alphanumeric code | 84 codewords     |
| `4`  | Standard symbol, standard error correction    | 93 codewords     |
| `5`  | Standard symbol, enhanced error correction    | 77 codewords     |
| `6`  | Reader programming                            | 93 codewords     |

Mode 4 is the default. Mode 5 buys extra error correction by giving up 16
codewords of payload.

**Mode 6 is not a data carrier.** It tells a scanner to reconfigure itself from
the symbol's contents. Never put shipping data in it, and never print one on a
label that will pass a production scanner.

## Character Encoding

MaxiCode holds its message in five code sets — uppercase and digits, lowercase,
and three that carry the upper half of Latin-1 between them. Moving between them
costs codewords: one to latch into Code Set A or B, two to lock into C, D or E,
two to shift a single character out of the current set, and three or four to
shift two or three characters into Code Set A. Nine consecutive digits go into
six codewords whichever set is current.

Which of those is cheapest for a given character depends on what follows it, so
the encoder finds the shortest route through the whole message rather than
deciding character by character. There is nothing to configure; the input is
ISO/IEC 8859-1 and anything above U+00FF raises `InvalidInputError`, since this
encoder emits no ECI designator to say the message is anything else.

## Options

| Option         | Type                    | Default | Description                        |
| :------------- | :---------------------- | :------ | :--------------------------------- |
| `mode`         | `2 \| 3 \| 4 \| 5 \| 6` | `4`     | Encoding mode                      |
| `postalCode`   | `string`                | —       | Required for modes 2 and 3         |
| `countryCode`  | `number`                | `840`   | ISO 3166-1 numeric code, modes 2/3 |
| `serviceClass` | `number`                | `1`     | Carrier service class, modes 2/3   |

Plus the [shared matrix rendering options](/2d-codes/#shared-rendering-options).
`maxicode()` defaults `size` to `400`, since a symbol drawn much smaller than
that loses the hexagonal module shape.

## Structured Carrier Message

Modes 2 and 3 pack a 60-bit primary message — postal code, country and service
class — ahead of the secondary message. The two modes differ in the postal code:

| Mode | Postal code                                                      |
| :--- | :--------------------------------------------------------------- |
| `2`  | 1–9 digits. A 5-digit US ZIP (country 840) is zero-filled to 9   |
| `3`  | 1–6 characters from `A-Z`, space, and the ASCII range `"` to `:` |

```ts
import { maxicode } from "etiket"

// US: numeric ZIP+4
maxicode("SHIPMENT 4711", {
  mode: 2,
  postalCode: "12345",
  countryCode: 840,
  serviceClass: 1,
})

// UK: alphanumeric postcode
maxicode("PACKAGE", {
  mode: 3,
  postalCode: "SN34RD",
  countryCode: 826,
  serviceClass: 11,
})
```

`countryCode` and `serviceClass` must each be an integer 0–999.

## PNG

```ts
import { maxicodePNG, maxicodePNGDataURI } from "etiket"

maxicodePNG("HELLO", { moduleSize: 10 })
maxicodePNGDataURI("HELLO")
```

The PNG rasterizer draws the same staggered hexagonal grid as the SVG renderer.

## Caveats

- A malformed postal code **throws** rather than being padded or truncated: mode
  2 with a non-numeric or over-long code, and mode 3 with an empty, over-long or
  out-of-charset code, both raise `InvalidInputError`. A silently wrong postal
  code means a misrouted parcel, so this is deliberate.
- The symbol size is fixed. Too much data raises `CapacityError` naming the mode
  and the codeword count needed — there is no larger symbol to fall back to.
- Modes 2 and 3 lose the 9 codewords that modes 4–6 spend on message data, since
  those go to the Structured Carrier Message instead.
- Empty input raises `InvalidInputError`.

## CLI

```bash
etiket maxicode "HELLO" -o maxicode.svg
etiket maxicode "HELLO" --module-size 8 -o maxicode.png
```
