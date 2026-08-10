/**
 * Data Matrix data encoder — ASCII encoding mode
 * Converts input text into data codewords per ISO/IEC 16022
 */

import { InvalidInputError } from "../../errors"

/**
 * Encode text into Data Matrix data codewords using ASCII encoding.
 *
 * ASCII encoding rules:
 * - ASCII values 0-127: codeword = value + 1
 * - Digit pairs "00"-"99": codeword = pair_value + 130 (single codeword for two digits)
 * - Extended ASCII 128-255: codeword 235 (Upper Shift) followed by value - 127
 */
export function encodeASCII(text: string): number[] {
  const codewords: number[] = []
  let i = 0

  while (i < text.length) {
    const charCode = text.charCodeAt(i)

    if (charCode > 255) {
      throw new InvalidInputError(
        `Data Matrix ASCII mode does not support character: "${text[i]}" (U+${charCode.toString(16).padStart(4, "0")})`,
      )
    }

    // Check for digit pair optimization
    if (
      charCode >= 48 &&
      charCode <= 57 && // current char is '0'-'9'
      i + 1 < text.length &&
      text.charCodeAt(i + 1) >= 48 &&
      text.charCodeAt(i + 1) <= 57 // next char is '0'-'9'
    ) {
      const pairValue = (charCode - 48) * 10 + (text.charCodeAt(i + 1) - 48)
      codewords.push(pairValue + 130)
      i += 2
    } else if (charCode >= 128) {
      // Extended ASCII: Upper Shift + (value - 127)
      codewords.push(235)
      codewords.push(charCode - 127)
      i++
    } else {
      // Standard ASCII: value + 1
      codewords.push(charCode + 1)
      i++
    }
  }

  return codewords
}

/**
 * Pad data codewords to fill the symbol capacity.
 * Uses pad value 129 with the 253-state randomization algorithm.
 */
export function padCodewords(codewords: number[], capacity: number): number[] {
  const padded = [...codewords]

  if (padded.length < capacity) {
    // First pad codeword is always 129
    padded.push(129)
  }

  // Remaining pad codewords use the 253-state randomization
  while (padded.length < capacity) {
    const position = padded.length + 1 // 1-based position
    const randomized = randomizePad(129, position)
    padded.push(randomized)
  }

  return padded
}

/**
 * 253-state randomization algorithm for pad codewords.
 * Ensures pad values appear pseudo-random to avoid false patterns.
 */
function randomizePad(padValue: number, position: number): number {
  const pseudoRandom = ((149 * position) % 253) + 1
  const result = padValue + pseudoRandom
  return result <= 254 ? result : result - 254
}

// C40 character set values
// Set 0 (basic): space=3, 0-9=4-13, A-Z=14-39
// Set 1 (shift 1): control chars 0-31
// Set 2 (shift 2): !"#$%&'()*+,-./:;<=>?@[\]^_
// Set 3 (shift 3): `a-z{|}~DEL
function c40Value(ch: number): { set: number; value: number } {
  if (ch === 32) return { set: 0, value: 3 } // space
  if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 } // 0-9
  if (ch >= 65 && ch <= 90) return { set: 0, value: ch - 65 + 14 } // A-Z
  if (ch >= 0 && ch <= 31) return { set: 1, value: ch } // control
  if (ch >= 33 && ch <= 47) return { set: 2, value: ch - 33 } // !"#$%&'()*+,-./
  if (ch >= 58 && ch <= 64) return { set: 2, value: ch - 58 + 15 } // :;<=>?@
  if (ch >= 91 && ch <= 95) return { set: 2, value: ch - 91 + 22 } // [\]^_
  if (ch >= 96 && ch <= 127) return { set: 3, value: ch - 96 } // `a-z{|}~
  return { set: -1, value: 0 } // not C40 encodable
}

// Text mode: same as C40 but swaps upper/lowercase
function textValue(ch: number): { set: number; value: number } {
  if (ch === 32) return { set: 0, value: 3 }
  if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 }
  if (ch >= 97 && ch <= 122) return { set: 0, value: ch - 97 + 14 } // a-z in basic set
  if (ch >= 0 && ch <= 31) return { set: 1, value: ch }
  if (ch >= 33 && ch <= 47) return { set: 2, value: ch - 33 }
  if (ch >= 58 && ch <= 64) return { set: 2, value: ch - 58 + 15 }
  if (ch >= 91 && ch <= 95) return { set: 2, value: ch - 91 + 22 }
  if (ch === 96) return { set: 3, value: 0 } // backtick
  if (ch >= 65 && ch <= 90) return { set: 3, value: ch - 65 + 1 } // A-Z in shift 3
  if (ch >= 123 && ch <= 127) return { set: 3, value: ch - 123 + 27 }
  return { set: -1, value: 0 }
}

