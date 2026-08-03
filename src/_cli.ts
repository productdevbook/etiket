/**
 * CLI command definitions.
 *
 * Kept separate from the `etiket` bin entry so the commands can be exercised
 * in tests without the module running `runMain` on import.
 */

import { defineCommand } from "citty"
import { consola } from "consola"
import { writeFileSync } from "node:fs"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import {
  barcode,
  postal,
  qrcode,
  qrcodeTerminal,
  datamatrix,
  gs1datamatrix,
  pdf417,
  micropdf417,
  aztec,
  microqr,
  rmqr,
  maxicode,
  dotcode,
  hanxin,
  codablockf,
  code16k,
  jabcode,
  wifi,
  vcard,
  email,
  sms,
  phone,
  geo,
  url,
  barcodePNG,
  postalPNG,
  qrcodePNG,
  datamatrixPNG,
  gs1datamatrixPNG,
  pdf417PNG,
  micropdf417PNG,
  aztecPNG,
  microqrPNG,
  rmqrPNG,
  hanxinPNG,
  dotcodePNG,
  codablockfPNG,
  code16kPNG,
  maxicodePNG,
} from "./index"
import type { BarcodeType } from "./index"
import type { PostalType } from "./_postal"
import type { DotType } from "./renderers/svg/types"
import type { ErrorCorrectionLevel } from "./encoders/qr/types"

/** Symbologies reachable through `etiket barcode`. */
const BARCODE_TYPES: BarcodeType[] = [
  "code128",
  "ean13",
  "ean8",
  "code39",
  "code39ext",
  "code93",
  "code93ext",
  "itf",
  "itf14",
  "upca",
  "upce",
  "ean2",
  "ean5",
  "codabar",
  "msi",
  "pharmacode",
  "code11",
  "gs1-128",
  "identcode",
  "leitcode",
  "postnet",
  "planet",
  "plessey",
  "gs1-databar",
  "gs1-databar-limited",
  "gs1-databar-expanded",
]

/** Symbologies reachable through `etiket postal`. */
const POSTAL_TYPES: PostalType[] = [
  "postnet",
  "planet",
  "rm4scc",
  "kix",
  "auspost",
  "jppost",
  "imb",
]

function readVersion(): string {
  // dist/cli.mjs → ../package.json
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    for (const candidate of [join(here, "..", "package.json"), join(here, "package.json")]) {
      try {
        const pkg: unknown = JSON.parse(readFileSync(candidate, "utf-8"))
        if (pkg && typeof pkg === "object" && "version" in pkg) {
          return String((pkg as { version: unknown }).version)
        }
      } catch {
        // try the next candidate
      }
    }
  } catch {
    // fall through
  }
  return "unknown"
}

/** Write SVG text or PNG bytes to a file, or stream to stdout. */
function output(data: string | Uint8Array, file?: string): void {
  if (file) {
    writeFileSync(file, data)
    consola.success(`Written to ${file}`)
    return
  }
  process.stdout.write(data)
}

/** True when PNG output was requested explicitly or implied by the file name. */
function wantsPNG(args: { png?: boolean; output?: string }): boolean {
  return Boolean(args.png) || Boolean(args.output?.toLowerCase().endsWith(".png"))
}

const commonArgs = {
  output: { type: "string", alias: "o", description: "Output file (.png implies PNG)" },
  png: { type: "boolean", description: "Emit PNG instead of SVG" },
  color: { type: "string", description: "Foreground color", default: "#000000" },
  background: { type: "string", description: "Background color", default: "#ffffff" },
} as const

const matrixArgs = {
  ...commonArgs,
  size: { type: "string", description: "SVG size in pixels", default: "200" },
  "module-size": { type: "string", description: "PNG pixels per module", default: "10" },
  margin: { type: "string", description: "Quiet zone in modules" },
} as const

interface MatrixArgValues {
  output?: string
  png?: boolean
  color: string
  background: string
  size: string
  "module-size": string
  margin?: string
}

function svgMatrixOptions(args: MatrixArgValues) {
  return {
    size: Number(args.size),
    color: args.color,
    background: args.background,
    margin: args.margin ? Number(args.margin) : undefined,
  }
}

function pngMatrixOptions(args: MatrixArgValues) {
  return {
    moduleSize: Number(args["module-size"]),
    color: args.color,
    background: args.background,
    margin: args.margin ? Number(args.margin) : undefined,
  }
}

/**
 * Define a subcommand for a symbology that renders from a single text
 * argument plus matrix options.
 */
