/**
 * PDF417 data compaction encoder
 * Supports Text, Byte, and Numeric compaction modes
 */

import {
  TEXT_ALPHA_MAP,
  TEXT_LOWER_MAP,
  TEXT_MIXED_MAP,
  TEXT_PUNCT_MAP,
  TEXT_SWITCH,
  MODE_LATCH,
  TextSubMode,
} from "./tables";

/**
 * Encode input text into PDF417 data codewords.
 * Auto-detects the best compaction mode for segments of the input.
 *
 * @param text - Input string to encode
 * @returns Array of codeword values (0-928), not including symbol length descriptor or EC
 */
export function encodeData(text: string): number[] {
  const bytes = textToBytes(text);
  const segments = analyzeSegments(bytes);
  const codewords: number[] = [];

  for (const segment of segments) {
    switch (segment.mode) {
      case "text":
        encodeTextSegment(text.slice(segment.start, segment.end), codewords);
        break;
      case "numeric":
        encodeNumericSegment(text.slice(segment.start, segment.end), codewords);
        break;
      case "byte":
        encodeByteSegment(bytes.slice(segment.start, segment.end), codewords);
        break;
    }
  }

  return codewords;
}

// ---- Segment analysis ----

interface Segment {
  mode: "text" | "byte" | "numeric";
  start: number;
  end: number;
}

// ISO-8859-15 differs from ISO-8859-1 at these code points
const ISO_8859_15_MAP: Record<number, number> = {
  0x20ac: 0xa4, // € Euro sign
  0x0160: 0xa6, // Š
  0x0161: 0xa8, // š
  0x017d: 0xb4, // Ž
  0x017e: 0xb8, // ž
  0x0152: 0xbc, // Œ
  0x0153: 0xbd, // œ
  0x0178: 0xbe, // Ÿ
};

/** Convert string to byte array with ISO-8859-15 support */
function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const mapped = ISO_8859_15_MAP[code];
    if (mapped !== undefined) {
      bytes.push(mapped);
    } else if (code <= 0xff) {
      bytes.push(code);
    } else {
      // Fallback: use byte compaction for non-Latin characters
      bytes.push(code & 0xff);
    }
  }
  return bytes;
}

/** Check if a character is encodable in text compaction mode */
function isTextCompactable(ch: string): boolean {
  return (
    TEXT_ALPHA_MAP[ch] !== undefined ||
    TEXT_LOWER_MAP[ch] !== undefined ||
    TEXT_MIXED_MAP[ch] !== undefined ||
    TEXT_PUNCT_MAP[ch] !== undefined
  );
}

/** Check if a character is a digit */
function isDigit(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return c >= 48 && c <= 57;
}

/**
 * Analyze input and split into optimal segments by compaction mode.
 * - Runs of 13+ digits use numeric compaction
 * - Runs of text-compactable characters use text compaction
 * - Everything else uses byte compaction
 */
function analyzeSegments(bytes: number[]): Segment[] {
  const text = String.fromCharCode(...bytes);
  const segments: Segment[] = [];
  let pos = 0;

  while (pos < text.length) {
    // Check for long numeric run (13+ digits for efficiency)
    const numericRun = countDigits(text, pos);
    if (numericRun >= 13) {
      segments.push({ mode: "numeric", start: pos, end: pos + numericRun });
      pos += numericRun;
      continue;
    }

    // Check for text-compactable run
    const textRun = countTextCompactable(text, pos);
    if (textRun > 0) {
      segments.push({ mode: "text", start: pos, end: pos + textRun });
      pos += textRun;
      continue;
    }

    // Byte mode for non-text bytes
    const byteRun = countNonTextCompactable(text, pos);
    segments.push({ mode: "byte", start: pos, end: pos + byteRun });
    pos += byteRun;
  }

  return segments;
}

function countDigits(text: string, pos: number): number {
  let count = 0;
  while (pos + count < text.length && isDigit(text[pos + count]!)) {
    count++;
  }
  return count;
}

function countTextCompactable(text: string, pos: number): number {
  let count = 0;
  while (pos + count < text.length && isTextCompactable(text[pos + count]!)) {
    count++;
  }
  return count;
}

function countNonTextCompactable(text: string, pos: number): number {
  let count = 0;
  while (pos + count < text.length && !isTextCompactable(text[pos + count]!)) {
    // Also break if we hit a long numeric run
    if (isDigit(text[pos + count]!)) break;
    count++;
  }
  return Math.max(count, 1);
}

// ---- Text compaction ----

/**
 * Encode a text segment using text compaction mode.
 * Characters are encoded as pairs of values packed into codewords.
 * Each codeword carries two sub-codeword values: high * 30 + low.
 */
