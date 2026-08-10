/**
 * CLI command definitions.
 *
 * Kept separate from the `etiket` bin entry so the commands can be exercised
 * in tests without the module running `runMain` on import.
 */

import { defineCommand } from "citty"
import type { ArgsDef } from "citty"
import { consola } from "consola"
import { readFileSync, writeFileSync } from "node:fs"
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
  gs1databarStacked,
  gs1databarStackedOmni,
  gs1databarExpandedStacked,
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
  gs1databarStackedPNG,
  gs1databarStackedOmniPNG,
  gs1databarExpandedStackedPNG,
  optimizeSVG,
  validateBarcodeInput,
  validateQRInput,
  gs1composite,
  gs1compositePNG,
  jabcodePNG,
} from "./index"
import { BARCODE_TYPES } from "./_types"
import type { BarcodeType } from "./index"
import type { PostalType } from "./_postal"
import type {
  CornerOptions,
  DotType,
  GradientOptions,
  LogoOptions,
  MeasurementUnit,
  SVGAccessibilityOptions,
} from "./renderers/svg/types"
import type { ErrorCorrectionLevel, QRCodeOptions } from "./encoders/qr/types"
import type { DataMatrixShape } from "./encoders/datamatrix/tables"
import { COMPOSITE_LINEAR_TYPES } from "./encoders/gs1-composite"
import type { CompositeLinearType } from "./encoders/gs1-composite"

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

/** 2D and stacked symbologies `etiket validate` also understands. */
const MATRIX_TYPES = [
  "qr",
  "microqr",
  "rmqr",
  "datamatrix",
  "gs1-datamatrix",
  "pdf417",
  "micropdf417",
  "aztec",
  "maxicode",
  "dotcode",
  "hanxin",
  "codablock-f",
  "code16k",
  "jabcode",
]

/** Everything `etiket validate --type` accepts. */
const VALIDATE_TYPES = [...new Set<string>([...BARCODE_TYPES, ...POSTAL_TYPES, ...MATRIX_TYPES])]

/** Types whose data lives in bar height, so PNG output goes through postalPNG. */
const HEIGHT_MODULATED = new Set<string>(["postnet", "planet"])

const UNITS: MeasurementUnit[] = ["px", "mm", "cm", "in", "pt"]

const DOT_TYPES: DotType[] = [
  "square",
  "rounded",
  "dots",
  "diamond",
  "classy",
  "classy-rounded",
  "extra-rounded",
  "vertical-line",
  "horizontal-line",
  "small-square",
  "tiny-square",
]

const CORNER_OUTER_SHAPES = ["square", "rounded", "dots", "extra-rounded", "classy"] as const
const CORNER_INNER_SHAPES = ["square", "dots", "rounded"] as const
const ROTATIONS = ["0", "90", "180", "270"] as const

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

/** Result of parsing a flag that can fail with a usage error. */
type Parsed<T> = { ok: true; value: T } | { ok: false }

/** Report a usage error and mark the run as failed. */
function fail(message: string): { ok: false } {
  consola.error(message)
  process.exitCode = 1
  return { ok: false }
}

/** Parse a numeric flag, warning rather than emitting NaN into the output. */
function num(value: string | undefined, flag: string): number | undefined {
  if (value === undefined || value === "") return undefined
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    consola.warn(`--${flag} expects a number, got "${value}" — ignoring`)
    return undefined
  }
  return parsed
}

/** Validate a string flag against the values the renderer understands. */
function choice<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  flag: string,
): Parsed<T | undefined> {
  if (value === undefined || value === "") return { ok: true, value: undefined }
  if (!(allowed as readonly string[]).includes(value)) {
    return fail(`Unknown value "${value}" for --${flag} — use ${allowed.join(", ")}`)
  }
  return { ok: true, value: value as T }
}

/** Raw parsed argument values, before they are mapped onto library options. */
type RawArgValues = Record<string, string | boolean | undefined>

/** Flags every SVG renderer accepts and no PNG renderer does. */
const SVG_ONLY_COMMON = [
  "aria-label",
  "role",
  "title",
  "desc",
  "optimize",
  "responsive",
  "precision",
] as const

/** Warn about flags the PNG path cannot honour instead of dropping them. */
function warnIgnoredOnPNG(values: RawArgValues, flags: readonly string[]): void {
  const ignored = flags.filter((flag) => {
    const value = values[flag]
    return value !== undefined && value !== false && value !== ""
  })
  if (ignored.length === 0) return
  consola.warn(
    `PNG output ignores ${ignored.map((flag) => `--${flag}`).join(", ")} — ` +
      `${ignored.length > 1 ? "they are" : "it is"} SVG-only`,
  )
}

const accessibilityArgs = {
  "aria-label": { type: "string", description: "SVG aria-label attribute" },
  role: { type: "string", description: 'SVG role attribute (default "img")' },
  title: { type: "string", description: "SVG <title> element" },
  desc: { type: "string", description: "SVG <desc> element" },
} as const

