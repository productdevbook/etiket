/**
 * GS1 DataBar encoder (ISO/IEC 24724)
 * Formerly RSS (Reduced Space Symbology)
 *
 * Variants:
 * - Omnidirectional: 14-digit GTIN, omnidirectional scanning
 * - Limited: 14-digit GTIN starting with 0 or 1, smaller
 * - Expanded: variable-length AI data
 *
 * All encode a GTIN-14 with embedded check digit.
 *
 * The `dbar_combins` and `dbar_getWidths` algorithms are from ISO/IEC 24724 Annex B,
 * as implemented in the zint library (BSD-3-Clause).
 */

import { InvalidInputError } from "../errors"
import { parseAIString } from "./gs1-128"

// ─── Combinatorial Encoding Core ────────────────────────────────────────────

/**
 * Binomial coefficient C(n, r) = n! / ((n-r)! * r!)
 * ISO/IEC 24724 Annex B `combins()`
 */
function combins(n: number, r: number): number {
  let maxDenom: number
  let minDenom: number

  if (n - r > r) {
    minDenom = r
    maxDenom = n - r
  } else {
    minDenom = n - r
    maxDenom = r
  }

  let val = 1
  let j = 1
  for (let i = n; i > maxDenom; i--) {
    val *= i
    if (j <= minDenom) {
      val = Math.trunc(val / j)
      j++
    }
  }
  for (; j <= minDenom; j++) {
    val = Math.trunc(val / j)
  }
  return val
}

/**
 * Generate element widths for a given value using the combinatorial method.
 * ISO/IEC 24724 Annex B `getRSSwidths()`
 *
 * @param val - Value to encode
 * @param n - Number of modules
 * @param elements - Number of elements in set (4 for Omni/Expanded, 7 for Limited)
 * @param maxWidth - Maximum module width of an element
 * @param noNarrow - If true, skip patterns without a one-module-wide element
 * @returns Array of element widths
 */
function getWidths(
  val: number,
  n: number,
  elements: number,
  maxWidth: number,
  noNarrow: boolean,
): number[] {
  const widths: number[] = Array.from<number>({ length: elements })
  let narrowMask = 0

  for (let bar = 0; bar < elements - 1; bar++) {
    let elmWidth = 1
    narrowMask |= 1 << bar

    for (;;) {
      /* Get all combinations */
      let subVal = combins(n - elmWidth - 1, elements - bar - 2)

      /* Less combinations with no single-module element */
      if (noNarrow && !narrowMask && n - elmWidth - (elements - bar - 1) >= elements - bar - 1) {
        subVal -= combins(n - elmWidth - (elements - bar), elements - bar - 2)
      }

      /* Less combinations with elements > maxWidth */
      if (elements - bar - 1 > 1) {
        let lessVal = 0
        for (
          let mxwElement = n - elmWidth - (elements - bar - 2);
          mxwElement > maxWidth;
          mxwElement--
        ) {
          lessVal += combins(n - elmWidth - mxwElement - 1, elements - bar - 3)
        }
        subVal -= lessVal * (elements - 1 - bar)
      } else if (n - elmWidth > maxWidth) {
        subVal--
      }

      val -= subVal
      if (val < 0) {
        val += subVal
        n -= elmWidth
        widths[bar] = elmWidth
        break
      }
      elmWidth++
      narrowMask &= ~(1 << bar)
    }
  }
  widths[elements - 1] = n
  return widths
}

/**
 * Interleave odd and even element widths.
 * Calls getWidths for odd and even components, then interleaves them.
 */
function interleaveWidths(
  vOdd: number,
  vEven: number,
  nOdd: number,
  nEven: number,
  elements: number,
  maxWidth: number,
  noNarrow: boolean,
): number[] {
  const oddWidths = getWidths(vOdd, nOdd, elements, maxWidth, noNarrow)
  const evenWidths = getWidths(vEven, nEven, elements, 9 - maxWidth, !noNarrow)

  const result: number[] = Array.from<number>({ length: elements * 2 })
  for (let i = 0; i < elements; i++) {
    result[i << 1] = oddWidths[i]!
    result[(i << 1) + 1] = evenWidths[i]!
  }
  return result
}

// ─── GTIN Check Digit ──────────────────────────────────────────────────────

/** Calculate GTIN check digit (mod 10, weights 3,1 alternating from right) */
function gtinCheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    const weight = (digits.length - i) % 2 === 0 ? 1 : 3
    sum += Number.parseInt(digits[i]!, 10) * weight
  }
  return (10 - (sum % 10)) % 10
}

