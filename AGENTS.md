# etiket

Zero-dependency barcode & QR code generator — SVG & PNG output. 40+ formats, styled QR codes, tree-shakeable. Pure TypeScript.

> [!IMPORTANT]
> Keep `AGENTS.md` updated with project status.

## Project Structure

```
src/
  index.ts                  # Main API — all exports
  barcode.ts                # Sub-path: etiket/barcode
  postal.ts                 # Sub-path: etiket/postal
  qr.ts                     # Sub-path: etiket/qr
  datamatrix.ts             # Sub-path: etiket/datamatrix
  pdf417.ts                 # Sub-path: etiket/pdf417
  aztec.ts                  # Sub-path: etiket/aztec
  png.ts                    # Sub-path: etiket/png
  cli.ts                    # CLI bin entry (runMain only)
  _cli.ts                   # CLI command definitions (citty + consola)
  _postal.ts                # Postal encode + render dispatch
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
      postal.ts             # Height-modulated postal SVG (2-state + 4-state)
      color-matrix.ts       # Palette-indexed matrix SVG (JAB Code)
      qr.ts                 # QR SVG with styling
      matrix.ts             # Generic 2D matrix SVG
      shapes.ts             # 12 dot type generators
      gradient.ts           # Linear/radial gradients
      logo.ts               # Logo embedding (SVG/path/URL/ICO)
      ico.ts                # ICO/BMP → PNG converter for logos
      optimize.ts           # SVG optimization
      types.ts              # All rendering types
      utils.ts              # escapeAttr utility
    png/
      types.ts              # BarcodePNGOptions, MatrixPNGOptions, PostalPNGOptions
      crc32.ts              # CRC32 for PNG chunk checksums
      adler32.ts            # Adler32 for zlib wrapper
      deflate.ts            # Stored DEFLATE + zlib compression
      png-encoder.ts        # PNG chunk assembly (palette + true color RGBA)
      rasterize.ts          # bars/matrix/postal/MaxiCode → pixel rows → PNG
    text.ts                 # Terminal output (Unicode blocks)
    data-uri.ts             # SVG → Data URI / Base64
  validators/
    index.ts                # Re-exports
    barcode.ts              # Per-format validation
    qr.ts                   # QR validation with metadata
test/
  *.test.ts                 # 81 test files, 1560+ tests
  qr-roundtrip.test.ts      # QR encode→decode via jsQR (all versions, EC, masks)
  2d-roundtrip.test.ts      # 2D decode verification via zxing-wasm
  encoders-modes-roundtrip.test.ts # Encoder mode coverage, decoded with zxing
  barcode-roundtrip.test.ts # 1D barcode structural validation
  cli.test.ts               # Every CLI subcommand, driven through citty
docs/
  **/*.md                   # Documentation (mdzilla-compatible)
```

## Public API

Single entry: `etiket` (everything). Sub-paths: `etiket/barcode`, `etiket/postal`, `etiket/qr`, `etiket/datamatrix`, `etiket/pdf417`, `etiket/aztec`, `etiket/png`.

1D + postal: `barcode()`, `encodeBars()`, `postal()`, `encodePostal()`.

2D: `qrcode()`, `microqr()`, `rmqr()`, `datamatrix()`, `gs1datamatrix()`, `pdf417()`, `micropdf417()`, `aztec()`, `maxicode()`, `dotcode()`, `hanxin()`, `codablockf()`, `code16k()`, `jabcode()`.

Helpers: `swissQR()`, `gs1DigitalLink()`, `wifi()`, `vcard()`, `mecard()`, `event()`, `phone()`, `email()`, `sms()`, `geo()`, `url()`, `encode()`, `optimizeSVG()`.

PNG: `barcodePNG()`, `postalPNG()`, `qrcodePNG()`, `microqrPNG()`, `rmqrPNG()`, `datamatrixPNG()`, `gs1datamatrixPNG()`, `pdf417PNG()`, `micropdf417PNG()`, `aztecPNG()`, `maxicodePNG()`, `dotcodePNG()`, `hanxinPNG()`, `codablockfPNG()`, `code16kPNG()` + `*PNGDataURI()` variants. Low-level: `renderBarcodePNG()`, `renderMatrixPNG()`, `renderPostalPNG()`, `renderMaxiCodePNG()`.

`encode()` returns a discriminated union: `{ type: "1d", bars }`, `{ type: "2d", matrix }` or `{ type: "postal", bars }`. Its 1D dispatch delegates to `encodeBars()` so the two cannot diverge.

**Height-modulated formats.** POSTNET/PLANET/RM4SCC/KIX/AusPost/JapanPost/IMb encode data in bar _height_. They render through `renderPostalSVG`/`renderPostalPNG`, never the bar-width renderer. `barcode()` routes `postnet`/`planet` there automatically; `encodeBars()` throws for them.

## Build & Scripts

```bash
pnpm build          # obuild (rolldown)
pnpm dev            # vitest watch
pnpm lint           # oxlint + oxfmt --check
pnpm lint:fix       # oxlint --fix + oxfmt
pnpm fmt            # oxfmt
pnpm test           # pnpm lint && pnpm typecheck && vitest run
pnpm typecheck      # tsc --noEmit
pnpm release        # pnpm test && pnpm build && changelogen --release && npm publish && git push --follow-tags
pnpm docs:dev       # npx mdzilla ./docs
```

## Code Conventions

- **Pure ESM** — no CJS
- **Zero runtime dependencies** — CLI deps (citty, consola) are bundled
- **TypeScript strict** — TypeScript 7 (`tsc`) for typecheck
- **Formatter:** oxfmt (double quotes, no semicolons — `semi: false` in `.oxfmtrc.json`)
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
- **Round-trip testing:** jsQR for QR decode verification, zxing-wasm for 2D
  (QR, Micro QR, Data Matrix, PDF417, Aztec), zbar.wasm for 1D
- **Dev dependencies for testing:** `jsqr`, `zbar.wasm`, `zxing-wasm`, `bwip-js`, `rmqr`
- Run all: `pnpm test` (lint + typecheck + vitest)
- Run single: `pnpm vitest run test/<file>.test.ts`
- Coverage: `pnpm vitest run --coverage`

### Testing Notes

- Prefer round-trip verification over asserting on encoder internals: encode,
  decode with a third-party reader, compare. That is what caught the Data Matrix
  C40 and Aztec binary-shift defects.
- For payloads of high-range bytes, assert on the decoded **bytes**, not the
  decoded string — readers guess a character set and may pick Shift-JIS over
  Latin-1. `decodeBytes` in `encoders-modes-roundtrip.test.ts` does this.
- The PNG encoder emits stored (uncompressed) DEFLATE, so tests can decode PNG
  output and assert on real pixels; `ico-formats.test.ts` shows the pattern.

## Project Status

v1-ready. The full gate (`pnpm test`) is green:

- **81 test files, 1560+ tests** passing
- **Zero** lint warnings, zero typecheck errors
- **~95%** statement coverage
- Every symbology reachable from the public API, the CLI and (except JAB Code)
  PNG output
