/**
 * Aztec Code text encoder
 *
 * Encodes input text into a bit stream using the 5 Aztec encoding modes
 * (Upper, Lower, Mixed, Punctuation, Digit) plus Binary Shift.
 *
 * The encoder starts in Upper mode and switches between modes using
 * latch (permanent) and shift (single character) transitions as needed.
 *
 * Character sets other than ISO-8859-1 are declared with the FLG(n) escape
 * (ISO/IEC 24778 §7.3.2): an ECI assignment number introduced from
 * Punctuation mode. Input that ISO-8859-1 cannot represent is encoded as
 * UTF-8 bytes under an automatic ECI 000026 declaration.
 */

import { InvalidInputError } from "../../errors"
import {
  Mode,
  MODE_BITS,
  CHAR_TABLE,
  PUNCT_PAIRS,
  getLatchSequence,
  SHIFT_CODES,
  BINARY_SHIFT,
} from "./tables"
import type { ModeSwitch } from "./tables"

// ---------------------------------------------------------------------------
// Bit manipulation helpers
// ---------------------------------------------------------------------------

/** Append a value as `count` bits (MSB first) to a bit array */
function pushBits(bits: number[], value: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) {
    bits.push((value >> i) & 1)
  }
}

// ---------------------------------------------------------------------------
// ECI / FLG(n)
// ---------------------------------------------------------------------------

/** ECI assignment number for UTF-8 */
const ECI_UTF8 = 26

/** Punctuation-mode codeword 0 is the FLG(n) escape */
const FLG_CODE = 0

/** Highest ECI number expressible in the 6 digits FLG(n) allows */
const MAX_ECI = 999_999

/** True when the string contains a character ISO-8859-1 cannot represent */
function hasNonLatin1(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 255) return true
  }
  return false
}

/** Re-encode a string as its UTF-8 bytes, one byte per char code */
function toUtf8ByteString(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let result = ""
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]!)
  }
  return result
}

/**
 * Emit an ECI declaration as FLG(n) while in Upper mode.
 *
 * Layout (ISO/IEC 24778 §7.3.2):
 *   P/S               — 5 bits, shift from Upper into Punctuation mode
 *   FLG               — 5 bits, Punctuation codeword 0
 *   n                 — 3 bits, the number of ECI digits that follow (1-6)
 *   n x digit         — 4 bits each, Digit-mode codewords ('0' = 2 ... '9' = 11)
 *
 * The shift is transient, so the encoder is back in Upper mode afterwards.
 * FLG(0) is FNC1 and is not emitted here.
 */
function emitECI(bits: number[], eci: number): void {
  if (!Number.isInteger(eci) || eci < 0 || eci > MAX_ECI) {
    throw new InvalidInputError(`Aztec Code: ECI must be an integer between 0 and ${MAX_ECI}`)
  }

  const digits = String(eci)

  pushBits(bits, SHIFT_CODES[Mode.Upper]![Mode.Punct]!, MODE_BITS[Mode.Upper])
  pushBits(bits, FLG_CODE, MODE_BITS[Mode.Punct])
  pushBits(bits, digits.length, 3)
  for (let i = 0; i < digits.length; i++) {
    pushBits(bits, digits.charCodeAt(i) - 48 + 2, MODE_BITS[Mode.Digit])
  }
}

// ---------------------------------------------------------------------------
// High-level encoding
// ---------------------------------------------------------------------------

/**
 * Bits a binary shift run of `length` bytes costs, its header included.
 *
 * Up to 31 bytes the header is the B/S codeword and a 5-bit length. Between 32
 * and 62 two runs of 31 and the rest cost less than the long form, and from 63
 * the long form — a zero length field and 11 further bits — wins.
 */
function binaryRunBits(length: number): number {
  if (length === 0) return 0
  if (length <= 31) return 10 + length * 8
  if (length <= 62) return 20 + length * 8
  return 21 + length * 8
}

/** Bits one more byte adds to a run that already holds `run` of them. */
function binaryStepBits(run: number): number {
  return binaryRunBits(run + 1) - binaryRunBits(run)
}

/**
 * Run lengths tracked exactly. Past 63 every further byte costs the same eight
 * bits, so the state saturates there and the real length comes back off the
 * route. The length field reaches 2078 bytes, more than any Aztec symbol holds.
 */
const RUN_STATES = 64

