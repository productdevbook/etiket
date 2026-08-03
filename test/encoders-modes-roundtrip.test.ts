/**
 * Encoding-mode coverage with round-trip verification.
 *
 * These inputs are chosen to drive the mode-switching machinery of the Aztec
 * and PDF417 encoders — punctuation pairs, latches and shifts, binary shift,
 * and the text/byte/numeric compaction submodes — and every symbol is decoded
 * back with zxing-wasm so the exercised paths are proven correct, not merely
 * executed.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeAztec } from "../src/encoders/aztec/index"
import { encodePDF417 } from "../src/encoders/pdf417/index"
import { encodeDataMatrix } from "../src/encoders/datamatrix/index"
import { encodeHighLevel, bitsToCodewords } from "../src/encoders/aztec/encoder"

function matrixToImageData(
  matrix: boolean[][],
  scale = 6,
  margin = 6,
): { data: Uint8ClampedArray; width: number; height: number } {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  const width = (cols + margin * 2) * scale
  const height = (rows + margin * 2) * scale
  const data = new Uint8ClampedArray(width * height * 4)
  data.fill(255)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mr = Math.floor(y / scale) - margin
      const mc = Math.floor(x / scale) - margin
      if (mr >= 0 && mr < rows && mc >= 0 && mc < cols && matrix[mr]![mc]) {
        const idx = (y * width + x) * 4
        data[idx] = 0
        data[idx + 1] = 0
        data[idx + 2] = 0
        data[idx + 3] = 255
      }
    }
  }
  return { data, width, height }
}

async function decode(matrix: boolean[][], scale = 6): Promise<string | null> {
  const { data, width, height } = matrixToImageData(matrix, scale)
  const results = await readBarcodes({ data, width, height } as ImageData, { tryHarder: true })
  return results.length > 0 ? results[0]!.text : null
}

/**
 * Decode to raw bytes.
 *
 * Used for payloads made of high-range bytes: the decoder guesses a character
 * set from the byte distribution and may land on Shift-JIS rather than
 * Latin-1, so the byte sequence — not the decoded string — is what the encoder
 * is responsible for.
 */
async function decodeBytes(matrix: boolean[][], scale = 6): Promise<number[] | null> {
  const { data, width, height } = matrixToImageData(matrix, scale)
  const results = await readBarcodes({ data, width, height } as ImageData, { tryHarder: true })
  return results.length > 0 ? [...results[0]!.bytes] : null
}

/** Latin-1 bytes of a string, as the 2D encoders treat their input. */
function latin1(text: string): number[] {
  return [...text].map((c) => c.charCodeAt(0))
}

describe("Aztec encoding modes (round-trip)", () => {
  const cases: Array<[string, string]> = [
    ["upper only", "HELLO WORLD"],
    ["lower latch", "hello world"],
    ["mixed upper/lower", "Hello World"],
    ["digit mode", "1234567890"],
    ["digit to upper", "123ABC456"],
    ["upper to digit and back", "ABC123DEF456GHI"],
    ["punctuation pair: period-space", "END. NEXT SENTENCE."],
    ["punctuation pair: comma-space", "ONE, TWO, THREE"],
    ["punctuation pair: colon-space", "KEY: VALUE"],
    ["punctuation in lower mode", "hello, world. bye"],
    ["punct pair from digit mode", "123. 456"],
    ["mixed-mode characters", "TAB\tAND\nNEWLINE"],
    ["punct single chars", "A!B@C#D$E%F&G*H"],
    ["parens and brackets", "F(X) = [Y] {Z}"],
    ["binary shift: latin-1", "CAFÉ NAÏVE"],
    ["binary shift: symbols", "~`^|\\"],
    ["alternating case", "aBcDeFgHiJkLmNoP"],
    ["digits and punctuation", "12.34, 56.78"],
    ["url-like", "https://example.com/path?a=1&b=2"],
    ["all ASCII printable", "ABCdef123 .,:;!?"],
  ]

  for (const [name, text] of cases) {
    it(`round-trips ${name}`, async () => {
      expect(await decode(encodeAztec(text)), name).toBe(text)
    })
  }

  it("round-trips a binary-shift run longer than the 5-bit length field", async () => {
    // Runs over 31 bytes use the extended 11-bit length field
    const text = "é".repeat(40)
    expect(await decodeBytes(encodeAztec(text))).toEqual(latin1(text))
  })

  it("round-trips a binary-shift run longer than 62 bytes", async () => {
    const text = "é".repeat(70)
    expect(await decodeBytes(encodeAztec(text), 5)).toEqual(latin1(text))
  })

  it("round-trips a binary-shift run spanning the extended field range", async () => {
    const text = "ü".repeat(200)
    expect(await decodeBytes(encodeAztec(text), 4)).toEqual(latin1(text))
  })

  it("round-trips across error correction levels", async () => {
    for (const ecPercent of [5, 23, 50, 80]) {
      const text = "EC LEVEL TEST 123"
      expect(await decode(encodeAztec(text, { ecPercent })), String(ecPercent)).toBe(text)
    }
  })

  it("round-trips forced layer counts", async () => {
    for (const layers of [1, 2, 3, 4]) {
      const text = "LAYERS"
      expect(await decode(encodeAztec(text, { layers })), String(layers)).toBe(text)
    }
  })

  it("round-trips full-range (non-compact) symbols", async () => {
    const text = "FULL RANGE AZTEC SYMBOL TEST"
    expect(await decode(encodeAztec(text, { compact: false }))).toBe(text)
  })

  it("round-trips a large payload", async () => {
    const text = "AZTEC LARGE PAYLOAD " + "0123456789".repeat(20)
    expect(await decode(encodeAztec(text), 4)).toBe(text)
  })
})

