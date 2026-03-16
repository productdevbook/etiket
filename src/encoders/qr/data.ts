/**
 * QR Code data encoding and bitstream construction
 */

import type { ErrorCorrectionLevel, QRCodeOptions } from "./types";
import { MODE_INDICATOR } from "./types";
import { getECInfo, getCharCountBits } from "./tables";
import { selectVersion, selectMode } from "./version";
import {
  encodeNumericData,
  encodeAlphanumericData,
  encodeByteData,
  encodeKanjiData,
  unicodeToShiftJIS,
  pushBits,
} from "./mode";
import { addErrorCorrection } from "./reed-solomon";

export interface EncodedData {
  version: number;
  ecLevel: ErrorCorrectionLevel;
  bits: number[];
}

/**
 * Encode text into QR code data bits with error correction
 */
export function encodeData(text: string, options: QRCodeOptions = {}): EncodedData {
  const ecLevel = options.ecLevel ?? "M";
  const mode = selectMode(text, options.mode);
  const version = selectVersion(text, ecLevel, mode, options.version);
  const ecInfo = getECInfo(version, ecLevel);

  // Build data bitstream
  const dataBits = buildDataBits(text, mode, version, ecInfo.totalDataCodewords);

  // Convert bits to bytes
  const dataBytes = bitsToBytes(dataBits);

  // Add error correction with interleaving
  const finalBytes = addErrorCorrection(
    dataBytes,
    ecInfo.ecCodewordsPerBlock,
    ecInfo.group1Blocks,
    ecInfo.group1DataCW,
    ecInfo.group2Blocks,
    ecInfo.group2DataCW,
  );

  // Convert back to bits
  const bits: number[] = [];
  for (const byte of finalBytes) {
    pushBits(bits, byte, 8);
  }

  return { version, ecLevel, bits };
}

/** Build the data bitstream (before EC) */
function buildDataBits(
  text: string,
  mode: "numeric" | "alphanumeric" | "byte" | "kanji",
  version: number,
  totalDataCodewords: number,
): number[] {
  const bits: number[] = [];
  const charCountBits = getCharCountBits(version, mode);
  const data = new TextEncoder().encode(text);

  // Mode indicator (4 bits)
  pushBits(bits, MODE_INDICATOR[mode], 4);

  // Character count
  const charCount = mode === "byte" ? data.length : text.length;
  pushBits(bits, charCount, charCountBits);

  // Data bits
  switch (mode) {
    case "numeric":
      bits.push(...encodeNumericData(text));
      break;
    case "alphanumeric":
      bits.push(...encodeAlphanumericData(text));
      break;
    case "byte":
      bits.push(...encodeByteData(data));
      break;
    case "kanji": {
      const sjisValues = unicodeToShiftJIS(text);
      bits.push(...encodeKanjiData(sjisValues));
      break;
    }
  }

  // Terminator
  const totalDataBits = totalDataCodewords * 8;
  const terminatorLen = Math.min(4, totalDataBits - bits.length);
  if (terminatorLen > 0) {
    pushBits(bits, 0, terminatorLen);
  }

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad to capacity with alternating bytes
  let padToggle = true;
  while (bits.length < totalDataBits) {
    pushBits(bits, padToggle ? 236 : 17, 8);
    padToggle = !padToggle;
  }

  return bits;
}

/** Convert bit array to byte array */
function bitsToBytes(bits: number[]): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j]!;
    }
    bytes.push(byte);
  }
  return bytes;
}