const commonArgs = {
  output: { type: "string", alias: "o", description: "Output file (.png implies PNG)" },
  png: { type: "boolean", description: "Emit PNG instead of SVG" },
  color: { type: "string", description: "Foreground color", default: "#000000" },
  background: { type: "string", description: "Background color", default: "#ffffff" },
  ...accessibilityArgs,
  optimize: { type: "boolean", description: "Run SVG output through optimizeSVG" },
  precision: { type: "string", description: "Decimal precision for --optimize (default 2)" },
  responsive: {
    type: "boolean",
    description: "Drop width/height so the SVG scales to its container (implies --optimize)",
  },
} as const

/** Values shared by every command that can emit SVG. */
interface CommonArgValues {
  output?: string
  png?: boolean
  color: string
  background: string
  "aria-label"?: string
  role?: string
  title?: string
  desc?: string
  optimize?: boolean
  precision?: string
  responsive?: boolean
}

/** Accessibility options accepted by every SVG renderer. */
function accessibilityOptions(values: CommonArgValues): SVGAccessibilityOptions {
  return {
    ariaLabel: values["aria-label"],
    role: values.role,
    title: values.title,
    desc: values.desc,
  }
}

/** Write an SVG out, optimizing it first when asked to. */
function outputSVG(svg: string, values: CommonArgValues): void {
  const optimize = Boolean(values.optimize) || Boolean(values.responsive)
  const text = optimize
    ? optimizeSVG(svg, {
        precision: num(values.precision, "precision"),
        responsive: Boolean(values.responsive),
      })
    : svg
  output(text, values.output)
}

const matrixArgs = {
  ...commonArgs,
  size: { type: "string", description: "SVG size in pixels (default 200)" },
  "module-size": { type: "string", description: "PNG pixels per module", default: "10" },
  margin: { type: "string", description: "Quiet zone in modules" },
} as const

interface MatrixArgValues extends CommonArgValues {
  size?: string
  "module-size": string
  margin?: string
}

/** Flags the matrix PNG renderer cannot honour. */
const MATRIX_PNG_IGNORED = [...SVG_ONLY_COMMON, "size"]

function svgMatrixOptions(args: MatrixArgValues) {
  return {
    size: num(args.size, "size"),
    color: args.color,
    background: args.background,
    margin: num(args.margin, "margin"),
    ...accessibilityOptions(args),
  }
}

function pngMatrixOptions(args: MatrixArgValues) {
  return {
    moduleSize: num(args["module-size"], "module-size"),
    color: args.color,
    background: args.background,
    margin: num(args.margin, "margin"),
  }
}

/**
 * Define a subcommand for a symbology that renders from a single text
 * argument plus matrix options, with optional per-symbology encoder flags.
 */
function defineMatrixCommand<E extends object = Record<string, never>>(config: {
  name: string
  description: string
  /** Extra flags this symbology's encoder understands. */
  args?: ArgsDef
  /** Map the parsed flags onto encoder options. */
  encoding?: (args: RawArgValues) => E
  svg: (text: string, options: E & ReturnType<typeof svgMatrixOptions>) => string
  png?: (text: string, options: E & ReturnType<typeof pngMatrixOptions>) => Uint8Array
}) {
  return defineCommand({
    meta: { name: config.name, description: config.description },
    args: {
      text: { type: "positional", description: "Text to encode", required: true },
      ...matrixArgs,
      ...config.args,
    },
    run({ args }) {
      const values = args as unknown as MatrixArgValues & { text: string } & RawArgValues
      const encoding = (config.encoding?.(values) ?? {}) as E
      if (wantsPNG(values)) {
        if (!config.png) {
          consola.error(`${config.name} does not support PNG output`)
          process.exitCode = 1
          return
        }
        warnIgnoredOnPNG(values, MATRIX_PNG_IGNORED)
        output(config.png(values.text, { ...pngMatrixOptions(values), ...encoding }), values.output)
        return
      }
      outputSVG(config.svg(values.text, { ...svgMatrixOptions(values), ...encoding }), values)
    },
  })
}

interface QRArgValues extends MatrixArgValues {
  text: string
  ec: string
  "dot-type"?: string
  "dot-size"?: string
  shape?: string
  logo?: string
  "logo-size"?: string
  "logo-margin"?: string
  "logo-background"?: string
  gradient?: string
  "gradient-colors"?: string
  "gradient-rotation"?: string
  "corner-shape"?: string
  "corner-dot-shape"?: string
  "corner-color"?: string
  "corner-dot-color"?: string
  version?: string
  mask?: string
  eci?: string
  gs1?: boolean
  "application-indicator"?: string
  terminal?: boolean
}

/** MIME types accepted for a local --logo file. */
const LOGO_MIME: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  ico: "image/x-icon",
}

/** Base64-encode bytes without depending on Node's Buffer. */
function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Build logo options from `--logo`. Data URIs and http(s) URLs are passed
 * through; a local file is read and inlined as a data URI so the SVG stays
 * self-contained.
 */
