/**
 * Aztec mode-transition and capacity tables (ISO/IEC 24778).
 *
 * The latch table encodes spec knowledge that ordinary text rarely exercises in
 * full; a wrong entry corrupts symbols silently, so every transition is checked
 * directly.
 */

import { describe, expect, it } from "vitest"
import {
  Mode,
  MODE_BITS,
  getLatchSequence,
  getWordSize,
  getBaseMatrixSize,
  getModuleCount,
  getTotalBitCapacity,
  SHIFT_CODES,
  BINARY_SHIFT,
  GF_POLY,
  PUNCT_PAIRS,
  CHAR_TABLE,
} from "../src/encoders/aztec/tables"

const ALL_MODES = [Mode.Upper, Mode.Lower, Mode.Mixed, Mode.Punct, Mode.Digit]
const MODE_NAMES = ["Upper", "Lower", "Mixed", "Punct", "Digit"]

describe("Aztec mode bits", () => {
  it("uses 4 bits for Digit and 5 for every other mode", () => {
    expect(MODE_BITS[Mode.Digit]).toBe(4)
    for (const mode of [Mode.Upper, Mode.Lower, Mode.Mixed, Mode.Punct]) {
      expect(MODE_BITS[mode], MODE_NAMES[mode]).toBe(5)
    }
  })
})

describe("getLatchSequence", () => {
  it("returns an empty sequence when the mode is unchanged", () => {
    for (const mode of ALL_MODES) {
      expect(getLatchSequence(mode, mode), MODE_NAMES[mode]).toEqual({
        codes: [],
        modes: [],
        totalBits: 0,
      })
    }
  })

  const expected: Array<[Mode, Mode, number[], Mode[], number]> = [
    // From Upper
    [Mode.Upper, Mode.Lower, [28], [Mode.Upper], 5],
    [Mode.Upper, Mode.Mixed, [29], [Mode.Upper], 5],
    [Mode.Upper, Mode.Punct, [29, 30], [Mode.Upper, Mode.Mixed], 10],
    [Mode.Upper, Mode.Digit, [30], [Mode.Upper], 5],
    // From Lower
    [Mode.Lower, Mode.Upper, [29, 29], [Mode.Lower, Mode.Mixed], 10],
    [Mode.Lower, Mode.Mixed, [29], [Mode.Lower], 5],
    [Mode.Lower, Mode.Punct, [29, 30], [Mode.Lower, Mode.Mixed], 10],
    [Mode.Lower, Mode.Digit, [30], [Mode.Lower], 5],
    // From Mixed
    [Mode.Mixed, Mode.Upper, [29], [Mode.Mixed], 5],
    [Mode.Mixed, Mode.Lower, [28], [Mode.Mixed], 5],
    [Mode.Mixed, Mode.Punct, [30], [Mode.Mixed], 5],
    [Mode.Mixed, Mode.Digit, [28, 30], [Mode.Mixed, Mode.Lower], 10],
    // From Punct (only latches back through Upper)
    [Mode.Punct, Mode.Upper, [31], [Mode.Punct], 5],
    [Mode.Punct, Mode.Lower, [31, 28], [Mode.Punct, Mode.Upper], 10],
    [Mode.Punct, Mode.Mixed, [31, 29], [Mode.Punct, Mode.Upper], 10],
    [Mode.Punct, Mode.Digit, [31, 30], [Mode.Punct, Mode.Upper], 10],
    // From Digit (Digit codewords are 4 bits, so totals differ)
    [Mode.Digit, Mode.Upper, [14], [Mode.Digit], 4],
    [Mode.Digit, Mode.Lower, [14, 28], [Mode.Digit, Mode.Upper], 9],
    [Mode.Digit, Mode.Mixed, [14, 29], [Mode.Digit, Mode.Upper], 9],
    [Mode.Digit, Mode.Punct, [14, 29, 30], [Mode.Digit, Mode.Upper, Mode.Mixed], 14],
  ]

  for (const [from, to, codes, modes, totalBits] of expected) {
    it(`${MODE_NAMES[from]} → ${MODE_NAMES[to]}`, () => {
      expect(getLatchSequence(from, to)).toEqual({ codes, modes, totalBits })
    })
  }

  it("covers every ordered pair of modes", () => {
    expect(expected).toHaveLength(20) // 5 modes × 4 targets
  })

  it("reports totalBits consistent with the modes each code is emitted in", () => {
    for (const [from, to] of expected) {
      const seq = getLatchSequence(from, to)
      const sum = seq.modes.reduce((acc, mode) => acc + MODE_BITS[mode], 0)
      expect(seq.totalBits, `${MODE_NAMES[from]} → ${MODE_NAMES[to]}`).toBe(sum)
    }
  })

  it("emits one mode entry per code", () => {
    for (const [from, to] of expected) {
      const seq = getLatchSequence(from, to)
      expect(seq.codes.length, `${MODE_NAMES[from]} → ${MODE_NAMES[to]}`).toBe(seq.modes.length)
    }
  })

  it("starts every sequence in the source mode", () => {
    for (const [from, to] of expected) {
      expect(getLatchSequence(from, to).modes[0], MODE_NAMES[from]).toBe(from)
    }
  })

  it("keeps every latch code within its mode's bit width", () => {
    for (const [from, to] of expected) {
      const seq = getLatchSequence(from, to)
      for (const [i, code] of seq.codes.entries()) {
        const bits = MODE_BITS[seq.modes[i]!]
        expect(code, `${MODE_NAMES[from]} → ${MODE_NAMES[to]} code ${code}`).toBeLessThan(1 << bits)
      }
    }
  })
})

