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
    gs1-128.ts              # GS1-128 (100+ AIs, FNC1, AI parsing), EAN-14, SSCC-18
    isbn.ts                 # ISBN, ISSN, ISMN over EAN-13
    pharma-national.ts      # Code 32 (Italian), PZN-7/PZN-8 (German), over Code 39
    code2of5.ts             # Code 25: industrial, IATA, matrix, COOP, datalogic
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
    aztec/                  # Aztec Code and Aztec Rune (ISO 24778)
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
  *.test.ts                 # 131 test files, 3300+ tests
  _bwip.ts                  # bwip-js (BWIPP) oracle: module data extraction
  bwip-compare.test.ts      # Module-for-module comparison against BWIPP
  qr-roundtrip.test.ts      # QR encode→decode via jsQR (all versions, EC, masks)
  2d-roundtrip.test.ts      # 2D decode verification via zxing-wasm
  1d-roundtrip.test.ts      # 1D decode verification via zxing-wasm
  encoders-modes-roundtrip.test.ts # Encoder mode coverage, decoded with zxing
  barcode-roundtrip.test.ts # Structural checks for formats with no decoder
  api-subpaths.test.ts      # package.json#exports vs the source entries
  docs-coverage.test.ts     # Every export has an API reference entry
  cli.test.ts               # Every CLI subcommand, driven through citty