/** Parse and validate a GTIN string, returning 13-digit value (without check digit) */
function parseGTIN(gtin: string, variant: string): string {
  const digits = gtin.replace(/\s/g, "")
  if (!/^\d+$/.test(digits)) {
    throw new InvalidInputError(`GS1 DataBar ${variant}: GTIN must be numeric`)
  }

  if (digits.length === 13) {
    return digits
  }
  if (digits.length === 14) {
    // Verify check digit
    const expected = gtinCheckDigit(digits.slice(0, 13))
    if (Number.parseInt(digits[13]!, 10) !== expected) {
      throw new InvalidInputError(
        `GS1 DataBar ${variant}: Invalid check digit '${digits[13]}', expecting '${expected}'`,
      )
    }
    return digits.slice(0, 13)
  }
  throw new InvalidInputError(`GS1 DataBar ${variant} requires 13 or 14 digit GTIN`)
}

// ─── DataBar Omnidirectional ────────────────────────────────────────────────

// Tables 1 & 2: Group sum boundaries (outside: indices 0-4, inside: indices 5-8)
const OMN_G_SUM = [0, 161, 961, 2015, 2715, 0, 336, 1036, 1516]

// T_even (outside, indices 0-4) and T_odd (inside, indices 5-8)
const OMN_T_EVEN_ODD = [1, 10, 34, 70, 126, 4, 20, 48, 81]

// Modules per element: outside odd [0-4], inside odd [5-8],
// outside even [9-13], inside even [14-17]
const OMN_MODULES = [
  12,
  10,
  8,
  6,
  4, // Outside odd
  5,
  7,
  9,
  11, // Inside odd
  4,
  6,
  8,
  10,
  12, // Outside even (16 - outside odd)
  10,
  8,
  6,
  4, // Inside even (15 - inside odd)
]

// Widest element: outside+inside odd (even = 9 - odd)
const OMN_WIDEST = [8, 6, 4, 3, 1, 2, 4, 6, 8]

// Table 4: Finder patterns (9 patterns x 5 elements)
const OMN_FINDER_PATTERN = [
  [3, 8, 2, 1, 1],
  [3, 5, 5, 1, 1],
  [3, 3, 7, 1, 1],
  [3, 1, 9, 1, 1],
  [2, 7, 4, 1, 1],
  [2, 5, 6, 1, 1],
  [2, 3, 8, 1, 1],
  [1, 5, 7, 1, 1],
  [1, 3, 9, 1, 1],
]

// Table 5: Checksum weights (4 data chars x 8 element widths)
const OMN_CHECKSUM_WEIGHT = [
  [1, 3, 9, 27, 2, 6, 18, 54],
  [4, 12, 36, 29, 8, 24, 72, 58],
  [16, 48, 65, 37, 32, 17, 51, 74],
  [64, 34, 23, 69, 49, 68, 46, 59],
]

/** Determine group index for an Omnidirectional data character value */
function omnGroup(val: number, outside: boolean): number {
  const start = outside ? 0 : 5
  const end = outside ? 4 : 8
  for (let i = start; i < end; i++) {
    if (val < OMN_G_SUM[i + 1]!) {
      return i
    }
  }
  return end
}

/**
 * Encode GS1 DataBar Omnidirectional
 * Input: 13 or 14 digit GTIN
 *
 * @returns Array of bar widths (alternating bar/space), 46 elements totaling 96 modules
 */
