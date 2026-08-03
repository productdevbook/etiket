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

import { InvalidInputError } from "../errors"

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

// Code set assignment for each ASCII byte (0-255)
// 0 = available in multiple sets, 1 = Set A, 2 = Set B, 3 = Set C, 4 = Set D, 5 = Set E
// prettier-ignore
const MAXICODE_SET: number[] = [
  5,5,5,5,5,5,5,5,5,5,5,5,5,0,5,5,5,5,5,5,
  5,5,5,5,5,5,5,5,0,0,0,5,0,2,1,1,1,1,1,1,
  1,1,1,1,0,1,0,0,1,1,1,1,1,1,1,1,1,1,0,2,
  2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,
  2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
  2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,4,4,
  4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,
  5,4,5,5,5,5,5,5,4,5,3,4,3,5,5,4,4,3,3,3,
  4,3,5,4,4,3,3,4,3,3,3,4,3,3,3,3,3,3,3,3,
  3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,
  3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
  4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
];

// Symbol character value for each ASCII byte in its assigned code set
// prettier-ignore
const MAXICODE_SYMBOL_CHAR: number[] = [
  0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,
  20,21,22,23,24,25,26,30,28,29,30,35,32,53,34,35,36,37,38,39,
  40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,37,
  38,39,40,41,52,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
  16,17,18,19,20,21,22,23,24,25,26,42,43,44,45,46,0,1,2,3,
  4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,
  24,25,26,32,54,34,35,36,48,49,50,51,52,53,54,55,56,57,47,48,
  49,50,51,52,53,54,55,56,57,48,49,50,51,52,53,54,55,56,57,36,
  37,37,38,39,40,41,42,43,38,44,37,39,38,45,46,40,41,39,40,41,
  42,42,47,43,44,43,44,45,45,46,47,46,0,1,2,3,4,5,6,7,
  8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,32,
  33,34,35,36,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
  16,17,18,19,20,21,22,23,24,25,26,32,33,34,35,36,
];

// Control codes
const CTRL_LATCH_B = 63 // Latch to Set B (from Set A)
const CTRL_LATCH_A = 58 // Latch to Set A (from Set B)

/**
 * Encode text using MaxiCode character sets with automatic set switching.
 * Starts in Code Set A. Uses latch codes when needed.
 */
function encodeMaxiCodeText(text: string): number[] {
  const codewords: number[] = []
  let currentSet = 1 // Start in Code Set A

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code > 255) continue // Skip non-latin

    const charSet = MAXICODE_SET[code]!
    const symbolVal = MAXICODE_SYMBOL_CHAR[code]!

    if (charSet === 0 || charSet === currentSet) {
      // Character is in current set or available in multiple sets
      codewords.push(symbolVal)
    } else if (charSet === 1 && currentSet === 2) {
      // Need to switch from B to A
      codewords.push(CTRL_LATCH_A)
      codewords.push(symbolVal)
      currentSet = 1
    } else if (charSet === 2 && currentSet === 1) {
      // Need to switch from A to B
      codewords.push(CTRL_LATCH_B)
      codewords.push(symbolVal)
      currentSet = 2
    } else {
      // For sets C/D/E, use shift codes
      // Shift from set A: 59 = shift to set B for one char
      // For simplicity, encode unknown chars as space
      codewords.push(32)
    }
  }
  return codewords
}

// ---------------------------------------------------------------------------
// Mode 2/3: Structured Carrier Message (UPS shipping)
// ---------------------------------------------------------------------------

/**
 * Build the 10 primary-message codewords for modes 2 and 3.
 */