function parseLogo(values: QRArgValues): Parsed<LogoOptions | undefined> {
  const source = values.logo
  if (!source) return { ok: true, value: undefined }
  const common = {
    size: num(values["logo-size"], "logo-size"),
    margin: num(values["logo-margin"], "logo-margin"),
    backgroundColor: values["logo-background"],
  }
  if (/^(https?:|data:image\/)/i.test(source)) {
    return { ok: true, value: { ...common, imageUrl: source } }
  }
  const extension = source.slice(source.lastIndexOf(".") + 1).toLowerCase()
  const mime = LOGO_MIME[extension]
  if (!mime) {
    return fail(
      `Unsupported --logo file type ".${extension}" — use ${Object.keys(LOGO_MIME).join(", ")}, ` +
        "a data:image/ URI or an http(s) URL",
    )
  }
  return {
    ok: true,
    value: { ...common, imageUrl: `data:${mime};base64,${toBase64(readFileSync(source))}` },
  }
}

/** Turn "#000,#00f" into evenly spaced gradient stops. */
function parseStops(
  spec: string | undefined,
): Array<{ offset: number; color: string }> | undefined {
  const colors = (spec ?? "")
    .split(",")
    .map((color) => color.trim())
    .filter((color) => color.length > 0)
  if (colors.length < 2) return undefined
  return colors.map((color, index) => ({ offset: index / (colors.length - 1), color }))
}

/** Build the foreground gradient from the `--gradient*` flags. */
function parseGradient(values: QRArgValues): Parsed<GradientOptions | undefined> {
  const kind = choice(values.gradient, ["linear", "radial"] as const, "gradient")
  if (!kind.ok) return kind
  if (!kind.value) return { ok: true, value: undefined }
  const stops = parseStops(values["gradient-colors"])
  if (!stops) {
    return fail("--gradient needs --gradient-colors with at least two comma-separated colors")
  }
  if (kind.value === "radial") return { ok: true, value: { type: "radial", stops } }
  return {
    ok: true,
    value: {
      type: "linear",
      rotation: num(values["gradient-rotation"], "gradient-rotation"),
      stops,
    },
  }
}

/** Build the finder-pattern styling from the `--corner*` flags. */
function parseCorners(
  values: QRArgValues,
): Parsed<
  { topLeft: CornerOptions; topRight: CornerOptions; bottomLeft: CornerOptions } | undefined
> {
  const outerShape = choice(values["corner-shape"], CORNER_OUTER_SHAPES, "corner-shape")
  if (!outerShape.ok) return outerShape
  const innerShape = choice(values["corner-dot-shape"], CORNER_INNER_SHAPES, "corner-dot-shape")
  if (!innerShape.ok) return innerShape
  const corner: CornerOptions = {
    outerShape: outerShape.value,
    innerShape: innerShape.value,
    outerColor: values["corner-color"],
    innerColor: values["corner-dot-color"],
  }
  const styled = Object.values(corner).some((value) => value !== undefined)
  if (!styled) return { ok: true, value: undefined }
  return { ok: true, value: { topLeft: corner, topRight: corner, bottomLeft: corner } }
}

/** QR flags that only the SVG renderer understands. */
const QR_PNG_IGNORED = [
  ...MATRIX_PNG_IGNORED,
  "dot-type",
  "dot-size",
  "shape",
  "logo",
  "logo-size",
  "logo-margin",
  "logo-background",
  "gradient",
  "gradient-colors",
  "gradient-rotation",
  "corner-shape",
  "corner-dot-shape",
  "corner-color",
  "corner-dot-color",
]

