/**
 * Two-track Pharmacode.
 *
 * Where Pharmacode carries its data in bar width, the two-track variant carries
 * it in bar position: a short bar on the lower track, a short bar on the upper
 * track, or a full height bar across both. That makes it height-modulated, so
 * it goes through the postal renderer — at a tracker ratio of zero, because it
 * has two tracks where a postal symbology has three.
 *
 * No decoder implements it, so every symbol is compared against BWIPP.
 */

import { describe, expect, it } from "vitest"
import { encodePharmacode2 } from "../src/encoders/pharmacode"
import { encodePostal, postal } from "../src/_postal"
import { InvalidInputError } from "../src/errors"
import { bwipTwoTrack } from "./_bwip"

describe("two-track Pharmacode", () => {
  const VALUES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 26, 27, 81, 100, 1234, 99_999, 64_570_080]

  it.each(VALUES)("matches bwip-js for %i", (value) => {
    expect(encodePharmacode2(value)).toEqual(bwipTwoTrack("pharmacode2", String(value)))
  })

  it("matches bwip-js across every value up to 500", () => {
    for (let value = 4; value <= 500; value++) {
      expect(encodePharmacode2(value), String(value)).toEqual(
        bwipTwoTrack("pharmacode2", String(value)),
      )
    }
  })

  it("gives every value a different symbol", () => {
    const seen = new Set<string>()
    for (let value = 4; value <= 500; value++) seen.add(encodePharmacode2(value).join(""))
    expect(seen.size).toBe(497)
  })

  it("uses all three bar positions", () => {
    expect(new Set(encodePharmacode2(1234))).toEqual(new Set(["D", "A", "F"]))
  })

  it("rejects anything outside 4 to 64570080", () => {
    expect(() => encodePharmacode2(3)).toThrow(InvalidInputError)
    expect(() => encodePharmacode2(64_570_081)).toThrow(InvalidInputError)
    expect(() => encodePharmacode2(1.5)).toThrow(InvalidInputError)
  })

  it("reaches it through the postal entry point", () => {
    expect(encodePostal("1234", { type: "pharmacode2" })).toEqual(encodePharmacode2(1234))
  })

  it("renders two tracks rather than three", () => {
    // At the default tracker ratio a short bar is two thirds of the symbol; at
    // zero it is half, which is what two tracks means
    const svg = postal("1234", { type: "pharmacode2", height: 40 })
    const heights = [...svg.matchAll(/v([\d.]+)h-/g)].map((m) => Number(m[1]))
    expect(new Set(heights)).toEqual(new Set([20, 40]))
  })

  it("takes an explicit tracker ratio when one is given", () => {
    const svg = postal("1234", { type: "pharmacode2", height: 30, trackerRatio: 1 / 3 })
    const heights = [...svg.matchAll(/v([\d.]+)h-/g)].map((m) => Number(m[1]))
    expect(new Set(heights)).toEqual(new Set([20, 30]))
  })
})
