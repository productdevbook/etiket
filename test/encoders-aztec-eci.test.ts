/**
 * Aztec ECI support — FLG(n) escapes and automatic UTF-8 (ISO/IEC 24778 §7.3.2).
 *
 * Non-Latin-1 input used to throw; it now travels as UTF-8 bytes under an
 * automatic ECI 000026 declaration. Every claim here is checked against a
 * third-party reader (zxing-wasm) rather than against encoder internals, and
 * payloads with high-range bytes are compared as decoded *bytes* because
 * readers guess a character set from the byte distribution.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeAztec } from "../src/encoders/aztec/index"
import { encodeHighLevel } from "../src/encoders/aztec/encoder"
import { InvalidInputError } from "../src/errors"

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

async function read(matrix: boolean[][], scale = 6) {
  const { data, width, height } = matrixToImageData(matrix, scale)
  const results = await readBarcodes({ data, width, height } as ImageData, { tryHarder: true })
  return results.length > 0 ? results[0]! : null
}

async function decode(matrix: boolean[][], scale = 6): Promise<string | null> {
  return (await read(matrix, scale))?.text ?? null
}

async function decodeBytes(matrix: boolean[][], scale = 6): Promise<number[] | null> {
  const result = await read(matrix, scale)
  return result ? [...result.bytes] : null
}

/** UTF-8 bytes of a string — what the encoder must put on the wire under ECI 26 */
function utf8(text: string): number[] {
  return [...new TextEncoder().encode(text)]
}

/** Read a zxing byte array as Latin-1 text (bytesECI mixes ASCII markers and data) */
function latin1String(bytes: Uint8Array): string {
  let out = ""
  for (const b of bytes) out += String.fromCharCode(b)
  return out
}

/** Render a bit array as a string, for exact bit-layout assertions */
function bitString(bits: number[]): string {
  return bits.join("")
}

describe("Aztec FLG(n) bit layout", () => {
  it("emits P/S, FLG, the digit count and the ECI digits", () => {
    // P/S from Upper (00000) + FLG (00000) + n=2 (010) + '2'=4 (0100) + '6'=8 (1000)
    // then 'A' in Upper mode (00010) — the shift is transient, so Upper is restored.
    expect(bitString(encodeHighLevel("A", 26))).toBe(
      "00000" + "00000" + "010" + "0100" + "1000" + "00010",
    )
  })

  it("uses a single digit for one-digit ECI numbers", () => {
    expect(bitString(encodeHighLevel("A", 0))).toBe("00000" + "00000" + "001" + "0010" + "00010")
  })

  it("uses all six digits for the largest ECI number", () => {
    expect(bitString(encodeHighLevel("A", 999_999))).toBe(
      "00000" + "00000" + "110" + "1011".repeat(6) + "00010",
    )
  })

  it("declares ECI 26 automatically for non-Latin-1 input", () => {
    const auto = encodeHighLevel("日本")
    const explicit = encodeHighLevel("日本", 26)
    expect(bitString(auto)).toBe(bitString(explicit))
    expect(bitString(auto).startsWith("00000" + "00000" + "010" + "0100" + "1000")).toBe(true)
  })

  it("rejects ECI numbers outside the 6-digit range", () => {
    expect(() => encodeHighLevel("A", -1)).toThrow(InvalidInputError)
    expect(() => encodeHighLevel("A", 1_000_000)).toThrow(InvalidInputError)
    expect(() => encodeHighLevel("A", 1.5)).toThrow(InvalidInputError)
    expect(() => encodeAztec("A", { eci: 1_000_000 })).toThrow(InvalidInputError)
  })
})

