/**
 * GS1 DataBar encoder (ISO/IEC 24724)
 * Formerly RSS (Reduced Space Symbology)
 *
 * Variants:
 * - Omnidirectional: 14-digit GTIN, omnidirectional scanning
 * - Truncated: the Omnidirectional pattern at reduced height
 * - Stacked: Omnidirectional split over two rows, 13 modules high
 * - Stacked Omnidirectional: two full-height rows
 * - Limited: 14-digit GTIN starting with 0 or 1, smaller
 * - Expanded: variable-length AI data
 * - Expanded Stacked: Expanded split over several rows
 *
 * The linear variants return bar-first element widths; the stacked variants
 * return a module matrix, one entry per module row.
 *
 * The `dbar_combins` and `dbar_getWidths` algorithms are from ISO/IEC 24724 Annex B,
 * as implemented in the zint library (BSD-3-Clause).
 */

import { InvalidInputError, CheckDigitError } from "../errors"
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

// ─── Element Polarity ──────────────────────────────────────────────────────

/**
 * ISO/IEC 24724 lays every DataBar symbol out starting with a one-module guard
 * SPACE, but every 1D encoder in etiket returns bar-first arrays and both
 * `renderBarcodeSVG` and `renderBarcodePNG` draw element 0 as a bar.
 *
 * Dropping that leading white module turns the ISO layout into a bar-first
 * array without changing the rendered symbol — the module it removes is white
 * and sits against the quiet zone.
 */
