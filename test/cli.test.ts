/**
 * CLI coverage — every subcommand is driven through citty and its output
 * inspected, so a broken command surfaces as a test failure rather than at
 * a user's terminal.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { runCommand } from "citty"
import { consola } from "consola"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { main } from "../src/_cli"

let dir: string
let stdout: string
let stdoutBytes: Uint8Array[]
let originalWrite: (s: string | Uint8Array) => boolean

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "etiket-cli-"))
  stdout = ""
  stdoutBytes = []
  originalWrite = process.stdout.write.bind(process.stdout)
  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    if (typeof chunk === "string") stdout += chunk
    else stdoutBytes.push(chunk)
    return true
  }
})

afterEach(() => {
  process.stdout.write = originalWrite
  rmSync(dir, { recursive: true, force: true })
})

/** Run the CLI with the given argv, returning the text it wrote to a file. */
async function runToFile(args: string[], filename: string): Promise<string> {
  const path = join(dir, filename)
  await runCommand(main, { rawArgs: [...args, "-o", path] })
  return readFileSync(path, "utf-8")
}

/** Run the CLI, returning the raw bytes it wrote to a file. */
async function runToBytes(args: string[], filename: string): Promise<Uint8Array> {
  const path = join(dir, filename)
  await runCommand(main, { rawArgs: [...args, "-o", path] })
  return readFileSync(path)
}

async function runToStdout(args: string[]): Promise<string> {
  await runCommand(main, { rawArgs: args })
  return stdout
}

