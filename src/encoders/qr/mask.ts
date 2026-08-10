/**
 * QR Code mask patterns and penalty evaluation
 * 8 mask patterns, 4 penalty rules
 */

import type { Module } from "./matrix"
import { isDataModule } from "./matrix"

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
 * Select the best mask pattern by evaluating all 8 masks
 * Returns the mask number with the lowest penalty score
 */
export function selectBestMask(
  matrix: Module[][],
  size: number,
  version: number,
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
 * Rules 1 and 3 read a row and a column in the same pass; rule 2 reads the
 * square below and to the right of each module; rule 4 counts the dark ones.
 */
function penalty(modules: Uint8Array, size: number): number {
  let score = 0
  let dark = 0

  for (let i = 0; i < size; i++) {
    let rowRun = 1
    let colRun = 1
    // The five element window rules 3 looks for, as a rolling value
    let rowWindow = 0
    let colWindow = 0
    for (let j = 0; j < size; j++) {
      const row = modules[i * size + j]!
      const col = modules[j * size + i]!
      dark += row

      if (j > 0) {
        if (row === modules[i * size + j - 1]!) {
          rowRun++
          if (rowRun === 5) score += 3
          else if (rowRun > 5) score++
        } else rowRun = 1

        if (col === modules[(j - 1) * size + i]!) {
          colRun++
          if (colRun === 5) score += 3
          else if (colRun > 5) score++
        } else colRun = 1
      }

      rowWindow = ((rowWindow << 1) | row) & 0x7ff
      colWindow = ((colWindow << 1) | col) & 0x7ff
      if (j >= 10) {
        if (rowWindow === 0x5d0 || rowWindow === 0x05d) score += 40
        if (colWindow === 0x5d0 || colWindow === 0x05d) score += 40
      }
    }
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

  const percent = (dark * 100) / (size * size)
  const previous = Math.floor(percent / 5) * 5
  return score + Math.min(Math.abs(previous - 50), Math.abs(previous + 5 - 50)) * 2
}

/**
 * Evaluate penalty score for a masked matrix
 * Implements all 4 penalty rules from the QR code spec
 */
export function evaluatePenalty(matrix: Module[][], size: number): number {
  return (
    penaltyRule1(matrix, size) +
    penaltyRule2(matrix, size) +
    penaltyRule3(matrix, size) +
    penaltyRule4(matrix, size)
  )
}

/**
 * Rule N1: Consecutive same-color modules in row/column
 * 5+ same-color → 3 + (count - 5) points
 */
function penaltyRule1(matrix: Module[][], size: number): number {
  let score = 0

  // Rows
  for (let r = 0; r < size; r++) {
    let count = 1
    for (let c = 1; c < size; c++) {
      if (!!matrix[r]![c] === !!matrix[r]![c - 1]) {
        count++
        if (count === 5) score += 3
        else if (count > 5) score++
      } else {
        count = 1
      }
    }
  }

  // Columns
  for (let c = 0; c < size; c++) {
    let count = 1
    for (let r = 1; r < size; r++) {
      if (!!matrix[r]![c] === !!matrix[r - 1]![c]) {
        count++
        if (count === 5) score += 3
        else if (count > 5) score++
      } else {
        count = 1
      }
    }
  }

  return score
}

/**
 * Rule N2: 2x2 same-color blocks
 * 3 points for each 2x2 block of same color
 */
function penaltyRule2(matrix: Module[][], size: number): number {
  let score = 0

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const val = !!matrix[r]![c]
      if (
        val === !!matrix[r]![c + 1] &&
        val === !!matrix[r + 1]![c] &&
        val === !!matrix[r + 1]![c + 1]
      ) {
        score += 3
      }
    }
  }

  return score
}

/**
 * Rule N3: Finder-like patterns (1:1:3:1:1)
 * 40 points for each occurrence of the pattern
 * Pattern: dark-light-dark(3)-light-dark followed/preceded by 4 light modules
 */
function penaltyRule3(matrix: Module[][], size: number): number {
  let score = 0
  // Pattern: 1,0,1,1,1,0,1,0,0,0,0 or 0,0,0,0,1,0,1,1,1,0,1
  const p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
  const p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      let match1 = true
      let match2 = true
      for (let i = 0; i < 11; i++) {
        const val = matrix[r]![c + i] ? 1 : 0
        if (val !== p1[i]) match1 = false
        if (val !== p2[i]) match2 = false
        if (!match1 && !match2) break
      }
      if (match1) score += 40
      if (match2) score += 40
    }
  }

  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      let match1 = true
      let match2 = true
      for (let i = 0; i < 11; i++) {
        const val = matrix[r + i]![c] ? 1 : 0
        if (val !== p1[i]) match1 = false
        if (val !== p2[i]) match2 = false
        if (!match1 && !match2) break
      }
      if (match1) score += 40
      if (match2) score += 40
    }
  }

  return score
}

/**
 * Rule N4: Dark module proportion
 * Deviation from 50% in steps of 5%
 * 10 points per 5% step
 */
function penaltyRule4(matrix: Module[][], size: number): number {
  let dark = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r]![c]) dark++
    }
  }
  const total = size * size
  const percent = (dark * 100) / total
  const prev5 = Math.floor(percent / 5) * 5
  const next5 = prev5 + 5
  return Math.min(Math.abs(prev5 - 50) / 5, Math.abs(next5 - 50) / 5) * 10
}