function barFirst(elements: number[]): number[] {
  return elements.slice(1)
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
      throw new CheckDigitError(
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

/** Options shared by every GS1 DataBar encoder. */
export interface GS1DataBarOptions {
  /**
   * Set the linkage flag, declaring that a 2D composite component sits above
   * the symbol (ISO/IEC 24723 4.5). Off by default: a standalone symbol.
   */
  linkage?: boolean
}

/** Value the linkage flag adds to the Omnidirectional data value. */
const OMN_LINKAGE_VALUE = 10000000000000n

/** Value the linkage flag adds to the Limited data value. */
const LTD_LINKAGE_VALUE = 2015133531096n

/**
 * The two halves of an Omnidirectional symbol.
 *
 * The linear symbol puts them side by side; the stacked variants put the right
 * half on a row of its own underneath the left half.
 */
interface OmniHalves {
  /** Data character 1, left finder, data character 2 — 46 modules. */
  left: number[]
  /** Data character 4, right finder, data character 3 — 46 modules. */
  right: number[]
}

/**
 * Encode a GTIN into the element widths shared by every Omnidirectional
 * variant (Omnidirectional, Truncated, Stacked and Stacked Omnidirectional).
 */
function omniHalves(gtin: string, variant: string, linkage = false): OmniHalves {
  const digits13 = parseGTIN(gtin, variant)

  // Convert 13-digit GTIN to numeric value (without check digit)
  let val = 0n
  for (let i = 0; i < 13; i++) {
    val = val * 10n + BigInt(digits13.charCodeAt(i) - 48)
  }
  if (linkage) val += OMN_LINKAGE_VALUE

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

  // Data characters 1 and 4 read forward, 2 and 3 read reversed.
  return {
    left: [...dataWidths[0]!, ...OMN_FINDER_PATTERN[cLeft]!, ...[...dataWidths[1]!].reverse()],
    right: [
      ...dataWidths[3]!,
      ...[...OMN_FINDER_PATTERN[cRight]!].reverse(),
      ...[...dataWidths[2]!].reverse(),
    ],
  }
}

/**
 * Encode GS1 DataBar Omnidirectional
 * Input: 13 or 14 digit GTIN
 *
 * @returns Array of bar widths (alternating bar/space), 45 elements totaling 95 modules
 */
export function encodeGS1DataBarOmni(gtin: string, options: GS1DataBarOptions = {}): number[] {
  const { left, right } = omniHalves(gtin, "Omnidirectional", options.linkage)
  return barFirst([1, 1, ...left, ...right, 1, 1])
}

/**
 * Encode GS1 DataBar Truncated
 * Input: 13 or 14 digit GTIN
 *
 * Truncated uses exactly the Omnidirectional bar pattern; only the symbol
 * height differs (13 modules instead of 33), which is a rendering choice.
 *
 * @returns Array of bar widths (alternating bar/space), 45 elements
 */
export function encodeGS1DataBarTruncated(gtin: string, options: GS1DataBarOptions = {}): number[] {
  const { left, right } = omniHalves(gtin, "Truncated", options.linkage)
  return barFirst([1, 1, ...left, ...right, 1, 1])
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
 * @returns Array of bar widths (46 elements)
 */
export function encodeGS1DataBarLimited(gtin: string, options: GS1DataBarOptions = {}): number[] {
  const digits13 = parseGTIN(gtin, "Limited")

  if (digits13[0] !== "0" && digits13[0] !== "1") {
    throw new InvalidInputError("GS1 DataBar Limited: GTIN must start with 0 or 1")
  }

  // Convert to numeric value
  let val = 0n
  for (let i = 0; i < 13; i++) {
    val = val * 10n + BigInt(digits13.charCodeAt(i) - 48)
  }
  if (options.linkage) val += LTD_LINKAGE_VALUE

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

  return barFirst(total)
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

// ─── DataBar Expanded: general purpose field ────────────────────────────────

/** Marks an FNC1 separator inside the general purpose field. */
const EXP_FNC1 = -1

/** Pattern that pads the binary string out to a whole number of characters. */
const EXP_FILL_PATTERN = [0, 0, 1, 0, 0]

/** 21 data characters plus one check character, 12 bits each. */
const EXP_MAX_BITS = 252

/** Symbol characters per row when the symbol is not stacked. */
const EXP_SEGMENTS_LINEAR = 22

/** One GS1 element: an AI and its value. */
interface ExpandedField {
  ai: string
  value: string
  /** Variable-length AIs need an FNC1 separator when another field follows. */
  variable: boolean
}

/** The chosen encodation method and the fields it produced. */
interface ExpandedEncodation {
  /** Encodation method bits (ISO/IEC 24724 Table 9). */
  method: string
  /** Compressed data field. */
  cdf: number[]
  /** General purpose field characters; `EXP_FNC1` marks a separator. */
  gpf: number[]
  /** Whether a variable length symbol bit field and a general field follow. */
  gpfAllow: boolean
}

type ExpandedMode = "numeric" | "alphanumeric" | "iso646"

/** Value and bit width of one encoded general field character. */
interface CharBits {
  value: number
  bits: number
}

/** `count` bits of `val`, MSB first. */
function toBits(val: number, count: number): number[] {
  const out: number[] = []
  appendBits(out, val, count)
  return out
}

/** Numeric-mode digit value of a character (10 = FNC1), or null. */
function numericValue(ch: number): number | null {
  if (ch === EXP_FNC1) return 10
  if (ch >= 48 && ch <= 57) return ch - 48
  return null
}

/** 7-bit numeric-mode value for a character pair, or null when not encodable. */
function numericPair(a: number, b: number): number | null {
  const x = numericValue(a)
  const y = numericValue(b)
  if (x === null || y === null) return null
  const v = x * 11 + y
  return v > 119 ? null : v + 8
}

/** Alphanumeric-mode encoding of a character (Table 12), or null. */
function alphanumericBits(ch: number): CharBits | null {
  if (ch === EXP_FNC1) return { value: 15, bits: 5 }
  if (ch >= 48 && ch <= 57) return { value: ch - 43, bits: 5 }
  if (ch >= 65 && ch <= 90) return { value: ch - 33, bits: 6 }
  if (ch === 42) return { value: 58, bits: 6 } // '*'
  if (ch >= 44 && ch <= 47) return { value: ch + 15, bits: 6 } // ',' '-' '.' '/'
  return null
}

/** ISO 646-mode encoding of a character (Table 13), or null. */
function iso646Bits(ch: number): CharBits | null {
  if (ch === EXP_FNC1) return { value: 15, bits: 5 }
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

/**
 * Bits left over once the symbol is rounded up to a whole number of symbol
 * characters (ISO/IEC 24724 7.2.5.5.3).
 *
 * A symbol holds at least four characters, and a stacked symbol never ends with
 * a row containing a single character, so one more character is added when the
 * last row would be left alone.
 *
 * @param total - Bits used so far, including the 12 bits of the check character
 * @param segments - Symbol characters per row
 */
function expRemainingBits(total: number, segments: number): number {
  let target = Math.max(48, Math.ceil(total / 12) * 12)
  const symbolChars = target / 12
  if (symbolChars % segments === 1) {
    target = (symbolChars + 1) * 12
  }
  return target - total
}

/**
 * Encode the general purpose field, switching between numeric, alphanumeric and
 * ISO 646 modes (ISO/IEC 24724 7.2.5.5.2).
 *
 * @param gpf - Characters to encode; `EXP_FNC1` marks a separator
 * @param prefixBits - Bits already used by linkage, method, VLF and the CDF,
 *   plus the 12 bits of the check character
 * @param segments - Symbol characters per row
 */
function encodeGeneralField(
  gpf: number[],
  prefixBits: number,
  segments: number,
): { bits: number[]; mode: ExpandedMode } {
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
    // A trailing digit pairs with a virtual '0', giving it a run length of 1.
    const next = i < n - 1 ? gpf[i + 1]! : 48
    numericRuns[i] = numericPair(ch, next) === null ? 0 : numericRuns[i + 2]! + 2
    const alpha = alphanumericBits(ch) !== null
    alphanumericRuns[i] = alpha ? alphanumericRuns[i + 1]! + 1 : 0
    nextISO646Only[i] = !alpha && iso646Bits(ch) !== null ? 0 : nextISO646Only[i + 1]! + 1
  }

  const bits: number[] = []
  let mode: ExpandedMode = "numeric"
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
      const rem = expRemainingBits(prefixBits + bits.length, segments)
      if (rem >= 4 && rem <= 6) {
        appendBits(bits, ch - 47, 4)
        for (let k = 4; k < rem; k++) bits.push(0)
      } else {
        appendBits(bits, numericPair(ch, EXP_FNC1)!, 7)
      }
      i++
      continue
    }

    if (mode === "alphanumeric") {
      if (ch === EXP_FNC1) {
        appendBits(bits, 15, 5)
        mode = "numeric"
        i++
        continue
      }
      const alpha = alphanumericBits(ch)
      if (alpha === null) {
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
      appendBits(bits, alpha.value, alpha.bits)
      i++
      continue
    }

    if (ch === EXP_FNC1) {
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
        `GS1 DataBar Expanded: character '${String.fromCharCode(ch)}' is not encodable`,
      )
    }
    appendBits(bits, iso.value, iso.bits)
    i++
  }

  return { bits, mode }
}

// ─── DataBar Expanded: encodation methods ───────────────────────────────────

/** True when `s` is exactly `n` digits */
function isDigits(s: string, n: number): boolean {
  return s.length === n && /^\d+$/.test(s)
}

/** 12 digits as four 10-bit groups of three (ISO/IEC 24724 7.2.5.4.2) */
function conv12to40(digits: string): number[] {
  const out: number[] = []
  for (let i = 0; i < 12; i += 3) {
    appendBits(out, Number.parseInt(digits.slice(i, i + 3), 10), 10)
  }
  return out
}

/** 13 digits as a 4-bit leading digit plus four 10-bit groups */
function conv13to44(digits: string): number[] {
  const out: number[] = []
  appendBits(out, digits.charCodeAt(0) - 48, 4)
  out.push(...conv12to40(digits.slice(1)))
  return out
}

/** General purpose field characters for the fields from `start` onwards */
function gpfChars(fields: ExpandedField[], start: number, prefix: number[] = []): number[] {
  const out = [...prefix]
  for (let i = start; i < fields.length; i++) {
    const field = fields[i]!
    for (let k = 0; k < field.ai.length; k++) out.push(field.ai.charCodeAt(k))
    for (let k = 0; k < field.value.length; k++) out.push(field.value.charCodeAt(k))
    if (i !== fields.length - 1 && field.variable) out.push(EXP_FNC1)
  }
  return out
}

/** Character codes of a string, mapping GS to an FNC1 separator */
function rawChars(data: string): number[] {
  const out: number[] = []
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i)
    out.push(ch === 0x1d ? EXP_FNC1 : ch)
  }
  return out
}