describe("Aztec shift and binary-shift tables", () => {
  it("defines every shift within the bit width of the mode it is read in", () => {
    for (const from of ALL_MODES) {
      for (const to of ALL_MODES) {
        const code = SHIFT_CODES[from]![to]
        if (code !== undefined) {
          expect(code, `${MODE_NAMES[from]} to ${MODE_NAMES[to]}`).toBeLessThan(
            1 << MODE_BITS[from],
          )
        }
      }
    }
  })

  it("gives every mode but Punct a shift into Punct", () => {
    for (const mode of [Mode.Upper, Mode.Lower, Mode.Mixed, Mode.Digit]) {
      expect(SHIFT_CODES[mode]![Mode.Punct], MODE_NAMES[mode]).toBe(0)
    }
    expect(SHIFT_CODES[Mode.Punct]![Mode.Punct]).toBeUndefined()
  })

  it("defines a binary shift code within each mode's bit width", () => {
    for (const mode of ALL_MODES) {
      const bs = BINARY_SHIFT[mode]
      if (bs) {
        expect(bs.bits, MODE_NAMES[mode]).toBe(MODE_BITS[mode])
        expect(bs.code, MODE_NAMES[mode]).toBeLessThan(1 << bs.bits)
      }
    }
  })
})

describe("Aztec character tables", () => {
  it("provides a table per mode", () => {
    expect(CHAR_TABLE).toHaveLength(5)
  })

  it("keeps every character value inside its mode's bit width", () => {
    for (const [index, table] of CHAR_TABLE.entries()) {
      const mode = ALL_MODES[index]!
      for (const [ch, value] of Object.entries(table)) {
        expect(value, `${MODE_NAMES[index]} "${ch}"`).toBeLessThan(1 << MODE_BITS[mode])
        expect(value, `${MODE_NAMES[index]} "${ch}"`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("maps punctuation pairs to Punct-mode values", () => {
    expect(PUNCT_PAIRS.size).toBeGreaterThan(0)
    for (const [pair, value] of PUNCT_PAIRS) {
      expect(pair, `pair "${pair}"`).toHaveLength(2)
      expect(value, `pair "${pair}"`).toBeLessThan(1 << MODE_BITS[Mode.Punct])
    }
  })

  it("includes the common sentence-punctuation pairs", () => {
    for (const pair of [". ", ", "]) {
      expect(PUNCT_PAIRS.has(pair), pair).toBe(true)
    }
  })
})

describe("Aztec symbol capacity tables", () => {
  it("returns the specified word size per layer count", () => {
    expect(getWordSize(1)).toBe(6)
    expect(getWordSize(2)).toBe(6)
    expect(getWordSize(3)).toBe(8)
    expect(getWordSize(8)).toBe(8)
    expect(getWordSize(9)).toBe(10)
    expect(getWordSize(22)).toBe(10)
    expect(getWordSize(23)).toBe(12)
    expect(getWordSize(32)).toBe(12)
  })

  it("increases word size monotonically with layers", () => {
    for (let layers = 2; layers <= 32; layers++) {
      expect(getWordSize(layers), `layers ${layers}`).toBeGreaterThanOrEqual(
        getWordSize(layers - 1),
      )
    }
  })

  it("computes the base matrix size for compact and full symbols", () => {
    expect(getBaseMatrixSize(1, true)).toBe(15)
    expect(getBaseMatrixSize(4, true)).toBe(27)
    expect(getBaseMatrixSize(1, false)).toBe(18)
    expect(getBaseMatrixSize(32, false)).toBe(142)
  })

  it("adds reference grid lines to full-range module counts", () => {
    // Compact symbols carry no reference grid
    for (const layers of [1, 2, 3, 4]) {
      expect(getModuleCount(layers, true), `compact ${layers}`).toBe(
        getBaseMatrixSize(layers, true),
      )
    }
    // Full-range symbols are always larger than their base size
    for (const layers of [1, 8, 16, 32]) {
      expect(getModuleCount(layers, false), `full ${layers}`).toBeGreaterThan(
        getBaseMatrixSize(layers, false),
      )
    }
  })

  it("produces odd module counts (symbols are centred on a bullseye)", () => {
    for (const layers of [1, 2, 3, 4]) {
      expect(getModuleCount(layers, true) % 2, `compact ${layers}`).toBe(1)
    }
    for (const layers of [1, 5, 10, 20, 32]) {
      expect(getModuleCount(layers, false) % 2, `full ${layers}`).toBe(1)
    }
  })

  it("computes total bit capacity from the layer count", () => {
    expect(getTotalBitCapacity(1, true)).toBe((88 + 16) * 1)
    expect(getTotalBitCapacity(4, true)).toBe((88 + 64) * 4)
    expect(getTotalBitCapacity(1, false)).toBe((112 + 16) * 1)
    expect(getTotalBitCapacity(32, false)).toBe((112 + 512) * 32)
  })

  it("grows capacity monotonically with layers", () => {
    for (const compact of [true, false]) {
      const max = compact ? 4 : 32
      for (let layers = 2; layers <= max; layers++) {
        expect(
          getTotalBitCapacity(layers, compact),
          `${compact ? "compact" : "full"} ${layers}`,
        ).toBeGreaterThan(getTotalBitCapacity(layers - 1, compact))
      }
    }
  })

  it("gives full-range symbols more capacity than compact at equal layers", () => {
    for (const layers of [1, 2, 3, 4]) {
      expect(getTotalBitCapacity(layers, false), `layers ${layers}`).toBeGreaterThan(
        getTotalBitCapacity(layers, true),
      )
    }
  })
})

describe("Aztec Galois field polynomials", () => {
  it("defines a primitive polynomial for every word size in use", () => {
    for (const wordSize of [4, 6, 8, 10, 12]) {
      expect(GF_POLY[wordSize], `word size ${wordSize}`).toBeGreaterThan(0)
    }
  })

  it("uses polynomials of the correct degree", () => {
    for (const wordSize of [4, 6, 8, 10, 12]) {
      const poly = GF_POLY[wordSize]!
      // A primitive polynomial for GF(2^n) has degree n → bit n is set
      expect(poly >> wordSize, `word size ${wordSize}`).toBe(1)
    }
  })

  it("covers every word size the size table can produce", () => {
    for (let layers = 1; layers <= 32; layers++) {
      expect(GF_POLY[getWordSize(layers)], `layers ${layers}`).toBeDefined()
    }
  })
})