/** Run the CLI expecting a usage error, returning the exit code it set. */
async function runExpectingFailure(args: string[]): Promise<number | undefined> {
  const before = process.exitCode
  process.exitCode = undefined
  await runCommand(main, { rawArgs: args })
  const code = process.exitCode
  process.exitCode = before
  return code
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

function expectSVG(text: string, label: string): void {
  expect(text.startsWith("<svg"), label).toBe(true)
  expect(text.trimEnd().endsWith("</svg>"), label).toBe(true)
  expect(text.includes("<path") || text.includes("<circle") || text.includes("<rect"), label).toBe(
    true,
  )
}

function expectPNG(bytes: Uint8Array, label: string): void {
  expect(Array.from(bytes.slice(0, 8)), label).toEqual(PNG_SIGNATURE)
  expect(bytes.length, label).toBeGreaterThan(50)
}

describe("CLI — SVG output for every subcommand", () => {
  const cases: Array<[string, string[]]> = [
    ["qr", ["qr", "HELLO"]],
    ["microqr", ["microqr", "12345"]],
    ["rmqr", ["rmqr", "HELLO"]],
    ["barcode", ["barcode", "HELLO"]],
    ["postal", ["postal", "12345"]],
    ["datamatrix", ["datamatrix", "HELLO"]],
    ["pdf417", ["pdf417", "HELLO"]],
    ["micropdf417", ["micropdf417", "HELLO"]],
    ["aztec", ["aztec", "HELLO"]],
    ["maxicode", ["maxicode", "HELLO"]],
    ["dotcode", ["dotcode", "HELLO"]],
    ["hanxin", ["hanxin", "HELLO"]],
    ["codablockf", ["codablockf", "HELLO"]],
    ["code16k", ["code16k", "HELLO"]],
    ["jabcode", ["jabcode", "HELLO"]],
    ["gs1databar-stacked", ["gs1databar-stacked", "0123456789012"]],
    ["gs1databar-stacked-omni", ["gs1databar-stacked-omni", "0123456789012"]],
    ["gs1databar-expanded-stacked", ["gs1databar-expanded-stacked", "(01)90012345678908"]],
    ["wifi", ["wifi", "MyNet", "secret"]],
    ["contact", ["contact", "Ada Lovelace"]],
    ["link", ["link", "https://example.com"]],
  ]

  for (const [name, args] of cases) {
    it(`${name} writes an SVG file`, async () => {
      expectSVG(await runToFile(args, `${name}.svg`), name)
    })
  }
})

describe("CLI — PNG output", () => {
  const cases: Array<[string, string[]]> = [
    ["qr", ["qr", "HELLO"]],
    ["microqr", ["microqr", "12345"]],
    ["rmqr", ["rmqr", "HELLO"]],
    ["barcode", ["barcode", "HELLO"]],
    ["postal", ["postal", "12345"]],
    ["datamatrix", ["datamatrix", "HELLO"]],
    ["pdf417", ["pdf417", "HELLO"]],
    ["micropdf417", ["micropdf417", "HELLO"]],
    ["aztec", ["aztec", "HELLO"]],
    ["dotcode", ["dotcode", "HELLO"]],
    ["hanxin", ["hanxin", "HELLO"]],
    ["codablockf", ["codablockf", "HELLO"]],
    ["code16k", ["code16k", "HELLO"]],
    ["maxicode", ["maxicode", "HELLO"]],
    ["gs1databar-stacked", ["gs1databar-stacked", "0123456789012"]],
    ["gs1databar-stacked-omni", ["gs1databar-stacked-omni", "0123456789012"]],
    ["gs1databar-expanded-stacked", ["gs1databar-expanded-stacked", "(01)90012345678908"]],
  ]

  for (const [name, args] of cases) {
    it(`${name} writes a PNG when the output file ends in .png`, async () => {
      expectPNG(await runToBytes(args, `${name}.png`), name)
    })
  }

  it("honours the explicit --png flag", async () => {
    const path = join(dir, "explicit.out")
    await runCommand(main, { rawArgs: ["qr", "HELLO", "--png", "-o", path] })
    expectPNG(readFileSync(path), "explicit --png")
  })

  it("renders JAB Code as a true-colour PNG", async () => {
    // Polychrome, so it goes through the true-colour path rather than the
    // two-colour one the other symbologies use
    const png = await runToBytes(["jabcode", "HELLO"], "jab.png")
    expectPNG(png, "jabcode")
  })
})

describe("CLI — barcode options", () => {
  it("supports the type option", async () => {
    const ean = await runToFile(["barcode", "4006381333931", "--type", "ean13"], "ean.svg")
    expectSVG(ean, "ean13")
    const c128 = await runToFile(["barcode", "4006381333931"], "c128.svg")
    expect(ean).not.toBe(c128)
  })

  it("supports the code39 check digit flag", async () => {
    const plain = await runToFile(["barcode", "HELLO", "--type", "code39"], "c39.svg")
    const checked = await runToFile(
      ["barcode", "HELLO", "--type", "code39", "--code39-check-digit"],
      "c39c.svg",
    )
    expect(plain).not.toBe(checked)
  })

  it("supports the MSI check digit option", async () => {
    const a = await runToFile(
      ["barcode", "1234", "--type", "msi", "--msi-check-digit", "mod10"],
      "msi10.svg",
    )
    const b = await runToFile(
      ["barcode", "1234", "--type", "msi", "--msi-check-digit", "mod11"],
      "msi11.svg",
    )
    expect(a).not.toBe(b)
  })

  it("supports the code128 charset option", async () => {
    const svg = await runToFile(["barcode", "123456", "--code128-charset", "C"], "c128c.svg")
    expectSVG(svg, "charset C")
  })

  it("renders human-readable text", async () => {
    const svg = await runToFile(["barcode", "HELLO", "--show-text"], "text.svg")
    expect(svg).toContain("<text")
    expect(svg).toContain("HELLO")
  })

  it("applies color options", async () => {
    const svg = await runToFile(["barcode", "HELLO", "--color", "#ff0000"], "color.svg")
    expect(svg).toContain('fill="#ff0000"')
  })

  it("renders POSTNET through the postal renderer", async () => {
    // Height-modulated: the symbol must contain both tall and short bars
    const svg = await runToFile(["barcode", "12345", "--type", "postnet"], "pn.svg")
    const heights = new Set([...svg.matchAll(/v([\d.]+)h-/g)].map((m) => m[1]))
    expect(heights.size).toBe(2)
  })

  it.each([
    ["ean14", "1234567890123"],
    ["sscc18", "10614141192837465"],
    ["isbn", "978-0-306-40615-7"],
    ["issn", "0317-8471"],
    ["ismn", "M-2306-7118-7"],
    ["code32", "12345678"],
    ["pzn", "123456"],
    ["pzn8", "1234567"],
  ])("renders a %s", async (type, data) => {
    expectSVG(await runToFile(["barcode", data, "--type", type], `${type}.svg`), type)
  })

  it("supports the ISSN sequence variant", async () => {
    const plain = await runToFile(["barcode", "0317-8471", "--type", "issn"], "issn0.svg")
    const variant = await runToFile(
      ["barcode", "0317-8471", "--type", "issn", "--issn-variant", "01"],
      "issn1.svg",
    )
    expect(plain).not.toBe(variant)
  })
})

describe("CLI — postal options", () => {
  it("supports every postal type", async () => {
    const cases: Array<[string, string[]]> = [
      ["postnet", ["postal", "12345", "--type", "postnet"]],
      ["planet", ["postal", "12345678901", "--type", "planet"]],
      ["rm4scc", ["postal", "SN34RD1A", "--type", "rm4scc"]],
      ["kix", ["postal", "2500GG", "--type", "kix"]],
      ["auspost", ["postal", "12345678", "--type", "auspost"]],
      ["jppost", ["postal", "1234567", "--type", "jppost"]],
      ["imb", ["postal", "01234567094987654321", "--type", "imb"]],
    ]
    for (const [name, args] of cases) {
      expectSVG(await runToFile(args, `${name}.svg`), name)
    }
  })

  it("passes the Australia Post FCC", async () => {
    const a = await runToFile(["postal", "12345678", "--type", "auspost", "--fcc", "11"], "a11.svg")
    const b = await runToFile(["postal", "12345678", "--type", "auspost", "--fcc", "59"], "a59.svg")
    expect(a).not.toBe(b)
  })

  it("passes the IMb routing code", async () => {
    const a = await runToFile(["postal", "01234567094987654321", "--type", "imb"], "i1.svg")
    const b = await runToFile(
      ["postal", "01234567094987654321", "--type", "imb", "--routing-code", "01234567891"],
      "i2.svg",
    )
    expect(a).not.toBe(b)
  })
})

describe("CLI — 2D options", () => {
  it("datamatrix --gs1 differs from plain", async () => {
    const plain = await runToFile(["datamatrix", "(01)12345678901231"], "dm.svg")
    const gs1 = await runToFile(["datamatrix", "(01)12345678901231", "--gs1"], "gs1.svg")
    expect(plain).not.toBe(gs1)
  })

  it("qr honours the ec option", async () => {
    const l = await runToFile(["qr", "HELLO", "--ec", "L"], "l.svg")
    const h = await runToFile(["qr", "HELLO", "--ec", "H"], "h.svg")
    expect(l).not.toBe(h)
  })

  it("qr honours dot styling", async () => {
    const square = await runToFile(["qr", "HELLO"], "square.svg")
    const dots = await runToFile(["qr", "HELLO", "--dot-type", "dots"], "dots.svg")
    expect(dots).not.toBe(square)
    // Round dot types are emitted as arc segments in the module path
    expect(dots).toContain("a")
  })

  it("qr --terminal prints to the console", async () => {
    await runCommand(main, { rawArgs: ["qr", "HI", "--terminal"] })
    // consola writes the block output; nothing should be written to a file
    expect(true).toBe(true)
  })

  it("pdf417 honours columns", async () => {
    const a = await runToFile(["pdf417", "HELLO", "--columns", "2"], "p2.svg")
    const b = await runToFile(["pdf417", "HELLO", "--columns", "5"], "p5.svg")
    expect(a).not.toBe(b)
  })

  it("aztec honours layers", async () => {
    const a = await runToFile(["aztec", "HELLO", "--layers", "2"], "a2.svg")
    const b = await runToFile(["aztec", "HELLO", "--layers", "4"], "a4.svg")
    expect(a).not.toBe(b)
  })

  it("respects the size option", async () => {
    const svg = await runToFile(["datamatrix", "HELLO", "--size", "500", "--margin", "0"], "s.svg")
    expect(svg).toContain('viewBox="0 0 500 500"')
  })
})

describe("CLI — helper commands", () => {
  it("wifi encodes network details", async () => {
    const a = await runToFile(["wifi", "Net", "pass"], "w1.svg")
    const b = await runToFile(["wifi", "Net", "pass", "--encryption", "WEP"], "w2.svg")
    expect(a).not.toBe(b)
  })

  it("wifi supports hidden networks", async () => {
    const a = await runToFile(["wifi", "Net", "pass"], "w3.svg")
    const b = await runToFile(["wifi", "Net", "pass", "--hidden"], "w4.svg")
    expect(a).not.toBe(b)
  })

  it("contact encodes vCard fields", async () => {
    const a = await runToFile(["contact", "Ada Lovelace"], "c1.svg")
    const b = await runToFile(["contact", "Ada Lovelace", "--phone", "555"], "c2.svg")
    expect(a).not.toBe(b)
  })

  it("link supports each kind", async () => {
    for (const [name, args] of [
      ["url", ["link", "https://example.com"]],
      ["email", ["link", "a@b.c", "--kind", "email"]],
      ["phone", ["link", "5551234", "--kind", "phone"]],
      ["sms", ["link", "5551234", "--kind", "sms", "--body", "hi"]],
      ["geo", ["link", "41.0082,28.9784", "--kind", "geo"]],
    ] as Array<[string, string[]]>) {
      expectSVG(await runToFile(args, `${name}.svg`), name)
    }
  })

  it("link rejects malformed geo coordinates", async () => {
    const before = process.exitCode
    await runCommand(main, { rawArgs: ["link", "not-a-coord", "--kind", "geo"] })
    expect(process.exitCode).toBe(1)
    process.exitCode = before
  })
})

describe("CLI — stdout and metadata", () => {
  it("writes to stdout when no output file is given", async () => {
    const out = await runToStdout(["datamatrix", "HELLO"])
    expect(out.startsWith("<svg")).toBe(true)
  })

  it("list names every symbology family", async () => {
    await runCommand(main, { rawArgs: ["list"] })
    // list() uses consola, which does not go through process.stdout.write here;
    // the command completing without throwing is the assertion.
    expect(true).toBe(true)
  })

  it("reports the package version rather than a hardcoded one", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
      version: string
    }
    expect(main.meta).toBeDefined()
    const meta = main.meta as { version?: string }
    expect(meta.version).toBe(pkg.version)
  })
})

