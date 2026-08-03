/**
 * Full option coverage for the 1D barcode SVG renderer: rotation, text
 * placement and alignment, bearer bars, gaps, units and accessibility.
 */

import { describe, expect, it } from "vitest"
import { renderBarcodeSVG } from "../src/renderers/svg/barcode"

const BARS = [2, 1, 1, 2, 3, 1, 1, 2]

/** Extract the drawn bar rects (skipping the background rect). */
function rects(svg: string): Array<{ x: number; y: number; w: number; h: number }> {
  const out: Array<{ x: number; y: number; w: number; h: number }> = []
  const re = /<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(svg)) !== null) {
    out.push({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) })
  }
  return out
}

describe("renderBarcodeSVG — geometry", () => {
  it("computes width from total bar units", () => {
    const total = BARS.reduce((a, b) => a + b, 0)
    const svg = renderBarcodeSVG(BARS, { barWidth: 2, margin: 10, height: 80 })
    expect(svg).toContain(`viewBox="0 0 ${total * 2 + 20} 100"`)
  })

  it("draws only the bar elements, not the spaces", () => {
    // BARS alternates bar/space starting with a bar → 4 bars
    expect(rects(renderBarcodeSVG(BARS, { background: "transparent" }))).toHaveLength(4)
  })

  it("positions bars cumulatively", () => {
    const drawn = rects(
      renderBarcodeSVG([2, 1, 3], { barWidth: 2, margin: 0, background: "transparent" }),
    )
    expect(drawn[0]!.x).toBe(0)
    expect(drawn[0]!.w).toBe(4)
    expect(drawn[1]!.x).toBe(6) // after bar(2) + space(1) = 3 units * 2
    expect(drawn[1]!.w).toBe(6)
  })

  it("supports per-side margins", () => {
    const svg = renderBarcodeSVG([1], {
      barWidth: 2,
      height: 50,
      marginLeft: 5,
      marginRight: 7,
      marginTop: 3,
      marginBottom: 9,
      background: "transparent",
    })
    expect(svg).toContain(`viewBox="0 0 ${2 + 5 + 7} ${50 + 3 + 9}"`)
    const [bar] = rects(svg)
    expect(bar!.x).toBe(5)
    expect(bar!.y).toBe(3)
  })

  it("narrows bars by barGap", () => {
    const drawn = rects(
      renderBarcodeSVG([2], { barWidth: 4, barGap: 2, margin: 0, background: "transparent" }),
    )
    expect(drawn[0]!.w).toBe(6) // 2*4 - 2
    expect(drawn[0]!.x).toBe(1) // shifted by half the gap
  })

  it("omits bars fully consumed by the gap", () => {
    const svg = renderBarcodeSVG([1, 1, 1], {
      barWidth: 2,
      barGap: 4,
      margin: 0,
      background: "transparent",
    })
    expect(rects(svg)).toHaveLength(0)
  })
})

describe("renderBarcodeSVG — rotation", () => {
  it("does not emit a transform at 0 degrees", () => {
    expect(renderBarcodeSVG(BARS)).not.toContain("rotate(")
  })

  it("swaps dimensions at 90 and 270 degrees", () => {
    const total = BARS.reduce((a, b) => a + b, 0)
    const contentW = total * 2 + 20
    const contentH = 80 + 20
    for (const rotation of [90, 270] as const) {
      const svg = renderBarcodeSVG(BARS, { rotation, barWidth: 2, margin: 10, height: 80 })
      expect(svg, String(rotation)).toContain(`viewBox="0 0 ${contentH} ${contentW}"`)
      expect(svg, String(rotation)).toContain(`rotate(${rotation},`)
    }
  })

  it("keeps dimensions at 180 degrees", () => {
    const total = BARS.reduce((a, b) => a + b, 0)
    const svg = renderBarcodeSVG(BARS, { rotation: 180, barWidth: 2, margin: 10, height: 80 })
    expect(svg).toContain(`viewBox="0 0 ${total * 2 + 20} 100"`)
    expect(svg).toContain("rotate(180,")
  })

  it("closes the transform group", () => {
    const svg = renderBarcodeSVG(BARS, { rotation: 90 })
    expect(svg).toContain("<g transform=")
    expect(svg).toContain("</g>")
  })
})

