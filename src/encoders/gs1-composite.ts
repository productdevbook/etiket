/**
 * GS1 Composite Symbology — 2D composite component (ISO/IEC 24723)
 *
 * A composite symbol is a linear component carrying the primary identification
 * plus a 2D composite component stacked above it, separated by a one to three
 * module high separator pattern.
 *
 * The 2D component is *not* a plain MicroPDF417 of the element string. ISO/IEC
 * 24723 defines its own bit-level encodation — an encodation method field, a
 * compressed data field for the common AI sequences and a general purpose field
 * that switches between numeric, alphanumeric and ISO 646 compaction — and then
 * maps the resulting bit string onto codewords:
 *
 * - CC-A: base-928 conversion of the bit string, rendered as a MicroPDF417 with
 *   its own (smaller) symbol size and RAP table.
 * - CC-B: the bit string as bytes, byte-compacted behind a 920/901/924 header
 *   and rendered as an ordinary MicroPDF417.
 * - CC-C: the same byte compaction rendered as a full PDF417. Only reachable
 *   with a GS1-128 linear component.
 *
 * The linear component signals the presence of the 2D component through its
 * linkage flag; see the `linkage` option on the GS1 DataBar encoders.
 */

import { CapacityError, InvalidInputError } from "../errors"
import { encodeEAN13, encodeEAN8 } from "./ean"
import {
  encodeGS1DataBarExpanded,
  encodeGS1DataBarLimited,
  encodeGS1DataBarOmni,
  encodeGS1DataBarTruncated,
  gs1DataBarExpandedStackedRows,
  gs1DataBarStackedOmniRows,
  gs1DataBarStackedRows,
} from "./gs1-databar"
import type { StackedRows } from "./gs1-databar"
import { encodeGS1128, parseAIString } from "./gs1-128"
import {
  microPDF417CodewordModules,
  microPDF417RAPModules,
  MICROPDF417_METRICS,
} from "./micropdf417"
import { generateECCodewords } from "./pdf417/ec"
import { getCodewordPattern, getRowCluster, START_PATTERN } from "./pdf417/tables"
import { encodeUPCA, encodeUPCE } from "./upc"

// ─── Types ──────────────────────────────────────────────────────────────────

/** Composite component version. */
export type CompositeType = "CC-A" | "CC-B" | "CC-C"

/** Every linear symbology a composite component can sit above. */
export const COMPOSITE_LINEAR_TYPES = [
  "ean13",
  "ean8",
  "upca",
  "upce",
  "gs1-128",
  "databar-omni",
  "databar-truncated",
  "databar-limited",
  "databar-stacked",
  "databar-stacked-omni",
  "databar-expanded",
  "databar-expanded-stacked",
] as const

/** Linear symbology a composite component can sit above. */
export type CompositeLinearType = (typeof COMPOSITE_LINEAR_TYPES)[number]

export interface GS1CompositeOptions {
  /**
   * Version to start from. CC-A is upgraded to CC-B automatically when the data
   * does not fit; CC-B is only upgraded to CC-C when `linearWidth` is set.
   */
  type?: CompositeType
  /** Data columns of the 2D component: 2-4 for CC-A/CC-B, up to 30 for CC-C. */
  columns?: number
  /** Linear symbology the component will sit above; sets the default columns. */
  linear?: CompositeLinearType
  /** Width in modules of a GS1-128 linear component; required for CC-C. */
  linearWidth?: number
}

export interface GS1CompositeResult {
  /** The 2D composite component matrix */
  composite: boolean[][]
  /** Composite version actually used (auto-upgraded when the data overflows) */
  type: CompositeType
  /** Number of rows in composite */
  rows: number
  /** Width in modules */
  cols: number
  /** Data columns of the 2D component */
  columns: number
}

export interface GS1CompositeSymbolResult {
  /** Linear symbology used for the primary component */
  linearType: CompositeLinearType
  /** Composite version actually used */
  type: CompositeType
  /** The complete symbol, module rows from the top of the 2D component down */
  matrix: boolean[][]
  /** Height in modules of each row of `matrix` */
  rowHeights: number[]
  /** Symbol width in modules */
  cols: number
  /** The 2D component on its own */
  composite: boolean[][]
  /** The separator rows on their own */
  separator: boolean[][]
  /**
   * Bar/space widths of the linear component, bar first. Empty for the stacked
   * primaries, which have no single row of bars; `linearRows` carries those.
   */
  linear: number[]
  /** Module rows of a stacked primary component, absent for the others */
  linearRows?: boolean[][]
  /** Column of `matrix` the linear component starts at */
  linearOffset: number
  /** Height in modules of the linear component */
  linearHeight: number
}

// ─── Bit level constants (ISO/IEC 24723) ────────────────────────────────────

/** Marks an FNC1 separator inside the general purpose field. */
const FNC1 = -1

/** Pattern that pads the bit string out to the next symbol capacity. */
const FILL_PATTERN = [0, 0, 1, 0, 0]

/**
 * Bit capacities by data column count (2, 3, 4), largest first.
 * ISO/IEC 24723 tables 12 (CC-A) and 13 (CC-B).
 */
const BIT_CAPACITY: Record<"CC-A" | "CC-B", number[][]> = {
  "CC-A": [
    [167, 138, 118, 108, 88, 78, 59],
    [167, 138, 118, 98, 78],
    [197, 167, 138, 108, 78],
  ],
  "CC-B": [
    [336, 296, 256, 208, 160, 104, 56],
    [768, 648, 536, 416, 304, 208, 152, 112, 72, 32],
    [1184, 1016, 840, 672, 496, 352, 264, 208, 152, 96, 56],
  ],
}

