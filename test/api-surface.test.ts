/**
 * Public API surface guard.
 *
 * Every name promised by the README and docs must exist on the package entry
 * points, and the snippets those documents show must actually run. This keeps
 * documentation from drifting away from the code.
 */

import { describe, expect, it } from "vitest";
import * as etiket from "../src/index";
import * as barcodeEntry from "../src/barcode";
import * as postalEntry from "../src/postal";
import * as qrEntry from "../src/qr";
import * as datamatrixEntry from "../src/datamatrix";
import * as pdf417Entry from "../src/pdf417";
import * as aztecEntry from "../src/aztec";
import * as pngEntry from "../src/png";

const DOCUMENTED_EXPORTS = [
  // 1D
  "barcode",
  "barcodeDataURI",
  "barcodeBase64",
  "encodeBars",
  // Postal
  "postal",
  "postalDataURI",
  "postalBase64",
  "encodePostal",
  // QR
  "qrcode",
  "qrcodeTerminal",
  "qrcodeDataURI",
  "qrcodeBase64",
  "microqr",
  "rmqr",
  // 2D
  "datamatrix",
  "gs1datamatrix",
  "pdf417",
  "micropdf417",
  "aztec",
  "maxicode",
  "dotcode",
  "hanxin",
  "codablockf",
  "code16k",
  "jabcode",
  // Raw
  "encode",
  "optimizeSVG",
  // PNG
  "barcodePNG",
  "postalPNG",
  "qrcodePNG",
  "microqrPNG",
  "rmqrPNG",
  "datamatrixPNG",
  "gs1datamatrixPNG",
  "pdf417PNG",
  "micropdf417PNG",
  "aztecPNG",
  "maxicodePNG",
  "dotcodePNG",
  "hanxinPNG",
  "codablockfPNG",
  "code16kPNG",
  // Renderers
  "renderBarcodeSVG",
  "renderQRCodeSVG",
  "renderMatrixSVG",
  "renderMaxiCodeSVG",
  "renderPostalSVG",
  "renderColorMatrixSVG",
  "renderText",
  "renderBarcodePNG",
  "renderMatrixPNG",
  "renderPostalPNG",
  "renderMaxiCodePNG",
  "renderBarcodeRaster",
  "renderMatrixRaster",
  "renderPostalRaster",
  "renderMaxiCodeRaster",
  "encodePNG",
  "svgToDataURI",
  "svgToBase64",
  "svgToBase64Raw",
  // Helpers
  "wifi",
  "url",
  "email",
  "sms",
  "geo",
  "phone",
  "vcard",
  "mecard",
  "event",
  "swissQR",
  "gs1DigitalLink",
  // Raw encoders
  "encodeQR",
  "encodeMicroQR",
  "encodeRMQR",
  "encodeDataMatrix",
  "encodeGS1DataMatrix",
  "encodePDF417",
  "encodeMicroPDF417",
  "encodeAztec",
  "encodeMaxiCode",
  "encodeDotCode",
  "encodeHanXin",
  "encodeCodablockF",
  "encodeCode16K",
  "encodeJABCode",
  "encodePOSTNET",
  "encodePLANET",
  "encodeRM4SCC",
  "encodeKIX",
  "encodeAustraliaPost",
  "encodeJapanPost",
  "encodeIMb",
  // Validators and errors
  "validateBarcode",
  "isValidInput",
  "validateBarcodeInput",
  "validateQRInput",
  "EtiketError",
  "InvalidInputError",
  "CapacityError",
  "CheckDigitError",
] as const;

describe("public API surface", () => {
  it("exports every documented name", () => {
    const registry = etiket as unknown as Record<string, unknown>;
    const missing = DOCUMENTED_EXPORTS.filter((name) => registry[name] === undefined);
    expect(missing).toEqual([]);
  });

  it("exposes every documented name as a function or class", () => {
    const registry = etiket as unknown as Record<string, unknown>;
    for (const name of DOCUMENTED_EXPORTS) {
      expect(typeof registry[name], name).toBe("function");
    }
  });

  it("every *PNG function has a matching *PNGDataURI variant", () => {
    const registry = etiket as unknown as Record<string, unknown>;
    const pngFns = Object.keys(registry).filter(
      (name) => name.endsWith("PNG") && !name.startsWith("render") && name !== "encodePNG",
    );
    expect(pngFns.length).toBeGreaterThan(10);
    for (const name of pngFns) {
      expect(registry[`${name}DataURI`], `${name}DataURI`).toBeTypeOf("function");
    }
  });
});