/** Date AIs usable with the compressed weight methods, in method-bit order */
const EXP_DATE_AIS = ["11", "13", "15", "17"]

/**
 * AI prefixes whose element length is predefined by the GS1 General
 * Specifications (figure 7.8.6.2-1). Those elements need no FNC1 separator;
 * every other AI does, even when its own data happens to be a fixed length.
 */
const EXP_PREDEFINED_LENGTH = new Set([
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

/**
 * Pick the encodation method (ISO/IEC 24724 Table 9), preferring the compressed
 * methods 3-14 whenever the AI sequence qualifies, since they produce the
 * smallest symbol.
 */
function selectEncodation(fields: ExpandedField[]): ExpandedEncodation {
  const ai = (i: number): string => fields[i]?.ai ?? ""
  const value = (i: number): string => fields[i]?.value ?? ""
  const count = fields.length

  // Every compressed method needs (01) with an indicator digit of 9.
  const gtin = ai(0) === "01" && isDigits(value(0), 14)
  const compressible = gtin && value(0)[0] === "9"
  const gtin12 = (): string => value(0).slice(1, 13)
  const weight = isDigits(value(1), 6) ? Number.parseInt(value(1), 10) : -1

  // Method 3: (01) + (3103) kilogram weight below 32.768 kg
  if (compressible && count === 2 && ai(1) === "3103" && weight >= 0 && weight <= 32767) {
    return {
      method: "0100",
      cdf: [...conv12to40(gtin12()), ...toBits(weight, 15)],
      gpf: [],
      gpfAllow: false,
    }
  }

  // Method 4: (01) + (3202)/(3203) pound weight
  if (compressible && count === 2 && ai(1) === "3202" && weight >= 0 && weight <= 9999) {
    return {
      method: "0101",
      cdf: [...conv12to40(gtin12()), ...toBits(weight, 15)],
      gpf: [],
      gpfAllow: false,
    }
  }
  if (compressible && count === 2 && ai(1) === "3203" && weight >= 0 && weight <= 22767) {
    return {
      method: "0101",
      cdf: [...conv12to40(gtin12()), ...toBits(weight + 10000, 15)],
      gpf: [],
      gpfAllow: false,
    }
  }

  // Methods 5-12: (01) + (310x)/(320x) weight, optionally with a date AI
  const is310x = /^310\d$/.test(ai(1))
  const is320x = /^320\d$/.test(ai(1))
  if (compressible && (count === 2 || count === 3) && (is310x || is320x) && weight <= 99999) {
    const dateIndex = count === 3 ? EXP_DATE_AIS.indexOf(ai(2)) : 0
    const month = count === 3 ? Number.parseInt(value(2).slice(2, 4), 10) : 0
    const day = count === 3 ? Number.parseInt(value(2).slice(4, 6), 10) : 0
    const dateValid =
      count === 2 ||
      (dateIndex >= 0 && isDigits(value(2), 6) && month >= 1 && month <= 12 && day <= 31)

    if (weight >= 0 && dateValid) {
      const date =
        count === 3
          ? Number.parseInt(value(2).slice(0, 2), 10) * 384 + (month - 1) * 32 + day
          : 38400 // "no date"
      const decimal = Number.parseInt(ai(1)[3]!, 10)
      return {
        method: `0111${((dateIndex << 1) | (is320x ? 1 : 0)).toString(2).padStart(3, "0")}`,
        cdf: [
          ...conv12to40(gtin12()),
          ...toBits(decimal * 100000 + Number.parseInt(value(1).slice(1), 10), 20),
          ...toBits(date, 16),
        ],
        gpf: [],
        gpfAllow: false,
      }
    }
  }

  // Method 13: (01) + (392x) price
  if (compressible && count >= 2 && /^392[0-3]$/.test(ai(1))) {
    return {
      method: "01100",
      cdf: [...conv12to40(gtin12()), ...toBits(Number.parseInt(ai(1)[3]!, 10), 2)],
      gpf: gpfChars(fields, 2, [...rawChars(value(1)), ...(count > 2 ? [EXP_FNC1] : [])]),
      gpfAllow: true,
    }
  }

  // Method 14: (01) + (393x) price with an ISO 4217 currency code
  if (compressible && count >= 2 && /^393[0-3]$/.test(ai(1)) && isDigits(value(1).slice(0, 3), 3)) {
    return {
      method: "01101",
      cdf: [
        ...conv12to40(gtin12()),
        ...toBits(Number.parseInt(ai(1)[3]!, 10), 2),
        ...toBits(Number.parseInt(value(1).slice(0, 3), 10), 10),
      ],
      gpf: gpfChars(fields, 2, [...rawChars(value(1).slice(3)), ...(count > 2 ? [EXP_FNC1] : [])]),
      gpfAllow: true,
    }
  }

  // Method 1: (01) followed by anything else
  if (gtin) {
    return {
      method: "1",
      cdf: conv13to44(value(0).slice(0, 13)),
      gpf: gpfChars(fields, 1),
      gpfAllow: true,
    }
  }

  // Method 2: general data
  return { method: "00", cdf: [], gpf: gpfChars(fields, 0), gpfAllow: true }
}

/** Parse the input into fields, or fall back to raw element string data */
function expandedEncodation(data: string): ExpandedEncodation {
  if (data.startsWith("(")) {
    return selectEncodation(
      parseAIString(data).map((field) => ({
        ai: field.ai,
        value: field.data,
        variable: !EXP_PREDEFINED_LENGTH.has(field.ai.slice(0, 2)),
      })),
    )
  }

  // Raw element string: the AI boundaries are unknown, so only a leading (01)
  // can be compressed and everything after it goes through the general field.
  if (data.length >= 16 && data.startsWith("01") && isDigits(data.slice(2, 16), 14)) {
    return {
      method: "1",
      cdf: conv13to44(data.slice(2, 15)),
      gpf: rawChars(data.slice(16)),
      gpfAllow: true,
    }
  }
  return { method: "00", cdf: [], gpf: rawChars(data), gpfAllow: true }
}

/**
 * Build the binary string of a GS1 DataBar Expanded symbol: linkage flag,
 * encodation method, variable length symbol bit field, compressed data field,
 * general purpose field and padding (ISO/IEC 24724 7.2.5).
 */
function expBinaryString(data: string, segments: number, linkage: boolean): number[] {
  const encodation = expandedEncodation(data)
  const vlfBits = encodation.gpfAllow ? 2 : 0

  // The check character occupies a symbol character of its own, so its 12 bits
  // count towards the symbol size while the padding is worked out.
  const prefix = 13 + encodation.method.length + vlfBits + encodation.cdf.length
  const { bits: gpf, mode } = encodeGeneralField(encodation.gpf, prefix, segments)

  const used = prefix + gpf.length
  const padLength = expRemainingBits(used, segments)
  const symbolChars = (used + padLength) / 12

  const binary: number[] = [linkage ? 1 : 0] // linkage flag
  for (const bit of encodation.method) binary.push(bit === "1" ? 1 : 0)
  if (encodation.gpfAllow) {
    binary.push(symbolChars & 1, symbolChars > 14 ? 1 : 0)
  }
  binary.push(...encodation.cdf, ...gpf)

  // Padding latches out of numeric mode first, then repeats the fill pattern.
  const pad: number[] = mode === "numeric" ? [0, 0, 0, 0] : []
  for (let i = 0; pad.length < padLength; i++) pad.push(EXP_FILL_PATTERN[i % 5]!)
  pad.length = padLength
  binary.push(...pad)

  if (binary.length > EXP_MAX_BITS) {
    throw new InvalidInputError("GS1 DataBar Expanded: data too long for a single symbol")
  }
  return binary
}

// ─── DataBar Expanded: symbol characters ────────────────────────────────────

/** Element widths of an Expanded symbol, ready to be laid out. */
interface ExpandedSymbol {
  /** Symbol characters, check character first, in rendering order. */
  chars: number[][]
  /** Finder patterns, one per pair of symbol characters. */
  finders: number[][]
}

/** Encode a 12-bit value as the eight element widths of a symbol character */
function expCharWidths(value: number): number[] {
  const group = expGroup(value)
  const odd = Math.trunc((value - EXP_G_SUM[group]!) / EXP_T_EVEN[group]!)
  const even = (value - EXP_G_SUM[group]!) % EXP_T_EVEN[group]!
  return interleaveWidths(
    odd,
    even,
    EXP_MODULES[group]!,
    17 - EXP_MODULES[group]!,
    4,
    EXP_WIDEST[group]!,
    true,
  )
}

/**
 * Encode GS1 DataBar Expanded data into symbol characters and finder patterns.
 *
 * @param data - GS1 AI string in parenthesized format, or raw element string
 * @param segments - Symbol characters per row (22 when the symbol is not stacked)
 */
function expandedSymbol(data: string, segments: number, linkage = false): ExpandedSymbol {
  const binary = expBinaryString(data, segments, linkage)
  const dataChars = binary.length / 12

  const dataWidths: number[][] = []
  for (let i = 0; i < dataChars; i++) {
    let value = 0
    for (let j = 0; j < 12; j++) {
      if (binary[i * 12 + j]) value |= 0x800 >> j
    }
    dataWidths.push(expCharWidths(value))
  }

  // Checksum (7.2.6): each data character is weighted by the row of Table 14
  // that its position in the finder sequence selects.
  let checksum = 0
  const weightRow = EXP_WEIGHT_ROWS[Math.trunc((dataChars - 2) / 2)]!
  for (let i = 0; i < dataChars; i++) {
    const row = EXP_CHECKSUM_WEIGHT[weightRow[i]!]!
    for (let j = 0; j < 8; j++) checksum += dataWidths[i]![j]! * row[j]!
  }
  const checkValue = 211 * (dataChars - 3) + (checksum % 211)

  // Alternate characters are laid out in reverse; the check character leads.
  const chars: number[][] = [expCharWidths(checkValue)]
  for (let i = 0; i < dataChars; i++) {
    chars.push(i % 2 === 0 ? [...dataWidths[i]!].reverse() : dataWidths[i]!)
  }

  const sequence = EXP_FINDER_SEQUENCE[Math.trunc((dataChars - 2) / 2)]!
  const finders = sequence.map((index) => EXP_FINDER_PATTERN[index - 1]!)

  return { chars, finders }
}

/**
 * Lay out one row of Expanded symbol characters as element widths, in the
 * ISO/IEC 24724 space-first order.
 */
function expRowElements(symbol: ExpandedSymbol, start: number, end: number): number[] {
  const elements: number[] = [1, 1]
  for (let pos = start; pos < end; pos++) {
    elements.push(...symbol.chars[pos]!)
    if (pos % 2 === 0) elements.push(...symbol.finders[pos / 2]!)
  }
  elements.push(1, 1)
  return elements
}

/**
 * Encode GS1 DataBar Expanded
 * Input: GS1 AI string in parenthesized format or raw AI data
 *
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeGS1DataBarExpanded(data: string, options: GS1DataBarOptions = {}): number[] {
  if (data.length === 0) {
    throw new InvalidInputError("GS1 DataBar Expanded: data must not be empty")
  }
  const symbol = expandedSymbol(data, EXP_SEGMENTS_LINEAR, options.linkage)
  return barFirst(expRowElements(symbol, 0, symbol.chars.length))
}

// ─── Stacked Variants ───────────────────────────────────────────────────────

/** Width of every Omnidirectional-family stacked row, in modules. */
const OMN_STACKED_WIDTH = 50

/** Row height of a Stacked Omnidirectional data row, in modules. */
const OMN_STACKED_OMNI_HEIGHT = 33

/** Row height of an Expanded Stacked data row, in modules. */
const EXP_STACKED_HEIGHT = 34

/** Default symbol characters per Expanded Stacked row. */
const EXP_STACKED_SEGMENTS = 4

/** Bottom-row finder pattern that gets the fixed separator of ISO/IEC 24724 */
const OMN_F3_PATTERN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1]

/** Separator drawn under that finder pattern */
const OMN_FINDER_SEPARATOR = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]