function defineMatrixCommand(config: {
  name: string
  description: string
  svg: (text: string, options: ReturnType<typeof svgMatrixOptions>) => string
  png?: (text: string, options: ReturnType<typeof pngMatrixOptions>) => Uint8Array
}) {
  return defineCommand({
    meta: { name: config.name, description: config.description },
    args: {
      text: { type: "positional", description: "Text to encode", required: true },
      ...matrixArgs,
    },
    run({ args }) {
      const values = args as unknown as MatrixArgValues & { text: string }
      if (wantsPNG(values)) {
        if (!config.png) {
          consola.error(`${config.name} does not support PNG output`)
          process.exitCode = 1
          return
        }
        output(config.png(values.text, pngMatrixOptions(values)), values.output)
        return
      }
      output(config.svg(values.text, svgMatrixOptions(values)), values.output)
    },
  })
}

const qrCommand = defineCommand({
  meta: { name: "qr", description: "Generate a QR code" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    ...matrixArgs,
    ec: { type: "string", description: "Error correction: L, M, Q, H", default: "M" },
    "dot-type": {
      type: "string",
      description: "Dot style: square, rounded, dots, diamond, classy, extra-rounded...",
    },
    "dot-size": { type: "string", description: "Dot size 0.1-1" },
    terminal: { type: "boolean", description: "Print to terminal instead of SVG" },
  },
  run({ args }) {
    if (args.terminal) {
      consola.log(qrcodeTerminal(args.text, { ecLevel: args.ec as ErrorCorrectionLevel }))
      return
    }
    const values = args as unknown as MatrixArgValues & { text: string }
    if (wantsPNG(values)) {
      output(
        qrcodePNG(args.text, {
          ecLevel: args.ec as ErrorCorrectionLevel,
          ...pngMatrixOptions(values),
        }),
        values.output,
      )
      return
    }
    output(
      qrcode(args.text, {
        ecLevel: args.ec as ErrorCorrectionLevel,
        dotType: args["dot-type"] as DotType | undefined,
        dotSize: args["dot-size"] ? Number(args["dot-size"]) : undefined,
        ...svgMatrixOptions(values),
      }),
      values.output,
    )
  },
})

const barcodeCommand = defineCommand({
  meta: { name: "barcode", description: "Generate a 1D barcode" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    ...commonArgs,
    type: {
      type: "string",
      description: `Barcode type (${BARCODE_TYPES.length} supported)`,
      default: "code128",
    },
    height: { type: "string", description: "Bar height in pixels", default: "80" },
    "bar-width": { type: "string", description: "Width per module", default: "2" },
    scale: { type: "string", description: "PNG pixels per module", default: "2" },
    "show-text": { type: "boolean", description: "Show text below barcode" },
    "font-size": { type: "string", description: "Font size" },
    margin: { type: "string", description: "Margin in pixels" },
    "msi-check-digit": {
      type: "string",
      description: "MSI check digit: mod10, mod11, mod1010, mod1110, none",
    },
    "code39-check-digit": { type: "boolean", description: "Append a Code 39 check digit" },
    "code128-charset": { type: "string", description: "Code 128 charset: auto, A, B, C" },
  },
  run({ args }) {
    const encoding = {
      type: args.type as BarcodeType,
      msiCheckDigit: args["msi-check-digit"] as "mod10" | undefined,
      code39CheckDigit: args["code39-check-digit"] || undefined,
      code128Charset: args["code128-charset"] as "auto" | undefined,
    }
    if (wantsPNG(args)) {
      output(
        barcodePNG(args.text, {
          ...encoding,
          scale: Number(args.scale),
          height: Number(args.height),
          color: args.color,
          background: args.background,
          margin: args.margin ? Number(args.margin) : undefined,
        }),
        args.output,
      )
      return
    }
    output(
      barcode(args.text, {
        ...encoding,
        height: Number(args.height),
        barWidth: Number(args["bar-width"]),
        color: args.color,
        background: args.background,
        showText: args["show-text"],
        fontSize: args["font-size"] ? Number(args["font-size"]) : undefined,
        margin: args.margin ? Number(args.margin) : undefined,
      }),
      args.output,
    )
  },
})

