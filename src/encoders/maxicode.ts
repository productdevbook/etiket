/**
 * MaxiCode encoder (ISO/IEC 16023)
 * Fixed-size 2D barcode used on UPS shipping labels
 *
 * Structure:
 * - 33 rows x 30 columns hexagonal grid (884 modules, 864 data bits)
 * - Central bullseye finder pattern
 * - 6 encoding modes (2/3 for structured carrier, 4/5/6 for general)
 * - Reed-Solomon error correction over GF(64)
 */

import { CapacityError, InvalidInputError } from "../errors"

const ROWS = 33
const COLS = 30

// ---------------------------------------------------------------------------
// GF(64) arithmetic — primitive polynomial x^6 + x + 1 (0x43)
// ---------------------------------------------------------------------------

const GF64_SIZE = 64
const GF64_MAX = 63 // order of the multiplicative group

const GF64_EXP = new Uint8Array(128)
const GF64_LOG = new Uint8Array(64)

;(function initGF64() {
  let x = 1
  for (let i = 0; i < GF64_MAX; i++) {
    GF64_EXP[i] = x
    GF64_LOG[x] = i
    x = x << 1
    if (x >= GF64_SIZE) x ^= 0x43 // x^6 + x + 1
  }
  // Extend exp table for modular arithmetic convenience
  for (let i = GF64_MAX; i < 128; i++) {
    GF64_EXP[i] = GF64_EXP[i - GF64_MAX]!
  }
})()

/** Multiply two GF(64) elements using log/antilog tables */
function gf64Mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF64_EXP[(GF64_LOG[a]! + GF64_LOG[b]!) % GF64_MAX]!
}

/**
 * Reed-Solomon error correction over GF(64).
 * Generator polynomial: product of (x - alpha^i) for i = 1..ecCount
 * Matches BWIPP MaxiCode RS algorithm exactly.
 */
function maxicodeRS(data: number[], ecCount: number): number[] {
  // Build generator polynomial g(x) = (x - a^1)(x - a^2)...(x - a^ecCount)
  const gen = Array.from<number>({ length: ecCount + 1 }).fill(0)
  gen[0] = 1

  for (let i = 1; i <= ecCount; i++) {
    gen[i] = gen[i - 1]!
    const ai = GF64_EXP[i]!
    for (let j = i - 1; j >= 1; j--) {
      gen[j] = gf64Mul(gen[j]!, ai) ^ gen[j - 1]!
    }
    gen[0] = gf64Mul(gen[0]!, ai)
  }

  const coeffs = gen.slice(0, ecCount)

  // Polynomial long division (BWIPP order)
  const ecb = Array.from<number>({ length: ecCount }).fill(0)
  const rsnc1 = ecCount - 1

  for (const cw of data) {
    const t = (cw ^ ecb[0]!) & GF64_MAX
    for (let j = rsnc1; j >= 1; j--) {
      ecb[rsnc1 - j] = ecb[rsnc1 - j + 1]! ^ gf64Mul(t, coeffs[j]!)
    }
    ecb[rsnc1] = gf64Mul(t, coeffs[0]!)
  }

  return ecb
}

// ---------------------------------------------------------------------------
// MaxiCode character encoding (Code Sets A-E per ISO/IEC 16023)
// ---------------------------------------------------------------------------

/**
 * Non-character symbol values. They occupy the same table as byte values, so
 * they are given negative keys to keep the two apart.
 */
const ECI = -1 // Extended Channel Interpretation
const PAD = -2 // Padding
const NS = -3 // Numeric Sequence (9 digits in 6 codewords)
const LA = -4 // Latch to code set A
const LB = -5 // Latch to code set B
const SA = -6 // Shift one character from code set A
const SB = -7 // Shift one character from code set B
const SC = -8 // Shift one character from code set C
const SD = -9 // Shift one character from code set D
const SE = -10 // Shift one character from code set E
const SA2 = -11 // Shift two characters from code set A
const SA3 = -12 // Shift three characters from code set A
const LKC = -13 // Lock (latch) into code set C
const LKD = -14 // Lock (latch) into code set D
const LKE = -15 // Lock (latch) into code set E
const PD2 = -16 // Two-character pad
const PD3 = -17 // Three-character pad

const SET_A = 0
const SET_B = 1
const SET_C = 2
const SET_D = 3
const SET_E = 4

/**
 * ISO/IEC 16023 table 2: symbol value -> represented byte (or special code)
 * for each of the five code sets. Row index is the symbol value 0-63.
 */