/** Expand alternating element widths into one module per unit width. */
function elementsToModules(elements: number[], startsWithBar: boolean): number[] {
  const modules: number[] = []
  let bar = startsWithBar
  for (const width of elements) {
    for (let i = 0; i < width; i++) modules.push(bar ? 1 : 0)
    bar = !bar
  }
  return modules
}

/** Append `count` copies of a module row to a matrix. */
function pushRow(matrix: boolean[][], row: number[], count = 1): void {
  for (let i = 0; i < count; i++) matrix.push(row.map((module) => module === 1))
}

/**
 * A stacked symbol as distinct rows plus the height in modules of each one.
 *
 * The public encoders expand this to one entry per module row; a composite
 * symbol needs the unexpanded form, because it stacks its own rows on top and
 * carries the heights alongside.
 */
export interface StackedRows {
  rows: number[][]
  heights: number[]
}

/** One matrix entry per module row. */
function expandRows({ rows, heights }: StackedRows): boolean[][] {
  const matrix: boolean[][] = []
  for (let i = 0; i < rows.length; i++) pushRow(matrix, rows[i]!, heights[i])
  return matrix
}

/**
 * Blank the four modules at each end of a separator, which always stay light
 * (ISO/IEC 24724 4.3.2).
 */
function padSeparator(separator: number[]): void {
  separator.fill(0, 0, 4)
  separator.fill(0, separator.length - 4, separator.length)
}

