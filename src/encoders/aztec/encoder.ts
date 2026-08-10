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
  SHIFT_TO_PUNCT,
  BINARY_SHIFT,
} from "./tables"

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

  pushBits(bits, SHIFT_TO_PUNCT[Mode.Upper]!, MODE_BITS[Mode.Upper])
  pushBits(bits, FLG_CODE, MODE_BITS[Mode.Punct])
  pushBits(bits, digits.length, 3)
  for (let i = 0; i < digits.length; i++) {
    pushBits(bits, digits.charCodeAt(i) - 48 + 2, MODE_BITS[Mode.Digit])
  }
}

// ---------------------------------------------------------------------------
// Character classification
// ---------------------------------------------------------------------------

/**
 * Determine which modes can encode a given character.
 * Returns an array of { mode, value } options.
 */
function charModes(char: string): Array<{ mode: Mode; value: number }> {
  const result: Array<{ mode: Mode; value: number }> = []
  for (let m = 0; m <= 4; m++) {
    const table = CHAR_TABLE[m]!
    const val = table[char]
    if (val !== undefined) {
      result.push({ mode: m as Mode, value: val })
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// High-level encoding
// ---------------------------------------------------------------------------

/**
 * Encode a string into an Aztec bit stream.
 *
 * Strategy:
 * 1. For each character, check if it can be encoded in the current mode.
 * 2. If yes, emit the codeword directly.
 * 3. If no, try a shift first (cheaper for single characters), else latch.
 * 4. Fall back to binary shift for characters not in any text mode.
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

  let currentMode = Mode.Upper
  let i = 0

  while (i < data.length) {
    const char = data[i]!

    // --- Check for two-character punctuation pairs ---
    if (i + 1 < data.length) {
      const pair = data[i]! + data[i + 1]!
      const punctPairVal = PUNCT_PAIRS.get(pair)
      if (punctPairVal !== undefined) {
        if (currentMode === Mode.Punct) {
          pushBits(bits, punctPairVal, MODE_BITS[Mode.Punct])
        } else {
          // Shift to Punct for the pair
          const shiftCode = SHIFT_TO_PUNCT[currentMode]
          if (shiftCode !== undefined) {
            pushBits(bits, shiftCode, MODE_BITS[currentMode])
            pushBits(bits, punctPairVal, MODE_BITS[Mode.Punct])
          } else {
            // Must latch to a mode that supports shift-to-punct, then shift
            const latch = getLatchSequence(currentMode, Mode.Upper)
            emitLatch(bits, latch)
            currentMode = Mode.Upper
            pushBits(bits, SHIFT_TO_PUNCT[Mode.Upper]!, MODE_BITS[Mode.Upper])
            pushBits(bits, punctPairVal, MODE_BITS[Mode.Punct])
          }
        }
        i += 2
        continue
      }
    }

    // --- Try encoding in the current mode ---
    const currentTable = CHAR_TABLE[currentMode]!
    const directVal = currentTable[char]
    if (directVal !== undefined) {
      pushBits(bits, directVal, MODE_BITS[currentMode])
      i++
      continue
    }

    // --- Character not in current mode — find best alternative ---
    const options = charModes(char)

    if (options.length > 0) {
      // Determine: should we shift or latch?
      const bestOption = selectBestTransition(currentMode, options, data, i)

      if (bestOption.shift) {
        // Emit shift code, then character in the shifted mode
        if (bestOption.mode === Mode.Punct) {
          const shiftCode = SHIFT_TO_PUNCT[currentMode]
          if (shiftCode !== undefined) {
            pushBits(bits, shiftCode, MODE_BITS[currentMode])
            pushBits(bits, bestOption.value, MODE_BITS[Mode.Punct])
            i++
            continue
          }
        }
        // Shift from Lower to Upper
        if (currentMode === Mode.Lower && bestOption.mode === Mode.Upper) {
          pushBits(bits, 28, MODE_BITS[Mode.Lower]) // shift to upper
          pushBits(bits, bestOption.value, MODE_BITS[Mode.Upper])
          i++
          continue
        }
        // No direct shift available — fall through to latch
      }

      // Latch to the target mode
      const latch = getLatchSequence(currentMode, bestOption.mode)
      emitLatch(bits, latch)
      currentMode = bestOption.mode
      pushBits(bits, bestOption.value, MODE_BITS[currentMode])
      i++
      continue
    }

    // --- Character not in any text mode — use binary shift ---
    // `data` is always Latin-1 here: anything wider was converted to UTF-8
    // bytes above, so every remaining char code fits in 8 bits.
    const binaryStart = i
    while (i < data.length) {
      const c = data[i]!
      if (charModes(c).length > 0) {
        // Check if it's only in a mode far from current — might be cheaper to stay binary
        // For simplicity, break out and let the text encoder handle it
        break
      }
      i++
    }

    const binaryLen = i - binaryStart
    currentMode = emitBinaryShift(bits, data, binaryStart, binaryLen, currentMode)
    continue
  }

  return bits
}

// ---------------------------------------------------------------------------
// Transition helpers
// ---------------------------------------------------------------------------

interface TransitionChoice {
  mode: Mode
  value: number
  shift: boolean
}

/**
 * Choose the best mode transition for encoding a character.
 * Prefers shifting for isolated characters and latching when the next
 * several characters are also in the target mode.
 */
function selectBestTransition(
  currentMode: Mode,
  options: Array<{ mode: Mode; value: number }>,
  text: string,
  pos: number,
): TransitionChoice {
  // Check if shift to Punct makes sense (single punctuation character)
  const punctOption = options.find((o) => o.mode === Mode.Punct)
  if (punctOption && SHIFT_TO_PUNCT[currentMode] !== undefined) {
    // Look ahead: if next char is NOT in Punct mode, shift is better than latch
    const nextChar = pos + 1 < text.length ? text[pos + 1]! : undefined
    const nextInPunct = nextChar !== undefined && CHAR_TABLE[Mode.Punct]![nextChar] !== undefined
    if (!nextInPunct) {
      return { mode: Mode.Punct, value: punctOption.value, shift: true }
    }
  }

  // Check if shift from Lower to Upper makes sense
  if (currentMode === Mode.Lower) {
    const upperOption = options.find((o) => o.mode === Mode.Upper)
    if (upperOption) {
      const nextChar = pos + 1 < text.length ? text[pos + 1]! : undefined
      const nextInUpper = nextChar !== undefined && CHAR_TABLE[Mode.Upper]![nextChar] !== undefined
      const nextInLower = nextChar !== undefined && CHAR_TABLE[Mode.Lower]![nextChar] !== undefined
      if (!nextInUpper || nextInLower) {
        return { mode: Mode.Upper, value: upperOption.value, shift: true }
      }
    }
  }

  // Find the option with the cheapest latch
  let bestCost = Infinity
  let best: TransitionChoice = { mode: options[0]!.mode, value: options[0]!.value, shift: false }

  for (const opt of options) {
    const latch = getLatchSequence(currentMode, opt.mode)
    if (latch.totalBits < bestCost) {
      bestCost = latch.totalBits
      best = { mode: opt.mode, value: opt.value, shift: false }
    }
  }

  return best
}

/** Emit latch codes into the bit stream */
function emitLatch(
  bits: number[],
  latch: { codes: number[]; modes: Mode[]; totalBits: number },
): void {
  for (let j = 0; j < latch.codes.length; j++) {
    const code = latch.codes[j]!
    const mode = latch.modes[j]!
    pushBits(bits, code, MODE_BITS[mode])
  }
}

/**
 * Emit a binary shift sequence into the bit stream.
 *
 * Binary shift encoding:
 * 1. Emit BS code in current mode (code 31 for Upper/Lower/Mixed, code 15 for Digit)
 * 2. Length 1-31 goes in the 5-bit field directly; a longer run signals 0
 *    there and carries (length - 31) in a further 11 bits, so one run holds up
 *    to 2078 bytes. Anything longer starts another run.
 * 3. Emit each byte as 8 bits
 *
 * After binary shift, the mode returns to the mode before the shift.
 */
function emitBinaryShift(
  bits: number[],
  text: string,
  start: number,
  length: number,
  currentMode: Mode,
): Mode {
  let remaining = length
  let pos = start

  // Punct and Digit have no B/S codeword of their own, so the run starts by
  // latching to Upper. Emitting Digit's codeword 15 here used to tell a reader
  // to take the next codeword as an upper case letter, and every byte after it
  // came back as text.
  let mode = currentMode
  if (!BINARY_SHIFT[mode]) {
    emitLatch(bits, getLatchSequence(mode, Mode.Upper))
    mode = Mode.Upper
  }

  while (remaining > 0) {
    // A binary shift run carries at most 2078 bytes: 31 encodable in the
    // 5-bit length field, or 31 + 2047 via the extended 11-bit field.
    const chunk = Math.min(remaining, 2078)

    // Emit binary shift intro code
    const bs = BINARY_SHIFT[mode]!
    pushBits(bits, bs.code, bs.bits)

    // Emit length: 1-31 fits the 5-bit field directly; longer runs signal 0
    // there and carry (length - 31) in a further 11 bits (ISO/IEC 24778).
    if (chunk <= 31) {
      pushBits(bits, chunk, 5)
    } else {
      pushBits(bits, 0, 5)
      pushBits(bits, chunk - 31, 11)
    }

    // Emit raw bytes
    for (let j = 0; j < chunk; j++) {
      pushBits(bits, text.charCodeAt(pos + j), 8)
    }

    pos += chunk
    remaining -= chunk
  }

  return mode
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
