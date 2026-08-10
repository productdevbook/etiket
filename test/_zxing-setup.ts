/**
 * Point zxing-wasm at the WebAssembly binary in `node_modules`.
 *
 * Left alone, zxing-wasm fetches `zxing_reader.wasm` over the network at the
 * first decode. That works until it does not: one CI run failed sixteen tests
 * with `Aborted(both async and sync fetching of the wasm failed)` while the
 * same commit passed in the job beside it. A test suite whose result depends on
 * a CDN being reachable is not a test suite, so the binary is read off disk —
 * the copy the lockfile pinned, and no request at all.
 */

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { prepareZXingModule } from "zxing-wasm/reader"

const wasmBinary = readFileSync(
  createRequire(import.meta.url).resolve("zxing-wasm/reader/zxing_reader.wasm"),
)

prepareZXingModule({
  overrides: {
    wasmBinary: wasmBinary.buffer.slice(
      wasmBinary.byteOffset,
      wasmBinary.byteOffset + wasmBinary.byteLength,
    ) as ArrayBuffer,
  },
})