const postalCommand = defineCommand({
  meta: {
    name: "postal",
    description: "Generate a postal barcode (POSTNET, PLANET, RM4SCC, KIX, AusPost, JP Post, IMb)",
  },
  args: {
    text: { type: "positional", description: "Postal data to encode", required: true },
    ...commonArgs,
    type: {
      type: "string",
      description: `Postal type: ${POSTAL_TYPES.join(", ")}`,
      default: "postnet",
    },
    height: { type: "string", description: "Full bar height", default: "40" },
    "bar-width": { type: "string", description: "Bar width", default: "2" },
    pitch: { type: "string", description: "Bar centre-to-centre distance" },
    margin: { type: "string", description: "Margin in pixels" },
    fcc: { type: "string", description: "Australia Post format control code", default: "11" },
    "routing-code": { type: "string", description: "IMb routing code / Japan Post address" },
  },
  run({ args }) {
    const encoding = {
      type: args.type as PostalType,
      fcc: args.fcc,
      routingCode: args["routing-code"],
    }
    if (wantsPNG(args)) {
      output(
        postalPNG(args.text, {
          ...encoding,
          scale: Number(args["bar-width"]),
          pitch: args.pitch ? Number(args.pitch) : undefined,
          height: Number(args.height),
          color: args.color,
          background: args.background,
          margin: args.margin ? Number(args.margin) : undefined,
        }),
        args.output,
      )
      return
    }
    output(
      postal(args.text, {
        ...encoding,
        barWidth: Number(args["bar-width"]),
        pitch: args.pitch ? Number(args.pitch) : undefined,
        height: Number(args.height),
        color: args.color,
        background: args.background,
        margin: args.margin ? Number(args.margin) : undefined,
      }),
      args.output,
    )
  },
})

const datamatrixCommand = defineCommand({
  meta: { name: "datamatrix", description: "Generate a Data Matrix code" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    ...matrixArgs,
    gs1: { type: "boolean", description: "Encode as GS1 DataMatrix" },
  },
  run({ args }) {
    const values = args as unknown as MatrixArgValues & { text: string }
    if (wantsPNG(values)) {
      const png = args.gs1 ? gs1datamatrixPNG : datamatrixPNG
      output(png(args.text, pngMatrixOptions(values)), values.output)
      return
    }
    const svg = args.gs1 ? gs1datamatrix : datamatrix
    output(svg(args.text, svgMatrixOptions(values)), values.output)
  },
})

const pdf417Command = defineCommand({
  meta: { name: "pdf417", description: "Generate a PDF417 barcode" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    ...matrixArgs,
    "ec-level": { type: "string", description: "Error correction level 0-8" },
    columns: { type: "string", description: "Number of data columns" },
    compact: { type: "boolean", description: "Use compact mode" },
  },
  run({ args }) {
    const values = args as unknown as MatrixArgValues & { text: string }
    const encoding = {
      ecLevel: args["ec-level"] ? Number(args["ec-level"]) : undefined,
      columns: args.columns ? Number(args.columns) : undefined,
      compact: args.compact || undefined,
    }
    if (wantsPNG(values)) {
      output(pdf417PNG(args.text, { ...encoding, ...pngMatrixOptions(values) }), values.output)
      return
    }
    output(pdf417(args.text, { ...encoding, ...svgMatrixOptions(values) }), values.output)
  },
})

const aztecCommand = defineCommand({
  meta: { name: "aztec", description: "Generate an Aztec code" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    ...matrixArgs,
    "ec-percent": { type: "string", description: "Error correction percentage" },
    layers: { type: "string", description: "Number of layers" },
    compact: { type: "boolean", description: "Use compact mode" },
  },
  run({ args }) {
    const values = args as unknown as MatrixArgValues & { text: string }
    const encoding = {
      ecPercent: args["ec-percent"] ? Number(args["ec-percent"]) : undefined,
      layers: args.layers ? Number(args.layers) : undefined,
      compact: args.compact || undefined,
    }
    if (wantsPNG(values)) {
      output(aztecPNG(args.text, { ...encoding, ...pngMatrixOptions(values) }), values.output)
      return
    }
    output(aztec(args.text, { ...encoding, ...svgMatrixOptions(values) }), values.output)
  },
})

const wifiCommand = defineCommand({
  meta: { name: "wifi", description: "Generate a WiFi QR code" },
  args: {
    ssid: { type: "positional", description: "WiFi network name", required: true },
    password: { type: "positional", description: "WiFi password", required: true },
    ...matrixArgs,
    ec: { type: "string", description: "Error correction level", default: "M" },
    "dot-type": { type: "string", description: "Dot style" },
    encryption: { type: "string", description: "Encryption: WPA, WEP, nopass", default: "WPA" },
    hidden: { type: "boolean", description: "Mark the network as hidden" },
  },
  run({ args }) {
    const values = args as unknown as MatrixArgValues
    output(
      wifi(args.ssid, args.password, {
        encryption: args.encryption as "WPA",
        hidden: args.hidden || undefined,
        ecLevel: args.ec as ErrorCorrectionLevel,
        dotType: args["dot-type"] as DotType | undefined,
        ...svgMatrixOptions(values),
      }),
      values.output,
    )
  },
})

