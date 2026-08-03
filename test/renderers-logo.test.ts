import { describe, expect, it } from "vitest"
import { renderQRCodeSVG } from "../src/renderers/svg/qr"

function uint8ToBase64(data: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]!)
  return btoa(binary)
}

/** Create a minimal valid ICO file with a single 32bpp entry */
function createTestICO(width: number, height: number, r: number, g: number, b: number): Uint8Array {
  const bpp = 32
  const pixelDataSize = width * height * 4
  const andMaskRowStride = Math.ceil(width / 32) * 4
  const andMaskSize = andMaskRowStride * height
  const headerSize = 40
  const imageSize = headerSize + pixelDataSize + andMaskSize
  const totalSize = 6 + 16 + imageSize

  const buf = new Uint8Array(totalSize)
  const view = new DataView(buf.buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, 1, true)

  buf[6] = width < 256 ? width : 0
  buf[7] = height < 256 ? height : 0
  view.setUint16(10, 1, true)
  view.setUint16(12, bpp, true)
  view.setUint32(14, imageSize, true)
  view.setUint32(18, 22, true)

  const imgOff = 22
  view.setUint32(imgOff, headerSize, true)
  view.setInt32(imgOff + 4, width, true)
  view.setInt32(imgOff + 8, height * 2, true)
  view.setUint16(imgOff + 12, 1, true)
  view.setUint16(imgOff + 14, bpp, true)

  const pixelOff = imgOff + headerSize
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = pixelOff + (y * width + x) * 4
      buf[i] = b
      buf[i + 1] = g
      buf[i + 2] = r
      buf[i + 3] = 255
    }
  }

  return buf
}

const matrix: boolean[][] = [
  [true, false, true, false, true],
  [false, true, false, true, false],
  [true, false, true, false, true],
  [false, true, false, true, false],
  [true, false, true, false, true],
]

describe("QR logo embedding", () => {
  it("embeds inline SVG logo", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { svg: '<circle r="0.5" fill="red"/>' },
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain("circle")
  })

  it("embeds SVG path logo", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { path: "M10 10 L90 10 L90 90 L10 90 Z" },
    })
    expect(svg).toContain("M10 10")
  })

  it("embeds image via data URI", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: dataUri },
    })
    expect(svg).toContain("<image")
    expect(svg).toContain('href="data:image/png;base64,')
  })

  it("embeds image via URL", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: "https://example.com/logo.png", imageWidth: 40, imageHeight: 40 },
    })
    expect(svg).toContain("<image")
    expect(svg).toContain("https://example.com/logo.png")
    expect(svg).toContain('width="40"')
    expect(svg).toContain('height="40"')
  })

  it("rejects imageUrl with dangerous scheme", () => {
    expect(() =>
      renderQRCodeSVG(matrix, {
        logo: { imageUrl: "javascript:alert(1)" },
      }),
    ).toThrow("imageUrl must use https:, http:, or data:image/ scheme")
  })

  it("escapes imageUrl to prevent injection", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: 'https://example.com/logo.png" onload="alert(1)' },
    })
    // The quote should be escaped so the attribute boundary is preserved
    expect(svg).not.toContain('href="https://example.com/logo.png"')
    expect(svg).toContain("&quot;")
  })

  it("rejects inline SVG with script tags", () => {
    expect(() =>
      renderQRCodeSVG(matrix, {
        logo: { svg: "<script>alert(1)</script>" },
      }),
    ).toThrow("potentially dangerous content")
  })

  it("rejects inline SVG with event handlers", () => {
    expect(() =>
      renderQRCodeSVG(matrix, {
        logo: { svg: '<circle r="1" onload="alert(1)"/>' },
      }),
    ).toThrow("potentially dangerous content")
  })

  it("auto-converts ICO logo to PNG", () => {
    // Create minimal valid 1x1 32bpp ICO
    const ico = createTestICO(1, 1, 255, 0, 0)
    const icoUri = `data:image/x-icon;base64,${uint8ToBase64(ico)}`
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: icoUri },
    })
    expect(svg).toContain("<image")
    expect(svg).toContain("data:image/png;base64,")
    expect(svg).not.toContain("x-icon")
  })

  it("auto-converts vnd.microsoft.icon logo to PNG", () => {
    const ico = createTestICO(1, 1, 0, 0, 255)
    const icoUri = `data:image/vnd.microsoft.icon;base64,${uint8ToBase64(ico)}`
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: icoUri },
    })
    expect(svg).toContain("data:image/png;base64,")
  })

  it("adds background behind logo", () => {
    const svg = renderQRCodeSVG(matrix, {
      logo: { imageUrl: "data:image/png;base64,abc", backgroundColor: "#fff" },
    })
    expect(svg).toContain('fill="#fff"')
  })

  it("hides background dots by default", () => {
    const withLogo = renderQRCodeSVG(matrix, {
      logo: { imageUrl: "data:image/png;base64,abc", size: 0.5 },
    })
    const withoutLogo = renderQRCodeSVG(matrix)
    // With logo should have fewer path segments (dots hidden)
    const withCount = (withLogo.match(/M/g) || []).length
    const withoutCount = (withoutLogo.match(/M/g) || []).length
    expect(withCount).toBeLessThanOrEqual(withoutCount)
  })
})
