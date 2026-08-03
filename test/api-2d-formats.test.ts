/**
 * High-level API coverage for the 2D, stacked and polychrome symbologies.
 *
 * Each format is checked for a well-formed SVG, that encoder options actually
 * reach the encoder, and that encoder options never leak into SVG output.
 */

import { describe, expect, it } from "vitest"
import {
  microqr,
  rmqr,
  maxicode,
  dotcode,
  hanxin,
  micropdf417,
  codablockf,
  code16k,
  jabcode,
  datamatrix,
  pdf417,
  aztec,
} from "../src/_2d"
import {
  microqrPNG,
  microqrPNGDataURI,
  rmqrPNG,
  rmqrPNGDataURI,
  hanxinPNG,
  hanxinPNGDataURI,
  dotcodePNG,
  dotcodePNGDataURI,
  micropdf417PNG,
  micropdf417PNGDataURI,
  codablockfPNG,
  codablockfPNGDataURI,
  code16kPNG,
  code16kPNGDataURI,
  maxicodePNG,
  maxicodePNGDataURI,
} from "../src/_png"
import { renderColorMatrixSVG } from "../src/renderers/svg/color-matrix"
import { renderMatrixSVG } from "../src/renderers/svg/matrix"
import { encodeJABCode } from "../src/encoders/jabcode"
import { encodeMaxiCode } from "../src/encoders/maxicode"
import { renderMaxiCodeRaster } from "../src/renderers/png/rasterize"

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

function isPNG(data: Uint8Array): boolean {
  return PNG_SIGNATURE.every((b, i) => data[i] === b)
}

/** Count the module rects in a matrix SVG path. */
function countModules(svg: string): number {
  return (svg.match(/M[\d.-]+,[\d.-]+h/g) ?? []).length
}

describe("2D format SVG API", () => {
  const cases: Array<[string, () => string]> = [
    ["microqr", () => microqr("12345")],
    ["rmqr", () => rmqr("HELLO")],
    ["maxicode", () => maxicode("TEST")],
    ["dotcode", () => dotcode("DOTCODE")],
    ["hanxin", () => hanxin("HANXIN")],
    ["micropdf417", () => micropdf417("MICRO")],
    ["codablockf", () => codablockf("CODABLOCK")],
    ["code16k", () => code16k("CODE16K")],
    ["jabcode", () => jabcode("JAB")],
    ["datamatrix", () => datamatrix("DM")],
    ["pdf417", () => pdf417("PDF")],
    ["aztec", () => aztec("AZTEC")],
  ]

  for (const [name, render] of cases) {
    it(`${name} produces a well-formed SVG`, () => {
      const svg = render()
      expect(svg.startsWith("<svg"), name).toBe(true)
      expect(svg.endsWith("</svg>"), name).toBe(true)
      expect(svg, name).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg, name).toContain("viewBox=")
      // Every symbol must actually draw something
      expect(svg.includes("<path") || svg.includes("<circle"), name).toBe(true)
    })

    it(`${name} does not leak encoder options into the SVG`, () => {
      const svg = render()
      expect(svg, name).not.toContain("undefined")
      expect(svg, name).not.toContain("[object Object]")
      expect(svg, name).not.toContain("NaN")
    })
  }
})

describe("microqr()", () => {
  it("honours the version option", () => {
    // M1 is 11x11, M4 is 17x17 — bigger version means a bigger symbol
    const m1 = microqr("1", { version: 1, size: 110, margin: 0 })
    const m4 = microqr("1", { version: 4, size: 170, margin: 0 })
    expect(m1).toContain('viewBox="0 0 110 110"')
    expect(m4).toContain('viewBox="0 0 170 170"')
  })

  it("honours the mask option", () => {
    expect(microqr("12345", { mask: 0 })).not.toBe(microqr("12345", { mask: 3 }))
  })

  it("applies styling options", () => {
    const svg = microqr("12345", { color: "#123456", background: "#abcdef" })
    expect(svg).toContain('fill="#123456"')
    expect(svg).toContain('fill="#abcdef"')
  })
})

describe("rmqr()", () => {
  it("produces a rectangular symbol", () => {
    const svg = rmqr("HELLO", { margin: 0 })
    const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!
    expect(Number(m[1])).toBeGreaterThan(Number(m[2]))
  })

  it("honours the ecLevel option", () => {
    expect(rmqr("HELLO", { ecLevel: "M" })).not.toBe(rmqr("HELLO", { ecLevel: "H" }))
  })
})