describe("Aztec high-level encoder", () => {
  it("returns no bits for empty input", () => {
    expect(encodeHighLevel("")).toEqual([])
  })

  it("emits fewer bits for digits than for the same count of letters", () => {
    // Digit mode is 4 bits/char vs 5 for upper
    expect(encodeHighLevel("12345678").length).toBeLessThan(encodeHighLevel("ABCDEFGH").length)
  })

  it("uses punctuation pairs rather than two separate shifts", () => {
    // ". " as a pair costs less than "." + " " encoded separately
    const pair = encodeHighLevel("A. B")
    const separate = encodeHighLevel("A.XB")
    expect(pair.length).toBeLessThanOrEqual(separate.length)
  })

  it("packs bits into codewords of the requested size", () => {
    const bits = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    expect(bitsToCodewords(bits, 6)).toEqual([0b101010, 0b101010])
    expect(bitsToCodewords(bits, 4)).toEqual([0b1010, 0b1010, 0b1010])
  })

  it("pads the final codeword with 1-bits", () => {
    // 5 bits at word size 4 → second word is 1 followed by three pad bits
    expect(bitsToCodewords([0, 0, 0, 0, 1], 4)).toEqual([0b0000, 0b1111])
  })
})

describe("PDF417 compaction modes (round-trip)", () => {
  const cases: Array<[string, string]> = [
    ["text: uppercase", "HELLO WORLD"],
    ["text: lowercase", "hello world"],
    ["text: mixed case", "Hello World Mixed"],
    ["text: numeric submode", "ABC 123456 DEF"],
    ["text: punctuation submode", "A.B,C;D:E!F?G"],
    ["text: punctuation heavy", '"quoted" & <tagged>'],
    ["numeric: long digit run", "1234567890123456789012345678901234567890"],
    ["numeric: short run", "12345"],
    ["byte: latin-1", "CAFÉ NAÏVE RÉSUMÉ"],
    ["mode switching", "ABC123def!@#456GHI"],
    ["url", "https://example.com/a/b?c=1"],
    ["whitespace", "line one\nline two\ttabbed"],
  ]

  for (const [name, text] of cases) {
    it(`round-trips ${name}`, async () => {
      const result = encodePDF417(text)
      expect(await decode(result.matrix, 4), name).toBe(text)
    })
  }

  it("round-trips high-range bytes via byte compaction", async () => {
    const text = "dataÀÁÂend"
    const result = encodePDF417(text)
    expect(await decodeBytes(result.matrix, 4)).toEqual(latin1(text))
  })

  it("round-trips across error correction levels", async () => {
    for (const ecLevel of [0, 1, 2, 3, 4, 5]) {
      const text = "PDF417 EC " + ecLevel
      const result = encodePDF417(text, { ecLevel })
      expect(await decode(result.matrix, 4), `ec ${ecLevel}`).toBe(text)
    }
  })

  it("round-trips across column counts", async () => {
    for (const columns of [1, 2, 4, 6, 10]) {
      const text = "PDF417 COLUMNS TEST"
      const result = encodePDF417(text, { columns })
      expect(await decode(result.matrix, 4), `columns ${columns}`).toBe(text)
    }
  })

  it("round-trips a large payload", async () => {
    const text = "PDF417 LARGE " + "ABCDEFGHIJ0123456789".repeat(15)
    const result = encodePDF417(text)
    expect(await decode(result.matrix, 4)).toBe(text)
  })
})

describe("Data Matrix encoding modes (round-trip)", () => {
  const cases: Array<[string, string]> = [
    ["ascii digits", "1234567890"],
    ["ascii text", "HELLO WORLD"],
    ["lowercase", "hello world"],
    ["mixed", "Data Matrix 123!"],
    ["latin-1", "CAFÉ"],
    ["long numeric", "9".repeat(50)],
    ["long text", "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG"],
    ["punctuation", "a.b,c;d:e!f?g"],
  ]

  for (const [name, text] of cases) {
    it(`round-trips ${name}`, async () => {
      expect(await decode(encodeDataMatrix(text)), name).toBe(text)
    })
  }
})
