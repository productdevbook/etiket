# Code 128

The most versatile 1D barcode. Supports full ASCII with automatic charset optimization.

## Usage

```ts
import { barcode } from "etiket"

barcode("Hello World")
barcode("ABC-123", { type: "code128", showText: true })
```

## How It Works

Code 128 has three character sets:

| Set   | Characters                                | Efficiency     |
| :---- | :---------------------------------------- | :------------- |
| **A** | Control chars (0-31) + uppercase + digits | Standard       |
| **B** | Printable ASCII (32-126)                  | Standard       |
| **C** | Digit pairs (00-99)                       | 2x for numbers |

etiket automatically selects the optimal charset (Auto mode):

- Starts with Code C if the data begins with 4+ digits
- Switches to Code B for mixed alphanumeric content
- Switches to Code A only for control characters
- Dynamically switches between sets for optimal encoding

## Raw Encoder

```ts
import { encodeCode128 } from "etiket"

const bars = encodeCode128("Hello")
// Returns number[] of alternating bar/space widths
```