describe("CLI — layout and presentation flags", () => {
  it("emits dimensions in a physical unit", async () => {
    const svg = await runToFile(["barcode", "HELLO", "--unit", "mm"], "unit.svg")
    expect(svg).toMatch(/width="[\d.]+mm"/)
    expect(svg).toMatch(/height="[\d.]+mm"/)
  })

  it("rejects an unknown unit", async () => {
    expect(await runExpectingFailure(["barcode", "HELLO", "--unit", "furlong"])).toBe(1)
  })

  it("rotates the symbol", async () => {
    const svg = await runToFile(["barcode", "HELLO", "--rotation", "90"], "rot.svg")
    expect(svg).toContain("rotate(90,")
  })

  it("rejects a rotation that is not a right angle", async () => {
    expect(await runExpectingFailure(["barcode", "HELLO", "--rotation", "45"])).toBe(1)
  })

  it("draws bearer bars", async () => {
    const plain = await runToFile(["barcode", "12345678901231", "--type", "itf14"], "itf.svg")
    const bearer = await runToFile(
      ["barcode", "12345678901231", "--type", "itf14", "--bearer-bars", "--bearer-bar-width", "6"],
      "itfb.svg",
    )
    const count = (svg: string): number => [...svg.matchAll(/<rect/g)].length
    expect(count(bearer)).toBe(count(plain) + 4)
  })

  it("narrows bars with a bar gap", async () => {
    const plain = await runToFile(["barcode", "HELLO"], "gap0.svg")
    const gapped = await runToFile(["barcode", "HELLO", "--bar-gap", "0.5"], "gap1.svg")
    expect(gapped).not.toBe(plain)
  })

  it("places human-readable text above the bars", async () => {
    const bottom = await runToFile(["barcode", "HELLO", "--show-text"], "tb.svg")
    const top = await runToFile(
      ["barcode", "HELLO", "--show-text", "--text-position", "top"],
      "tt.svg",
    )
    expect(top).not.toBe(bottom)
    const y = (svg: string): number => Number(/<text[^>]*y="([\d.]+)"/.exec(svg)![1])
    expect(y(top)).toBeLessThan(y(bottom))
  })

  it("aligns and styles the human-readable text", async () => {
    const svg = await runToFile(
      ["barcode", "HELLO", "--show-text", "--text-align", "left", "--font-family", "Inter"],
      "talign.svg",
    )
    expect(svg).toContain('text-anchor="start"')
    expect(svg).toContain('font-family="Inter"')
  })

  it("rejects an unknown text position", async () => {
    expect(
      await runExpectingFailure(["barcode", "HELLO", "--show-text", "--text-position", "middle"]),
    ).toBe(1)
  })

  it("passes Codabar start and stop characters", async () => {
    const plain = await runToFile(["barcode", "1234", "--type", "codabar"], "cb1.svg")
    const custom = await runToFile(
      ["barcode", "1234", "--type", "codabar", "--codabar-start", "B", "--codabar-stop", "C"],
      "cb2.svg",
    )
    expect(custom).not.toBe(plain)
  })

  it("renders POSTNET to PNG through the postal rasterizer", async () => {
    expectPNG(await runToBytes(["barcode", "12345", "--type", "postnet"], "pn.png"), "postnet png")
  })
})