/** CC-A MicroPDF417 symbol metrics: [columns, rows, ecCW, rapl, rapc, rapr]. */
// prettier-ignore
const CCA_METRICS: [number, number, number, number, number, number][] = [
  [2,  5, 4, 39,  0, 19],
  [2,  6, 4,  1,  0, 33],
  [2,  7, 5, 32,  0, 12],
  [2,  8, 5,  8,  0, 40],
  [2,  9, 6, 14,  0, 46],
  [2, 10, 6, 43,  0, 23],
  [2, 12, 7, 20,  0, 52],
  [3,  4, 4, 11, 43, 23],
  [3,  5, 5,  1, 33, 13],
  [3,  6, 6,  5, 37, 17],
  [3,  7, 7, 15, 47, 27],
  [3,  8, 7, 21,  1, 33],
  [4,  3, 4, 40, 20, 52],
  [4,  4, 5, 43, 23,  3],
  [4,  5, 6, 46, 26,  6],
  [4,  6, 7, 34, 14, 46],
  [4,  7, 8, 29,  9, 41],
]

/** Default 2D data columns per linear symbology (GS1 General Specifications). */
const LINEAR_COLUMNS: Record<CompositeLinearType, number> = {
  ean13: 4,
  ean8: 3,
  upca: 4,
  upce: 2,
  "gs1-128": 4,
  "databar-omni": 4,
  "databar-truncated": 4,
  "databar-limited": 3,
  "databar-stacked": 2,
  "databar-stacked-omni": 2,
  "databar-expanded": 4,
  "databar-expanded-stacked": 4,
}

/**
 * AI prefixes whose element length is predefined by the GS1 General
 * Specifications. Elements with those prefixes need no FNC1 separator.
 */
const PREDEFINED_LENGTH = new Set([
  "00",
  "01",
  "02",
  "03",
  "04",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "41",
])

/** Second characters of AI (90) that get the short four bit encoding. */
const AI90_ALPHA = "BDHIJKLNPQRSTVXZ"

// ─── Bit helpers ────────────────────────────────────────────────────────────

/** `count` bits of `val`, MSB first, appended to `bits`. */
function appendBits(bits: number[], val: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) bits.push((val >> i) & 1)
}

/** `count` bits of `val`, MSB first. */
function toBits(val: number, count: number): number[] {
  const out: number[] = []
  appendBits(out, val, count)
  return out
}

/** Value and bit width of one encoded general field character. */
interface CharBits {
  value: number
  bits: number
}

/** Numeric mode digit value of a character (10 = FNC1), or null. */
function numericValue(ch: number): number | null {
  if (ch === FNC1) return 10
  if (ch >= 48 && ch <= 57) return ch - 48
  return null
}

/** 7 bit numeric mode value for a character pair, or null when not encodable. */
function numericPair(a: number, b: number): number | null {
  const x = numericValue(a)
  const y = numericValue(b)
  if (x === null || y === null) return null
  const v = x * 11 + y
  return v > 119 ? null : v + 8
}

/** Alphanumeric mode encoding of a character, or null. */
function alphanumericBits(ch: number): CharBits | null {
  if (ch === FNC1) return { value: 15, bits: 5 }
  if (ch >= 48 && ch <= 57) return { value: ch - 43, bits: 5 }
  if (ch >= 65 && ch <= 90) return { value: ch - 33, bits: 6 }
  if (ch === 42) return { value: 58, bits: 6 } // '*'
  if (ch >= 44 && ch <= 47) return { value: ch + 15, bits: 6 } // ',' '-' '.' '/'
  return null
}

/** ISO 646 mode encoding of a character, or null. */
function iso646Bits(ch: number): CharBits | null {
  if (ch === FNC1) return { value: 15, bits: 5 }
  if (ch >= 48 && ch <= 57) return { value: ch - 43, bits: 5 }
  if (ch >= 65 && ch <= 90) return { value: ch - 1, bits: 7 }
  if (ch >= 97 && ch <= 122) return { value: ch - 7, bits: 7 }
  if (ch === 33 || ch === 34) return { value: ch + 199, bits: 8 } // '!' '"'
  if (ch >= 37 && ch <= 47) return { value: ch + 197, bits: 8 } // '%'..'/'
  if (ch >= 58 && ch <= 63) return { value: ch + 187, bits: 8 } // ':'..'?'
  if (ch === 95) return { value: 251, bits: 8 } // '_'
  if (ch === 32) return { value: 252, bits: 8 } // ' '
  return null
}

/** Alpha mode encoding used by the AI (90) encodation method, or null. */
function alphaBits(ch: number): CharBits | null {
  if (ch === FNC1) return { value: 31, bits: 5 }
  if (ch >= 65 && ch <= 90) return { value: ch - 65, bits: 5 }
  if (ch >= 48 && ch <= 57) return { value: ch + 4, bits: 6 }
  return null
}

// ─── Symbol capacity ────────────────────────────────────────────────────────

/** Everything the capacity calculation may change while the data is encoded. */
interface CompositeState {
  version: CompositeType
  columns: number
  /** CC-C is only reachable behind a GS1-128 of a known width. */
  linearWidth: number
  /** Error correction codewords chosen for CC-C. */
  ecCodewords: number
}

/** Bits left to the next symbol size that holds `used` bits, or -1. */
function capacityRemainder(state: CompositeState, used: number): number {
  if (state.version !== "CC-C") {
    const caps = BIT_CAPACITY[state.version][state.columns - 2]
    if (!caps) return -1
    let best = -1
    for (const cap of caps) {
      if (cap >= used) best = cap
    }
    return best === -1 ? -1 : best - used
  }

  if (used > 8304) return -1

  let codewords = Math.ceil(used / 8)
  codewords = Math.floor(codewords / 6) * 5 + (codewords % 6)

  let ec: number
  if (codewords <= 40) ec = 8
  else if (codewords <= 160) ec = 16
  else if (codewords <= 320) ec = 32
  else if (codewords <= 833) ec = 64
  else ec = 32

  const total = codewords + ec + 3
  let columns = Math.min(state.columns, 30)
  while (Math.ceil(total / columns) > 30 && columns < 30) columns++
  const rows = Math.max(3, Math.ceil(total / columns))

  state.ecCodewords = ec
  state.columns = columns

  const slots = columns * rows - ec - 3
  return (Math.floor(slots / 5) * 6 + (slots % 5)) * 8 - used
}

/**
 * CC-C data columns for a GS1-128 `linearWidth` modules wide.
 *
 * CC-C sits over a GS1-128 and matches its width: 68 modules is the narrowest
 * linear component that can carry one, and every further column needs the 17
 * modules one PDF417 codeword takes.
 */
