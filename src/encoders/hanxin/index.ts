/**
 * Han Xin Code encoder (ISO/IEC 20830)
 *
 * The Chinese national 2D symbology. Square, 23x23 to 189x189 modules across 84
 * versions, with four error correction levels and a finder pattern in every
 * corner — the bottom-left one differs from the other three, which is how a
 * reader recovers the symbol's orientation.
 *
 * Verified module-for-module against the BWIPP reference encoder; see
 * `test/encoders-hanxin-bwip.test.ts`.
 *
 * Encodation is Numeric plus Byte. The standard's Text mode and its four Chinese
 * modes are compaction optimisations over the same bitstream grammar: omitting
 * them costs symbol size on some payloads but never conformance, since a
 * conforming reader must accept Byte mode. Byte-mode data is emitted as UTF-8;
 * ISO/IEC 20830 leaves byte-mode interpretation to the application, and readers
 * that default to GB 18030 will read ASCII correctly but not other scripts.
 */

import { CapacityError, InvalidInputError } from "../../errors"
import { hanxinBitstream, hanxinSegments } from "./encoder"
import {
  hanxinEvaluate,
  hanxinMaskLayers,
  hanxinPlaceData,
  hanxinPlaceFunctionInfo,
  hanxinTemplate,
} from "./placement"
import { hanxinDataEC, hanxinFunctionEC } from "./reed-solomon"
import { HANXIN_METRICS, type HanXinMetric } from "./tables"

/** Codewords are read back in this stride, spreading a burst error over blocks. */
const INTERLEAVE_STRIDE = 13

/** Fixed tail of the 34-bit function information. */
const FUNCTION_INFO_TAIL = [0, 1, 0, 1, 0, 1]

export interface HanXinOptions {
  /** Error correction level: L1 (~8%), L2 (~15%), L3 (~23%), L4 (~30%). Default L2. */
  ecLevel?: 1 | 2 | 3 | 4
  /** Symbol version 1-84. Chosen automatically when omitted. */
  version?: number
  /** Mask pattern 1-4. Chosen by the standard's evaluation when omitted. */
  mask?: 1 | 2 | 3 | 4
}

/** Data codewords a version holds at one EC level. */
function dataCodewords(metric: HanXinMetric, ecLevel: number): number {
  const total = Math.floor(metric.modules / 8)
  let ec = 0
  for (const group of metric.ec[ecLevel - 1]!) ec += group.blocks * group.ecCodewords
  return total - ec
}

/** The smallest version — or the requested one — that holds `bitCount` bits. */
function selectMetric(bitCount: number, ecLevel: number, version?: number): HanXinMetric {
  for (const metric of HANXIN_METRICS) {
    if (version !== undefined && metric.version !== version) continue
    if (bitCount <= dataCodewords(metric, ecLevel) * 8) return metric
  }
  throw new CapacityError(
    version === undefined
      ? "Data too long for any Han Xin Code version"
      : `Data too long for Han Xin Code version ${String(version)} at EC level L${String(ecLevel)}`,
  )
}

/** Split the padded bitstream into codewords, then into RS blocks with their EC. */
function buildCodewords(bits: readonly number[], metric: HanXinMetric, ecLevel: number): number[] {
  const total = Math.floor(metric.modules / 8)
  const remainderBits = metric.modules % 8
  const count = dataCodewords(metric, ecLevel)

  const data: number[] = []
  for (let i = 0; i < count; i++) {
    let codeword = 0
    for (let j = 0; j < 8; j++) codeword = (codeword << 1) | (bits[i * 8 + j] ?? 0)
    data.push(codeword)
  }

  // Data and EC are concatenated block by block, then read back with a stride.
  const sequence: number[] = []
  let offset = 0
  for (const group of metric.ec[ecLevel - 1]!) {
    for (let b = 0; b < group.blocks; b++) {
      const block = data.slice(offset, offset + group.dataCodewords)
      offset += group.dataCodewords
      sequence.push(...block, ...hanxinDataEC(block, group.ecCodewords))
    }
  }

  const interleaved: number[] = []
  for (let start = 0; start < Math.min(total, INTERLEAVE_STRIDE); start++) {
    for (let i = start; i < total; i += INTERLEAVE_STRIDE) interleaved.push(sequence[i]!)
  }
  // The modules left over after the last whole codeword are filled with zeros.
  if (remainderBits > 0) interleaved.push(0)

  return interleaved
}