/**
 * Encode text using C40 mode (efficient for uppercase + digits)
 * 3 characters → 2 codewords
 * Latch: codeword 230
 */
export function encodeC40(text: string): number[] {
  return encodeC40Text(text, 230, c40Value).encode(Infinity)!
}

/**
 * Encode text using Text mode (efficient for lowercase + digits)
 * 3 characters → 2 codewords
 * Latch: codeword 239
 */
export function encodeTextMode(text: string): number[] {
  return encodeC40Text(text, 239, textValue).encode(Infinity)!
}

/**
 * A candidate encoding of the whole message in one mode.
 *
 * Where a mode may stop matters as much as how it packs: an unlatch exists so
 * that whatever follows it is read as ASCII, so whether one is needed — and
 * whether a reader will still be in the mode when it arrives — depends on how
 * much room is left in the symbol. The symbol size is chosen after encoding,
 * so a candidate answers for a given capacity rather than committing to one
 * stream.
 */
export interface DataMatrixCandidate {
  /** The stream this mode produces for a symbol holding `capacity` codewords. */
  encode: (capacity: number) => number[] | undefined
  /** The fewest codewords the mode could take, for reporting and comparison. */
  shortest: number
}

/** A C40/Text/X12 triplet, packed into two codewords. */
function triplet(a: number, b: number, c: number): number[] {
  const v = a * 1600 + b * 40 + c + 1
  return [Math.floor(v / 256), v % 256]
}

/** Every form this mode can take, shortest first. Each is tried in turn. */
function fromForms(forms: { codewords: number[]; fits: (capacity: number) => boolean }[]) {
  const ordered = [...forms].sort((a, b) => a.codewords.length - b.codewords.length)
  return {
    shortest: ordered[0]?.codewords.length ?? Infinity,
    encode: (capacity: number) => {
      for (const form of ordered) {
        if (form.codewords.length <= capacity && form.fits(capacity)) return form.codewords
      }
      return undefined
    },
  }
}

function encodeC40Text(
  text: string,
  latchCW: number,
  valueFn: (ch: number) => { set: number; value: number },
): DataMatrixCandidate {
  const values: number[] = []
  // Track which source character index each value came from
  const valueCharIndex: number[] = []

  // Index of the first character that cannot be represented in C40/Text and
  // must therefore be encoded in ASCII, or text.length when there is none.
  let fallbackFrom = text.length

  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    const { set, value } = valueFn(ch)
    if (set === -1) {
      fallbackFrom = i
      break
    }
    if (set > 0) {
      values.push(set - 1) // Shift indicator (0=shift1, 1=shift2, 2=shift3)
      valueCharIndex.push(i)
      values.push(value)
      valueCharIndex.push(i)
    } else {
      values.push(value)
      valueCharIndex.push(i)
    }
  }

  // Pack whole triplets into codeword pairs
  const split = values.length - (values.length % 3)
  const head = [latchCW]
  for (let i = 0; i < split; i += 3) {
    head.push(...triplet(values[i]!, values[i + 1]!, values[i + 2]!))
  }
  const rest = values.slice(split)

  // Everything the triplets did not cover: any leftover values plus the
  // non-encodable tail. Taking the earliest of the two start points ensures no
  // character is dropped.
  const asciiFrom = rest.length > 0 ? Math.min(valueCharIndex[split]!, fallbackFrom) : fallbackFrom
  const forms: { codewords: number[]; fits: (capacity: number) => boolean }[] = [
    {
      // Always available: unlatch, then whatever is left in ASCII
      codewords: [
        ...head,
        254,
        ...(asciiFrom < text.length ? encodeASCII(text.slice(asciiFrom)) : []),
      ],
      fits: () => true,
    },
  ]

  // The forms that leave the unlatch out. A reader stays in C40 until it meets
  // one or runs down to a single codeword, so each of these is legal only in a
  // symbol that ends exactly where it does.
  if (fallbackFrom >= text.length) {
    if (rest.length === 0) {
      forms.push({ codewords: head, fits: (capacity) => capacity === head.length })
    } else if (rest.length === 2) {
      // Two values left: a SHIFT1 completes the triplet and carries both
      const padded = [...head, ...triplet(rest[0]!, rest[1]!, 0)]
      forms.push({ codewords: padded, fits: (capacity) => capacity === padded.length })
    } else if (asciiFrom === text.length - 1 && valueCharIndex[values.length - 2] !== asciiFrom) {
      // One value left, and it is the whole of the last character: with one
      // codeword to spare that character goes out in ASCII instead
      const trailing = [...head, ...encodeASCII(text.slice(asciiFrom))]
      forms.push({ codewords: trailing, fits: (capacity) => capacity === trailing.length })
    }
  }

  return fromForms(forms)
}

