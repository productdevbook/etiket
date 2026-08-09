/**
 * PDF417 data compaction (ISO/IEC 15438 clause 5.4).
 *
 * The sub-mode machinery used to be a greedy "switch when the current sub-mode
 * cannot hold this character" pass. Everything it produced decoded, but it
 * shifted where a latch is cheaper, took the two-step route where a direct
 * latch exists, and never entered the Punctuation sub-mode at all — so a third
 * of the sub-mode code was unreachable and untested (#143).
 *
 * These cases pin the sub-codeword stream itself. Every expectation below was
 * cross-checked against BWIPP (bwip-js) for the same payload, and every symbol
 * is read back with zxing so the assertions cannot drift into "matches the
 * implementation" without also being correct.
 */

import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodePDF417 } from "../src/index"
import { encodeData, numericToCodewords, textToCodewords } from "../src/encoders/pdf417/encoder"
import { bwipMatrix } from "./_bwip"

function matrixToImageData(matrix: boolean[][], scaleX = 3, scaleY = 8, margin = 4) {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  const width = cols * scaleX + margin * 2 * scaleX
  const height = rows * scaleY + margin * scaleY
  const data = new Uint8ClampedArray(width * height * 4)
  data.fill(255)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mr = Math.floor((y - (margin * scaleY) / 2) / scaleY)
      const mc = Math.floor(x / scaleX) - margin
      if (mr >= 0 && mr < rows && mc >= 0 && mc < cols && matrix[mr]![mc]) {
        const idx = (y * width + x) * 4
        data[idx] = 0
        data[idx + 1] = 0
        data[idx + 2] = 0
      }
    }
  }
  return { data, width, height }
}

async function decode(text: string): Promise<string | null> {
  const results = await readBarcodes(
    matrixToImageData(encodePDF417(text).matrix) as unknown as ImageData,
    { tryHarder: true, formats: ["PDF417"] },
  )
  return results.length > 0 ? results[0]!.text : null
}

/** Split codewords back into the sub-codeword pairs a reader sees. */
function subCodewords(codewords: number[]): number[] {
  return codewords.flatMap((cw) => [Math.floor(cw / 30), cw % 30])
}

describe("PDF417 text compaction sub-modes", () => {
  it("latches into Punctuation instead of shifting per character", () => {
    // ML(28) PL(25) = 28*30+25, then four codewords of ';' (Punctuation 0) pairs.
    // Shifting would have cost one PS per character: eight codewords, not five.
    expect(encodeData(";;;;;;;;")).toEqual([865, 0, 0, 0, 0])
  })

  it("leaves Punctuation for Alpha with PAL", () => {
    // ...PAL(29) 'A'(0) | 'B' 'C' | 'D' PS-pad
    expect(encodeData(";;;;;;;;ABCD")).toEqual([865, 0, 0, 0, 0, 870, 32, 119])
    expect(subCodewords([870]).slice(0, 1)).toEqual([29])
  })

  it("leaves Punctuation for Lower through Alpha", () => {
    // Punctuation only latches to Alpha, so lower case costs PAL(29) then LL(27)
    expect(encodeData(";;;;;;;;abcd")).toEqual([865, 0, 0, 0, 0, 897, 1, 63])
    expect(subCodewords([897])).toEqual([29, 27])
  })

  it("leaves Punctuation for Mixed through Alpha", () => {
    // PAL(29) then ML(28)
    expect(encodeData(";;;;;;;;1234")).toEqual([865, 0, 0, 0, 0, 898, 32, 94])
    expect(subCodewords([898])).toEqual([29, 28])
  })

  it("reaches Punctuation from Alpha through Mixed", () => {
    // 'A' 'B' | ML(28) PL(25) | ';' '<' | '>' '@' | '[' AL-pad(29)
    expect(encodeData("AB;<>@[")).toEqual([1, 865, 1, 63, 149])
  })

  it("latches Lower to Alpha for a run rather than shifting each character", () => {
    // ML(28) from Lower then AL(28) from Mixed, once, instead of five AS shifts
    expect(encodeData("helloWORLD")).toEqual([817, 131, 344, 868, 674, 521, 119])
    expect(subCodewords([868])).toEqual([28, 28])
  })

  it("latches Mixed to Lower directly with LL", () => {
    // '1' '2' '3' then LL(27) from Mixed — not AL(28) followed by LL(27)
    expect(encodeData("123abcdef")).toEqual([841, 63, 810, 32, 94, 179])
    expect(subCodewords([810])).toEqual([27, 0])
  })

  it("shifts to Punctuation from Lower rather than latching to Mixed", () => {
    // '.' and ',' live in both Mixed and Punctuation. A PS shift keeps the
    // reader in Lower; a Mixed latch would have to be undone for the next letter
    expect(encodeData("abc.def,ghi")).toEqual([810, 32, 887, 94, 179, 396, 218])
    expect(subCodewords([887])).toEqual([29, 17])
  })

  it("walks Alpha, Mixed, Punctuation in one payload", () => {
    expect(encodeData("0123456789ABCDEF;;;;")).toEqual([
      840, 32, 94, 156, 218, 298, 1, 63, 125, 865, 0, 0,
    ])
  })

  it("pads an odd sub-codeword count with 29", () => {
    // "ABC" is three sub-codewords; the low half of the last codeword is the pad
    expect(textToCodewords("ABC")).toEqual([1, 89])
    expect(subCodewords([89])).toEqual([2, 29])
  })

  it("returns nothing for empty text", () => {
    expect(textToCodewords("")).toEqual([])
  })

  const READABLE = [
    ";;;;;;;;",
    ";;;;;;;;ABCD",
    ";;;;;;;;abcd",
    ";;;;;;;;1234",
    "AB;<>@[",
    "helloWORLD",
    "123abcdef",
    "abc.def,ghi",
    "0123456789ABCDEF;;;;",
    "Hello, World!",
    "{braced} [bracketed] <angled>",
    "a\nb\tc\rd",
    "'quoted' \"text\"",
    "$1,234.56 = 100% * #7 & ^2",
    "MiXeD 12 case;<>",
  ]

  for (const payload of READABLE) {
    it(`round-trips ${JSON.stringify(payload)}`, async () => {
      expect(await decode(payload)).toBe(payload)
    })
  }
})