function ccCColumns(linearWidth: number): number {
  if (linearWidth < 68) {
    throw new CapacityError(
      "GS1 Composite: CC-C needs a GS1-128 linear component at least 68 modules wide",
    )
  }
  return Math.max(1, Math.floor((linearWidth - 52) / 17))
}

/**
 * Bits left over once the symbol is rounded up to the next valid size,
 * upgrading the composite version when the data no longer fits.
 */
function remainingBits(state: CompositeState, used: number): number {
  for (;;) {
    const remainder = capacityRemainder(state, used)
    if (remainder >= 0) return remainder
    if (state.version === "CC-A") {
      state.version = "CC-B"
      continue
    }
    if (state.version === "CC-B" && state.linearWidth >= 68) {
      state.version = "CC-C"
      state.columns = ccCColumns(state.linearWidth)
      continue
    }
    return -1
  }
}

// ─── Encodation ─────────────────────────────────────────────────────────────

/** One GS1 element: an AI, its value, and whether an FNC1 must follow it. */
interface CompositeField {
  ai: string
  value: string
  variable: boolean
}

type Mode = "numeric" | "alphanumeric" | "iso646" | "alpha"

/** The compressed data field, the general purpose field and the start mode. */
interface Encodation {
  cdf: number[]
  gpf: number[]
  mode: Mode
}

/** Character codes of a string. */
function chars(text: string): number[] {
  const out: number[] = []
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i))
  return out
}

function isUpper(ch: string | undefined): boolean {
  return ch !== undefined && ch >= "A" && ch <= "Z"
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= "0" && ch <= "9"
}

/**
 * Number of leading digits of an AI (90) value that the compressed data field
 * can absorb, or -1 when the AI (90) encodation method does not apply.
 */
function ai90Prefix(value: string): number {
  if (isUpper(value[0])) return 0
  if (value[0] !== undefined && value[0] >= "1" && value[0] <= "9") {
    if (isUpper(value[1])) return 1
    if (isDigit(value[1]) && isUpper(value[2])) return 2
    if (isDigit(value[1]) && isDigit(value[2]) && isUpper(value[3])) return 3
  }
  return -1
}

/** Encodation method 10: a (11)/(17) date, optionally followed by a (10) lot. */
function encodeDateMethod(fields: CompositeField[]): Encodation {
  const cdf: number[] = [1, 0]
  const first = fields[0]!

  if ((first.ai === "11" || first.ai === "17") && /^\d{6}/.test(first.value)) {
    const value = first.value
    const date =
      Number.parseInt(value.slice(0, 2), 10) * 384 +
      (Number.parseInt(value.slice(2, 4), 10) - 1) * 32 +
      Number.parseInt(value.slice(4, 6), 10)
    cdf.push(...toBits(date, 16), first.ai === "11" ? 0 : 1)
    fields.shift()
  } else {
    cdf.push(1, 1)
  }

  let gpf: number[] = []
  if (fields.length === 0) {
    cdf.push(0, 0, 0, 0, 0, 1, 1, 1, 1)
  } else if (fields[0]!.ai === "10") {
    gpf = chars(fields[0]!.value)
    if (fields.length > 1) gpf.push(FNC1)
    fields.shift()
  } else {
    gpf = [FNC1]
  }

  return { cdf, gpf, mode: "numeric" }
}

/** Encodation method 11: an AI (90) element, optionally with a (21) or (8004). */
function encodeAI90Method(fields: CompositeField[], prefixDigits: number): Encodation {
  const cdf: number[] = [1, 1]
  const value = fields[0]!.value
  const rest = prefixDigits + 1 === value.length ? "" : value.slice(prefixDigits + 1)

  let alphaCount = 0
  let digitCount = 0
  for (const ch of rest) {
    if (ch >= "A" && ch <= "Z") alphaCount++
    else if (ch >= "0" && ch <= "9") digitCount++
  }

  let mode: Mode
  if (alphaCount > digitCount) mode = "alpha"
  else if (alphaCount === 0) mode = "numeric"
  else mode = "alphanumeric"
  if (alphaCount + digitCount !== rest.length) mode = "alphanumeric"

  if (mode === "alphanumeric") cdf.push(0)
  else if (mode === "numeric") cdf.push(1, 0)
  else cdf.push(1, 1)

  const nextAI = fields[1]?.ai
  const nextValue = fields[1]?.value ?? ""
  if (nextAI === "21") cdf.push(1, 0)
  else if (nextAI === "8004") cdf.push(1, 1)
  else cdf.push(0)

  const numeric = prefixDigits === 0 ? 0 : Number.parseInt(value.slice(0, prefixDigits), 10)
  const alphaIndex = AI90_ALPHA.indexOf(value[prefixDigits]!)
  if (numeric < 31 && alphaIndex !== -1) {
    cdf.push(...toBits(numeric, 5), ...toBits(alphaIndex, 4))
  } else {
    cdf.push(
      1,
      1,
      1,
      1,
      1,
      ...toBits(numeric, 10),
      ...toBits(value.charCodeAt(prefixDigits) - 65, 5),
    )
  }

  const tail = [...chars(rest), ...(fields.length > 1 ? [FNC1] : [])]
  let gpf: number[] = []
  if (mode === "alpha") {
    for (const ch of tail) {
      const encoded = alphaBits(ch)
      if (encoded === null) {
        throw new InvalidInputError(
          `GS1 Composite: character '${String.fromCharCode(ch)}' is not encodable in alpha mode`,
        )
      }
      appendBits(cdf, encoded.value, encoded.bits)
    }
    if (fields.length > 1) mode = "numeric"
  } else {
    gpf = tail
  }

  fields.shift()
  if (fields.length > 0 && (nextAI === "21" || nextAI === "8004")) {
    gpf.push(...chars(nextValue))
    fields.shift()
    if (fields.length > 0) gpf.push(FNC1)
  }

  return { cdf, gpf, mode }
}