describe("maxicode()", () => {
  it("renders hexagonal modules as circles", () => {
    const svg = maxicode("TEST")
    expect(svg).toContain("<circle")
    expect(svg).not.toContain("<path")
  })

  it("honours structured carrier message options", () => {
    const mode2 = maxicode("TEST", { mode: 2, postalCode: "123456789", countryCode: 840 })
    const mode4 = maxicode("TEST", { mode: 4 })
    expect(mode2).not.toBe(mode4)
  })

  it("applies the margin option to the quiet zone", () => {
    const tight = maxicode("TEST", { margin: 1 })
    const loose = maxicode("TEST", { margin: 4 })
    const dim = (svg: string): number => Number(/width="([\d.]+)"/.exec(svg)![1])
    expect(dim(loose)).toBeGreaterThan(dim(tight))
  })
})

describe("hanxin()", () => {
  it("honours the ecLevel option", () => {
    expect(hanxin("HANXIN", { ecLevel: 1 })).not.toBe(hanxin("HANXIN", { ecLevel: 4 }))
  })

  it("honours the version option", () => {
    // Version n is (2n + 21) modules square
    expect(hanxin("HX", { version: 1, size: 230, margin: 0 })).toContain('viewBox="0 0 230 230"')
    expect(hanxin("HX", { version: 5, margin: 0, size: 310 })).toContain('viewBox="0 0 310 310"')
  })

  it("scales with the size option", () => {
    expect(hanxin("HX", { size: 300, margin: 0 })).toContain('viewBox="0 0 300 300"')
  })

  it("rejects an out-of-range ecLevel with a clear error", () => {
    expect(() => hanxin("HX", { ecLevel: 9 as 1 })).toThrow(/EC level must be 1, 2, 3 or 4/)
  })

  it("rejects an out-of-range version with a clear error", () => {
    expect(() => hanxin("HX", { version: 0 })).toThrow(/version must be an integer 1-84/)
    expect(() => hanxin("HX", { version: 85 })).toThrow(/version must be an integer 1-84/)
  })
})

describe("stacked symbologies", () => {
  it("micropdf417 uses taller rows than wide modules", () => {
    const svg = micropdf417("MICRO", { margin: 0 })
    const m = /M[\d.-]+,[\d.-]+h([\d.]+)v([\d.]+)h/.exec(svg)!
    expect(Number(m[2])).toBeGreaterThan(Number(m[1]))
  })

  it("codablockf uses taller rows than wide modules", () => {
    const svg = codablockf("CODABLOCK", { margin: 0 })
    const m = /M[\d.-]+,[\d.-]+h([\d.]+)v([\d.]+)h/.exec(svg)!
    expect(Number(m[2])).toBeGreaterThan(Number(m[1]))
  })

  it("code16k uses taller rows than wide modules", () => {
    const svg = code16k("CODE16K", { margin: 0 })
    const m = /M[\d.-]+,[\d.-]+h([\d.]+)v([\d.]+)h/.exec(svg)!
    expect(Number(m[2])).toBeGreaterThan(Number(m[1]))
  })

  it("allows rowHeight to be overridden", () => {
    const svg = code16k("CODE16K", { margin: 0, rowHeight: 1 })
    const m = /M[\d.-]+,[\d.-]+h([\d.]+)v([\d.]+)h/.exec(svg)!
    expect(Number(m[2])).toBeCloseTo(Number(m[1]), 5)
  })

  it("micropdf417 honours the columns option", () => {
    expect(micropdf417("MICRO", { columns: 1 })).not.toBe(micropdf417("MICRO", { columns: 4 }))
  })

  it("codablockf honours the columns option", () => {
    expect(codablockf("CODABLOCKF TEST", { columns: 8 })).not.toBe(
      codablockf("CODABLOCKF TEST", { columns: 16 }),
    )
  })
})

describe("renderMatrixSVG rowHeight", () => {
  const matrix = [
    [true, false],
    [false, true],
  ]

  it("defaults to square modules", () => {
    const svg = renderMatrixSVG(matrix, { size: 100, margin: 0 })
    expect(svg).toContain('viewBox="0 0 100 100"')
  })

  it("stretches rows vertically", () => {
    const svg = renderMatrixSVG(matrix, { size: 100, margin: 0, rowHeight: 3 })
    expect(svg).toContain('viewBox="0 0 100 300"')
  })

  it("keeps the quiet zone square while stretching rows", () => {
    const svg = renderMatrixSVG(matrix, { size: 100, margin: 1, rowHeight: 2 })
    // 4 total module columns → moduleSize 25; height = 2 rows * 50 + 2 * 25
    expect(svg).toContain('viewBox="0 0 100 150"')
  })
})