const qrCommand = defineCommand({
  meta: { name: "qr", description: "Generate a QR code" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    ...matrixArgs,
    ec: { type: "string", description: "Error correction: L, M, Q, H", default: "M" },
    version: { type: "string", description: "QR version 1-40 (auto when omitted)" },
    mask: { type: "string", description: "Mask pattern 0-7 (auto when omitted)" },
    eci: { type: "string", description: "ECI assignment number, e.g. 26 for UTF-8" },
    gs1: { type: "boolean", description: "Encode parenthesised GS1 AI data (FNC1 first position)" },
    "application-indicator": {
      type: "string",
      description: "FNC1 second position indicator: two digits or a single letter",
    },
    "dot-type": {
      type: "string",
      description: "Dot style: square, rounded, dots, diamond, classy, extra-rounded...",
    },
    "dot-size": { type: "string", description: "Dot size 0.1-1" },
    shape: { type: "string", description: "Overall shape: square (default) or circle" },
    logo: { type: "string", description: "Logo image: file path, data:image/ URI or http(s) URL" },
    "logo-size": { type: "string", description: "Logo size as a fraction of the symbol (0.1-0.5)" },
    "logo-margin": { type: "string", description: "Padding around the logo in pixels" },
    "logo-background": { type: "string", description: "Background color behind the logo" },
    gradient: { type: "string", description: "Foreground gradient: linear or radial" },
    "gradient-colors": {
      type: "string",
      description: 'Comma-separated gradient colors, e.g. "#000000,#0044ff"',
    },
    "gradient-rotation": { type: "string", description: "Linear gradient rotation in degrees" },
    "corner-shape": {
      type: "string",
      description: `Finder outer shape: ${CORNER_OUTER_SHAPES.join(", ")}`,
    },
    "corner-dot-shape": {
      type: "string",
      description: `Finder inner shape: ${CORNER_INNER_SHAPES.join(", ")}`,
    },
    "corner-color": { type: "string", description: "Finder outer color" },
    "corner-dot-color": { type: "string", description: "Finder inner color" },
    terminal: { type: "boolean", description: "Print to terminal instead of SVG" },
  },
  run({ args }) {
    const values = args as unknown as QRArgValues & RawArgValues
    const encoding: QRCodeOptions = {
      ecLevel: values.ec as ErrorCorrectionLevel,
      version: num(values.version, "version"),
      mask: num(values.mask, "mask") as QRCodeOptions["mask"],
      eci: num(values.eci, "eci"),
      gs1: values.gs1 || undefined,
      applicationIndicator: values["application-indicator"],
    }
    if (values.terminal) {
      consola.log(qrcodeTerminal(values.text, encoding))
      return
    }
    if (wantsPNG(values)) {
      warnIgnoredOnPNG(values, QR_PNG_IGNORED)
      output(qrcodePNG(values.text, { ...encoding, ...pngMatrixOptions(values) }), values.output)
      return
    }
    const dotType = choice(values["dot-type"], DOT_TYPES, "dot-type")
    if (!dotType.ok) return
    const shape = choice(values.shape, ["square", "circle"] as const, "shape")
    if (!shape.ok) return
    const logo = parseLogo(values)
    if (!logo.ok) return
    const gradient = parseGradient(values)
    if (!gradient.ok) return
    const corners = parseCorners(values)
    if (!corners.ok) return
    outputSVG(
      qrcode(values.text, {
        ...encoding,
        ...svgMatrixOptions(values),
        color: gradient.value ?? values.color,
        dotType: dotType.value,
        dotSize: num(values["dot-size"], "dot-size"),
        shape: shape.value,
        logo: logo.value,
        corners: corners.value,
      }),
      values,
    )
  },
})

interface BarcodeArgValues extends CommonArgValues {
  text: string
  type: string
  height?: string
  "bar-width"?: string
  "bar-gap"?: string
  scale: string
  unit?: string
  rotation?: string
  "bearer-bars"?: boolean
  "bearer-bar-width"?: string
  "show-text"?: boolean
  "text-position"?: string
  "text-align"?: string
  "font-size"?: string
  "font-family"?: string
  margin?: string
  "msi-check-digit"?: string
  "code39-check-digit"?: boolean
  "codabar-start"?: string
  "codabar-stop"?: string
  "code128-charset"?: string
  "issn-variant"?: string
  "code25-check-digit"?: string
}

