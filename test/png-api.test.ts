import { describe, expect, it } from "vitest"
import {
  barcodePNG,
  barcodePNGDataURI,
  qrcodePNG,
  qrcodePNGDataURI,
  datamatrixPNG,
  datamatrixPNGDataURI,
  gs1datamatrixPNG,
  gs1datamatrixPNGDataURI,
  pdf417PNG,
  pdf417PNGDataURI,
  aztecPNG,
  aztecPNGDataURI,
} from "../src/_png"
import { renderBarcodePNG, renderMatrixPNG } from "../src/renderers/png/rasterize"

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10]

function isPNG(data: Uint8Array): boolean {
  return PNG_SIG.every((b, i) => data[i] === b)
}

function getIHDRDimensions(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

describe("renderBarcodePNG", () => {
  it("renders simple bar pattern", () => {
    const bars = [2, 1, 3, 1, 2]
    const png = renderBarcodePNG(bars, { scale: 1, height: 10, margin: 0 })
    expect(isPNG(png)).toBe(true)
    const { width, height } = getIHDRDimensions(png)
    expect(width).toBe(9) // 2+1+3+1+2
    expect(height).toBe(10)
  })

  it("applies margin", () => {
    const bars = [1, 1, 1]
    const png = renderBarcodePNG(bars, { scale: 1, height: 10, margin: 5 })
    const { width, height } = getIHDRDimensions(png)
    expect(width).toBe(3 + 10) // bars + margin*2
    expect(height).toBe(10 + 10) // height + margin*2
  })

  it("applies scale", () => {
    const bars = [2, 1]
    const png = renderBarcodePNG(bars, { scale: 3, height: 10, margin: 0 })
    const { width } = getIHDRDimensions(png)
    expect(width).toBe(9) // (2+1)*3
  })
})

describe("renderMatrixPNG", () => {
  it("renders simple matrix", () => {
    const matrix = [
      [true, false],
      [false, true],
    ]
    const png = renderMatrixPNG(matrix, { moduleSize: 5, margin: 0 })
    expect(isPNG(png)).toBe(true)
    const { width, height } = getIHDRDimensions(png)
    expect(width).toBe(10)
    expect(height).toBe(10)
  })

  it("applies margin in modules", () => {
    const matrix = [[true]]
    const png = renderMatrixPNG(matrix, { moduleSize: 4, margin: 2 })
    const { width, height } = getIHDRDimensions(png)
    expect(width).toBe(20) // (1 + 2*2) * 4
    expect(height).toBe(20)
  })
})

describe("barcodePNG", () => {
  it("generates PNG for code128", () => {
    const png = barcodePNG("ABC123")
    expect(isPNG(png)).toBe(true)
  })

  it("generates PNG for ean13", () => {
    const png = barcodePNG("5901234123457", { type: "ean13" })
    expect(isPNG(png)).toBe(true)
  })

  it("generates PNG for code39", () => {
    const png = barcodePNG("HELLO", { type: "code39" })
    expect(isPNG(png)).toBe(true)
  })

  it("generates PNG with custom colors", () => {
    const png = barcodePNG("TEST", { color: "#ff0000", background: "#00ff00" })
    expect(isPNG(png)).toBe(true)
  })
})

describe("barcodePNGDataURI", () => {
  it("returns data URI string", () => {
    const uri = barcodePNGDataURI("ABC")
    expect(uri).toMatch(/^data:image\/png;base64,/)
  })
})

describe("qrcodePNG", () => {
  it("generates PNG for QR code", () => {
    const png = qrcodePNG("Hello World")
    expect(isPNG(png)).toBe(true)
  })

  it("respects moduleSize option", () => {
    const small = qrcodePNG("test", { moduleSize: 2, margin: 0 })
    const large = qrcodePNG("test", { moduleSize: 10, margin: 0 })
    const smallDim = getIHDRDimensions(small)
    const largeDim = getIHDRDimensions(large)
    expect(largeDim.width).toBe(smallDim.width * 5)
  })

  it("supports EC level option", () => {
    const png = qrcodePNG("test", { ecLevel: "H" })
    expect(isPNG(png)).toBe(true)
  })
})

describe("qrcodePNGDataURI", () => {
  it("returns data URI string", () => {
    const uri = qrcodePNGDataURI("test")
    expect(uri).toMatch(/^data:image\/png;base64,/)
  })
})

describe("datamatrixPNG", () => {
  it("generates PNG for Data Matrix", () => {
    const png = datamatrixPNG("Hello")
    expect(isPNG(png)).toBe(true)
  })
})

describe("datamatrixPNGDataURI", () => {
  it("returns data URI string", () => {
    const uri = datamatrixPNGDataURI("test")
    expect(uri).toMatch(/^data:image\/png;base64,/)
  })
})

describe("gs1datamatrixPNG", () => {
  it("generates PNG for GS1 Data Matrix", () => {
    const png = gs1datamatrixPNG("(01)09521234543213")
    expect(isPNG(png)).toBe(true)
  })
})

describe("gs1datamatrixPNGDataURI", () => {
  it("returns data URI string", () => {
    const uri = gs1datamatrixPNGDataURI("(01)09521234543213")
    expect(uri).toMatch(/^data:image\/png;base64,/)
  })
})

describe("pdf417PNG", () => {
  it("generates PNG for PDF417", () => {
    const png = pdf417PNG("Hello World")
    expect(isPNG(png)).toBe(true)
  })

  it("supports ecLevel option", () => {
    const png = pdf417PNG("test", { ecLevel: 3 })
    expect(isPNG(png)).toBe(true)
  })
})

describe("pdf417PNGDataURI", () => {
  it("returns data URI string", () => {
    const uri = pdf417PNGDataURI("test")
    expect(uri).toMatch(/^data:image\/png;base64,/)
  })
})

describe("aztecPNG", () => {
  it("generates PNG for Aztec", () => {
    const png = aztecPNG("Hello")
    expect(isPNG(png)).toBe(true)
  })

  it("supports layers option", () => {
    const png = aztecPNG("test", { layers: 4 })
    expect(isPNG(png)).toBe(true)
  })
})

describe("aztecPNGDataURI", () => {
  it("returns data URI string", () => {
    const uri = aztecPNGDataURI("test")
    expect(uri).toMatch(/^data:image\/png;base64,/)
  })
})