export function encodeGS1DataBarOmni(gtin: string): number[] {
  const digits13 = parseGTIN(gtin, "Omnidirectional")

  // Convert 13-digit GTIN to numeric value (without check digit)
  let val = 0n
  for (let i = 0; i < 13; i++) {
    val = val * 10n + BigInt(digits13.charCodeAt(i) - 48)
  }

  // Split into left and right pair values
  const leftPair = Number(val / 4537077n)
  const rightPair = Number(val % 4537077n)

  // Split pairs into 4 data characters
  const dataCharacter = [
    Math.trunc(leftPair / 1597),
    leftPair % 1597,
    Math.trunc(rightPair / 1597),
    rightPair % 1597,
  ]

  // Encode each data character to 8 element widths
  const dataWidths: number[][] = []

  for (let i = 0; i < 4; i++) {
    // Characters 0,2 are "outside", characters 1,3 are "inside"
    const outside = !(i & 1)
    const group = omnGroup(dataCharacter[i]!, outside)
    const v = dataCharacter[i]! - OMN_G_SUM[group]!
    const vDiv = Math.trunc(v / OMN_T_EVEN_ODD[group]!)
    const vMod = v % OMN_T_EVEN_ODD[group]!

    // Outside: odd=vDiv, even=vMod; Inside: odd=vMod, even=vDiv
    const vOdd = outside ? vDiv : vMod
    const vEven = outside ? vMod : vDiv

    dataWidths.push(
      interleaveWidths(
        vOdd,
        vEven,
        OMN_MODULES[group]!,
        OMN_MODULES[group + 9]!,
        4,
        OMN_WIDEST[group]!,
        !outside ? true : false,
      ),
    )
  }

  // Calculate checksum
  let checksum = 0
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 8; j++) {
      checksum += OMN_CHECKSUM_WEIGHT[i]![j]! * dataWidths[i]![j]!
    }
  }
  checksum %= 79

  // Adjust checksum to skip values 8 and 72
  if (checksum >= 8) checksum++
  if (checksum >= 72) checksum++

  const cLeft = Math.trunc(checksum / 9)
  const cRight = checksum % 9

  // Assemble 46-element total width array
  const total: number[] = Array.from<number>({ length: 46 })

  // Guards
  total[0] = 1
  total[1] = 1
  total[44] = 1
  total[45] = 1

  // Data characters: 0 forward, 1 reversed, 3 forward, 2 reversed
  for (let i = 0; i < 8; i++) {
    total[i + 2] = dataWidths[0]![i]!
    total[i + 15] = dataWidths[1]![7 - i]!
    total[i + 23] = dataWidths[3]![i]!
    total[i + 36] = dataWidths[2]![7 - i]!
  }

  // Finder patterns
  for (let i = 0; i < 5; i++) {
    total[i + 10] = OMN_FINDER_PATTERN[cLeft]![i]!
    total[i + 31] = OMN_FINDER_PATTERN[cRight]![4 - i]!
  }

  return total
}

// ─── DataBar Limited ────────────────────────────────────────────────────────

// Table 6: Group sum boundaries for Limited
const LTD_G_SUM = [0, 183064, 820064, 1000776, 1491021, 1979845, 1996939]

// T_even values per group
const LTD_T_EVEN = [28, 728, 6454, 203, 2408, 1, 16632]

// Modules per group (odd); even = 26 - odd
const LTD_MODULES = [17, 13, 9, 15, 11, 19, 7]

// Widest element per group (odd); even = 9 - odd
const LTD_WIDEST = [6, 5, 3, 5, 4, 8, 1]

// Table 7: Checksum weights (2 pairs x 14 element widths)
const LTD_CHECKSUM_WEIGHT = [
  [1, 3, 9, 27, 81, 65, 17, 51, 64, 14, 42, 37, 22, 66],
  [20, 60, 2, 6, 18, 54, 73, 41, 34, 13, 39, 28, 84, 74],
]