/**
 * Fill the part of a separator that runs alongside a finder pattern: a dark
 * module is never repeated under a dark module, so the pattern alternates
 * instead of simply inverting the row (ISO/IEC 24724 4.3.2).
 */
function finderSeparator(row: number[], separator: number[], from: number, to: number): void {
  for (let i = from; i <= to; i++) {
    if (row[i] !== 0) {
      separator[i] = 0
    } else if (row[i - 1] === 1) {
      separator[i] = 1
    } else {
      separator[i] = separator[i - 1] === 0 ? 1 : 0
    }
  }
}

/**
 * Top and bottom rows of a stacked Omnidirectional symbol.
 *
 * The left half keeps the polarity of the linear symbol, which starts on a
 * space; the right half continues it, so its row starts on a bar.
 */
function omniStackedRows(
  gtin: string,
  variant: string,
  linkage = false,
): { top: number[]; bottom: number[] } {
  const { left, right } = omniHalves(gtin, variant, linkage)
  return {
    top: elementsToModules([1, 1, ...left, 1, 1], false),
    bottom: elementsToModules([1, 1, ...right, 1, 1], true),
  }
}

/**
 * Encode GS1 DataBar Stacked
 * Input: 13 or 14 digit GTIN
 *
 * Two rows of 50 modules joined by a one-module separator, 13 modules high in
 * total. Used where a linear symbol does not fit.
 *
 * @returns Module matrix, one row per module row
 */
