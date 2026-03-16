/**
 * GS1 Composite Component encoder
 * Adds supplemental 2D component to a primary 1D barcode
 *
 * CC-A: MicroPDF417-based, small capacity
 * CC-B: MicroPDF417-based, medium capacity
 * CC-C: PDF417-based, large capacity
 *
 * The composite component encodes additional GS1 AI data
 * that doesn't fit in the primary linear barcode.
 */

import { InvalidInputError } from "../errors";
import { encodeMicroPDF417 } from "./micropdf417";
import { encodePDF417 } from "./pdf417/index";
import { parseAIString } from "./gs1-128";

export type CompositeType = "CC-A" | "CC-B" | "CC-C";

export interface GS1CompositeResult {
  /** The 2D composite component matrix */
  composite: boolean[][];
  /** Composite type used */
  type: CompositeType;
  /** Number of rows in composite */
  rows: number;
  /** Width in modules */
  cols: number;
}

/**
 * Encode GS1 Composite Component
 * Input: AI string in parenthesized format
 *
 * @param data - GS1 AI data for composite (e.g., "(17)260101(10)BATCH01")
 * @param type - Composite type: CC-A (small), CC-B (medium), CC-C (large)
 * @returns Composite component matrix
 */
export function encodeGS1Composite(data: string, type: CompositeType = "CC-A"): GS1CompositeResult {
  if (data.length === 0) {
    throw new InvalidInputError("GS1 Composite: data must not be empty");
  }

  // Validate AI format if parenthesized
  if (data.includes("(")) {
    parseAIString(data); // throws on invalid
  }

  // Encode based on composite type
  switch (type) {
    case "CC-A":
    case "CC-B": {
      // MicroPDF417-based
      const columns = type === "CC-A" ? 2 : 3;
      const result = encodeMicroPDF417(data, { columns });
      return {
        composite: result.matrix,
        type,
        rows: result.rows,
        cols: result.cols,
      };
    }
    case "CC-C": {
      // PDF417-based
      const result = encodePDF417(data, { ecLevel: 2, columns: 4 });
      return {
        composite: result.matrix,
        type,
        rows: result.rows,
        cols: result.cols,
      };
    }
    default:
      throw new InvalidInputError(`Invalid composite type: ${type}`);
  }
}
