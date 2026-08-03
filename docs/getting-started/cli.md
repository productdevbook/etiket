# CLI

etiket ships a command-line generator. Every symbology has a subcommand, and any
format with PNG support can emit either SVG or PNG.

```bash
npx etiket qr "https://example.com" -o qr.svg
```

Install globally for repeated use:

```bash
npm install -g etiket
etiket list
```

## Output

Without `-o` the symbol is written to stdout, so it can be piped:

```bash
etiket barcode "12345" > label.svg
etiket qr "hello" | wc -c
```

PNG output is selected either by an `.png` output file or by `--png`:

```bash
etiket qr "hello" -o qr.png        # inferred from the extension
etiket qr "hello" --png > qr.png   # explicit
```

## Commands

| Command       | Purpose                                                |
| :------------ | :----------------------------------------------------- |
| `qr`          | QR code, with styling and terminal output              |
| `microqr`     | Micro QR (M1–M4)                                       |
| `rmqr`        | Rectangular Micro QR                                   |
| `barcode`     | Any 1D barcode, selected with `--type`                 |
| `postal`      | POSTNET, PLANET, RM4SCC, KIX, AusPost, Japan Post, IMb |
| `datamatrix`  | Data Matrix, with `--gs1` for GS1 DataMatrix           |
| `pdf417`      | PDF417                                                 |
| `micropdf417` | MicroPDF417                                            |
| `aztec`       | Aztec Code                                             |
| `maxicode`    | MaxiCode                                               |
| `dotcode`     | DotCode                                                |
| `hanxin`      | Han Xin Code                                           |
| `codablockf`  | Codablock-F                                            |
| `code16k`     | Code 16K                                               |
| `jabcode`     | JAB Code (SVG only)                                    |
| `wifi`        | WiFi network QR code                                   |
| `contact`     | vCard QR code                                          |
| `link`        | QR code for a URL, email, phone, SMS or location       |
| `list`        | Print every supported symbology                        |

Run `etiket <command> --help` for a command's full options.

## Common Options

Shared by every generator command:

| Flag             | Default   | Description                      |
| :--------------- | :-------- | :------------------------------- |
| `-o`, `--output` | stdout    | Output file (`.png` implies PNG) |
| `--png`          | `false`   | Emit PNG instead of SVG          |
| `--color`        | `#000000` | Foreground colour                |
| `--background`   | `#ffffff` | Background colour                |

Matrix-based commands additionally accept `--size` (SVG pixels),
`--module-size` (PNG pixels per module) and `--margin` (quiet zone in modules).

## QR Codes

```bash
etiket qr "https://example.com" --size 400 --ec H -o qr.svg
etiket qr "styled" --dot-type dots --dot-size 0.8 --color "#1a1a2e" -o styled.svg
etiket qr "hello" --terminal     # print to the terminal
```

| Flag         | Default | Description                                    |
| :----------- | :------ | :--------------------------------------------- |
| `--ec`       | `M`     | Error correction: `L`, `M`, `Q`, `H`           |
| `--dot-type` | square  | `dots`, `rounded`, `classy`, `diamond`, …      |
| `--dot-size` | `1`     | Module fill ratio, `0.1`–`1`                   |
| `--terminal` | `false` | Print Unicode blocks instead of writing a file |

## 1D Barcodes

```bash
etiket barcode "Hello" -o code128.svg
etiket barcode "4006381333931" --type ean13 --show-text -o ean.svg
etiket barcode "HELLO" --type code39 --code39-check-digit -o c39.svg
etiket barcode "1234" --type msi --msi-check-digit mod11 -o msi.svg
```

| Flag                   | Default   | Description                                    |
| :--------------------- | :-------- | :--------------------------------------------- |
| `--type`               | `code128` | Symbology (see `etiket list`)                  |
| `--height`             | `80`      | Bar height                                     |
| `--bar-width`          | `2`       | Width per module (SVG)                         |
| `--scale`              | `2`       | Pixels per module (PNG)                        |
| `--show-text`          | `false`   | Render the human-readable text                 |
| `--font-size`          | `14`      | Text size                                      |
| `--msi-check-digit`    | —         | `mod10`, `mod11`, `mod1010`, `mod1110`, `none` |
| `--code39-check-digit` | `false`   | Append a Code 39 check digit                   |
| `--code128-charset`    | `auto`    | Force charset `A`, `B` or `C`                  |

## Postal

```bash
etiket postal "12345-6789" --type postnet -o zip.svg
etiket postal "SN34RD1A" --type rm4scc -o rm4scc.svg
etiket postal "12345678" --type auspost --fcc 59 -o auspost.svg
etiket postal "01234567094987654321" --type imb --routing-code 01234567891 -o imb.png
```

| Flag             | Default   | Description                           |
| :--------------- | :-------- | :------------------------------------ |
| `--type`         | `postnet` | Postal symbology                      |
| `--height`       | `40`      | Full-bar height                       |
| `--bar-width`    | `2`       | Bar width                             |
| `--pitch`        | `2×width` | Centre-to-centre bar spacing          |
| `--fcc`          | `11`      | Australia Post format control code    |
| `--routing-code` | —         | IMb routing code / Japan Post address |

## Helpers

```bash
etiket wifi "MyNetwork" "password" -o wifi.svg
etiket wifi "Guest" "pw" --encryption WEP --hidden -o guest.svg

etiket contact "Ada Lovelace" --phone "+15551234" --email ada@example.com -o card.svg

etiket link "https://example.com" -o url.svg
etiket link "ada@example.com" --kind email -o mail.svg
etiket link "5551234" --kind sms --body "Hello" -o sms.svg
etiket link "41.0082,28.9784" --kind geo -o place.svg
```
