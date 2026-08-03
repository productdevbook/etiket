#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import { writeFileSync } from "node:fs";
import { barcode, qrcode, qrcodeTerminal, datamatrix, pdf417, aztec, wifi } from "./index";
import type { BarcodeType } from "./index";
import type { DotType } from "./renderers/svg/types";
import type { ErrorCorrectionLevel } from "./encoders/qr/types";

function output(svg: string, file?: string): void {
  if (file) {
    writeFileSync(file, svg, "utf-8");
    consola.success(`Written to ${file}`);
  } else {
    process.stdout.write(svg);
  }
}

const qrCommand = defineCommand({
  meta: { name: "qr", description: "Generate a QR code" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    output: { type: "string", alias: "o", description: "Output file" },
    size: { type: "string", description: "Size in pixels", default: "200" },
    ec: { type: "string", description: "Error correction: L, M, Q, H", default: "M" },
    "dot-type": {
      type: "string",
      description: "Dot style: square, rounded, dots, diamond, classy, extra-rounded...",
    },
    "dot-size": { type: "string", description: "Dot size 0.1-1" },
    color: { type: "string", description: "Foreground color", default: "#000" },
    background: { type: "string", description: "Background color", default: "#fff" },
    margin: { type: "string", description: "Quiet zone in modules" },
    terminal: { type: "boolean", description: "Print to terminal instead of SVG" },
  },
  run({ args }) {
    if (args.terminal) {
      const result = qrcodeTerminal(args.text, { ecLevel: args.ec as ErrorCorrectionLevel });
      consola.log(result);
      return;
    }
    const svg = qrcode(args.text, {
      size: Number(args.size),
      ecLevel: args.ec as ErrorCorrectionLevel,
      dotType: args["dot-type"] as DotType | undefined,
      dotSize: args["dot-size"] ? Number(args["dot-size"]) : undefined,
      color: args.color,
      background: args.background,
      margin: args.margin ? Number(args.margin) : undefined,
    });
    output(svg, args.output);
  },
});

const barcodeCommand = defineCommand({
  meta: { name: "barcode", description: "Generate a 1D barcode" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    output: { type: "string", alias: "o", description: "Output file" },
    type: { type: "string", description: "Barcode type", default: "code128" },
    height: { type: "string", description: "Bar height in pixels", default: "80" },
    "bar-width": { type: "string", description: "Width per module", default: "2" },
    color: { type: "string", description: "Bar color", default: "#000" },
    background: { type: "string", description: "Background color", default: "#fff" },
    "show-text": { type: "boolean", description: "Show text below barcode" },
    "font-size": { type: "string", description: "Font size" },
    margin: { type: "string", description: "Margin in pixels" },
  },
  run({ args }) {
    const svg = barcode(args.text, {
      type: args.type as BarcodeType,
      height: Number(args.height),
      barWidth: Number(args["bar-width"]),
      color: args.color,
      background: args.background,
      showText: args["show-text"],
      fontSize: args["font-size"] ? Number(args["font-size"]) : undefined,
      margin: args.margin ? Number(args.margin) : undefined,
    });
    output(svg, args.output);
  },
});

const datamatrixCommand = defineCommand({
  meta: { name: "datamatrix", description: "Generate a Data Matrix code" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    output: { type: "string", alias: "o", description: "Output file" },
    size: { type: "string", description: "Size in pixels", default: "200" },
    color: { type: "string", description: "Module color", default: "#000" },
    background: { type: "string", description: "Background color", default: "#fff" },
    margin: { type: "string", description: "Margin in modules" },
  },
  run({ args }) {
    const svg = datamatrix(args.text, {
      size: Number(args.size),
      color: args.color,
      background: args.background,
      margin: args.margin ? Number(args.margin) : undefined,
    });
    output(svg, args.output);
  },
});

const pdf417Command = defineCommand({
  meta: { name: "pdf417", description: "Generate a PDF417 barcode" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    output: { type: "string", alias: "o", description: "Output file" },
    "ec-level": { type: "string", description: "Error correction level 0-8" },
    columns: { type: "string", description: "Number of data columns" },
    compact: { type: "boolean", description: "Use compact mode" },
    width: { type: "string", description: "Width in pixels", default: "400" },
    color: { type: "string", description: "Color", default: "#000" },
    background: { type: "string", description: "Background color", default: "#fff" },
  },
  run({ args }) {
    const svg = pdf417(args.text, {
      ecLevel: args["ec-level"] ? Number(args["ec-level"]) : undefined,
      columns: args.columns ? Number(args.columns) : undefined,
      compact: args.compact || undefined,
      width: Number(args.width),
      color: args.color,
      background: args.background,
    });
    output(svg, args.output);
  },
});

const aztecCommand = defineCommand({
  meta: { name: "aztec", description: "Generate an Aztec code" },
  args: {
    text: { type: "positional", description: "Text to encode", required: true },
    output: { type: "string", alias: "o", description: "Output file" },
    size: { type: "string", description: "Size in pixels", default: "200" },
    "ec-percent": { type: "string", description: "Error correction percentage" },
    layers: { type: "string", description: "Number of layers" },
    compact: { type: "boolean", description: "Use compact mode" },
    color: { type: "string", description: "Color", default: "#000" },
    background: { type: "string", description: "Background color", default: "#fff" },
    margin: { type: "string", description: "Margin in modules" },
  },
  run({ args }) {
    const svg = aztec(args.text, {
      ecPercent: args["ec-percent"] ? Number(args["ec-percent"]) : undefined,
      layers: args.layers ? Number(args.layers) : undefined,
      compact: args.compact || undefined,
      size: Number(args.size),
      color: args.color,
      background: args.background,
      margin: args.margin ? Number(args.margin) : undefined,
    });
    output(svg, args.output);
  },
});

const wifiCommand = defineCommand({
  meta: { name: "wifi", description: "Generate a WiFi QR code" },
  args: {
    ssid: { type: "positional", description: "WiFi network name", required: true },
    password: { type: "positional", description: "WiFi password", required: true },
    output: { type: "string", alias: "o", description: "Output file" },
    size: { type: "string", description: "Size in pixels", default: "200" },
    ec: { type: "string", description: "Error correction level", default: "M" },
    "dot-type": { type: "string", description: "Dot style" },
    color: { type: "string", description: "Color", default: "#000" },
    background: { type: "string", description: "Background color", default: "#fff" },
  },
  run({ args }) {
    const svg = wifi(args.ssid, args.password, {
      size: Number(args.size),
      ecLevel: args.ec as ErrorCorrectionLevel,
      dotType: args["dot-type"] as DotType | undefined,
      color: args.color,
      background: args.background,
    });
    output(svg, args.output);
  },
});

const main = defineCommand({
  meta: {
    name: "etiket",
    version: "0.0.2",
    description: "Zero-dependency barcode & QR code SVG generator",
  },
  subCommands: {
    qr: qrCommand,
    barcode: barcodeCommand,
    datamatrix: datamatrixCommand,
    pdf417: pdf417Command,
    aztec: aztecCommand,
    wifi: wifiCommand,
  },
});

runMain(main);