// Annex C: Finder patterns for Limited (89 patterns x 14 elements)
// prettier-ignore
const LTD_FINDER_PATTERN = [
  [1,1,1,1,1,1,1,1,1,1,3,3,1,1],[1,1,1,1,1,1,1,1,1,2,3,2,1,1],
  [1,1,1,1,1,1,1,1,1,3,3,1,1,1],[1,1,1,1,1,1,1,2,1,1,3,2,1,1],
  [1,1,1,1,1,1,1,2,1,2,3,1,1,1],[1,1,1,1,1,1,1,3,1,1,3,1,1,1],
  [1,1,1,1,1,2,1,1,1,1,3,2,1,1],[1,1,1,1,1,2,1,1,1,2,3,1,1,1],
  [1,1,1,1,1,2,1,2,1,1,3,1,1,1],[1,1,1,1,1,3,1,1,1,1,3,1,1,1],
  [1,1,1,2,1,1,1,1,1,1,3,2,1,1],[1,1,1,2,1,1,1,1,1,2,3,1,1,1],
  [1,1,1,2,1,1,1,2,1,1,3,1,1,1],[1,1,1,2,1,2,1,1,1,1,3,1,1,1],
  [1,1,1,3,1,1,1,1,1,1,3,1,1,1],[1,2,1,1,1,1,1,1,1,1,3,2,1,1],
  [1,2,1,1,1,1,1,1,1,2,3,1,1,1],[1,2,1,1,1,1,1,2,1,1,3,1,1,1],
  [1,2,1,1,1,2,1,1,1,1,3,1,1,1],[1,2,1,2,1,1,1,1,1,1,3,1,1,1],
  [1,3,1,1,1,1,1,1,1,1,3,1,1,1],[1,1,1,1,1,1,1,1,2,1,2,3,1,1],
  [1,1,1,1,1,1,1,1,2,2,2,2,1,1],[1,1,1,1,1,1,1,1,2,3,2,1,1,1],
  [1,1,1,1,1,1,1,2,2,1,2,2,1,1],[1,1,1,1,1,1,1,2,2,2,2,1,1,1],
  [1,1,1,1,1,1,1,3,2,1,2,1,1,1],[1,1,1,1,1,2,1,1,2,1,2,2,1,1],
  [1,1,1,1,1,2,1,1,2,2,2,1,1,1],[1,1,1,1,1,2,1,2,2,1,2,1,1,1],
  [1,1,1,1,1,3,1,1,2,1,2,1,1,1],[1,1,1,2,1,1,1,1,2,1,2,2,1,1],
  [1,1,1,2,1,1,1,1,2,2,2,1,1,1],[1,1,1,2,1,1,1,2,2,1,2,1,1,1],
  [1,1,1,2,1,2,1,1,2,1,2,1,1,1],[1,1,1,3,1,1,1,1,2,1,2,1,1,1],
  [1,2,1,1,1,1,1,1,2,1,2,2,1,1],[1,2,1,1,1,1,1,1,2,2,2,1,1,1],
  [1,2,1,1,1,1,1,2,2,1,2,1,1,1],[1,2,1,1,1,2,1,1,2,1,2,1,1,1],
  [1,2,1,2,1,1,1,1,2,1,2,1,1,1],[1,3,1,1,1,1,1,1,2,1,2,1,1,1],
  [1,1,1,1,1,1,1,1,3,1,1,3,1,1],[1,1,1,1,1,1,1,1,3,2,1,2,1,1],
  [1,1,1,1,1,1,1,2,3,1,1,2,1,1],[1,1,1,2,1,1,1,1,3,1,1,2,1,1],
  [1,2,1,1,1,1,1,1,3,1,1,2,1,1],[1,1,1,1,1,1,2,1,1,1,2,3,1,1],
  [1,1,1,1,1,1,2,1,1,2,2,2,1,1],[1,1,1,1,1,1,2,1,1,3,2,1,1,1],
  [1,1,1,1,1,1,2,2,1,1,2,2,1,1],[1,1,1,2,1,1,2,1,1,1,2,2,1,1],
  [1,1,1,2,1,1,2,1,1,2,2,1,1,1],[1,1,1,2,1,1,2,2,1,1,2,1,1,1],
  [1,1,1,2,1,2,2,1,1,1,2,1,1,1],[1,1,1,3,1,1,2,1,1,1,2,1,1,1],
  [1,2,1,1,1,1,2,1,1,1,2,2,1,1],[1,2,1,1,1,1,2,1,1,2,2,1,1,1],
  [1,2,1,2,1,1,2,1,1,1,2,1,1,1],[1,1,1,1,2,1,1,1,1,1,2,3,1,1],
  [1,1,1,1,2,1,1,1,1,2,2,2,1,1],[1,1,1,1,2,1,1,1,1,3,2,1,1,1],
  [1,1,1,1,2,1,1,2,1,1,2,2,1,1],[1,1,1,1,2,1,1,2,1,2,2,1,1,1],
  [1,1,1,1,2,2,1,1,1,1,2,2,1,1],[1,2,1,1,2,1,1,1,1,1,2,2,1,1],
  [1,2,1,1,2,1,1,1,1,2,2,1,1,1],[1,2,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,1,1,2,2,1,1,1,1,2,1,1,1],[1,2,1,2,2,1,1,1,1,1,2,1,1,1],
  [1,3,1,1,2,1,1,1,1,1,2,1,1,1],[1,1,2,1,1,1,1,1,1,1,2,3,1,1],
  [1,1,2,1,1,1,1,1,1,2,2,2,1,1],[1,1,2,1,1,1,1,1,1,3,2,1,1,1],
  [1,1,2,1,1,1,1,2,1,1,2,2,1,1],[1,1,2,1,1,1,1,2,1,2,2,1,1,1],
  [1,1,2,1,1,1,1,3,1,1,2,1,1,1],[1,1,2,1,1,2,1,1,1,1,2,2,1,1],
  [1,1,2,1,1,2,1,1,1,2,2,1,1,1],[1,1,2,2,1,1,1,1,1,1,2,2,1,1],
  [2,1,1,1,1,1,1,1,1,2,2,2,1,1],[2,1,1,1,1,1,1,1,1,3,2,1,1,1],
  [2,1,1,1,1,1,1,2,1,1,2,2,1,1],[2,1,1,1,1,1,1,2,1,2,2,1,1,1],
  [2,1,1,1,1,1,1,3,1,1,2,1,1,1],[2,1,1,1,1,2,1,1,1,2,2,1,1,1],
  [2,1,1,1,1,2,1,2,1,1,2,1,1,1],[2,1,1,2,1,1,1,1,1,2,2,1,1,1],
  [2,1,1,1,1,1,1,1,2,2,1,2,1,1],
];

