# 2D Codes

Besides QR Code, etiket supports a full range of 2D, stacked and polychrome
symbologies. Every format has a convenience function returning SVG, a raw
encoder returning the module matrix, and — apart from JAB Code — PNG output.

| Format         | Function          | Raw encoder           | PNG                  |
| :------------- | :---------------- | :-------------------- | :------------------- |
| Data Matrix    | `datamatrix()`    | `encodeDataMatrix`    | `datamatrixPNG()`    |
| GS1 DataMatrix | `gs1datamatrix()` | `encodeGS1DataMatrix` | `gs1datamatrixPNG()` |
| PDF417         | `pdf417()`        | `encodePDF417`        | `pdf417PNG()`        |
| MicroPDF417    | `micropdf417()`   | `encodeMicroPDF417`   | `micropdf417PNG()`   |
| Aztec          | `aztec()`         | `encodeAztec`         | `aztecPNG()`         |
| Micro QR       | `microqr()`       | `encodeMicroQR`       | `microqrPNG()`       |
| rMQR           | `rmqr()`          | `encodeRMQR`          | `rmqrPNG()`          |
| MaxiCode       | `maxicode()`      | `encodeMaxiCode`      | `maxicodePNG()`      |
| DotCode        | `dotcode()`       | `encodeDotCode`       | `dotcodePNG()`       |
| Han Xin        | `hanxin()`        | `encodeHanXin`        | `hanxinPNG()`        |
| Codablock-F    | `codablockf()`    | `encodeCodablockF`    | `codablockfPNG()`    |
| Code 16K       | `code16k()`       | `encodeCode16K`       | `code16kPNG()`       |
| JAB Code       | `jabcode()`       | `encodeJABCode`       | —                    |

## Data Matrix

ECC 200 standard. 24 square sizes (10x10 to 144x144) plus 6 rectangular sizes.

```ts
import { datamatrix, encodeDataMatrix } from "etiket";

// Convenience function — returns SVG
datamatrix("Hello World");
datamatrix("Data", { size: 200, color: "#333" });

// Raw encoder — returns boolean[][]
const matrix = encodeDataMatrix("Hello");
```

Used in: electronics, healthcare, aerospace (small items requiring dense data).

## PDF417

Stacked 2D barcode with 929 possible codeword values and 9 error correction levels.

```ts
import { pdf417, encodePDF417 } from "etiket";

// Convenience function — returns SVG
pdf417("Hello World");
pdf417("Data", { ecLevel: 4, columns: 5, compact: true });

// Raw encoder — returns { matrix, rows, cols }
const result = encodePDF417("Hello", { ecLevel: 2 });
```

| Option    | Type      | Default | Description                         |
| :-------- | :-------- | :------ | :---------------------------------- |
| `ecLevel` | `0-8`     | `2`     | Error correction level              |
| `columns` | `1-30`    | auto    | Number of data columns              |
| `compact` | `boolean` | `false` | Compact PDF417 (no right indicator) |

Used in: government IDs, transport tickets, shipping labels.

## Aztec Code

Bullseye-centered barcode. No quiet zone required — ideal for space-constrained applications.

```ts
import { aztec, encodeAztec } from "etiket";

// Convenience function — returns SVG
aztec("Hello World");
aztec("Data", { ecPercent: 33, size: 200 });

// Raw encoder — returns boolean[][]
const matrix = encodeAztec("Hello", { compact: true });
```

| Option      | Type      | Default | Description                               |
| :---------- | :-------- | :------ | :---------------------------------------- |
| `ecPercent` | `number`  | `23`    | Error correction percentage               |
| `layers`    | `number`  | auto    | Force specific layer count                |
| `compact`   | `boolean` | auto    | Compact (1-4 layers) or full-range (1-32) |

Used in: boarding passes, transport tickets, healthcare.

## Micro QR Code

Compact QR variant (ISO/IEC 18004) with a single finder pattern. Versions M1–M4,
11×11 to 17×17 modules.

```ts
import { microqr, encodeMicroQR } from "etiket";

microqr("12345");
microqr("12345", { version: 3, ecLevel: "M", size: 200 });

const matrix = encodeMicroQR("12345");
```

| Option    | Type      | Default | Description                    |
| :-------- | :-------- | :------ | :----------------------------- |
| `version` | `1-4`     | auto    | M1–M4                          |
| `ecLevel` | `L\|M\|Q` | auto    | Error correction (M1 has none) |
| `mask`    | `0-3`     | auto    | Force a mask pattern           |

Used in: small electronic components, where a full QR code will not fit.

## rMQR (Rectangular Micro QR)

ISO/IEC 23941 rectangular QR variant for narrow spaces.

```ts
import { rmqr, encodeRMQR } from "etiket";

rmqr("HELLO");
rmqr("HELLO", { ecLevel: "H" });
```

