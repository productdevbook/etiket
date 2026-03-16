# Framework Integration

etiket returns SVG strings, making it easy to use in any framework.

## React

```tsx
import { qrcode, barcode } from "etiket";

function QRCode({ text, ...options }) {
  const svg = qrcode(text, options);
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Barcode({ text, type = "code128", ...options }) {
  const svg = barcode(text, { type, ...options });
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

// Usage
export default function App() {
  return (
    <>
      <QRCode text="https://example.com" size={200} dotType="dots" />
      <Barcode text="Hello" showText />
    </>
  );
}
```

## Vue

```vue
<script setup lang="ts">
import { qrcode, barcode } from "etiket";

const qr = qrcode("https://example.com", { size: 200, dotType: "dots" });
const bc = barcode("Hello", { showText: true });
</script>

<template>
  <div v-html="qr" />
  <div v-html="bc" />
</template>
```

## Svelte

```svelte
<script lang="ts">
  import { qrcode, barcode } from "etiket";

  let text = "https://example.com";
  $: qr = qrcode(text, { size: 200, dotType: "dots" });
  $: bc = barcode("Hello", { showText: true });
</script>

{@html qr}
{@html bc}
```

## Solid

```tsx
import { qrcode, barcode } from "etiket";

function QRCode(props) {
  const svg = () => qrcode(props.text, props);
  return <div innerHTML={svg()} />;
}
```

## Angular

```typescript
import { Component } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { qrcode } from "etiket";

@Component({
  selector: "app-qr",
  template: `<div [innerHTML]="svg"></div>`,
})
export class QRComponent {
  svg = this.sanitizer.bypassSecurityTrustHtml(qrcode("https://example.com"));
  constructor(private sanitizer: DomSanitizer) {}
}
```

## Server-Side (Node.js / Bun / Deno)

```ts
import { writeFileSync } from "node:fs";
import { qrcode, barcode } from "etiket";

// Write SVG files
writeFileSync("qr.svg", qrcode("https://example.com"));
writeFileSync("barcode.svg", barcode("Hello", { showText: true }));
```

## Cloudflare Workers

```ts
import { qrcode } from "etiket";

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    const text = url.searchParams.get("text") || "Hello";
    const svg = qrcode(text, { size: 300 });

    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  },
};
```