export function encodeGS1DataBarStacked(
  gtin: string,
  options: GS1DataBarOptions = {},
): boolean[][] {
  return expandRows(gs1DataBarStackedRows(gtin, options))
}

/** Rows of a GS1 DataBar Stacked symbol; see {@link encodeGS1DataBarStacked}. */
export function gs1DataBarStackedRows(gtin: string, options: GS1DataBarOptions = {}): StackedRows {
  const { top, bottom } = omniStackedRows(gtin, "Stacked", options.linkage)

  const separator = Array.from<number>({ length: OMN_STACKED_WIDTH }).fill(0)
  for (let i = 1; i < OMN_STACKED_WIDTH; i++) {
    separator[i] = top[i] === bottom[i] ? 1 - top[i]! : 1 - separator[i - 1]!
  }
  padSeparator(separator)

  return { rows: [top, separator, bottom], heights: [5, 1, 7] }
}

/**
 * Encode GS1 DataBar Stacked Omnidirectional
 * Input: 13 or 14 digit GTIN
 *
 * Two full-height rows separated by a three-module separator, so the symbol
 * still scans omnidirectionally. Common on retail produce.
 *
 * @returns Module matrix, one row per module row
 */
export function encodeGS1DataBarStackedOmni(
  gtin: string,
  options: GS1DataBarOptions = {},
): boolean[][] {
  return expandRows(gs1DataBarStackedOmniRows(gtin, options))
}