// prettier-ignore
const CHAR_MAPS: number[][] = [
  //  A    B    C    D    E
  [ 13,  96, 192, 224,   0], // 0
  [ 65,  97, 193, 225,   1], // 1
  [ 66,  98, 194, 226,   2], // 2
  [ 67,  99, 195, 227,   3], // 3
  [ 68, 100, 196, 228,   4], // 4
  [ 69, 101, 197, 229,   5], // 5
  [ 70, 102, 198, 230,   6], // 6
  [ 71, 103, 199, 231,   7], // 7
  [ 72, 104, 200, 232,   8], // 8
  [ 73, 105, 201, 233,   9], // 9
  [ 74, 106, 202, 234,  10], // 10
  [ 75, 107, 203, 235,  11], // 11
  [ 76, 108, 204, 236,  12], // 12
  [ 77, 109, 205, 237,  13], // 13
  [ 78, 110, 206, 238,  14], // 14
  [ 79, 111, 207, 239,  15], // 15
  [ 80, 112, 208, 240,  16], // 16
  [ 81, 113, 209, 241,  17], // 17
  [ 82, 114, 210, 242,  18], // 18
  [ 83, 115, 211, 243,  19], // 19
  [ 84, 116, 212, 244,  20], // 20
  [ 85, 117, 213, 245,  21], // 21
  [ 86, 118, 214, 246,  22], // 22
  [ 87, 119, 215, 247,  23], // 23
  [ 88, 120, 216, 248,  24], // 24
  [ 89, 121, 217, 249,  25], // 25
  [ 90, 122, 218, 250,  26], // 26
  [ECI, ECI, ECI, ECI, ECI], // 27
  [ 28,  28,  28,  28, PAD], // 28
  [ 29,  29,  29,  29, PD2], // 29
  [ 30,  30,  30,  30,  27], // 30
  [ NS,  NS,  NS,  NS,  NS], // 31
  [ 32, 123, 219, 251,  28], // 32
  [PAD, PAD, 220, 252,  29], // 33
  [ 34, 125, 221, 253,  30], // 34
  [ 35, 126, 222, 254,  31], // 35
  [ 36, 127, 223, 255, 159], // 36
  [ 37,  59, 170, 161, 160], // 37
  [ 38,  60, 172, 168, 162], // 38
  [ 39,  61, 177, 171, 163], // 39
  [ 40,  62, 178, 175, 164], // 40
  [ 41,  63, 179, 176, 165], // 41
  [ 42,  91, 181, 180, 166], // 42
  [ 43,  92, 185, 183, 167], // 43
  [ 44,  93, 186, 184, 169], // 44
  [ 45,  94, 188, 187, 173], // 45
  [ 46,  95, 189, 191, 174], // 46
  [ 47,  32, 190, 138, 182], // 47
  [ 48,  44, 128, 139, 149], // 48
  [ 49,  46, 129, 140, 150], // 49
  [ 50,  47, 130, 141, 151], // 50
  [ 51,  58, 131, 142, 152], // 51
  [ 52,  64, 132, 143, 153], // 52
  [ 53,  33, 133, 144, 154], // 53
  [ 54, 124, 134, 145, 155], // 54
  [ 55, PD2, 135, 146, 156], // 55
  [ 56, SA2, 136, 147, 157], // 56
  [ 57, SA3, 137, 148, 158], // 57
  [ 58, PD3,  LA,  LA,  LA], // 58
  [ SB,  SA,  32,  32,  32], // 59
  [ SC,  SC, LKC,  SC,  SC], // 60
  [ SD,  SD,  SD, LKD,  SD], // 61
  [ SE,  SE,  SE,  SE, LKE], // 62
  [ LB,  LA,  LB,  LB,  LB], // 63
]

/**
 * Inverse of {@link CHAR_MAPS}: byte (or special code) -> symbol value, one map
 * per code set. Later rows win, matching the reference implementation.
 */
const CODE_SETS: Map<number, number>[] = Array.from({ length: 5 }, () => new Map<number, number>())
for (const [value, row] of CHAR_MAPS.entries()) {
  for (let set = 0; set < 5; set++) {
    CODE_SETS[set]!.set(row[set]!, value)
  }
}

/** Padding symbol value per code set; -1 for the sets that have no pad code. */
const PAD_CODES = CODE_SETS.map((set) => set.get(PAD) ?? -1)

/** Shift / lock symbols used to reach code sets C, D and E. */
const SHIFT_CODES = [SC, SD, SE]
const LOCK_CODES = [LKC, LKD, LKE]

/** Human-readable description of a code point, for error messages. */
function describeChar(codePoint: number): string {
  const hex = codePoint.toString(16).toUpperCase().padStart(4, "0")
  return `"${String.fromCodePoint(codePoint)}" (U+${hex})`
}