/** Determine group index for a Limited data pair value (modifies val in place) */
function ltdGroup(pairVal: number): { group: number; adjustedVal: number } {
  for (let i = 6; i > 0; i--) {
    if (pairVal >= LTD_G_SUM[i]!) {
      return { group: i, adjustedVal: pairVal - LTD_G_SUM[i]! }
    }
  }
  return { group: 0, adjustedVal: pairVal }
}

/**
 * Encode GS1 DataBar Limited
 * Input: 13 or 14 digit GTIN starting with 0 or 1
 *
 * @returns Array of bar widths (47 elements)
 */
export function encodeGS1DataBarLimited(gtin: string): number[] {
  const digits13 = parseGTIN(gtin, "Limited")

  if (digits13[0] !== "0" && digits13[0] !== "1") {
    throw new InvalidInputError("GS1 DataBar Limited: GTIN must start with 0 or 1")
  }

  // Convert to numeric value
  let val = 0n
  for (let i = 0; i < 13; i++) {
    val = val * 10n + BigInt(digits13.charCodeAt(i) - 48)
  }

  // Split into left and right pair values
  const pairVals = [Number(val / 2013571n), Number(val % 2013571n)]

  // Encode each pair using 7 elements (interleaved odd/even)
  const pairWidths: number[][] = []

  for (let i = 0; i < 2; i++) {
    const { group, adjustedVal } = ltdGroup(pairVals[i]!)
    const odd = Math.trunc(adjustedVal / LTD_T_EVEN[group]!)
    const even = adjustedVal % LTD_T_EVEN[group]!

    pairWidths.push(
      interleaveWidths(
        odd,
        even,
        LTD_MODULES[group]!,
        26 - LTD_MODULES[group]!,
        7,
        LTD_WIDEST[group]!,
        false,
      ),
    )
  }

  // Calculate checksum
  let checksum = 0
  for (let i = 0; i < 14; i++) {
    checksum += LTD_CHECKSUM_WEIGHT[0]![i]! * pairWidths[0]![i]!
    checksum += LTD_CHECKSUM_WEIGHT[1]![i]! * pairWidths[1]![i]!
  }
  checksum %= 89

  const checksumFinderPattern = LTD_FINDER_PATTERN[checksum]!

  // Assemble 47-element total width array
  const total: number[] = Array.from<number>({ length: 47 })

  // Guards
  total[0] = 1 // Left guard bar
  total[1] = 1 // Left guard space
  total[44] = 1 // Right guard space
  total[45] = 1 // Right guard bar
  total[46] = 5 // Right padding (5-module termination bar)

  // Data and finder
  for (let i = 0; i < 14; i++) {
    total[i + 2] = pairWidths[0]![i]!
    total[i + 16] = checksumFinderPattern[i]!
    total[i + 30] = pairWidths[1]![i]!
  }

  return total
}

// ─── DataBar Expanded ───────────────────────────────────────────────────────

// Table 8: Group sum boundaries for Expanded
const EXP_G_SUM = [0, 348, 1388, 2948, 3988]

// T_even values per group
const EXP_T_EVEN = [4, 20, 52, 104, 204]

// Modules per group (odd); even = 17 - odd
const EXP_MODULES = [12, 10, 8, 6, 4]

// Widest element per group (odd); even = 9 - odd
const EXP_WIDEST = [7, 5, 4, 3, 1]

// Table 14: Checksum weights (23 rows x 8 element widths)
// prettier-ignore
const EXP_CHECKSUM_WEIGHT = [
  [1,3,9,27,81,32,96,77],[20,60,180,118,143,7,21,63],
  [189,145,13,39,117,140,209,205],[193,157,49,147,19,57,171,91],
  [62,186,136,197,169,85,44,132],[185,133,188,142,4,12,36,108],
  [113,128,173,97,80,29,87,50],[150,28,84,41,123,158,52,156],
  [46,138,203,187,139,206,196,166],[76,17,51,153,37,111,122,155],
  [43,129,176,106,107,110,119,146],[16,48,144,10,30,90,59,177],
  [109,116,137,200,178,112,125,164],[70,210,208,202,184,130,179,115],
  [134,191,151,31,93,68,204,190],[148,22,66,198,172,94,71,2],
  [6,18,54,162,64,192,154,40],[120,149,25,75,14,42,126,167],
  [79,26,78,23,69,207,199,175],[103,98,83,38,114,131,182,124],
  [161,61,183,127,170,88,53,159],[55,165,73,8,24,72,5,15],
  [45,135,194,160,58,174,100,89],
];