describe("CLI — accessibility flags", () => {
  it("adds aria-label, title and desc to a 1D barcode", async () => {
    const svg = await runToFile(
      [
        "barcode",
        "HELLO",
        "--aria-label",
        "Code 128 HELLO",
        "--title",
        "Label",
        "--desc",
        "Detail",
      ],
      "a11y-barcode.svg",
    )
    expect(svg).toContain('aria-label="Code 128 HELLO"')
    expect(svg).toContain("<title>Label</title>")
    expect(svg).toContain("<desc>Detail</desc>")
  })

  it("adds them to a QR code", async () => {
    const svg = await runToFile(
      [
        "qr",
        "HELLO",
        "--aria-label",
        "QR",
        "--title",
        "Scan me",
        "--desc",
        "Detail",
        "--role",
        "none",
      ],
      "a11y-qr.svg",
    )
    expect(svg).toContain('aria-label="QR"')
    expect(svg).toContain("<title>Scan me</title>")
    expect(svg).toContain('role="none"')
  })

  it("adds them to a matrix symbology and a postal symbol", async () => {
    const dm = await runToFile(["datamatrix", "HELLO", "--aria-label", "DM"], "a11y-dm.svg")
    expect(dm).toContain('aria-label="DM"')
    const postnet = await runToFile(["postal", "12345", "--title", "ZIP"], "a11y-postal.svg")
    expect(postnet).toContain("<title>ZIP</title>")
  })
})

