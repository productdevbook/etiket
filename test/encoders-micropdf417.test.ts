import { describe, expect, it } from "vitest"
import { encodeMicroPDF417, microPDF417CodewordModules } from "../src/encoders/micropdf417"
import { bwipMatrix } from "./_bwip"

describe("MicroPDF417", () => {
  it("encodes short text", () => {
    const result = encodeMicroPDF417("Hello")
    expect(result.matrix.length).toBeGreaterThan(0)
    expect(result.rows).toBeGreaterThan(0)
    expect(result.cols).toBeGreaterThan(0)
  })

  it("produces boolean matrix", () => {
    const result = encodeMicroPDF417("Test")
    for (const row of result.matrix) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean")
      }
    }
  })

  it("respects column count", () => {
    const r1 = encodeMicroPDF417("Hi", { columns: 1 })
    const r2 = encodeMicroPDF417("Hi", { columns: 2 })
    // Different column count should produce different row counts
    expect(r1.rows).not.toBe(r2.rows)
  })

  it("throws on empty input", () => {
    expect(() => encodeMicroPDF417("")).toThrow()
  })

  it("all rows have same width", () => {
    const result = encodeMicroPDF417("Hello World")
    const widths = result.matrix.map((r) => r.length)
    const unique = new Set(widths)
    expect(unique.size).toBe(1)
  })

  it("different data produces different output", () => {
    const a = encodeMicroPDF417("Hello")
    const b = encodeMicroPDF417("World")
    const aStr = a.matrix.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("")
    const bStr = b.matrix.map((r) => r.map((c) => (c ? "1" : "0")).join("")).join("")
    expect(aStr).not.toBe(bStr)
  })

  it("fills the symbol with pad codewords after the data", () => {
    // "Hello" is three codewords in the 1x11 variant, which holds four data
    // codewords before its seven error correction ones. The fourth is the pad:
    // 900, the text compaction latch, which a reader in text mode ignores.
    const rows = encodeMicroPDF417("Hello").matrix
    // One column: left RAP, one codeword, right RAP. Row n is in cluster n % 3.
    const data = (row: number) => rows[row]!.slice(10, 27)
    expect(data(3)).toEqual(microPDF417CodewordModules(900, 0))
    expect(data(0)).not.toEqual(microPDF417CodewordModules(900, 0))
  })
})

/**
 * Symbol size against the reference.
 *
 * etiket picks a smaller variant than BWIPP for some payloads (#136), because
 * BWIPP spends a codeword on a text compaction latch the default mode makes
 * redundant and waits for five characters before entering text compaction at
 * all. Neither costs conformance — every symbol below reads back through zxing
 * — so what is pinned is the direction: never larger than the reference.
 */
describe("MicroPDF417 symbol size vs bwip-js", () => {
  const PAYLOADS = [
    "A",
    "AB",
    "ABC",
    "ABCD",
    "ABC123",
    "Hello",
    "Hello World",
    "12345678",
    "abcdefghijklmnopqrstuvwxyz",
    "The quick brown fox jumps",
    "https://example.com/a/b/c",
  ]

  for (const payload of PAYLOADS) {
    it(`is no larger than bwip-js for ${JSON.stringify(payload)}`, () => {
      const mine = encodeMicroPDF417(payload).matrix
      const theirs = bwipMatrix("micropdf417", payload)
      expect(mine.length).toBeLessThanOrEqual(theirs.length)
      expect(mine[0]!.length).toBeLessThanOrEqual(theirs[0]!.length)
    })
  }
})