// Table 15: Finder patterns for Expanded (12 patterns x 5 elements)
const EXP_FINDER_PATTERN = [
  [1, 8, 4, 1, 1],
  [1, 1, 4, 8, 1],
  [3, 6, 4, 1, 1],
  [1, 1, 4, 6, 3],
  [3, 4, 6, 1, 1],
  [1, 1, 6, 4, 3],
  [3, 2, 8, 1, 1],
  [1, 1, 8, 2, 3],
  [2, 6, 5, 1, 1],
  [1, 1, 5, 6, 2],
  [2, 2, 9, 1, 1],
  [1, 1, 9, 2, 2],
]

// Table 16: Finder pattern sequence per number of codeblocks
// Index = (symbol_chars - 1) / 2 - 1; values are 1-based finder indices
const EXP_FINDER_SEQUENCE: number[][] = [
  [1, 2],
  [1, 4, 3],
  [1, 6, 3, 8],
  [1, 10, 3, 8, 5],
  [1, 10, 3, 8, 7, 12],
  [1, 10, 3, 8, 9, 12, 11],
  [1, 2, 3, 4, 5, 6, 7, 8],
  [1, 2, 3, 4, 5, 6, 7, 10, 9],
  [1, 2, 3, 4, 5, 6, 7, 10, 11, 12],
  [1, 2, 3, 4, 5, 8, 7, 10, 9, 12, 11],
]

// Weight row indices for checksum calculation
// prettier-ignore
const EXP_WEIGHT_ROWS: number[][] = [
  [0,1,2],
  [0,5,6,3,4],
  [0,9,10,3,4,13,14],
  [0,17,18,3,4,13,14,7,8],
  [0,17,18,3,4,13,14,11,12,21,22],
  [0,17,18,3,4,13,14,15,16,21,22,19,20],
  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],
  [0,1,2,3,4,5,6,7,8,9,10,11,12,17,18,15,16],
  [0,1,2,3,4,5,6,7,8,9,10,11,12,17,18,19,20,21,22],
  [0,1,2,3,4,5,6,7,8,13,14,11,12,17,18,15,16,21,22,19,20],
];

/** Determine group index for an Expanded data character value */
function expGroup(val: number): number {
  for (let i = 0; i < EXP_G_SUM.length - 1; i++) {
    if (val < EXP_G_SUM[i + 1]!) {
      return i
    }
  }
  return EXP_G_SUM.length - 1
}

/**
 * Append `count` bits of `val` to a binary string array.
 * MSB first.
 */
function appendBits(binary: number[], val: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) {
    binary.push((val >> i) & 1)
  }
}

/**
 * Encode the binary data for GS1 DataBar Expanded.
 * Supports Method 1 (starts with AI 01) and Method 2 (general).
 * For simplicity, methods 3-14 (compressed weight/date) are encoded using method 1 or 2.
 */
function expBinaryString(data: string): number[] {
  const binary: number[] = []

  // Linkage flag (0 = standalone, no composite)
  binary.push(0)

  // Check if data starts with "01" (AI 01) and has at least 16 chars
  if (data.length >= 16 && data[0] === "0" && data[1] === "1") {
    // Method 1: (01) and possibly other AIs
    // Header: "1"
    appendBits(binary, 1, 1)

    // Leading digit (position 2)
    appendBits(binary, data.charCodeAt(2) - 48, 4)

    // Next 12 digits (positions 3-14), 3 at a time -> 10 bits
    for (let i = 3; i < 15; i += 3) {
      const triplet =
        (data.charCodeAt(i) - 48) * 100 +
        (data.charCodeAt(i + 1) - 48) * 10 +
        (data.charCodeAt(i + 2) - 48)
      appendBits(binary, triplet, 10)
    }

    // Variable length bit field placeholder
    // bit1: symbolChars odd? bit2: symbolChars > 14?
    // We'll patch these after we know the symbol size
    const patchIdx = binary.length
    binary.push(0, 0) // placeholder

    // Remaining data (after position 16) goes into general field
    if (data.length > 16) {
      encodeGeneralField(data, 16, binary)
    }

    // Padding and patching
    padAndPatch(binary, patchIdx)
  } else {
    // Method 2: general data
    // Header: "00"
    appendBits(binary, 0, 2)

    // Variable length bit field placeholder
    const patchIdx = binary.length
    binary.push(0, 0) // placeholder

    // Encode all data into general field
    encodeGeneralField(data, 0, binary)

    // Padding and patching
    padAndPatch(binary, patchIdx)
  }

  return binary
}