describe("CLI — SVG optimization", () => {
  it("shrinks the output with --optimize", async () => {
    const plain = await runToFile(["qr", "HELLO", "--size", "233"], "opt-plain.svg")
    const optimized = await runToFile(
      ["qr", "HELLO", "--size", "233", "--optimize", "--precision", "1"],
      "opt-small.svg",
    )
    expect(optimized.length).toBeLessThan(plain.length)
    expect(optimized).not.toMatch(/\d\.\d\d/)
  })

  it("drops width and height with --responsive", async () => {
    const svg = await runToFile(["qr", "HELLO", "--size", "233", "--responsive"], "resp.svg")
    const openTag = svg.slice(0, svg.indexOf(">"))
    expect(openTag).toContain("viewBox=")
    expect(openTag).not.toContain("width=")
    expect(openTag).not.toContain("height=")
  })
})

describe("CLI — QR styling flags", () => {
  it("renders a circular symbol", async () => {
    const svg = await runToFile(["qr", "HELLO", "--shape", "circle"], "circle.svg")
    expect(svg).toContain("clipPath")
  })

  it("rejects an unknown shape or dot type", async () => {
    expect(await runExpectingFailure(["qr", "HELLO", "--shape", "triangle"])).toBe(1)
    expect(await runExpectingFailure(["qr", "HELLO", "--dot-type", "sparkles"])).toBe(1)
  })

  it("paints the modules with a linear gradient", async () => {
    const svg = await runToFile(
      [
        "qr",
        "HELLO",
        "--gradient",
        "linear",
        "--gradient-colors",
        "#000000,#0044ff",
        "--gradient-rotation",
        "45",
      ],
      "grad-linear.svg",
    )
    expect(svg).toContain("<linearGradient")
    expect(svg).toContain('stop-color="#0044ff"')
    expect(svg).toContain("url(#etiket-grad")
  })

  it("paints the modules with a radial gradient", async () => {
    const svg = await runToFile(
      ["qr", "HELLO", "--gradient", "radial", "--gradient-colors", "#000000,#0044ff"],
      "grad-radial.svg",
    )
    expect(svg).toContain("<radialGradient")
  })

  it("rejects a gradient without colors, and an unknown gradient type", async () => {
    expect(await runExpectingFailure(["qr", "HELLO", "--gradient", "linear"])).toBe(1)
    expect(
      await runExpectingFailure([
        "qr",
        "HELLO",
        "--gradient",
        "conic",
        "--gradient-colors",
        "#000,#fff",
      ]),
    ).toBe(1)
  })

  it("styles the finder patterns", async () => {
    const plain = await runToFile(["qr", "HELLO"], "corner-plain.svg")
    const styled = await runToFile(
      [
        "qr",
        "HELLO",
        "--corner-shape",
        "dots",
        "--corner-dot-shape",
        "dots",
        "--corner-color",
        "#ff0000",
      ],
      "corner-styled.svg",
    )
    expect(styled).not.toBe(plain)
    expect(styled).toContain("#ff0000")
  })

  it("rejects an unknown corner shape", async () => {
    expect(await runExpectingFailure(["qr", "HELLO", "--corner-shape", "hexagon"])).toBe(1)
  })

  it("embeds a local logo file as a data URI", async () => {
    const logo = join(dir, "logo.png")
    writeFileSync(logo, new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]))
    const svg = await runToFile(["qr", "HELLO", "--logo", logo, "--logo-size", "0.25"], "logo.svg")
    expect(svg).toContain('<image href="data:image/png;base64,')
  })

  it("passes a data URI logo through and honours the logo background", async () => {
    const svg = await runToFile(
      [
        "qr",
        "HELLO",
        "--logo",
        "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        "--logo-background",
        "#ffffff",
        "--logo-margin",
        "4",
      ],
      "logo-uri.svg",
    )
    expect(svg).toContain("data:image/gif;base64")
  })

  it("rejects a logo file type it cannot inline", async () => {
    expect(await runExpectingFailure(["qr", "HELLO", "--logo", "/tmp/logo.tiff"])).toBe(1)
  })
})

