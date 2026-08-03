# Postal Barcodes

Postal symbologies are **height-modulated**: the data lives in each bar's
vertical extent, not its width. They therefore have their own encoder and
renderer, separate from the width-modulated 1D barcodes.

```ts
import { postal, encodePostal } from "etiket";

// Convenience function — returns SVG
postal("12345-6789", { type: "postnet" });
postal("SN34RD1A", { type: "rm4scc" });

// Raw encoder — returns bar states
const bars = encodePostal("SN34RD1A", { type: "rm4scc" });
// ['A', 'T', 'A', ... , 'F']
```

A dedicated sub-path export is available for tree-shaking:

```ts
import { postal, encodePostal } from "etiket/postal";
```

## Supported Formats

| Format                | `type`    | Input                         | Family  |
| :-------------------- | :-------- | :---------------------------- | :------ |
| USPS POSTNET          | `postnet` | 5, 9 or 11 digits             | 2-state |
| USPS PLANET           | `planet`  | 11 or 13 digits               | 2-state |
| Royal Mail RM4SCC     | `rm4scc`  | A-Z, 0-9                      | 4-state |
| Dutch KIX             | `kix`     | A-Z, 0-9                      | 4-state |
| Australia Post        | `auspost` | 8-digit DPID (+ FCC)          | 4-state |
| Japan Post (JP4SCC)   | `jppost`  | 7-digit postcode (+ address)  | 4-state |
| USPS Intelligent Mail | `imb`     | 20-digit tracking (+ routing) | 4-state |

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
// Australia Post — Format Control Code (default "11")
postal("12345678", { type: "auspost", fcc: "59" });

// USPS Intelligent Mail — routing code (0, 5, 9 or 11 digits)
postal("01234567094987654321", { type: "imb", routingCode: "01234567891" });

// Japan Post — address following the postal code
postal("1234567", { type: "jppost", routingCode: "1-2-3" });
```

## Rendering Options

```ts
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
});
```

| Option         | Type     | Default        | Description                                                   |
| :------------- | :------- | :------------- | :------------------------------------------------------------ |
| `height`       | `number` | `40`           | Full-bar height in units                                      |
| `barWidth`     | `number` | `2`            | Width of a single bar                                         |
| `pitch`        | `number` | `barWidth * 2` | Centre-to-centre bar spacing                                  |
| `trackerRatio` | `number` | `1/3`          | Centre band as a fraction of height (4-state)                 |
| `shortRatio`   | `number` | `0.4`          | Short bar as a fraction of height (2-state)                   |
| `margin`       | `number` | `10`           | Quiet zone; `marginTop`/`Bottom`/`Left`/`Right` also accepted |
| `unit`         | `string` | `"px"`         | `px`, `mm`, `cm`, `in` or `pt`                                |

Accessibility options (`ariaLabel`, `role`, `title`, `desc`) are supported as
they are on the other renderers.

## PNG Output

```ts
import { postalPNG, postalPNGDataURI } from "etiket";

const png = postalPNG("12345", { type: "postnet", scale: 2, height: 40 });
const uri = postalPNGDataURI("SN34RD1A", { type: "rm4scc" });
```

## `barcode()` Compatibility

`barcode()` accepts `postnet` and `planet` and routes them to the postal
renderer automatically, so existing calls keep working and now produce correct
height-modulated output:

```ts
barcode("12345", { type: "postnet" }); // identical to postal("12345")
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
} from "etiket";

encodePOSTNET("12345"); // number[] — 1 = tall, 0 = short
encodeRM4SCC("SN34RD1A"); // FourState[]
encodeAustraliaPost("11", "12345678"); // (fcc, dpid)
encodeJapanPost("1234567", "1-2-3"); // (zipcode, address?)
encodeIMb("01234567094987654321", "01234567891"); // (tracking, routing?)
```

## Low-Level Rendering

```ts
import { renderPostalSVG, renderPostalPNG, renderPostalRaster } from "etiket";

const bars = encodePostal("12345", { type: "postnet" });
renderPostalSVG(bars, { height: 40 });
renderPostalPNG(bars, { scale: 2 });
renderPostalRaster(bars); // { width, height, rows }
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
