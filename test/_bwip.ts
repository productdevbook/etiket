/**
 * bwip-js (BWIPP) oracle helpers for cross-verification tests.
 *
 * bwip-js exposes `raw()`, which runs the BWIPP PostScript encoder and returns the
 * pre-render module data instead of a picture. That gives us structured data to
 * compare against — no SVG parsing involved:
 *
 * - linear symbologies -> `sbs` (space/bar sequence, starting with a bar)
 * - matrix / stacked   -> `pixs` + `pixx` (row-major module array + module width)
 * - postal symbologies -> `bbs` + `bhs` (per-bar baseline offset + bar height)
 *
 * Everything here is test-only; nothing from `src/` is imported.
 */

import bwipjs from "bwip-js/generic"

/** Raw BWIPP output for a linear or postal symbology. */
interface BwipBars {
  /** Alternating bar/space widths, starting with a bar. */
  sbs: number[]
  /** Per-bar baseline offset (distance from the bottom of the symbol). */
  bbs: number[]
  /** Per-bar height. */
  bhs: number[]
  /** Human readable text, when BWIPP derives one. */
  txt?: unknown
}

/** Raw BWIPP output for a matrix or stacked symbology. */
interface BwipPixels {
  pixs: number[]
  pixx: number
  pixy: number
}

export type BwipOptions = Record<string, unknown>

function rawEncode(bcid: string, text: string, options: BwipOptions = {}): unknown {
  const raw = (
    bwipjs as unknown as {
      raw: (opts: Record<string, unknown>) => unknown[]
    }
  ).raw
  const parts = raw({ bcid, text, ...options })
  if (parts.length === 0) throw new Error(`bwip-js returned no parts for ${bcid}`)
  return parts[0]
}

// ---------------------------------------------------------------------------
// Linear
// ---------------------------------------------------------------------------

/**
 * BWIPP renders every symbol at its own natural module size, so `sbs` can come
 * back in fractional units (postal symbologies in particular). Rescale so the
 * narrowest element is exactly 1.
 */
function toModuleWidths(sbs: number[]): number[] {
  const unit = Math.min(...sbs)
  return sbs.map((v) => Math.round(v / unit))
}

/**
 * BWIPP includes the trailing inter-character gap for symbologies that have one;
 * etiket stops at the final bar. Normalise both to "ends on a bar".
 */
export function trimTrailingSpace(widths: number[]): number[] {
  return widths.length % 2 === 0 ? widths.slice(0, -1) : widths
}

/** Bar/space widths for a linear symbology, in modules, ending on a bar. */
export function bwipBars(bcid: string, text: string, options: BwipOptions = {}): number[] {
  const part = rawEncode(bcid, text, options) as BwipBars
  if (!part.sbs) throw new Error(`bwip-js produced no linear data for ${bcid}`)
  return trimTrailingSpace(toModuleWidths(part.sbs))
}

/** The human-readable text BWIPP derived for the symbol, if any. */
export function bwipText(bcid: string, text: string, options: BwipOptions = {}): string {
  const part = rawEncode(bcid, text, options) as BwipBars
  const txt = part.txt
  if (!Array.isArray(txt)) return ""
  return txt.map((entry) => (Array.isArray(entry) ? String(entry[0]) : String(entry))).join("")
}

/**
 * Collapse absolute widths to their *rank* within the symbol, computing bars and
 * spaces independently.
 *
 * Two-width symbologies (Code 39, ITF, Code 11, MSI, Codabar, Pharmacode, ...)
 * allow a range of wide:narrow ratios, and etiket and BWIPP legitimately pick
 * different ones. Ranking makes the comparison about the narrow/wide *pattern*,
 * which is the part that carries the data.
 */
export function widthRanks(widths: number[]): number[] {
  const rank = (values: number[]) => {
    const distinct = [...new Set(values)].sort((a, b) => a - b)
    return new Map(distinct.map((v, i) => [v, i]))
  }
  const bars = rank(widths.filter((_, i) => i % 2 === 0))
  const spaces = rank(widths.filter((_, i) => i % 2 === 1))
  return widths.map((w, i) => (i % 2 === 0 ? bars.get(w)! : spaces.get(w)!))
}

