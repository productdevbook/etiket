/**
 * Codablock F encoder — stacked Code 128 barcode
 * Used in healthcare and electronics for compact labeling
 *
 * Every row is a self-contained Code 128 symbol of `columns + 5` codewords:
 *
 *   Start A | subset selector | row indicator | columns data | row check | Stop
 *
 * The subset selector (Code C 99, Code B 100, Shift 98 meaning Code A) re-latches
 * the character set at the start of *every* row, so the charset state never has to
 * survive a row boundary — a digit run split across rows is re-entered into Code C
 * on the next row. Row 0's indicator carries the row count (rows - 2), rows 1..n
 * carry the row number + 42, and the last row's final two data positions hold the
 * K1/K2 mod-86 symbol check characters computed over the whole message.
 *
 * Ported from the BWIPP reference implementation (uk.co.terryburton.bwipp
 * codablockf), which is used as the oracle in test/encoders-codablock-f-bwip.test.ts.
 */

import { InvalidInputError, CapacityError } from "../errors"

// Code 128 codeword values. Shift/latch values are identical in every subset:
// Shift 98, Code C 99, Code B 100, Code A 101.
const SHIFT = 98
const CODE_C = 99
const CODE_B = 100
const CODE_A = 101
const START_A = 103
const STOP = 104

const MAX_ROWS = 44
const MIN_COLUMNS = 4
const MAX_COLUMNS = 62
const DEFAULT_COLUMNS = 8

// Full Code 128 encoding patterns (bar/space widths), indices 0-105
// Each pattern is 6 elements: bar, space, bar, space, bar, space
const PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], // 0
  [2, 2, 2, 1, 2, 2], // 1
  [2, 2, 2, 2, 2, 1], // 2
  [1, 2, 1, 2, 2, 3], // 3
  [1, 2, 1, 3, 2, 2], // 4
  [1, 3, 1, 2, 2, 2], // 5
  [1, 2, 2, 2, 1, 3], // 6
  [1, 2, 2, 3, 1, 2], // 7
  [1, 3, 2, 2, 1, 2], // 8
  [2, 2, 1, 2, 1, 3], // 9
  [2, 2, 1, 3, 1, 2], // 10
  [2, 3, 1, 2, 1, 2], // 11
  [1, 1, 2, 2, 3, 2], // 12
  [1, 2, 2, 1, 3, 2], // 13
  [1, 2, 2, 2, 3, 1], // 14
  [1, 1, 3, 2, 2, 2], // 15
  [1, 2, 3, 1, 2, 2], // 16
  [1, 2, 3, 2, 2, 1], // 17
  [2, 2, 3, 2, 1, 1], // 18
  [2, 2, 1, 1, 3, 2], // 19
  [2, 2, 1, 2, 3, 1], // 20
  [2, 1, 3, 2, 1, 2], // 21
  [2, 2, 3, 1, 1, 2], // 22
  [3, 1, 2, 1, 3, 1], // 23
  [3, 1, 1, 2, 2, 2], // 24
  [3, 2, 1, 1, 2, 2], // 25
  [3, 2, 1, 2, 2, 1], // 26
  [3, 1, 2, 2, 1, 2], // 27
  [3, 2, 2, 1, 1, 2], // 28
  [3, 2, 2, 2, 1, 1], // 29
  [2, 1, 2, 1, 2, 3], // 30
  [2, 1, 2, 3, 2, 1], // 31
  [2, 3, 2, 1, 2, 1], // 32
  [1, 1, 1, 3, 2, 3], // 33
  [1, 3, 1, 1, 2, 3], // 34
  [1, 3, 1, 3, 2, 1], // 35
  [1, 1, 2, 3, 1, 3], // 36
  [1, 3, 2, 1, 1, 3], // 37
  [1, 3, 2, 3, 1, 1], // 38
  [2, 1, 1, 3, 1, 3], // 39
  [2, 3, 1, 1, 1, 3], // 40
  [2, 3, 1, 3, 1, 1], // 41
  [1, 1, 2, 1, 3, 3], // 42
  [1, 1, 2, 3, 3, 1], // 43
  [1, 3, 2, 1, 3, 1], // 44
  [1, 1, 3, 1, 2, 3], // 45
  [1, 1, 3, 3, 2, 1], // 46
  [1, 3, 3, 1, 2, 1], // 47
  [3, 1, 3, 1, 2, 1], // 48
  [2, 1, 1, 3, 3, 1], // 49
  [2, 3, 1, 1, 3, 1], // 50
  [2, 1, 3, 1, 1, 3], // 51
  [2, 1, 3, 3, 1, 1], // 52
  [2, 1, 3, 1, 3, 1], // 53
  [3, 1, 1, 1, 2, 3], // 54
  [3, 1, 1, 3, 2, 1], // 55
  [3, 3, 1, 1, 2, 1], // 56
  [3, 1, 2, 1, 1, 3], // 57
  [3, 1, 2, 3, 1, 1], // 58
  [3, 3, 2, 1, 1, 1], // 59
  [3, 1, 4, 1, 1, 1], // 60
  [2, 2, 1, 4, 1, 1], // 61
  [4, 3, 1, 1, 1, 1], // 62
  [1, 1, 1, 2, 2, 4], // 63
  [1, 1, 1, 4, 2, 2], // 64
  [1, 2, 1, 1, 2, 4], // 65
  [1, 2, 1, 4, 2, 1], // 66
  [1, 4, 1, 1, 2, 2], // 67
  [1, 4, 1, 2, 2, 1], // 68
  [1, 1, 2, 2, 1, 4], // 69
  [1, 1, 2, 4, 1, 2], // 70
  [1, 2, 2, 1, 1, 4], // 71
  [1, 2, 2, 4, 1, 1], // 72
  [1, 4, 2, 1, 1, 2], // 73
  [1, 4, 2, 2, 1, 1], // 74
  [2, 4, 1, 2, 1, 1], // 75
  [2, 2, 1, 1, 1, 4], // 76
  [4, 1, 3, 1, 1, 1], // 77
  [2, 4, 1, 1, 1, 2], // 78
  [1, 3, 4, 1, 1, 1], // 79
  [1, 1, 1, 2, 4, 2], // 80
  [1, 2, 1, 1, 4, 2], // 81
  [1, 2, 1, 2, 4, 1], // 82
  [1, 1, 4, 2, 1, 2], // 83
  [1, 2, 4, 1, 1, 2], // 84
  [1, 2, 4, 2, 1, 1], // 85
  [4, 1, 1, 2, 1, 2], // 86
  [4, 2, 1, 1, 1, 2], // 87
  [4, 2, 1, 2, 1, 1], // 88
  [2, 1, 2, 1, 4, 1], // 89
  [2, 1, 4, 1, 2, 1], // 90
  [4, 1, 2, 1, 2, 1], // 91
  [1, 1, 1, 1, 4, 3], // 92
  [1, 1, 1, 3, 4, 1], // 93
  [1, 3, 1, 1, 4, 1], // 94
  [1, 1, 4, 1, 1, 3], // 95
  [1, 1, 4, 3, 1, 1], // 96 (CODE_A)
  [4, 1, 1, 1, 1, 3], // 97 (CODE_B)
  [4, 1, 1, 3, 1, 1], // 98 (CODE_C)
  [1, 1, 3, 1, 4, 1], // 99 (CODE_C)
  [1, 1, 4, 1, 3, 1], // 100 (CODE_B)
  [3, 1, 1, 1, 4, 1], // 101 (CODE_A)
  [4, 1, 1, 1, 3, 1], // 102 (FNC1)
  [2, 1, 1, 4, 1, 2], // 103 (START_A)
  [2, 1, 1, 2, 1, 4], // 104 (START_B)
  [2, 1, 1, 2, 3, 2], // 105 (START_C)
]