// X12 character set: CR=0, *=1, >=2, space=3, 0-9=4-13, A-Z=14-39
function x12Value(ch: number): { set: number; value: number } {
  if (ch === 13) return { set: 0, value: 0 }
  if (ch === 42) return { set: 0, value: 1 }
  if (ch === 62) return { set: 0, value: 2 }
  if (ch === 32) return { set: 0, value: 3 }
  if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 }
  if (ch >= 65 && ch <= 90) return { set: 0, value: ch - 65 + 14 }
  return { set: -1, value: 0 }
}

/**
 * Encode text using X12 mode (ANSI X12 EDI: A-Z, 0-9, space, CR, * and >).
 * 3 characters → 2 codewords. Latch 238.
 *
 * X12 has no shift mechanism, so the whole run must be X12-encodable and the
 * character count must be a multiple of 3; anything else falls back to ASCII.
 */
export function encodeX12(text: string): number[] | undefined {
  const values = x12Values(text)
  if (!values) return undefined
  return [...x12Head(values), 254]
}

function x12Values(text: string): number[] | undefined {
  if (text.length === 0 || text.length % 3 !== 0) return undefined
  const values: number[] = []
  for (const ch of text) {
    const { set, value } = x12Value(ch.charCodeAt(0))
    if (set === -1) return undefined
    values.push(value)
  }
  return values
}

function x12Head(values: number[]): number[] {
  const head = [238]
  for (let i = 0; i < values.length; i += 3) {
    head.push(...triplet(values[i]!, values[i + 1]!, values[i + 2]!))
  }
  return head
}

function x12Candidate(text: string): DataMatrixCandidate | undefined {
  const values = x12Values(text)
  if (!values) return undefined
  const head = x12Head(values)
  // The unlatch exists so the padding is read in ASCII mode; a symbol that ends
  // exactly here has no padding and does not need it
  return fromForms([
    { codewords: [...head, 254], fits: () => true },
    { codewords: head, fits: (capacity) => capacity === head.length },
  ])
}

/**
 * Encode text using EDIFACT mode (ASCII 32-94, 6 bits per character).
 * 4 characters → 3 codewords. Latch 240, unlatch is the 6-bit value 31.
 */
export function encodeEDIFACT(text: string): number[] | undefined {
  const values = edifactValues(text)
  if (!values) return undefined
  return [240, ...edifactQuads([...values, 31])]
}

/** Six-bit values for a message EDIFACT can carry, or undefined if it cannot. */
function edifactValues(text: string): number[] | undefined {
  if (text.length === 0) return undefined
  const values: number[] = []
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code < 32 || code > 94) return undefined
    values.push(code & 0x3f)
  }
  return values
}

/**
 * Pack six-bit values four at a time into three codewords each.
 *
 * A last group of fewer than four values is zero filled to 24 bits but only the
 * codewords those values actually reach are emitted: one value fills one
 * codeword, two fill two, three or four fill three. A reader stops at the
 * unlatch and resumes ASCII at the next codeword boundary, so a whole codeword
 * of zero bits after it is not padding it skips — it is a codeword 0, which
 * ASCII has no meaning for, and the symbol does not decode at all.
 */
function edifactQuads(values: number[]): number[] {
  const codewords: number[] = []
  for (let i = 0; i < values.length; i += 4) {
    const count = Math.min(4, values.length - i)
    const packed =
      ((values[i] ?? 0) << 18) |
      ((values[i + 1] ?? 0) << 12) |
      ((values[i + 2] ?? 0) << 6) |
      (values[i + 3] ?? 0)
    codewords.push((packed >> 16) & 0xff)
    if (count >= 2) codewords.push((packed >> 8) & 0xff)
    if (count >= 3) codewords.push(packed & 0xff)
  }
  return codewords
}

