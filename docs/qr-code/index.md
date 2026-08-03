# QR Code

Full ISO/IEC 18004 implementation. Versions 1-40, all error correction levels, multiple encoding modes, and extensive styling options.

## Basic Usage

```ts
import { qrcode } from "etiket"

qrcode("https://example.com")
qrcode("Hello World", { size: 300 })
```

## Error Correction

| Level | Recovery | Best For                  |
| :---- | :------- | :------------------------ |
| `L`   | ~7%      | Maximum data capacity     |
| `M`   | ~15%     | General use (default)     |
| `Q`   | ~25%     | Industrial environments   |
| `H`   | ~30%     | Required when using logos |

```ts
qrcode("data", { ecLevel: "H" })
```

## Encoding Modes

etiket auto-detects the optimal mode, or you can force one:

| Mode           | Characters                | Efficiency         |
| :------------- | :------------------------ | :----------------- |
| `numeric`      | `0-9`                     | 3.3 digits/10 bits |
| `alphanumeric` | `0-9`, `A-Z`, ` $%*+-./:` | 2 chars/11 bits    |
| `byte`         | Any (UTF-8)               | 1 byte/8 bits      |

```ts
qrcode("12345", { mode: "numeric" })
qrcode("HELLO", { mode: "alphanumeric" })
qrcode("hello", { mode: "byte" })
qrcode("auto detected") // mode: "auto" (default)
```

## Version Selection

Versions 1-40 control the QR code size (21x21 to 177x177 modules). Auto-selected by default based on data length and EC level.

```ts
// Auto (smallest version that fits)
qrcode("data")

// Force specific version
qrcode("data", { version: 10 }) // 57x57 modules
```

## Mask Pattern

8 mask patterns are evaluated and the best one is automatically selected. You can override:

```ts
qrcode("data", { mask: 3 }) // Force mask pattern 3
```

## Raw Encoder

```ts
import { encodeQR } from "etiket"

const matrix = encodeQR("Hello", { ecLevel: "H" })
// boolean[][] — true = dark module
```
