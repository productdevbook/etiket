/**
 * JAB Code — polychrome 2D symbol, 4 or 8 colours instead of black and white.
 *
 * @experimental **This encoder is not ISO/IEC 23634 conformant.** The error
 * correction is an XOR parity scheme, not the standard's LDPC codes, and the
 * metadata and finder patterns do not follow the specification either. Symbols
 * are visually plausible and self-consistent, but no conforming reader will
 * decode them.
 *
 * It stays in the library because there is no way to fix it responsibly: no
 * JavaScript or WebAssembly JAB decoder exists, and neither zxing nor BWIPP
 * implements the symbology, so a "corrected" implementation could not be
 * verified against anything — which is how the previous encoders in this
 * library ended up producing confident, unreadable output. Every other
 * symbology here is checked against a real decoder or the reference
 * implementation; this one cannot be, and says so.
 *
 * Output is a matrix of palette indices, not booleans: each cell carries 0-3
 * for the 4-colour palette and 0-7 for the 8-colour one. That is also why
 * `encode()` does not accept `"jabcode"` — its result type is a boolean matrix.
 */

import { InvalidInputError, CapacityError } from "../errors"

/** JAB Code color palette — 4-color default */
export const JAB_COLORS_4 = ["#000000", "#FF0000", "#00FF00", "#0000FF"] as const
/** 8-color palette */
export const JAB_COLORS_8 = [
  "#000000",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFFFFF",
] as const

export interface JABCodeOptions {
  /** Number of colors: 4 or 8 (default 4) */
  colors?: 4 | 8
  /** EC percentage (default 20) */
  ecPercent?: number
}

export interface JABCodeResult {
  /** 2D matrix of color indices (0 to colors-1) */
  matrix: number[][]
  /** Number of rows */
  rows: number
  /** Number of columns */
  cols: number
  /** Color palette */
  palette: readonly string[]
}

// ---------------------------------------------------------------------------
// LDPC-like XOR-parity error correction
// ---------------------------------------------------------------------------

/**
 * Simple deterministic PRNG (xorshift32) for reproducible parity matrices.
 * Returns values in [0, 2^32).
 */
function xorshift32(state: number): [number, number] {
  let s = state | 0
  s ^= s << 13
  s ^= s >>> 17
  s ^= s << 5
  // Ensure unsigned 32-bit
  s = s >>> 0
  return [s, s]
}

/**
 * Generate LDPC-like parity bits using a sparse parity-check approach.
 *
 * For each parity bit, a pseudo-random subset of data bits is XOR-combined.
 * The subset selection uses a deterministic PRNG seeded from the parity bit
 * index, ensuring reproducibility.
 *
 * Each parity bit checks `checksPerParity` data bits, giving a sparse
 * parity-check matrix similar to LDPC codes. This provides significantly
 * better error detection/correction than simple data repetition.
 *
 * @param dataBits - Input data bits
 * @param numParityBits - Number of parity bits to generate
 * @returns Array of parity bits (0 or 1)
 */
function computeLDPCParityBits(dataBits: number[], numParityBits: number): number[] {
  const n = dataBits.length
  if (n === 0) return []

  // Each parity bit checks a subset of data bits.
  // Use ~sqrt(n) checks per parity for good sparsity, minimum 3.
  const checksPerParity = Math.max(3, Math.min(n, Math.ceil(Math.sqrt(n))))

  const parityBits: number[] = []

  for (let p = 0; p < numParityBits; p++) {
    // Seed the PRNG with a value derived from the parity bit index
    // Use a large prime multiplier for good distribution
    let prngState = ((p + 1) * 2654435761) >>> 0

    // Select `checksPerParity` distinct data bit indices
    const indices = new Set<number>()
    let iterations = 0
    while (indices.size < checksPerParity && iterations < checksPerParity * 10) {
      const [nextState, val] = xorshift32(prngState)
      prngState = nextState
      indices.add(val % n)
      iterations++
    }

    // Compute parity as XOR of selected data bits
    let parity = 0
    for (const idx of indices) {
      parity ^= dataBits[idx]!
    }
    parityBits.push(parity)
  }

  return parityBits
}

// ---------------------------------------------------------------------------
// Metadata encoding
// ---------------------------------------------------------------------------

/**
 * Encode symbol metadata as a bit sequence.
 * Encodes: palette size (4 or 8), EC level, data length.
 * This allows a decoder to know the symbol parameters.
 *
 * Format (16 bits):
 *  - Bit 0: palette flag (0 = 4-color, 1 = 8-color)
 *  - Bits 1-5: EC percent / 4 (0-31 → 0-124%)
 *  - Bits 6-15: data byte length (0-1023)
 */
function encodeMetadata(numColors: number, ecPercent: number, dataLength: number): number[] {
  const bits: number[] = []

  // Bit 0: palette flag
  bits.push(numColors === 8 ? 1 : 0)

  // Bits 1-5: EC percent (quantized to 5 bits)
  const ecQuantized = Math.min(31, Math.floor(ecPercent / 4))
  for (let i = 4; i >= 0; i--) {
    bits.push((ecQuantized >> i) & 1)
  }

  // Bits 6-15: data byte length (10 bits, max 1023)
  const len = Math.min(1023, dataLength)
  for (let i = 9; i >= 0; i--) {
    bits.push((len >> i) & 1)
  }

  return bits
}

// ---------------------------------------------------------------------------
// Finder patterns
// ---------------------------------------------------------------------------