| Option    | Type   | Default | Description               |
| :-------- | :----- | :------ | :------------------------ |
| `version` | `0-31` | auto    | Index into the size table |
| `ecLevel` | `M\|H` | `M`     | Error correction level    |

Used in: cables, cylindrical items, narrow labels.

## MaxiCode

Fixed 33×30 hexagonal matrix with a bullseye finder, used by carriers for
package sorting. Modules are hexagons on a staggered grid, so MaxiCode gets a
dedicated renderer.

```ts
import { maxicode, encodeMaxiCode, maxicodePNG } from "etiket";

maxicode("HELLO");
maxicode("HELLO", { mode: 2, postalCode: "123456789", countryCode: 840, serviceClass: 1 });

maxicodePNG("HELLO", { moduleSize: 10 });
```

| Option         | Type     | Default | Description                                           |
| :------------- | :------- | :------ | :---------------------------------------------------- |
| `mode`         | `2-6`    | `4`     | 2/3 structured carrier message, 4 standard, 5 full EC |
| `postalCode`   | `string` | —       | Modes 2 and 3                                         |
| `countryCode`  | `number` | —       | ISO country code, modes 2 and 3                       |
| `serviceClass` | `number` | —       | Carrier service class, modes 2 and 3                  |

Modes 2 and 3 carry a Structured Carrier Message: mode 2 for numeric postal
codes, mode 3 for alphanumeric ones.

Used in: parcel carriers (notably UPS).

## DotCode

High-speed dot matrix symbology for laser-marked and inkjet-printed items.

```ts
import { dotcode, encodeDotCode } from "etiket";

dotcode("HELLO");
```

Used in: tobacco packaging, high-speed production lines.

## Han Xin Code

Chinese national 2D standard (ISO/IEC 20830), 84 versions from 23×23 to
189×189 modules, with four finder patterns.

```ts
import { hanxin, encodeHanXin } from "etiket";

hanxin("HELLO");
hanxin("HELLO", { ecLevel: 3, version: 5 });
```

| Option    | Type   | Default | Description                                 |
| :-------- | :----- | :------ | :------------------------------------------ |
| `ecLevel` | `1-4`  | `1`     | L1 ≈ 8%, L2 ≈ 15%, L3 ≈ 23%, L4 ≈ 30%       |
| `version` | `1-84` | auto    | Symbol is `version * 2 + 21` modules square |

Automatically selects numeric, text or binary mode based on the input.

## Stacked Symbologies

Codablock-F, Code 16K and MicroPDF417 stack rows of linear barcodes. Their rows
are taller than a module is wide; `rowHeight` controls that ratio and defaults
to a spec-appropriate value per format.

```ts
import { codablockf, code16k, micropdf417 } from "etiket";

codablockf("CODABLOCK F DATA", { columns: 8 });
code16k("CODE 16K DATA");
micropdf417("MICRO", { columns: 2 });

// Square modules instead of tall rows
code16k("DATA", { rowHeight: 1 });
```

| Format      | Option    | Description                    |
| :---------- | :-------- | :----------------------------- |
| Codablock-F | `columns` | Data columns per row           |
| MicroPDF417 | `columns` | `1`–`4` data columns           |
| Code 16K    | —         | Rows chosen from the data size |

Used in: healthcare (Codablock-F), small-item labelling (Code 16K, MicroPDF417).

## JAB Code

Polychrome symbology carrying more than one bit per module. `encodeJABCode`
returns a matrix of palette indices plus the palette itself, so it renders
through the colour matrix renderer.

```ts
import { jabcode, encodeJABCode, renderColorMatrixSVG } from "etiket";

jabcode("HELLO");
jabcode("HELLO", { colors: 8, ecPercent: 30 });

// Custom palette
const result = encodeJABCode("HELLO", { colors: 4 });
renderColorMatrixSVG(result.matrix, result.palette, {
  palette: ["#000000", "#e63946", "#457b9d", "#f1faee"],
});
```

| Option      | Type     | Default | Description                 |
| :---------- | :------- | :------ | :-------------------------- |
| `colors`    | `4 \| 8` | `4`     | Palette size                |
| `ecPercent` | `number` | `20`    | Error correction percentage |

JAB Code has no PNG output, since the PNG encoder writes single-colour symbols.

## Shared Rendering Options

Every matrix-based format accepts:

| Option                                  | Type     | Default | Description                                  |
| :-------------------------------------- | :------- | :------ | :------------------------------------------- |
| `size`                                  | `number` | `200`   | SVG size in pixels                           |
| `margin`                                | `number` | `2`     | Quiet zone in modules                        |
| `color`                                 | `string` | `#000`  | Module colour                                |
| `background`                            | `string` | `#fff`  | Background; `transparent` omits the rect     |
| `rowHeight`                             | `number` | `1`     | Row height as a multiple of the module width |
| `ariaLabel` / `role` / `title` / `desc` | `string` | —       | Accessibility metadata                       |