describe("sub-path entry points", () => {
  const cases: Array<[string, Record<string, unknown>, string[]]> = [
    [
      "etiket/barcode",
      barcodeEntry as unknown as Record<string, unknown>,
      ["barcode", "barcodeDataURI", "barcodeBase64", "encodeBars", "renderBarcodeSVG"],
    ],
    [
      "etiket/postal",
      postalEntry as unknown as Record<string, unknown>,
      [
        "postal",
        "postalDataURI",
        "postalBase64",
        "encodePostal",
        "renderPostalSVG",
        "encodePOSTNET",
        "encodeRM4SCC",
        "encodeIMb",
      ],
    ],
    [
      "etiket/qr",
      qrEntry as unknown as Record<string, unknown>,
      [
        "qrcode",
        "qrcodeTerminal",
        "microqr",
        "rmqr",
        "encodeQR",
        "encodeMicroQR",
        "encodeRMQR",
        "renderQRCodeSVG",
      ],
    ],
    [
      "etiket/datamatrix",
      datamatrixEntry as unknown as Record<string, unknown>,
      ["datamatrix", "gs1datamatrix", "encodeDataMatrix", "encodeGS1DataMatrix"],
    ],
    [
      "etiket/pdf417",
      pdf417Entry as unknown as Record<string, unknown>,
      ["pdf417", "micropdf417", "encodePDF417", "encodeMicroPDF417"],
    ],
    ["etiket/aztec", aztecEntry as unknown as Record<string, unknown>, ["aztec", "encodeAztec"]],
    [
      "etiket/png",
      pngEntry as unknown as Record<string, unknown>,
      [
        "barcodePNG",
        "postalPNG",
        "qrcodePNG",
        "microqrPNG",
        "maxicodePNG",
        "renderMatrixPNG",
        "renderPostalPNG",
        "encodePNG",
      ],
    ],
  ];

  for (const [name, mod, expected] of cases) {
    it(`${name} exports its documented surface`, () => {
      for (const key of expected) {
        expect(mod[key], `${name} → ${key}`).toBeTypeOf("function");
      }
    });
  }

  it("sub-path exports are the same references as the main entry", () => {
    const registry = etiket as unknown as Record<string, unknown>;
    for (const [, mod] of cases) {
      for (const [key, value] of Object.entries(mod)) {
        if (typeof value !== "function") continue;
        if (registry[key] === undefined) continue;
        expect(registry[key], key).toBe(value);
      }
    }
  });
});

