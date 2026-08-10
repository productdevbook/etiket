/**
 * QR Code data encoding and bitstream construction
 */

import type { ErrorCorrectionLevel, QRCodeOptions, QRSegment } from "./types"
import { MODE_INDICATOR } from "./types"
import { getECInfo, getCharCountBits } from "./tables"
import { getDataCapacityBits, selectMode } from "./version"
import { optimizeSegments } from "./segment"
import { gs1Payload } from "./gs1"
import {
  encodeNumericData,
  encodeAlphanumericData,
  encodeByteData,
  encodeKanjiData,
  unicodeToShiftJIS,
  pushBits,
} from "./mode"
import { addErrorCorrection } from "./reed-solomon"
import { CapacityError, EtiketError, InvalidInputError } from "../../errors"

export interface EncodedData {
  version: number
  ecLevel: ErrorCorrectionLevel
  bits: number[]
}

/**
 * Encode text into QR code data bits with error correction
 */
export function encodeData(text: string, options: QRCodeOptions = {}): EncodedData {
  const ecLevel = options.ecLevel ?? "M"
  const { version, segments } = planEncoding(text, ecLevel, options)
  const ecInfo = getECInfo(version, ecLevel)

  // Build data bitstream
  const dataBits = buildDataBits(segments, version, ecInfo.totalDataCodewords, options)

  // Convert bits to bytes
  const dataBytes = bitsToBytes(dataBits)

  // Add error correction with interleaving
  const finalBytes = addErrorCorrection(
    dataBytes,
    ecInfo.ecCodewordsPerBlock,
    ecInfo.group1Blocks,
    ecInfo.group1DataCW,
    ecInfo.group2Blocks,
    ecInfo.group2DataCW,
  )

  // Convert back to bits
  const bits: number[] = []
  for (const byte of finalBytes) {
    pushBits(bits, byte, 8)
  }

  return { version, ecLevel, bits }
}

/** A segment plus the version it was measured against */
interface EncodingPlan {
  version: number
  segments: QRSegment[]
}

/**
 * Choose the segmentation and the smallest version that holds it.
 *
 * Segmentation depends on the version, because the character-count indicator
 * — and therefore the cost of switching modes — grows at versions 10 and 27.
 * So the split is recomputed for each candidate version rather than once up
 * front.
 */
/** Version 40 at level L in numeric mode, the most any QR symbol holds. */
const MAX_QR_CHARACTERS = 7200

export function planEncoding(
  text: string,
  ecLevel: ErrorCorrectionLevel,
  options: QRCodeOptions,
): EncodingPlan {
  const forcedMode = options.mode && options.mode !== "auto" ? options.mode : undefined
  // GS1 symbols carry AI element strings, not the parenthesised form the
  // caller wrote
  const payload = options.gs1 ? gs1Payload(text) : text

  // Version 40 at level L holds 7089 numeric characters and nothing holds more,
  // so anything longer than that is already answered. Finding that out by
  // segmenting a megabyte of text forty times over is a slow way to say no.
  if (payload.length > MAX_QR_CHARACTERS) {
    throw new CapacityError(
      `Data too long for any QR code version: ${payload.length} characters is past what any symbol holds`,
    )
  }

  if (options.version !== undefined) {
    const segments = segmentsFor(payload, options.version, forcedMode)
    const needed = headerBits(options) + totalBits(segments, options.version)
    const capacity = getDataCapacityBits(options.version, ecLevel)
    if (needed > capacity) {
      throw new CapacityError(
        `Data too long for QR version ${options.version} with EC level ${ecLevel}: ${needed} bits needed, capacity is ${capacity}`,
      )
    }
    return { version: options.version, segments }
  }

  // The character count indicator, and so the cost of switching mode, changes
  // only at versions 10 and 27: three segmentations to find rather than forty
  const byGroup = new Map<number, QRSegment[]>()
  for (let version = 1; version <= 40; version++) {
    const group = version < 10 ? 0 : version < 27 ? 1 : 2
    let segments = byGroup.get(group)
    if (!segments) {
      segments = segmentsFor(payload, version, forcedMode)
      byGroup.set(group, segments)
    }
    if (
      headerBits(options) + totalBits(segments, version) <=
      getDataCapacityBits(version, ecLevel)
    ) {
      return { version, segments }
    }
  }

  throw new CapacityError(`Data too long for any QR code version with EC level ${ecLevel}`)
}

/** Split the text into segments, or a single segment when the mode is forced */
function segmentsFor(text: string, version: number, forcedMode?: string): QRSegment[] {
  if (forcedMode) {
    const mode = selectMode(text, forcedMode)
    const data = new TextEncoder().encode(text)
    // Character-oriented modes keep the source text; only byte mode is bytes.
    return mode === "byte"
      ? [{ mode, data, charCount: data.length }]
      : [{ mode, data: text, charCount: text.length }]
  }
  return optimizeSegments(text, version)
}

/** Header + payload bits for a whole segment list */
function totalBits(segments: QRSegment[], version: number): number {
  let bits = 0
  for (const segment of segments) {
    bits += 4 + getCharCountBits(version, segment.mode) + segmentPayloadBits(segment)
  }
  return bits
}

function segmentPayloadBits(segment: QRSegment): number {
  const count = segment.charCount
  switch (segment.mode) {
    case "numeric":
      return Math.floor(count / 3) * 10 + (count % 3 === 2 ? 7 : count % 3 === 1 ? 4 : 0)
    case "alphanumeric":
      return Math.floor(count / 2) * 11 + (count % 2 === 1 ? 6 : 0)
    case "kanji":
      return count * 13
    default:
      return count * 8
  }
}