/** Rows of a Stacked Omnidirectional symbol; see {@link encodeGS1DataBarStackedOmni}. */
export function gs1DataBarStackedOmniRows(
  gtin: string,
  options: GS1DataBarOptions = {},
): StackedRows {
  const { top, bottom } = omniStackedRows(gtin, "Stacked Omnidirectional", options.linkage)

  const above = top.map((module) => 1 - module)
  padSeparator(above)
  finderSeparator(top, above, 18, 30)

  // The middle separator alternates across the whole symbol width.
  const middle = Array.from<number>({ length: OMN_STACKED_WIDTH }).fill(0)
  for (let i = 4; i < OMN_STACKED_WIDTH - 4; i++) middle[i] = i % 2
  padSeparator(middle)

  const below = bottom.map((module) => 1 - module)
  padSeparator(below)
  finderSeparator(bottom, below, 19, 31)
  if (OMN_F3_PATTERN.every((module, i) => bottom[i + 19] === module)) {
    for (let i = 0; i < OMN_FINDER_SEPARATOR.length; i++) {
      below[i + 19] = OMN_FINDER_SEPARATOR[i]!
    }
  }

  return {
    rows: [top, above, middle, below, bottom],
    heights: [OMN_STACKED_OMNI_HEIGHT, 1, 1, 1, OMN_STACKED_OMNI_HEIGHT],
  }
}