const MODES = [Mode.Upper, Mode.Lower, Mode.Mixed, Mode.Punct, Mode.Digit] as const

/** What a step of the route does. */
const enum Action {
  /** Close the open binary run. Costs nothing and consumes nothing. */
  Close = 0,
  /** Latch into this state's mode. Consumes nothing. */
  Latch = 1,
  /** One character, in the current mode. */
  Char = 2,
  /** One character, shifted out of the current mode. */
  ShiftChar = 3,
  /** A two-character punctuation sequence, already in Punct. */
  Pair = 4,
  /** A two-character punctuation sequence, shifted into Punct. */
  ShiftPair = 5,
  /** One more byte of a binary run. */
  Binary = 6,
}

/** Index of a (mode, run) state within one position. */
function stateIndex(mode: Mode, run: number): number {
  return mode * RUN_STATES + run
}

/**
 * Encode a string into an Aztec bit stream.
 *
 * ISO/IEC 24778 gives five text modes and a binary shift, and several ways to
 * move between them: a latch is permanent, a shift borrows one codeword, and a
 * binary run carries raw bytes at eight bits each behind a header that grows
 * with the run. Which is cheapest for a character depends on what follows it,
 * so the route is found rather than guessed — `cost[i][mode][run]` is the
 * fewest bits that encode the first `i` characters and leave the encoder in
 * `mode` with `run` bytes of an open binary run, and the bit stream is read
 * back off the cheapest route to the end.
 *
 * Input containing characters outside ISO-8859-1 is transparently re-encoded
 * as UTF-8 bytes and prefixed with an FLG(n) ECI 000026 declaration, unless
 * the caller declared a character set of its own.
 *
 * @param text - The input text
 * @param eci - Optional ECI assignment number to declare (0-999999)
 * @returns Array of bits (0/1 values)
 */
export function encodeHighLevel(text: string, eci?: number): number[] {
  if (text.length === 0) {
    return []
  }

  // Non-Latin-1 input travels as UTF-8 bytes under an ECI declaration
  let data = text
  let eciValue = eci
  if (hasNonLatin1(text)) {
    data = toUtf8ByteString(text)
    eciValue ??= ECI_UTF8
  }

  const bits: number[] = []
  if (eciValue !== undefined) {
    emitECI(bits, eciValue)
  }

  for (const step of route(data)) step(bits)
  return bits
}

/** A piece of the finished bit stream. */
type Emit = (bits: number[]) => void

/**
 * The cheapest route through the modes, as the steps that write it out.
 *
 * Every position holds one cost per (mode, open run length). The steps that
 * consume no characters — closing a run, latching — are settled first, then
 * each state offers what it can do with the character in front of it.
 */