/** Barcode flags the PNG renderer cannot honour. */
const BARCODE_PNG_IGNORED = [
  ...SVG_ONLY_COMMON,
  "bar-width",
  "bar-gap",
  "unit",
  "rotation",
  "bearer-bars",
  "bearer-bar-width",
  "show-text",
  "text-position",
  "text-align",
  "font-size",
  "font-family",
]

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
    "bar-width": { type: "string", description: "Width per module (default 2)" },
    "bar-gap": { type: "string", description: "Extra spacing between bars" },
    scale: { type: "string", description: "PNG pixels per module", default: "2" },
    unit: { type: "string", description: `Measurement unit: ${UNITS.join(", ")}` },
    rotation: { type: "string", description: `Rotate the symbol: ${ROTATIONS.join(", ")}` },
    "bearer-bars": { type: "boolean", description: "Draw bearer bars (ITF-14)" },
    "bearer-bar-width": { type: "string", description: "Bearer bar thickness" },
    "show-text": { type: "boolean", description: "Show text below barcode" },
    "text-position": { type: "string", description: "Text position: bottom (default) or top" },
    "text-align": { type: "string", description: "Text alignment: center (default), left, right" },
    "font-size": { type: "string", description: "Font size" },
    "font-family": { type: "string", description: "Font family (default monospace)" },
    margin: { type: "string", description: "Margin in pixels" },
    "msi-check-digit": {
      type: "string",
      description: "MSI check digit: mod10, mod11, mod1010, mod1110, none",
    },
    "code39-check-digit": { type: "boolean", description: "Append a Code 39 check digit" },
    "codabar-start": { type: "string", description: "Codabar start character: A, B, C or D" },
    "codabar-stop": { type: "string", description: "Codabar stop character: A, B, C or D" },
    "code128-charset": { type: "string", description: "Code 128 charset: auto, A, B, C" },
    "issn-variant": { type: "string", description: "ISSN sequence variant, two digits" },
    "code25-check-digit": {
      type: "string",
      description: "Code 25 check digit: add or verify",
    },
  },
  run({ args }) {
    const values = args as unknown as BarcodeArgValues & RawArgValues
    const code25Check = choice(
      values["code25-check-digit"],
      ["add", "verify"] as const,
      "code25-check-digit",
    )
    if (!code25Check.ok) return
    const encoding = {
      type: values.type as BarcodeType,
      msiCheckDigit: values["msi-check-digit"] as "mod10" | undefined,
      code39CheckDigit: values["code39-check-digit"] || undefined,
      codabarStart: values["codabar-start"],
      codabarStop: values["codabar-stop"],
      code128Charset: values["code128-charset"] as "auto" | undefined,
      issnVariant: values["issn-variant"],
      code2of5CheckDigit: code25Check.value === "add" ? true : code25Check.value,
    }
    if (wantsPNG(values)) {
      warnIgnoredOnPNG(values, BARCODE_PNG_IGNORED)
      const png = {
        scale: num(values.scale, "scale"),
        height: num(values.height, "height"),
        color: values.color,
        background: values.background,
        margin: num(values.margin, "margin"),
      }
      // POSTNET/PLANET carry their data in bar height, so they raster through
      // the postal renderer just as they render through the postal SVG one.
      output(
        HEIGHT_MODULATED.has(values.type)
          ? postalPNG(values.text, { type: values.type as "postnet" | "planet", ...png })
          : barcodePNG(values.text, { ...encoding, ...png }),
        values.output,
      )
      return
    }
    const unit = choice(values.unit, UNITS, "unit")
    if (!unit.ok) return
    const rotation = choice(values.rotation, ROTATIONS, "rotation")
    if (!rotation.ok) return
    const textPosition = choice(
      values["text-position"],
      ["bottom", "top"] as const,
      "text-position",
    )
    if (!textPosition.ok) return
    const textAlign = choice(
      values["text-align"],
      ["center", "left", "right"] as const,
      "text-align",
    )
    if (!textAlign.ok) return
    outputSVG(
      barcode(values.text, {
        ...encoding,
        ...accessibilityOptions(values),
        height: num(values.height, "height"),
        barWidth: num(values["bar-width"], "bar-width"),
        barGap: num(values["bar-gap"], "bar-gap"),
        unit: unit.value,
        rotation: rotation.value ? (Number(rotation.value) as 0 | 90 | 180 | 270) : undefined,
        bearerBars: values["bearer-bars"] || undefined,
        bearerBarWidth: num(values["bearer-bar-width"], "bearer-bar-width"),
        color: values.color,
        background: values.background,
        showText: values["show-text"],
        textPosition: textPosition.value,
        textAlign: textAlign.value,
        fontSize: num(values["font-size"], "font-size"),
        fontFamily: values["font-family"],
        margin: num(values.margin, "margin"),
      }),
      values,
    )
  },
})

interface PostalArgValues extends CommonArgValues {
  text: string
  type: string
  height?: string
  "bar-width"?: string
  pitch?: string
  margin?: string
  unit?: string
  "tracker-ratio"?: string
  "short-ratio"?: string
  "show-text"?: boolean
  "font-size"?: string
  "font-family"?: string
  fcc: string
  "routing-code"?: string
}

/** Postal flags the PNG renderer cannot honour. */
const POSTAL_PNG_IGNORED = [...SVG_ONLY_COMMON, "unit", "show-text", "font-size", "font-family"]

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
    unit: { type: "string", description: `Measurement unit: ${UNITS.join(", ")}` },
    "tracker-ratio": {
      type: "string",
      description: "Centre band height as a fraction of the symbol (4-state, default 0.333)",
    },
    "short-ratio": {
      type: "string",
      description: "Short bar height as a fraction of the symbol (POSTNET/PLANET, default 0.4)",
    },
    "show-text": { type: "boolean", description: "Show the encoded data below the symbol" },
    "font-size": { type: "string", description: "Font size" },
    "font-family": { type: "string", description: "Font family (default monospace)" },
    fcc: { type: "string", description: "Australia Post format control code", default: "11" },
    "routing-code": { type: "string", description: "IMb routing code / Japan Post address" },
  },
  run({ args }) {
    const values = args as unknown as PostalArgValues & RawArgValues
    const encoding = {
      type: values.type as PostalType,
      fcc: values.fcc,
      routingCode: values["routing-code"],
    }
    const shared = {
      pitch: num(values.pitch, "pitch"),
      height: num(values.height, "height"),
      trackerRatio: num(values["tracker-ratio"], "tracker-ratio"),
      shortRatio: num(values["short-ratio"], "short-ratio"),
      color: values.color,
      background: values.background,
      margin: num(values.margin, "margin"),
    }
    if (wantsPNG(values)) {
      warnIgnoredOnPNG(values, POSTAL_PNG_IGNORED)
      output(
        postalPNG(values.text, {
          ...encoding,
          ...shared,
          scale: num(values["bar-width"], "bar-width"),
        }),
        values.output,
      )
      return
    }
    const unit = choice(values.unit, UNITS, "unit")
    if (!unit.ok) return
    outputSVG(
      postal(values.text, {
        ...encoding,
        ...shared,
        ...accessibilityOptions(values),
        barWidth: num(values["bar-width"], "bar-width"),
        unit: unit.value,
        showText: values["show-text"],
        text: values["show-text"] ? values.text : undefined,
        fontSize: num(values["font-size"], "font-size"),
        fontFamily: values["font-family"],
      }),
      values,
    )
  },
})

