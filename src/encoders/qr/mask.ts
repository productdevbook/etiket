/**
 * QR Code mask patterns and penalty evaluation
 * 8 mask patterns, 4 penalty rules
 */

import type { Module } from "./matrix"
import { isDataModule } from "./matrix"
import { forEachFormatCell } from "./format"
import type { ErrorCorrectionLevel } from "./types"

/** Get mask function for a given mask pattern (0-7) */
export function getMaskFn(mask: number): (r: number, c: number) => boolean {
  switch (mask) {
    case 0:
      return (r, c) => (r + c) % 2 === 0
    case 1:
      return (r) => r % 2 === 0
    case 2:
      return (_, c) => c % 3 === 0
    case 3:
      return (r, c) => (r + c) % 3 === 0
    case 4:
      return (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
    case 5:
      return (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0
    case 6:
      return (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0
    case 7:
      return (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
    default:
      return () => false
  }
}

/** Apply a mask pattern to the matrix (only data modules) */
export function applyMask(matrix: Module[][], mask: number, size: number, version: number): void {
  const fn = getMaskFn(mask)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isDataModule(r, c, size, version)) {
        if (fn(r, c)) {
          matrix[r]![c] = !matrix[r]![c]
        }
      }
    }
  }
}

/**
 * Select the best mask pattern by evaluating all 8 masks, each with its own
 * format information and with the version information already in `matrix`
 * Returns the mask number with the lowest penalty score
 */
export function selectBestMask(
  matrix: Module[][],
  size: number,
  version: number,
  ecLevel: ErrorCorrectionLevel,
  requestedMask?: number,
): number {
  if (requestedMask !== undefined && requestedMask >= 0 && requestedMask <= 7) {
    return requestedMask
  }

  // Scoring eight candidates is most of the work of encoding a QR code, so the
  // symbol is flattened once — one byte a module, and which modules are data
  // worked out once rather than eight times — and each mask is written into the
  // same buffer rather than into a copy of the matrix.
  const modules = new Uint8Array(size * size)
  const data = new Uint8Array(size * size)
  for (let r = 0; r < size; r++) {
    const row = matrix[r]!
    for (let c = 0; c < size; c++) {
      modules[r * size + c] = row[c] ? 1 : 0
      data[r * size + c] = isDataModule(r, c, size, version) ? 1 : 0
    }
  }

  const masked = new Uint8Array(size * size)
  let bestMask = 0
  let bestScore = Infinity

  for (let mask = 0; mask < 8; mask++) {
    const fn = getMaskFn(mask)
    for (let r = 0; r < size; r++) {
      const offset = r * size
      for (let c = 0; c < size; c++) {
        const i = offset + c
        masked[i] = data[i] && fn(r, c) ? modules[i]! ^ 1 : modules[i]!
      }
    }
    // The format bits depend on the mask, so they are part of what is scored
    forEachFormatCell(size, ecLevel, mask, (r, c, bit) => {
      masked[r * size + c] = bit
    })
    const score = penalty(masked, size)
    if (score < bestScore) {
      bestScore = score
      bestMask = mask
    }
  }

  return bestMask
}

/**
 * The four penalty rules of ISO/IEC 18004 7.8.3.1, over a flattened symbol.
 *
 * Rule 3 follows Nayuki's reading of it: a 1:1:3:1:1 run pattern of any scale,
 * with four light modules of the same scale on one side, where the area beyond
 * the symbol counts as light. Rule 4 counts steps of 5% from half dark.
 */
function penalty(modules: Uint8Array, size: number): number {
  let score = 0
  let dark = 0
  const rowHistory = new Int32Array(7)
  const colHistory = new Int32Array(7)

  for (let i = 0; i < size; i++) {
    rowHistory.fill(0)
    colHistory.fill(0)
    let rowColor = 0
    let colColor = 0
    let rowRun = 0
    let colRun = 0
    for (let j = 0; j < size; j++) {
      const row = modules[i * size + j]!
      const col = modules[j * size + i]!
      dark += row

      if (row === rowColor) {
        rowRun++
        if (rowRun === 5) score += 3
        else if (rowRun > 5) score++
      } else {
        addRun(rowHistory, rowRun, size)
        if (!rowColor) score += countFinderLike(rowHistory) * 40
        rowColor = row
        rowRun = 1
      }

      if (col === colColor) {
        colRun++
        if (colRun === 5) score += 3
        else if (colRun > 5) score++
      } else {
        addRun(colHistory, colRun, size)
        if (!colColor) score += countFinderLike(colHistory) * 40
        colColor = col
        colRun = 1
      }
    }
    score += endRuns(rowHistory, rowColor, rowRun, size) * 40
    score += endRuns(colHistory, colColor, colRun, size) * 40
  }

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const value = modules[r * size + c]!
      if (
        value === modules[r * size + c + 1]! &&
        value === modules[(r + 1) * size + c]! &&
        value === modules[(r + 1) * size + c + 1]!
      ) {
        score += 3
      }
    }
  }

  const total = size * size
  const steps = Math.max(0, Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1)
  return score + steps * 10
}

/** Push a finished run onto the history, the first one lengthened by the light border */
function addRun(history: Int32Array, length: number, size: number): void {
  if (history[0] === 0) length += size
  history.copyWithin(1, 0, 6)
  history[0] = length
}

/** How many ends of the last five runs read as a finder-like pattern: 0, 1 or 2 */
function countFinderLike(history: Int32Array): number {
  const n = history[1]!
  const core =
    n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n
  if (!core) return 0
  return (
    (history[0]! >= n * 4 && history[6]! >= n ? 1 : 0) +
    (history[6]! >= n * 4 && history[0]! >= n ? 1 : 0)
  )
}

/** Close the line with the light border beyond it, then count */
function endRuns(history: Int32Array, color: number, length: number, size: number): number {
  if (color) {
    addRun(history, length, size)
    length = 0
  }
  addRun(history, length + size, size)
  return countFinderLike(history)
}

/** Penalty score of a masked matrix, as the encoder weighs the candidates */
export function evaluatePenalty(matrix: Module[][], size: number): number {
  const modules = new Uint8Array(size * size)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) modules[r * size + c] = matrix[r]![c] ? 1 : 0
  }
  return penalty(modules, size)
}
