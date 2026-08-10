/**
 * What the encoders do with more input than any symbol can hold.
 *
 * Three of them searched a route through the encoding modes before anything
 * asked whether the message could fit at all, so a caller passing a megabyte of
 * text waited seconds for a `CapacityError` — a second and a quarter for Aztec,
 * seven for QR. Two others did not get that far: PDF417 and rMQR spread a
 * million-element array into `push` and threw a `RangeError` from the call
 * stack instead.
 *
 * Code 128 was worse in a quieter way. It looked forward from every character
 * for the end of the digit run and the end of the run on one side of 128, which
 * on a long message is quadratic: half a million characters took over two
 * minutes, and it succeeded, so nothing timed out to say so.
 *
 * Every encoder now answers immediately, with the error it is supposed to.
 */

import { describe, expect, it } from "vitest"
import {
  encodeQR,
  encodeMicroQR,
  encodeRMQR,
  encodeDataMatrix,
  encodeAztec,
  encodeMaxiCode,
  encodePDF417,
  encodeMicroPDF417,
  encodeHanXin,
  encodeDotCode,
  encodeCodablockF,
  encodeCode16K,
  encodeJABCode,
  encodeCode128,
  CapacityError,
  InvalidInputError,
} from "../src/index"

/** Long enough that anything scanning it more than once will be noticed. */
const HUGE = "ABCdef0123456789 -.".repeat(52_632)

const ENCODERS = [
  ["QR", (text: string) => encodeQR(text)],
  ["Micro QR", (text: string) => encodeMicroQR(text)],
  ["rMQR", (text: string) => encodeRMQR(text)],
  ["Data Matrix", (text: string) => encodeDataMatrix(text)],
  ["Aztec", (text: string) => encodeAztec(text)],
  ["MaxiCode", (text: string) => encodeMaxiCode(text)],
  ["PDF417", (text: string) => encodePDF417(text)],
  ["MicroPDF417", (text: string) => encodeMicroPDF417(text)],
  ["Han Xin", (text: string) => encodeHanXin(text)],
  ["DotCode", (text: string) => encodeDotCode(text)],
  ["Codablock F", (text: string) => encodeCodablockF(text)],
  ["Code 16K", (text: string) => encodeCode16K(text)],
  ["JAB Code", (text: string) => encodeJABCode(text)],
] as const

/** The longest message each of them takes, measured by bisection. */
const CAPACITIES = [
  ["QR", (text: string) => encodeQR(text), 5596],
  ["Micro QR", (text: string) => encodeMicroQR(text), 35],
  ["rMQR", (text: string) => encodeRMQR(text), 361],
  ["Data Matrix", (text: string) => encodeDataMatrix(text), 3116],
  ["Aztec", (text: string) => encodeAztec(text), 3832],
  ["MaxiCode", (text: string) => encodeMaxiCode(text), 138],
  ["PDF417", (text: string) => encodePDF417(text), 2710],
  ["MicroPDF417", (text: string) => encodeMicroPDF417(text), 366],
  ["Han Xin", (text: string) => encodeHanXin(text), 6522],
  ["DotCode", (text: string) => encodeDotCode(text), 2000],
  ["Codablock F", (text: string) => encodeCodablockF(text), 700],
  ["Code 16K", (text: string) => encodeCode16K(text), 154],
] as const

describe("more input than any symbol holds", () => {
  it.each(ENCODERS)("%s answers a megabyte without a stack overflow", (_name, encode) => {
    let thrown: unknown
    try {
      encode(HUGE)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Error)
    expect(thrown).not.toBeInstanceOf(RangeError)
    expect(
      thrown instanceof CapacityError || thrown instanceof InvalidInputError,
      `${String(thrown)}`,
    ).toBe(true)
  })
})

describe("the bound does not reject what fits", () => {
  it.each(CAPACITIES)("%s still takes its longest message", (_name, encode, length) => {
    expect(() => encode("0123456789".repeat(Math.ceil(length / 10)).slice(0, length))).not.toThrow()
  })
})

describe("Code 128 over a long message", () => {
  // Scanning forward from every character for the runs it needs made this
  // quadratic; the runs are found once, backwards
  it("encodes half a million characters", () => {
    const text = "ABCdef0123456789 -.".repeat(26_316)
    const bars = encodeCode128(text)
    expect(bars.length).toBeGreaterThan(text.length)
  })

  it("encodes a long run of digits, where Code C is in play throughout", () => {
    const bars = encodeCode128("0123456789".repeat(20_000))
    expect(bars.length).toBeGreaterThan(1000)
  })
})