/** Pick the encodation method and build the compressed data field. */
function selectEncodation(fields: CompositeField[]): Encodation {
  const ai = fields[0]!.ai
  if (ai === "10" || ai === "11" || ai === "17") return encodeDateMethod(fields)
  if (ai === "90") {
    const prefixDigits = ai90Prefix(fields[0]!.value)
    if (prefixDigits !== -1) return encodeAI90Method(fields, prefixDigits)
  }
  return { cdf: [0], gpf: [], mode: "numeric" }
}

/** Append the AI and value of every remaining field to the general field. */
function appendFields(gpf: number[], fields: CompositeField[]): void {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!
    gpf.push(...chars(field.ai), ...chars(field.value))
    if (i !== fields.length - 1 && field.variable) gpf.push(FNC1)
  }
}

/**
 * Encode the general purpose field, switching between numeric, alphanumeric and
 * ISO 646 compaction (ISO/IEC 24723 5.2.2).
 *
 * @param gpf - Characters to encode; `FNC1` marks a separator
 * @param prefixBits - Bits already used by the compressed data field
 */
function encodeGeneralField(
  gpf: number[],
  prefixBits: number,
  state: CompositeState,
  startMode: Mode,
): { bits: number[]; mode: Mode } {
  const n = gpf.length

  // Look-ahead tables: how far the run of characters encodable in each mode
  // reaches, and how far away the next ISO 646-only character is.
  const numericRuns = Array.from<number>({ length: n + 2 }).fill(0)
  numericRuns[n + 1] = -1
  const alphanumericRuns = Array.from<number>({ length: n + 1 }).fill(0)
  const nextISO646Only = Array.from<number>({ length: n + 1 }).fill(0)
  nextISO646Only[n] = 9999

  for (let i = n - 1; i >= 0; i--) {
    const ch = gpf[i]!
    const next = i < n - 1 ? gpf[i + 1]! : 48
    numericRuns[i] = numericPair(ch, next) === null ? 0 : numericRuns[i + 2]! + 2
    const alpha = alphanumericBits(ch) !== null
    alphanumericRuns[i] = alpha ? alphanumericRuns[i + 1]! + 1 : 0
    nextISO646Only[i] = !alpha && iso646Bits(ch) !== null ? 0 : nextISO646Only[i + 1]! + 1
  }

  const bits: number[] = []
  let mode = startMode
  let i = 0

  while (i < n) {
    const ch = gpf[i]!

    if (mode === "numeric") {
      if (i <= n - 2) {
        const pair = numericPair(ch, gpf[i + 1]!)
        if (pair === null) {
          appendBits(bits, 0, 4) // latch to alphanumeric
          mode = "alphanumeric"
        } else {
          appendBits(bits, pair, 7)
          i += 2
        }
        continue
      }
      if (ch < 48 || ch > 57) {
        appendBits(bits, 0, 4) // latch to alphanumeric
        mode = "alphanumeric"
        continue
      }
      // A single trailing digit fits in four bits when the symbol has 4 to 6
      // bits of padding left; otherwise it is paired with an FNC1.
      const rem = remainingBits(state, prefixBits + bits.length)
      if (rem >= 4 && rem <= 6) {
        appendBits(bits, ch - 47, 4)
        for (let k = 4; k < rem; k++) bits.push(0)
      } else {
        appendBits(bits, numericPair(ch, FNC1)!, 7)
      }
      i++
      continue
    }

    if (mode === "alphanumeric") {
      if (ch === FNC1) {
        appendBits(bits, 15, 5)
        mode = "numeric"
        i++
        continue
      }
      if (alphanumericBits(ch) === null) {
        if (iso646Bits(ch) === null) {
          throw new InvalidInputError(
            `GS1 Composite: character '${String.fromCharCode(ch)}' is not encodable`,
          )
        }
        appendBits(bits, 4, 5) // latch to ISO 646
        mode = "iso646"
        continue
      }
      const run = numericRuns[i]!
      if (run >= 6 || (run >= 4 && run + i === n)) {
        appendBits(bits, 0, 3) // latch to numeric
        mode = "numeric"
        continue
      }
      const alpha = alphanumericBits(ch)!
      appendBits(bits, alpha.value, alpha.bits)
      i++
      continue
    }

    if (ch === FNC1) {
      appendBits(bits, 15, 5)
      mode = "numeric"
      i++
      continue
    }
    if (numericRuns[i]! >= 4 && nextISO646Only[i]! >= 10) {
      appendBits(bits, 0, 3) // latch to numeric
      mode = "numeric"
      continue
    }
    if (alphanumericRuns[i]! >= 5 && nextISO646Only[i]! >= 10) {
      appendBits(bits, 4, 5) // latch to alphanumeric
      mode = "alphanumeric"
      continue
    }
    const iso = iso646Bits(ch)
    if (iso === null) {
      throw new InvalidInputError(
        `GS1 Composite: character '${String.fromCharCode(ch)}' is not encodable`,
      )
    }
    appendBits(bits, iso.value, iso.bits)
    i++
  }

  return { bits, mode }
}

/** Parse the parenthesised element string into fields. */
function parseFields(data: string): CompositeField[] {
  if (!data.startsWith("(")) {
    throw new InvalidInputError(
      "GS1 Composite: data must be a parenthesised AI element string, e.g. (17)260101(10)BATCH01",
    )
  }
  return parseAIString(data).map((field) => ({
    ai: field.ai,
    value: field.data,
    variable: !PREDEFINED_LENGTH.has(field.ai.slice(0, 2)),
  }))
}

/** Build the complete bit string of the 2D component. */
function compositeBits(data: string, state: CompositeState): number[] {
  const fields = parseFields(data)
  const encodation = selectEncodation(fields)
  const gpf = encodation.gpf
  appendFields(gpf, fields)

  const encoded = encodeGeneralField(gpf, encodation.cdf.length, state, encodation.mode)
  const bits = [...encodation.cdf, ...encoded.bits]

  const padLength = remainingBits(state, bits.length)
  if (padLength < 0) {
    throw new CapacityError("GS1 Composite: data too large for the composite component")
  }

  if (padLength > 0) {
    let pad: number[] = []
    for (let i = 0; pad.length < padLength; i++) pad.push(FILL_PATTERN[i % 5]!)
    pad.length = padLength
    // Latch out of the mode the general field left off in before padding.
    if (encoded.mode === "numeric") pad = [0, 0, 0, 0, ...pad].slice(0, padLength)
    else if (encoded.mode === "alpha") pad = [1, 1, 1, 1, 1, 0, 0, 0, 0, ...pad].slice(0, padLength)
    bits.push(...pad)
  }

  return bits
}