function edifactCandidate(text: string): DataMatrixCandidate | undefined {
  const values = edifactValues(text)
  if (!values) return undefined

  // Whole quadruples, then either an unlatch or an ASCII tail. Which of the two
  // is right is not a choice: a reader leaves EDIFACT of its own accord as soon
  // as two codewords or fewer are left, so an unlatch written there would be
  // read as data, and with three or more left it will not leave without one.
  const tail = values.length % 4
  const head = [240, ...edifactQuads(values.slice(0, values.length - tail))]
  const withUnlatch = [240, ...edifactQuads([...values, 31])]
  const trailing =
    tail <= 2 ? [...head, ...(tail > 0 ? encodeASCII(text.slice(text.length - tail)) : [])] : []

  return fromForms([
    { codewords: withUnlatch, fits: (capacity) => capacity - head.length >= 3 },
    ...(trailing.length > 0
      ? [{ codewords: trailing, fits: (capacity: number) => capacity - head.length <= 2 }]
      : []),
  ])
}

/**
 * Encode bytes using Base 256 mode (latch 231).
 *
 * The length field and every data byte are randomised with the 255-state
 * algorithm so that binary payloads cannot imitate the finder patterns.
 */
export function encodeBase256(bytes: Uint8Array | number[], startPosition = 1): number[] {
  const data = [...bytes]
  const codewords: number[] = [231]
  // Position of the first length codeword within the whole codeword stream
  let position = startPosition + 1

  if (data.length < 250) {
    codewords.push(randomize255(data.length, position++))
  } else {
    codewords.push(randomize255(Math.floor(data.length / 250) + 249, position++))
    codewords.push(randomize255(data.length % 250, position++))
  }

  for (const byte of data) {
    codewords.push(randomize255(byte, position++))
  }

  return codewords
}

/** 255-state randomisation for Base 256 values */
function randomize255(value: number, position: number): number {
  const pseudoRandom = ((149 * position) % 255) + 1
  const result = value + pseudoRandom
  return result <= 255 ? result : result - 256
}

/**
 * Emit an ECI designator (codeword 241 plus 1-3 value codewords) per ISO 16022.
 */
export function encodeECI(eci: number): number[] {
  if (!Number.isInteger(eci) || eci < 0 || eci > 999_999) {
    throw new InvalidInputError(`Data Matrix ECI assignment number must be 0-999999, got ${eci}`)
  }
  if (eci <= 126) return [241, eci + 1]
  if (eci <= 16_382) {
    const value = eci - 127
    return [241, Math.floor(value / 254) + 128, (value % 254) + 1]
  }
  const value = eci - 16_383
  return [
    241,
    Math.floor(value / 64_516) + 192,
    (Math.floor(value / 254) % 254) + 1,
    (value % 254) + 1,
  ]
}

/**
 * One symbol's place in a Structured Append sequence.
 *
 * ISO/IEC 16022 5.6 splits a message across up to sixteen symbols. Each carries
 * its position, how many there are in all, and a file identifier the reader
 * uses to tell one sequence from another.
 */
export interface DataMatrixStructuredAppend {
  /** Position of this symbol, from 1. */
  index: number
  /** Symbols in the sequence, 2 to 16. */
  total: number
  /**
   * File identifier, shared by every symbol of the sequence. Two values of
   * 1 to 254; defaults to `[1, 1]`.
   */
  fileId?: readonly [number, number]
}

export interface DataMatrixEncodeOptions {
  /**
   * ECI assignment number declaring the character set.
   * Omit and the encoder declares ECI 26 (UTF-8) by itself as soon as the input
   * contains a character Latin-1 cannot represent.
   */
  eci?: number
  /** Place of this symbol in a Structured Append sequence. */
  structuredAppend?: DataMatrixStructuredAppend
}

