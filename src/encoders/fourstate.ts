/**
 * 4-state barcode encoders
 * Shared engine for RM4SCC (Royal Mail), KIX (Dutch), and related postal formats
 *
 * 4-state barcodes use bars with 4 possible states:
 * - Tracker (T): short center bar
 * - Ascender (A): extends above center
 * - Descender (D): extends below center
 * - Full (F): extends both above and below
 */

import { InvalidInputError } from "../errors"

/** Bar state in a 4-state barcode */
export type FourState = "T" | "A" | "D" | "F"

// RM4SCC encoding derived from 6x6 row/col matrix per Royal Mail specification
// Characters 0-9, A-Z are assigned sequential indices 0-35 in a 6x6 grid.
// Each character's index → (row = floor(idx/6), col = idx%6).
// Row and col values (0-5) each encode as 2 bar states:
//   0=TT, 1=TA, 2=TF, 3=AT, 4=AF, 5=FT
// So each character = row_pair + col_pair = 4 bars total.
const ROW_COL_BARS: FourState[][] = [
  ["T", "T"], // 0
  ["T", "A"], // 1
  ["T", "F"], // 2
  ["A", "T"], // 3
  ["A", "F"], // 4
  ["F", "T"], // 5
]

const RM4SCC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function rm4sccEncode(ch: string): FourState[] {
  const idx = RM4SCC_CHARS.indexOf(ch)
  if (idx === -1) throw new InvalidInputError(`Invalid RM4SCC character: ${ch}`)
  const row = Math.floor(idx / 6)
  const col = idx % 6
  return [...ROW_COL_BARS[row]!, ...ROW_COL_BARS[col]!]
}

// Build lookup table for fast access
const RM4SCC_TABLE: Record<string, FourState[]> = {}
for (const ch of RM4SCC_CHARS) {
  RM4SCC_TABLE[ch] = rm4sccEncode(ch)
}

/** Calculate RM4SCC check digit (modulo 6 row+col system) */
function rm4sccCheckDigit(text: string): string {
  let rowSum = 0
  let colSum = 0
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  for (const ch of text.toUpperCase()) {
    const idx = chars.indexOf(ch)
    if (idx === -1) continue
    rowSum += Math.floor(idx / 6)
    colSum += idx % 6
  }
  const checkIdx = (rowSum % 6) * 6 + (colSum % 6)
  return chars[checkIdx]!
}

/**
 * Encode Royal Mail 4-State Customer Code (RM4SCC)
 * Used by Royal Mail for automated letter sorting
 *
 * @param text - Postcode + Delivery Point Suffix (alphanumeric, A-Z 0-9)
 * @returns Array of FourState values
 */
export function encodeRM4SCC(text: string): FourState[] {
  const upper = text.toUpperCase().replace(/\s/g, "")
  if (!/^[0-9A-Z]+$/.test(upper)) {
    throw new InvalidInputError("RM4SCC only accepts A-Z and 0-9")
  }

  const check = rm4sccCheckDigit(upper)
  const dataWithCheck = upper + check

  const bars: FourState[] = ["A"] // Start: ascender

  for (const ch of dataWithCheck) {
    const pattern = RM4SCC_TABLE[ch]
    if (!pattern) throw new InvalidInputError(`Invalid RM4SCC character: ${ch}`)
    bars.push(...pattern)
  }

  bars.push("F") // Stop: full bar

  return bars
}

/**
 * Encode KIX (Klant Index) barcode — Dutch PostNL
 * Same encoding as RM4SCC but without start/stop bars and no check digit
 *
 * @param text - 6 characters (postcode part)
 * @returns Array of FourState values
 */
export function encodeKIX(text: string): FourState[] {
  const upper = text.toUpperCase().replace(/\s/g, "")
  if (!/^[0-9A-Z]+$/.test(upper)) {
    throw new InvalidInputError("KIX only accepts A-Z and 0-9")
  }

  const bars: FourState[] = []

  for (const ch of upper) {
    const pattern = RM4SCC_TABLE[ch]
    if (!pattern) throw new InvalidInputError(`Invalid KIX character: ${ch}`)
    bars.push(...pattern)
  }

  return bars
}

