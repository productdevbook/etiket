/**
 * rMQR against BWIPP.
 *
 * rMQR was verified by decoding alone: `encoders-rmqr-roundtrip.test.ts` reads
 * every one of the 32 symbol sizes back through zxing at both error correction
 * levels, which proves the data survives but not that the codewords, the block
 * structure or the module placement are the ones ISO/IEC 23941 describes.
 *
 * BWIPP is the oracle, with two things to know about it. It will not choose a
 * symbol size — `version` is required — and it does not offer an error
 * correction level: every symbol it draws is at level H, whatever `eclevel`
 * says. So the comparison names the size and asks etiket for H, where etiket
 * defaults to M. Level M has no oracle here and is left to the round trips.
 */

import { describe, expect, it } from "vitest"
import { encodeRMQR } from "../src/index"
import { bwipMatrix } from "./_bwip"

/** The 32 rMQR symbol sizes, in the order `encodeRMQR` indexes them. */
const SIZES: readonly (readonly [number, number])[] = [
  [7, 43],
  [7, 59],
  [7, 77],
  [7, 99],
  [7, 139],
  [9, 43],
  [9, 59],
  [9, 77],
  [9, 99],
  [9, 139],
  [11, 27],
  [11, 43],
  [11, 59],
  [11, 77],
  [11, 99],
  [11, 139],
  [13, 27],
  [13, 43],
  [13, 59],
  [13, 77],
  [13, 99],
  [13, 139],
  [15, 43],
  [15, 59],
  [15, 77],
  [15, 99],
  [15, 139],
  [17, 43],
  [17, 59],
  [17, 77],
  [17, 99],
  [17, 139],
]

function rows(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((m) => (m ? "1" : "0")).join(""))
}

describe("rMQR against BWIPP", () => {
  // Every mode, at every size the payload fits: numeric, alphanumeric and byte
  it.each(["1234567", "HELLO WORLD", "abcdef", "A1b2C3", "$%*+-./:", "1"])(
    "matches at every symbol size for %j",
    (payload) => {
      let compared = 0
      for (const [index, [height, width]] of SIZES.entries()) {
        let mine: boolean[][]
        try {
          mine = encodeRMQR(payload, { version: index, ecLevel: "H" })
        } catch {
          continue // the payload does not fit this size at level H
        }
        const theirs = bwipMatrix("rectangularmicroqrcode", payload, {
          version: `R${height}x${width}`,
        })
        expect(mine, `R${height}x${width} ${payload}`).toHaveLength(height)
        expect(mine[0], `R${height}x${width} ${payload}`).toHaveLength(width)
        expect(rows(mine), `R${height}x${width} ${payload}`).toEqual(rows(theirs))
        compared++
      }
      expect(compared).toBeGreaterThan(24)
    },
  )

  // The sizes that need several Reed-Solomon blocks, where the data and error
  // correction codewords are interleaved (#112)
  it.each([9, 14, 20, 31])("matches at multi-block version %i", (index) => {
    const [height, width] = SIZES[index]!
    for (const payload of ["A1", "TEST DATA 123", "abcdefghij"]) {
      expect(
        rows(encodeRMQR(payload, { version: index, ecLevel: "H" })),
        `R${height}x${width} ${payload}`,
      ).toEqual(
        rows(bwipMatrix("rectangularmicroqrcode", payload, { version: `R${height}x${width}` })),
      )
    }
  })

  it("picks the same size BWIPP does when asked for the same level", () => {
    // etiket chooses a size and BWIPP does not, so this only checks that the
    // size etiket lands on is one BWIPP agrees the data fits
    for (const payload of ["1234567", "HELLO", "abcdef"]) {
      const mine = encodeRMQR(payload, { ecLevel: "H" })
      const index = SIZES.findIndex(([h, w]) => h === mine.length && w === mine[0]!.length)
      expect(index, payload).toBeGreaterThanOrEqual(0)
      const [height, width] = SIZES[index]!
      expect(rows(mine), payload).toEqual(
        rows(bwipMatrix("rectangularmicroqrcode", payload, { version: `R${height}x${width}` })),
      )
    }
  })
})
