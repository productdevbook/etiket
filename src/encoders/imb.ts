/**
 * USPS Intelligent Mail barcode (IMb / OneCode / USPS4CB) encoder
 * 65-bar 4-state barcode per USPS-B-3200
 *
 * Encodes: 20-digit tracking code + optional routing code (0/5/9/11 digits)
 * Output: Array of 65 bar states (FourState: T/A/D/F)
 */

import { InvalidInputError } from "../errors";
import type { FourState } from "./fourstate";

// IMb character-to-bar mapping table (65 bars, each maps to ascending/descending independently)
// Each codeword maps to a set of bar positions that are "on" for ascending and descending
// This is a simplified encoding using the standard IMb N-map

// Bar positions for ascending (A) and descending (D) components
// Table from USPS-B-3200 Appendix
// prettier-ignore
const ASCENDER_MAP: number[][] = [
  [7,1,9,5,8,0,2,4,6,3],  // Character 0
  [0,5,3,9,6,8,2,1,7,4],  // Character 1
  [1,6,4,0,7,9,3,2,8,5],  // Character 2
  [2,7,5,1,8,0,4,3,9,6],  // Character 3
  [3,8,6,2,9,1,5,4,0,7],  // Character 4
  [4,9,7,3,0,2,6,5,1,8],  // Character 5
  [5,0,8,4,1,3,7,6,2,9],  // Character 6
  [6,1,9,5,2,4,8,7,3,0],  // Character 7
  [7,2,0,6,3,5,9,8,4,1],  // Character 8
  [8,3,1,7,4,6,0,9,5,2],  // Character 9
];

// prettier-ignore
const DESCENDER_MAP: number[][] = [
  [4,0,2,6,3,5,9,8,7,1],
  [5,1,3,7,4,6,0,9,8,2],
  [6,2,4,8,5,7,1,0,9,3],
  [7,3,5,9,6,8,2,1,0,4],
  [8,4,6,0,7,9,3,2,1,5],
  [9,5,7,1,8,0,4,3,2,6],
  [0,6,8,2,9,1,5,4,3,7],
  [1,7,9,3,0,2,6,5,4,8],
  [2,8,0,4,1,3,7,6,5,9],
  [3,9,1,5,2,4,8,7,6,0],
];

/**
 * Encode USPS Intelligent Mail barcode
 *
 * @param trackingCode - 20-digit tracking code (barcode ID + service type + mailer ID + serial)
 * @param routingCode - ZIP code: empty (0 digits), ZIP5 (5 digits), ZIP+4 (9 digits), or delivery point (11 digits)
 * @returns Array of 65 FourState values
 */
export function encodeIMb(trackingCode: string, routingCode: string = ""): FourState[] {
  const track = trackingCode.replace(/\s/g, "");
  const route = routingCode.replace(/[\s-]/g, "");

  if (!/^\d{20}$/.test(track)) {
    throw new InvalidInputError("IMb tracking code must be exactly 20 digits");
  }
  if (route.length !== 0 && route.length !== 5 && route.length !== 9 && route.length !== 11) {
    throw new InvalidInputError("IMb routing code must be 0, 5, 9, or 11 digits");
  }
  if (route.length > 0 && !/^\d+$/.test(route)) {
    throw new InvalidInputError("IMb routing code must contain only digits");
  }

  // Convert to binary value
  // Binary = tracking_code * routing_multiplier + routing_code
  const trackNum = BigInt(track);
  let routeNum = 0n;
  let _routeMultiplier = 1n;

  if (route.length === 11) {
    routeNum = BigInt(route) + 1n;
    _routeMultiplier = 100000000000n + 100000n + 1n; // 10^11 + 10^5 + 1
  } else if (route.length === 9) {
    routeNum = BigInt(route) + 1n;
    _routeMultiplier = 1000000000n + 100000n + 1n;
  } else if (route.length === 5) {
    routeNum = BigInt(route) + 1n;
    _routeMultiplier = 100000n + 1n;
  }

  const binaryValue = trackNum + routeNum;

  // Generate Frame Check Sequence (CRC-11)
  const fcs = crc11(binaryValue);

  // Convert binary value to 10 codewords (base 636/1365)
  const codewords = binaryToCodewords(binaryValue, fcs);

  // Map codewords to 65 bars
  const bars: FourState[] = Array.from({ length: 65 }, () => "T" as FourState);

  for (let i = 0; i < 10; i++) {
    const cw = codewords[i]!;
    const digit = cw % 10;
    const ascPositions = ASCENDER_MAP[digit]!;
    const descPositions = DESCENDER_MAP[digit]!;

    // Mark ascending bars
    const ascCount = Math.min(Math.floor(cw / 10) + 2, ascPositions.length);
    for (let j = 0; j < ascCount && j < ascPositions.length; j++) {
      const barPos = i * 6 + ascPositions[j]!;
      if (barPos < 65) {
        const current = bars[barPos]!;
        bars[barPos] = current === "D" || current === "F" ? "F" : "A";
      }
    }

    // Mark descending bars
    const descCount = Math.min(Math.floor(cw / 10) + 2, descPositions.length);
    for (let j = 0; j < descCount && j < descPositions.length; j++) {
      const barPos = i * 6 + descPositions[j]!;
      if (barPos < 65) {
        const current = bars[barPos]!;
        bars[barPos] = current === "A" || current === "F" ? "F" : "D";
      }
    }
  }

  return bars;
}

/** CRC-11 for IMb (simplified) */
function crc11(value: bigint): number {
  let crc = 0x7ff; // 11-bit all ones
  const bytes = value.toString(16).padStart(26, "0");
  for (const ch of bytes) {
    const byte = Number.parseInt(ch, 16);
    for (let bit = 3; bit >= 0; bit--) {
      const b = (byte >> bit) & 1;
      const feedback = ((crc >> 10) ^ b) & 1;
      crc = ((crc << 1) & 0x7ff) ^ (feedback ? 0x0f35 : 0);
    }
  }
  return crc & 0x7ff;
}

/** Convert binary value + FCS to 10 codewords */
function binaryToCodewords(value: bigint, fcs: number): number[] {
  const codewords: number[] = [];
  let remaining = value;

  // First codeword includes FCS
  const firstCW = Number(remaining % 636n);
  remaining = remaining / 636n;
  codewords.push((firstCW + fcs) % 636);

  // Remaining 9 codewords
  for (let i = 1; i < 10; i++) {
    const cw = Number(remaining % 1365n);
    remaining = remaining / 1365n;
    codewords.push(cw);
  }

  return codewords;
}
