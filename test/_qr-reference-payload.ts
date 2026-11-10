export type Kind = "numeric" | "alphanumeric" | "byte"

const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"
const BYTES = ["a", "Z", " ", "é", "~", "日", "q", "ü", "7", "😀", "!", "ß"]

/** A deterministic payload of `length` characters that only `kind` (or a wider mode) can carry */
export function payload(kind: Kind, length: number): string {
  let out = ""
  for (let i = 0; i < length; i++) {
    if (kind === "numeric") out += String((i * 7 + 3) % 10)
    else if (kind === "alphanumeric") out += ALNUM[(i * 13 + 5) % ALNUM.length]
    else out += BYTES[(i * 5 + 1) % BYTES.length]
  }
  return out
}