describe("PDF417 numeric compaction", () => {
  it("uses numeric compaction for an all-digit message of 8+ digits", () => {
    // 902 latch then base-900 digits of 1 + "12345678"
    expect(encodeData("12345678")).toEqual([902, 138, 628, 478])
  })

  it("stays in text compaction for a shorter all-digit message", () => {
    expect(encodeData("1234567")).toEqual([841, 63, 125, 187])
  })

  it("prefers numeric over text for a twelve digit message", () => {
    expect(encodeData("123456789012")).toEqual([902, 1, 641, 83, 621, 112])
  })

  it("keeps a short digit run inside a mixed message in text compaction", () => {
    // The run is not the whole message, so it has to be worth a latch each way
    expect(encodeData("AB12345678CD")[0]).not.toBe(902)
  })

  it("splits digit strings into groups of 44", () => {
    const digits = "1".repeat(45)
    const codewords = numericToCodewords(digits)
    // 44 digits fill exactly 15 codewords; the 45th starts a new group
    expect(codewords).toHaveLength(16)
    expect(numericToCodewords("1".repeat(44))).toHaveLength(15)
    expect(codewords.slice(0, 15)).toEqual(numericToCodewords("1".repeat(44)))
  })

  it("preserves leading zeros", async () => {
    expect(await decode("00000000000000000123")).toBe("00000000000000000123")
  })
})

describe("PDF417 byte compaction", () => {
  const bytes = (...values: number[]) => String.fromCharCode(...values)

  it("uses the groups-of-6 latch when the run divides by six", () => {
    // 0x010203040506 = 1108152157446 -> base 900 = 1 620 89 74 846
    expect(encodeData(bytes(1, 2, 3, 4, 5, 6))).toEqual([924, 1, 620, 89, 74, 846])
  })

  it("packs the largest six byte group correctly", () => {
    // 2^48 - 1 = 281474976710655 -> base 900 = 429 11 71 222 855
    expect(encodeData(bytes(255, 255, 255, 255, 255, 255))).toEqual([924, 429, 11, 71, 222, 855])
  })

  it("packs an all-zero six byte group as five zero codewords", () => {
    expect(encodeData(bytes(0, 0, 0, 0, 0, 0))).toEqual([924, 0, 0, 0, 0, 0])
  })

  it("uses the plain latch and trailing raw bytes for a remainder", () => {
    expect(encodeData(bytes(1, 2, 3, 4, 5, 6, 7))).toEqual([901, 1, 620, 89, 74, 846, 7])
  })

  it("encodes a run shorter than six bytes one codeword per byte", () => {
    expect(encodeData(bytes(1, 2, 3))).toEqual([901, 1, 2, 3])
  })

  it("packs two full groups back to back", () => {
    const codewords = encodeData(bytes(1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6))
    expect(codewords).toEqual([924, 1, 620, 89, 74, 846, 1, 620, 89, 74, 846])
  })

  for (const length of [1, 2, 3, 4, 5, 6, 7, 11, 12, 13]) {
    it(`round-trips a ${length} byte run`, async () => {
      // 0x80 upwards: not representable in any text compaction sub-mode
      const payload = Array.from({ length }, (_, i) => String.fromCharCode(0xa0 + i)).join("")
      expect(await decode(payload)).toBe(payload)
    })
  }
})