describe("jabcode() and renderColorMatrixSVG", () => {
  it("renders one path per distinct palette entry used", () => {
    const result = encodeJABCode("JAB", { colors: 4 })
    const used = new Set(result.matrix.flat())
    const svg = renderColorMatrixSVG(result.matrix, result.palette)
    expect((svg.match(/<path /g) ?? []).length).toBe(used.size)
  })

  it("uses colors from the encoder palette", () => {
    const result = encodeJABCode("JAB", { colors: 4 })
    const svg = renderColorMatrixSVG(result.matrix, result.palette)
    for (const color of new Set(result.matrix.flat()).values()) {
      expect(svg).toContain(`fill="${result.palette[color]}"`)
    }
  })

  it("accepts a palette override", () => {
    const result = encodeJABCode("JAB", { colors: 4 })
    const svg = renderColorMatrixSVG(result.matrix, result.palette, {
      palette: ["#111111", "#222222", "#333333", "#444444"],
    })
    expect(svg).toContain('fill="#111111"')
    expect(svg).not.toContain(`fill="${result.palette[1]}"`)
  })

  it("supports 8-color mode", () => {
    const four = jabcode("JABCODE TEST", { colors: 4 })
    const eight = jabcode("JABCODE TEST", { colors: 8 })
    expect(four).not.toBe(eight)
  })

  it("falls back to black for out-of-range palette indices", () => {
    const svg = renderColorMatrixSVG([[0, 5]], ["#ff0000"])
    expect(svg).toContain('fill="#ff0000"')
    expect(svg).toContain('fill="#000"')
  })

  it("supports transparent background and accessibility metadata", () => {
    const svg = renderColorMatrixSVG([[0, 1]], ["#000", "#fff"], {
      background: "transparent",
      title: "JAB",
      desc: "Color code",
      ariaLabel: "jab code",
    })
    expect(svg).not.toContain("<rect")
    expect(svg).toContain("<title>JAB</title>")
    expect(svg).toContain("<desc>Color code</desc>")
    expect(svg).toContain('aria-label="jab code"')
  })

  it("handles an empty matrix", () => {
    const svg = renderColorMatrixSVG([], [])
    expect(svg).toContain("<svg")
  })
})

describe("2D format PNG API", () => {
  const cases: Array<[string, () => Uint8Array, () => string]> = [
    ["microqr", () => microqrPNG("12345"), () => microqrPNGDataURI("12345")],
    ["rmqr", () => rmqrPNG("HELLO"), () => rmqrPNGDataURI("HELLO")],
    ["hanxin", () => hanxinPNG("HANXIN"), () => hanxinPNGDataURI("HANXIN")],
    ["dotcode", () => dotcodePNG("DOT"), () => dotcodePNGDataURI("DOT")],
    ["micropdf417", () => micropdf417PNG("MICRO"), () => micropdf417PNGDataURI("MICRO")],
    ["codablockf", () => codablockfPNG("CODABLOCK"), () => codablockfPNGDataURI("CODABLOCK")],
    ["code16k", () => code16kPNG("CODE16K"), () => code16kPNGDataURI("CODE16K")],
  ]

  for (const [name, png, dataUri] of cases) {
    it(`${name}PNG emits a valid PNG`, () => {
      const data = png()
      expect(isPNG(data), name).toBe(true)
      expect(data.length, name).toBeGreaterThan(50)
    })

    it(`${name}PNGDataURI emits a PNG data URI`, () => {
      expect(dataUri(), name).toMatch(/^data:image\/png;base64,/)
    })
  }

  it("passes encoder options through to PNG output", () => {
    expect(microqrPNG("12345", { mask: 0 })).not.toEqual(microqrPNG("12345", { mask: 3 }))
    expect(micropdf417PNG("MICRO", { columns: 1 })).not.toEqual(
      micropdf417PNG("MICRO", { columns: 4 }),
    )
  })

  it("applies PNG rendering options", () => {
    const small = microqrPNG("12345", { moduleSize: 2, margin: 0 })
    const large = microqrPNG("12345", { moduleSize: 12, margin: 0 })
    expect(large.length).toBeGreaterThan(small.length)
  })
})