const datamatrixCommand = defineCommand({
  meta: { name: "datamatrix", description: "Generate a Data Matrix code" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    ...matrixArgs,
    gs1: { type: "boolean", description: "Encode as GS1 DataMatrix" },
    shape: {
      type: "string",
      description: "Symbol shape: square (default), rectangle or auto",
    },
    dmre: {
      type: "boolean",
      description: "Allow ISO 21471 DMRE rectangular sizes",
    },
    "symbol-size": {
      type: "string",
      description: 'Force an exact symbol size, e.g. "26x64"',
    },
    eci: { type: "string", description: "ECI assignment number, e.g. 26 for UTF-8" },
  },
  run({ args }) {
    const values = args as unknown as MatrixArgValues &
      RawArgValues & {
        text: string
        gs1?: boolean
        shape?: string
        dmre?: boolean
        "symbol-size"?: string
        eci?: string
      }
    const shape = choice(values.shape, ["square", "rectangle", "auto"] as const, "shape")
    if (!shape.ok) return
    const sizeOptions = {
      shape: shape.value as DataMatrixShape | undefined,
      dmre: values.dmre,
      symbolSize: values["symbol-size"],
      eci: num(values.eci, "eci"),
    }
    if (wantsPNG(values)) {
      warnIgnoredOnPNG(values, MATRIX_PNG_IGNORED)
      const png = values.gs1 ? gs1datamatrixPNG : datamatrixPNG
      output(png(values.text, { ...pngMatrixOptions(values), ...sizeOptions }), values.output)
      return
    }
    const svg = values.gs1 ? gs1datamatrix : datamatrix
    outputSVG(svg(values.text, { ...svgMatrixOptions(values), ...sizeOptions }), values)
  },
})

const pdf417Command = defineMatrixCommand({
  name: "pdf417",
  description: "Generate a PDF417 barcode",
  args: {
    "ec-level": { type: "string", description: "Error correction level 0-8" },
    columns: { type: "string", description: "Number of data columns" },
    compact: { type: "boolean", description: "Use compact mode" },
    eci: { type: "string", description: "ECI assignment number, e.g. 26 for UTF-8" },
  },
  encoding: (args) => ({
    ecLevel: num(args["ec-level"] as string | undefined, "ec-level"),
    columns: num(args.columns as string | undefined, "columns"),
    compact: (args.compact as boolean | undefined) || undefined,
    eci: num(args.eci as string | undefined, "eci"),
  }),
  svg: pdf417,
  png: pdf417PNG,
})

const aztecCommand = defineMatrixCommand({
  name: "aztec",
  description: "Generate an Aztec code",
  args: {
    "ec-percent": { type: "string", description: "Error correction percentage" },
    layers: { type: "string", description: "Number of layers" },
    compact: { type: "boolean", description: "Use compact mode" },
    eci: { type: "string", description: "ECI assignment number, e.g. 26 for UTF-8" },
  },
  encoding: (args) => ({
    ecPercent: num(args["ec-percent"] as string | undefined, "ec-percent"),
    layers: num(args.layers as string | undefined, "layers"),
    compact: (args.compact as boolean | undefined) || undefined,
    eci: num(args.eci as string | undefined, "eci"),
  }),
  svg: aztec,
  png: aztecPNG,
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
    if (wantsPNG(values)) {
      consola.error("wifi does not support PNG output — use `etiket qr --png` with a WIFI: payload")
      process.exitCode = 1
      return
    }
    const dotType = choice(args["dot-type"], DOT_TYPES, "dot-type")
    if (!dotType.ok) return
    outputSVG(
      wifi(args.ssid, args.password, {
        encryption: args.encryption as "WPA",
        hidden: args.hidden || undefined,
        ecLevel: args.ec as ErrorCorrectionLevel,
        dotType: dotType.value,
        ...svgMatrixOptions(values),
      }),
      values,
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
    website: { type: "string", description: "Website URL" },
    // Shadows the shared accessibility --title on this command only, where a
    // job title is the far more useful meaning.
    title: { type: "string", description: "Job title" },
  },
  run({ args }) {
    const values = args as unknown as MatrixArgValues
    if (wantsPNG(values)) {
      consola.error("contact does not support PNG output — use `etiket qr --png` with a vCard")
      process.exitCode = 1
      return
    }
    // vcard() takes structured name parts; split on the first space.
    const [firstName = args.name, ...rest] = args.name.split(" ")
    outputSVG(
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
        // --title is the job title here, so it must not also become <title>
        { ...svgMatrixOptions(values), title: undefined },
      ),
      { ...values, title: undefined },
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
    if (wantsPNG(values)) {
      consola.error(
        "link does not support PNG output — use `etiket qr --png` with the same payload",
      )
      process.exitCode = 1
      return
    }
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
    outputSVG(svg, values)
  },
})