function route(data: string): Emit[] {
  const length = data.length
  const width = MODES.length * RUN_STATES
  const cost = new Float64Array((length + 1) * width).fill(Infinity)
  // Packed as delta<<16 | previous mode<<13 | previous run<<6 | action<<3 | target
  const from = new Int32Array((length + 1) * width).fill(-1)

  cost[stateIndex(Mode.Upper, 0)] = 0

  /** Offer a state a cheaper way of being reached. */
  const relax = (
    at: number,
    mode: Mode,
    run: number,
    total: number,
    delta: number,
    fromMode: Mode,
    fromRun: number,
    action: Action,
    target: Mode,
  ): void => {
    const slot = at * width + stateIndex(mode, run)
    if (total >= cost[slot]!) return
    cost[slot] = total
    from[slot] = (delta << 16) | (fromMode << 13) | (fromRun << 6) | (action << 3) | target
  }

  for (let at = 0; at <= length; at++) {
    const base = at * width

    // Giving up on an open run costs nothing
    for (const mode of MODES) {
      for (let run = 1; run < RUN_STATES; run++) {
        const open = cost[base + stateIndex(mode, run)]!
        if (open < Infinity) relax(at, mode, 0, open, 0, mode, run, Action.Close, mode)
      }
    }

    // Latches chain, so they are settled to a fixed point before the character
    for (let round = 0; round < MODES.length; round++) {
      for (const mode of MODES) {
        const here = cost[base + stateIndex(mode, 0)]!
        if (here === Infinity) continue
        for (const target of MODES) {
          if (target === mode) continue
          const latch = getLatchSequence(mode, target)
          relax(at, target, 0, here + latch.totalBits, 0, mode, 0, Action.Latch, target)
        }
      }
    }

    if (at === length) break

    const char = data[at]!
    const pairCode = at + 1 < length ? PUNCT_PAIRS.get(char + data[at + 1]!) : undefined

    for (const mode of MODES) {
      // One more byte of an open run, or the first byte of a new one. Punct and
      // Digit have no B/S codeword; the latch above reaches a mode that has one
      for (let run = 0; run < RUN_STATES; run++) {
        if (run === 0 && !BINARY_SHIFT[mode]) break
        const here = cost[base + stateIndex(mode, run)]!
        if (here === Infinity) continue
        const next = Math.min(run + 1, RUN_STATES - 1)
        relax(at + 1, mode, next, here + binaryStepBits(run), 1, mode, run, Action.Binary, mode)
      }

      const here = cost[base + stateIndex(mode, 0)]!
      if (here === Infinity) continue

      // The character, in this mode or borrowed from another
      if (CHAR_TABLE[mode]![char] !== undefined) {
        relax(at + 1, mode, 0, here + MODE_BITS[mode], 1, mode, 0, Action.Char, mode)
      }
      for (const target of MODES) {
        const shift = SHIFT_CODES[mode]![target]
        if (shift === undefined || CHAR_TABLE[target]![char] === undefined) continue
        const total = here + MODE_BITS[mode] + MODE_BITS[target]
        relax(at + 1, mode, 0, total, 1, mode, 0, Action.ShiftChar, target)
      }

      // A two-character punctuation sequence in one codeword
      if (pairCode === undefined) continue
      if (mode === Mode.Punct) {
        relax(at + 2, mode, 0, here + MODE_BITS[mode], 2, mode, 0, Action.Pair, mode)
      } else if (SHIFT_CODES[mode]![Mode.Punct] !== undefined) {
        const total = here + MODE_BITS[mode] + MODE_BITS[Mode.Punct]
        relax(at + 2, mode, 0, total, 2, mode, 0, Action.ShiftPair, Mode.Punct)
      }
    }
  }

  // The cheapest way to have encoded everything, whatever mode it ends in
  let bestMode = Mode.Upper
  let best = Infinity
  for (const mode of MODES) {
    const total = cost[length * width + stateIndex(mode, 0)]!
    if (total < best) {
      best = total
      bestMode = mode
    }
  }

  // Walk the route back, then hand out the steps in order
  const steps: Emit[] = []
  const run: number[] = []
  let at = length
  let mode = bestMode
  let openRun = 0
  for (;;) {
    const packed = from[at * width + stateIndex(mode, openRun)]!
    if (packed === -1) break
    const previousMode = ((packed >> 13) & 7) as Mode
    const previousRun = (packed >> 6) & 0x7f
    const action = (packed >> 3) & 7
    const target = (packed & 7) as Mode
    const start = at - (packed >>> 16)

    if (action === Action.Latch) {
      const latch = getLatchSequence(previousMode, target)
      steps.push((out) => emitLatch(out, latch))
    } else if (action === Action.Char) {
      const value = CHAR_TABLE[previousMode]![data[start]!]!
      const bits = MODE_BITS[previousMode]
      steps.push((out) => pushBits(out, value, bits))
    } else if (action === Action.ShiftChar || action === Action.ShiftPair) {
      const shift = SHIFT_CODES[previousMode]![target]!
      const shiftBits = MODE_BITS[previousMode]
      const value =
        action === Action.ShiftChar
          ? CHAR_TABLE[target]![data[start]!]!
          : PUNCT_PAIRS.get(data[start]! + data[start + 1]!)!
      const valueBits = MODE_BITS[target]
      steps.push((out) => {
        pushBits(out, shift, shiftBits)
        pushBits(out, value, valueBits)
      })
    } else if (action === Action.Pair) {
      const value = PUNCT_PAIRS.get(data[start]! + data[start + 1]!)!
      steps.push((out) => pushBits(out, value, MODE_BITS[Mode.Punct]))
    } else if (action === Action.Binary) {
      // The run is written when its first byte is reached, which walking
      // backwards is last
      run.unshift(data.charCodeAt(start))
      if (previousRun === 0) {
        const bytes = [...run]
        run.length = 0
        steps.push((out) => emitBinaryRun(out, bytes))
      }
    }

    at = start
    mode = previousMode
    openRun = previousRun
  }

  return steps.reverse()
}