/** Symbol value for `key` in `set`; the caller has already proven it exists. */
function symbolOf(set: number, key: number): number {
  return CODE_SETS[set]!.get(key)!
}

/** Result of encoding the message body. */
interface EncodedMessage {
  /** Message codewords, excluding padding. */
  codewords: number[]
  /** Code set the encoder ended in — determines the pad codeword. */
  set: number
}

/**
 * Latch sequences between code sets, indexed `[target][origin]`.
 *
 * Code Sets A and B latch in one codeword. C, D and E have no latch of their
 * own: the shift into them followed by their own shift codeword locks the
 * encoder in, which is why those cost two.
 */
const LATCH_SEQUENCE: number[][][] = Array.from({ length: 5 }, (_, target) =>
  Array.from({ length: 5 }, (_, origin) => {
    if (origin === target) return []
    if (target === SET_A) return [symbolOf(origin, LA)]
    if (target === SET_B) return [symbolOf(origin, LB)]
    const index = target - SET_C
    return [symbolOf(origin, SHIFT_CODES[index]!), symbolOf(target, LOCK_CODES[index]!)]
  }),
)

/**
 * The order ties are broken in, which is the reference implementation's.
 *
 * Two routes through the code sets often cost the same number of codewords;
 * this decides which one is taken, and it is the only reason etiket and BWIPP
 * produce the same symbol rather than merely symbols of the same size.
 */
const SET_PRIORITY = [SET_A, SET_B, SET_E, SET_C, SET_D]

/** A move the encoder can make: some characters in, some codewords out. */
interface Move {
  /** Code sets the move can be made in. */
  from: readonly number[]
  /** Characters consumed. */
  intake: number
  /** Codewords produced. */
  output: number
  /** Whether the move is available for the characters starting at `at`. */
  can: (at: number) => boolean
  /** The codewords themselves. */
  emit: (at: number) => number[]
}

/** How the cheapest route reached a position in a given code set. */
interface Step {
  move: Move
  /** Where the route came from. */
  at: number
  /** The code set it was in before the latch. */
  origin: number
}

/** Stands in for "no route yet"; finite so that adding a latch cannot overflow. */
const UNREACHABLE = 1e9

/**
 * Encode text into MaxiCode message codewords.
 *
 * ISO/IEC 16023 gives five code sets and a dozen ways to move between them:
 * one codeword latches into A or B, two lock into C, D or E, a shift carries a
 * single character out of the current set — or two or three characters into
 * Code Set A — and the Numeric Sequence codeword carries nine digits in six.
 * Which of those is cheapest for a character depends on what comes after it, so
 * the route is found rather than guessed: `cost[i][set]` is the fewest
 * codewords that encode the first `i` characters and leave the encoder in
 * `set`, and the message is read back off the winning route.
 *
 * Every byte 0x00-0xFF is representable in exactly one of the five code sets,
 * so only code points above U+00FF are rejected — MaxiCode's default character
 * set is ISO/IEC 8859-1 and this encoder does not emit ECI designators.
 *
 * @throws {InvalidInputError} for characters outside ISO/IEC 8859-1
 */
