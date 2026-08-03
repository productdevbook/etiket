import { describe, expect, it } from "vitest";
import { renderPostalSVG } from "../src/renderers/svg/postal";
import { renderPostalRaster, renderPostalPNG } from "../src/renderers/png/rasterize";
import { encodePostal, postal, postalDataURI, postalBase64 } from "../src/_postal";
import { postalPNG, postalPNGDataURI } from "../src/_png";
import { barcode, encodeBars } from "../src/_barcode";
import { encodePOSTNET, encodePLANET } from "../src/encoders/postnet";
import { encodeRM4SCC } from "../src/encoders/fourstate";
import type { FourState } from "../src/encoders/fourstate";

/** Extract every <path d="..."> rect as {x, y, w, h} from a postal SVG. */
function parseBars(svg: string): Array<{ x: number; y: number; w: number; h: number }> {
  const match = /<path d="([^"]+)"/.exec(svg);
  if (!match) return [];
  const bars: Array<{ x: number; y: number; w: number; h: number }> = [];
  const re = /M([\d.-]+),([\d.-]+)h([\d.-]+)v([\d.-]+)h-[\d.-]+z/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(match[1]!)) !== null) {
    bars.push({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) });
  }
  return bars;
}

describe("renderPostalSVG — 2-state (POSTNET/PLANET)", () => {
  it("renders one bar per encoded height", () => {
    const bars = encodePOSTNET("12345");
    const svg = renderPostalSVG(bars);
    expect(parseBars(svg)).toHaveLength(bars.length);
  });

  it("gives tall bars full height and short bars the short fraction", () => {
    const heights = encodePOSTNET("12345");
    const svg = renderPostalSVG(heights, { height: 100, shortRatio: 0.4 });
    const drawn = parseBars(svg);

    for (const [i, h] of heights.entries()) {
      expect(drawn[i]!.h).toBeCloseTo(h === 1 ? 100 : 40, 3);
    }
  });

  it("aligns tall and short bars on a common baseline", () => {
    const heights = encodePOSTNET("12345");
    const svg = renderPostalSVG(heights, { height: 100, margin: 10 });
    const drawn = parseBars(svg);
    for (const bar of drawn) {
      expect(bar.y + bar.h).toBeCloseTo(110, 3);
    }
  });

  it("recovers the original heights from the rendered geometry", () => {
    const heights = encodePOSTNET("123456789");
    const svg = renderPostalSVG(heights, { height: 100 });
    const recovered = parseBars(svg).map((b) => (b.h > 50 ? 1 : 0));
    expect(recovered).toEqual(heights);
  });

  it("distinguishes POSTNET from PLANET (inverted heights)", () => {
    const zip = "12345678901";
    const postnet = renderPostalSVG(encodePOSTNET(zip), { height: 100 });
    const planet = renderPostalSVG(encodePLANET(zip), { height: 100 });
    expect(postnet).not.toBe(planet);
  });

  it("spaces bars on the configured pitch", () => {
    const svg = renderPostalSVG(encodePOSTNET("12345"), { barWidth: 2, pitch: 5, margin: 10 });
    const drawn = parseBars(svg);
    expect(drawn[0]!.x).toBe(10);
    expect(drawn[1]!.x).toBe(15);
    expect(drawn[2]!.x).toBe(20);
    expect(drawn[0]!.w).toBe(2);
  });

  it("defaults pitch to twice the bar width", () => {
    const drawn = parseBars(renderPostalSVG(encodePOSTNET("12345"), { barWidth: 3, margin: 0 }));
    expect(drawn[1]!.x - drawn[0]!.x).toBe(6);
  });
});

describe("renderPostalSVG — 4-state", () => {
  const ALL: FourState[] = ["T", "A", "D", "F"];

  it("renders the four bar states at distinct vertical extents", () => {
    const svg = renderPostalSVG(ALL, { height: 90, margin: 0, trackerRatio: 1 / 3 });
    const [t, a, d, f] = parseBars(svg);

    // Tracker: centre band only
    expect(t!.y).toBeCloseTo(30, 3);
    expect(t!.h).toBeCloseTo(30, 3);
    // Ascender: top through centre
    expect(a!.y).toBeCloseTo(0, 3);
    expect(a!.h).toBeCloseTo(60, 3);
    // Descender: centre through bottom
    expect(d!.y).toBeCloseTo(30, 3);
    expect(d!.h).toBeCloseTo(60, 3);
    // Full: entire height
    expect(f!.y).toBeCloseTo(0, 3);
    expect(f!.h).toBeCloseTo(90, 3);
  });

  it("recovers bar states from the rendered geometry", () => {
    const bars = encodeRM4SCC("SN34RD1A");
    const svg = renderPostalSVG(bars, { height: 90, margin: 0 });
    const recovered = parseBars(svg).map((b): FourState => {
      const top = b.y < 15;
      const bottom = b.y + b.h > 75;
      if (top && bottom) return "F";
      if (top) return "A";
      if (bottom) return "D";
      return "T";
    });
    expect(recovered).toEqual(bars);
  });

  it("honours trackerRatio", () => {
    const svg = renderPostalSVG(["T"], { height: 100, margin: 0, trackerRatio: 0.5 });
    const [t] = parseBars(svg);
    expect(t!.h).toBeCloseTo(50, 3);
    expect(t!.y).toBeCloseTo(25, 3);
  });

  it("detects the 4-state family even when the first bar is a tracker", () => {
    const svg = renderPostalSVG(["T", "T", "A"], { height: 90, margin: 0 });
    const [first] = parseBars(svg);
    expect(first!.h).toBeCloseTo(30, 3);
  });
});