/** Build the data bitstream (before EC) */
function buildDataBits(
  segments: QRSegment[],
  version: number,
  totalDataCodewords: number,
  options: QRCodeOptions,
): number[] {
  const bits: number[] = []

  appendHeaders(bits, options)

  for (const segment of segments) {
    appendSegment(bits, segment, version)
  }

  // Terminator
  const totalDataBits = totalDataCodewords * 8
  const terminatorLen = Math.min(4, totalDataBits - bits.length)
  if (terminatorLen > 0) {
    pushBits(bits, 0, terminatorLen)
  }

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  // Pad to capacity with alternating bytes
  let padToggle = true
  while (bits.length < totalDataBits) {
    pushBits(bits, padToggle ? 236 : 17, 8)
    padToggle = !padToggle
  }

  return bits
}

/**
 * Bits taken by the Structured Append and ECI headers, which sit in front of
 * the data segments and therefore eat into the version's capacity.
 */
function headerBits(options: QRCodeOptions): number {
  let bits = 0
  if (options.structuredAppend) bits += 4 + 4 + 4 + 8
  if (options.eci !== undefined) bits += 4 + eciDesignatorBits(options.eci)
  if (options.gs1) bits += 4
  else if (options.applicationIndicator !== undefined) bits += 4 + 8
  return bits
}

function eciDesignatorBits(eci: number): number {
  if (eci < 0 || eci > 999_999) {
    throw new InvalidInputError(`ECI assignment number must be 0-999999, got ${eci}`)
  }
  if (eci < 128) return 8
  if (eci < 16_384) return 16
  return 24
}

/**
 * Emit the Structured Append and ECI headers, in the order ISO/IEC 18004
 * requires: the sequence header first, then the character-set declaration,
 * then the data segments.
 */
function appendHeaders(bits: number[], options: QRCodeOptions): void {
  const sa = options.structuredAppend
  if (sa) {
    if (sa.total < 2 || sa.total > 16) {
      throw new InvalidInputError(
        `Structured Append needs between 2 and 16 symbols, got ${sa.total}`,
      )
    }
    if (sa.index < 0 || sa.index >= sa.total) {
      throw new InvalidInputError(
        `Structured Append index ${sa.index} is outside the sequence of ${sa.total}`,
      )
    }
    pushBits(bits, MODE_INDICATOR.structuredAppend, 4)
    pushBits(bits, sa.index, 4)
    pushBits(bits, sa.total - 1, 4)
    pushBits(bits, sa.parity & 0xff, 8)
  }

  if (options.gs1) {
    // FNC1 in the first position: the data is GS1 element strings
    pushBits(bits, MODE_INDICATOR.fnc1First, 4)
  } else if (options.applicationIndicator !== undefined) {
    pushBits(bits, MODE_INDICATOR.fnc1Second, 4)
    pushBits(bits, applicationIndicatorValue(options.applicationIndicator), 8)
  }

  if (options.eci !== undefined) {
    const designatorBits = eciDesignatorBits(options.eci)
    pushBits(bits, MODE_INDICATOR.eci, 4)
    // 8-bit designators are written plain, 16-bit are prefixed 10, 24-bit 110
    if (designatorBits === 8) {
      pushBits(bits, options.eci, 8)
    } else if (designatorBits === 16) {
      pushBits(bits, 0b10_000000_00000000 | options.eci, 16)
    } else {
      pushBits(bits, 0b110_00000_00000000_00000000 | options.eci, 24)
    }
  }
}

/**
 * The 8-bit value that follows an FNC1 second-position indicator.
 *
 * Two digits are written as their plain value 0-99; a single letter as its
 * ASCII code plus 100, which lands it in 165-190 for A-Z and 197-222 for a-z.
 */
function applicationIndicatorValue(indicator: string): number {
  if (/^\d{2}$/.test(indicator)) return Number(indicator)
  if (/^[a-z]$/i.test(indicator)) return indicator.charCodeAt(0) + 100
  throw new InvalidInputError(
    `Application indicator must be two digits or a single letter, got "${indicator}"`,
  )
}

/** Append one segment's mode indicator, character count and payload */
function appendSegment(bits: number[], segment: QRSegment, version: number): void {
  const mode = segment.mode
  if (mode === "eci") {
    throw new EtiketError("Internal: ECI segments are emitted as headers, not as data segments")
  }

  pushBits(bits, MODE_INDICATOR[mode], 4)
  pushBits(bits, segment.charCount, getCharCountBits(version, mode))

  switch (mode) {
    case "numeric":
      bits.push(...encodeNumericData(asText(segment.data)))
      break
    case "alphanumeric":
      bits.push(...encodeAlphanumericData(asText(segment.data)))
      break
    case "byte":
      bits.push(...encodeByteData(asBytes(segment.data)))
      break
    case "kanji":
      bits.push(...encodeKanjiData(unicodeToShiftJIS(asText(segment.data))))
      break
  }
}

function asText(data: Uint8Array | string): string {
  return typeof data === "string" ? data : String.fromCharCode(...data)
}

function asBytes(data: Uint8Array | string): Uint8Array {
  return typeof data === "string" ? new TextEncoder().encode(data) : data
}

/** Convert bit array to byte array */
function bitsToBytes(bits: number[]): number[] {
  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]!
    }
    bytes.push(byte)
  }
  return bytes
}