// Australia Post 4-State barcode

// GF(4) arithmetic for Australia Post Reed-Solomon
// GF(4) = GF(2²) with irreducible polynomial x² + x + 1
// Elements: 0, 1, 2(=α), 3(=α+1=α²)
// Addition: XOR
// Multiplication table:
const GF4_MUL: number[][] = [
  [0, 0, 0, 0],
  [0, 1, 2, 3],
  [0, 2, 3, 1],
  [0, 3, 1, 2],
]

const BAR_TO_GF4: Record<FourState, number> = { T: 0, A: 1, D: 2, F: 3 }
const GF4_TO_BAR: FourState[] = ["T", "A", "D", "F"]

// Generator polynomial: g(x) = (x-1)(x-α)(x-α²)(x-α³)
// Since α³=1 in GF(4), this is (x+1)²(x+2)(x+3)
// = (x²+1)(x²+x+1) = x⁴+x³+x+1
// Coefficients [x⁴, x³, x², x¹, x⁰] = [1, 1, 0, 1, 1]
const AUSPOST_GEN = [1, 1, 0, 1, 1]

/** Compute 4 Reed-Solomon parity symbols over GF(4) for Australia Post */
function auspostReedSolomon(data: FourState[]): FourState[] {
  const n = AUSPOST_GEN.length - 1 // 4 parity symbols
  const remainder = [0, 0, 0, 0]

  for (const bar of data) {
    const feedback = BAR_TO_GF4[bar] ^ remainder[0]!
    for (let i = 0; i < n - 1; i++) {
      remainder[i] = remainder[i + 1]! ^ GF4_MUL[feedback]![AUSPOST_GEN[i + 1]!]!
    }
    remainder[n - 1] = GF4_MUL[feedback]![AUSPOST_GEN[n]!]!
  }

  return remainder.map((v) => GF4_TO_BAR[v]!) as FourState[]
}

const AUSPOST_N_TABLE: Record<string, FourState[]> = {
  "0": ["F", "F"],
  "1": ["A", "D"],
  "2": ["A", "F"],
  "3": ["A", "T"],
  "4": ["D", "A"],
  "5": ["D", "D"],
  "6": ["D", "F"],
  "7": ["D", "T"],
  "8": ["F", "A"],
  "9": ["F", "D"],
}

/**
 * Encode Australia Post 4-State barcode
 *
 * @param fcc - Format control code: "11", "59", "62"
 * @param dpid - 8-digit Delivery Point Identifier
 */
export function encodeAustraliaPost(fcc: string, dpid: string): FourState[] {
  if (!/^\d{2}$/.test(fcc)) {
    throw new InvalidInputError("Australia Post FCC must be 2 digits")
  }
  if (!/^\d{8}$/.test(dpid)) {
    throw new InvalidInputError("Australia Post DPID must be 8 digits")
  }

  const data = fcc + dpid
  const bars: FourState[] = ["F", "A"] // Start

  for (const ch of data) {
    bars.push(...AUSPOST_N_TABLE[ch]!)
  }

  // Reed-Solomon parity over GF(4)
  const dataBars = bars.slice(2) // exclude start bars
  const parity = auspostReedSolomon(dataBars)
  bars.push(...parity)
  bars.push("F", "A") // Stop

  return bars
}

// Japan Post 4-State barcode (Kasutama / JP4SCC)
// KASUT_SET defines the order of characters for bar pattern lookup in JAPAN_TABLE
// KASUT_SET: '1','2','3','4','5','6','7','8','9','0','-','a','b','c','d','e','f','g','h'
// CH_KASUT_SET defines the order for check digit calculation (mod 19)
// CH_KASUT_SET: '0','1','2','3','4','5','6','7','8','9','-','a','b','c','d','e','f','g','h'
const KASUT_SET = "1234567890-abcdefgh"
const CH_KASUT_SET = "0123456789-abcdefgh"

