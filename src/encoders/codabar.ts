/**
 * Codabar (NW-7) barcode encoder
 * Self-checking, variable-length symbology
 * Character set: 0-9, -, $, :, /, ., +
 * Start/stop characters: A, B, C, D (case-insensitive)
 */

import { InvalidInputError } from "../errors"

// Codabar character patterns: 7 elements each (BSBSBSB)
// Narrow = 1, Wide = 3
// Source: BWIPP (Barcode Writer in Pure PostScript) reference
const PATTERNS: Record<string, number[]> = {
  "0": [1, 1, 1, 1, 1, 3, 3],
  "1": [1, 1, 1, 1, 3, 3, 1],
  "2": [1, 1, 1, 3, 1, 1, 3],
  "3": [3, 3, 1, 1, 1, 1, 1],
  "4": [1, 1, 3, 1, 1, 3, 1],
  "5": [3, 1, 1, 1, 1, 3, 1],
  "6": [1, 3, 1, 1, 1, 1, 3],
  "7": [1, 3, 1, 1, 3, 1, 1],
  "8": [1, 3, 3, 1, 1, 1, 1],
  "9": [3, 1, 1, 3, 1, 1, 1],
  "-": [1, 1, 1, 3, 3, 1, 1],
  $: [1, 1, 3, 3, 1, 1, 1],
  ":": [3, 1, 1, 1, 3, 1, 3],
  "/": [3, 1, 3, 1, 1, 1, 3],
  ".": [3, 1, 3, 1, 3, 1, 1],
  "+": [1, 1, 3, 1, 3, 1, 3],
  A: [1, 1, 3, 3, 1, 3, 1],
  B: [1, 3, 1, 3, 1, 1, 3],
  C: [1, 1, 1, 3, 1, 3, 3],
  D: [1, 1, 1, 3, 3, 3, 1],
}

// Valid data characters (between start/stop)
const DATA_CHARS = new Set("0123456789-$:/.+")

// Valid start/stop characters
const START_STOP_CHARS = new Set("ABCD")

// Narrow inter-character gap
const GAP = 1

/**
 * Encode a Codabar barcode
 *
 * @param text - Text to encode (0-9, -, $, :, /, ., +). May optionally include
 *               start/stop characters (A-D) as first and last characters.
 * @param options - Encoding options
 * @param options.start - Start character (A, B, C, or D). Default: 'A'
 * @param options.stop - Stop character (A, B, C, or D). Default: 'A'
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeCodabar(text: string, options?: { start?: string; stop?: string }): number[] {
  if (text.length === 0) {
    throw new InvalidInputError("Codabar input must not be empty")
  }

  const upper = text.toUpperCase()

  let startChar: string
  let stopChar: string
  let data: string

  // Check if text already includes start/stop characters
  const firstChar = upper[0]!
  const lastChar = upper[upper.length - 1]!

  if (upper.length >= 2 && START_STOP_CHARS.has(firstChar) && START_STOP_CHARS.has(lastChar)) {
    // Text includes start/stop characters
    startChar = firstChar
    stopChar = lastChar
    data = upper.slice(1, -1)
  } else {
    // Use provided or default start/stop
    startChar = (options?.start ?? "A").toUpperCase()
    stopChar = (options?.stop ?? "A").toUpperCase()
    data = upper
  }

  // Validate start/stop characters
  if (!START_STOP_CHARS.has(startChar)) {
    throw new InvalidInputError(
      `Invalid Codabar start character: '${startChar}'. Must be A, B, C, or D`,
    )
  }
  if (!START_STOP_CHARS.has(stopChar)) {
    throw new InvalidInputError(
      `Invalid Codabar stop character: '${stopChar}'. Must be A, B, C, or D`,
    )
  }

  // Validate data characters
  for (let i = 0; i < data.length; i++) {
    const ch = data[i]!
    if (!DATA_CHARS.has(ch)) {
      throw new InvalidInputError(`Invalid Codabar character: '${ch}' at position ${i}`)
    }
  }

  const bars: number[] = []

  // Start character
  const startPattern = PATTERNS[startChar]!
  for (const w of startPattern) {
    bars.push(w)
  }

  // Inter-character gap after start
  bars.push(GAP)

  // Data characters
  for (let i = 0; i < data.length; i++) {
    const pattern = PATTERNS[data[i]!]!
    for (const w of pattern) {
      bars.push(w)
    }
    bars.push(GAP) // inter-character gap
  }

  // Stop character
  const stopPattern = PATTERNS[stopChar]!
  for (const w of stopPattern) {
    bars.push(w)
  }

  return bars
}