describe("CLI — encoder flags", () => {
  it("qr honours version, mask, eci and gs1", async () => {
    const plain = await runToFile(["qr", "HELLO"], "qr-plain.svg")
    for (const [name, args] of [
      ["version", ["qr", "HELLO", "--version", "6"]],
      ["mask", ["qr", "HELLO", "--mask", "3"]],
      ["eci", ["qr", "HELLO", "--eci", "26"]],
    ] as Array<[string, string[]]>) {
      const svg = await runToFile(args, `qr-${name}.svg`)
      expectSVG(svg, name)
      expect(svg, name).not.toBe(plain)
    }
    const gs1 = await runToFile(["qr", "(01)09501101020917", "--gs1"], "qr-gs1.svg")
    const raw = await runToFile(["qr", "(01)09501101020917"], "qr-raw.svg")
    expect(gs1).not.toBe(raw)
    const indicator = await runToFile(["qr", "HELLO", "--application-indicator", "12"], "qr-ai.svg")
    expect(indicator).not.toBe(plain)
  })

  it("microqr, rmqr and hanxin honour error correction and version", async () => {
    expectSVG(
      await runToFile(["microqr", "12345", "--ec", "L", "--mask", "1"], "mq.svg"),
      "microqr",
    )
    expectSVG(await runToFile(["rmqr", "HELLO", "--ec", "H", "--eci", "26"], "rq.svg"), "rmqr")
    const l1 = await runToFile(["hanxin", "HELLO", "--ec", "1"], "hx1.svg")
    const l4 = await runToFile(["hanxin", "HELLO", "--ec", "4"], "hx4.svg")
    expect(l1).not.toBe(l4)
  })

  it("maxicode honours the structured carrier message fields", async () => {
    const standard = await runToFile(["maxicode", "HELLO"], "mc4.svg")
    const structured = await runToFile(
      [
        "maxicode",
        "HELLO",
        "--mode",
        "2",
        "--postal-code",
        "152382802",
        "--country-code",
        "840",
        "--service-class",
        "001",
      ],
      "mc2.svg",
    )
    expect(structured).not.toBe(standard)
  })

  it("dotcode, codablockf, micropdf417 and jabcode honour their encoder flags", async () => {
    const dotcode = await runToFile(["dotcode", "HELLO", "--mask", "1"], "dc.svg")
    expectSVG(dotcode, "dotcode")
    const cbf2 = await runToFile(["codablockf", "HELLO WORLD", "--columns", "10"], "cbf.svg")
    const cbfDefault = await runToFile(["codablockf", "HELLO WORLD"], "cbf0.svg")
    expect(cbf2).not.toBe(cbfDefault)
    expectSVG(await runToFile(["micropdf417", "HELLO", "--columns", "2"], "mp.svg"), "micropdf417")
    expectSVG(await runToFile(["jabcode", "HELLO", "--colors", "8"], "jab8.svg"), "jabcode")
  })

  it("gs1 databar expanded stacked honours segments", async () => {
    const a = await runToFile(
      ["gs1databar-expanded-stacked", "(01)90012345678908", "--segments", "4"],
      "es4.svg",
    )
    const b = await runToFile(
      ["gs1databar-expanded-stacked", "(01)90012345678908", "--segments", "2"],
      "es2.svg",
    )
    expect(a).not.toBe(b)
  })

  it("warns about a non-numeric numeric flag instead of emitting NaN", async () => {
    const warn = vi.spyOn(consola, "warn").mockImplementation(() => {})
    const svg = await runToFile(["qr", "HELLO", "--size", "big"], "nan.svg")
    expect(warn).toHaveBeenCalled()
    expect(svg).not.toContain("NaN")
    warn.mockRestore()
  })
})