// ─── Bits to codewords ──────────────────────────────────────────────────────

/** Powers of two as seven base-928 digits, most significant first. */
const PWR928: number[][] = (() => {
  const rows: number[][] = [[0, 0, 0, 0, 0, 0, 1]]
  for (let j = 1; j <= 68; j++) {
    const prev = rows[j - 1]!
    const current = Array.from<number>({ length: 7 }).fill(0)
    let v = 0
    for (let i = 6; i >= 1; i--) {
      v = prev[i]! * 2 + Math.floor(v / 928)
      current[i] = v % 928
    }
    current[0] = prev[0]! * 2 + Math.floor(v / 928)
    rows.push(current)
  }
  return rows
})()

/** CC-A: convert the bit string to codewords, 69 bits at a time. */
function ccaCodewords(bits: number[]): number[] {
  const codewords: number[] = []
  for (let b = 0; b < bits.length;) {
    const length = Math.min(69, bits.length - b)
    const count = Math.floor(length / 10) + 1
    const group = Array.from<number>({ length: count }).fill(0)
    for (let i = 0; i < length; i++) {
      if (bits[b + length - i - 1] !== 1) continue
      const power = PWR928[i]!
      for (let j = 0; j < count; j++) group[j] += power[j + 7 - count]!
    }
    for (let i = count - 1; i >= 1; i--) {
      group[i - 1] += Math.floor(group[i]! / 928)
      group[i] = group[i]! % 928
    }
    codewords.push(...group)
    b += length
  }
  return codewords
}

/** PDF417 byte compaction: six bytes become five base-900 codewords. */
function byteCompaction(bytes: number[]): number[] {
  const out: number[] = []
  const groups = Math.floor(bytes.length / 6) * 6
  for (let k = 0; k < groups; k += 6) {
    let value = 0n
    for (let i = 0; i < 6; i++) value = value * 256n + BigInt(bytes[k + i]!)
    const digits = Array.from<number>({ length: 5 }).fill(0)
    for (let i = 4; i >= 0; i--) {
      digits[i] = Number(value % 900n)
      value /= 900n
    }
    out.push(...digits)
  }
  for (let k = groups; k < bytes.length; k++) out.push(bytes[k]!)
  return out
}

/** CC-B / CC-C: pack the bit string into bytes and byte-compact it. */
function byteCodewords(bits: number[]): number[] {
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]!
    bytes.push(byte)
  }
  return [920, bytes.length % 6 === 0 ? 924 : 901, ...byteCompaction(bytes)]
}

// ─── Reed-Solomon over GF(929) ──────────────────────────────────────────────

/**
 * CC-A symbols use four to eight error correction codewords, below the range
 * the MicroPDF417 encoder keeps pre-computed coefficients for, so the generator
 * polynomial is derived here instead.
 */
const GF929 = 929

const RS_ALOG: number[] = (() => {
  const alog = [1]
  for (let i = 1; i <= 928; i++) alog.push((alog[i - 1]! * 3) % GF929)
  return alog
})()

const RS_LOG: number[] = (() => {
  const log = Array.from<number>({ length: GF929 }).fill(0)
  for (let i = 1; i <= 928; i++) log[RS_ALOG[i]!] = i
  return log
})()

function rsProduct(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return RS_ALOG[(RS_LOG[a]! + RS_LOG[b]!) % 928]!
}

/** Generator polynomial coefficients for `count` error correction codewords. */
function rsCoefficients(count: number): number[] {
  const coeffs = Array.from<number>({ length: count + 1 }).fill(0)
  coeffs[0] = 1
  for (let i = 1; i <= count; i++) {
    coeffs[i] = coeffs[i - 1]!
    const ai = RS_ALOG[i]!
    for (let j = i - 1; j >= 1; j--) {
      coeffs[j] = (rsProduct(coeffs[j]!, ai) + coeffs[j - 1]!) % GF929
    }
    coeffs[0] = rsProduct(coeffs[0]!, ai)
  }
  const out = coeffs.slice(0, count)
  for (let i = out.length - 1; i >= 0; i -= 2) out[i] = (GF929 - out[i]!) % GF929
  return out
}

/** Error correction codewords for `data`, using a linear feedback shift register. */
function rsEncode(data: number[], count: number): number[] {
  const coeffs = rsCoefficients(count)
  const lfsr = Array.from<number>({ length: count }).fill(0)
  for (const codeword of data) {
    const feedback = (codeword - lfsr[0]! + GF929) % GF929
    for (let j = 0; j < count - 1; j++) {
      lfsr[j] = (lfsr[j + 1]! + ((coeffs[count - 1 - j]! * feedback) % GF929)) % GF929
    }
    lfsr[count - 1] = (coeffs[0]! * feedback) % GF929
  }
  return lfsr
}

// ─── Symbol rendering ───────────────────────────────────────────────────────

/** Lay MicroPDF417 codewords out as module rows. */
function microMatrix(
  codewords: number[],
  metric: [number, number, number, number, number, number],
  cca: boolean,
): boolean[][] {
  const [columns, rows, , rapl, rapc, rapr] = metric
  const matrix: boolean[][] = []

  for (let i = 0; i < rows; i++) {
    const cluster = (((i + rapl - 1) % 3) + 3) % 3
    const row: boolean[] = []
    const codeword = (index: number): void => {
      row.push(...microPDF417CodewordModules(codewords[i * columns + index]!, cluster))
    }

    if (columns !== 3 || !cca) row.push(...microPDF417RAPModules(i + rapl - 1, false))
    if (columns === 1) {
      codeword(0)
    } else if (columns === 2) {
      codeword(0)
      codeword(1)
    } else if (columns === 3) {
      codeword(0)
      row.push(...microPDF417RAPModules(i + rapc - 1, true))
      codeword(1)
      codeword(2)
    } else {
      codeword(0)
      codeword(1)
      row.push(...microPDF417RAPModules(i + rapc - 1, true))
      codeword(2)
      codeword(3)
    }
    row.push(...microPDF417RAPModules(i + rapr - 1, false))
    row.push(true)

    matrix.push(row)
  }

  return matrix
}

