import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // zxing-wasm fetches its WebAssembly binary on first use unless told
    // otherwise; this hands it the copy in node_modules instead
    setupFiles: ["test/_zxing-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Declaration-only and re-export-only modules have nothing to cover
      exclude: ["src/env.d.ts", "src/cli.ts", "test/**"],
      reporter: ["text", "html"],
      // The floor, not the target. Raise it when the number rises; never lower
      // it to make a change fit.
      thresholds: {
        statements: 96,
        branches: 92,
        functions: 99,
        lines: 97,
      },
    },
  },
})
