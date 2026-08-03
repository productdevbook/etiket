// Runtime globals available in Node.js 16+ and all modern browsers
declare class TextEncoder {
  encode(input?: string): Uint8Array
}

declare function btoa(data: string): string
declare function atob(data: string): string

// Node.js globals for CLI
declare var process: {
  argv: string[]
  stdout: { write(s: string | Uint8Array): boolean }
  stderr: { write(s: string | Uint8Array): boolean }
  exit(code?: number): never
  exitCode?: number
}

declare module "node:fs" {
  export function writeFileSync(path: string, data: string | Uint8Array, encoding?: string): void
  export function readFileSync(path: string, encoding: string): string
  export function readFileSync(path: string): Uint8Array
  export function mkdtempSync(prefix: string): string
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void
}

declare module "node:os" {
  export function tmpdir(): string
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string
}

declare module "node:path" {
  export function dirname(path: string): string
  export function join(...paths: string[]): string
}
