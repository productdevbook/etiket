# QR Code Styling

etiket supports extensive QR code customization with dot shapes, gradients, corner styling, and logo embedding.

## Dot Types

12 module shapes available:

```ts
import { qrcode } from "etiket"

qrcode("Hello", { dotType: "square" }) // Default
qrcode("Hello", { dotType: "rounded" }) // Rounded corners
qrcode("Hello", { dotType: "dots" }) // Circular
qrcode("Hello", { dotType: "diamond" }) // 45° rotated
qrcode("Hello", { dotType: "classy" }) // One rounded corner
qrcode("Hello", { dotType: "classy-rounded" })
qrcode("Hello", { dotType: "extra-rounded" }) // Fully rounded
qrcode("Hello", { dotType: "vertical-line" })
qrcode("Hello", { dotType: "horizontal-line" })
qrcode("Hello", { dotType: "small-square" }) // With gap
qrcode("Hello", { dotType: "tiny-square" }) // Smaller with gap
```

Module size (0.1 to 1):

```ts
qrcode("Hello", { dotType: "dots", dotSize: 0.8 })
```

## Gradients

Apply linear or radial gradients to modules or background:

```ts
// Linear gradient on modules
qrcode("Hello", {
  color: {
    type: "linear",
    rotation: 45,
    stops: [
      { offset: 0, color: "#ff6b6b" },
      { offset: 1, color: "#4ecdc4" },
    ],
  },
})

// Radial gradient on background
qrcode("Hello", {
  background: {
    type: "radial",
    stops: [
      { offset: 0, color: "#ffffff" },
      { offset: 1, color: "#f0f0f0" },
    ],
  },
})
```

## Corner (Finder Pattern) Styling

Customize each of the three finder patterns independently:

```ts
qrcode("Hello", {
  corners: {
    topLeft: {
      outerShape: "rounded", // 'square' | 'rounded' | 'dots' | 'extra-rounded' | 'classy'
      innerShape: "dots", // 'square' | 'dots' | 'rounded'
      outerColor: "#ff0000",
      innerColor: "#0000ff",
    },
    topRight: {
      outerShape: "extra-rounded",
      outerColor: {
        type: "linear",
        stops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#ff8800" },
        ],
      },
    },
    bottomLeft: {
      outerShape: "dots",
    },
  },
})
```

## Logo Embedding

Place a logo at the center of the QR code:

```ts
qrcode("Hello", {
  ecLevel: "H", // Recommended: use high EC when embedding a logo
  logo: {
    svg: '<circle r="50" fill="red"/>', // Inline SVG
    size: 0.3, // 30% of QR size
    margin: 4, // Padding around logo
    hideBackgroundDots: true, // Remove modules behind logo
    backgroundColor: "#ffffff", // Background behind logo
  },
})

// Or use SVG path data
qrcode("Hello", {
  ecLevel: "H",
  logo: {
    path: "M10 10 L90 10 L90 90 L10 90 Z", // SVG path
    size: 0.25,
  },
})

// Or use an image (PNG, JPEG, SVG URL, or data URI)
import { readFileSync } from "node:fs"

qrcode("Hello", {
  ecLevel: "H",
  logo: {
    imageUrl: "https://example.com/logo.png",
    // imageWidth / imageHeight are optional (defaults to fill logo area)
  },
})

// ICO/favicon files are auto-converted to PNG
const favicon = readFileSync("favicon.ico")
qrcode("Hello", {
  ecLevel: "H",
  logo: {
    imageUrl: `data:image/x-icon;base64,${favicon.toString("base64")}`,
  },
})
```

**Supported image formats for `imageUrl`:**

- PNG, JPEG, GIF, SVG — used directly in SVG `<image>`
- ICO (`image/x-icon`, `image/vnd.microsoft.icon`) — auto-converted to PNG

## Transparent Background

```ts
qrcode("Hello", { background: "transparent" })
```

## XML Declaration

Add `<?xml version="1.0"?>` header for standalone SVG files:

```ts
qrcode("Hello", { xmlDeclaration: true })
```