function encodeMaxiCodeText(text: string): EncodedMessage {
  const chars: number[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (cp > 0xff) {
      throw new InvalidInputError(
        `MaxiCode: character ${describeChar(cp)} cannot be encoded — ` +
          `MaxiCode supports ISO/IEC 8859-1 (Latin-1) characters only`,
      )
    }
    chars.push(cp)
  }

  const length = chars.length
  if (length === 0) return { codewords: [], set: SET_A }

  /** Whether `count` characters from `at` all live in `set`. */
  const run = (set: number, at: number, count: number): boolean => {
    if (at + count > length) return false
    for (let k = 0; k < count; k++) {
      if (!CODE_SETS[set]!.has(chars[at + k]!)) return false
    }
    return true
  }

  /**
   * The code sets the message actually uses. The search visits only these —
   * as the reference does, which matters because it is what ties are broken
   * between.
   */
  const used = new Set<number>([SET_A])
  for (const char of chars) {
    for (const set of [SET_A, SET_B, SET_C, SET_D, SET_E]) {
      if (CODE_SETS[set]!.has(char)) used.add(set)
    }
  }
  const states = SET_PRIORITY.filter((set) => used.has(set))

  // The moves, in the order the reference tries them — which is the order ties
  // are settled in
  const moves: Move[] = [
    {
      // Nine digits in six codewords, available in every code set
      from: [SET_A, SET_B, SET_C, SET_D, SET_E],
      intake: 9,
      output: 6,
      can: (at) => run(SET_A, at, 9) && chars.slice(at, at + 9).every((c) => c >= 48 && c <= 57),
      emit: (at) => {
        let value = 0
        for (let k = 0; k < 9; k++) value = value * 10 + (chars[at + k]! - 48)
        return [
          symbolOf(SET_A, NS),
          (value >> 24) & 0x3f,
          (value >> 18) & 0x3f,
          (value >> 12) & 0x3f,
          (value >> 6) & 0x3f,
          value & 0x3f,
        ]
      },
    },
  ]

  // A character the current code set carries outright
  for (const set of [SET_A, SET_B, SET_C, SET_D, SET_E]) {
    if (!used.has(set)) continue
    moves.push({
      from: [set],
      intake: 1,
      output: 1,
      can: (at) => run(set, at, 1),
      emit: (at) => [symbolOf(set, chars[at]!)],
    })
  }

  // One, two or three Code Set A characters shifted out of Code Set B
  for (const count of [1, 2, 3] as const) {
    const shift = count === 1 ? SA : count === 2 ? SA2 : SA3
    moves.push({
      from: [SET_B],
      intake: count,
      output: count + 1,
      can: (at) => run(SET_A, at, count),
      emit: (at) => [
        symbolOf(SET_B, shift),
        ...chars.slice(at, at + count).map((c) => symbolOf(SET_A, c)),
      ],
    })
  }

  // A single character shifted out of the current code set into another
  if (used.has(SET_B)) {
    moves.push({
      from: [SET_A],
      intake: 1,
      output: 2,
      can: (at) => run(SET_B, at, 1),
      emit: (at) => [symbolOf(SET_A, SB), symbolOf(SET_B, chars[at]!)],
    })
  }
  for (const target of [SET_C, SET_D, SET_E]) {
    if (!used.has(target)) continue
    const shift = SHIFT_CODES[target - SET_C]!
    moves.push({
      from: [SET_A, SET_B, SET_C, SET_D, SET_E].filter((set) => set !== target),
      intake: 1,
      output: 2,
      can: (at) => run(target, at, 1),
      emit: (at) => [symbolOf(SET_A, shift), symbolOf(target, chars[at]!)],
    })
  }

  // Shortest path over (characters encoded, code set)
  const cost: number[][] = Array.from({ length: length + 1 }, () =>
    Array.from<number>({ length: 5 }).fill(UNREACHABLE),
  )
  const steps: (Step | undefined)[][] = Array.from({ length: length + 1 }, () =>
    Array.from<Step | undefined>({ length: 5 }).fill(undefined),
  )
  cost[0]![SET_A] = 0

  /** Cheapest way to stand at a position already switched into each set. */
  const reached: number[][] = Array.from({ length: length + 1 }, () =>
    Array.from<number>({ length: 5 }).fill(UNREACHABLE),
  )
  const reachedFrom: number[][] = Array.from({ length: length + 1 }, () =>
    Array.from<number>({ length: 5 }).fill(SET_A),
  )

  /** Fold the latch into the cost of standing at `at`, once the cost is known. */
  const switchInto = (at: number): void => {
    for (const set of states) {
      let best = UNREACHABLE
      let origin = SET_A
      for (const candidate of states) {
        const total = cost[at]![candidate]! + LATCH_SEQUENCE[set]![candidate]!.length
        if (total < best) {
          best = total
          origin = candidate
        }
      }
      reached[at]![set] = best
      reachedFrom[at]![set] = origin
    }
  }

  // Each position is settled by trying the moves that could end there, in the
  // order they are declared: a tie goes to the earlier move, which is what
  // makes the route the reference's route and not merely one of the same length
  switchInto(0)
  for (let end = 1; end <= length; end++) {
    for (const set of states) {
      for (const move of moves) {
        const at = end - move.intake
        if (at < 0 || !move.from.includes(set) || !move.can(at)) continue
        if (reached[at]![set]! >= UNREACHABLE) continue
        const total = reached[at]![set]! + move.output
        if (total < cost[end]![set]!) {
          cost[end]![set] = total
          steps[end]![set] = { move, at, origin: reachedFrom[at]![set]! }
        }
      }
    }
    switchInto(end)
  }

  let set = SET_A
  let best = UNREACHABLE
  for (const candidate of states) {
    if (cost[length]![candidate]! < best) {
      best = cost[length]![candidate]!
      set = candidate
    }
  }
  /* v8 ignore next 5 -- every byte lives in some code set, so a route exists */
  if (best >= UNREACHABLE) {
    throw new InvalidInputError(
      "MaxiCode: this message cannot be encoded in the five MaxiCode code sets",
    )
  }
  const finalSet = set

  // Read the route back
  const codewords: number[] = []
  for (let at = length; at > 0;) {
    const step = steps[at]![set]!
    codewords.unshift(...LATCH_SEQUENCE[set]![step.origin]!, ...step.move.emit(step.at))
    set = step.origin
    at = step.at
  }

  return { codewords, set: finalSet }
}

