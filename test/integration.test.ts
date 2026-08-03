import { describe, expect, it } from "vitest"
import {
  barcode,
  qrcode,
  qrcodeTerminal,
  barcodeDataURI,
  qrcodeDataURI,
  datamatrix,
  pdf417,
  aztec,
  wifi,
  email,
  sms,
  geo,
  url,
} from "../src/index"
import { renderBarcodeSVG } from "../src/renderers/svg/barcode"
import { renderQRCodeSVG } from "../src/renderers/svg/qr"
import { renderMatrixSVG } from "../src/renderers/svg/matrix"

describe("barcode integration", () => {
  const types = [
    "code128",
    "ean13",
    "ean8",
    "code39",
    "code93",
    "itf",
    "upca",
    "codabar",
    "msi",
    "pharmacode",
    "code11",
  ] as const

  const testData: Record<string, string> = {
    code128: "Hello",
    ean13: "4006381333931",
    ean8: "96385074",
    code39: "HELLO",
    code93: "TEST",
    itf: "1234567890",
    upca: "012345678905",
    codabar: "12345",
    msi: "12345",
    pharmacode: "1234",
    code11: "12345-6",
  }

  for (const type of types) {
    it(`generates valid SVG for ${type}`, () => {
      const svg = barcode(testData[type]!, { type })
      expect(svg).toContain("<svg")
      expect(svg).toContain("</svg>")
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain("<rect") // At least background + bars
    })
  }

  it("generates valid SVG for code39ext", () => {
    const svg = barcode("hello", { type: "code39ext" })
    expect(svg).toContain("<svg")
  })

  it("generates valid SVG for code93ext", () => {
    const svg = barcode("hello", { type: "code93ext" })
    expect(svg).toContain("<svg")
  })

  it("generates valid SVG for itf14", () => {
    const svg = barcode("00012345678905", { type: "itf14" })
    expect(svg).toContain("<svg")
  })

  it("generates valid SVG for upce", () => {
    const svg = barcode("01234565", { type: "upce" })
    expect(svg).toContain("<svg")
  })

  it("generates valid SVG for ean2", () => {
    const svg = barcode("53", { type: "ean2" })
    expect(svg).toContain("<svg")
  })

  it("generates valid SVG for ean5", () => {
    const svg = barcode("52495", { type: "ean5" })
    expect(svg).toContain("<svg")
  })

  it("generates valid SVG for gs1-128", () => {
    const svg = barcode("(01)12345678901234", { type: "gs1-128" })
    expect(svg).toContain("<svg")
  })

  it("supports text display for all types", () => {
    const svg = barcode("Hello", { type: "code128", showText: true })
    expect(svg).toContain("<text")
    expect(svg).toContain("Hello")
  })

  it("supports custom colors", () => {
    const svg = barcode("Test", { color: "#ff0000", background: "#eee" })
    expect(svg).toContain("#ff0000")
    expect(svg).toContain("#eee")
  })

  it("supports transparent background", () => {
    const svg = barcode("Test", { background: "transparent" })
    expect(svg).not.toContain('fill="transparent"')
  })

  it("supports bearer bars for ITF-14", () => {
    const svg = barcode("00012345678905", { type: "itf14", bearerBars: true })
    expect(svg).toContain("<svg")
    // Bearer bars add extra rects
    const rectCount = (svg.match(/<rect/g) || []).length
    expect(rectCount).toBeGreaterThan(5) // background + bars + bearer
  })

  it("throws on unsupported type", () => {
    expect(() => barcode("test", { type: "invalid" as any })).toThrow("Unsupported")
  })
})

