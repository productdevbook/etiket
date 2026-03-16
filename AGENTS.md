# etiket

Zero-dependency barcode & QR code SVG generator. 20+ formats, styled QR codes, tree-shakeable. Pure TypeScript.

> [!IMPORTANT]
> Keep `AGENTS.md` updated with project status.

## Project Structure

```
src/
  index.ts                  # Main API — all exports
  barcode.ts                # Sub-path: etiket/barcode
  qr.ts                     # Sub-path: etiket/qr
  datamatrix.ts             # Sub-path: etiket/datamatrix
  pdf417.ts                 # Sub-path: etiket/pdf417
  aztec.ts                  # Sub-path: etiket/aztec
  cli.ts                    # CLI entry (citty + consola)
  errors.ts                 # Custom error classes
  env.d.ts                  # Runtime type declarations
  svg.ts                    # Backward-compat re-exports
  encoders/
    code128.ts              # Code 128 (A/B/C auto + forced charset)
    ean.ts                  # EAN-13, EAN-8
    ean-addon.ts            # EAN-5, EAN-2
    upc.ts                  # UPC-A, UPC-E
    code39.ts               # Code 39 / Extended
    code93.ts               # Code 93 / Extended
    itf.ts                  # ITF, ITF-14
    codabar.ts              # Codabar
    msi.ts                  # MSI Plessey (Mod10/11/1010/1110)
    pharmacode.ts           # Pharmacode
    code11.ts               # Code 11
    gs1-128.ts              # GS1-128 (100+ AIs, FNC1, AI parsing)
    deutsche-post.ts        # Identcode, Leitcode
    postnet.ts              # USPS POSTNET, PLANET
    plessey.ts              # Plessey (UK library)
    fourstate.ts            # 4-state engine: RM4SCC, KIX, Australia Post, Japan Post
    hibc.ts                 # HIBC (medical device labeling)
    isbt128.ts              # ISBT 128 (blood bank)
    qr/                     # QR Code (ISO 18004)
      index.ts              # Main QR encoder
      types.ts              # Types and interfaces
      version.ts            # Version selection (1-40)
      mode.ts               # Encoding modes (numeric/alpha/byte/kanji)
      segment.ts            # Optimal segment switching
      data.ts               # Data bitstream construction
      reed-solomon.ts       # GF(256) RS error correction
      matrix.ts             # Matrix construction
      mask.ts               # 8 mask patterns + 4 penalty rules
      format.ts             # Format/version info encoding
      tables.ts             # Capacity and alignment tables
      micro.ts              # Micro QR (M1-M4)
    datamatrix/             # Data Matrix (ISO 16022)
      index.ts              # Main encoder + GS1 DataMatrix
      encoder.ts            # ASCII/C40/Text/auto encoding
      tables.ts             # Symbol sizes
      placement.ts          # Module placement
      reed-solomon.ts       # RS with GF(256) poly 0x12D
    pdf417/                 # PDF417 (ISO 15438)
      index.ts              # Main encoder
      encoder.ts            # Text/Byte/Numeric compaction
      tables.ts             # Cluster patterns
      ec.ts                 # RS over GF(929)
    aztec/                  # Aztec Code (ISO 24778)
      index.ts              # Main encoder
      encoder.ts            # 5-mode text + binary encoding
      tables.ts             # Mode tables, sizes
      reed-solomon.ts       # Variable GF RS
  renderers/
    svg/
      barcode.ts            # 1D barcode SVG
      qr.ts                 # QR SVG with styling
      matrix.ts             # Generic 2D matrix SVG
      shapes.ts             # 12 dot type generators
      gradient.ts           # Linear/radial gradients
      logo.ts               # Logo embedding (SVG/path/URL)
      optimize.ts           # SVG optimization
      types.ts              # All rendering types
      utils.ts              # escapeAttr utility
    text.ts                 # Terminal output (Unicode blocks)
    data-uri.ts             # SVG → Data URI / Base64
  validators/
    index.ts                # Re-exports
    barcode.ts              # Per-format validation
    qr.ts                   # QR validation with metadata
test/
  *.test.ts                 # 50 test files, 654+ tests
docs/
  **/*.md                   # Documentation (mdzilla-compatible)
```

## Public API

Single entry: `etiket` (everything). Sub-paths: `etiket/barcode`, `etiket/qr`, `etiket/datamatrix`, `etiket/pdf417`, `etiket/aztec`.

Key functions: `barcode()`, `qrcode()`, `datamatrix()`, `pdf417()`, `aztec()`, `gs1datamatrix()`, `swissQR()`, `gs1DigitalLink()`, `wifi()`, `vcard()`, `mecard()`, `event()`, `phone()`, `email()`, `sms()`, `geo()`, `encode()`, `optimizeSVG()`.

## Build & Scripts

```bash
pnpm build          # obuild (rolldown)
pnpm dev            # vitest watch
pnpm lint           # oxlint + oxfmt --check
pnpm lint:fix       # oxlint --fix + oxfmt
pnpm fmt            # oxfmt
pnpm test           # pnpm lint && pnpm typecheck && vitest run
pnpm typecheck      # tsgo --noEmit
pnpm release        # pnpm test && pnpm build && changelogen --release && npm publish && git push --follow-tags
pnpm docs:dev       # npx mdzilla ./docs
```

## Code Conventions

- **Pure ESM** — no CJS
- **Zero runtime dependencies** — CLI deps (citty, consola) are bundled
- **TypeScript strict** — tsgo for typecheck
- **Formatter:** oxfmt (double quotes, semicolons)
- **Linter:** oxlint (unicorn, typescript, oxc plugins)
- **Tests:** vitest in `test/` directory, flat naming
- **Internal files:** prefix with `_` where applicable
- **Exports:** explicit in `src/index.ts`, no barrel re-exports
- **Commits:** semantic lowercase (`feat:`, `fix:`, `chore:`, `docs:`)
- **Issues:** reference in commits (`feat(#N):`)

## Testing

- **Framework:** vitest
- **Location:** `test/` directory (flat structure)
- **Coverage:** `@vitest/coverage-v8`
- Run all: `pnpm test`
- Run single: `pnpm vitest run test/<file>.test.ts`