function encodeTextSegment(text: string, codewords: number[]): void {
  // Text compaction mode latch (900) — default mode, only needed if switching from another mode
  // For the first segment, text mode is the default so no latch needed.
  // For subsequent segments, we add the latch.
  if (codewords.length > 0) {
    codewords.push(MODE_LATCH.TEXT_COMPACTION);
  }

  const subCodewords = textToSubCodewords(text);

  // Pack sub-codewords into pairs → codewords
  // Each pair: high * 30 + low
  for (let i = 0; i < subCodewords.length; i += 2) {
    const high = subCodewords[i]!;
    const low = i + 1 < subCodewords.length ? subCodewords[i + 1]! : 0; // pad with 0 per ISO 15438
    codewords.push(high * 30 + low);
  }
}

/**
 * Convert text to a sequence of sub-codeword values using text compaction sub-modes.
 * Handles mode switching between Alpha, Lower, Mixed, and Punctuation sub-modes.
 */
function textToSubCodewords(text: string): number[] {
  const values: number[] = [];
  let currentMode: TextSubMode = TextSubMode.Alpha;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const encoded = encodeTextChar(ch, currentMode, values);
    currentMode = encoded;
  }

  return values;
}

/**
 * Encode a single character in text compaction, adding necessary mode switches.
 * Returns the new current sub-mode after encoding.
 */
function encodeTextChar(ch: string, currentMode: TextSubMode, values: number[]): TextSubMode {
  // Try encoding in current mode first
  const currentVal = getCharValue(ch, currentMode);
  if (currentVal !== -1) {
    values.push(currentVal);
    return currentMode;
  }

  // Need to switch mode. Find which mode can encode this character.
  if (currentMode === TextSubMode.Alpha) {
    // Try Lower
    const lowerVal = getCharValue(ch, TextSubMode.Lower);
    if (lowerVal !== -1) {
      values.push(TEXT_SWITCH.ALPHA_TO_LOWER); // latch to lower
      values.push(lowerVal);
      return TextSubMode.Lower;
    }
    // Try Mixed
    const mixedVal = getCharValue(ch, TextSubMode.Mixed);
    if (mixedVal !== -1) {
      values.push(TEXT_SWITCH.ALPHA_TO_MIXED); // latch to mixed
      values.push(mixedVal);
      return TextSubMode.Mixed;
    }
    // Try Punctuation (shift)
    const punctVal = getCharValue(ch, TextSubMode.Punctuation);
    if (punctVal !== -1) {
      values.push(TEXT_SWITCH.ALPHA_TO_PUNCT_SHIFT); // shift to punct
      values.push(punctVal);
      return TextSubMode.Alpha; // shift returns to current mode
    }
  } else if (currentMode === TextSubMode.Lower) {
    // Try Alpha (shift for single char)
    const alphaVal = getCharValue(ch, TextSubMode.Alpha);
    if (alphaVal !== -1) {
      values.push(TEXT_SWITCH.LOWER_TO_ALPHA_SHIFT); // shift to alpha
      values.push(alphaVal);
      return TextSubMode.Lower; // shift returns to lower
    }
    // Try Mixed
    const mixedVal = getCharValue(ch, TextSubMode.Mixed);
    if (mixedVal !== -1) {
      values.push(TEXT_SWITCH.LOWER_TO_MIXED); // latch to mixed
      values.push(mixedVal);
      return TextSubMode.Mixed;
    }
    // Try Punctuation (shift)
    const punctVal = getCharValue(ch, TextSubMode.Punctuation);
    if (punctVal !== -1) {
      values.push(TEXT_SWITCH.LOWER_TO_PUNCT_SHIFT); // shift to punct
      values.push(punctVal);
      return TextSubMode.Lower; // shift returns to current mode
    }
  } else if (currentMode === TextSubMode.Mixed) {
    // Try Lower
    const lowerVal = getCharValue(ch, TextSubMode.Lower);
    if (lowerVal !== -1) {
      values.push(TEXT_SWITCH.MIXED_TO_LOWER); // latch to lower
      values.push(lowerVal);
      return TextSubMode.Lower;
    }
    // Try Alpha
    const alphaVal = getCharValue(ch, TextSubMode.Alpha);
    if (alphaVal !== -1) {
      values.push(TEXT_SWITCH.MIXED_TO_ALPHA); // latch to alpha
      values.push(alphaVal);
      return TextSubMode.Alpha;
    }
    // Try Punctuation
    const punctVal = getCharValue(ch, TextSubMode.Punctuation);
    if (punctVal !== -1) {
      values.push(TEXT_SWITCH.MIXED_TO_PUNCT); // latch to punct
      values.push(punctVal);
      return TextSubMode.Punctuation;
    }
  } else if (currentMode === TextSubMode.Punctuation) {
    // Try Alpha
    const alphaVal = getCharValue(ch, TextSubMode.Alpha);
    if (alphaVal !== -1) {
      values.push(TEXT_SWITCH.PUNCT_TO_ALPHA); // latch to alpha
      values.push(alphaVal);
      return TextSubMode.Alpha;
    }
    // Alpha -> Lower
    const lowerVal = getCharValue(ch, TextSubMode.Lower);
    if (lowerVal !== -1) {
      values.push(TEXT_SWITCH.PUNCT_TO_ALPHA); // latch to alpha first
      values.push(TEXT_SWITCH.ALPHA_TO_LOWER); // then latch to lower
      values.push(lowerVal);
      return TextSubMode.Lower;
    }
    // Alpha -> Mixed
    const mixedVal = getCharValue(ch, TextSubMode.Mixed);
    if (mixedVal !== -1) {
      values.push(TEXT_SWITCH.PUNCT_TO_ALPHA); // latch to alpha first
      values.push(TEXT_SWITCH.ALPHA_TO_MIXED); // then latch to mixed
      values.push(mixedVal);
      return TextSubMode.Mixed;
    }
  }

  // Fallback: encode as byte value (shouldn't reach here for text-compactable chars)
  values.push(getCharValue(" ", currentMode) !== -1 ? getCharValue(" ", currentMode) : 26);
  return currentMode;
}

