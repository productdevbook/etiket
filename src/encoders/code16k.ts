/**
 * Code 16K encoder — ANSI/AIM BC6
 *
 * A stacked symbology built on the Code 128 character set. A symbol has 2-16
 * rows of 5 symbol characters each. Every row is 70 modules wide and is framed
 * by a row-specific start/stop pattern pair, which is what identifies the row
 * (there is no row-indicator codeword).
 *
 * Symbol layout:
 *   - mode character (row 0, character 0): `(rows - 2) * 7 + mode`, where mode
 *     selects the starting character set and any leading shifted characters
 *   - data characters, encoded in character sets A/B/C with the Code 128
 *     shift/latch rules
 *   - pad characters (value 103) up to the symbol's data capacity
 *   - two symbol check characters C and K, computed mod 107 over the mode
 *     character plus all data characters
 *
 * Row bar patterns: start pattern (4 elements) + a 1-module bar, then the 5
 * symbol characters (11 modules each, space first), then the stop pattern
 * (4 elements). 7 + 1 + 55 + 7 = 70 modules.
 */

import { InvalidInputError, CapacityError } from "../errors"

/** Symbol character bar/space widths for values 0-106 (11 modules each) */
// prettier-ignore
const ENCS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213",
  "122312", "132212", "221213", "221312", "231212", "112232", "122132",
  "122231", "113222", "123122", "123221", "223211", "221132", "221231",
  "213212", "223112", "312131", "311222", "321122", "321221", "312212",
  "322112", "322211", "212123", "212321", "232121", "111323", "131123",
  "131321", "112313", "132113", "132311", "211313", "231113", "231311",
  "112133", "112331", "132131", "113123", "113321", "133121", "313121",
  "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111",
  "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114",
  "413111", "241112", "134111", "111242", "121142", "121241", "114212",
  "124112", "124211", "411212", "421112", "421211", "212141", "214121",
  "412121", "111143", "111341", "131141", "114113", "114311", "411113",
  "411311", "113141", "114131", "311141", "411131", "211412", "211214",
  "211232", "211133",
]

/** Row start patterns, indexed by row number (4 elements, 7 modules) */
// prettier-ignore
const START_PATTERNS: string[] = [
  "3211", "2221", "2122", "1411", "1132", "1231", "1114", "3112",
  "3211", "2221", "2122", "1411", "1132", "1231", "1114", "3112",
]

/**
 * Row stop patterns, indexed by row number (4 elements, 7 modules).
 *
 * BC6 defines two sets; the "odd" set applies to a stand-alone symbol and to
 * odd-numbered members of a structured append group. etiket only emits
 * stand-alone symbols.
 */
// prettier-ignore
const STOP_PATTERNS: string[] = [
  "3211", "2221", "2122", "1411", "1132", "1231", "1114", "3112",
  "1132", "1231", "1114", "3112", "3211", "2221", "2122", "1411",
]

/** Character sets */
const SET_A = 0
const SET_B = 1
const SET_C = 2

/** Special symbol character values, per character set */
const SWB_A = 100
const SWC_A = 99
const SB1_A = 98
const SB2_A = 104
const SC2_A = 105
const SC3_A = 106

const SWA_B = 101
const SWC_B = 99
const SA1_B = 98
const SA2_B = 104
const SC2_B = 105
const SC3_B = 106

const SWA_C = 101
const SWB_C = 100
const SB1_C = 104
const SB2_C = 105
const SB3_C = 106

/** Pad character, identical in all three character sets */
const PAD = 103

/** Symbol characters per row */
const CHARS_PER_ROW = 5

/** Modules in a row: start (7) + separator bar (1) + 5 x 11 + stop (7) */
const ROW_MODULES = 70

export interface Code16KResult {
  /**
   * The complete symbol, including the 1-module separator rows above, below
   * and between the data rows.
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

/** Value of an ASCII code in character set A (0-95) */
function valueA(code: number): number {
  return code >= 32 ? code - 32 : code + 64
}

/** Value of an ASCII code in character set B (0-95) */
function valueB(code: number): number {
  return code - 32
}

/** Is the character available in set A but not set B? (control characters) */
function aOnly(code: number): boolean {
  return code < 32
}

/** Is the character available in set B but not set A? (lowercase and friends) */
function bOnly(code: number): boolean {
  return code > 95
}

/** Is the character available in set A? */
function inA(code: number): boolean {
  return code <= 95
}

/** Is the character available in set B? */
function inB(code: number): boolean {
  return code >= 32
}

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57
}

/**
 * Encode the message into symbol characters, following the BC6 character set
 * selection rules (latch when a run pays for itself, shift otherwise).
 *
 * @returns the data characters and the mode value for the mode character
 */