describe("documented snippets run", () => {
  const snippets: Array<[string, () => unknown]> = [
    ["postal postnet", () => etiket.postal("12345-6789", { type: "postnet" })],
    ["postal rm4scc", () => etiket.postal("SN34RD1A", { type: "rm4scc" })],
    ["postal auspost fcc", () => etiket.postal("12345678", { type: "auspost", fcc: "59" })],
    [
      "postal imb routing",
      () => etiket.postal("01234567094987654321", { type: "imb", routingCode: "01234567891" }),
    ],
    ["postal jppost", () => etiket.postal("1234567", { type: "jppost", routingCode: "1-2-3" })],
    [
      "postal full options",
      () =>
        etiket.postal("12345", {
          type: "postnet",
          height: 40,
          barWidth: 2,
          pitch: 4,
          margin: 10,
          trackerRatio: 1 / 3,
          shortRatio: 0.4,
          showText: true,
          text: "12345",
        }),
    ],
    ["barcode routes postnet", () => etiket.barcode("12345", { type: "postnet" })],
    ["microqr version", () => etiket.microqr("12345", { version: 3, ecLevel: "M", size: 200 })],
    ["rmqr ecLevel", () => etiket.rmqr("HELLO", { ecLevel: "H" })],
    [
      "maxicode mode 2",
      () =>
        etiket.maxicode("HELLO", {
          mode: 2,
          postalCode: "123456789",
          countryCode: 840,
          serviceClass: 1,
        }),
    ],
    ["maxicodePNG", () => etiket.maxicodePNG("HELLO", { moduleSize: 10 })],
    ["hanxin", () => etiket.hanxin("HELLO", { ecLevel: 3, version: 5 })],
    ["codablockf columns", () => etiket.codablockf("CODABLOCK F DATA", { columns: 8 })],
    ["code16k rowHeight", () => etiket.code16k("DATA", { rowHeight: 1 })],
    ["micropdf417 columns", () => etiket.micropdf417("MICRO", { columns: 2 })],
    ["jabcode colors", () => etiket.jabcode("HELLO", { colors: 8, ecPercent: 30 })],
    [
      "jabcode custom palette",
      () => {
        const result = etiket.encodeJABCode("HELLO", { colors: 4 });
        return etiket.renderColorMatrixSVG(result.matrix, result.palette, {
          palette: ["#000000", "#e63946", "#457b9d", "#f1faee"],
        });
      },
    ],
    ["gs1datamatrix", () => etiket.gs1datamatrix("(01)12345678901231")],
    ["pdf417 options", () => etiket.pdf417("Hello World", { ecLevel: 4, columns: 5 })],
    ["aztec options", () => etiket.aztec("Hello World", { ecPercent: 33 })],
    ["encode qr options", () => etiket.encode("Hello", { type: "qr", qr: { ecLevel: "H" } })],
    [
      "encode pdf417 options",
      () => etiket.encode("Hello", { type: "pdf417", pdf417: { columns: 4 } }),
    ],
    [
      "encode aztec options",
      () => etiket.encode("Hello", { type: "aztec", aztec: { ecPercent: 33 } }),
    ],
    [
      "encode code39 check",
      () => etiket.encode("HELLO", { type: "code39", code39CheckDigit: true }),
    ],
    ["encode auspost fcc", () => etiket.encode("12345678", { type: "auspost", fcc: "59" })],
    ["barcode in mm", () => etiket.barcode("12345", { unit: "mm", barWidth: 0.33, height: 25 })],
    [
      "qrcode accessibility",
      () =>
        etiket.qrcode("https://example.com", {
          ariaLabel: "QR code linking to example.com",
          role: "img",
          title: "Website QR code",
          desc: "Scan to open example.com",
        }),
    ],
    [
      "barcodePNG options",
      () => etiket.barcodePNG("12345", { scale: 3, height: 100, margin: 20, color: "#003049" }),
    ],
    [
      "qrcodePNG options",
      () => etiket.qrcodePNG("Hello", { moduleSize: 8, margin: 2, background: "#f1faee" }),
    ],
    [
      "postalPNG options",
      () => etiket.postalPNG("12345", { type: "postnet", scale: 2, pitch: 4, height: 40 }),
    ],
    [
      "raster then encodePNG",
      () => {
        const raster = etiket.renderMatrixRaster(etiket.encodeQR("Hi"), { moduleSize: 4 });
        return etiket.encodePNG(
          raster.width,
          raster.height,
          raster.rows,
          [0, 0, 0],
          [255, 255, 255],
          true,
        );
      },
    ],
    [
      "renderPostalSVG",
      () =>
        etiket.renderPostalSVG(etiket.encodePostal("12345", { type: "postnet" }), { height: 40 }),
    ],
    ["renderPostalPNG", () => etiket.renderPostalPNG(etiket.encodePostal("12345"), { scale: 2 })],
    ["encodeAustraliaPost", () => etiket.encodeAustraliaPost("11", "12345678")],
    ["encodeJapanPost", () => etiket.encodeJapanPost("1234567", "1-2-3")],
    ["encodeIMb", () => etiket.encodeIMb("01234567094987654321", "01234567891")],
    ["wifi hidden", () => etiket.wifi("MyNetwork", "password123", { hidden: true })],
    ["vcard", () => etiket.vcard({ firstName: "Ada", lastName: "Lovelace", email: "a@b.c" })],
    ["gs1DigitalLink", () => etiket.gs1DigitalLink({ gtin: "09520123456788", batch: "ABC" })],
  ];

  for (const [name, run] of snippets) {
    it(name, () => {
      const result = run();
      expect(result, name).toBeDefined();
      expect(result, name).not.toBeNull();
      if (typeof result === "string") {
        expect(result.length, name).toBeGreaterThan(0);
        expect(result, name).not.toContain("undefined");
        expect(result, name).not.toContain("NaN");
      }
    });
  }
});
