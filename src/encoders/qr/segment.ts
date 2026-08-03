/**
 * Optimal segment mode switching for QR codes
 *
 * Determines whether to switch encoding modes or keep the current mode
 * based on the overhead of mode switching vs. the savings from using
 * a more efficient mode.
 *
 * The key insight: switching modes costs 4 bits (mode indicator) + N bits
 * (character count indicator). If the savings from the new mode don't
 * exceed this overhead, it's better to stay in the current mode.
 */

import type { QRSegment } from "./types"
import { getCharCountBits, ALPHANUMERIC_CHARS } from "./tables"

type Mode = "numeric" | "alphanumeric" | "byte"

/** Bits per character in each mode */
function bitsPerChar(mode: Mode): number {
  switch (mode) {
    case "numeric":
      return 10 / 3 // ~3.33 bits per digit
    case "alphanumeric":
      return 11 / 2 // 5.5 bits per char
    case "byte":
      return 8
  }
}

/** Mode switch cost: 4 bits (mode indicator) + character count bits */
function switchCost(version: number, targetMode: Mode): number {
  return 4 + getCharCountBits(version, targetMode)
}

/** Detect the most efficient mode for a single character */
function charMode(char: string): Mode {
  if (char >= "0" && char <= "9") return "numeric"
  if (ALPHANUMERIC_CHARS.includes(char)) return "alphanumeric"
  return "byte"
}

/**
 * Split text into optimized segments that minimize total encoded bit length.
 *
 * Uses a greedy look-ahead approach:
 * 1. Start in the most efficient mode for the first character
 * 2. At each mode boundary, look ahead to see how long the new mode run is
 * 3. If the savings from switching exceed the switch cost, switch
 * 4. Otherwise, stay in the current (less efficient but cheaper) mode
 */
export function optimizeSegments(text: string, version: number): QRSegment[] {
  if (text.length === 0) return []

  const segments: QRSegment[] = []
  let currentMode: Mode = charMode(text[0]!)
  let segStart = 0

  let i = 1
  while (i < text.length) {
    const cm = charMode(text[i]!)

    if (cm === currentMode) {
      i++
      continue
    }

    // Different mode detected — should we switch?
    // Count how many consecutive chars are in the new mode
    let runLen = 1
    let j = i + 1
    while (j < text.length && charMode(text[j]!) === cm) {
      runLen++
      j++
    }

    // Calculate: is switching cheaper than encoding in current mode?
    const costInCurrent = runLen * bitsPerChar(currentMode)
    const costInNew = switchCost(version, cm) + runLen * bitsPerChar(cm)

    if (costInNew < costInCurrent) {
      // Switch: flush current segment, start new one
      pushSegment(segments, text, segStart, i, currentMode)
      currentMode = cm
      segStart = i
    }
    // Else: stay in current mode (absorb the chars)

    i = j
  }

  // Flush final segment
  pushSegment(segments, text, segStart, text.length, currentMode)

  return segments
}

function pushSegment(
  segments: QRSegment[],
  text: string,
  start: number,
  end: number,
  mode: Mode,
): void {
  const segText = text.substring(start, end)
  const data = new TextEncoder().encode(segText)
  segments.push({
    mode,
    data,
    charCount: mode === "byte" ? data.length : segText.length,
  })
}
