/**
 * Randomised sweeps over the height-modulated symbologies.
 *
 * AGENTS.md records that the RM4SCC bar alphabet was once invented outright and
 * a full green suite said nothing, so this is the area with the most form. Each
 * of these is pinned by three payloads in `bwip-compare.test.ts`; here each gets
 * thirty random ones over its whole character set.
 *
 * One difference is BWIPP's, not etiket's. Japan Post's check character is the
 * value that brings the sum of the message to a multiple of 19 — which for one
 * message in nineteen is zero. BWIPP computes `19 - sum mod 19` without folding
 * 19 back to 0 and draws a bar of no height at all, which is not one of the four
 * states. Those payloads are left out of the comparison and checked on their own
 * below.
 */

import { describe, expect, it } from "vitest"
import {
  encodePOSTNET,
  encodePLANET,
  encodeRM4SCC,
  encodeKIX,
  encodeAustraliaPost,
  encodeJapanPost,
  encodeIMb,
} from "../src/index"
import { bwipStates, bwipTallBars } from "./_bwip"

function payloads(seed: number, count: number, alphabet: string, length: number): string[] {
  let state = seed
  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
  const out: string[] = []
  for (let n = 0; n < count; n++) {
    let payload = ""
    for (let i = 0; i < length; i++) payload += alphabet[Math.floor(random() * alphabet.length)]
    out.push(payload)
  }
  return out
}

const DIGITS = "0123456789"
const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** Sum of the Japan Post character values, whose complement mod 19 is the check. */
function japanPostSum(zip: string): number {
  const VALUES = "0123456789-abcdefgh"
  const padded = `${zip}${"d".repeat(20 - zip.length)}`
  let sum = 0
  for (const ch of padded) sum += VALUES.indexOf(ch)
  return sum
}

describe("two-state postal symbologies", () => {
  it.each([
    ["POSTNET, 5 digits", encodePOSTNET, "postnet", 5],
    ["POSTNET, 9 digits", encodePOSTNET, "postnet", 9],
    ["POSTNET, 11 digits", encodePOSTNET, "postnet", 11],
    ["PLANET, 11 digits", encodePLANET, "planet", 11],
    ["PLANET, 13 digits", encodePLANET, "planet", 13],
  ] as const)("%s matches BWIPP", (_name, encode, bcid, length) => {
    for (const payload of payloads(1234, 30, DIGITS, length)) {
      expect(encode(payload), payload).toEqual(bwipTallBars(bcid, payload))
    }
  })
})

describe("four-state postal symbologies", () => {
  it.each([
    ["RM4SCC, 7 characters", (p: string) => encodeRM4SCC(p), "royalmail", ALNUM, 7],
    ["RM4SCC, 12 characters", (p: string) => encodeRM4SCC(p), "royalmail", ALNUM, 12],
    ["KIX", (p: string) => encodeKIX(p), "kix", ALNUM, 11],
    ["IMb", (p: string) => encodeIMb(p), "onecode", DIGITS, 20],
  ] as const)("%s matches BWIPP", (_name, encode, bcid, alphabet, length) => {
    for (const payload of payloads(4321, 30, alphabet, length)) {
      expect(encode(payload), payload).toEqual(bwipStates(bcid, payload))
    }
  })

  it.each(["11", "45", "59", "62", "87"])("Australia Post with FCC %s matches BWIPP", (fcc) => {
    for (const payload of payloads(4321, 20, DIGITS, 8)) {
      expect(encodeAustraliaPost(fcc, payload), `${fcc} ${payload}`).toEqual(
        bwipStates("auspost", `${fcc}${payload}`),
      )
    }
  })

  it("Japan Post matches BWIPP wherever BWIPP draws a symbol", () => {
    let compared = 0
    for (const payload of payloads(4321, 60, DIGITS, 7)) {
      if (japanPostSum(payload) % 19 === 0) continue
      expect(encodeJapanPost(payload), payload).toEqual(bwipStates("japanpost", payload))
      compared++
    }
    expect(compared).toBeGreaterThan(50)
  })

  // Where the check value folds back to zero, BWIPP draws a bar of no height.
  // etiket writes the character at index zero, which is what makes the sum a
  // multiple of 19, and every bar it draws is one of the four states.
  it("Japan Post writes a real bar where the check value is zero", () => {
    const zeros = payloads(4321, 400, DIGITS, 7).filter((p) => japanPostSum(p) % 19 === 0)
    expect(zeros.length).toBeGreaterThan(5)
    for (const payload of zeros) {
      const bars = encodeJapanPost(payload)
      expect(bars, payload).toHaveLength(67)
      for (const bar of bars) expect(["F", "A", "D", "T"], payload).toContain(bar)
    }
  })
})