/** Get the sub-codeword value for a character in a given sub-mode, or -1 if not available */
function getCharValue(ch: string, mode: TextSubMode): number {
  switch (mode) {
    case TextSubMode.Alpha:
      return TEXT_ALPHA_MAP[ch] ?? -1;
    case TextSubMode.Lower:
      return TEXT_LOWER_MAP[ch] ?? -1;
    case TextSubMode.Mixed:
      return TEXT_MIXED_MAP[ch] ?? -1;
    case TextSubMode.Punctuation:
      return TEXT_PUNCT_MAP[ch] ?? -1;
  }
}

// ---- Numeric compaction ----

/**
 * Encode a numeric segment using numeric compaction mode.
 * Numeric compaction encodes up to 44 digits into 15 codewords (base 900).
 * Prepends '1' to digit string, converts to base 900.
 */
function encodeNumericSegment(digits: string, codewords: number[]): void {
  codewords.push(MODE_LATCH.NUMERIC_COMPACTION);

  // Process in groups of up to 44 digits
  let pos = 0;
  while (pos < digits.length) {
    const chunk = digits.slice(pos, pos + 44);
    const numericCodewords = numericToBase900(chunk);
    for (const cw of numericCodewords) {
      codewords.push(cw);
    }
    pos += 44;
  }
}

/**
 * Convert a string of digits to base-900 codewords.
 * Prepends '1' to the digit string, then converts the resulting number to base 900.
 */
function numericToBase900(digits: string): number[] {
  // Prepend '1' to ensure leading zeros are preserved
  const numStr = "1" + digits;

  // Use BigInt for arbitrary precision arithmetic
  let value = BigInt(numStr);
  const base = BigInt(900);
  const result: number[] = [];

  while (value > 0n) {
    result.unshift(Number(value % base));
    value = value / base;
  }

  return result;
}

// ---- Byte compaction ----

/**
 * Encode a byte segment using byte compaction mode.
 * Groups of 6 bytes are encoded as 5 codewords (base 256 -> base 900).
 * Remaining bytes are encoded 1:1.
 */
function encodeByteSegment(bytes: number[], codewords: number[]): void {
  if (bytes.length % 6 === 0) {
    codewords.push(MODE_LATCH.BYTE_COMPACTION_6); // groups of 6 optimization
  } else {
    codewords.push(MODE_LATCH.BYTE_COMPACTION);
  }

  let pos = 0;

  // Encode full groups of 6 bytes as 5 codewords
  while (pos + 6 <= bytes.length) {
    const group = bytes.slice(pos, pos + 6);
    const groupCodewords = bytesToBase900(group);
    for (const cw of groupCodewords) {
      codewords.push(cw);
    }
    pos += 6;
  }

  // Encode remaining bytes 1:1 (each byte becomes a codeword)
  while (pos < bytes.length) {
    codewords.push(bytes[pos]!);
    pos++;
  }
}

/**
 * Convert 6 bytes to 5 base-900 codewords.
 */
function bytesToBase900(bytes: number[]): number[] {
  // Compute: value = b0*256^5 + b1*256^4 + b2*256^3 + b3*256^2 + b4*256 + b5
  let value = BigInt(0);
  for (const b of bytes) {
    value = value * BigInt(256) + BigInt(b);
  }

  // Convert to base 900, yielding 5 codewords
  const result: number[] = new Array(5).fill(0);
  const base = BigInt(900);
  for (let i = 4; i >= 0; i--) {
    result[i] = Number(value % base);
    value = value / base;
  }

  return result;
}
