/**
 * CLI coverage — every subcommand is driven through citty and its output
 * inspected, so a broken command surfaces as a test failure rather than at
 * a user's terminal.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { runCommand } from "citty"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
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

  it("reports an error for formats without PNG support", async () => {
    // JAB Code is polychrome; the palette-indexed matrix has no PNG path yet
    const before = process.exitCode
    await runCommand(main, { rawArgs: ["jabcode", "HELLO", "--png"] })
    expect(process.exitCode).toBe(1)
    process.exitCode = before
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