const compositeCommand = defineCommand({
  meta: {
    name: "gs1composite",
    description: "Generate a complete GS1 Composite symbol (linear + separator + 2D)",
  },
  args: {
    linear: {
      type: "positional",
      description: `Primary symbology: ${COMPOSITE_LINEAR_TYPES.join(", ")}`,
      required: true,
    },
    data: {
      type: "positional",
      description:
        'Linear and composite data separated by "|", e.g. "01234567890128|(17)260101(10)LOT42"',
      required: true,
    },
    ...matrixArgs,
    version: { type: "string", description: "Composite version: CC-A, CC-B or CC-C" },
    columns: { type: "string", description: "Data columns of the 2D component" },
  },
  run({ args }) {
    const values = args as unknown as MatrixArgValues & {
      linear: string
      data: string
      version?: string
      columns?: string
    }
    if (!COMPOSITE_LINEAR_TYPES.includes(values.linear as CompositeLinearType)) {
      consola.error(
        `Unknown composite primary "${values.linear}" — use ${COMPOSITE_LINEAR_TYPES.join(", ")}`,
      )
      process.exitCode = 1
      return
    }
    if (!values.data.includes("|")) {
      consola.error('Composite data must be "<linear data>|<composite data>"')
      process.exitCode = 1
      return
    }
    const encoding = {
      type: values.version as "CC-A" | "CC-B" | "CC-C" | undefined,
      columns: num(values.columns, "columns"),
    }
    const linear = values.linear as CompositeLinearType
    if (wantsPNG(values)) {
      output(
        gs1compositePNG(linear, values.data, { ...encoding, ...pngMatrixOptions(values) }),
        values.output,
      )
      return
    }
    output(
      gs1composite(linear, values.data, { ...encoding, ...svgMatrixOptions(values) }),
      values.output,
    )
  },
})

