/**
 * Pharmacode (Pharmaceutical Binary Code) barcode encoder
 * Used in pharmaceutical industry for packaging control
 * Encodes numeric values from 3 to 131070
 */

import { InvalidInputError } from "../errors"

// Bar widths: thin bar = 2 modules, thick bar = 4 modules
const THIN_BAR = 2
const THICK_BAR = 4

// Gap between bars: 2 modules
const GAP = 2

/**
 * Encode a Pharmacode barcode
 *
 * The encoding algorithm works by repeatedly dividing the value:
 * - If even: thick bar, value = (value - 2) / 2
 * - If odd: thin bar, value = (value - 1) / 2
 * Bars are generated right-to-left and then reversed.
 *
 * @param value - Numeric value to encode (integer, 3 to 131070 inclusive)
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodePharmacode(value: number): number[] {
  if (!Number.isInteger(value)) {
    throw new InvalidInputError(`Pharmacode value must be an integer, got ${value}`)
  }

  if (value < 3 || value > 131070) {
    throw new InvalidInputError(`Pharmacode value must be between 3 and 131070, got ${value}`)
  }

  // Generate bar widths (right-to-left)
  const barWidths: number[] = []
  let num = value

  while (num > 0) {
    if (num % 2 === 0) {
      barWidths.unshift(THICK_BAR)
      num = (num - 2) / 2
    } else {
      barWidths.unshift(THIN_BAR)
      num = (num - 1) / 2
    }
  }

  // Convert to alternating bar/space array
  const bars: number[] = []
  for (let i = 0; i < barWidths.length; i++) {
    bars.push(barWidths[i]!)
    if (i < barWidths.length - 1) {
      bars.push(GAP) // gap between bars
    }
  }

  return bars
}