// ---------------------------------------------------------------------------
// Mode 2/3: Structured Carrier Message (UPS shipping)
// ---------------------------------------------------------------------------

/** Write `value` into `bits` as `width` bits, most significant bit first. */
function putBits(bits: Uint8Array, offset: number, value: number, width: number): void {
  for (let i = 0; i < width; i++) {
    bits[offset + i] = Math.floor(value / 2 ** (width - 1 - i)) % 2
  }
}

function checkField(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 999) {
    throw new InvalidInputError(`MaxiCode: ${name} must be an integer between 0 and 999`)
  }
}

/**
 * Build the 10 primary-message codewords for modes 2 and 3.
 *
 * ISO/IEC 16023 §5.4 packs the 60-bit Structured Carrier Message as a 4-bit
 * mode, a 36-bit postal code field (6-bit length + 30-bit value for mode 2, or
 * six 6-bit Code Set A symbols for mode 3), a 10-bit country code and a 10-bit
 * service class, interleaved across the ten codewords.
 */
function buildPrimary(
  postalCode: string,
  countryCode: number,
  serviceClass: number,
  mode: 2 | 3,
): number[] {
  checkField("country code", countryCode)
  checkField("service class", serviceClass)

  const postal = new Uint8Array(36)

  if (mode === 2) {
    let digits = postalCode
    if (!/^\d{1,9}$/.test(digits)) {
      throw new InvalidInputError(
        `MaxiCode mode 2: postal code must be 1 to 9 digits, received "${postalCode}"`,
      )
    }
    // US ZIP codes without the "+4" extension are zero-filled (Annex B.1.4a)
    if (countryCode === 840 && digits.length === 5) digits += "0000"
    putBits(postal, 0, digits.length, 6)
    putBits(postal, 6, Number.parseInt(digits, 10), 30)
  } else {
    if (postalCode.length === 0 || postalCode.length > 6) {
      throw new InvalidInputError(
        `MaxiCode mode 3: postal code must be 1 to 6 characters, received "${postalCode}"`,
      )
    }
    const padded = postalCode.padEnd(6, " ")
    for (let i = 0; i < 6; i++) {
      const code = padded.charCodeAt(i)
      const allowed = code === 32 || (code >= 34 && code <= 58) || (code >= 65 && code <= 90)
      if (!allowed) {
        throw new InvalidInputError(
          `MaxiCode mode 3: postal code character ${describeChar(padded.codePointAt(i)!)} ` +
            `is not allowed — use A-Z, space, or the ASCII range '"' to ':' (which covers 0-9)`,
        )
      }
      putBits(postal, i * 6, symbolOf(SET_A, code), 6)
    }
  }

  const country = new Uint8Array(10)
  putBits(country, 0, countryCode, 10)
  const service = new Uint8Array(10)
  putBits(service, 0, serviceClass, 10)

  // 60-bit Structured Carrier Message, most significant bit of codeword 0 first
  const scm = new Uint8Array(60)
  putBits(scm, 2, mode, 4)
  scm.set(postal.subarray(0, 4), 38)
  scm.set(postal.subarray(4, 10), 30)
  scm.set(postal.subarray(10, 16), 24)
  scm.set(postal.subarray(16, 22), 18)
  scm.set(postal.subarray(22, 28), 12)
  scm.set(postal.subarray(28, 34), 6)
  scm.set(postal.subarray(34, 36), 0)
  scm.set(country.subarray(0, 2), 52)
  scm.set(country.subarray(2, 8), 42)
  scm.set(country.subarray(8, 10), 36)
  scm.set(service.subarray(0, 6), 54)
  scm.set(service.subarray(6, 10), 48)

  const primary: number[] = []
  for (let i = 0; i < 10; i++) {
    let cw = 0
    for (let b = 0; b < 6; b++) cw = (cw << 1) | scm[i * 6 + b]!
    primary.push(cw)
  }
  return primary
}

// ---------------------------------------------------------------------------
// Module placement sequence from ISO/IEC 16023 (via BWIPP reference)
// Maps bit index -> pixel position (row * 30 + col)
// ---------------------------------------------------------------------------