describe("PDF417 byte shift", () => {
  it("shifts a lone byte instead of latching out and back", () => {
    // 'A' pad | 913 é | 'B' pad — a 901 latch would need a 900 latch to return
    expect(encodeData("AéB")).toEqual([29, 913, 233, 59])
  })

  it("carries the text sub-mode across the shift", () => {
    // 'a' stays Lower over the shift, so 'b' needs no second Lower latch
    expect(encodeData("aéb")).toEqual([810, 913, 233, 59])
    expect(subCodewords([810])).toEqual([27, 0])
    expect(subCodewords([59])).toEqual([1, 29])
  })

  it("latches for two adjacent bytes, where a shift carries only one", () => {
    expect(encodeData("ABÜÜCD")).toEqual([1, 901, 220, 220, 900, 63])
  })

  it("keeps one byte compaction segment when that is shorter", () => {
    // Alternating text and bytes: seven shift pairs would cost eleven codewords
    expect(encodeData("Ünïcödé")).toEqual([901, 369, 367, 713, 321, 144, 233])
  })

  const READABLE = [
    "AéB",
    "aéb",
    "ABÜCD",
    "Hello Wörld",
    "Ünïcödé Latin1",
    "café",
    "naïve résumé",
    "Grüße",
    "ünicode",
    "AééB",
    "1234567890é1234567890",
  ]

  for (const payload of READABLE) {
    it(`round-trips ${JSON.stringify(payload)}`, async () => {
      expect(await decode(payload)).toBe(payload)
    })
  }
})

/**
 * Symbol size against the reference.
 *
 * The two encoders segment differently — etiket enters text compaction for a
 * run of any length where BWIPP waits for five, and shifts lone bytes where
 * BWIPP sometimes latches — so the module patterns legitimately differ. What
 * must hold is that etiket never spends more codewords than BWIPP on the same
 * data (#145).
 */
describe("PDF417 symbol size vs bwip-js", () => {
  /** BWIPP reads `^NNN` escapes with parse:true, which is how Latin-1 bytes get in. */
  function escapeLatin(text: string): string {
    let out = ""
    for (const ch of text) {
      const code = ch.charCodeAt(0)
      out += code > 126 || code < 32 ? `^${String(code).padStart(3, "0")}` : ch
    }
    return out
  }

  /** One column puts every codeword on its own row, so rows reveal the count. */
  function bwipCodewords(payload: string): number {
    const rows = bwipMatrix("pdf417", escapeLatin(payload), {
      parse: true,
      columns: 1,
      eclevel: 0,
    }).length
    // Each row carries one data codeword; the symbol adds a length descriptor
    // and, at EC level 0, two error correction codewords.
    return rows - 3
  }

  const PAYLOADS = [
    "Hello World",
    "The quick brown fox",
    "Ünïcödé Latin1",
    "ABÜCD",
    "Hello Wörld",
    "AéB",
    "testÿ",
    "ÀBCDEF",
    "ABC DEF ghi 123 é JKL",
    "Grüße",
    "Ünïcödé",
    "aébéc",
    "café",
    "naïve résumé",
    "AééB",
    "1234567890é1234567890",
    "MIXED case 123 with ümlaut",
    "0123456789012345678901234567890",
    ";;;;;;;;ABCD",
    "$1,234.56 = 100% * #7 & ^2",
  ]

  for (const payload of PAYLOADS) {
    it(`is no larger than bwip-js for ${JSON.stringify(payload)}`, () => {
      const mine = encodeData(payload).length
      expect(mine, `${mine} codewords against bwip-js`).toBeLessThanOrEqual(bwipCodewords(payload))
    })
  }
})