/** Encode general field data using numeric, alphanumeric, and ISO 646 modes */
function encodeGeneralField(data: string, start: number, binary: number[]): void {
  // Use numeric mode for all-numeric data, else alphanumeric
  let i = start
  let mode: "numeric" | "alpha" | "iso646" = "numeric"

  while (i < data.length) {
    if (data[i] === "\x1D") {
      // FNC1 separator
      if (mode === "numeric") {
        appendBits(binary, 0x0f, 4) // FNC1 in numeric mode
      } else if (mode === "alpha") {
        appendBits(binary, 0x0f, 5) // FNC1 in alphanumeric
      } else {
        appendBits(binary, 0x0f, 5) // FNC1 in ISO 646
      }
      i++
      continue
    }

    const ch = data.charCodeAt(i)

    if (mode === "numeric") {
      if (ch >= 48 && ch <= 57) {
        // Check if we have a pair of digits
        if (i + 1 < data.length && data.charCodeAt(i + 1) >= 48 && data.charCodeAt(i + 1) <= 57) {
          const pair = (ch - 48) * 11 + (data.charCodeAt(i + 1) - 48) + 8
          appendBits(binary, pair, 7)
          i += 2
        } else {
          // Last odd digit
          appendBits(binary, ch - 48 + 1, 4)
          i++
        }
      } else {
        // Switch to alphanumeric
        appendBits(binary, 0, 4) // Latch to alpha
        mode = "alpha"
      }
    } else if (mode === "alpha") {
      if (ch >= 48 && ch <= 57) {
        // Check if next two are digits - maybe switch to numeric
        if (i + 1 < data.length && data.charCodeAt(i + 1) >= 48 && data.charCodeAt(i + 1) <= 57) {
          appendBits(binary, 0, 3) // Latch to numeric "000"
          mode = "numeric"
          // Don't advance i, re-encode in numeric mode
        } else {
          appendBits(binary, ch - 43, 5) // Digits 0-9 -> 5-14
          i++
        }
      } else if (ch >= 65 && ch <= 90) {
        appendBits(binary, ch - 65 + 15, 5) // A=15, B=16, ..., Z=40
        i++
      } else if (ch === 42) {
        // '*'
        appendBits(binary, 41, 5)
        i++
      } else if (ch === 44) {
        // ','
        appendBits(binary, 42, 5)
        i++
      } else if (ch === 45) {
        // '-'
        appendBits(binary, 43, 5)
        i++
      } else if (ch === 46) {
        // '.'
        appendBits(binary, 44, 5)
        i++
      } else if (ch === 47) {
        // '/'
        appendBits(binary, 45, 5)
        i++
      } else {
        // Switch to ISO 646 for other characters
        appendBits(binary, 4, 5) // Latch to ISO 646
        mode = "iso646"
      }
    } else {
      // iso646 mode - 5, 7, or 8 bits per character
      if (ch >= 48 && ch <= 57) {
        if (i + 1 < data.length && data.charCodeAt(i + 1) >= 48 && data.charCodeAt(i + 1) <= 57) {
          appendBits(binary, 0, 3) // Latch to numeric
          mode = "numeric"
        } else {
          appendBits(binary, ch - 43, 5) // Digits: 5-14
          i++
        }
      } else if (ch >= 65 && ch <= 90) {
        appendBits(binary, ch - 65 + 15, 7) // A-Z in ISO 646
        i++
      } else if (ch >= 97 && ch <= 122) {
        appendBits(binary, ch - 97 + 41, 7) // a-z
        i++
      } else {
        // Other characters as 8-bit values
        appendBits(binary, ch, 8)
        i++
      }
    }
  }
}

/** Pad binary data and patch variable-length bit field */
function padAndPatch(binary: number[], patchIdx: number): void {
  // Calculate symbol characters needed
  let remainder = 12 - (binary.length % 12)
  if (remainder === 12) remainder = 0
  let symbolChars = Math.trunc((binary.length + remainder) / 12) + 1

  if (symbolChars < 4) symbolChars = 4

  remainder = 12 * (symbolChars - 1) - binary.length

  // Add padding
  if (remainder > 0) {
    // First pad with 0000 if in numeric mode end
    appendBits(binary, 0, Math.min(4, remainder))
    remainder -= Math.min(4, remainder)
    // Then pad with 00100 patterns
    while (remainder > 0) {
      appendBits(binary, 4, Math.min(5, remainder))
      remainder -= Math.min(5, remainder)
    }
  }

  // Patch variable-length symbol bit field
  binary[patchIdx] = symbolChars & 1 ? 1 : 0
  binary[patchIdx + 1] = symbolChars > 14 ? 1 : 0
}