/** The four codewords that open a symbol belonging to a sequence. */
function encodeStructuredAppend(header: DataMatrixStructuredAppend): number[] {
  const { index, total, fileId = [1, 1] } = header
  if (!Number.isInteger(total) || total < 2 || total > 16) {
    throw new InvalidInputError(
      `Data Matrix Structured Append holds 2 to 16 symbols, got ${String(total)}`,
    )
  }
  if (!Number.isInteger(index) || index < 1 || index > total) {
    throw new InvalidInputError(
      `Data Matrix Structured Append symbol ${String(index)} is outside a sequence of ${total}`,
    )
  }
  for (const value of fileId) {
    if (!Number.isInteger(value) || value < 1 || value > 254) {
      throw new InvalidInputError(
        `Data Matrix Structured Append file identifier values run from 1 to 254, got ${String(value)}`,
      )
    }
  }
  // Codeword 233 has to be the first in the symbol. The one after it holds the
  // position in its high nibble, counting from zero, and the number of symbols
  // in the low one — counting *down*, so a sequence of two is 15 and one of
  // sixteen is 1. Then the file identifier.
  return [233, ((index - 1) << 4) | (17 - total), fileId[0], fileId[1]]
}

/**
 * Every encoding of the message worth considering, in preference order.
 *
 * Each mode is tried over the whole message. Which one produces the smallest
 * *symbol* is not the same question as which produces the fewest codewords: a
 * mode may stop differently — or not need to say it stopped at all — depending
 * on how much of the symbol is left, so each candidate is asked for a stream
 * given a capacity rather than committing to one up front.
 */
export function encodeCandidates(
  text: string,
  options: DataMatrixEncodeOptions = {},
): DataMatrixCandidate[] {
  /** A stream that is what it is, whatever the symbol size. */
  const fixed = (codewords: number[]): DataMatrixCandidate => ({
    shortest: codewords.length,
    encode: (capacity) => (codewords.length <= capacity ? codewords : undefined),
  })

  // Codeword 233 has to come first in the symbol, so a sequence header goes in
  // front of everything, an ECI declaration after it
  const sequence = options.structuredAppend ? encodeStructuredAppend(options.structuredAppend) : []

  // Anything Latin-1 cannot hold goes out as UTF-8 bytes under an ECI
  // declaration, in Base 256 so no byte is reinterpreted.
  if ([...text].some((ch) => ch.codePointAt(0)! > 0xff)) {
    const eci = [...sequence, ...encodeECI(options.eci ?? 26)]
    return [fixed([...eci, ...encodeBase256(new TextEncoder().encode(text), eci.length + 1)])]
  }

  const candidates: DataMatrixCandidate[] = [
    fixed(encodeASCII(text)),
    encodeC40Text(text, 230, c40Value),
    encodeC40Text(text, 239, textValue),
  ]
  const x12 = x12Candidate(text)
  if (x12) candidates.push(x12)
  const edifact = edifactCandidate(text)
  if (edifact) candidates.push(edifact)

  const prefix = [...sequence, ...(options.eci === undefined ? [] : encodeECI(options.eci))]

  // What goes in front of the message takes symbol capacity from it, so the
  // mode is asked what it would do with what is left
  const withPrefix =
    prefix.length === 0
      ? candidates
      : candidates.map(({ encode, shortest }) => ({
          shortest: shortest + prefix.length,
          encode: (capacity: number) => {
            const codewords = encode(capacity - prefix.length)
            return codewords && [...prefix, ...codewords]
          },
        }))

  // Base 256 carries every byte in one codeword behind a two codeword header.
  // ASCII spends two codewords on each byte above 127 and C40 four, so text
  // with accents in it comes out a size class or two smaller this way. It is
  // built last because it needs to know where in the symbol its bytes land:
  // the length field and every byte are randomised by position.
  const bytes = [...text].map((ch) => ch.codePointAt(0)!)
  withPrefix.push(fixed([...prefix, ...encodeBase256(bytes, prefix.length + 1)]))

  return withPrefix
}

/**
 * The shortest encoding of the text, in whichever mode manages it.
 *
 * A mode can only be asked what it would do for a given symbol, so this asks
 * every one of them for a symbol large enough to hold anything: the answer is
 * the fewest codewords the message can take, which is what a capacity check
 * wants to know. `encodeDataMatrix` asks the same candidates the sharper
 * question — what fits in each symbol, smallest first.
 */
export function encodeAuto(text: string, options: DataMatrixEncodeOptions = {}): number[] {
  const candidates = encodeCandidates(text, options)
  const room = Math.max(...candidates.map((candidate) => candidate.shortest)) + 3
  let best: number[] | undefined
  for (const candidate of candidates) {
    const codewords = candidate.encode(room)
    if (codewords && (!best || codewords.length < best.length)) best = codewords
  }
  /* v8 ignore next -- ASCII always answers, so there is always a shortest */
  return best ?? encodeASCII(text)
}