/** Smallest metric with the requested column count that holds `count` codewords. */
function selectMetric(
  metrics: [number, number, number, number, number, number][],
  columns: number,
  count: number,
): [number, number, number, number, number, number] {
  for (const metric of metrics) {
    if (metric[0] !== columns) continue
    if (count <= metric[0] * metric[1] - metric[2]) return metric
  }
  throw new CapacityError(`GS1 Composite: ${count} codewords do not fit ${columns} columns`)
}

/**
 * ISO/IEC 15438 stop pattern, 18 modules wide.
 *
 * `pdf417/tables.ts` exports a 16 module `STOP_PATTERN` whose third bar is one
 * module instead of three, so the composite component carries its own copy.
 */
const PDF417_STOP = [7, 1, 1, 3, 1, 1, 1, 2, 1]

/** Lay PDF417 codewords out as module rows (CC-C). */
function pdf417Matrix(
  codewords: number[],
  rows: number,
  columns: number,
  ecLevel: number,
): boolean[][] {
  const width = 17 + 17 + columns * 17 + 17 + 18
  const matrix: boolean[][] = []

  for (let row = 0; row < rows; row++) {
    const cluster = getRowCluster(row)
    const group = Math.floor(row / 3)
    const remainder = row % 3
    const rowsInfo = Math.floor((rows - 1) / 3)
    const ecInfo = ecLevel * 3 + ((rows - 1) % 3)
    const colsInfo = columns - 1
    const left = group * 30 + (remainder === 0 ? rowsInfo : remainder === 1 ? ecInfo : colsInfo)
    const right = group * 30 + (remainder === 0 ? colsInfo : remainder === 1 ? rowsInfo : ecInfo)

    const modules: boolean[] = []
    const write = (pattern: readonly number[]): void => {
      for (let i = 0; i < pattern.length; i++) {
        for (let w = 0; w < pattern[i]!; w++) modules.push(i % 2 === 0)
      }
    }

    write(START_PATTERN)
    write(getCodewordPattern(left, cluster))
    for (let col = 0; col < columns; col++) {
      write(getCodewordPattern(codewords[row * columns + col] ?? 900, cluster))
    }
    write(getCodewordPattern(right, cluster))
    write(PDF417_STOP)
    modules.length = width
    matrix.push(modules.map((m) => m === true))
  }

  return matrix
}

// ─── Public API: 2D component ───────────────────────────────────────────────

/**
 * Encode the 2D component of a GS1 Composite symbol (ISO/IEC 24723).
 *
 * @param data - GS1 AI element string in parenthesised format
 * @param options - Composite version, column count and linear symbology, or
 *   just the version as a string
 * @returns The 2D component matrix and the version actually used
 *
 * @example
 * ```ts
 * encodeGS1Composite("(17)260101(10)BATCH01", { type: "CC-A", columns: 4 })
 * ```
 */
export function encodeGS1Composite(
  data: string,
  options: CompositeType | GS1CompositeOptions = {},
): GS1CompositeResult {
  if (data.length === 0) {
    throw new InvalidInputError("GS1 Composite: data must not be empty")
  }

  const resolved: GS1CompositeOptions = typeof options === "string" ? { type: options } : options
  const requested = resolved.type ?? "CC-A"
  if (requested !== "CC-A" && requested !== "CC-B" && requested !== "CC-C") {
    throw new InvalidInputError(`Invalid composite type: ${String(requested)}`)
  }

  if (requested === "CC-C" && resolved.linear && resolved.linear !== "gs1-128") {
    throw new InvalidInputError("GS1 Composite: only a GS1-128 primary can carry a CC-C component")
  }

  const linearWidth = resolved.linearWidth ?? -1
  const defaultColumns =
    resolved.columns ??
    (requested === "CC-C" && resolved.linear === "gs1-128"
      ? ccCColumns(linearWidth)
      : resolved.linear
        ? LINEAR_COLUMNS[resolved.linear]
        : 2)

  const state: CompositeState = {
    version: requested,
    columns: defaultColumns,
    linearWidth,
    ecCodewords: 0,
  }

  if (state.version !== "CC-C" && (state.columns < 2 || state.columns > 4)) {
    throw new InvalidInputError("GS1 Composite: CC-A and CC-B require 2 to 4 columns")
  }
  if (state.version === "CC-C" && (state.columns < 1 || state.columns > 30)) {
    throw new InvalidInputError("GS1 Composite: CC-C requires 1 to 30 columns")
  }

  const bits = compositeBits(data, state)

  if (state.version === "CC-A") {
    const codewords = ccaCodewords(bits)
    const metric = selectMetric(CCA_METRICS, state.columns, codewords.length)
    const ec = rsEncode(codewords, metric[2])
    const matrix = microMatrix([...codewords, ...ec], metric, true)
    return result(matrix, state)
  }

  if (state.version === "CC-B") {
    const codewords = byteCodewords(bits)
    const metric = selectMetric(MICROPDF417_METRICS, state.columns, codewords.length)
    const capacity = metric[0] * metric[1] - metric[2]
    while (codewords.length < capacity) codewords.push(900)
    const ec = rsEncode(codewords, metric[2])
    const matrix = microMatrix([...codewords, ...ec], metric, false)
    return result(matrix, state)
  }

  const codewords = byteCodewords(bits)
  const ecLevel = Math.round(Math.log2(state.ecCodewords)) - 1
  const data417 = [1 + codewords.length, ...codewords]
  const rows = Math.max(3, Math.ceil((data417.length + state.ecCodewords) / state.columns))
  while (data417.length < rows * state.columns - state.ecCodewords) data417.push(900)
  data417[0] = data417.length
  const ec = generateECCodewords(data417, ecLevel)
  const matrix = pdf417Matrix([...data417, ...ec], rows, state.columns, ecLevel)
  return result(matrix, state)
}