describe("renderPostalSVG — output shape", () => {
  it("produces a well-formed SVG with computed dimensions", () => {
    const svg = renderPostalSVG(encodePOSTNET("12345"), {
      barWidth: 2,
      pitch: 4,
      height: 40,
      margin: 10,
    });
    const bars = encodePOSTNET("12345").length;
    const width = (bars - 1) * 4 + 2 + 20;
    expect(svg).toContain(`viewBox="0 0 ${width} 60"`);
    expect(svg).toContain(`width="${width}"`);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  it("omits the background rect when transparent", () => {
    const svg = renderPostalSVG(["A", "F"], { background: "transparent" });
    expect(svg).not.toContain("<rect");
  });

  it("applies colors and measurement units", () => {
    const svg = renderPostalSVG(["A", "F"], { color: "#f00", background: "#eee", unit: "mm" });
    expect(svg).toContain('fill="#f00"');
    expect(svg).toContain('fill="#eee"');
    expect(svg).toContain('mm"');
  });

  it("supports accessibility metadata", () => {
    const svg = renderPostalSVG(["A", "F"], {
      ariaLabel: "postal code",
      title: "Title",
      desc: "Desc",
      role: "graphics-symbol",
    });
    expect(svg).toContain('aria-label="postal code"');
    expect(svg).toContain("<title>Title</title>");
    expect(svg).toContain("<desc>Desc</desc>");
    expect(svg).toContain('role="graphics-symbol"');
  });

  it("escapes text content", () => {
    const svg = renderPostalSVG(["A"], { showText: true, text: "<a & b>" });
    expect(svg).toContain("&lt;a &amp; b&gt;");
  });

  it("renders human-readable text when requested", () => {
    const svg = renderPostalSVG(encodePOSTNET("12345"), { showText: true, text: "12345" });
    expect(svg).toContain(">12345</text>");
  });

  it("handles an empty bar list", () => {
    const svg = renderPostalSVG([]);
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<path");
  });

  it("supports per-side margins", () => {
    const svg = renderPostalSVG(["A"], {
      marginLeft: 5,
      marginTop: 7,
      marginRight: 11,
      marginBottom: 13,
      barWidth: 2,
      height: 40,
    });
    const [bar] = parseBars(svg);
    expect(bar!.x).toBe(5);
    expect(bar!.y).toBe(7);
    expect(svg).toContain(`viewBox="0 0 ${5 + 2 + 11} ${40 + 7 + 13}"`);
  });
});

describe("encodePostal", () => {
  it("encodes each supported symbology", () => {
    expect(encodePostal("12345", { type: "postnet" }).length).toBeGreaterThan(0);
    expect(encodePostal("12345678901", { type: "planet" }).length).toBeGreaterThan(0);
    expect(encodePostal("SN34RD1A", { type: "rm4scc" })).toContain("F");
    expect(encodePostal("2500GG", { type: "kix" }).length).toBe(24);
    expect(encodePostal("12345678", { type: "auspost", fcc: "11" }).length).toBeGreaterThan(0);
    expect(encodePostal("1234567", { type: "jppost" }).length).toBeGreaterThan(0);
    expect(encodePostal("01234567094987654321", { type: "imb" }).length).toBe(65);
  });

  it("defaults to postnet", () => {
    expect(encodePostal("12345")).toEqual(encodePOSTNET("12345"));
  });

  it("passes the routing code through to IMb", () => {
    const withRouting = encodePostal("01234567094987654321", {
      type: "imb",
      routingCode: "01234567891",
    });
    const without = encodePostal("01234567094987654321", { type: "imb" });
    expect(withRouting).not.toEqual(without);
  });

  it("passes the address through to Japan Post", () => {
    const withAddr = encodePostal("1234567", { type: "jppost", routingCode: "1-2-3" });
    const without = encodePostal("1234567", { type: "jppost" });
    expect(withAddr).not.toEqual(without);
  });

  it("uses the Australia Post format control code", () => {
    const fcc11 = encodePostal("12345678", { type: "auspost", fcc: "11" });
    const fcc59 = encodePostal("12345678", { type: "auspost", fcc: "59" });
    expect(fcc11).not.toEqual(fcc59);
  });

  it("rejects an unknown type", () => {
    expect(() => encodePostal("12345", { type: "nope" as "postnet" })).toThrow(
      /Unsupported postal type/,
    );
  });

  it("propagates encoder validation errors", () => {
    expect(() => encodePostal("ABC", { type: "postnet" })).toThrow();
    expect(() => encodePostal("123", { type: "auspost" })).toThrow();
  });
});

describe("postal()", () => {
  it("renders SVG for each symbology", () => {
    for (const [type, text] of [
      ["postnet", "12345"],
      ["planet", "12345678901"],
      ["rm4scc", "SN34RD1A"],
      ["kix", "2500GG"],
      ["auspost", "12345678"],
      ["jppost", "1234567"],
      ["imb", "01234567094987654321"],
    ] as const) {
      const svg = postal(text, { type });
      expect(svg, type).toContain("<svg");
      expect(svg, type).toContain("<path");
    }
  });

  it("does not leak encoding options into SVG attributes", () => {
    const svg = postal("01234567094987654321", { type: "imb", routingCode: "01234567891" });
    expect(svg).not.toContain("routingCode");
    expect(svg).not.toContain("type=");
  });

  it("produces data URI and base64 variants", () => {
    expect(postalDataURI("12345", { type: "postnet" })).toMatch(/^data:image\/svg\+xml/);
    expect(postalBase64("12345", { type: "postnet" })).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});

describe("barcode() postal integration", () => {
  it("renders POSTNET with height modulation rather than flat bars", () => {
    const svg = barcode("12345", { type: "postnet", height: 100 });
    const heights = new Set(parseBars(svg).map((b) => b.h));
    // A meaningful POSTNET has both tall and short bars
    expect(heights.size).toBe(2);
  });

  it("matches the dedicated postal() renderer", () => {
    expect(barcode("12345", { type: "postnet" })).toBe(postal("12345", { type: "postnet" }));
  });

  it("renders PLANET too", () => {
    const svg = barcode("12345678901", { type: "planet", height: 100 });
    expect(new Set(parseBars(svg).map((b) => b.h)).size).toBe(2);
  });

  it("directs encodeBars() callers to the postal API", () => {
    expect(() => encodeBars("12345", { type: "postnet" })).toThrow(/encodePostal/);
    expect(() => encodeBars("12345678901", { type: "planet" })).toThrow(/encodePostal/);
  });
});

describe("postal PNG", () => {
  it("rasterizes 2-state bars with the correct dimensions", () => {
    const bars = encodePOSTNET("12345");
    const raster = renderPostalRaster(bars, { scale: 2, pitch: 4, height: 40, margin: 10 });
    expect(raster.width).toBe((bars.length - 1) * 4 + 2 + 20);
    expect(raster.height).toBe(60);
    expect(raster.rows).toHaveLength(60);
  });

  it("rasterizes tall bars taller than short bars", () => {
    const heights = encodePOSTNET("12345");
    const raster = renderPostalRaster(heights, { scale: 2, pitch: 4, height: 40, margin: 0 });

    const columnHeight = (barIndex: number): number => {
      let count = 0;
      for (const row of raster.rows) {
        if (row[barIndex * 4]) count++;
      }
      return count;
    };

    for (const [i, h] of heights.entries()) {
      expect(columnHeight(i)).toBe(h === 1 ? 40 : 16);
    }
  });

  it("rasterizes the four bar states distinctly", () => {
    const raster = renderPostalRaster(["T", "A", "D", "F"], {
      scale: 2,
      pitch: 4,
      height: 90,
      margin: 0,
    });
    const extent = (i: number): { first: number; last: number } => {
      let first = -1;
      let last = -1;
      for (const [y, row] of raster.rows.entries()) {
        if (row[i * 4]) {
          if (first === -1) first = y;
          last = y;
        }
      }
      return { first, last };
    };
    expect(extent(0)).toEqual({ first: 30, last: 59 });
    expect(extent(1)).toEqual({ first: 0, last: 59 });
    expect(extent(2)).toEqual({ first: 30, last: 89 });
    expect(extent(3)).toEqual({ first: 0, last: 89 });
  });

  it("emits a valid PNG signature", () => {
    const png = renderPostalPNG(encodePOSTNET("12345"));
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("exposes postalPNG and postalPNGDataURI", () => {
    const png = postalPNG("SN34RD1A", { type: "rm4scc" });
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(postalPNGDataURI("12345", { type: "postnet" })).toMatch(/^data:image\/png;base64,/);
  });

  it("handles an empty bar list", () => {
    const raster = renderPostalRaster([], { margin: 5 });
    expect(raster.width).toBe(10);
  });
});
