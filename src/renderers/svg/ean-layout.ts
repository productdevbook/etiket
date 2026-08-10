/**
 * The human readable layout of an EAN or UPC symbol.
 *
 * A retail barcode does not print its digits as one centred line. The guard
 * patterns run past the other bars, the digits sit in the gaps they leave, and
 * the digits that fall outside the symbol — the lead digit of an EAN-13, both
 * ends of a UPC-A — are printed in the quiet zones. That layout is what makes a
 * retail symbol recognisable, and it is only derivable here, where the
 * symbology and the guard positions are both known.
 */

/** Where a run of digits is centred, in modules from the left edge of the symbol. */
export interface EANTextSegment {
  text: string
  center: number
}

export interface EANLayout {
  /** Element indices of the guard bars, which run into the text band. */
  guardBars: number[]
  textSegments: EANTextSegment[]
}

/** Every EAN/UPC symbol starts with a three element guard: bar, space, bar. */
const START_BARS = [0, 2]

/** A middle guard is space, bar, space, bar, space. */
function middleBars(at: number): number[] {
  return [at + 1, at + 3]
}

/** Modules a digit takes in the data area. */
const DIGIT = 7

/**
 * Lay out the digits of an EAN or UPC symbol.
 *
 * @param type - Symbology
 * @param digits - The full number, check digit included
 * @param guards - Element index of each guard pattern, as the encoders report
 * @returns The layout, or undefined when the digits do not match the symbology
 */
export function eanLayout(
  type: "ean13" | "ean8" | "upca" | "upce",
  digits: string,
  guards: number[],
): EANLayout | undefined {
  const [start, middle, end] = guards
  if (start === undefined || middle === undefined) return undefined

  // The left data area begins after the three element start guard.
  const left = 3

  if (type === "ean13" && digits.length === 13) {
    const right = left + 6 * DIGIT + 5
    return {
      guardBars: [...START_BARS, ...middleBars(middle), end!, end! + 2],
      textSegments: [
        { text: digits.slice(0, 1), center: -4 },
        { text: digits.slice(1, 7), center: left + 3 * DIGIT },
        { text: digits.slice(7), center: right + 3 * DIGIT },
      ],
    }
  }

  if (type === "ean8" && digits.length === 8) {
    const right = left + 4 * DIGIT + 5
    return {
      guardBars: [...START_BARS, ...middleBars(middle), end!, end! + 2],
      textSegments: [
        { text: digits.slice(0, 4), center: left + 2 * DIGIT },
        { text: digits.slice(4), center: right + 2 * DIGIT },
      ],
    }
  }

  if (type === "upca" && digits.length === 12) {
    // The number system digit and the check digit are printed outside the
    // symbol, so each half shows five of its six digits.
    const right = left + 6 * DIGIT + 5
    return {
      guardBars: [...START_BARS, ...middleBars(middle), end!, end! + 2],
      textSegments: [
        { text: digits.slice(0, 1), center: -4 },
        { text: digits.slice(1, 6), center: left + DIGIT + 2.5 * DIGIT },
        { text: digits.slice(6, 11), center: right + 2.5 * DIGIT },
        { text: digits.slice(11), center: right + 6 * DIGIT + 3 + 4 },
      ],
    }
  }

  if (type === "upce" && digits.length === 8) {
    // Six digits under the symbol, the number system and check digit outside.
    // The end guard is six elements — space, bar, space, bar, space, bar.
    return {
      guardBars: [...START_BARS, middle + 1, middle + 3, middle + 5],
      textSegments: [
        { text: digits.slice(0, 1), center: -4 },
        { text: digits.slice(1, 7), center: left + 3 * DIGIT },
        { text: digits.slice(7), center: left + 6 * DIGIT + 6 + 4 },
      ],
    }
  }

  return undefined
}