function encodeData(msg: number[]): { cws: number[]; mode: number } {
  const n = msg.length

  // Length of the digit run starting at each position
  const nums: number[] = Array.from({ length: n + 1 }, () => 0)
  for (let i = n - 1; i >= 0; i--) nums[i] = isDigit(msg[i]!) ? nums[i + 1]! + 1 : 0

  // Distance from each position to the next set-A-only / set-B-only character
  const nextA: number[] = Array.from({ length: n + 1 }, () => 9999)
  const nextB: number[] = Array.from({ length: n + 1 }, () => 9999)
  for (let i = n - 1; i >= 0; i--) {
    nextA[i] = aOnly(msg[i]!) ? 0 : nextA[i + 1]! + 1
    nextB[i] = bOnly(msg[i]!) ? 0 : nextB[i + 1]! + 1
  }
  /** Does a set-A-only character come before the next set-B-only character? */
  const aBeforeB = (i: number): boolean => nextA[i]! < nextB[i]!
  /** Does a set-B-only character come before the next set-A-only character? */
  const bBeforeA = (i: number): boolean => nextB[i]! < nextA[i]!

  const cws: number[] = []
  const encA = (i: number): void => {
    cws.push(valueA(msg[i]!))
  }
  const encB = (i: number): void => {
    cws.push(valueB(msg[i]!))
  }
  const encC = (i: number): void => {
    cws.push((msg[i]! - 48) * 10 + (msg[i + 1]! - 48))
  }

  let set: number
  let mode: number
  let i = 0

  // Mode selection: the mode character records where the data starts, so the
  // opening latch/shift is free
  if (n >= 2 && nums[0]! >= 2 && nums[0]! % 2 === 0) {
    // even digit run => start in C
    set = SET_C
    mode = 2
  } else if (n >= 2 && nums[0]! >= 3 && nums[0]! % 2 === 1) {
    // odd digit run => one B character, then C
    encB(0)
    set = SET_C
    mode = 5
    i = 1
  } else if (n >= 2 && inB(msg[0]!) && nums[1]! >= 2 && nums[1]! % 2 === 0) {
    encB(0)
    set = SET_C
    mode = 5
    i = 1
  } else if (n >= 2 && inB(msg[0]!) && nums[1]! >= 3 && nums[1]! % 2 === 1) {
    encB(0)
    encB(1)
    set = SET_C
    mode = 6
    i = 2
  } else if (n >= 2 && inB(msg[0]!) && inB(msg[1]!) && nums[2]! >= 2 && nums[2]! % 2 === 0) {
    encB(0)
    encB(1)
    set = SET_C
    mode = 6
    i = 2
  } else if (aBeforeB(0)) {
    set = SET_A
    mode = 0
  } else {
    set = SET_B
    mode = 1
  }

  while (i < n) {
    const run = nums[i]!

    if (set === SET_A) {
      if (i < n - 1 && bOnly(msg[i]!) && aBeforeB(i + 1)) {
        cws.push(SB1_A)
        encB(i)
        i += 1
      } else if (i < n - 2 && bOnly(msg[i]!) && bOnly(msg[i + 1]!) && aBeforeB(i + 2)) {
        cws.push(SB2_A)
        encB(i)
        encB(i + 1)
        i += 2
      } else if (bOnly(msg[i]!)) {
        cws.push(SWB_A)
        set = SET_B
      } else if (i < n - 4 && run === 4 && inA(msg[i + 4]!)) {
        cws.push(SC2_A)
        encC(i)
        encC(i + 2)
        i += 4
      } else if (i < n - 6 && run === 6 && inA(msg[i + 6]!)) {
        cws.push(SC3_A)
        encC(i)
        encC(i + 2)
        encC(i + 4)
        i += 6
      } else if (run >= 4 && run % 2 === 0) {
        cws.push(SWC_A)
        set = SET_C
      } else {
        encA(i)
        i += 1
      }
      continue
    }

    if (set === SET_B) {
      if (i < n - 1 && aOnly(msg[i]!) && bBeforeA(i + 1)) {
        cws.push(SA1_B)
        encA(i)
        i += 1
      } else if (i < n - 2 && aOnly(msg[i]!) && aOnly(msg[i + 1]!) && bBeforeA(i + 2)) {
        cws.push(SA2_B)
        encA(i)
        encA(i + 1)
        i += 2
      } else if (aOnly(msg[i]!)) {
        cws.push(SWA_B)
        set = SET_A
      } else if (i < n - 4 && run === 4 && inB(msg[i + 4]!)) {
        cws.push(SC2_B)
        encC(i)
        encC(i + 2)
        i += 4
      } else if (i < n - 6 && run === 6 && inB(msg[i + 6]!)) {
        cws.push(SC3_B)
        encC(i)
        encC(i + 2)
        encC(i + 4)
        i += 6
      } else if (run >= 4 && run % 2 === 0) {
        cws.push(SWC_B)
        set = SET_C
      } else {
        encB(i)
        i += 1
      }
      continue
    }

    // SET_C
    if (run >= 2) {
      encC(i)
      i += 2
    } else if (i < n - 1 && inB(msg[i]!) && nums[i + 1]! >= 2 && nums[i + 1]! % 2 === 0) {
      cws.push(SB1_C)
      encB(i)
      i += 1
    } else if (i < n - 1 && inB(msg[i]!) && nums[i + 1]! >= 3 && nums[i + 1]! % 2 === 1) {
      cws.push(SB2_C)
      encB(i)
      encB(i + 1)
      i += 2
    } else if (
      i < n - 2 &&
      inB(msg[i]!) &&
      inB(msg[i + 1]!) &&
      nums[i + 2]! >= 2 &&
      nums[i + 2]! % 2 === 0
    ) {
      cws.push(SB2_C)
      encB(i)
      encB(i + 1)
      i += 2
    } else if (
      i < n - 3 &&
      inB(msg[i]!) &&
      inB(msg[i + 1]!) &&
      nums[i + 2]! >= 3 &&
      nums[i + 2]! % 2 === 1
    ) {
      cws.push(SB3_C)
      encB(i)
      encB(i + 1)
      encB(i + 2)
      i += 3
    } else if (
      i < n - 3 &&
      inB(msg[i]!) &&
      inB(msg[i + 1]!) &&
      inB(msg[i + 2]!) &&
      nums[i + 3]! >= 2 &&
      nums[i + 3]! % 2 === 0
    ) {
      cws.push(SB3_C)
      encB(i)
      encB(i + 1)
      encB(i + 2)
      i += 3
    } else if (aBeforeB(i)) {
      cws.push(SWA_C)
      set = SET_A
    } else {
      cws.push(SWB_C)
      set = SET_B
    }
  }

  return { cws, mode }
}