const STOP_PATTERN = [2, 3, 3, 1, 1, 1, 2]

export interface CodablockFResult {
  /**
   * The complete symbol, including the separator rows above, below and between
   * the data rows.
   */
  matrix: boolean[][]
  /** Number of data rows (the matrix has `2 * rows + 1` rows in total) */
  rows: number
  cols: number
  /**
   * Indices in `matrix` of the separator rows, which render 1 module tall
   * while the data rows render at the full row height.
   */
  separatorRows: number[]
}

/** The solid separator that closes the symbol top and bottom. */
function solidSeparator(width: number): boolean[] {
  return Array.from<boolean>({ length: width }).fill(true)
}

/**
 * The separator between two data rows. Its ends carry a fixed pattern so a
 * reader can tell the rows apart; the middle is solid.
 */
function innerSeparator(width: number): boolean[] {
  const left = [1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0]
  const right = [1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1]
  const middle = Array.from<number>({
    length: Math.max(0, width - left.length - right.length),
  }).fill(1)
  return [...left, ...middle, ...right].slice(0, width).map((m) => m === 1)
}

/** Code A value for a character, or -1 when Code A cannot represent it. */
function setA(ch: number): number {
  if (ch >= 32 && ch <= 95) return ch - 32
  if (ch >= 0 && ch < 32) return ch + 64
  return -1
}

/** Code B value for a character, or -1 when Code B cannot represent it. */
function setB(ch: number): number {
  return ch >= 32 && ch <= 127 ? ch - 32 : -1
}

/**
 * Map a row indicator or check value (0-85) onto a codeword that decodes to the
 * same value in Code A and Code B. Code C needs no mapping — value and codeword
 * are identical there.
 */