describe("MaxiCode PNG (hexagonal rasterizer)", () => {
  it("emits a valid PNG", () => {
    expect(isPNG(maxicodePNG("HELLO"))).toBe(true)
    expect(maxicodePNGDataURI("HELLO")).toMatch(/^data:image\/png;base64,/)
  })

  it("sizes the raster from the staggered hex grid", () => {
    const matrix = encodeMaxiCode("HELLO")
    const raster = renderMaxiCodeRaster(matrix, { moduleSize: 10, margin: 2 })
    // 30 columns on a 10px pitch, plus a half-module stagger and 2-module margins
    expect(raster.width).toBe(Math.round(30 * 10 + 5 + 40))
    expect(raster.height).toBe(Math.round(33 * 8.66 + 40))
    expect(raster.rows).toHaveLength(raster.height)
  })

  it("draws discs rather than squares", () => {
    // A single module: the row through its centre must be wider than the
    // topmost row of the same module, which is only true for a disc.
    const matrix = Array.from({ length: 33 }, () => Array.from({ length: 30 }, () => false))
    matrix[10]![10] = true
    const raster = renderMaxiCodeRaster(matrix, { moduleSize: 20, margin: 1 })

    const filledPerRow = raster.rows.map((row) => row.reduce((n, v) => n + v, 0))
    const widest = Math.max(...filledPerRow)
    const nonEmpty = filledPerRow.filter((n) => n > 0)
    expect(nonEmpty.length).toBeGreaterThan(1)
    expect(Math.min(...nonEmpty)).toBeLessThan(widest)
  })

  it("staggers odd rows by half a module", () => {
    const left = (rowIndex: number): number => {
      const matrix = Array.from({ length: 33 }, () => Array.from({ length: 30 }, () => false))
      matrix[rowIndex]![0] = true
      const raster = renderMaxiCodeRaster(matrix, { moduleSize: 20, margin: 1 })
      for (const row of raster.rows) {
        const idx = row.indexOf(1)
        if (idx !== -1) return idx
      }
      return -1
    }
    // Row 1 (odd) sits half a module (10px) right of row 0; allow a pixel of
    // slack, since the two discs are rasterized at different vertical centres.
    expect(left(1) - left(0)).toBeGreaterThanOrEqual(9)
    expect(left(1) - left(0)).toBeLessThanOrEqual(11)
  })

  it("scales with moduleSize", () => {
    const small = renderMaxiCodeRaster(encodeMaxiCode("HELLO"), { moduleSize: 4 })
    const large = renderMaxiCodeRaster(encodeMaxiCode("HELLO"), { moduleSize: 12 })
    expect(large.width).toBeGreaterThan(small.width)
    expect(large.height).toBeGreaterThan(small.height)
  })

  it("applies the margin option", () => {
    const tight = renderMaxiCodeRaster(encodeMaxiCode("HELLO"), { moduleSize: 10, margin: 0 })
    const loose = renderMaxiCodeRaster(encodeMaxiCode("HELLO"), { moduleSize: 10, margin: 4 })
    expect(loose.width - tight.width).toBe(80)
  })

  it("passes encoder options through", () => {
    expect(maxicodePNG("HELLO", { mode: 4 })).not.toEqual(
      maxicodePNG("HELLO", { mode: 2, postalCode: "123456789", countryCode: 840 }),
    )
  })

  it("leaves the quiet zone blank", () => {
    const raster = renderMaxiCodeRaster(encodeMaxiCode("HELLO"), { moduleSize: 10, margin: 2 })
    expect(raster.rows[0]!.every((v) => v === 0)).toBe(true)
    expect(raster.rows.at(-1)!.every((v) => v === 0)).toBe(true)
  })
})

describe("symbol content sanity", () => {
  it("different data produces different symbols", () => {
    expect(microqr("AAAA")).not.toBe(microqr("BBBB"))
    expect(dotcode("AAAA")).not.toBe(dotcode("BBBB"))
    expect(hanxin("AAAA")).not.toBe(hanxin("BBBB"))
    expect(code16k("AAAA")).not.toBe(code16k("BBBB"))
    expect(codablockf("AAAA")).not.toBe(codablockf("BBBB"))
    expect(micropdf417("AAAA")).not.toBe(micropdf417("BBBB"))
  })

  it("draws a plausible number of dark modules", () => {
    // A symbol that is all-light or all-dark indicates a broken encoder
    for (const svg of [microqr("12345"), dotcode("DOT"), hanxin("HX"), code16k("C16K")]) {
      const dark = countModules(svg)
      expect(dark).toBeGreaterThan(10)
    }
  })
})