// prettier-ignore
const MODMAP: number[] = [
  469,529,286,316,347,346,673,672,703,702,647,676,283,282,313,312,370,610,618,379,
  378,409,408,439,705,704,559,589,588,619,458,518,640,701,675,674,285,284,315,314,
  310,340,531,289,288,319,349,348,456,486,517,516,471,470,369,368,399,398,429,428,
  549,548,579,578,609,608,649,648,679,678,709,708,639,638,669,668,699,698,279,278,
  309,308,339,338,381,380,411,410,441,440,561,560,591,590,621,620,547,546,577,576,
  607,606,367,366,397,396,427,426,291,290,321,320,351,350,651,650,681,680,711,710,
  1,0,31,30,61,60,3,2,33,32,63,62,5,4,35,34,65,64,7,6,
  37,36,67,66,9,8,39,38,69,68,11,10,41,40,71,70,13,12,43,42,
  73,72,15,14,45,44,75,74,17,16,47,46,77,76,19,18,49,48,79,78,
  21,20,51,50,81,80,23,22,53,52,83,82,25,24,55,54,85,84,27,26,
  57,56,87,86,117,116,147,146,177,176,115,114,145,144,175,174,113,112,143,142,
  173,172,111,110,141,140,171,170,109,108,139,138,169,168,107,106,137,136,167,166,
  105,104,135,134,165,164,103,102,133,132,163,162,101,100,131,130,161,160,99,98,
  129,128,159,158,97,96,127,126,157,156,95,94,125,124,155,154,93,92,123,122,
  153,152,91,90,121,120,151,150,181,180,211,210,241,240,183,182,213,212,243,242,
  185,184,215,214,245,244,187,186,217,216,247,246,189,188,219,218,249,248,191,190,
  221,220,251,250,193,192,223,222,253,252,195,194,225,224,255,254,197,196,227,226,
  257,256,199,198,229,228,259,258,201,200,231,230,261,260,203,202,233,232,263,262,
  205,204,235,234,265,264,207,206,237,236,267,266,297,296,327,326,357,356,295,294,
  325,324,355,354,293,292,323,322,353,352,277,276,307,306,337,336,275,274,305,304,
  335,334,273,272,303,302,333,332,271,270,301,300,331,330,361,360,391,390,421,420,
  363,362,393,392,423,422,365,364,395,394,425,424,383,382,413,412,443,442,385,384,
  415,414,445,444,387,386,417,416,447,446,477,476,507,506,537,536,475,474,505,504,
  535,534,473,472,503,502,533,532,455,454,485,484,515,514,453,452,483,482,513,512,
  451,450,481,480,511,510,541,540,571,570,601,600,543,542,573,572,603,602,545,544,
  575,574,605,604,563,562,593,592,623,622,565,564,595,594,625,624,567,566,597,596,
  627,626,657,656,687,686,717,716,655,654,685,684,715,714,653,652,683,682,713,712,
  637,636,667,666,697,696,635,634,665,664,695,694,633,632,663,662,693,692,631,630,
  661,660,691,690,721,720,751,750,781,780,723,722,753,752,783,782,725,724,755,754,
  785,784,727,726,757,756,787,786,729,728,759,758,789,788,731,730,761,760,791,790,
  733,732,763,762,793,792,735,734,765,764,795,794,737,736,767,766,797,796,739,738,
  769,768,799,798,741,740,771,770,801,800,743,742,773,772,803,802,745,744,775,774,
  805,804,747,746,777,776,807,806,837,836,867,866,897,896,835,834,865,864,895,894,
  833,832,863,862,893,892,831,830,861,860,891,890,829,828,859,858,889,888,827,826,
  857,856,887,886,825,824,855,854,885,884,823,822,853,852,883,882,821,820,851,850,
  881,880,819,818,849,848,879,878,817,816,847,846,877,876,815,814,845,844,875,874,
  813,812,843,842,873,872,811,810,841,840,871,870,901,900,931,930,961,960,903,902,
  933,932,963,962,905,904,935,934,965,964,907,906,937,936,967,966,909,908,939,938,
  969,968,911,910,941,940,971,970,913,912,943,942,973,972,915,914,945,944,975,974,
  917,916,947,946,977,976,919,918,949,948,979,978,921,920,951,950,981,980,923,922,
  953,952,983,982,925,924,955,954,985,984,927,926,957,956,987,986,58,89,88,118,
  149,148,178,209,208,238,269,268,298,329,328,358,389,388,418,449,448,478,509,508,
  538,569,568,598,629,628,658,689,688,718,749,748,778,809,808,838,869,868,898,929,
  928,958,989,988,
];

// ---------------------------------------------------------------------------
// Finder pattern
// ---------------------------------------------------------------------------

/**
 * Dark modules of the central bullseye and of the six orientation marks.
 *
 * The 864 data modules never touch these positions: the bullseye rings of
 * ISO/IEC 16023 (radii 0.5774/1.3359, 2.1058/2.8644 and 3.6229/4.3814 modules
 * about the centre of row 16, column 14) and the fixed orientation modules are
 * carved out of the 990-cell grid, and MODMAP skips them.
 */