function abMap(value: number): number {
  if (value < 32) return value + 64
  if (value < 48) return value - 32
  return value - 22
}

/** K1/K2 symbol check characters — a mod-86 running weight over the raw message. */
function symbolCheck(text: string): [k1: number, k2: number] {
  let k1 = 0
  let k2 = 0
  for (let p = 0; p < text.length; p++) {
    const ch = text.charCodeAt(p)
    const t1 = (ch * p) % 86
    const t2 = (t1 + ch) % 86
    k1 = (k1 + t2) % 86
    k2 = (k2 + t1) % 86
  }
  return [k1, k2]
}

/**
 * Expand a codeword stream into modules, starting with a bar.
 *
 * 104 is Start B in the Code 128 table but Codablock F only ever emits it as the
 * Stop character, which has its own seven element pattern.
 */
function modulesFor(codewords: readonly number[]): boolean[] {
  const modules: boolean[] = []
  for (const code of codewords) {
    const pattern = code === STOP ? STOP_PATTERN : PATTERNS[code]!
    let isBar = true
    for (const width of pattern) {
      for (let n = 0; n < width; n++) modules.push(isBar)
      isBar = !isBar
    }
  }
  return modules
}

/**
 * Forty-four rows of sixty-two characters, the most any Codablock F symbol holds.
 */
const MAX_CODABLOCK_F_CHARACTERS = 2800

/**
 * Encode text as Codablock F (stacked Code 128)
 *
 * @param text - Text to encode
 * @param options - columns: data columns per row (4-62, default 8)
 */
