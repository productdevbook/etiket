# Changelog

## Unreleased

### Added

- **`minVersion` and `boostEcc`** QR options. `minVersion` takes the smallest
  version at or above it that fits; `boostEcc` raises the error correction level
  as far as the data fits without growing the symbol. Both work on `qrcode`,
  `encodeQR`, `encodeQRCore` and the new `encodeQRSymbol`.
  ([#173](https://github.com/productdevbook/etiket/issues/173))
- **`encodeQRSymbol()` and `tryEncodeQRSymbol()`**, from `etiket` and `etiket/qr`.
  They return `{ version, ecLevel, mask, size, modules }` — the level after
  `boostEcc`, the mask whether given or chosen. `tryEncodeQRSymbol` returns
  `null` where `encodeQRSymbol` would throw `CapacityError`.
- `encodeQRSymbol` is the narrow QR path: it leaves out kanji mode, GS1 and
  Structured Append, and a bundle that imports only it is 15.8 KB minified,
  6.3 KB gzipped, against 35.8 KB and 8.0 KB for `encodeQRCore` before.

### Changed

- `encodeQRCore("")` encodes a byte segment of length 0 (version 1) instead of
  throwing `InvalidInputError`. `encodeQR("")`, `qrcode("")` and the barcode
  wrappers still throw.
- `encodeQRCore` and `encodeQR` smaller: the error correction table is stored
  as four numbers a row, and `encodeQRCore` no longer imports GS1 through the
  shared data module. Output is unchanged.

### Fixed

- A lone UTF-16 surrogate in byte mode is pinned to U+FFFD, as `TextEncoder`
  writes it; a test now holds it there.

## v1.0.0 (unreleased)

The v1 pass was mostly about one thing: making sure a symbol this library
produces is a symbol a scanner accepts. Every symbology is now verified against
an implementation that is not this one — decoded back with zxing-wasm where a
decoder exists, compared module for module with bwip-js where none does. That
work found a lot of confidently wrong output.

### Symbols that did not scan, and now do

- **RM4SCC and KIX** used an invented bar alphabet that broke the defining
  invariant of a 4-state symbol — `'0'` came out as four trackers. Every symbol
  ever produced was unreadable. ([#95](https://github.com/productdevbook/etiket/issues/95))
- **Code 39** had two wide elements in its SPACE pattern where every character
  needs exactly three, so any payload containing a space was unreadable.
  ([#137](https://github.com/productdevbook/etiket/issues/137))
- **MaxiCode**'s finder pattern overlapped its data map in 59 positions and the
  code cleared a rectangle before painting it, wiping ~25 data modules. The mode
  2/3 primary message was also missing its postal-code length field.
  ([#96](https://github.com/productdevbook/etiket/issues/96),
  [#97](https://github.com/productdevbook/etiket/issues/97))
- **Code 16K** emitted plain Code 128 rows — no row start/stop pairs, no mode
  character, no C/K check characters.
  ([#99](https://github.com/productdevbook/etiket/issues/99))
- **Codablock F** chopped a latched Code 128 stream into rows, so digit runs
  spanning a row boundary decoded as garbage; it also lacked K1/K2.
  ([#100](https://github.com/productdevbook/etiket/issues/100))
- **DotCode** had no placement algorithm and no masking, and its GF(113)
  generator was indexed backwards.
  ([#101](https://github.com/productdevbook/etiket/issues/101))
- **Han Xin** had invented capacity, no masking, no function information and
  QR-style placement the symbology does not use.
  ([#102](https://github.com/productdevbook/etiket/issues/102))
- **GS1 DataBar** rendered with inverted polarity, and Expanded encoded the
  wrong data outright — `(01)90012345678908` decoded as `(01)40049382234908`.
  ([#138](https://github.com/productdevbook/etiket/issues/138),
  [#139](https://github.com/productdevbook/etiket/issues/139))
- **Australia Post** emitted 28 bars for every Format Control Code instead of
  37, 52 or 67, over a Reed-Solomon in the wrong field.
  ([#133](https://github.com/productdevbook/etiket/issues/133))
- **Plessey** used a 2-module bit pitch instead of the specified 5-module one,
  with its CRC salt reversed.
  ([#134](https://github.com/productdevbook/etiket/issues/134))
- **rMQR** generated a single Reed-Solomon block, making 13 versions undecodable
  at EC M and 22 at EC H.
  ([#112](https://github.com/productdevbook/etiket/issues/112))
- **Code 16K and Codablock F** had no separator rows, which the matrix renderers
  could not draw. ([#140](https://github.com/productdevbook/etiket/issues/140))

### Data that was silently lost

- **PDF417** truncated any character outside ISO-8859-15 to its low byte, so
  `日` became `0xE5` and the symbol scanned back as mojibake. Non-Latin-1 input
  now goes out as UTF-8 under an ECI declaration.
  ([#107](https://github.com/productdevbook/etiket/issues/107))
- **MaxiCode** replaced Code Set C/D/E characters with spaces and dropped
  anything above U+00FF. ([#97](https://github.com/productdevbook/etiket/issues/97))
- **QR kanji mode** derived Shift-JIS arithmetically, so every kanji symbol
  decoded to the wrong characters. It now uses the real 6962-character mapping.
  ([#106](https://github.com/productdevbook/etiket/issues/106))

### The published package

- **The CLI did not run.** `dist/cli.mjs` imported citty and consola while both
  were devDependencies and the package declared no dependencies at all, so every
  `npx etiket` failed. The CLI is now a separate bundle entry, and CI packs the
  tarball and runs it from a clean install.
  ([#98](https://github.com/productdevbook/etiket/issues/98))

### New

- **ECI** on QR, Data Matrix, PDF417 and Aztec, with automatic ECI 26 for
  non-Latin-1 input ([#108](https://github.com/productdevbook/etiket/issues/108))
- **QR Structured Append** — `encodeQRSequence()` splits a message across up to
  16 symbols ([#105](https://github.com/productdevbook/etiket/issues/105))
- **GS1 QR Code** and FNC1 in the second position — `gs1qr()`
  ([#111](https://github.com/productdevbook/etiket/issues/111))
- **Optimal QR segmentation**, which existed but was never called
  ([#110](https://github.com/productdevbook/etiket/issues/110))
- **Data Matrix**: DMRE rectangular sizes, Base 256, X12 and EDIFACT
  ([#71](https://github.com/productdevbook/etiket/issues/71),
  [#109](https://github.com/productdevbook/etiket/issues/109))
- **GS1 DataBar**: Truncated, Stacked, Stacked Omnidirectional and Expanded
  Stacked, plus the compressed encodation methods 3-14
  ([#61](https://github.com/productdevbook/etiket/issues/61),
  [#113](https://github.com/productdevbook/etiket/issues/113))
- **Batch generation and label sheets** — `barcodes()`, `qrcodes()`,
  `barcodeSheet()`, `qrcodeSheet()`
  ([#79](https://github.com/productdevbook/etiket/issues/79))
- **JAB Code PNG output**, and an explicit note that the encoder is not ISO/IEC
  23634 conformant and cannot be verified
  ([#103](https://github.com/productdevbook/etiket/issues/103))
- **`encodeQRCore()`**, the QR encoder without the Shift-JIS table. The table
  is most of the encoder's weight — 43.6 KB gzipped against 7.9 KB without it —
  and a bundle that imports only `encodeQRCore` never ships it; Japanese text
  then goes out in byte mode as UTF-8. Pass `{ kanji: kanjiCodec }` and it is
  `encodeQR` again. `encodeQR` and `qrcode` are unchanged.

### API

- New subpaths: `etiket/2d`, `etiket/errors`, `etiket/validators`. `etiket/qr`
  gained the payload helpers, PNG output and validation; `etiket/barcode` gained
  the validators, error classes and industry encoders.
  ([#116](https://github.com/productdevbook/etiket/issues/116))
- `moduleSize` is accepted by every renderer as the single name for "how big is
  one module". `barWidth`, `scale` and the matrix `size` keep working.
  ([#115](https://github.com/productdevbook/etiket/issues/115))
- Every reachable throw is an `EtiketError` subclass, and `CheckDigitError` —
  exported since the beginning, never thrown — is now used for check-digit
  mismatches. It extends `InvalidInputError`, so existing catches still work.
  ([#118](https://github.com/productdevbook/etiket/issues/118))
- `validateBarcode()` rejects unknown types instead of answering `valid: true`.
  ([#121](https://github.com/productdevbook/etiket/issues/121))
- Public option and result types are named exported interfaces rather than
  inline anonymous objects.
  ([#117](https://github.com/productdevbook/etiket/issues/117))
- `package.json` gains `sideEffects: false`, `engines`, and `publishConfig` with
  provenance. ([#119](https://github.com/productdevbook/etiket/issues/119))

### Tooling

- A bwip-js comparison harness for the formats no decoder covers, which found
  six defects nothing else could see
  ([#123](https://github.com/productdevbook/etiket/issues/123))
- Coverage thresholds, enforced in CI
  ([#120](https://github.com/productdevbook/etiket/issues/120))
- CI runs a Node 20/22/24 × Linux/Windows matrix and a packed-artifact smoke
  test
- The CLI gained the flags the library already supported, plus a `validate`
  subcommand ([#122](https://github.com/productdevbook/etiket/issues/122))

---

Releases before v1.0.0 are recorded in the
[GitHub releases](https://github.com/productdevbook/etiket/releases).
