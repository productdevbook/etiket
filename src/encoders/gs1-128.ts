/**
 * GS1-128 (formerly EAN-128/UCC-128) barcode encoder
 * Extends Code 128 with FNC1 as first symbol after start code
 * and Application Identifier (AI) based data structure
 */

import { InvalidInputError } from "../errors";

// Code 128 encoding patterns (bar/space widths)
// Each pattern is 6 elements: bar, space, bar, space, bar, space
const PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], // 0
  [2, 2, 2, 1, 2, 2], // 1
  [2, 2, 2, 2, 2, 1], // 2
  [1, 2, 1, 2, 2, 3], // 3
  [1, 2, 1, 3, 2, 2], // 4
  [1, 3, 1, 2, 2, 2], // 5
  [1, 2, 2, 2, 1, 3], // 6
  [1, 2, 2, 3, 1, 2], // 7
  [1, 3, 2, 2, 1, 2], // 8
  [2, 2, 1, 2, 1, 3], // 9
  [2, 2, 1, 3, 1, 2], // 10
  [2, 3, 1, 2, 1, 2], // 11
  [1, 1, 2, 2, 3, 2], // 12
  [1, 2, 2, 1, 3, 2], // 13
  [1, 2, 2, 2, 3, 1], // 14
  [1, 1, 3, 2, 2, 2], // 15
  [1, 2, 3, 1, 2, 2], // 16
  [1, 2, 3, 2, 2, 1], // 17
  [2, 2, 3, 2, 1, 1], // 18
  [2, 2, 1, 1, 3, 2], // 19
  [2, 2, 1, 2, 3, 1], // 20
  [2, 1, 3, 2, 1, 2], // 21
  [2, 2, 3, 1, 1, 2], // 22
  [3, 1, 2, 1, 3, 1], // 23
  [3, 1, 1, 2, 2, 2], // 24
  [3, 2, 1, 1, 2, 2], // 25
  [3, 2, 1, 2, 2, 1], // 26
  [3, 1, 2, 2, 1, 2], // 27
  [3, 2, 2, 1, 1, 2], // 28
  [3, 2, 2, 2, 1, 1], // 29
  [2, 1, 2, 1, 2, 3], // 30
  [2, 1, 2, 3, 2, 1], // 31
  [2, 3, 2, 1, 2, 1], // 32
  [1, 1, 1, 3, 2, 3], // 33
  [1, 3, 1, 1, 2, 3], // 34
  [1, 3, 1, 3, 2, 1], // 35
  [1, 1, 2, 3, 1, 3], // 36
  [1, 3, 2, 1, 1, 3], // 37
  [1, 3, 2, 3, 1, 1], // 38
  [2, 1, 1, 3, 1, 3], // 39
  [2, 3, 1, 1, 1, 3], // 40
  [2, 3, 1, 3, 1, 1], // 41
  [1, 1, 2, 1, 3, 3], // 42
  [1, 1, 2, 3, 3, 1], // 43
  [1, 3, 2, 1, 3, 1], // 44
  [1, 1, 3, 1, 2, 3], // 45
  [1, 1, 3, 3, 2, 1], // 46
  [1, 3, 3, 1, 2, 1], // 47
  [3, 1, 3, 1, 2, 1], // 48
  [2, 1, 1, 3, 3, 1], // 49
  [2, 3, 1, 1, 3, 1], // 50
  [2, 1, 3, 1, 1, 3], // 51
  [2, 1, 3, 3, 1, 1], // 52
  [2, 1, 3, 1, 3, 1], // 53
  [3, 1, 1, 1, 2, 3], // 54
  [3, 1, 1, 3, 2, 1], // 55
  [3, 3, 1, 1, 2, 1], // 56
  [3, 1, 2, 1, 1, 3], // 57
  [3, 1, 2, 3, 1, 1], // 58
  [3, 3, 2, 1, 1, 1], // 59
  [2, 1, 2, 1, 3, 2], // 60
  [2, 1, 2, 2, 3, 1], // 61
  [2, 1, 2, 3, 1, 2], // 62
  [1, 4, 2, 1, 1, 2], // 63
  [1, 1, 4, 2, 1, 2], // 64
  [1, 2, 4, 1, 1, 2], // 65
  [1, 1, 1, 2, 4, 2], // 66
  [1, 2, 1, 1, 4, 2], // 67
  [1, 2, 1, 2, 4, 1], // 68
  [4, 2, 1, 1, 1, 2], // 69
  [4, 2, 1, 2, 1, 1], // 70
  [4, 1, 2, 1, 1, 2], // 71
  [2, 4, 1, 2, 1, 1], // 72
  [2, 2, 1, 4, 1, 1], // 73
  [4, 1, 1, 2, 1, 2], // 74
  [1, 1, 1, 2, 2, 4], // 75
  [1, 1, 1, 4, 2, 2], // 76
  [1, 2, 1, 1, 2, 4], // 77
  [1, 2, 1, 4, 2, 1], // 78
  [1, 4, 1, 1, 2, 2], // 79
  [1, 4, 1, 2, 2, 1], // 80
  [1, 1, 2, 2, 1, 4], // 81
  [1, 1, 2, 4, 1, 2], // 82
  [1, 2, 2, 1, 1, 4], // 83
  [1, 2, 2, 4, 1, 1], // 84
  [1, 4, 2, 1, 1, 2], // 85
  [1, 4, 2, 2, 1, 1], // 86
  [2, 4, 1, 1, 1, 2], // 87
  [2, 2, 1, 1, 1, 4], // 88
  [4, 1, 1, 2, 2, 1], // 89
  [4, 2, 2, 1, 1, 1], // 90
  [2, 1, 2, 1, 4, 1], // 91
  [2, 1, 4, 1, 2, 1], // 92
  [4, 1, 2, 1, 2, 1], // 93
  [1, 1, 1, 1, 4, 3], // 94
  [1, 1, 1, 3, 4, 1], // 95
  [1, 3, 1, 1, 4, 1], // 96 (CODE_A in B/C)
  [1, 1, 4, 1, 1, 3], // 97 (CODE_B in A/C)
  [1, 1, 4, 3, 1, 1], // 98 (CODE_C in A/B)
  [4, 1, 1, 1, 1, 3], // 99 (CODE_C)
  [4, 1, 1, 3, 1, 1], // 100 (FNC1 / CODE_B)
  [1, 1, 3, 1, 4, 1], // 101 (CODE_A)
  [1, 1, 4, 1, 3, 1], // 102 (FNC1)
  [2, 1, 1, 4, 1, 2], // 103 (START_A)
  [2, 1, 1, 2, 1, 4], // 104 (START_B)
  [2, 1, 1, 2, 3, 2], // 105 (START_C)
];