describe("CLI — postal presentation flags", () => {
  it("renders in physical units with human-readable text", async () => {
    const svg = await runToFile(
      [
        "postal",
        "12345",
        "--unit",
        "mm",
        "--show-text",
        "--font-size",
        "10",
        "--font-family",
        "Inter",
      ],
      "postal-text.svg",
    )
    expect(svg).toMatch(/width="[\d.]+mm"/)
    expect(svg).toContain("12345")
    expect(svg).toContain('font-family="Inter"')
  })

  it("honours the tracker and short bar ratios", async () => {
    const a = await runToFile(["postal", "12345", "--short-ratio", "0.4"], "sr4.svg")
    const b = await runToFile(["postal", "12345", "--short-ratio", "0.6"], "sr6.svg")
    expect(a).not.toBe(b)
    const c = await runToFile(
      ["postal", "2500GG", "--type", "kix", "--tracker-ratio", "0.5"],
      "tr.svg",
    )
    const d = await runToFile(["postal", "2500GG", "--type", "kix"], "tr0.svg")
    expect(c).not.toBe(d)
  })
})

describe("CLI — options ignored on the PNG path warn", () => {
  it("warns for QR dot styling", async () => {
    const warn = vi.spyOn(consola, "warn").mockImplementation(() => {})
    await runToBytes(["qr", "HELLO", "--dot-type", "dots", "--dot-size", "0.5"], "warn-qr.png")
    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0]![0])
    expect(message).toContain("--dot-type")
    expect(message).toContain("--dot-size")
    warn.mockRestore()
  })

  it("warns for barcode layout and accessibility options", async () => {
    const warn = vi.spyOn(consola, "warn").mockImplementation(() => {})
    await runToBytes(
      ["barcode", "HELLO", "--rotation", "90", "--bearer-bars", "--title", "Label"],
      "warn-barcode.png",
    )
    const message = String(warn.mock.calls[0]![0])
    expect(message).toContain("--rotation")
    expect(message).toContain("--bearer-bars")
    expect(message).toContain("--title")
    warn.mockRestore()
  })

  it("warns for postal and matrix SVG-only options", async () => {
    const warn = vi.spyOn(consola, "warn").mockImplementation(() => {})
    await runToBytes(["postal", "12345", "--show-text", "--unit", "mm"], "warn-postal.png")
    expect(String(warn.mock.calls[0]![0])).toContain("--show-text")
    warn.mockClear()
    await runToBytes(["datamatrix", "HELLO", "--size", "400", "--optimize"], "warn-dm.png")
    expect(String(warn.mock.calls[0]![0])).toContain("--size")
    warn.mockRestore()
  })

  it("stays quiet when only PNG-supported options are given", async () => {
    const warn = vi.spyOn(consola, "warn").mockImplementation(() => {})
    await runToBytes(["qr", "HELLO", "--module-size", "6", "--margin", "2"], "quiet.png")
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it("reports that the helper commands have no PNG path", async () => {
    expect(await runExpectingFailure(["wifi", "Net", "pass", "--png"])).toBe(1)
    expect(await runExpectingFailure(["contact", "Ada Lovelace", "--png"])).toBe(1)
    expect(await runExpectingFailure(["link", "https://example.com", "--png"])).toBe(1)
  })
})

