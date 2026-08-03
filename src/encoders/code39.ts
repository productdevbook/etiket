/**
 * Code 39 and Code 39 Extended barcode encoder
 * Supports optional modulo-43 check digit
 */

import { InvalidInputError } from "../errors"

// Code 39 character set in index order:
// 0-9 = indices 0-9, A-Z = indices 10-35,
// - = 36, . = 37, (space) = 38, $ = 39, / = 40, + = 41, % = 42
const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%"

// Start/stop character (*)
const START_STOP_INDEX = 43

// Patterns: 9 elements per character (B S B S B S B S B)
// narrow = 1, wide = 3
const PATTERNS: readonly number[][] = [
  [1, 1, 1, 3, 3, 1, 3, 1, 1], // 0
  [3, 1, 1, 3, 1, 1, 1, 1, 3], // 1
  [1, 1, 3, 3, 1, 1, 1, 1, 3], // 2
  [3, 1, 3, 3, 1, 1, 1, 1, 1], // 3
  [1, 1, 1, 3, 3, 1, 1, 1, 3], // 4
  [3, 1, 1, 3, 3, 1, 1, 1, 1], // 5
  [1, 1, 3, 3, 3, 1, 1, 1, 1], // 6
  [1, 1, 1, 3, 1, 1, 3, 1, 3], // 7
  [3, 1, 1, 3, 1, 1, 3, 1, 1], // 8
  [1, 1, 3, 3, 1, 1, 3, 1, 1], // 9
  [3, 1, 1, 1, 1, 3, 1, 1, 3], // A (10)
  [1, 1, 3, 1, 1, 3, 1, 1, 3], // B (11)
  [3, 1, 3, 1, 1, 3, 1, 1, 1], // C (12)
  [1, 1, 1, 1, 3, 3, 1, 1, 3], // D (13)
  [3, 1, 1, 1, 3, 3, 1, 1, 1], // E (14)
  [1, 1, 3, 1, 3, 3, 1, 1, 1], // F (15)
  [1, 1, 1, 1, 1, 3, 3, 1, 3], // G (16)
  [3, 1, 1, 1, 1, 3, 3, 1, 1], // H (17)
  [1, 1, 3, 1, 1, 3, 3, 1, 1], // I (18)
  [1, 1, 1, 1, 3, 3, 3, 1, 1], // J (19)
  [3, 1, 1, 1, 1, 1, 1, 3, 3], // K (20)
  [1, 1, 3, 1, 1, 1, 1, 3, 3], // L (21)
  [3, 1, 3, 1, 1, 1, 1, 3, 1], // M (22)
  [1, 1, 1, 1, 3, 1, 1, 3, 3], // N (23)
  [3, 1, 1, 1, 3, 1, 1, 3, 1], // O (24)
  [1, 1, 3, 1, 3, 1, 1, 3, 1], // P (25)
  [1, 1, 1, 1, 1, 1, 3, 3, 3], // Q (26)
  [3, 1, 1, 1, 1, 1, 3, 3, 1], // R (27)
  [1, 1, 3, 1, 1, 1, 3, 3, 1], // S (28)
  [1, 1, 1, 1, 3, 1, 3, 3, 1], // T (29)
  [3, 3, 1, 1, 1, 1, 1, 1, 3], // U (30)
  [1, 3, 3, 1, 1, 1, 1, 1, 3], // V (31)
  [3, 3, 3, 1, 1, 1, 1, 1, 1], // W (32)
  [1, 3, 1, 1, 3, 1, 1, 1, 3], // X (33)
  [3, 3, 1, 1, 3, 1, 1, 1, 1], // Y (34)
  [1, 3, 3, 1, 3, 1, 1, 1, 1], // Z (35)
  [1, 3, 1, 1, 1, 1, 3, 1, 3], // - (36)
  [3, 3, 1, 1, 1, 1, 3, 1, 1], // . (37)
  [1, 3, 1, 1, 1, 1, 1, 3, 1], // (space) (38)
  [1, 3, 1, 3, 1, 3, 1, 1, 1], // $ (39)
  [1, 3, 1, 3, 1, 1, 1, 3, 1], // / (40)
  [1, 3, 1, 1, 1, 3, 1, 3, 1], // + (41)
  [1, 1, 1, 3, 1, 3, 1, 3, 1], // % (42)
  [1, 3, 1, 1, 3, 1, 3, 1, 1], // * (43, start/stop)
]

// Narrow inter-character gap
const GAP = 1

// Character index lookup for fast validation
const CHAR_INDEX = new Map<string, number>()
for (let i = 0; i < CHARSET.length; i++) {
  CHAR_INDEX.set(CHARSET[i]!, i)
}

/**
 * Code 39 Extended: full ASCII (0-127) mapped to Code 39 character pairs.
 * Each entry is the Code 39 string representation (1 or 2 characters).
 */