describe("qrcode integration", () => {
  it("generates valid SVG", () => {
    const svg = qrcode("Hello")
    expect(svg).toContain("<svg")
    expect(svg).toContain("</svg>")
    expect(svg).toContain("<path")
  })

  it("respects size option", () => {
    const svg = qrcode("Test", { size: 300 })
    expect(svg).toContain('width="300"')
    expect(svg).toContain('height="300"')
  })

  it("supports EC levels", () => {
    for (const ecLevel of ["L", "M", "Q", "H"] as const) {
      const svg = qrcode("Test", { ecLevel })
      expect(svg).toContain("<svg")
    }
  })

  it("supports dot types", () => {
    const types = ["square", "rounded", "dots", "diamond"] as const
    for (const dotType of types) {
      const svg = qrcode("Test", { dotType })
      expect(svg).toContain("<svg")
    }
  })

  it("supports gradients", () => {
    const svg = qrcode("Test", {
      color: {
        type: "linear",
        rotation: 45,
        stops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ],
      },
    })
    expect(svg).toContain("<defs>")
    expect(svg).toContain("<linearGradient")
    expect(svg).toContain("url(#")
  })

  it("supports corner styling", () => {
    const svg = qrcode("Test", {
      corners: {
        topLeft: { outerShape: "rounded", innerShape: "dots" },
        topRight: { outerColor: "#ff0000" },
      },
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain('fill="#ff0000"')
  })

  it("supports XML declaration", () => {
    const svg = qrcode("Test", { xmlDeclaration: true })
    expect(svg).toMatch(/^<\?xml/)
  })
})

describe("terminal output", () => {
  it("generates terminal-printable string", () => {
    const text = qrcodeTerminal("Hello")
    expect(text.length).toBeGreaterThan(0)
    expect(text).toContain("\n")
  })
})

describe("data URI output", () => {
  it("generates barcode data URI", () => {
    const uri = barcodeDataURI("Hello")
    expect(uri).toMatch(/^data:image\/svg\+xml,/)
  })

  it("generates QR code data URI", () => {
    const uri = qrcodeDataURI("Hello")
    expect(uri).toMatch(/^data:image\/svg\+xml,/)
  })
})

describe("convenience functions", () => {
  it("wifi generates QR SVG", () => {
    const svg = wifi("MyNetwork", "password123")
    expect(svg).toContain("<svg")
    // WiFi string should be encoded
  })

  it("email generates QR SVG", () => {
    const svg = email("test@example.com")
    expect(svg).toContain("<svg")
  })

  it("sms generates QR SVG", () => {
    const svg = sms("+1234567890", "Hello")
    expect(svg).toContain("<svg")
  })

  it("geo generates QR SVG", () => {
    const svg = geo(37.7749, -122.4194)
    expect(svg).toContain("<svg")
  })

  it("url generates QR SVG", () => {
    const svg = url("https://example.com")
    expect(svg).toContain("<svg")
  })
})

describe("SVG accessibility", () => {
  // Simple test data
  const testBars = [2, 1, 1, 1, 2]
  const testMatrix: boolean[][] = [
    [true, false, true],
    [false, true, false],
    [true, false, true],
  ]

  describe("default role attribute", () => {
    it("barcode SVG has role=img by default", () => {
      const svg = renderBarcodeSVG(testBars)
      expect(svg).toContain('role="img"')
    })

    it("QR code SVG has role=img by default", () => {
      const svg = renderQRCodeSVG(testMatrix)
      expect(svg).toContain('role="img"')
    })

    it("matrix SVG has role=img by default", () => {
      const svg = renderMatrixSVG(testMatrix)
      expect(svg).toContain('role="img"')
    })
  })

  describe("custom role attribute", () => {
    it("barcode SVG supports custom role", () => {
      const svg = renderBarcodeSVG(testBars, { role: "presentation" })
      expect(svg).toContain('role="presentation"')
      expect(svg).not.toContain('role="img"')
    })

    it("QR code SVG supports custom role", () => {
      const svg = renderQRCodeSVG(testMatrix, { role: "presentation" })
      expect(svg).toContain('role="presentation"')
    })

    it("matrix SVG supports custom role", () => {
      const svg = renderMatrixSVG(testMatrix, { role: "presentation" })
      expect(svg).toContain('role="presentation"')
    })
  })

  describe("aria-label attribute", () => {
    it("barcode SVG includes aria-label when provided", () => {
      const svg = renderBarcodeSVG(testBars, { ariaLabel: "Barcode for product 12345" })
      expect(svg).toContain('aria-label="Barcode for product 12345"')
    })

    it("QR code SVG includes aria-label when provided", () => {
      const svg = renderQRCodeSVG(testMatrix, { ariaLabel: "QR code linking to example.com" })
      expect(svg).toContain('aria-label="QR code linking to example.com"')
    })

    it("matrix SVG includes aria-label when provided", () => {
      const svg = renderMatrixSVG(testMatrix, { ariaLabel: "Data Matrix code" })
      expect(svg).toContain('aria-label="Data Matrix code"')
    })

    it("barcode SVG omits aria-label when not provided", () => {
      const svg = renderBarcodeSVG(testBars)
      expect(svg).not.toContain("aria-label")
    })

    it("QR code SVG omits aria-label when not provided", () => {
      const svg = renderQRCodeSVG(testMatrix)
      expect(svg).not.toContain("aria-label")
    })
  })

  describe("title element", () => {
    it("barcode SVG includes title element when provided", () => {
      const svg = renderBarcodeSVG(testBars, { title: "Product barcode" })
      expect(svg).toContain("<title>Product barcode</title>")
    })

    it("QR code SVG includes title element when provided", () => {
      const svg = renderQRCodeSVG(testMatrix, { title: "QR code" })
      expect(svg).toContain("<title>QR code</title>")
    })

    it("matrix SVG includes title element when provided", () => {
      const svg = renderMatrixSVG(testMatrix, { title: "Data Matrix" })
      expect(svg).toContain("<title>Data Matrix</title>")
    })

    it("title element appears before other content", () => {
      const svg = renderBarcodeSVG(testBars, { title: "Test title" })
      const titleIndex = svg.indexOf("<title>")
      const rectIndex = svg.indexOf("<rect")
      expect(titleIndex).toBeLessThan(rectIndex)
    })

    it("barcode SVG omits title when not provided", () => {
      const svg = renderBarcodeSVG(testBars)
      expect(svg).not.toContain("<title>")
    })
  })

  describe("desc element", () => {
    it("barcode SVG includes desc element when provided", () => {
      const svg = renderBarcodeSVG(testBars, {
        desc: "A barcode representing product information",
      })
      expect(svg).toContain("<desc>A barcode representing product information</desc>")
    })

    it("QR code SVG includes desc element when provided", () => {
      const svg = renderQRCodeSVG(testMatrix, { desc: "QR code for URL" })
      expect(svg).toContain("<desc>QR code for URL</desc>")
    })

    it("matrix SVG includes desc element when provided", () => {
      const svg = renderMatrixSVG(testMatrix, { desc: "Matrix code description" })
      expect(svg).toContain("<desc>Matrix code description</desc>")
    })

    it("desc appears after title when both provided", () => {
      const svg = renderBarcodeSVG(testBars, { title: "My title", desc: "My description" })
      const titleIndex = svg.indexOf("<title>")
      const descIndex = svg.indexOf("<desc>")
      expect(titleIndex).toBeLessThan(descIndex)
    })

    it("barcode SVG omits desc when not provided", () => {
      const svg = renderBarcodeSVG(testBars)
      expect(svg).not.toContain("<desc>")
    })
  })

  describe("all accessibility options combined", () => {
    it("barcode SVG supports all accessibility options together", () => {
      const svg = renderBarcodeSVG(testBars, {
        ariaLabel: "Barcode label",
        role: "img",
        title: "Barcode title",
        desc: "Barcode description",
      })
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-label="Barcode label"')
      expect(svg).toContain("<title>Barcode title</title>")
      expect(svg).toContain("<desc>Barcode description</desc>")
    })

    it("QR code SVG supports all accessibility options together", () => {
      const svg = renderQRCodeSVG(testMatrix, {
        ariaLabel: "QR label",
        role: "img",
        title: "QR title",
        desc: "QR description",
      })
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-label="QR label"')
      expect(svg).toContain("<title>QR title</title>")
      expect(svg).toContain("<desc>QR description</desc>")
    })

    it("matrix SVG supports all accessibility options together", () => {
      const svg = renderMatrixSVG(testMatrix, {
        ariaLabel: "Matrix label",
        role: "img",
        title: "Matrix title",
        desc: "Matrix description",
      })
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-label="Matrix label"')
      expect(svg).toContain("<title>Matrix title</title>")
      expect(svg).toContain("<desc>Matrix description</desc>")
    })
  })

  describe("XSS prevention in accessibility options", () => {
    it("escapes HTML in ariaLabel", () => {
      const svg = renderBarcodeSVG(testBars, { ariaLabel: 'test" onclick="alert(1)' })
      expect(svg).not.toContain('onclick="alert(1)"')
      expect(svg).toContain("&quot;")
    })

    it("escapes HTML in title", () => {
      const svg = renderBarcodeSVG(testBars, { title: "<script>alert(1)</script>" })
      expect(svg).not.toContain("<script>")
      expect(svg).toContain("&lt;script&gt;")
    })

    it("escapes HTML in desc", () => {
      const svg = renderBarcodeSVG(testBars, { desc: "<img onerror=alert(1)>" })
      expect(svg).not.toContain("<img")
      expect(svg).toContain("&lt;img")
    })
  })

  describe("high-level API passthrough", () => {
    it("barcode() passes accessibility options through", () => {
      const svg = barcode("Hello", {
        type: "code128",
        ariaLabel: "Code 128 barcode",
        title: "Product barcode",
        desc: "Barcode for product Hello",
      })
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-label="Code 128 barcode"')
      expect(svg).toContain("<title>Product barcode</title>")
      expect(svg).toContain("<desc>Barcode for product Hello</desc>")
    })

    it("qrcode() passes accessibility options through", () => {
      const svg = qrcode("https://example.com", {
        ariaLabel: "QR code for example.com",
        title: "Website QR code",
        desc: "Scan to visit example.com",
      })
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-label="QR code for example.com"')
      expect(svg).toContain("<title>Website QR code</title>")
      expect(svg).toContain("<desc>Scan to visit example.com</desc>")
    })

    it("datamatrix() passes accessibility options through", () => {
      const svg = datamatrix("Hello", {
        ariaLabel: "Data Matrix",
        title: "DM title",
      })
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-label="Data Matrix"')
      expect(svg).toContain("<title>DM title</title>")
    })

    it("pdf417() passes accessibility options through", () => {
      const svg = pdf417("Hello", {
        ariaLabel: "PDF417 barcode",
        title: "PDF417 title",
      })
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-label="PDF417 barcode"')
      expect(svg).toContain("<title>PDF417 title</title>")
    })

    it("aztec() passes accessibility options through", () => {
      const svg = aztec("Hello", {
        ariaLabel: "Aztec code",
        title: "Aztec title",
      })
      expect(svg).toContain('role="img"')
      expect(svg).toContain('aria-label="Aztec code"')
      expect(svg).toContain("<title>Aztec title</title>")
    })
  })

  describe("QR circle shape with accessibility", () => {
    it("circle shape works correctly with title and desc", () => {
      const svg = qrcode("Hello", {
        shape: "circle",
        title: "QR circle",
        desc: "Circle-shaped QR code",
      })
      expect(svg).toContain("<clipPath")
      expect(svg).toContain("etiket-circle-clip")
      expect(svg).toContain("<title>QR circle</title>")
      expect(svg).toContain("<desc>Circle-shaped QR code</desc>")
      expect(svg).toContain('role="img"')
    })

    it("circle shape with XML declaration and accessibility", () => {
      const svg = qrcode("Hello", {
        shape: "circle",
        xmlDeclaration: true,
        title: "QR code",
        ariaLabel: "QR code for Hello",
      })
      expect(svg).toMatch(/^<\?xml/)
      expect(svg).toContain("<clipPath")
      expect(svg).toContain("<title>QR code</title>")
      expect(svg).toContain('aria-label="QR code for Hello"')
    })
  })
})
