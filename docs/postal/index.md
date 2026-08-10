# Postal Barcodes

Postal symbologies are **height-modulated**: the data lives in each bar's
vertical extent, not its width. They therefore have their own encoder and
renderer, separate from the width-modulated 1D barcodes.

```ts
import { postal, encodePostal } from "etiket"

// Convenience function — returns SVG
postal("12345-6789", { type: "postnet" })
postal("SN34RD1A", { type: "rm4scc" })

// Raw encoder — returns bar states
const bars = encodePostal("SN34RD1A", { type: "rm4scc" })
// ['A', 'T', 'A', ... , 'F']
```

A dedicated sub-path export is available for tree-shaking:

```ts
import { postal, encodePostal } from "etiket/postal"

postal("12345", { type: "postnet" })
encodePostal("12345", { type: "postnet" })
```

## Supported Formats

| Format                                                            | `type`        | Input                         | Family  |
| :---------------------------------------------------------------- | :------------ | :---------------------------- | :------ |
| [USPS POSTNET](/postal/postnet-planet)                            | `postnet`     | 5, 9 or 11 digits             | 2-state |
| [USPS PLANET](/postal/postnet-planet)                             | `planet`      | 11 or 13 digits               | 2-state |
| [Royal Mail RM4SCC](/postal/rm4scc)                               | `rm4scc`      | A-Z, 0-9                      | 4-state |
| [Dutch KIX](/postal/kix)                                          | `kix`         | A-Z, 0-9                      | 4-state |
| [Australia Post](/postal/auspost)                                 | `auspost`     | 8-digit DPID (+ FCC)          | 4-state |
| [Japan Post (JP4SCC)](/postal/japan-post)                         | `jppost`      | 7-digit postcode (+ address)  | 4-state |
| [USPS Intelligent Mail](/postal/imb)                              | `imb`         | 20-digit tracking (+ routing) | 4-state |
| [Two-track Pharmacode](/barcodes/pharmacode#two-track-pharmacode) | `pharmacode2` | 4 to 64570080                 | 2-track |

Check digits are calculated automatically for every format that defines one.

## Bar Families

**2-state** (POSTNET, PLANET) — each bar is either tall (full height) or short,
both sitting on a common baseline. `encodePostal` returns `1` for tall and `0`
for short.

**4-state** (everything else) — each bar is one of four states. `encodePostal`
returns the letters `"T" | "A" | "D" | "F"`:

| State     | Letter | Extent                   |
| :-------- | :----- | :----------------------- |
| Tracker   | `T`    | Centre band only         |
| Ascender  | `A`    | Centre band and upward   |
| Descender | `D`    | Centre band and downward |
| Full      | `F`    | The entire height        |

## Second Data Fields

Some formats take a second field, supplied through options:

```ts
import { postal } from "etiket"

// Australia Post — Format Control Code (default "11")
// "11", "45", "59", "62", "87" and "92" are accepted
postal("12345678", { type: "auspost", fcc: "59" })

// USPS Intelligent Mail — routing code (0, 5, 9 or 11 digits)
postal("01234567094987654321", { type: "imb", routingCode: "01234567891" })

// Japan Post — address following the postal code
postal("1234567", { type: "jppost", routingCode: "1-2-3" })
```

## Rendering Options

```ts
import { postal } from "etiket"

postal("12345", {
  type: "postnet",
  height: 40, // Full-bar height
  barWidth: 2, // Width of a single bar
  pitch: 4, // Centre-to-centre bar spacing (default barWidth * 2)
  color: "#000",
  background: "#fff",
  margin: 10,
  trackerRatio: 1 / 3, // Centre band height, 4-state only
  shortRatio: 0.4, // Short bar height, POSTNET/PLANET only
  showText: true,
  text: "12345",
})
```

| Option         | Type      | Default          | Description                                                   |
| :------------- | :-------- | :--------------- | :------------------------------------------------------------ |
| `height`       | `number`  | `40`             | Full-bar height in units                                      |
| `moduleSize`   | `number`  | `2`              | Width of a single bar                                         |
| `barWidth`     | `number`  | —                | Deprecated alias for `moduleSize`; wins if set                |
| `pitch`        | `number`  | `moduleSize * 2` | Centre-to-centre bar spacing                                  |
| `trackerRatio` | `number`  | `1/3`            | Centre band as a fraction of height (4-state)                 |
| `shortRatio`   | `number`  | `0.4`            | Short bar as a fraction of height (2-state)                   |
| `color`        | `string`  | `#000`           | Bar colour                                                    |
| `background`   | `string`  | `#fff`           | Background; `transparent` omits the rect                      |
| `margin`       | `number`  | `10`             | Quiet zone; `marginTop`/`Bottom`/`Left`/`Right` also accepted |
| `unit`         | `string`  | `"px"`           | `px`, `mm`, `cm`, `in` or `pt`                                |
| `showText`     | `boolean` | `false`          | Render human-readable text below the symbol                   |
| `text`         | `string`  | —                | The text to render                                            |
| `fontSize`     | `number`  | `12`             | Text size                                                     |
| `fontFamily`   | `string`  | `monospace`      | Text font                                                     |

Accessibility options (`ariaLabel`, `role`, `title`, `desc`) are supported as
they are on the other renderers.

Note that postal symbols have no `barGap`, `rotation`, `textPosition` or
`bearerBars`: their geometry is fixed by bar height and pitch, not bar width.

## PNG Output

```ts
import { postalPNG, postalPNGDataURI } from "etiket"

const png = postalPNG("12345", { type: "postnet", moduleSize: 2, height: 40 })
const uri = postalPNGDataURI("SN34RD1A", { type: "rm4scc" })

png.length > 0 && uri.startsWith("data:image/png") // true
```

`PostalPNGOptions` mirrors the SVG options in pixels: `moduleSize` (bar width),
`pitch`, `height`, `margin`, `trackerRatio`, `shortRatio`, `color` and
`background`. `scale` is the deprecated alias for `moduleSize`.

## `barcode()` Compatibility

`barcode()` accepts `postnet` and `planet` and routes them to the postal
renderer automatically, so existing calls keep working and now produce correct
height-modulated output:

```ts
import { barcode } from "etiket"

barcode("12345", { type: "postnet" }) // identical to postal("12345")
```

`encodeBars()` — which returns bar _widths_ — throws for these types, since a
height-modulated symbology has no meaningful width pattern. Use `encodePostal()`
instead.

## Raw Encoders

Each format is also exposed directly:

```ts
import {
  encodePOSTNET,
  encodePLANET,
  encodeRM4SCC,
  encodeKIX,
  encodeAustraliaPost,
  encodeJapanPost,
  encodeIMb,
} from "etiket"

encodePOSTNET("12345") // number[] — 1 = tall, 0 = short
encodePLANET("12345678901") // number[]
encodeRM4SCC("SN34RD1A") // FourState[]
encodeKIX("2500GG30000") // FourState[]
encodeAustraliaPost("11", "12345678") // (fcc, dpid, custInfo?, options?)
encodeJapanPost("1234567", "1-2-3") // (zipcode, address?)
encodeIMb("01234567094987654321", "01234567891") // (tracking, routing?)
```

`encodeAustraliaPost` takes two arguments `postal()` cannot forward: the customer
information as its own argument, and `{ custInfoEncoding: "numeric" }` to pack
digits two bars each instead of three. See [Australia Post](/postal/auspost).

## Low-Level Rendering

```ts
import { encodePostal, renderPostalSVG, renderPostalPNG, renderPostalRaster } from "etiket"

const bars = encodePostal("12345", { type: "postnet" })
renderPostalSVG(bars, { height: 40 })
renderPostalPNG(bars, { moduleSize: 2 })
renderPostalRaster(bars) // { width, height, rows }
```

The renderer detects the family from the input, so 4-state letters and 2-state
heights can both be passed to the same function.

## CLI

```bash
etiket postal "12345" --type postnet -o zip.svg
etiket postal "SN34RD1A" --type rm4scc -o rm.svg
etiket postal "12345678" --type auspost --fcc 59 -o aus.svg
etiket postal "01234567094987654321" --type imb --routing-code 01234567891 -o imb.png
```