const EXTENDED_MAP: string[] = [
  // 0-31: control characters -> %<letter>
  "%U", // 0  NUL
  "$A", // 1  SOH
  "$B", // 2  STX
  "$C", // 3  ETX
  "$D", // 4  EOT
  "$E", // 5  ENQ
  "$F", // 6  ACK
  "$G", // 7  BEL
  "$H", // 8  BS
  "$I", // 9  HT
  "$J", // 10 LF
  "$K", // 11 VT
  "$L", // 12 FF
  "$M", // 13 CR
  "$N", // 14 SO
  "$O", // 15 SI
  "$P", // 16 DLE
  "$Q", // 17 DC1
  "$R", // 18 DC2
  "$S", // 19 DC3
  "$T", // 20 DC4
  "$U", // 21 NAK
  "$V", // 22 SYN
  "$W", // 23 ETB
  "$X", // 24 CAN
  "$Y", // 25 EM
  "$Z", // 26 SUB
  "%A", // 27 ESC
  "%B", // 28 FS
  "%C", // 29 GS
  "%D", // 30 RS
  "%E", // 31 US
  // 32: space (native)
  " ",
  // 33-47: special characters
  "/A", // 33 !
  "/B", // 34 "
  "/C", // 35 #
  "/D", // 36 $  (note: the literal $ maps to native, but ASCII 36 is $)
  "/E", // 37 %
  "/F", // 38 &
  "/G", // 39 '
  "/H", // 40 (
  "/I", // 41 )
  "/J", // 42 *
  "/K", // 43 +
  "/L", // 44 ,
  "-", // 45 - (native)
  ".", // 46 . (native)
  "/O", // 47 /
  // 48-57: digits 0-9 (native)
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  // 58-64: special characters
  "/Z", // 58 :
  "%F", // 59 ;
  "%G", // 60 <
  "%H", // 61 =
  "%I", // 62 >
  "%J", // 63 ?
  "%V", // 64 @
  // 65-90: A-Z (native)
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  // 91-95: special characters
  "%K", // 91 [
  "%L", // 92 backslash
  "%M", // 93 ]
  "%N", // 94 ^
  "%O", // 95 _
  // 96: backtick
  "%W", // 96 `
  // 97-122: a-z -> +<letter>
  "+A",
  "+B",
  "+C",
  "+D",
  "+E",
  "+F",
  "+G",
  "+H",
  "+I",
  "+J",
  "+K",
  "+L",
  "+M",
  "+N",
  "+O",
  "+P",
  "+Q",
  "+R",
  "+S",
  "+T",
  "+U",
  "+V",
  "+W",
  "+X",
  "+Y",
  "+Z",
  // 123-127: special characters
  "%P", // 123 {
  "%Q", // 124 |
  "%R", // 125 }
  "%S", // 126 ~
  "%T", // 127 DEL
]

/**
 * Append a character's pattern to the bars array
 */
function appendPattern(bars: number[], index: number): void {
  const pattern = PATTERNS[index]!
  for (const width of pattern) {
    bars.push(width)
  }
}

/**
 * Calculate modulo-43 check digit for given character indices
 */
function calculateCheckDigit(indices: number[]): number {
  let sum = 0
  for (const index of indices) {
    sum += index
  }
  return sum % 43
}

/**
 * Encode a Code 39 barcode
 *
 * @param text - Text to encode (valid Code 39 characters: 0-9, A-Z, -, ., space, $, /, +, %)
 * @param options - Encoding options
 * @param options.checkDigit - Include modulo-43 check digit (default: false)
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeCode39(text: string, options?: { checkDigit?: boolean }): number[] {
  const includeCheckDigit = options?.checkDigit ?? false

  if (text.length === 0) {
    throw new InvalidInputError("Code 39 input must not be empty")
  }

  if (text.includes("*")) {
    throw new InvalidInputError("Code 39 input must not contain the start/stop character (*)")
  }

  // Validate and collect character indices
  const indices: number[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    const index = CHAR_INDEX.get(ch)
    if (index === undefined) {
      throw new InvalidInputError(`Invalid Code 39 character: '${ch}' at position ${i}`)
    }
    indices.push(index)
  }

  // Optionally compute check digit
  if (includeCheckDigit) {
    indices.push(calculateCheckDigit(indices))
  }

  const bars: number[] = []

  // Start character (*)
  appendPattern(bars, START_STOP_INDEX)

  // Inter-character gap
  bars.push(GAP)

  // Data characters
  for (let i = 0; i < indices.length; i++) {
    appendPattern(bars, indices[i]!)
    bars.push(GAP) // inter-character gap (also before stop)
  }

  // Stop character (*)
  appendPattern(bars, START_STOP_INDEX)

  return bars
}

/**
 * Encode a Code 39 Extended barcode (full ASCII)
 *
 * @param text - Text to encode (ASCII characters 0-127)
 * @param options - Encoding options
 * @param options.checkDigit - Include modulo-43 check digit (default: false)
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeCode39Extended(text: string, options?: { checkDigit?: boolean }): number[] {
  if (text.length === 0) {
    throw new InvalidInputError("Code 39 Extended input must not be empty")
  }

  // Map each ASCII character to Code 39 character(s)
  let mapped = ""
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0 || code > 127) {
      throw new InvalidInputError(
        `Invalid Code 39 Extended character: '${text[i]}' (code ${code}) at position ${i} — only ASCII 0-127 supported`,
      )
    }
    mapped += EXTENDED_MAP[code]!
  }

  // Encode the mapped string as standard Code 39
  return encodeCode39(mapped, options)
}