// JAPAN_TABLE[i] = bar pattern for KASUT_SET[i]
const JAPAN_TABLE: FourState[][] = [
  ["F", "F", "T"], // '1'
  ["F", "D", "A"], // '2'
  ["D", "F", "A"], // '3'
  ["F", "A", "D"], // '4'
  ["F", "T", "F"], // '5'
  ["D", "A", "F"], // '6'
  ["A", "F", "D"], // '7'
  ["A", "D", "F"], // '8'
  ["T", "F", "F"], // '9'
  ["F", "T", "T"], // '0'
  ["T", "F", "T"], // '-'
  ["D", "A", "T"], // 'a'
  ["D", "T", "A"], // 'b'
  ["A", "D", "T"], // 'c'
  ["T", "D", "A"], // 'd' (also used for padding)
  ["A", "T", "D"], // 'e'
  ["T", "A", "D"], // 'f'
  ["T", "T", "F"], // 'g'
  ["F", "F", "F"], // 'h'
]

// Build lookup from character to bar pattern
const JP_TABLE: Record<string, FourState[]> = {}
for (let i = 0; i < KASUT_SET.length; i++) {
  JP_TABLE[KASUT_SET[i]!] = JAPAN_TABLE[i]!
}

/**
 * Convert an input character to its intermediate representation for Japan Post.
 * Digits and hyphens pass through; letters A-Z are expanded to two-character
 * sequences using internal characters a-h.
 */
function jpExpandChar(c: string): string {
  if ((c >= "0" && c <= "9") || c === "-") return c
  const code = c.charCodeAt(0)
  if (code >= 65 && code <= 74) {
    // A-J → 'a' + digit
    return "a" + CH_KASUT_SET[code - 65]!
  }
  if (code >= 75 && code <= 84) {
    // K-T → 'b' + digit
    return "b" + CH_KASUT_SET[code - 75]!
  }
  if (code >= 85 && code <= 90) {
    // U-Z → 'c' + digit
    return "c" + CH_KASUT_SET[code - 85]!
  }
  throw new InvalidInputError(`Invalid Japan Post character: ${c}`)
}

/**
 * Encode Japan Post 4-State Customer barcode (JP4SCC / Kasutama)
 *
 * @param zipcode - 7-digit Japanese postal code
 * @param address - Optional address characters (digits, dash, A-Z; up to 13 chars)
 */
export function encodeJapanPost(zipcode: string, address?: string): FourState[] {
  const zip = zipcode.replace(/-/g, "")
  if (!/^\d{7}$/.test(zip)) {
    throw new InvalidInputError("Japan Post zipcode must be 7 digits")
  }

  // Build intermediate representation
  let inter = zip // zipcode is always digits
  if (address) {
    const clean = address.toUpperCase().replace(/\s/g, "")
    if (!/^[\dA-Z-]+$/.test(clean)) {
      throw new InvalidInputError("Japan Post address only accepts digits, dash, and A-Z")
    }
    for (const ch of clean) {
      inter += jpExpandChar(ch)
    }
  }

  // Pad to 20 characters with 'd' and truncate
  while (inter.length < 20) inter += "d"
  inter = inter.substring(0, 20)

  // Check digit: sum of CH_KASUT_SET positions, mod 19
  let sum = 0
  for (const ch of inter) {
    const pos = CH_KASUT_SET.indexOf(ch)
    if (pos === -1) throw new InvalidInputError(`Invalid Japan Post character: ${ch}`)
    sum += pos
  }
  let check = 19 - (sum % 19)
  if (check === 19) check = 0
  const checkChar = CH_KASUT_SET[check]!
  inter += checkChar

  const bars: FourState[] = ["F", "D"] // Start

  for (const ch of inter) {
    const pattern = JP_TABLE[ch]
    if (!pattern) throw new InvalidInputError(`Invalid Japan Post character: ${ch}`)
    bars.push(...pattern)
  }

  bars.push("D", "F") // Stop
  return bars
}