describe("renderBarcodeSVG — human-readable text", () => {
  it("omits text unless showText is set", () => {
    expect(renderBarcodeSVG(BARS, { text: "12345" })).not.toContain("<text")
  })

  it("renders text below by default", () => {
    const svg = renderBarcodeSVG(BARS, { showText: true, text: "12345", height: 80, margin: 10 })
    const y = Number(/<text x="[\d.]+" y="([\d.]+)"/.exec(svg)![1])
    expect(y).toBeGreaterThan(80)
    expect(svg).toContain(">12345</text>")
  })

  it("renders text above when textPosition is top", () => {
    const svg = renderBarcodeSVG(BARS, {
      showText: true,
      text: "12345",
      textPosition: "top",
      height: 80,
      margin: 10,
      fontSize: 14,
      background: "transparent",
    })
    const textY = Number(/<text x="[\d.]+" y="([\d.]+)"/.exec(svg)![1])
    const [firstBar] = rects(svg)
    expect(textY).toBeLessThan(firstBar!.y)
  })

  it("aligns text center, left and right", () => {
    const center = renderBarcodeSVG(BARS, { showText: true, text: "X" })
    expect(center).toContain('text-anchor="middle"')

    const left = renderBarcodeSVG(BARS, { showText: true, text: "X", textAlign: "left" })
    expect(left).toContain('text-anchor="start"')
    expect(left).toContain('<text x="10"')

    const right = renderBarcodeSVG(BARS, { showText: true, text: "X", textAlign: "right" })
    expect(right).toContain('text-anchor="end"')
  })

  it("reserves vertical space for the text", () => {
    const without = renderBarcodeSVG(BARS, { height: 80, margin: 10 })
    const withText = renderBarcodeSVG(BARS, {
      height: 80,
      margin: 10,
      showText: true,
      text: "X",
      fontSize: 14,
    })
    const width = BARS.reduce((a, b) => a + b, 0) * 2 + 20
    expect(without).toContain(`viewBox="0 0 ${width} 100"`)
    expect(withText).toContain(`viewBox="0 0 ${width} ${100 + 14 + 8}"`)
  })

  it("applies font family and size", () => {
    const svg = renderBarcodeSVG(BARS, {
      showText: true,
      text: "X",
      fontFamily: "Helvetica",
      fontSize: 20,
    })
    expect(svg).toContain('font-family="Helvetica"')
    expect(svg).toContain('font-size="20"')
  })

  it("escapes text content", () => {
    expect(renderBarcodeSVG(BARS, { showText: true, text: '<a & "b">' })).toContain(
      "&lt;a &amp; &quot;b&quot;&gt;",
    )
  })
})

describe("renderBarcodeSVG — bearer bars", () => {
  it("draws four bearer rects around the symbol", () => {
    const plain = rects(renderBarcodeSVG(BARS, { background: "transparent" })).length
    const bearer = rects(
      renderBarcodeSVG(BARS, { bearerBars: true, background: "transparent" }),
    ).length
    expect(bearer).toBe(plain + 4)
  })

  it("adds vertical space for the bearer bars", () => {
    const svg = renderBarcodeSVG(BARS, {
      bearerBars: true,
      bearerBarWidth: 5,
      height: 80,
      margin: 10,
    })
    const width = BARS.reduce((a, b) => a + b, 0) * 2 + 20
    expect(svg).toContain(`viewBox="0 0 ${width} ${80 + 20 + 10}"`)
  })

  it("honours bearerBarWidth", () => {
    const thin = renderBarcodeSVG(BARS, { bearerBars: true, bearerBarWidth: 2 })
    const thick = renderBarcodeSVG(BARS, { bearerBars: true, bearerBarWidth: 8 })
    expect(thin).not.toBe(thick)
  })

  it("combines bearer bars with text", () => {
    const svg = renderBarcodeSVG(BARS, { bearerBars: true, showText: true, text: "1234" })
    expect(svg).toContain("<text")
    expect(rects(svg).length).toBeGreaterThan(4)
  })
})

describe("renderBarcodeSVG — presentation", () => {
  it("applies colors", () => {
    const svg = renderBarcodeSVG(BARS, { color: "#123456", background: "#abcdef" })
    expect(svg).toContain('fill="#123456"')
    expect(svg).toContain('fill="#abcdef"')
  })

  it("omits the background rect when transparent", () => {
    expect(renderBarcodeSVG(BARS, { background: "transparent" })).not.toContain('width="100%"')
  })

  it("applies measurement units to width and height only", () => {
    const svg = renderBarcodeSVG(BARS, { unit: "mm" })
    expect(svg).toMatch(/width="[\d.]+mm"/)
    expect(svg).toMatch(/height="[\d.]+mm"/)
    expect(svg).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/)
  })

  it("supports every measurement unit", () => {
    for (const unit of ["px", "mm", "cm", "in", "pt"] as const) {
      const svg = renderBarcodeSVG(BARS, { unit })
      const suffix = unit === "px" ? "" : unit
      expect(svg, unit).toMatch(new RegExp(`width="[\\d.]+${suffix}"`))
    }
  })

  it("supports accessibility metadata", () => {
    const svg = renderBarcodeSVG(BARS, {
      ariaLabel: "product code",
      role: "graphics-symbol",
      title: "Barcode",
      desc: "A Code 128 barcode",
    })
    expect(svg).toContain('aria-label="product code"')
    expect(svg).toContain('role="graphics-symbol"')
    expect(svg).toContain("<title>Barcode</title>")
    expect(svg).toContain("<desc>A Code 128 barcode</desc>")
  })

  it("defaults to role=img with no aria-label", () => {
    const svg = renderBarcodeSVG(BARS)
    expect(svg).toContain('role="img"')
    expect(svg).not.toContain("aria-label")
  })

  it("escapes accessibility text", () => {
    const svg = renderBarcodeSVG(BARS, { title: "<t>", desc: "a & b", ariaLabel: '"q"' })
    expect(svg).toContain("<title>&lt;t&gt;</title>")
    expect(svg).toContain("<desc>a &amp; b</desc>")
    expect(svg).toContain('aria-label="&quot;q&quot;"')
  })

  it("handles an empty bar list", () => {
    const svg = renderBarcodeSVG([], { margin: 10, height: 80 })
    expect(svg).toContain('viewBox="0 0 20 100"')
    expect(rects(svg)).toHaveLength(0)
  })
})