describe("Aztec output is unchanged for Latin-1 input", () => {
  it("produces the pre-ECI bit stream for ASCII", () => {
    // Captured from the encoder before FLG(n) support was added.
    expect(bitString(encodeHighLevel("HELLO WORLD"))).toBe(
      "0100100110011010110110000000011100010000100110110100101",
    )
  })

  // One bit shorter than the stream the greedy encoder produced: É and Ï are
  // two bytes no text mode carries, and the route now spends one binary shift
  // header on the pair rather than one each
  it("produces the pre-ECI bit stream for high-range Latin-1", () => {
    expect(bitString(encodeHighLevel("CAFÉ NAÏVE"))).toBe(
      "001000001000111111110010111001001001000000100111001000001110011111011100110",
    )
  })

  it("produces the pre-ECI matrix for ASCII", () => {
    const expected = [
      "001110001111011",
      "011001110101110",
      "001100001000110",
      "101111111111111",
      "011100000001110",
      "100101111101111",
      "010101000101101",
      "101101010101011",
      "101101000101010",
      "110101111101011",
      "010100000001011",
      "100111111111111",
      "000001100010010",
      "001100001011010",
      "000110100010101",
    ]
    const actual = encodeAztec("HELLO WORLD").map((row) => row.map((m) => (m ? "1" : "0")).join(""))
    expect(actual).toEqual(expected)
  })

  it("emits no ECI prefix when none is needed", () => {
    // A leading P/S would make the stream start with five zero bits.
    expect(bitString(encodeHighLevel("HELLO")).startsWith("00000")).toBe(false)
  })
})

describe("Aztec ECI round-trip (zxing-wasm)", () => {
  const cases: Array<[string, string]> = [
    ["japanese", "日本語"],
    ["japanese sentence", "こんにちは世界"],
    ["mixed latin and japanese", "ABC 日本 123"],
    ["cyrillic", "Привет мир"],
    ["greek", "Ελληνικά"],
    ["emoji", "etiket 🎫 v1"],
    ["cjk and punctuation", "商品コード: 12345"],
    ["mixed scripts", "Ünïcödé — 中文 — русский"],
  ]

  for (const [name, text] of cases) {
    it(`round-trips ${name} as UTF-8 bytes`, async () => {
      expect(await decodeBytes(encodeAztec(text)), name).toEqual(utf8(text))
    })
  }

  it("decodes back to the original string", async () => {
    expect(await decode(encodeAztec("日本語"))).toBe("日本語")
    expect(await decode(encodeAztec("ABC 日本 123"))).toBe("ABC 日本 123")
  })

  it("reports the declared ECI number to the reader", async () => {
    // zxing prefixes bytesECI with the symbology id and the ECI designator,
    // so the reader tells us exactly which ECI it saw.
    const auto = await read(encodeAztec("日本語"))
    expect(auto?.hasECI).toBe(true)
    expect(latin1String(auto!.bytesECI).startsWith("]z3\\000026")).toBe(true)

    const explicit = await read(encodeAztec("CAFÉ NAÏVE", { eci: 3 }))
    expect(explicit?.hasECI).toBe(true)
    expect(latin1String(explicit!.bytesECI).startsWith("]z3\\000003")).toBe(true)
  })

  it("declares no ECI for plain Latin-1 input", async () => {
    const result = await read(encodeAztec("HELLO WORLD"))
    expect(result?.hasECI).toBe(false)
  })

  it("round-trips an explicit ECI on Latin-1 data", async () => {
    // ECI 000003 is ISO-8859-1 — the reader must still see the same text.
    const matrix = encodeAztec("CAFÉ NAÏVE", { eci: 3 })
    expect(await decodeBytes(matrix)).toEqual([..."CAFÉ NAÏVE"].map((c) => c.charCodeAt(0)))
    expect(await decode(matrix)).toBe("CAFÉ NAÏVE")
  })

  it("round-trips an explicit ECI on ASCII data", async () => {
    expect(await decode(encodeAztec("HELLO WORLD", { eci: 3 }))).toBe("HELLO WORLD")
  })

  it("round-trips an explicit UTF-8 ECI on ASCII data", async () => {
    expect(await decode(encodeAztec("HELLO WORLD", { eci: 26 }))).toBe("HELLO WORLD")
  })

  it("round-trips non-Latin-1 text in full-range symbols", async () => {
    const text = "日本語テキストのより長いサンプル、フルレンジ記号用。"
    expect(await decodeBytes(encodeAztec(text, { compact: false }), 5)).toEqual(utf8(text))
  })

  it("round-trips non-Latin-1 text at a higher EC level", async () => {
    const text = "안녕하세요 세계"
    expect(await decodeBytes(encodeAztec(text, { ecPercent: 50 }))).toEqual(utf8(text))
  })
})
