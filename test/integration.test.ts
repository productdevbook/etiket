import { describe, expect, it } from "vitest";
import {
  barcode,
  qrcode,
  qrcodeTerminal,
  barcodeDataURI,
  qrcodeDataURI,
  wifi,
  email,
  sms,
  geo,
  url,
} from "../src/index";

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
  ] as const;

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
  };

  for (const type of types) {
    it(`generates valid SVG for ${type}`, () => {
      const svg = barcode(testData[type]!, { type });
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain("<rect"); // At least background + bars
    });
  }

  it("generates valid SVG for code39ext", () => {
    const svg = barcode("hello", { type: "code39ext" });
    expect(svg).toContain("<svg");
  });

  it("generates valid SVG for code93ext", () => {
    const svg = barcode("hello", { type: "code93ext" });
    expect(svg).toContain("<svg");
  });

  it("generates valid SVG for itf14", () => {
    const svg = barcode("00012345678905", { type: "itf14" });
    expect(svg).toContain("<svg");
  });

  it("generates valid SVG for upce", () => {
    const svg = barcode("01234565", { type: "upce" });
    expect(svg).toContain("<svg");
  });

  it("generates valid SVG for ean2", () => {
    const svg = barcode("53", { type: "ean2" });
    expect(svg).toContain("<svg");
  });

  it("generates valid SVG for ean5", () => {
    const svg = barcode("52495", { type: "ean5" });
    expect(svg).toContain("<svg");
  });

  it("generates valid SVG for gs1-128", () => {
    const svg = barcode("(01)12345678901234", { type: "gs1-128" });
    expect(svg).toContain("<svg");
  });

  it("supports text display for all types", () => {
    const svg = barcode("Hello", { type: "code128", showText: true });
    expect(svg).toContain("<text");
    expect(svg).toContain("Hello");
  });

  it("supports custom colors", () => {
    const svg = barcode("Test", { color: "#ff0000", background: "#eee" });
    expect(svg).toContain("#ff0000");
    expect(svg).toContain("#eee");
  });

  it("supports transparent background", () => {
    const svg = barcode("Test", { background: "transparent" });
    expect(svg).not.toContain('fill="transparent"');
  });

  it("supports bearer bars for ITF-14", () => {
    const svg = barcode("00012345678905", { type: "itf14", bearerBars: true });
    expect(svg).toContain("<svg");
    // Bearer bars add extra rects
    const rectCount = (svg.match(/<rect/g) || []).length;
    expect(rectCount).toBeGreaterThan(5); // background + bars + bearer
  });

  it("throws on unsupported type", () => {
    expect(() => barcode("test", { type: "invalid" as any })).toThrow("Unsupported");
  });
});

describe("qrcode integration", () => {
  it("generates valid SVG", () => {
    const svg = qrcode("Hello");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<path");
  });

  it("respects size option", () => {
    const svg = qrcode("Test", { size: 300 });
    expect(svg).toContain('width="300"');
    expect(svg).toContain('height="300"');
  });

  it("supports EC levels", () => {
    for (const ecLevel of ["L", "M", "Q", "H"] as const) {
      const svg = qrcode("Test", { ecLevel });
      expect(svg).toContain("<svg");
    }
  });

  it("supports dot types", () => {
    const types = ["square", "rounded", "dots", "diamond"] as const;
    for (const dotType of types) {
      const svg = qrcode("Test", { dotType });
      expect(svg).toContain("<svg");
    }
  });

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
    });
    expect(svg).toContain("<defs>");
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain("url(#");
  });

  it("supports corner styling", () => {
    const svg = qrcode("Test", {
      corners: {
        topLeft: { outerShape: "rounded", innerShape: "dots" },
        topRight: { outerColor: "#ff0000" },
      },
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain('fill="#ff0000"');
  });

  it("supports XML declaration", () => {
    const svg = qrcode("Test", { xmlDeclaration: true });
    expect(svg).toMatch(/^<\?xml/);
  });
});

describe("terminal output", () => {
  it("generates terminal-printable string", () => {
    const text = qrcodeTerminal("Hello");
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("\n");
  });
});

describe("data URI output", () => {
  it("generates barcode data URI", () => {
    const uri = barcodeDataURI("Hello");
    expect(uri).toMatch(/^data:image\/svg\+xml,/);
  });

  it("generates QR code data URI", () => {
    const uri = qrcodeDataURI("Hello");
    expect(uri).toMatch(/^data:image\/svg\+xml,/);
  });
});

describe("convenience functions", () => {
  it("wifi generates QR SVG", () => {
    const svg = wifi("MyNetwork", "password123");
    expect(svg).toContain("<svg");
    // WiFi string should be encoded
  });

  it("email generates QR SVG", () => {
    const svg = email("test@example.com");
    expect(svg).toContain("<svg");
  });

  it("sms generates QR SVG", () => {
    const svg = sms("+1234567890", "Hello");
    expect(svg).toContain("<svg");
  });

  it("geo generates QR SVG", () => {
    const svg = geo(37.7749, -122.4194);
    expect(svg).toContain("<svg");
  });

  it("url generates QR SVG", () => {
    const svg = url("https://example.com");
    expect(svg).toContain("<svg");
  });
});