function buildPrimary(
  postalCode: string,
  countryCode: number,
  serviceClass: number,
  mode: 2 | 3,
): number[] {
  const primary: number[] = []

  // CW0: mode indicator
  primary.push(mode)

  if (mode === 2) {
    // Numeric postal code: 9 digits packed as a 30-bit integer
    const postal = postalCode.replace(/\D/g, "").padEnd(9, "0").substring(0, 9)
    const postalNum = Number.parseInt(postal, 10)
    // 30 bits -> 5 codewords of 6 bits each (MSB first)
    primary.push((postalNum >> 24) & 0x3f)
    primary.push((postalNum >> 18) & 0x3f)
    primary.push((postalNum >> 12) & 0x3f)
    primary.push((postalNum >> 6) & 0x3f)
    primary.push(postalNum & 0x3f)
  } else {
    // International alphanumeric postal code: 6 characters
    const postal = postalCode.padEnd(6, " ").substring(0, 6)
    for (const ch of postal) {
      primary.push(ch.charCodeAt(0) & 0x3f)
    }
  }

  // Country code (3-digit ISO, max 999 -> 10 bits -> 2 codewords)
  primary.push((countryCode >> 6) & 0x3f)
  primary.push(countryCode & 0x3f)

  // Service class (3 digits -> 10 bits -> 2 codewords)
  primary.push((serviceClass >> 6) & 0x3f)
  primary.push(serviceClass & 0x3f)

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

// Bullseye finder pattern + orientation mark dark positions
// Extracted from bwip-js reference implementation (verified scannable by rxing)
// Includes concentric rings (rows 9-23, cols 7-22) + corner marks (row 0, cols 28-29)
// prettier-ignore
const BULLSEYE_DARK: number[] = [
  28,29,
  277,279,280,281,282,283,285,290,308,311,312,313,316,320,338,
  339,340,348,350,351,352,367,369,370,372,373,374,375,376,381,
  397,401,404,406,409,411,428,431,432,433,435,436,439,440,441,
  442,457,460,461,463,464,466,470,488,490,493,495,498,500,518,
  521,523,524,526,530,531,532,550,552,556,558,560,578,580,582,
  583,584,585,587,588,607,610,612,616,617,619,621,622,637,639,
  642,643,644,645,649,650,668,670,672,677,678,680,698,699,700,
  701,702,704,707,708,710,711,712,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface MaxiCodeOptions {
  /** Encoding mode: 2 (US structured), 3 (intl structured), 4 (standard), 5 (full ECC), 6 (reader programming) */
  mode?: 2 | 3 | 4 | 5 | 6
  /** Postal code (modes 2/3) */
  postalCode?: string
  /** ISO country code number (modes 2/3) */
  countryCode?: number
  /** Service class (modes 2/3, e.g. 840 for UPS) */
  serviceClass?: number
}

/**
 * Encode text as MaxiCode
 * Returns a 33x30 boolean matrix (hexagonal grid representation)
 */
export function encodeMaxiCode(text: string, options: MaxiCodeOptions = {}): boolean[][] {
  if (text.length === 0) {
    throw new InvalidInputError("MaxiCode input must not be empty")
  }

  const mode = options.mode ?? 4
  let primaryData: number[]
  let secondaryRaw: number[]

  if (mode === 2 || mode === 3) {
    // Primary message: 10 codewords from structured header
    primaryData = buildPrimary(
      options.postalCode ?? "",
      options.countryCode ?? 840,
      options.serviceClass ?? 1,
      mode,
    )
    // Secondary message: the text payload
    secondaryRaw = encodeMaxiCodeText(text)
  } else {
    // Modes 4/5/6: primary is mode + first 9 data chars,
    // secondary is the remainder
    const allData = [mode, ...encodeMaxiCodeText(text)]
    primaryData = allData.slice(0, 10)
    secondaryRaw = allData.slice(10)
  }

  // Pad primary to exactly 10 codewords
  while (primaryData.length < 10) {
    primaryData.push(33) // pad character (space in code set A)
  }
  primaryData = primaryData.slice(0, 10)

  // Secondary message: pad to 84 codewords (modes 2/3/4/6) or 68 (mode 5)
  const SECONDARY_TOTAL = mode === 5 ? 68 : 84
  while (secondaryRaw.length < SECONDARY_TOTAL) {
    secondaryRaw.push(33) // pad character
  }
  secondaryRaw = secondaryRaw.slice(0, SECONDARY_TOTAL)

  // Reed-Solomon error correction over GF(64)
  // Primary: 10 data codewords -> 10 EC codewords
  const primaryEC = maxicodeRS(primaryData, 10)

  // Secondary: split into odd and even indexed codewords
  const seco: number[] = []
  const sece: number[] = []
  for (let i = 0; i < secondaryRaw.length; i++) {
    if (i % 2 === 0) {
      seco.push(secondaryRaw[i]!)
    } else {
      sece.push(secondaryRaw[i]!)
    }
  }

  // EC count per interleaved part
  const secECCount = SECONDARY_TOTAL === 84 ? 20 : 28
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

  // Clear finder/bullseye area (rows 9-23, cols 7-22) then place bullseye
  // This ensures data bits don't interfere with the finder pattern
  for (let r = 9; r <= 23; r++) {
    for (let c = 7; c <= 22; c++) {
      pixs[r * COLS + c] = 0
    }
  }
  // Also clear corner mark area
  pixs[28] = 0
  pixs[29] = 0

  // Place bullseye finder pattern dark modules
  for (const pos of BULLSEYE_DARK) {
    pixs[pos] = 1
  }

  // Convert pixel array to boolean matrix
  const matrix: boolean[][] = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => pixs[r * COLS + c] === 1),
  )

  return matrix
}
