import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/barcode.ts",
    "src/qr.ts",
    "src/datamatrix.ts",
    "src/pdf417.ts",
    "src/aztec.ts",
    "src/cli.ts",
  ],
  format: ["esm"],
  dts: {
    sourcemap: false,
  },
  clean: true,
  sourcemap: false,
  minify: true,
  treeshake: true,
  target: "es2022",
  publint: true,
});