function result(matrix: boolean[][], state: CompositeState): GS1CompositeResult {
  return {
    composite: matrix,
    type: state.version,
    rows: matrix.length,
    cols: matrix[0]?.length ?? 0,
    columns: state.columns,
  }
}

// ─── Public API: complete symbol ────────────────────────────────────────────

/** Total width in modules of a bar/space width sequence. */
function sum(widths: number[]): number {
  let total = 0
  for (const width of widths) total += width
  return total
}

/** Bar/space widths, bar first, expanded to modules. */
function barsToModules(bars: number[]): boolean[] {
  const modules: boolean[] = []
  for (let i = 0; i < bars.length; i++) {
    for (let w = 0; w < bars[i]!; w++) modules.push(i % 2 === 0)
  }
  return modules
}

/** EAN/UPC separator: two module marks under the outer guard bars. */
function guardSeparator(linearModules: number): boolean[][] {
  const middle = linearModules - 2
  const a = [false, true, ...Array.from<boolean>({ length: middle }).fill(false), true, false]
  const b = [true, false, ...Array.from<boolean>({ length: middle }).fill(false), false, true]
  return [a, b, a]
}

/** Finder pattern of a DataBar value-3 finder, and the separator it gets. */
const DATABAR_F3_PATTERN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1]
const DATABAR_F3_SEPARATOR = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]

/**
 * DataBar separator: the complement of the linear row, with the four modules at
 * each end cleared and the runs over the finder patterns forced to alternate
 * (ISO/IEC 24724 7.2.7).
 *
 * @param bottom - Linear modules including the one module leading guard space
 * @param finders - Module positions the finder patterns start at
 * @param shiftF3 - Apply the special separator under a value-3 finder
 */
function databarSeparator(bottom: number[], finders: number[], shiftF3: boolean): boolean[] {
  const separator = bottom.map((m) => 1 - m)
  for (let i = 0; i < 4; i++) {
    separator[i] = 0
    separator[separator.length - 1 - i] = 0
  }

  for (const start of finders) {
    for (let i = start; i <= start + 12; i++) {
      if (bottom[i] !== 0) {
        separator[i] = 0
      } else if (bottom[i - 1] === 1) {
        separator[i] = 1
      } else {
        separator[i] = separator[i - 1] === 0 ? 1 : 0
      }
    }
    if (shiftF3 && DATABAR_F3_PATTERN.every((m, i) => bottom[start + i] === m)) {
      for (let i = 0; i < DATABAR_F3_SEPARATOR.length; i++) {
        separator[start + i] = DATABAR_F3_SEPARATOR[i]!
      }
    }
  }

  return separator.map((m) => m === 1)
}

/** Pad a module row on the left and right. */
function padRow(row: boolean[], left: number, right: number): boolean[] {
  return [
    ...Array.from<boolean>({ length: left }).fill(false),
    ...row,
    ...Array.from<boolean>({ length: right }).fill(false),
  ]
}

/** The GTIN of a DataBar primary component, with or without its AI. */
function stripGTINPrefix(data: string): string {
  return data.startsWith("(01)") ? data.slice(4) : data
}

/** Rows of a stacked linear component, or null when the primary is one row. */
function encodeStackedLinear(linearType: CompositeLinearType, data: string): StackedRows | null {
  switch (linearType) {
    case "databar-stacked":
      return gs1DataBarStackedRows(stripGTINPrefix(data), { linkage: true })
    case "databar-stacked-omni":
      return gs1DataBarStackedOmniRows(stripGTINPrefix(data), { linkage: true })
    case "databar-expanded-stacked":
      return gs1DataBarExpandedStackedRows(data, { linkage: true })
    default:
      return null
  }
}

/** Bar widths and rendered height of the linear component. */
function encodeLinear(
  linearType: CompositeLinearType,
  data: string,
  type: CompositeType,
): { bars: number[]; height: number } {
  switch (linearType) {
    case "gs1-128":
      return { bars: encodeGS1128(data, { linkage: type === "CC-C" ? "C" : "A" }), height: 32 }
    case "ean13":
      return { bars: encodeEAN13(data).bars, height: 74 }
    case "ean8":
      return { bars: encodeEAN8(data).bars, height: 64 }
    case "upca":
      return { bars: encodeUPCA(data).bars, height: 74 }
    case "upce":
      return { bars: encodeUPCE(data).bars, height: 74 }
    case "databar-omni":
      return { bars: encodeGS1DataBarOmni(stripGTINPrefix(data), { linkage: true }), height: 33 }
    case "databar-truncated":
      return {
        bars: encodeGS1DataBarTruncated(stripGTINPrefix(data), { linkage: true }),
        height: 13,
      }
    case "databar-limited":
      return { bars: encodeGS1DataBarLimited(stripGTINPrefix(data), { linkage: true }), height: 10 }
    case "databar-expanded":
      return { bars: encodeGS1DataBarExpanded(data, { linkage: true }), height: 34 }
    default:
      throw new InvalidInputError(`GS1 Composite: unsupported linear type '${String(linearType)}'`)
  }
}

/** Finder pattern positions of a DataBar Expanded row, 98 modules apart. */
function expandedFinders(length: number): number[] {
  const finders: number[] = []
  for (let i = 19; i <= length - 13; i += 98) finders.push(i)
  for (let i = 70; i <= length - 13; i += 98) finders.push(i)
  return finders
}

/**
 * Encode a complete GS1 Composite symbol: the linear component with its linkage
 * flag set, the separator pattern and the 2D composite component.
 *
 * @param linearType - Symbology of the linear (primary) component
 * @param data - `"<linear data>|<composite data>"`, both as AI element strings
 * @param options - Composite version and column overrides
 *
 * @example
 * ```ts
 * encodeGS1CompositeSymbol("databar-omni", "(01)09521234543213|(11)990102")
 * ```
 */
