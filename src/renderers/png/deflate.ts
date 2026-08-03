/**
 * Minimal DEFLATE encoder using stored (uncompressed) blocks
 * Wrapped in zlib format for PNG IDAT chunks
 */

import { adler32 } from "./adler32"

/**
 * DEFLATE stored blocks (no compression). Returns raw DEFLATE bitstream.
 */
export function deflateRaw(data: Uint8Array): Uint8Array {
  const MAX_BLOCK = 65535
  const numBlocks = Math.ceil(data.length / MAX_BLOCK) || 1
  const out = new Uint8Array(numBlocks * 5 + data.length)
  let pos = 0
  let offset = 0

  while (offset < data.length || pos === 0) {
    const remaining = data.length - offset
    const blockLen = Math.min(remaining, MAX_BLOCK)
    const isFinal = offset + blockLen >= data.length

    out[pos++] = isFinal ? 0x01 : 0x00
    out[pos++] = blockLen & 0xff
    out[pos++] = (blockLen >> 8) & 0xff
    out[pos++] = ~blockLen & 0xff
    out[pos++] = (~blockLen >> 8) & 0xff
    out.set(data.subarray(offset, offset + blockLen), pos)
    pos += blockLen
    offset += blockLen
  }

  return out.subarray(0, pos)
}

/**
 * Zlib-wrapped DEFLATE (what PNG IDAT chunks expect).
 */
export function zlibCompress(data: Uint8Array): Uint8Array {
  const deflated = deflateRaw(data)
  const checksum = adler32(data)

  const out = new Uint8Array(2 + deflated.length + 4)
  out[0] = 0x78 // CMF
  out[1] = 0x01 // FLG
  out.set(deflated, 2)
  const adlerOffset = 2 + deflated.length
  out[adlerOffset] = (checksum >> 24) & 0xff
  out[adlerOffset + 1] = (checksum >> 16) & 0xff
  out[adlerOffset + 2] = (checksum >> 8) & 0xff
  out[adlerOffset + 3] = checksum & 0xff

  return out
}