const contactCommand = defineCommand({
  meta: { name: "contact", description: "Generate a vCard QR code" },
  args: {
    name: { type: "positional", description: "Full name (first and last)", required: true },
    ...matrixArgs,
    phone: { type: "string", description: "Phone number" },
    email: { type: "string", description: "Email address" },
    org: { type: "string", description: "Organization" },
    title: { type: "string", description: "Job title" },
    website: { type: "string", description: "Website URL" },
  },
  run({ args }) {
    const values = args as unknown as MatrixArgValues
    // vcard() takes structured name parts; split on the first space.
    const [firstName = args.name, ...rest] = args.name.split(" ")
    output(
      vcard(
        {
          firstName,
          lastName: rest.length > 0 ? rest.join(" ") : undefined,
          phone: args.phone,
          email: args.email,
          org: args.org,
          title: args.title,
          url: args.website,
        },
        svgMatrixOptions(values),
      ),
      values.output,
    )
  },
})

const linkCommand = defineCommand({
  meta: {
    name: "link",
    description: "Generate a QR code for a URL, email, phone, SMS or location",
  },
  args: {
    value: {
      type: "positional",
      description: "URL, email, phone number or 'lat,lng'",
      required: true,
    },
    ...matrixArgs,
    kind: { type: "string", description: "url, email, phone, sms or geo", default: "url" },
    body: { type: "string", description: "Message body (sms)" },
  },
  run({ args }) {
    const values = args as unknown as MatrixArgValues
    const opts = svgMatrixOptions(values)
    let svg: string
    switch (args.kind) {
      case "email":
        svg = email(args.value, opts)
        break
      case "phone":
        svg = phone(args.value, opts)
        break
      case "sms":
        svg = sms(args.value, args.body, opts)
        break
      case "geo": {
        const [lat, lng] = args.value.split(",").map(Number)
        if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
          consola.error("geo expects 'lat,lng' — e.g. 41.0082,28.9784")
          process.exitCode = 1
          return
        }
        svg = geo(lat, lng, opts)
        break
      }
      default:
        svg = url(args.value, opts)
    }
    output(svg, values.output)
  },
})

const listCommand = defineCommand({
  meta: { name: "list", description: "List every supported symbology" },
  run() {
    consola.log("1D barcodes (etiket barcode --type <type>):")
    consola.log("  " + BARCODE_TYPES.join(", "))
    consola.log("\nPostal (etiket postal --type <type>):")
    consola.log("  " + POSTAL_TYPES.join(", "))
    consola.log("\n2D symbologies (own subcommand):")
    consola.log(
      "  qr, microqr, rmqr, datamatrix (--gs1), pdf417, micropdf417, aztec,\n" +
        "  maxicode, dotcode, hanxin, codablockf, code16k, jabcode",
    )
    consola.log("\nHelpers: wifi, contact, link")
  },
})

export const main = defineCommand({
  meta: {
    name: "etiket",
    version: readVersion(),
    description: "Zero-dependency barcode & QR code generator — SVG & PNG output",
  },
  subCommands: {
    qr: qrCommand,
    microqr: defineMatrixCommand({
      name: "microqr",
      description: "Generate a Micro QR code",
      svg: microqr,
      png: microqrPNG,
    }),
    rmqr: defineMatrixCommand({
      name: "rmqr",
      description: "Generate a Rectangular Micro QR code",
      svg: rmqr,
      png: rmqrPNG,
    }),
    barcode: barcodeCommand,
    postal: postalCommand,
    datamatrix: datamatrixCommand,
    pdf417: pdf417Command,
    micropdf417: defineMatrixCommand({
      name: "micropdf417",
      description: "Generate a MicroPDF417 barcode",
      svg: micropdf417,
      png: micropdf417PNG,
    }),
    aztec: aztecCommand,
    maxicode: defineMatrixCommand({
      name: "maxicode",
      description: "Generate a MaxiCode symbol",
      svg: maxicode,
      png: maxicodePNG,
    }),
    dotcode: defineMatrixCommand({
      name: "dotcode",
      description: "Generate a DotCode symbol",
      svg: dotcode,
      png: dotcodePNG,
    }),
    hanxin: defineMatrixCommand({
      name: "hanxin",
      description: "Generate a Han Xin code",
      svg: hanxin,
      png: hanxinPNG,
    }),
    codablockf: defineMatrixCommand({
      name: "codablockf",
      description: "Generate a Codablock-F stacked barcode",
      svg: codablockf,
      png: codablockfPNG,
    }),
    code16k: defineMatrixCommand({
      name: "code16k",
      description: "Generate a Code 16K stacked barcode",
      svg: code16k,
      png: code16kPNG,
    }),
    jabcode: defineMatrixCommand({
      name: "jabcode",
      description: "Generate a JAB Code (polychrome)",
      svg: jabcode,
    }),
    wifi: wifiCommand,
    contact: contactCommand,
    link: linkCommand,
    list: listCommand,
  },
})