/**
 * Place a JAB Code finder pattern at the given position.
 * JAB Code finders use multiple colors to help the decoder identify
 * color palette and orientation. The pattern uses a 7x7 structure:
 * - Outer ring: alternating colors 0 and 2
 * - Middle ring: color 1
 * - Inner 3x3: color 3 (or 0 for 4-color to distinguish corners)
 *
 * Each corner uses a different inner color to encode orientation.
 */
function placeJABFinder(
  matrix: number[][],
  row: number,
  col: number,
  cornerIndex: number,
  numColors: number,
): void {
  const maxR = matrix.length
  const maxC = matrix[0]!.length

  // Inner color varies by corner for orientation detection
  // Corner 0 (TL)=0, 1 (TR)=1, 2 (BL)=2, 3 (BR)=3
  const innerColor = cornerIndex % numColors

  // Middle ring color
  const midColor = 1 % numColors

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const rr = row + r
      const cc = col + c
      if (rr >= maxR || cc >= maxC) continue

      // Determine which ring this cell belongs to
      const isOuterEdge = r === 0 || r === 6 || c === 0 || c === 6
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4

      if (isInner) {
        // Inner 3x3 block — corner-specific color
        matrix[rr]![cc] = innerColor
      } else if (isOuterEdge) {
        // Outer ring — alternating colors 0 and 2
        const alt = (r + c) % 2
        matrix[rr]![cc] = alt === 0 ? 0 : 2 % numColors
      } else {
        // Middle ring
        matrix[rr]![cc] = midColor
      }
    }
  }

  // Separator (color 0) — one cell border around the finder
  for (let i = -1; i <= 7; i++) {
    const rr = row + 7
    const cc = col + i
    if (rr >= 0 && rr < maxR && cc >= 0 && cc < maxC) {
      matrix[rr]![cc] = 0
    }
    const rr2 = row + i
    const cc2 = col + 7
    if (rr2 >= 0 && rr2 < maxR && cc2 >= 0 && cc2 < maxC) {
      matrix[rr2]![cc2] = 0
    }
  }
}

// ---------------------------------------------------------------------------
// Main encoder
// ---------------------------------------------------------------------------

/**
 * Comfortably past what any JAB Code symbol holds, so that a caller passing a
 * megabyte of text is answered rather than waited on.
 */
const MAX_JAB_CODE_CHARACTERS = 8000

/**
 * Encode text as JAB Code
 * Returns a color index matrix (not boolean — each cell is a color index)
 */
export function encodeJABCode(text: string, options: JABCodeOptions = {}): JABCodeResult {
  if (text.length === 0) {
    throw new InvalidInputError("JAB Code input must not be empty")
  }
  if (text.length > MAX_JAB_CODE_CHARACTERS) {
    throw new CapacityError(
      `Data too long for JAB Code: ${text.length} characters is past what any symbol holds`,
    )
  }

  const numColors = options.colors ?? 4
  const ecPercent = options.ecPercent ?? 20
  const bitsPerCell = numColors === 8 ? 3 : 2 // 4 colors = 2 bits, 8 colors = 3 bits
  const palette = numColors === 8 ? JAB_COLORS_8 : JAB_COLORS_4

  // Encode data as bytes
  const data = new TextEncoder().encode(text)
  const dataBits: number[] = []
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) {
      dataBits.push((byte >> i) & 1)
    }
  }

  // Encode metadata
  const metaBits = encodeMetadata(numColors, ecPercent, data.length)

  // Compute LDPC-like parity bits over the combined metadata + data
  const payloadBits = [...metaBits, ...dataBits]
  const numParityBits = Math.ceil((payloadBits.length * ecPercent) / 100)
  const parityBits = computeLDPCParityBits(payloadBits, numParityBits)

  // Final bitstream: metadata + data + parity
  const allBits = [...payloadBits, ...parityBits]

  // Calculate symbol size
  const totalCells = Math.ceil(allBits.length / bitsPerCell)
  const finderCells = 7 * 7 * 4 // 4 finder patterns (approximate)
  const neededCells = totalCells + finderCells
  let side = Math.max(21, Math.ceil(Math.sqrt(neededCells)))
  if (side % 2 === 0) side++ // odd for symmetry

  if (side > 85) {
    throw new CapacityError("Data too long for JAB Code")
  }

  // Build color matrix
  const matrix: number[][] = Array.from({ length: side }, () =>
    Array.from({ length: side }, () => 0),
  )

  // Place finder patterns (4 corners) with corner-specific colors
  placeJABFinder(matrix, 0, 0, 0, numColors)
  placeJABFinder(matrix, 0, side - 7, 1, numColors)
  placeJABFinder(matrix, side - 7, 0, 2, numColors)
  placeJABFinder(matrix, side - 7, side - 7, 3, numColors)

  // Mark finder area (including separator)
  const isFinderArea = (r: number, c: number) => {
    if (r < 8 && c < 8) return true
    if (r < 8 && c >= side - 8) return true
    if (r >= side - 8 && c < 8) return true
    if (r >= side - 8 && c >= side - 8) return true
    return false
  }

  // Place data
  let bitIdx = 0
  for (let r = 0; r < side; r++) {
    for (let c = 0; c < side; c++) {
      if (isFinderArea(r, c)) continue

      let colorValue = 0
      for (let b = 0; b < bitsPerCell; b++) {
        if (bitIdx < allBits.length) {
          colorValue = (colorValue << 1) | allBits[bitIdx]!
          bitIdx++
        }
      }
      matrix[r]![c] = colorValue % numColors
    }
  }

  return { matrix, rows: side, cols: side, palette }
}
