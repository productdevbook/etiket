/**
 * encodeQRSymbol and tryEncodeQRSymbol: the symbol with its metadata, minVersion,
 * boostEcc, empty input, lone surrogates, and the reference fixtures.
 */

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { readBarcodes } from "zxing-wasm/reader"
import { encodeQR, encodeQRCore } from "../src/encoders/qr/index"
import { encodeQRSymbol, tryEncodeQRSymbol } from "../src/encoders/qr/symbol"
import * as qrEntry from "../src/qr"
import { CapacityError, InvalidInputError } from "../src/errors"
import { payload, type Kind } from "./_qr-reference-payload"

const SRC = new URL("../src/", import.meta.url)

function toImage(matrix: boolean[][], scale = 6): ImageData {
  const size = matrix.length + 8
  const width = size * scale
  const data = new Uint8ClampedArray(width * width * 4).fill(255)
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      if (!matrix[y]![x]) continue
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + 4) * scale + dy) * width + (x + 4) * scale + dx) * 4
          data[i] = data[i + 1] = data[i + 2] = 0
        }
      }
    }
  }
  return { data, width, height: width } as ImageData
}

async function decodedBytes(matrix: boolean[][]): Promise<number[] | null> {
  const results = await readBarcodes(toImage(matrix), { formats: ["QRCode"], tryHarder: true })
  return results.length > 0 ? [...results[0]!.bytes] : null
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

const flat = (modules: boolean[][]) =>
  modules.map((r) => r.map((b) => (b ? 1 : 0)).join("")).join("")

describe("encodeQRSymbol", () => {
  it("returns the version, level, mask and size of the symbol it drew", () => {
    const symbol = encodeQRSymbol("HELLO WORLD", { ecLevel: "Q", mask: 5 })
    expect(symbol).toMatchObject({ version: 1, ecLevel: "Q", mask: 5, size: 21 })
    expect(symbol.modules).toHaveLength(21)
    expect(symbol.modules[0]).toHaveLength(21)
    expect(symbol.modules).toEqual(encodeQRCore("HELLO WORLD", { ecLevel: "Q", mask: 5 }))
  })

  it("reports the mask it chose when none is given", () => {
    const { mask, modules } = encodeQRSymbol("https://example.com/invite/ABC-2026")
    expect(mask).toBeGreaterThanOrEqual(0)
    expect(mask).toBeLessThanOrEqual(7)
    expect(modules).toEqual(
      encodeQRCore("https://example.com/invite/ABC-2026", { mask: mask as 0 }),
    )
  })

  it("sizes the matrix at 4 * version + 17 and a reader takes the data back", async () => {
    const text = payload("byte", 700)
    const symbol = encodeQRSymbol(text, { ecLevel: "L" })
    expect(symbol.version).toBeGreaterThan(20)
    expect(symbol.size).toBe(symbol.version * 4 + 17)
    expect(symbol.modules).toHaveLength(symbol.size)
    expect(await decodedBytes(symbol.modules)).toEqual([...new TextEncoder().encode(text)])
  })

  it.each(["kanji", "gs1", "applicationIndicator", "structuredAppend"])(
    "refuses the %s option it leaves out, rather than drawing a different symbol",
    (key) => {
      const options = { [key]: undefined } as never
      expect(() => encodeQRSymbol("HELLO", options)).toThrow(InvalidInputError)
      expect(() => tryEncodeQRSymbol("HELLO", options)).toThrow(InvalidInputError)
    },
  )

  it("is exported from the QR entry", () => {
    expect(qrEntry.encodeQRSymbol).toBe(encodeQRSymbol)
    expect(qrEntry.tryEncodeQRSymbol).toBe(tryEncodeQRSymbol)
  })
})

describe("option: minVersion", () => {
  it("takes the smallest version at or above it that fits", () => {
    expect(encodeQRSymbol("HELLO").version).toBe(1)
    expect(encodeQRSymbol("HELLO", { minVersion: 1 }).version).toBe(1)
    expect(encodeQRSymbol("HELLO", { minVersion: 7 }).version).toBe(7)
    expect(encodeQRSymbol("HELLO", { minVersion: 40 }).version).toBe(40)
  })

  it("does not shrink below what the data needs", () => {
    const needed = encodeQRSymbol(payload("byte", 400), { ecLevel: "M" }).version
    expect(needed).toBeGreaterThan(10)
    expect(encodeQRSymbol(payload("byte", 400), { ecLevel: "M", minVersion: 5 }).version).toBe(
      needed,
    )
  })

  it("moves up to a version the data fits when the minimum is already big enough", () => {
    const symbol = encodeQRSymbol(payload("numeric", 2000), { ecLevel: "L", minVersion: 30 })
    expect(symbol.version).toBe(30)
  })

  it("is answered by null when nothing from there up fits", () => {
    const text = payload("byte", 1000)
    expect(tryEncodeQRSymbol(text, { ecLevel: "H", minVersion: 1 })).toBeNull()
    expect(tryEncodeQRSymbol(text, { ecLevel: "L", minVersion: 40 })).not.toBeNull()
  })

  it.each([0, 41, 1.5, Number.NaN])("rejects %s", (minVersion) => {
    expect(() => encodeQRSymbol("A", { minVersion })).toThrow(InvalidInputError)
    expect(() => tryEncodeQRSymbol("A", { minVersion })).toThrow(InvalidInputError)
  })

  it("rejects a minimum above a fixed version, and accepts the two together when they agree", () => {
    expect(() => encodeQRSymbol("A", { version: 3, minVersion: 4 })).toThrow(/minVersion 4/)
    expect(encodeQRSymbol("A", { version: 4, minVersion: 4 }).version).toBe(4)
  })

  it("reaches encodeQRCore and encodeQR too", () => {
    expect(encodeQRCore("A", { minVersion: 4 })).toHaveLength(33)
    expect(encodeQR("A", { minVersion: 4 })).toHaveLength(33)
  })
})

describe("option: boostEcc", () => {
  it("raises the level as far as the data fits without growing the symbol", () => {
    const plain = encodeQRSymbol("hello", { ecLevel: "L" })
    const boosted = encodeQRSymbol("hello", { ecLevel: "L", boostEcc: true })
    expect(plain.ecLevel).toBe("L")
    expect(boosted.ecLevel).toBe("H")
    expect(boosted.version).toBe(plain.version)
    expect(boosted.modules).not.toEqual(plain.modules)
  })

  it("stops at the highest level that still fits the chosen version", () => {
    // Version 1 holds 17 bytes at L, 14 at M and 11 at Q: 12 bytes boost L to M and no further
    const text = "x".repeat(12)
    const boosted = encodeQRSymbol(text, { ecLevel: "L", mode: "byte", boostEcc: true })
    expect(boosted.version).toBe(1)
    expect(boosted.ecLevel).toBe("M")
  })

  it("never grows the symbol: data that needs the whole version stays at the level given", () => {
    const text = "x".repeat(14)
    const boosted = encodeQRSymbol(text, { ecLevel: "M", mode: "byte", boostEcc: true })
    expect(boosted).toMatchObject({ version: 1, ecLevel: "M" })
  })

  it("keeps the level given when it is not set", () => {
    expect(encodeQRSymbol("hello", { ecLevel: "L", boostEcc: false }).ecLevel).toBe("L")
    expect(encodeQRSymbol("hello", { ecLevel: "L" }).ecLevel).toBe("L")
  })

  it("boosts inside a fixed version, and a minVersion raises the room it has", () => {
    expect(encodeQRSymbol("hello", { ecLevel: "L", version: 5, boostEcc: true })).toMatchObject({
      version: 5,
      ecLevel: "H",
    })
    expect(encodeQRSymbol("hello", { ecLevel: "L", minVersion: 5, boostEcc: true })).toMatchObject({
      version: 5,
      ecLevel: "H",
    })
  })

  it("draws the symbol a caller would get by asking for the boosted level", () => {
    const boosted = encodeQRSymbol("hello", { ecLevel: "L", boostEcc: true })
    expect(boosted.modules).toEqual(encodeQRCore("hello", { ecLevel: boosted.ecLevel }))
  })

  it("is still a scannable symbol", async () => {
    const text = "https://example.com/boost"
    const { modules } = encodeQRSymbol(text, { ecLevel: "L", boostEcc: true })
    expect(await decodedBytes(modules)).toEqual([...new TextEncoder().encode(text)])
  })
})

describe("empty input", () => {
  it("is a byte segment of length 0 at version 1", () => {
    for (const ecLevel of ["L", "M", "Q", "H"] as const) {
      expect(encodeQRSymbol("", { ecLevel })).toMatchObject({ version: 1, ecLevel, size: 21 })
    }
  })

  it("carries the mode indicator 0100 and a zero count in the data area", () => {
    const { modules } = encodeQRSymbol("", { ecLevel: "L", mask: 0 })
    const other = encodeQRSymbol("a", { ecLevel: "L", mask: 0 }).modules
    expect(flat(modules)).not.toBe(flat(other))
    expect(modules).toEqual(encodeQRCore("", { ecLevel: "L", mask: 0 }))
  })

  it("is accepted by encodeQRCore and boosted like any other payload", () => {
    expect(encodeQRCore("")).toHaveLength(21)
    expect(encodeQRSymbol("", { ecLevel: "L", boostEcc: true }).ecLevel).toBe("H")
  })

  it("ignores a forced mode that has no characters to apply to", () => {
    expect(encodeQRSymbol("", { mode: "numeric" }).modules).toEqual(encodeQRSymbol("").modules)
  })

  it("leaves encodeQR, which carries the kanji table, refusing it", () => {
    expect(() => encodeQR("")).toThrow(InvalidInputError)
    expect(() => encodeQR("")).toThrow(/must not be empty/)
  })

  it("leaves the barcode wrappers refusing it", async () => {
    const { qrcode, barcode } = await import("../src/index")
    expect(() => qrcode("")).toThrow(InvalidInputError)
    expect(() => barcode("", { type: "code39" })).toThrow(InvalidInputError)
  })
})

describe("tryEncodeQRSymbol", () => {
  it("returns the same symbol encodeQRSymbol does", () => {
    expect(tryEncodeQRSymbol("HELLO", { ecLevel: "H" })).toEqual(
      encodeQRSymbol("HELLO", { ecLevel: "H" }),
    )
  })

  it("returns null where encodeQRSymbol throws CapacityError", () => {
    const text = "A".repeat(8000)
    expect(() => encodeQRSymbol(text)).toThrow(CapacityError)
    expect(tryEncodeQRSymbol(text)).toBeNull()
  })

  it("returns null for data just past the last version, and a symbol for data just inside it", () => {
    const inside = payload("numeric", 7089)
    expect(tryEncodeQRSymbol(inside, { ecLevel: "L" })?.version).toBe(40)
    expect(tryEncodeQRSymbol(payload("numeric", 7090), { ecLevel: "L" })).toBeNull()
  })

  it("returns null when a fixed version is too small", () => {
    expect(() => encodeQRSymbol("A".repeat(100), { version: 1 })).toThrow(CapacityError)
    expect(tryEncodeQRSymbol("A".repeat(100), { version: 1 })).toBeNull()
  })

  it("still throws for what is wrong with the options, not the data", () => {
    expect(() => tryEncodeQRSymbol("A", { version: 41 })).toThrow(InvalidInputError)
    expect(() => tryEncodeQRSymbol("A", { eci: -1 })).toThrow(InvalidInputError)
  })
})

describe("lone surrogates", () => {
  it.each(["\ud800", "a\udc00b", "\udbff\ud800", "x\ud83d"])(
    "are written as U+FFFD, as TextEncoder does: %j",
    async (text) => {
      const replaced = text.replaceAll(/[\ud800-\udfff]/g, "�")
      const { modules } = encodeQRSymbol(text, { mode: "byte" })
      expect(modules).toEqual(encodeQRSymbol(replaced, { mode: "byte" }).modules)
      expect(await decodedBytes(modules)).toEqual([...new TextEncoder().encode(replaced)])
    },
  )

  it("leave a well-formed pair alone", async () => {
    const { modules } = encodeQRSymbol("a😀b")
    expect(await decodedBytes(modules)).toEqual([...new TextEncoder().encode("a😀b")])
  })

  it("are accepted by encodeQRCore too", () => {
    expect(encodeQRCore("\ud800")).toEqual(encodeQRCore("�"))
  })
})

describe("the narrow QR path", () => {
  it("reaches no module that imports the kanji table, GS1, Micro QR, rMQR or Structured Append", () => {
    const seen = new Set<string>()
    const walk = (file: URL) => {
      if (seen.has(file.href)) return
      seen.add(file.href)
      const source = readFileSync(fileURLToPath(file), "utf8")
      const imports = /^\s*(?:import|export)(\s+type)?\b[^"']*?from\s+["'](\.[^"']+)["']/gm
      for (const [, typeOnly, spec] of source.matchAll(imports)) {
        if (typeOnly) continue
        walk(new URL(`${spec}.ts`, file))
      }
    }
    walk(new URL("encoders/qr/symbol.ts", SRC))

    const reached = [...seen].map((href) => href.slice(SRC.href.length))
    expect(reached).toContain("encoders/qr/data.ts")
    for (const left of [
      "encoders/qr/kanji.ts",
      "encoders/qr/gs1.ts",
      "encoders/gs1-128.ts",
      "encoders/qr/micro.ts",
      "encoders/rmqr.ts",
      "encoders/qr/index.ts",
    ]) {
      expect(reached).not.toContain(left)
    }
  })
})

interface Fixture {
  kind: Kind
  length: number
  ecLevel: "L" | "M" | "Q" | "H"
  mask?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  minVersion?: number
  boost: boolean
  version: number
  resultEcLevel: "L" | "M" | "Q" | "H"
  resultMask: number
  sha256: string
}

// Produced by Nayuki's QR Code generator, an encoder that shares nothing with this one:
// each row is the version, level and mask it picked and the SHA-256 of its matrix as
// rows of 0 and 1, for the payload `payload(kind, length)` in the one segment `kind`.
// Rows with no `mask` leave the choice to the encoder, so the mask is pinned too.
const fixtures: Fixture[] = JSON.parse(
  readFileSync(fileURLToPath(new URL("_qr-reference-fixtures.json", import.meta.url)), "utf8"),
)

describe("against an independent encoder", () => {
  it("covers every version, level, mode, mask and both boost settings", () => {
    expect(new Set(fixtures.map((f) => f.version)).size).toBeGreaterThanOrEqual(38)
    expect(new Set(fixtures.map((f) => f.ecLevel))).toEqual(new Set(["L", "M", "Q", "H"]))
    expect(new Set(fixtures.map((f) => f.kind))).toEqual(
      new Set(["numeric", "alphanumeric", "byte"]),
    )
    expect(new Set(fixtures.map((f) => f.resultMask))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]))
    expect(new Set(fixtures.map((f) => f.boost))).toEqual(new Set([true, false]))
    expect(fixtures.some((f) => f.minVersion !== undefined)).toBe(true)
  })

  it.each(
    fixtures.map((f) => ({
      ...f,
      name: JSON.stringify([f.kind, f.length, f.ecLevel, f.mask, f.minVersion, f.boost]),
    })),
  )("draws the same symbol: $name", async (f) => {
    const symbol = encodeQRSymbol(payload(f.kind, f.length), {
      ecLevel: f.ecLevel,
      mode: f.kind,
      mask: f.mask,
      minVersion: f.minVersion,
      boostEcc: f.boost,
    })
    expect([symbol.version, symbol.ecLevel, symbol.mask]).toEqual([
      f.version,
      f.resultEcLevel,
      f.resultMask,
    ])
    expect(await sha256(flat(symbol.modules))).toBe(f.sha256)
  })
})
