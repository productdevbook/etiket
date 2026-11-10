# Kanji Mode

QR Code's kanji mode packs each character into 13 bits, against the 24 that UTF-8
byte mode needs for the same character. A Japanese payload therefore fits in a
markedly smaller symbol.

etiket ships the real Shift-JIS mapping — the two encodings do not line up
arithmetically anywhere, so an approximation would produce symbols that decode to
the wrong characters.

## When to Use It

- Japanese text: kanji, hiragana, katakana and full-width punctuation
- Any payload where most characters live in Shift-JIS and symbol size matters

## Usage

Kanji mode is part of automatic mode selection, so there is usually nothing to
do:

```ts
import { qrcode, encodeQR } from "etiket"

qrcode("漢字テスト")

const matrix = encodeQR("漢字テスト")
matrix.length // 21 — version 1, where byte mode would need a larger symbol
```

Force it when you want to be sure:

```ts
import { encodeQR } from "etiket"

encodeQR("漢字テスト", { mode: "kanji" })
```

## Leaving the Table Out

The Shift-JIS table is about 84 KB minified, 30 KB gzipped — most of what the QR
encoder weighs. `encodeQR` and `qrcode` carry it. `encodeQRCore` is the same
encoder without it: a bundle that imports only `encodeQRCore` never ships the
table, and Japanese text goes out in byte mode as UTF-8, which every common
reader decodes, at nearly twice the bits per character.

```ts
import { encodeQRCore } from "etiket/qr"

encodeQRCore("https://example.com") // the same matrix encodeQR returns
encodeQRCore("漢字テスト") // byte mode, UTF-8
```

Hand it the table and it is `encodeQR` again — for an app that loads the table
only on the pages that need it:

```ts
import { encodeQRCore, kanjiCodec } from "etiket/qr"

encodeQRCore("漢字テスト", { kanji: kanjiCodec }) // kanji mode
```

`mode: "kanji"` without a codec throws `InvalidInputError`.

`encodeQRSymbol` goes further: it also leaves out GS1 and Structured Append, which
cuts a QR-only bundle to under half the size of one built on `encodeQRCore`.

## Coverage

The table covers the two byte ranges kanji mode allows:

| Shift-JIS range | Contents                                            |
| :-------------- | :-------------------------------------------------- |
| `0x8140–0x9FFC` | Punctuation, kana, JIS level 1 kanji, and part of 2 |
| `0xE040–0xEBBF` | The rest of JIS level 2 kanji                       |

Characters outside those ranges — half-width katakana, most emoji, Chinese
characters that are not in JIS, and everything Latin — cannot use kanji mode.

## Mixing Modes

The segment optimiser runs a dynamic program over all four modes — numeric,
alphanumeric, byte and kanji — and finds the cheapest split for the version being
tried. A mode switch costs a 4-bit indicator plus a version-dependent character
count, so a short kanji run inside Latin text is left in byte mode where that is
cheaper:

```ts
import { encodeQR } from "etiket"

// One segment: all kanji
encodeQR("日本語のテキスト")

// The optimiser picks the split: alphanumeric prefix, then kanji
encodeQR("ORDER-42 発送済み")
```

Because the character count indicator grows at versions 10 and 27, the split is
recomputed for each candidate version rather than once up front.

## Kanji and ECI

Kanji mode carries no character-set declaration — the mapping is Shift-JIS by
definition. `eci` applies to byte segments, so a symbol that mixes kanji and byte
data can declare a character set for the byte part:

```ts
import { encodeQR } from "etiket"

encodeQR("日本語", { eci: 20 }) // ECI 20 is Shift-JIS
```

## Caveats

- **Forcing `mode: "kanji"` on text that is not Shift-JIS throws.** The character
  is looked up in the table and, failing that, `InvalidInputError` is raised
  naming the value. Leave the mode on `auto` unless you have already checked the
  input.
- The mapping is generated from Node's ICU Shift-JIS decoder. Characters that
  Shift-JIS encodes in more than one way take the canonical form.
- [Micro QR](/qr-code/micro-qr) and [rMQR](/qr-code/rmqr) do **not** implement
  kanji mode in etiket, even though the standards define it for M4 and rMQR.
  Japanese text in those symbologies goes out as UTF-8 bytes.
- Kanji mode is about size, not correctness: byte-mode UTF-8 is read correctly by
  any modern reader. Reach for kanji mode when the symbol is too big, not because
  the text is Japanese.