/** The 34 function-information bits: version, EC level, mask, RS check, fixed tail. */
function functionInfoBits(version: number, ecLevel: number, mask: number): number[] {
  const value = ((version + 20) * 4 + (ecLevel - 1)) * 4 + mask
  const nibbles = [(value >> 8) & 0xf, (value >> 4) & 0xf, value & 0xf]
  const bits: number[] = []
  for (const nibble of [...nibbles, ...hanxinFunctionEC(nibbles, 4)]) {
    for (let i = 3; i >= 0; i--) bits.push((nibble >> i) & 1)
  }
  return [...bits, ...FUNCTION_INFO_TAIL]
}

/**
 * Version 84 at the lightest error correction, in numeric mode. Anything
 * longer is already answered, and finding that out by encoding it is slow.
 */
const MAX_HAN_XIN_CHARACTERS = 8000

/**
 * Encode text as a Han Xin Code symbol.
 *
 * Returns a square boolean matrix, row-major, `true` for a dark module.
 */
export function encodeHanXin(text: string, options: HanXinOptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("Han Xin Code input must not be empty")
  }
  if (text.length > MAX_HAN_XIN_CHARACTERS) {
    throw new CapacityError(
      `Data too long for Han Xin Code: ${text.length} characters is past what any symbol holds`,
    )
  }

  const ecLevel = options.ecLevel ?? 2
  if (![1, 2, 3, 4].includes(ecLevel)) {
    throw new InvalidInputError(`Han Xin EC level must be 1, 2, 3 or 4 (got ${String(ecLevel)})`)
  }
  const { version } = options
  if (version !== undefined && (!Number.isInteger(version) || version < 1 || version > 84)) {
    throw new InvalidInputError(`Han Xin version must be an integer 1-84 (got ${String(version)})`)
  }
  const forcedMask = options.mask
  if (forcedMask !== undefined && ![1, 2, 3, 4].includes(forcedMask)) {
    throw new InvalidInputError(`Han Xin mask must be 1, 2, 3 or 4 (got ${String(forcedMask)})`)
  }

  const bytes = new TextEncoder().encode(text)
  const bits = hanxinBitstream(bytes, hanxinSegments(bytes))
  const metric = selectMetric(bits.length, ecLevel, version)
  const { size } = metric

  const codewords = buildCodewords(bits, metric, ecLevel)

  const template = hanxinTemplate(metric)
  const layers = hanxinMaskLayers(template, size)
  hanxinPlaceData(template, size, codewords)

  const candidates = forcedMask === undefined ? [0, 1, 2, 3] : [forcedMask - 1]
  let best: Int8Array | undefined
  let bestMask = 0
  let bestScore = Number.POSITIVE_INFINITY
  for (const index of candidates) {
    const masked = new Int8Array(size * size)
    for (let i = 0; i < masked.length; i++) masked[i] = template[i]! ^ layers[index]![i]!
    // With a single candidate there is nothing to weigh it against.
    const score = candidates.length === 1 ? 0 : hanxinEvaluate(masked, size)
    if (score < bestScore) {
      best = masked
      bestMask = index
      bestScore = score
    }
  }

  const pixels = best!
  hanxinPlaceFunctionInfo(pixels, size, functionInfoBits(metric.version, ecLevel, bestMask))

  const matrix: boolean[][] = []
  for (let y = 0; y < size; y++) {
    const row: boolean[] = []
    for (let x = 0; x < size; x++) row.push(pixels[y * size + x] === 1)
    matrix.push(row)
  }
  return matrix
}
