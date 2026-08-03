# Code 93

Higher density alternative to Code 39. Two mandatory check digits (C and K).

## Usage

```ts
import { barcode } from "etiket"

// Standard Code 93
barcode("TEST-123", { type: "code93" })

// Extended Code 93 (full ASCII)
barcode("hello world", { type: "code93ext" })
```

## Raw Encoders

```ts
import { encodeCode93, encodeCode93Extended } from "etiket"

const bars = encodeCode93("TEST")
const extBars = encodeCode93Extended("hello")
```