/**
 * Encode GS1 DataBar Expanded
 * Input: GS1 AI string in parenthesized format or raw AI data
 *
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeGS1DataBarExpanded(data: string): number[] {
  if (data.length === 0) {
    throw new InvalidInputError("GS1 DataBar Expanded: data must not be empty")
  }

  // Parse AI-formatted input -- strip parentheses and validate AI structure
  let payload = data
  if (data.startsWith("(")) {
    const fields = parseAIString(data) // throws on invalid AI syntax
    payload = fields.map((f) => f.ai + f.data).join("")
  }

  // Generate binary string
  const binary = expBinaryString(payload)

  // Calculate data characters from binary
  const dataChars = Math.trunc(binary.length / 12)
  const symbolChars = dataChars + 1 // Plus check char

  // Encode each 12-bit segment to element widths
  const charWidths: number[][] = []
  for (let i = 0; i < dataChars; i++) {
    let vs = 0
    for (let j = 0; j < 12; j++) {
      if (binary[i * 12 + j]) {
        vs |= 0x800 >> j
      }
    }

    const group = expGroup(vs)
    const odd = Math.trunc((vs - EXP_G_SUM[group]!) / EXP_T_EVEN[group]!)
    const even = (vs - EXP_G_SUM[group]!) % EXP_T_EVEN[group]!

    charWidths.push(
      interleaveWidths(
        odd,
        even,
        EXP_MODULES[group]!,
        17 - EXP_MODULES[group]!,
        4,
        EXP_WIDEST[group]!,
        true,
      ),
    )
  }

  // Calculate checksum (7.2.6)
  let checksum = 0
  const weightRowIdx = Math.trunc((dataChars - 2) / 2)

  for (let i = 0; i < dataChars; i++) {
    const row = EXP_WEIGHT_ROWS[weightRowIdx]![i]!
    for (let j = 0; j < 8; j++) {
      checksum += charWidths[i]![j]! * EXP_CHECKSUM_WEIGHT[row]![j]!
    }
  }

  const checkChar = 211 * (symbolChars - 4) + (checksum % 211)

  const checkGroup = expGroup(checkChar)
  const checkOdd = Math.trunc((checkChar - EXP_G_SUM[checkGroup]!) / EXP_T_EVEN[checkGroup]!)
  const checkEven = (checkChar - EXP_G_SUM[checkGroup]!) % EXP_T_EVEN[checkGroup]!

  const checkWidths = interleaveWidths(
    checkOdd,
    checkEven,
    EXP_MODULES[checkGroup]!,
    17 - EXP_MODULES[checkGroup]!,
    4,
    EXP_WIDEST[checkGroup]!,
    true,
  )

  // Assemble element array
  const codeblocks = Math.trunc((symbolChars + 1) / 2)
  const patternWidth = codeblocks * 5 + symbolChars * 8 + 4
  const elements: number[] = Array.from<number>({ length: patternWidth }).fill(0)

  // Put finder patterns in element array
  const p = Math.trunc((symbolChars - 1) / 2) - 1
  for (let i = 0; i < codeblocks; i++) {
    const k = EXP_FINDER_SEQUENCE[p]![i]! - 1
    for (let j = 0; j < 5; j++) {
      elements[21 * i + j + 10] = EXP_FINDER_PATTERN[k]![j]!
    }
  }

  // Put check character in element array
  for (let i = 0; i < 8; i++) {
    elements[i + 2] = checkWidths[i]!
  }

  // Put forward reading data characters (odd-indexed: 1, 3, 5, ...)
  for (let i = 1; i < dataChars; i += 2) {
    const k = Math.trunc((i - 1) / 2) * 21 + 23
    for (let j = 0; j < 8; j++) {
      elements[k + j] = charWidths[i]![j]!
    }
  }

  // Put reversed data characters (even-indexed: 0, 2, 4, ...)
  for (let i = 0; i < dataChars; i += 2) {
    const k = Math.trunc(i / 2) * 21 + 15
    for (let j = 0; j < 8; j++) {
      elements[k + j] = charWidths[i]![7 - j]!
    }
  }

  // Set guards
  elements[0] = 1
  elements[1] = 1
  elements[patternWidth - 2] = 1
  elements[patternWidth - 1] = 1

  return elements
}