export function encodeCodablockF(text: string, options?: { columns?: number }): CodablockFResult {
  if (text.length === 0) {
    throw new InvalidInputError("Codablock F input must not be empty")
  }
  if (text.length > MAX_CODABLOCK_F_CHARACTERS) {
    throw new CapacityError(
      `Data too long for Codablock F: ${text.length} characters is past what any symbol holds`,
    )
  }

  const columns = options?.columns ?? DEFAULT_COLUMNS
  if (!Number.isInteger(columns) || columns < MIN_COLUMNS || columns > MAX_COLUMNS) {
    throw new InvalidInputError(
      `Codablock F: columns must be an integer from ${MIN_COLUMNS} to ${MAX_COLUMNS}`,
    )
  }

  const msg: number[] = []
  for (let p = 0; p < text.length; p++) {
    const ch = text.charCodeAt(p)
    if (setA(ch) < 0 && setB(ch) < 0) {
      throw new InvalidInputError(`Codablock F: unsupported character "${text[p]}" (code ${ch})`)
    }
    msg.push(ch)
  }
  const len = msg.length

  // Look-ahead tables. `digits[p]` is the length of the digit run starting at p;
  // `nextAOnly`/`nextBOnly` give the distance to the next character only Code A
  // (respectively only Code B) can hold. The sentinel entry past the end keeps the
  // "neither occurs again" case from selecting a subset.
  const digits = Array.from({ length: len + 1 }, () => 0)
  const nextAOnly = Array.from({ length: len + 1 }, () => 9999)
  const nextBOnly = Array.from({ length: len + 1 }, () => 9999)
  for (let p = len - 1; p >= 0; p--) {
    const ch = msg[p]!
    digits[p] = ch >= 48 && ch <= 57 ? digits[p + 1]! + 1 : 0
    nextAOnly[p] = setB(ch) < 0 ? 0 : nextAOnly[p + 1]! + 1
    nextBOnly[p] = setA(ch) < 0 ? 0 : nextBOnly[p + 1]! + 1
  }
  const aBeforeB = (p: number) => nextAOnly[p]! < nextBOnly[p]!
  const bBeforeA = (p: number) => nextBOnly[p]! < nextAOnly[p]!

  const rowLen = columns + 5
  const cws = Array.from({ length: rowLen * MAX_ROWS }, () => 0)

  let i = 0 // read cursor into msg
  let j = 0 // write cursor into cws
  let r = 1 // row being built, 1-based
  let cset: "A" | "B" | "C" = "B"
  let rem = 0 // data codewords left in the current row

  const put = (value: number) => {
    cws[j] = value
    j++
  }
  /** Encode the current character in the active (single-byte) subset. */
  const putChar = () => {
    put(cset === "A" ? setA(msg[i]!) : setB(msg[i]!))
    i++
  }
  /** Encode the next digit pair in Code C. */
  const putPair = () => {
    put((msg[i]! - 48) * 10 + (msg[i + 1]! - 48))
    i += 2
  }
  /** Fill unused data positions with alternating latches, per the spec. */
  const padRow = (count: number) => {
    for (let n = 0; n < count; n++) {
      if (cset === "C") {
        put(CODE_B)
        cset = "B"
      } else {
        put(CODE_C)
        cset = "C"
      }
    }
  }

  let lastRow = false
  while (!lastRow) {
    if (r > MAX_ROWS) {
      throw new CapacityError(`Codablock F: data exceeds maximum ${MAX_ROWS} rows`)
    }

    // Start A plus the row's subset selector: the charset is re-latched per row,
    // so a run split across rows resumes correctly instead of being misread.
    put(START_A)
    if (digits[i]! >= 2) {
      put(CODE_C)
      cset = "C"
    } else if (aBeforeB(i)) {
      put(SHIFT)
      cset = "A"
    } else {
      put(CODE_B)
      cset = "B"
    }
    j++ // row indicator, filled in once the row count is known

    let endOfRow = false
    for (;;) {
      rem = columns + 3 - (j % rowLen)
      if (i === len || endOfRow) break

      const ch = msg[i]!
      // Digits worth latching to Code C for, capped by what still fits in the row.
      const remnums = Math.min(digits[i]!, rem * 2)

      if (cset !== "C" && remnums >= 4 && remnums % 2 === 0 && rem >= 3) {
        put(CODE_C)
        cset = "C"
        putPair()
        putPair()
        continue
      }
      if (cset !== "C" && remnums >= 4 && remnums % 2 === 1 && rem >= 4) {
        putChar() // odd run: encode the leading digit before latching
        put(CODE_C)
        cset = "C"
        putPair()
        putPair()
        continue
      }
      if (cset === "B" && setB(ch) < 0 && rem >= 2) {
        // Shift for a lone Code A character, latch when more of them follow.
        if (i < len - 1 && bBeforeA(i + 1)) {
          put(SHIFT)
        } else {
          put(CODE_A)
          cset = "A"
        }
        put(setA(ch))
        i++
        continue
      }
      if (cset === "A" && setA(ch) < 0 && rem >= 2) {
        if (i < len - 1 && aBeforeB(i + 1)) {
          put(SHIFT)
        } else {
          put(CODE_B)
          cset = "B"
        }
        put(setB(ch))
        i++
        continue
      }
      if (cset === "C" && remnums < 2 && rem >= 2) {
        if (aBeforeB(i)) {
          put(CODE_A)
          cset = "A"
        } else {
          put(CODE_B)
          cset = "B"
        }
        putChar()
        continue
      }
      if (cset === "A" && setA(ch) >= 0 && rem >= 1) {
        putChar()
        continue
      }
      if (cset === "B" && setB(ch) >= 0 && rem >= 1) {
        putChar()
        continue
      }
      if (cset === "C" && remnums >= 2 && rem >= 1) {
        putPair()
        continue
      }

      endOfRow = true
    }

    // The final row reserves its last two data positions for K1/K2, and a symbol
    // is never a single row.
    if (r > 1 && i === len && rem >= 2) {
      padRow(rem - 2)
      j += 3 // K1, K2 and the row check character
      put(STOP)
      lastRow = true
    } else {
      padRow(rem)
      j += 1 // row check character
      put(STOP)
      r++
    }
  }
  cws.length = j

  // Symbol check characters, in the subset the last row ends in
  const [k1, k2] = symbolCheck(text)
  cws[j - 4] = cset === "C" ? k1 : abMap(k1)
  cws[j - 3] = cset === "C" ? k2 : abMap(k2)

  // Row indicators: row count on the first row, row number + 42 afterwards
  cws[2] = cws[1] === CODE_C ? r - 2 : abMap(r - 2)
  for (let x = 1; x < r; x++) {
    const p = x * rowLen + 2
    cws[p] = cws[p - 1] === CODE_C ? x + 42 : abMap(x + 42)
  }

  // Row check characters (standard Code 128 mod 103, per row)
  for (let x = 0; x < r; x++) {
    const start = x * rowLen
    let csum = cws[start]!
    for (let k = 1; k <= columns + 2; k++) csum += cws[start + k]! * k
    cws[start + columns + 3] = csum % 103
  }

  const dataRows: boolean[][] = []
  for (let x = 0; x < r; x++) {
    dataRows.push(modulesFor(cws.slice(x * rowLen, (x + 1) * rowLen)))
  }

  const width = dataRows[0]?.length ?? 0
  const matrix: boolean[][] = []
  const separatorRows: number[] = []
  for (const [index, row] of dataRows.entries()) {
    separatorRows.push(matrix.length)
    matrix.push(index === 0 ? solidSeparator(width) : innerSeparator(width))
    matrix.push(row)
  }
  separatorRows.push(matrix.length)
  matrix.push(solidSeparator(width))

  return {
    matrix,
    rows: r,
    cols: width,
    separatorRows,
  }
}