docs/
  **/*.md                   # Documentation (mdzilla-compatible)
```

## Public API

Single entry: `etiket` (everything). Sub-paths: `etiket/barcode`, `etiket/postal`,
`etiket/qr`, `etiket/datamatrix`, `etiket/pdf417`, `etiket/aztec`, `etiket/2d`,
`etiket/png`, `etiket/errors`, `etiket/validators`.

`test/api-subpaths.test.ts` asserts `package.json#exports` and the source entries
agree, that no subpath exports something the main entry lacks, and that shared
symbols are the same object — so the surface cannot drift.

1D + postal: `barcode()`, `encodeBars()`, `postal()`, `encodePostal()`. 40
width-modulated types, including the numbering schemes that ride on another
symbology — `isbn`, `issn`, `ismn`, `ean14`, `sscc18`, `code32`, `pzn`, `pzn8` —
and the discrete 2 of 5 family.

2D: `qrcode()`, `microqr()`, `rmqr()`, `datamatrix()`, `gs1datamatrix()`, `pdf417()`, `micropdf417()`, `aztec()`, `aztecrune()`, `maxicode()`, `dotcode()`, `hanxin()`, `codablockf()`, `code16k()`, `jabcode()`, `mailmark()`.

GS1: `gs1qr()`, `gs1composite()`, `encodeGS1CompositeSymbol()`, the DataBar
family including the stacked variants. A composite symbol assembles over every
primary of ISO/IEC 24723 — EAN/UPC, GS1-128 and the seven DataBar variants —
and only a GS1-128 can carry a CC-C component, whose width sets its columns.

Sequences: `encodeQRSequence()` (Structured Append), `encodePDF417Sequence()`
(Macro PDF417).

Batch: `barcodes()`, `qrcodes()`, `barcodeSheet()`, `qrcodeSheet()`.

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
- **Zero runtime dependencies** — the library is transformed 1:1; `src/cli.ts`
  is a separate bundle entry (see `build.config.ts`) so citty and consola end up
  inside `dist/cli.mjs` instead of in `dependencies`. The CI `package` job packs
  the tarball and runs the CLI from a clean install to keep that honest.
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
- **Round-trip testing:** zxing-wasm decodes QR, Micro QR, rMQR, Data Matrix,
  PDF417, MicroPDF417, Aztec, MaxiCode and every 1D format it supports; jsQR
  covers QR independently
- **Reference comparison:** bwip-js (BWIPP) for the formats no decoder
  implements — see `test/_bwip.ts` and `test/bwip-compare.test.ts`
- **Dev dependencies for testing:** `jsqr`, `zxing-wasm`, `bwip-js`
- Run all: `pnpm test` (lint + typecheck + vitest)
- Run single: `pnpm vitest run test/<file>.test.ts`
- Coverage: `pnpm vitest run --coverage`

### Testing Notes

**A new or changed encoder needs verification against an implementation that is
not this one.** A barcode encoder can be confidently, silently wrong: it produces
a symbol, the tests assert the bar count, and no scanner reads it. That happened
here repeatedly — the RM4SCC bar alphabet was invented, MaxiCode's finder pattern
overwrote its own data, Code 39's space character had the wrong pattern, EAN-8
check digits used the wrong weights. Every one passed a full green suite.

The order of preference: decode it back with zxing-wasm; failing that, compare
module-for-module with bwip-js; failing both, document in the encoder's own
JSDoc that it cannot be verified, the way `encodeJABCode` does. Known divergences
live in the `DIVERGENT` map in `test/bwip-compare.test.ts` with the issue that
tracks them, running under `it.fails` so the suite stays green while the defect
is known and turns red the moment it is fixed.

- Prefer round-trip verification over asserting on encoder internals: encode,
  decode with a third-party reader, compare. That is what caught the Data Matrix
  C40 and Aztec binary-shift defects.
- For payloads of high-range bytes, assert on the decoded **bytes**, not the
  decoded string — readers guess a character set and may pick Shift-JIS over
  Latin-1. `decodeBytes` in `encoders-modes-roundtrip.test.ts` does this.
- The PNG encoder emits stored (uncompressed) DEFLATE, so tests can decode PNG
  output and assert on real pixels; `ico-formats.test.ts` shows the pattern.
- A fixed sample list catches a broken table and misses a mis-taken branch.
  `encoders-random-differential.test.ts` throws a few hundred seeded random
  payloads at each no-decoder format and compares every module against BWIPP,
  which is what took Code 16K from 75% to 95% covered with every new line
  verified rather than merely executed.
- Nothing an encoder is given may disappear. `encoders-input-fidelity.test.ts`
  appends a character to a payload every symbology accepts and requires the
  symbol to change or the input to be refused — the general form of the Code 128
  defect that dropped every character above 126 while producing a well formed
  symbol for different data.

## Project Status

v1. The full gate (`pnpm test`) is green:

- **131 test files, 3300+ tests** passing
- **Zero** lint warnings, zero typecheck errors
- **96.7%** statements, **92.9%** branches — thresholds enforced in CI by
  `vitest.config.ts`
- Every symbology reachable from the public API, the CLI, PNG output and
  validation
- CI runs Node 24 on Linux and Windows, and packs the tarball to run the CLI and
  every entry point from a clean install

**Verification status.** Every symbology is checked against an implementation
that is not this one — decoded back with zxing-wasm or jsQR, or compared
module-for-module with bwip-js. Two exceptions, both explicit:

- **JAB Code** is not ISO/IEC 23634 conformant and cannot be verified: no
  JavaScript or WebAssembly decoder exists and neither zxing nor BWIPP implements
  the symbology. It is marked `@experimental` and says so in its own JSDoc.
- **MicroPDF417** picks a smaller symbol variant than the reference for some
  payloads: BWIPP opens a symbol with a mode latch the default text compaction
  mode makes redundant, and waits for five characters before entering text
  compaction at all. The smaller symbol decodes and carries the specified error
  correction, so this is a shape choice rather than a defect (#136); the
  comparison keeps it visible instead of asserting it away, and
  `encoders-micropdf417.test.ts` pins the direction — never larger.

**Deliberate limitations**, documented where they apply: Han Xin has no GB 18030
Chinese mode. Nothing available can verify one — BWIPP's own Han Xin encoder
implements Numeric and Byte and no more, and no decoder exists — so adding the
Chinese modes would trade a fully verified encoder for one nothing can check.
Byte mode carries Chinese text meanwhile.