// prettier-ignore
const FINDER_DARK: number[] = [
  28,29,280,281,311,343,344,372,376,400,403,404,407,430,432,436,438,457,461,463,
  464,466,488,490,493,495,498,500,521,523,524,526,530,550,552,556,558,580,583,
  584,587,612,616,643,644,670,677,700,707,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * One symbol's place in a Structured Append sequence.
 *
 * ISO/IEC 16023 5.5 splits a message across up to eight symbols, each opening
 * with a pad codeword and one that holds the position and the count.
 */
export interface MaxiCodeStructuredAppend {
  /** Position of this symbol, from 1. */
  index: number
  /** Symbols in the sequence, 2 to 8. */
  total: number
}

export interface MaxiCodeOptions {
  /** Encoding mode: 2 (US structured), 3 (intl structured), 4 (standard), 5 (full ECC), 6 (reader programming) */
  mode?: 2 | 3 | 4 | 5 | 6
  /** Place of this symbol in a Structured Append sequence. */
  structuredAppend?: MaxiCodeStructuredAppend
  /** Postal code (modes 2/3) */
  postalCode?: string
  /** ISO country code number (modes 2/3) */
  countryCode?: number
  /** Service class (modes 2/3, e.g. 840 for UPS) */
  serviceClass?: number
}

/**
 * The two codewords that open a symbol belonging to a sequence.
 *
 * A pad, then one codeword holding the position in its high three bits and the
 * count in its low three, both counting from zero (ISO/IEC 16023 5.5).
 */
function structuredAppendCodewords(header: MaxiCodeStructuredAppend): number[] {
  const { index, total } = header
  if (!Number.isInteger(total) || total < 2 || total > 8) {
    throw new InvalidInputError(
      `MaxiCode Structured Append holds 2 to 8 symbols, got ${String(total)}`,
    )
  }
  if (!Number.isInteger(index) || index < 1 || index > total) {
    throw new InvalidInputError(
      `MaxiCode Structured Append symbol ${String(index)} is outside a sequence of ${total}`,
    )
  }
  return [symbolOf(SET_A, PAD), (index - 1) * 8 + (total - 1)]
}

/**
 * A MaxiCode symbol holds 138 digits. This is not that limit but a bound on the
 * work: past it there is nothing to search.
 */
const MAX_MAXICODE_CHARACTERS = 200

/**
 * Encode text as MaxiCode
 * Returns a 33x30 boolean matrix (hexagonal grid representation)
 */
export function encodeMaxiCode(text: string, options: MaxiCodeOptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("MaxiCode input must not be empty")
  }

  if (text.length > MAX_MAXICODE_CHARACTERS) {
    throw new CapacityError(
      `MaxiCode: ${text.length} characters, the symbol holds at most ${MAX_MAXICODE_CHARACTERS}`,
    )
  }

  const mode = options.mode ?? 4
  if (mode !== 2 && mode !== 3 && mode !== 4 && mode !== 5 && mode !== 6) {
    throw new InvalidInputError(`MaxiCode: mode must be 2, 3, 4, 5 or 6, received ${mode}`)
  }

  const message = encodeMaxiCodeText(text)
  let body = options.structuredAppend
    ? [...structuredAppendCodewords(options.structuredAppend), ...message.codewords]
    : message.codewords
  let padValue = PAD_CODES[message.set]!

  // Secondary message length: 68 codewords for mode 5 (enhanced ECC), else 84
  const secondaryTotal = mode === 5 ? 68 : 84
  const capacity = mode === 2 || mode === 3 ? secondaryTotal : secondaryTotal + 9

  // Code sets C and D have no pad codeword, so latch back to A before padding
  if (padValue === -1) {
    if (body.length < capacity) body = [...body, symbolOf(message.set, LA)]
    padValue = PAD_CODES[SET_A]!
  }

  if (body.length > capacity) {
    throw new CapacityError(
      `MaxiCode: message needs ${body.length} codewords but mode ${mode} holds ${capacity}`,
    )
  }

  let primaryData: number[]
  let secondaryRaw: number[]

  if (mode === 2 || mode === 3) {
    primaryData = buildPrimary(
      options.postalCode ?? "",
      options.countryCode ?? 840,
      options.serviceClass ?? 1,
      mode,
    )
    secondaryRaw = Array.from<number>({ length: secondaryTotal }).fill(padValue)
    for (const [i, cw] of body.entries()) secondaryRaw[i] = cw
  } else {
    // Modes 4/5/6: mode indicator, then the message across primary and secondary
    const all = Array.from<number>({ length: secondaryTotal + 10 }).fill(padValue)
    all[0] = mode
    for (const [i, cw] of body.entries()) all[i + 1] = cw
    primaryData = all.slice(0, 10)
    secondaryRaw = all.slice(10)
  }

  // Reed-Solomon error correction over GF(64)
  // Primary: 10 data codewords -> 10 EC codewords
  const primaryEC = maxicodeRS(primaryData, 10)

  // Secondary: split into odd and even indexed codewords
  const seco: number[] = []
  const sece: number[] = []
  for (const [i, cw] of secondaryRaw.entries()) {
    if (i % 2 === 0) {
      seco.push(cw)
    } else {
      sece.push(cw)
    }
  }

  // EC count per interleaved part
  const secECCount = secondaryTotal === 84 ? 20 : 28
  const secoEC = maxicodeRS(seco, secECCount)
  const seceEC = maxicodeRS(sece, secECCount)

  // Reassemble secondary EC by interleaving odd and even EC
  const secChk: number[] = []
  for (let i = 0; i < secECCount; i++) {
    secChk.push(secoEC[i]!)
    secChk.push(seceEC[i]!)
  }

  // Assemble all codewords in transmission order:
  // Primary data (10) + Primary EC (10) + Secondary data (84/68) + Secondary EC (40/56)
  // Total: 144 codewords = 864 bits
  const allCW = [...primaryData, ...primaryEC, ...secondaryRaw, ...secChk]

  // Convert codewords to bit stream (6 bits per codeword, MSB first)
  const bits: number[] = []
  for (const cw of allCW) {
    for (let b = 5; b >= 0; b--) {
      bits.push((cw >> b) & 1)
    }
  }

  // Build 33x30 matrix — initially all white
  const pixs = new Uint8Array(ROWS * COLS) // 0 = white

  // Place data modules using the MODMAP placement sequence
  const maxBits = Math.min(bits.length, MODMAP.length)
  for (let i = 0; i < maxBits; i++) {
    if (bits[i] === 1) {
      pixs[MODMAP[i]!] = 1
    }
  }

  // Overlay the bullseye finder and orientation marks. These positions are
  // disjoint from MODMAP, so no data module is disturbed.
  for (const pos of FINDER_DARK) {
    pixs[pos] = 1
  }

  // Convert pixel array to boolean matrix
  const matrix: boolean[][] = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => pixs[r * COLS + c] === 1),
  )

  return matrix
}

