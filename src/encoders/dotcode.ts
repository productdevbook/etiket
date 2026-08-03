/**
 * DotCode encoder (AIM ISS DotCode 4.0)
 * High-speed industrial 2D barcode for tobacco, pharma
 *
 * Structure:
 * - Rectangular grid of dots (not connected bars)
 * - Checkerboard-like pattern — only even (r+c) positions filled
 * - Variable size, height + width must be odd
 * - GF(113) Reed-Solomon error correction (prime field, alpha = 3)
 */

import { InvalidInputError } from "../errors"

// ---------------------------------------------------------------------------
// GF(113) prime field arithmetic
// 113 is prime, so GF(113) = Z/113Z.
// Primitive root alpha = 3 (order 112 = p-1).
// ---------------------------------------------------------------------------

const GF = 113
const GF_ORDER = GF - 1 // 112

/** Exponent table: GF113_EXP[i] = alpha^i mod 113, i = 0..111 */
const GF113_EXP = new Uint8Array(GF_ORDER)

/** Log table: GF113_LOG[v] = i where alpha^i = v, for v = 1..112 */
const GF113_LOG = new Uint8Array(GF)

// Initialize GF(113) lookup tables
;(function initGF113() {
  let x = 1
  for (let i = 0; i < GF_ORDER; i++) {
    GF113_EXP[i] = x
    GF113_LOG[x] = i
    x = (x * 3) % GF // alpha = 3
  }
})()

/** Multiply two GF(113) elements */
function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF113_EXP[(GF113_LOG[a]! + GF113_LOG[b]!) % GF_ORDER]!
}

/** Add two GF(113) elements */
function gfAdd(a: number, b: number): number {
  return (a + b) % GF
}

/** Subtract two GF(113) elements */
function gfSub(a: number, b: number): number {
  return (a - b + GF) % GF
}

// ---------------------------------------------------------------------------
// Reed-Solomon over GF(113)
// ---------------------------------------------------------------------------

/**
 * Build the RS generator polynomial of degree `n`.
 *
 * g(x) = (x - alpha^1)(x - alpha^2)...(x - alpha^n)
 *
 * Stored as coefficients [g_0, g_1, ..., g_n] where
 * g(x) = g_0 * x^n + g_1 * x^(n-1) + ... + g_n.
 */
function buildGenerator(n: number): number[] {
  const gen = Array.from<number>({ length: n + 1 }).fill(0)
  gen[0] = 1

  for (let i = 1; i <= n; i++) {
    const root = GF113_EXP[i % GF_ORDER]! // alpha^i
    // Multiply current gen by (x - root)
    for (let j = i; j >= 1; j--) {
      gen[j] = gfSub(gen[j - 1]!, gfMul(gen[j]!, root))
    }
    gen[0] = gfMul(gen[0]!, (GF - root) % GF)
  }

  return gen
}

/**
 * Generate Reed-Solomon error correction codewords over GF(113).
 *
 * Computes the remainder of data(x) * x^n / g(x), then negates
 * to produce check symbols that make the full codeword polynomial
 * evaluate to 0 at each root alpha^1..alpha^n.
 *
 * @param data - Data codewords (values 0..112)
 * @param ecCount - Number of EC codewords to generate
 * @returns Array of `ecCount` EC codewords
 */
function dotcodeEC(data: number[], ecCount: number): number[] {
  const gen = buildGenerator(ecCount)

  // Polynomial long division (shift register)
  const remainder = Array.from<number>({ length: ecCount }).fill(0)

  for (const d of data) {
    const feedback = gfAdd(d, remainder[0]!)
    for (let j = 0; j < ecCount - 1; j++) {
      remainder[j] = gfSub(remainder[j + 1]!, gfMul(feedback, gen[j + 1]!))
    }
    remainder[ecCount - 1] = gfSub(0, gfMul(feedback, gen[ecCount]!))
  }

  // Negate remainder to get check symbols
  const ec = Array.from<number>({ length: ecCount })
  for (let i = 0; i < ecCount; i++) {
    ec[i] = (GF - remainder[i]!) % GF
  }

  return ec
}

// ---------------------------------------------------------------------------
// DotCode encoder
// ---------------------------------------------------------------------------

/**
 * Encode text as DotCode.
 * Returns a 2D boolean matrix (true = dot present).
 */
export function encodeDotCode(text: string): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("DotCode input must not be empty")
  }

  // Encode data as DotCode codewords (Code Set B style: ASCII - 32)
  // DotCode uses Code 128-like encoding with codewords 0..112
  // CW 106 = Upper Shift (FNC3), 107 = binary shift, 108-112 = special
  const codewords: number[] = []
  // Mode indicator: CW 106 signals start of data
  codewords.push(106)
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code >= 32 && code <= 127) {
      // Printable ASCII: charCode - 32 (Code Set B mapping)
      codewords.push(code - 32)
    } else if (code < 32) {
      // Control characters: direct value
      codewords.push(code + 64)
    } else {
      // Extended: binary shift
      codewords.push(107)
      codewords.push(code % GF)
      if (code >= GF) {
        codewords.push(Math.floor(code / GF))
      }
    }
  }

  // Select symbol size per Zint/AIM ISS DotCode algorithm
  const dataCW = codewords.length
  // EC count: at least half data + 3 overhead
  const ecCW = Math.max(3, Math.floor(dataCW / 2) + 3)
  const totalCW = dataCW + ecCW
  // min_dots = 9 * totalCW + 2 (mask bits). min_area = min_dots * 2
  const minDots = 9 * totalCW + 2
  const minArea = minDots * 2

  // 3:2 aspect ratio preference (width > height)
  let height = Math.max(5, Math.round(Math.sqrt(minArea * 0.666)))
  let width = Math.max(5, Math.round(Math.sqrt(minArea * 1.5)))

  // Ensure minimum area
  while (width * height < minArea) {
    width++
  }

  // Ensure height + width is odd
  if ((width + height) % 2 === 0) {
    width++
    if (width * height < minArea) height++
  }

  // Pad data codewords to fill available data capacity
  const paddedData = codewords.slice()
  while (paddedData.length < dataCW) {
    paddedData.push(109) // pad codeword
  }

  // Generate EC codewords
  // Clamp data values to GF(113) range for RS computation
  const rsData = paddedData.map((v) => v % GF)
  const ec = dotcodeEC(rsData, ecCW)
  const allCW = [...rsData, ...ec]

  // Build matrix with checkerboard pattern
  const matrix: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  )

  // Place data as dots in checkerboard positions
  let cwIdx = 0
  let bitIdx = 0

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      // Checkerboard: only (r+c) % 2 === 0 positions can have dots
      if ((r + c) % 2 !== 0) continue

      if (cwIdx < allCW.length) {
        // Each codeword contributes 7 bits (ceil(log2(113)) = 7)
        const bit = (allCW[cwIdx]! >> (6 - bitIdx)) & 1
        matrix[r]![c] = bit === 1
        bitIdx++
        if (bitIdx >= 7) {
          bitIdx = 0
          cwIdx++
        }
      }
    }
  }

  return matrix
}