export function encodeGS1CompositeSymbol(
  linearType: CompositeLinearType,
  data: string,
  options: GS1CompositeOptions = {},
): GS1CompositeSymbolResult {
  const split = data.indexOf("|")
  if (split === -1) {
    throw new InvalidInputError(
      "GS1 Composite: the linear and composite data must be separated by '|'",
    )
  }
  const linearData = data.slice(0, split)
  const compositeData = data.slice(split + 1)
  if (linearData.length === 0 || compositeData.length === 0) {
    throw new InvalidInputError("GS1 Composite: both components must carry data")
  }

  // A GS1-128 is the only linear component whose width the 2D component has to
  // match, and the linkage flag it carries depends on the version the data ends
  // up needing — so measure it first, then encode it again once that is known.
  const linearWidth =
    linearType === "gs1-128" ? sum(encodeGS1128(linearData, { linkage: "A" })) : -1
  const encoded = encodeGS1Composite(compositeData, { ...options, linear: linearType, linearWidth })
  const stacked = encodeStackedLinear(linearType, linearData)
  const { bars, height } = stacked
    ? { bars: [], height: sum(stacked.heights) }
    : encodeLinear(linearType, linearData, encoded.type)
  const linearRows: boolean[][] = stacked
    ? stacked.rows.map((row) => row.map((m) => m === 1))
    : [barsToModules(bars)]
  const linearHeights = stacked ? stacked.heights : [height]

  // The separator is drawn against the row of the linear component it touches,
  // which is the top row of a stacked one.
  const linearModules = linearRows[0]!
  const linearWidthModules = linearModules.length

  const composite = encoded.composite
  const compositeWidth = encoded.cols

  let separator: boolean[][]
  let separatorOffset: number
  let linearOffset: number
  let width: number
  let compositeOffset = 0

  if (stacked) {
    // A stacked primary already carries its leading guard space, so the
    // separator runs against its top row directly.
    const top = stacked.rows[0]!
    const expandedStacked = linearType === "databar-expanded-stacked"
    const finders = expandedStacked ? expandedFinders(top.length) : [18]
    const row = databarSeparator(top, finders, !expandedStacked)

    if (expandedStacked) {
      // The 2D component is centred over an Expanded Stacked primary.
      width = top.length
      compositeOffset = Math.ceil((width - compositeWidth) / 2)
    } else {
      // A stacked Omnidirectional primary is narrower than its 2D component,
      // which overhangs it to the right by one module.
      width = compositeWidth + 1
      compositeOffset = 1
    }
    separatorOffset = 0
    linearOffset = 0
    separator = [padRow(row, 0, Math.max(0, width - row.length))]
  } else if (linearType === "databar-limited") {
    // DataBar Limited has no finder pattern along its top edge, so its
    // separator is a plain complement of the linear row; the three modules at
    // the left and the nine at the right stay light (ISO/IEC 24723 5.3.3). The
    // 2D component sits six modules in from the right hand end.
    const bottom = [0, ...linearModules.map((m) => (m ? 1 : 0))]
    const row = bottom.map((m) => m === 0)
    row.fill(false, 0, 3)
    row.fill(false, row.length - 9)

    width = Math.max(compositeWidth + 6, bottom.length)
    compositeOffset = width - 6 - compositeWidth
    separatorOffset = width - bottom.length
    linearOffset = separatorOffset + 1
    separator = [padRow(row, separatorOffset, 0)]
  } else if (linearType.startsWith("databar")) {
    // The DataBar separator is derived from the linear row itself, which starts
    // with a one module guard space that the bar widths do not carry.
    const bottom = [0, ...linearModules.map((m) => (m ? 1 : 0))]
    const finders = linearType === "databar-expanded" ? expandedFinders(bottom.length) : [19, 65]
    const row = databarSeparator(bottom, finders, linearType !== "databar-expanded")

    if (linearType === "databar-expanded") {
      width = bottom.length
      compositeOffset = 2
      separatorOffset = 0
      linearOffset = 1
    } else {
      width = compositeWidth + 1
      separatorOffset = 4
      linearOffset = 5
    }
    separator = [padRow(row, separatorOffset, Math.max(0, width - separatorOffset - row.length))]
  } else if (linearType === "gs1-128") {
    // The GS1-128 separator is the plain complement of the linear row. The 2D
    // component is right aligned on a symbol character boundary left of centre,
    // which keeps it clear of the human readable text; a CC-C is wider than the
    // linear component and overhangs it by seven modules instead.
    const characters = Math.floor((linearWidthModules - 2) / 11)
    const inset = Math.floor((characters - 9) / 2)
    const rightEdge = (characters - inset - 1) * 11 + 10 + (inset === 0 ? 2 : 0)
    const start = encoded.type === "CC-C" ? -7 : rightEdge - compositeWidth

    compositeOffset = Math.max(0, start)
    linearOffset = Math.max(0, -start)
    separatorOffset = linearOffset
    width = Math.max(compositeOffset + compositeWidth, linearOffset + linearWidthModules)
    separator = [
      padRow(
        linearModules.map((m) => !m),
        separatorOffset,
        Math.max(0, width - separatorOffset - linearWidthModules),
      ),
    ]
  } else {
    separatorOffset = Math.max(0, compositeWidth - (linearWidthModules + 2))
    linearOffset = separatorOffset + 1
    width = Math.max(compositeWidth, linearOffset + linearWidthModules)
    separator = guardSeparator(linearWidthModules).map((row) =>
      padRow(row, separatorOffset, Math.max(0, width - separatorOffset - row.length)),
    )
  }

  const pad = (row: boolean[], left: number): boolean[] =>
    padRow(row, left, Math.max(0, width - left - row.length))

  const matrix = [
    ...composite.map((row) => pad(row, compositeOffset)),
    ...separator,
    ...linearRows.map((row) => pad(row, linearOffset)),
  ]

  // CC-A and CC-B are MicroPDF417 rows, two modules high; CC-C is PDF417, three.
  const compositeRowHeight = encoded.type === "CC-C" ? 3 : 2
  const rowHeights = [
    ...composite.map(() => compositeRowHeight),
    ...separator.map(() => 1),
    ...linearHeights,
  ]

  return {
    linearType,
    type: encoded.type,
    matrix,
    rowHeights,
    cols: width,
    composite,
    separator,
    linear: bars,
    ...(stacked ? { linearRows } : {}),
    linearOffset,
    linearHeight: height,
  }
}