/** Module positions of the finder patterns within an Expanded Stacked row */
function expFinderPositions(width: number): number[] {
  const positions: number[] = []
  // A pair of symbol characters plus its finder spans 49 modules, and the
  // second finder of a four-character row sits 49 modules after the first.
  for (let i = 19; i <= width - 13; i += 98) positions.push(i)
  for (let i = 68; i <= width - 13; i += 98) positions.push(i)
  return positions
}

/**
 * Encode GS1 DataBar Expanded Stacked
 * Input: GS1 AI string in parenthesized format or raw AI data
 *
 * Splits an Expanded symbol over several rows of `segments` symbol characters,
 * each row 34 modules high and joined by three separator rows. The workhorse of
 * variable-weight produce labelling.
 *
 * @param data - GS1 AI string in parenthesized format, or raw element string
 * @param options.segments - Symbol characters per row, even, 2 to 22 (default 4)
 * @returns Module matrix, one row per module row
 */
export function encodeGS1DataBarExpandedStacked(
  data: string,
  options: GS1DataBarOptions & { segments?: number } = {},
): boolean[][] {
  return expandRows(gs1DataBarExpandedStackedRows(data, options))
}

/** Rows of an Expanded Stacked symbol; see {@link encodeGS1DataBarExpandedStacked}. */
export function gs1DataBarExpandedStackedRows(
  data: string,
  options: GS1DataBarOptions & { segments?: number } = {},
): StackedRows {
  if (data.length === 0) {
    throw new InvalidInputError("GS1 DataBar Expanded Stacked: data must not be empty")
  }
  const segments = options.segments ?? EXP_STACKED_SEGMENTS
  if (segments < 2 || segments > 22 || segments % 2 !== 0) {
    throw new InvalidInputError(
      "GS1 DataBar Expanded Stacked: segments must be an even number from 2 to 22",
    )
  }

  const symbol = expandedSymbol(data, segments, options.linkage)
  const rowCount = Math.ceil(symbol.chars.length / segments)

  const rows: number[][] = []
  const separators: number[][] = []

  for (let r = 0; r < rowCount; r++) {
    const elements = expRowElements(
      symbol,
      r * segments,
      Math.min((r + 1) * segments, symbol.chars.length),
    )
    // With an odd number of character pairs per row every other row starts on a
    // bar rather than a space.
    let row = elementsToModules(elements, segments % 4 !== 0 && r % 2 === 1)

    let separator = row.map((module) => 1 - module)
    const finders = expFinderPositions(row.length)
    for (const position of finders) finderSeparator(row, separator, position, position + 14)
    padSeparator(separator)

    // Rows alternate direction so that adjacent finder patterns do not line up.
    if (segments % 4 === 0 && r % 2 === 1) {
      if (row.length !== rows[0]!.length && finders.length % 2 === 1) {
        row = [0, ...row]
        separator = [0, ...separator]
      } else {
        row = [...row].reverse()
        separator = [...separator].reverse()
      }
    }

    rows.push(row)
    separators.push(separator)
  }

  // A short final row is padded with light modules.
  const width = rows[0]!.length
  const last = rows.length - 1
  rows[last] = [
    ...rows[last]!,
    ...Array.from<number>({ length: width - rows[last]!.length }).fill(0),
  ]
  separators[last] = [
    ...separators[last]!,
    ...Array.from<number>({ length: width - separators[last]!.length }).fill(0),
  ]

  // The separator drawn between two rows alternates across the symbol width.
  const between = Array.from<number>({ length: width }).fill(0)
  for (let i = 0; i < width; i++) between[i] = i % 2
  padSeparator(between)

  const out: StackedRows = { rows: [], heights: [] }
  const push = (row: number[], height = 1): void => {
    out.rows.push(row)
    out.heights.push(height)
  }
  for (let r = 0; r < rows.length; r++) {
    if (r !== 0) push(separators[r]!)
    push(rows[r]!, EXP_STACKED_HEIGHT)
    if (r !== rows.length - 1) {
      push(separators[r]!)
      push(between)
    }
  }
  return out
}