export interface MaxiCodeSequenceOptions extends Omit<MaxiCodeOptions, "structuredAppend"> {
  /**
   * How many symbols to split the message into (2-8).
   * Omit to use the fewest that hold the data.
   */
  symbols?: number
}

/**
 * Encode text as a Structured Append sequence: a set of MaxiCode symbols a
 * reader reassembles into the original message.
 *
 * Every symbol is the same fixed size whatever it holds, so a message longer
 * than one takes has nowhere else to go. Each opens with a pad codeword and one
 * that holds its position and the count, two codewords ISO/IEC 16023 5.5 takes
 * out of every symbol.
 *
 * @example
 * ```ts
 * const symbols = encodeMaxiCodeSequence(longText, { symbols: 3 })
 * ```
 */
export function encodeMaxiCodeSequence(
  text: string,
  options: MaxiCodeSequenceOptions = {},
): boolean[][][] {
  if (text.length === 0) {
    throw new InvalidInputError("MaxiCode input must not be empty")
  }
  const { symbols: requested, ...symbolOptions } = options
  if (requested !== undefined && (requested < 2 || requested > 8)) {
    throw new InvalidInputError(
      `A MaxiCode Structured Append sequence holds 2 to 8 symbols, got ${requested}`,
    )
  }

  const chars = [...text]
  for (let total = requested ?? 2; total <= (requested ?? 8); total++) {
    const size = Math.ceil(chars.length / total)
    const chunks: string[] = []
    for (let i = 0; i < chars.length; i += size) chunks.push(chars.slice(i, i + size).join(""))
    if (chunks.length !== total) continue

    const symbols: boolean[][][] = []
    let overflowed = false
    for (const [index, chunk] of chunks.entries()) {
      try {
        symbols.push(
          encodeMaxiCode(chunk, {
            ...symbolOptions,
            structuredAppend: { index: index + 1, total },
          }),
        )
      } catch (error) {
        if (!(error instanceof CapacityError)) throw error
        overflowed = true
        break
      }
    }
    if (!overflowed) return symbols
    if (requested !== undefined) {
      throw new CapacityError(`Data does not fit in ${total} MaxiCode symbols`)
    }
  }

  throw new CapacityError("Data does not fit in a Structured Append sequence of 8 MaxiCode symbols")
}