/**
 * Write a binary shift run.
 *
 * 32 to 62 bytes go out as two runs, of 31 and the rest, which costs a bit less
 * than the long length form; from 63 the long form wins.
 */
function emitBinaryRun(bits: number[], bytes: number[]): void {
  const length = bytes.length
  const first = length <= 62 ? Math.min(length, 31) : length

  pushBits(bits, 31, 5)
  if (length > 62) {
    pushBits(bits, 0, 5)
    pushBits(bits, length - 31, 11)
  } else {
    pushBits(bits, first, 5)
  }
  for (let i = 0; i < first; i++) pushBits(bits, bytes[i]!, 8)

  if (first < length) {
    pushBits(bits, 31, 5)
    pushBits(bits, length - first, 5)
    for (let i = first; i < length; i++) pushBits(bits, bytes[i]!, 8)
  }
}

/** Emit a latch sequence, each code in the bit width of the mode it is read in */
function emitLatch(bits: number[], latch: ModeSwitch): void {
  for (const [i, code] of latch.codes.entries()) {
    pushBits(bits, code, MODE_BITS[latch.modes[i]!])
  }
}

/**
 * Convert a bit stream into codewords of the given word size.
 * Pads the last codeword with 1-bits if necessary (per Aztec spec,
 * padding bits should be 1 to avoid all-zero codewords).
 */
export function bitsToCodewords(bits: number[], wordSize: number): number[] {
  const codewords: number[] = []
  let i = 0

  while (i < bits.length) {
    let value = 0
    for (let b = 0; b < wordSize; b++) {
      value = (value << 1) | (i < bits.length ? bits[i]! : 1)
      i++
    }
    codewords.push(value)
  }

  return codewords
}

/**
 * Stuff bits to avoid all-zero or all-one codewords.
 *
 * Scans the input in wordSize-bit windows. For each window:
 * - If the top (wordSize-1) bits are all 1: output them + a 0 (drop last input bit
 *   and re-process it in the next window).
 * - If the top (wordSize-1) bits are all 0: force the last bit to 1 (drop last input
 *   bit and re-process it).
 * - Otherwise: output the full wordSize bits normally.
 *
 * Matches the ZXing reference implementation exactly.
 */
export function stuffBits(bits: number[], wordSize: number): number[] {
  const result: number[] = []
  const n = bits.length
  const mask = (1 << wordSize) - 2 // e.g., for ws=6: 0b111110

  for (let i = 0; i < n; i += wordSize) {
    let word = 0
    for (let j = 0; j < wordSize; j++) {
      if (i + j >= n || bits[i + j]!) {
        word |= 1 << (wordSize - 1 - j)
      }
    }

    if ((word & mask) === mask) {
      // Top (wordSize-1) bits are all 1: output word with last bit forced to 0
      pushBitsFromValue(result, word & mask, wordSize)
      i-- // re-process the dropped last bit
    } else if ((word & mask) === 0) {
      // Top (wordSize-1) bits are all 0: output word with last bit forced to 1
      pushBitsFromValue(result, word | 1, wordSize)
      i-- // re-process the dropped last bit
    } else {
      pushBitsFromValue(result, word, wordSize)
    }
  }

  return result
}

/** Push a value as wordSize bits (MSB first) into a result array */
function pushBitsFromValue(result: number[], value: number, wordSize: number): void {
  for (let b = wordSize - 1; b >= 0; b--) {
    result.push((value >> b) & 1)
  }
}

/**
 * Convert stuffed bits into an array of codewords, filling remaining capacity.
 *
 * Per the ZXing reference implementation:
 * 1. Read stuffed bits into the first N codewords of a totalWords-sized array.
 * 2. The remaining positions are left as 0 (will be filled by RS encoding).
 *
 * @param stuffedBits - The stuffed bit array
 * @param wordSize - Codeword size in bits
 * @param totalWords - Total number of codewords (data + EC)
 * @returns Array of totalWords codewords, with data in first positions
 */
export function bitsToWords(stuffedBits: number[], wordSize: number, totalWords: number): number[] {
  const message = Array.from<number>({ length: totalWords }).fill(0)
  const n = Math.floor(stuffedBits.length / wordSize)
  for (let i = 0; i < n; i++) {
    let value = 0
    for (let j = 0; j < wordSize; j++) {
      value |= (stuffedBits[i * wordSize + j]! ? 1 : 0) << (wordSize - j - 1)
    }
    message[i] = value
  }
  return message
}