/**
 * Sixteen rows of numeric pairs holds 154 characters; nothing holds more.
 */
const MAX_CODE_16K_CHARACTERS = 200

/**
 * Encode text as Code 16K
 *
 * @param text - ASCII text (codes 0-127)
 * @returns Stacked barcode matrix, one entry per data row
 */
export function encodeCode16K(text: string): Code16KResult {
  if (text.length === 0) {
    throw new InvalidInputError("Code 16K input must not be empty")
  }
  if (text.length > MAX_CODE_16K_CHARACTERS) {
    throw new CapacityError(
      `Data too long for Code 16K: ${text.length} characters is past what any symbol holds`,
    )
  }

  const msg: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code > 127) {
      throw new InvalidInputError(`Code 16K: unsupported character (code ${code})`)
    }
    msg.push(code)
  }

  const { cws, mode } = encodeData(msg)

  // Smallest symbol that holds the data: r rows carry 5r - 3 data characters
  // (the remaining 3 are the mode character and the two check characters)
  let rows = 0
  let capacity = 0
  for (let r = 2; r <= 16; r++) {
    if (cws.length <= r * CHARS_PER_ROW - 3) {
      rows = r
      capacity = r * CHARS_PER_ROW - 3
      break
    }
  }
  if (rows === 0) {
    throw new CapacityError("Code 16K: data exceeds maximum capacity (16 rows x 5 characters)")
  }

  // Pad characters, then the mode character in front
  while (cws.length < capacity) cws.push(PAD)
  const symbol = [(rows - 2) * 7 + mode, ...cws]

  // Symbol check characters C and K, mod 107 over the whole symbol
  let c1 = 0
  let c2 = 0
  for (let i = 0; i < symbol.length; i++) {
    c1 += (i + 2) * symbol[i]!
    c2 += (i + 1) * symbol[i]!
  }
  c1 %= 107
  c2 = (c2 + c1 * (capacity + 2)) % 107
  symbol.push(c1, c2)

  const dataRows: boolean[][] = []
  for (let r = 0; r < rows; r++) {
    // Row elements: start pattern, a 1-module bar, 5 symbol characters, stop
    // pattern. The extra bar makes the symbol characters start on a space.
    const elements =
      START_PATTERNS[r]! +
      "1" +
      symbol
        .slice(r * CHARS_PER_ROW, (r + 1) * CHARS_PER_ROW)
        .map((cw) => ENCS[cw]!)
        .join("") +
      STOP_PATTERNS[r]!

    const modules: boolean[] = []
    let isBar = true
    for (const digit of elements) {
      const width = digit.charCodeAt(0) - 48
      for (let k = 0; k < width; k++) modules.push(isBar)
      isBar = !isBar
    }
    dataRows.push(modules)
  }

  // A Code 16K symbol carries a solid 1-module separator above, below and
  // between its data rows; without them the rows run together and the symbol
  // cannot be read.
  const separator = Array.from<boolean>({ length: ROW_MODULES }).fill(true)
  const matrix: boolean[][] = []
  const separatorRows: number[] = []
  for (const row of dataRows) {
    separatorRows.push(matrix.length)
    matrix.push([...separator])
    matrix.push(row)
  }
  separatorRows.push(matrix.length)
  matrix.push([...separator])

  return { matrix, rows, cols: ROW_MODULES, separatorRows }
}