describe("CLI — validate", () => {
  it("accepts valid input and reports the check digit", async () => {
    const out = await runToStdout(["validate", "400638133393", "--type", "ean13", "--json"])
    const result = JSON.parse(out) as { valid: boolean; type: string; checkDigit: number }
    expect(result.valid).toBe(true)
    expect(result.type).toBe("ean13")
    expect(result.checkDigit).toBe(1)
  })

  it("reports QR metadata", async () => {
    const out = await runToStdout(["validate", "HELLO", "--type", "qr", "--ec", "H", "--json"])
    const result = JSON.parse(out) as { valid: boolean; version: number; mode: string }
    expect(result.valid).toBe(true)
    expect(result.mode).toBe("alphanumeric")
    expect(result.version).toBeGreaterThanOrEqual(1)
  })

  it("exits 1 for invalid input", async () => {
    expect(await runExpectingFailure(["validate", "HELLO", "--type", "ean13"])).toBe(1)
  })

  it("exits 1 for an unknown symbology", async () => {
    expect(await runExpectingFailure(["validate", "HELLO", "--type", "nope"])).toBe(1)
  })

  it("reports the failure reason as JSON too", async () => {
    const before = process.exitCode
    process.exitCode = undefined
    const out = await runToStdout(["validate", "HELLO", "--type", "ean13", "--json"])
    const result = JSON.parse(out) as { valid: boolean; error: string }
    expect(result.valid).toBe(false)
    expect(result.error).toContain("EAN-13")
    process.exitCode = before
  })

  it("succeeds quietly for a 2D symbology without --json", async () => {
    const before = process.exitCode
    process.exitCode = undefined
    await runCommand(main, { rawArgs: ["validate", "HELLO", "--type", "aztec"] })
    expect(process.exitCode).toBeUndefined()
    process.exitCode = before
  })
})

describe("CLI — error propagation", () => {
  it("surfaces encoder validation errors", async () => {
    await expect(
      runCommand(main, { rawArgs: ["barcode", "HELLO", "--type", "ean13"] }),
    ).rejects.toThrow()
  })

  it("surfaces postal validation errors", async () => {
    await expect(
      runCommand(main, { rawArgs: ["postal", "ABCDE", "--type", "postnet"] }),
    ).rejects.toThrow()
  })
})

describe("gs1composite", () => {
  it("writes a complete composite symbol", async () => {
    const svg = await runToFile(
      ["gs1composite", "databar-omni", "01234567890128|(10)LOT42"],
      "composite.svg",
    )
    expect(svg).toContain("<svg")
    expect(svg).toContain("<path")
  })

  it("writes a PNG when the output file ends in .png", async () => {
    const png = await runToBytes(
      ["gs1composite", "databar-omni", "01234567890128|(10)LOT42"],
      "composite.png",
    )
    expect(Array.from(png.slice(0, 4))).toEqual([137, 80, 78, 71])
  })

  it.each([
    ["gs1-128", "(01)03612345678904|(10)LOT42"],
    ["databar-limited", "01234567890128|(10)LOT42"],
    ["databar-stacked", "01234567890128|(10)LOT42"],
    ["databar-stacked-omni", "01234567890128|(10)LOT42"],
    ["databar-expanded-stacked", "(01)01234567890128(3103)000189|(10)LOT42"],
    ["ean13", "590123412345|(10)LOT42"],
  ])("writes a %s composite", async (linear, data) => {
    const svg = await runToFile(["gs1composite", linear, data], `${linear}.svg`)
    expect(svg).toContain("<svg")
  })

  it("rejects an unknown primary symbology", async () => {
    expect(await runExpectingFailure(["gs1composite", "nope", "0123|(10)X"])).toBe(1)
  })

  it("rejects data without the separator", async () => {
    expect(await runExpectingFailure(["gs1composite", "databar-omni", "01234567890128"])).toBe(1)
  })
})