const STOP_PATTERN = [2, 3, 3, 1, 1, 1, 2]; // 7 elements

const _START_A = 103;
const START_B = 104;
const START_C = 105;
const CODE_A = 101;
const CODE_B = 100;
const CODE_C = 99;
const FNC1 = 102;

/**
 * Application Identifier definitions
 * Each entry defines: AI prefix, data length constraints, whether it's fixed-length
 */
interface AIDefinition {
  /** AI code string */
  ai: string;
  /** Fixed data length (excluding AI), or 0 if variable */
  fixedLength: number;
  /** Maximum data length for variable-length AIs */
  maxLength: number;
  /** Regex pattern for validating the data portion */
  dataPattern: RegExp;
}

// Helper: GS1 alphanumeric character class (CSET 82)
const AN = (max: number) =>
  new RegExp(`^[\\x21-\\x22\\x25-\\x2F\\x30-\\x39\\x41-\\x5A\\x5F\\x61-\\x7A]{1,${max}}$`);
const N = (len: number) => new RegExp(`^\\d{${len}}$`);
const NV = (max: number) => new RegExp(`^\\d{1,${max}}$`);

const AI_DEFINITIONS: AIDefinition[] = [
  // Identification
  { ai: "00", fixedLength: 18, maxLength: 18, dataPattern: N(18) }, // SSCC
  { ai: "01", fixedLength: 14, maxLength: 14, dataPattern: N(14) }, // GTIN
  { ai: "02", fixedLength: 14, maxLength: 14, dataPattern: N(14) }, // GTIN of contained items

  // Batch/Serial
  { ai: "10", fixedLength: 0, maxLength: 20, dataPattern: AN(20) }, // Batch/Lot
  { ai: "21", fixedLength: 0, maxLength: 20, dataPattern: AN(20) }, // Serial number
  { ai: "22", fixedLength: 0, maxLength: 20, dataPattern: AN(20) }, // Consumer product variant

  // Dates (YYMMDD)
  { ai: "11", fixedLength: 6, maxLength: 6, dataPattern: N(6) }, // Production date
  { ai: "12", fixedLength: 6, maxLength: 6, dataPattern: N(6) }, // Due date (payment)
  { ai: "13", fixedLength: 6, maxLength: 6, dataPattern: N(6) }, // Packaging date
  { ai: "15", fixedLength: 6, maxLength: 6, dataPattern: N(6) }, // Best before
  { ai: "16", fixedLength: 6, maxLength: 6, dataPattern: N(6) }, // Sell by date
  { ai: "17", fixedLength: 6, maxLength: 6, dataPattern: N(6) }, // Expiry date

  // Variant / Count
  { ai: "20", fixedLength: 2, maxLength: 2, dataPattern: N(2) }, // Variant number
  { ai: "30", fixedLength: 0, maxLength: 8, dataPattern: NV(8) }, // Variable count
  { ai: "37", fixedLength: 0, maxLength: 8, dataPattern: NV(8) }, // Number of units

  // Additional identification
  { ai: "240", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // Additional item ID
  { ai: "241", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // Customer part number
  { ai: "242", fixedLength: 0, maxLength: 6, dataPattern: NV(6) }, // Made-to-order variation
  { ai: "243", fixedLength: 0, maxLength: 20, dataPattern: AN(20) }, // Packaging component number
  { ai: "250", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // Secondary serial number
  { ai: "251", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // Reference to source entity
  { ai: "253", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // GDTI
  { ai: "254", fixedLength: 0, maxLength: 20, dataPattern: AN(20) }, // GLN extension component
  { ai: "255", fixedLength: 0, maxLength: 25, dataPattern: NV(25) }, // GCN

  // Order / Shipment
  { ai: "400", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // Order number
  { ai: "401", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // Consignment number
  { ai: "402", fixedLength: 17, maxLength: 17, dataPattern: N(17) }, // Shipment ID (GSIN)
  { ai: "403", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // Routing code

  // Location (GLN)
  { ai: "410", fixedLength: 13, maxLength: 13, dataPattern: N(13) }, // Ship to (deliver to)
  { ai: "411", fixedLength: 13, maxLength: 13, dataPattern: N(13) }, // Bill to (invoice to)
  { ai: "412", fixedLength: 13, maxLength: 13, dataPattern: N(13) }, // Purchased from
  { ai: "413", fixedLength: 13, maxLength: 13, dataPattern: N(13) }, // Ship for (deliver for)
  { ai: "414", fixedLength: 13, maxLength: 13, dataPattern: N(13) }, // Physical location ID
  { ai: "415", fixedLength: 13, maxLength: 13, dataPattern: N(13) }, // Invoicing party GLN

  // Postal codes
  { ai: "420", fixedLength: 0, maxLength: 20, dataPattern: AN(20) }, // Ship to postal code (domestic)
  {
    ai: "421",
    fixedLength: 0,
    maxLength: 12,
    dataPattern: /^\d{3}[\x21-\x22\x25-\x2F\x30-\x39\x41-\x5A\x5F\x61-\x7A]{0,9}$/,
  }, // Ship to postal code (with country)
  { ai: "422", fixedLength: 3, maxLength: 3, dataPattern: N(3) }, // Country of origin
  { ai: "423", fixedLength: 0, maxLength: 15, dataPattern: NV(15) }, // Country of initial processing
  { ai: "424", fixedLength: 3, maxLength: 3, dataPattern: N(3) }, // Country of processing
  { ai: "425", fixedLength: 0, maxLength: 15, dataPattern: NV(15) }, // Country of disassembly
  { ai: "426", fixedLength: 3, maxLength: 3, dataPattern: N(3) }, // Country of full processing

  // Special applications
  { ai: "7001", fixedLength: 13, maxLength: 13, dataPattern: N(13) }, // NATO stock number
  { ai: "7002", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // UN/ECE meat carcasses
  { ai: "7003", fixedLength: 10, maxLength: 10, dataPattern: N(10) }, // Expiry date and time
  { ai: "7004", fixedLength: 0, maxLength: 4, dataPattern: NV(4) }, // Active potency

  // Coupon / payment
  { ai: "8001", fixedLength: 14, maxLength: 14, dataPattern: N(14) }, // Roll products
  { ai: "8002", fixedLength: 0, maxLength: 20, dataPattern: AN(20) }, // Cellular mobile telephone ID
  { ai: "8003", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // GRAI
  { ai: "8004", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // GIAI
  { ai: "8005", fixedLength: 6, maxLength: 6, dataPattern: N(6) }, // Price per unit of measure
  { ai: "8006", fixedLength: 18, maxLength: 18, dataPattern: N(18) }, // ITIP
  { ai: "8007", fixedLength: 0, maxLength: 34, dataPattern: AN(34) }, // IBAN
  { ai: "8008", fixedLength: 0, maxLength: 12, dataPattern: NV(12) }, // Date and time of production
  { ai: "8010", fixedLength: 0, maxLength: 30, dataPattern: AN(30) }, // Component/Part ID (CPID)
  { ai: "8011", fixedLength: 0, maxLength: 12, dataPattern: NV(12) }, // CPID serial number
  { ai: "8017", fixedLength: 18, maxLength: 18, dataPattern: N(18) }, // GSRN — provider
  { ai: "8018", fixedLength: 18, maxLength: 18, dataPattern: N(18) }, // GSRN — recipient
  { ai: "8020", fixedLength: 0, maxLength: 25, dataPattern: AN(25) }, // Payment slip reference number
];

// Trade measures: 310x-369x (x = decimal indicator 0-9)
// 310x=net weight kg, 311x=length m, 312x=width m, 313x=depth m,
// 314x=area m², 315x=net volume L, 316x=net volume m³,
// 320x=net weight lbs, 321x=length in, 322x=length ft, 323x=length yd,
// 324x=width in, 325x=width ft, 326x=width yd,
// 327x=depth in, 328x=depth ft, 329x=depth yd,
// 330x=logistic weight kg, 331x=length m, 332x=width m, 333x=depth m,
// 334x=area m², 335x=logistic volume L, 336x=logistic volume m³,
// 340x=logistic weight lbs, 341x=length in, 342x=length ft, 343x=length yd,
// 344x=width in, 345x=width ft, 346x=width yd,
// 347x=depth in, 348x=depth ft, 349x=depth yd,
// 350x=area in², 351x=area ft², 352x=area yd²,
// 353x=gross weight kg, 356x=net weight troy oz, 357x=net weight oz,
// 360x=net volume qt, 361x=net volume gal, 362x=logistic volume qt,
// 363x=logistic volume gal, 364x=net volume in³, 365x=net volume ft³,
// 366x=net volume yd³, 367x=logistic volume in³, 368x=logistic volume ft³, 369x=logistic volume yd³
for (let prefix = 310; prefix <= 369; prefix++) {
  for (let x = 0; x <= 9; x++) {
    AI_DEFINITIONS.push({ ai: `${prefix}${x}`, fixedLength: 6, maxLength: 6, dataPattern: N(6) });
  }
}

// Amount payable: 390x-394x
for (let prefix = 390; prefix <= 394; prefix++) {
  for (let x = 0; x <= 9; x++) {
    AI_DEFINITIONS.push({
      ai: `${prefix}${x}`,
      fixedLength: 0,
      maxLength: 15,
      dataPattern: NV(15),
    });
  }
}

// NHRN (National Healthcare Reimbursement Number): 710-719
for (let ai = 710; ai <= 719; ai++) {
  AI_DEFINITIONS.push({ ai: `${ai}`, fixedLength: 0, maxLength: 20, dataPattern: AN(20) });
}

/**
 * Find the AI definition matching a given AI code
 */
function findAIDefinition(ai: string): AIDefinition | undefined {
  return AI_DEFINITIONS.find((def) => def.ai === ai);
}

/**
 * Parse parenthesized AI format into fields
 * E.g. "(01)12345678901234(17)260101(10)ABC123"
 */
export function parseAIString(text: string): { ai: string; data: string }[] {
  const fields: { ai: string; data: string }[] = [];
  let pos = 0;

  while (pos < text.length) {
    if (text[pos] !== "(") {
      throw new InvalidInputError(`Expected '(' at position ${pos} in GS1-128 AI string`);
    }

    const closePos = text.indexOf(")", pos + 1);
    if (closePos === -1) {
      throw new InvalidInputError(`Missing closing ')' for AI starting at position ${pos}`);
    }

    const ai = text.slice(pos + 1, closePos);
    if (ai.length < 2 || ai.length > 4) {
      throw new InvalidInputError(`Invalid AI '${ai}' — must be 2-4 digits`);
    }
    if (!/^\d+$/.test(ai)) {
      throw new InvalidInputError(`Invalid AI '${ai}' — must contain only digits`);
    }

    // Find where data ends (at the next '(' or end of string)
    const dataStart = closePos + 1;
    let dataEnd = text.indexOf("(", dataStart);
    if (dataEnd === -1) {
      dataEnd = text.length;
    }

    const data = text.slice(dataStart, dataEnd);
    if (data.length === 0) {
      throw new InvalidInputError(`Empty data for AI '${ai}'`);
    }

    fields.push({ ai, data });
    pos = dataEnd;
  }

  if (fields.length === 0) {
    throw new InvalidInputError("GS1-128 AI string contains no fields");
  }

  return fields;
}

/**
 * Check if an AI field is variable-length
 */
export function isVariableLength(ai: string): boolean {
  const def = findAIDefinition(ai);
  if (def) {
    return def.fixedLength === 0;
  }
  // Unknown AIs are treated as variable-length for safety
  return true;
}

/**
 * Validate AI data against known definitions
 */
function validateAIField(ai: string, data: string): void {
  const def = findAIDefinition(ai);
  if (!def) {
    // Unknown AI — allow but don't validate content
    return;
  }

  if (def.fixedLength > 0 && data.length !== def.fixedLength) {
    throw new InvalidInputError(
      `AI '${ai}' requires exactly ${def.fixedLength} characters, got ${data.length}`,
    );
  }

  if (data.length > def.maxLength) {
    throw new InvalidInputError(`AI '${ai}' data exceeds maximum length of ${def.maxLength}`);
  }

  if (!def.dataPattern.test(data)) {
    throw new InvalidInputError(`AI '${ai}' data '${data}' does not match expected format`);
  }
}

/**
 * Count leading numeric characters from a position
 */
function countNumericFromPos(text: string, pos: number): number {
  let count = 0;
  while (pos + count < text.length) {
    const c = text.charCodeAt(pos + count);
    if (c < 48 || c > 57) break;
    count++;
  }
  return count;
}

/**
 * Encode digit pairs in Code C mode, returning the new position
 */
function encodeCodeC(text: string, pos: number, codes: number[]): number {
  while (pos + 1 < text.length) {
    const d1 = text.charCodeAt(pos) - 48;
    const d2 = text.charCodeAt(pos + 1) - 48;
    if (d1 < 0 || d1 > 9 || d2 < 0 || d2 > 9) break;
    codes.push(d1 * 10 + d2);
    pos += 2;
  }
  return pos;
}

/**
 * Build Code 128 symbol values from data string with embedded FNC1 markers
 * FNC1 is represented as \xF1 (241) in the internal string
 */
function buildCodes(data: string): number[] {
  const codes: number[] = [];
  let pos = 0;

  // Determine optimal start code
  // Check for FNC1 at position 0 — skip it for start code analysis
  let analyzePos = 0;
  if (analyzePos < data.length && data.charCodeAt(analyzePos) === 0xf1) {
    analyzePos++;
  }

  const numericRun = countNumericFromPos(data, analyzePos);

  if (numericRun >= 4) {
    codes.push(START_C);
  } else {
    codes.push(START_B);
  }

  let currentSet: "A" | "B" | "C" = codes[0] === START_C ? "C" : "B";

  while (pos < data.length) {
    // Handle FNC1 marker
    if (data.charCodeAt(pos) === 0xf1) {
      codes.push(FNC1);
      pos++;
      continue;
    }

    if (currentSet === "C") {
      const remaining = countNumericFromPos(data, pos);
      if (remaining >= 2) {
        pos = encodeCodeC(data, pos, codes);
      } else {
        codes.push(CODE_B);
        currentSet = "B";
      }
    } else {
      const numRun = countNumericFromPos(data, pos);
      if (numRun >= 4 || (numRun >= 2 && pos + numRun >= data.length)) {
        codes.push(CODE_C);
        currentSet = "C";
        pos = encodeCodeC(data, pos, codes);
      } else {
        const charCode = data.charCodeAt(pos);
        if (charCode >= 32 && charCode <= 126) {
          // Code B
          codes.push(charCode - 32);
        } else if (charCode >= 0 && charCode < 32) {
          // Need Code A for control chars
          if (currentSet !== "A") {
            codes.push(CODE_A);
            currentSet = "A";
          }
          codes.push(charCode + 64);
        } else {
          throw new InvalidInputError(
            `Character at position ${pos} (code ${charCode}) is not encodable in GS1-128`,
          );
        }
        pos++;
      }
    }
  }

  // Calculate checksum
  let checksum = codes[0]!;
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i]! * i;
  }
  codes.push(checksum % 103);

  return codes;
}

/**
 * Encode a GS1-128 barcode
 *
 * Accepts either:
 * 1. Parenthesized AI format: "(01)12345678901234(17)260101(10)ABC123"
 * 2. Plain string (encoded as-is with FNC1 start)
 *
 * @param text - Data string to encode
 * @returns Array of bar widths (alternating bar/space)
 */
export function encodeGS1128(text: string): number[] {
  if (text.length === 0) {
    throw new InvalidInputError("GS1-128 input must not be empty");
  }

  // Build the internal data string with FNC1 markers
  let data: string;

  if (text.startsWith("(")) {
    // Parenthesized AI format — parse and validate
    const fields = parseAIString(text);

    // Validate each field
    for (const field of fields) {
      validateAIField(field.ai, field.data);
    }

    // Build data string: FNC1 + AI1 + data1 [+ FNC1 + AI2 + data2 ...]
    // FNC1 separators are needed after variable-length fields (except the last field)
    let result = "\xF1"; // Leading FNC1 (GS1-128 identifier)

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]!;
      result += field.ai + field.data;

      // Insert FNC1 separator after variable-length AIs, except the last field
      if (i < fields.length - 1 && isVariableLength(field.ai)) {
        result += "\xF1";
      }
    }

    data = result;
  } else {
    // Plain string — just prepend FNC1
    data = "\xF1" + text;
  }

  // Build Code 128 symbol values
  const codes = buildCodes(data);

  // Convert to bar widths
  const bars: number[] = [];

  for (const code of codes) {
    const pattern = PATTERNS[code]!;
    for (const width of pattern) {
      bars.push(width);
    }
  }

  // Stop pattern
  for (const width of STOP_PATTERN) {
    bars.push(width);
  }

  return bars;
}