// ---------------------------------------------------------------------------
// Matrix / stacked
// ---------------------------------------------------------------------------

/**
 * Module grid for a matrix or stacked symbology.
 *
 * `pixy` is the *rendered* height (BWIPP scales stacked rows vertically), so the
 * logical row count is derived from the array length instead.
 */
export function bwipMatrix(bcid: string, text: string, options: BwipOptions = {}): boolean[][] {
  const part = rawEncode(bcid, text, options) as BwipPixels
  if (!part.pixs) throw new Error(`bwip-js produced no matrix data for ${bcid}`)
  const width = part.pixx
  const rows = part.pixs.length / width
  const matrix: boolean[][] = []
  for (let y = 0; y < rows; y++) {
    const row: boolean[] = []
    for (let x = 0; x < width; x++) row.push(!!part.pixs[y * width + x])
    matrix.push(row)
  }
  return matrix
}

// ---------------------------------------------------------------------------
// Postal
// ---------------------------------------------------------------------------

/** 4-state bar states, matching etiket's `FourState` alphabet. */
export type BwipState = "T" | "A" | "D" | "F"

/**
 * Per-bar states for a height-modulated symbology.
 *
 * A bar has an ascender when its top reaches the tallest top in the symbol, and a
 * descender when its baseline sits at the lowest baseline. For 2-state formats
 * (POSTNET/PLANET) every bar has a descender, so tall bars come back as `F` and
 * short bars as `D`.
 */
export function bwipStates(bcid: string, text: string, options: BwipOptions = {}): BwipState[] {
  const part = rawEncode(bcid, text, options) as BwipBars
  if (!part.bhs || !part.bbs) throw new Error(`bwip-js produced no postal data for ${bcid}`)
  const tops = part.bbs.map((b, i) => b + part.bhs[i]!)
  const maxTop = Math.max(...tops)
  const minBottom = Math.min(...part.bbs)
  const eps = 1e-6
  return part.bbs.map((bottom, i) => {
    const ascender = tops[i]! > maxTop - eps
    const descender = bottom < minBottom + eps
    if (ascender && descender) return "F"
    if (ascender) return "A"
    if (descender) return "D"
    return "T"
  })
}

/**
 * Bar states of a two-track symbology: lower track, upper track, or both.
 *
 * `bwipStates` reads the extremes out of the symbol itself, which cannot tell a
 * symbol whose bars all sit on one track from one whose bars all span both —
 * two tracks are only two states apart. This reads the geometry absolutely
 * instead: BWIPP draws a track `height / 25.4` deep, so a bar half again as
 * tall as that spans both tracks and one starting above the baseline is on the
 * upper one.
 */
export function bwipTwoTrack(bcid: string, text: string, height = 4): BwipState[] {
  const part = rawEncode(bcid, text, { height }) as BwipBars
  if (!part.bhs || !part.bbs) throw new Error(`bwip-js produced no postal data for ${bcid}`)
  const track = height / 25.4
  return part.bbs.map((bottom, i) =>
    part.bhs![i]! > track * 1.5 ? "F" : bottom > track * 0.5 ? "A" : "D",
  )
}

/** Tall (1) / short (0) bars for a 2-state postal symbology such as POSTNET. */
export function bwipTallBars(bcid: string, text: string, options: BwipOptions = {}): number[] {
  return bwipStates(bcid, text, options).map((s) => (s === "F" || s === "A" ? 1 : 0))
}

// ---------------------------------------------------------------------------
// Divergence reporting
// ---------------------------------------------------------------------------

/** Describe how two sequences differ, for failure messages. */
export function describeDiff(actual: readonly unknown[], expected: readonly unknown[]): string {
  if (actual.length !== expected.length) {
    return `length ${actual.length} vs bwip-js ${expected.length}`
  }
  const at: number[] = []
  for (let i = 0; i < actual.length; i++) {
    if (String(actual[i]) !== String(expected[i])) at.push(i)
  }
  if (at.length === 0) return "identical"
  return `${at.length}/${actual.length} elements differ, first at index ${at[0]}`
}