const validateCommand = defineCommand({
  meta: {
    name: "validate",
    description: "Validate input for a symbology without rendering it",
  },
  args: {
    text: { type: "positional", description: "Text to validate", required: true },
    type: {
      type: "string",
      description: `Symbology to validate against (${VALIDATE_TYPES.length} supported)`,
      default: "code128",
    },
    ec: { type: "string", description: "Error correction level, for --type qr", default: "M" },
    json: { type: "boolean", description: "Write the result as JSON instead of a message" },
    output: { type: "string", alias: "o", description: "Write the JSON result to a file" },
  },
  run({ args }) {
    const type = args.type
    const result: {
      valid: boolean
      error?: string
      checkDigit?: number
      version?: number
      mode?: string
      dataLength?: number
      maxCapacity?: number
    } =
      type === "qr"
        ? validateQRInput(args.text, args.ec as ErrorCorrectionLevel)
        : validateBarcodeInput(args.text, type)

    if (args.json) {
      output(`${JSON.stringify({ type, ...result }, null, 2)}\n`, args.output)
    }
    if (!result.valid) {
      if (!args.json) consola.error(`Invalid ${type} input: ${result.error}`)
      process.exitCode = 1
      return
    }
    if (args.json) return
    const details: string[] = []
    if (result.checkDigit !== undefined) details.push(`check digit ${result.checkDigit}`)
    if (result.version !== undefined) details.push(`version ${result.version}`)
    if (result.mode !== undefined) details.push(`${result.mode} mode`)
    if (result.dataLength !== undefined && result.maxCapacity !== undefined) {
      details.push(`${result.dataLength}/${result.maxCapacity} capacity`)
    }
    consola.success(`Valid ${type} input${details.length > 0 ? ` — ${details.join(", ")}` : ""}`)
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
        "  maxicode, dotcode, hanxin, codablockf, code16k, jabcode,\n" +
        "  gs1databar-stacked, gs1databar-stacked-omni, gs1databar-expanded-stacked",
    )
    consola.log("\nHelpers: wifi, contact, link, validate")
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
      args: {
        ec: { type: "string", description: "Error correction: L, M, Q" },
        version: { type: "string", description: "Version 1-4 (auto when omitted)" },
        mask: { type: "string", description: "Mask pattern 0-3 (auto when omitted)" },
      },
      encoding: (args) => ({
        ecLevel: args.ec as "L" | "M" | "Q" | undefined,
        version: num(args.version as string | undefined, "version") as 1 | 2 | 3 | 4 | undefined,
        mask: num(args.mask as string | undefined, "mask") as 0 | 1 | 2 | 3 | undefined,
      }),
      svg: microqr,
      png: microqrPNG,
    }),
    rmqr: defineMatrixCommand({
      name: "rmqr",
      description: "Generate a Rectangular Micro QR code",
      args: {
        ec: { type: "string", description: "Error correction: M or H" },
        version: { type: "string", description: "Size index 0-31 (auto when omitted)" },
        eci: { type: "string", description: "ECI assignment number, e.g. 26 for UTF-8" },
      },
      encoding: (args) => ({
        ecLevel: args.ec as "M" | "H" | undefined,
        version: num(args.version as string | undefined, "version"),
        eci: num(args.eci as string | undefined, "eci"),
      }),
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
      args: { columns: { type: "string", description: "Number of data columns 1-4" } },
      encoding: (args) => ({
        columns: num(args.columns as string | undefined, "columns") as 1 | 2 | 3 | 4 | undefined,
      }),
      svg: micropdf417,
      png: micropdf417PNG,
    }),
    aztec: aztecCommand,
    maxicode: defineMatrixCommand({
      name: "maxicode",
      description: "Generate a MaxiCode symbol",
      args: {
        mode: { type: "string", description: "Mode 2-6 (default 4)" },
        "postal-code": { type: "string", description: "Postal code (modes 2 and 3)" },
        "country-code": { type: "string", description: "ISO country code number (modes 2 and 3)" },
        "service-class": { type: "string", description: "Service class (modes 2 and 3)" },
      },
      encoding: (args) => ({
        mode: num(args.mode as string | undefined, "mode") as 2 | 3 | 4 | 5 | 6 | undefined,
        postalCode: args["postal-code"] as string | undefined,
        countryCode: num(args["country-code"] as string | undefined, "country-code"),
        serviceClass: num(args["service-class"] as string | undefined, "service-class"),
      }),
      svg: maxicode,
      png: maxicodePNG,
    }),
    dotcode: defineMatrixCommand({
      name: "dotcode",
      description: "Generate a DotCode symbol",
      args: {
        rows: { type: "string", description: "Fixed symbol height in dots (5-200)" },
        columns: { type: "string", description: "Fixed symbol width in dots (5-200)" },
        mask: { type: "string", description: "Force a mask pattern 0-3" },
      },
      encoding: (args) => ({
        rows: num(args.rows as string | undefined, "rows"),
        columns: num(args.columns as string | undefined, "columns"),
        mask: num(args.mask as string | undefined, "mask"),
      }),
      svg: dotcode,
      png: dotcodePNG,
    }),
    hanxin: defineMatrixCommand({
      name: "hanxin",
      description: "Generate a Han Xin code",
      args: {
        ec: { type: "string", description: "Error correction level 1-4 (default 2)" },
        version: { type: "string", description: "Version 1-84 (auto when omitted)" },
      },
      encoding: (args) => ({
        ecLevel: num(args.ec as string | undefined, "ec") as 1 | 2 | 3 | 4 | undefined,
        version: num(args.version as string | undefined, "version"),
      }),
      svg: hanxin,
      png: hanxinPNG,
    }),
    codablockf: defineMatrixCommand({
      name: "codablockf",
      description: "Generate a Codablock-F stacked barcode",
      args: { columns: { type: "string", description: "Number of data columns per row" } },
      encoding: (args) => ({ columns: num(args.columns as string | undefined, "columns") }),
      svg: codablockf,
      png: codablockfPNG,
    }),
    code16k: defineMatrixCommand({
      name: "code16k",
      description: "Generate a Code 16K stacked barcode",
      svg: code16k,
      png: code16kPNG,
    }),
    "gs1databar-stacked": defineMatrixCommand({
      name: "gs1databar-stacked",
      description: "Generate a GS1 DataBar Stacked symbol",
      svg: gs1databarStacked,
      png: gs1databarStackedPNG,
    }),
    "gs1databar-stacked-omni": defineMatrixCommand({
      name: "gs1databar-stacked-omni",
      description: "Generate a GS1 DataBar Stacked Omnidirectional symbol",
      svg: gs1databarStackedOmni,
      png: gs1databarStackedOmniPNG,
    }),
    "gs1databar-expanded-stacked": defineMatrixCommand({
      name: "gs1databar-expanded-stacked",
      description: "Generate a GS1 DataBar Expanded Stacked symbol",
      args: { segments: { type: "string", description: "Segments per row (even, 2-22)" } },
      encoding: (args) => ({ segments: num(args.segments as string | undefined, "segments") }),
      svg: gs1databarExpandedStacked,
      png: gs1databarExpandedStackedPNG,
    }),
    jabcode: defineMatrixCommand({
      name: "jabcode",
      description: "Generate a JAB Code (polychrome)",
      args: {
        colors: { type: "string", description: "Palette size: 4 (default) or 8" },
        "ec-percent": { type: "string", description: "Error correction percentage (default 20)" },
      },
      encoding: (args) => ({
        colors: num(args.colors as string | undefined, "colors") as 4 | 8 | undefined,
        ecPercent: num(args["ec-percent"] as string | undefined, "ec-percent"),
      }),
      svg: jabcode,
      png: jabcodePNG,
    }),
    wifi: wifiCommand,
    contact: contactCommand,
    link: linkCommand,
    gs1composite: compositeCommand,
    validate: validateCommand,
    list: listCommand,
  },
})
