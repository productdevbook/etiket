import { describe, expect, it } from "vitest"
import { crc32 } from "../src/renderers/png/crc32"
import { adler32 } from "../src/renderers/png/adler32"
import { deflateRaw, zlibCompress } from "../src/renderers/png/deflate"
import { encodePNG } from "../src/renderers/png/png-encoder"

describe("CRC32", () => {
  it("computes correct CRC32 for empty input", () => {
    expect(crc32(new Uint8Array(0))).toBe(0x00000000)
  })

  it("computes correct CRC32 for known string", () => {
    const data = new TextEncoder().encode("123456789")
    expect(crc32(data)).toBe(0xcbf43926)
  })
})

describe("Adler32", () => {
  it("returns 1 for empty input", () => {
    expect(adler32(new Uint8Array(0))).toBe(1)
  })

  it("computes correct checksum for known string", () => {
    const data = new TextEncoder().encode("Wikipedia")
    expect(adler32(data)).toBe(0x11e60398)
  })
})

describe("DEFLATE stored blocks", () => {
  it("produces valid stored block structure", () => {
    const input = new Uint8Array([1, 2, 3, 4, 5])
    const result = deflateRaw(input)

    // First byte: BFINAL=1, BTYPE=00 → 0x01
    expect(result[0]).toBe(0x01)
    // LEN = 5
    expect(result[1]).toBe(5)
    expect(result[2]).toBe(0)
    // NLEN = ~5 & 0xFFFF = 0xFFFA
    expect(result[3]).toBe(0xfa)
    expect(result[4]).toBe(0xff)
    // Data bytes
    expect(result.slice(5, 10)).toEqual(input)
  })

  it("handles empty input", () => {
    const result = deflateRaw(new Uint8Array(0))
    expect(result[0]).toBe(0x01) // BFINAL
    expect(result[1]).toBe(0) // LEN = 0
    expect(result[2]).toBe(0)
  })

  it("splits data into multiple blocks for large input", () => {
    const input = new Uint8Array(65536)
    input.fill(42)
    const result = deflateRaw(input)
    // First block: not final (0x00), 65535 bytes
    expect(result[0]).toBe(0x00)
    // Second block: final (0x01), 1 byte
    const secondBlockStart = 5 + 65535
    expect(result[secondBlockStart]).toBe(0x01)
  })
})

describe("zlib compress", () => {
  it("wraps deflate with correct header and checksum", () => {
    const input = new Uint8Array([1, 2, 3])
    const result = zlibCompress(input)

    // zlib header
    expect(result[0]).toBe(0x78)
    expect(result[1]).toBe(0x01)
    // (CMF*256 + FLG) % 31 === 0
    expect((0x78 * 256 + 0x01) % 31).toBe(0)

    // Adler32 at the end (big-endian)
    const expected = adler32(input)
    const len = result.length
    const actual =
      ((result[len - 4]! << 24) |
        (result[len - 3]! << 16) |
        (result[len - 2]! << 8) |
        result[len - 1]!) >>>
      0
    expect(actual).toBe(expected)
  })
})

describe("PNG encoder", () => {
  const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

  it("produces valid PNG signature", () => {
    const rows = [new Uint8Array([0, 1, 0]), new Uint8Array([1, 0, 1])]
    const png = encodePNG(3, 2, rows, [0, 0, 0], [255, 255, 255])
    expect(Array.from(png.slice(0, 8))).toEqual(PNG_SIGNATURE)
  })

  it("has correct IHDR dimensions", () => {
    const rows = [new Uint8Array(10), new Uint8Array(10), new Uint8Array(10)]
    const png = encodePNG(10, 3, rows, [0, 0, 0], [255, 255, 255])

    // IHDR starts at offset 8 (after signature)
    // chunk: 4 bytes length + 4 bytes type + 13 bytes data + 4 bytes CRC
    const view = new DataView(png.buffer, png.byteOffset)
    // Length of IHDR data
    expect(view.getUint32(8)).toBe(13)
    // Type = "IHDR"
    expect(String.fromCharCode(png[12]!, png[13]!, png[14]!, png[15]!)).toBe("IHDR")
    // Width
    expect(view.getUint32(16)).toBe(10)
    // Height
    expect(view.getUint32(20)).toBe(3)
    // Bit depth = 8
    expect(png[24]).toBe(8)
    // Color type = 3 (indexed)
    expect(png[25]).toBe(3)
  })

  it("contains PLTE chunk with correct colors", () => {
    const rows = [new Uint8Array([0])]
    const png = encodePNG(1, 1, rows, [255, 0, 0], [0, 255, 0])

    // Find PLTE chunk
    let offset = 8
    let found = false
    while (offset < png.length - 8) {
      const view = new DataView(png.buffer, png.byteOffset)
      const chunkLen = view.getUint32(offset)
      const type = String.fromCharCode(
        png[offset + 4]!,
        png[offset + 5]!,
        png[offset + 6]!,
        png[offset + 7]!,
      )
      if (type === "PLTE") {
        // bg (index 0) = [0, 255, 0], fg (index 1) = [255, 0, 0]
        expect(png[offset + 8]).toBe(0) // bg R
        expect(png[offset + 9]).toBe(255) // bg G
        expect(png[offset + 10]).toBe(0) // bg B
        expect(png[offset + 11]).toBe(255) // fg R
        expect(png[offset + 12]).toBe(0) // fg G
        expect(png[offset + 13]).toBe(0) // fg B
        found = true
        break
      }
      offset += 4 + 4 + chunkLen + 4
    }
    expect(found).toBe(true)
  })

  it("contains required chunk sequence: IHDR, PLTE, IDAT, IEND", () => {
    const rows = [new Uint8Array([0, 1])]
    const png = encodePNG(2, 1, rows, [0, 0, 0], [255, 255, 255])

    const chunks: string[] = []
    let offset = 8
    while (offset < png.length) {
      const view = new DataView(png.buffer, png.byteOffset)
      const chunkLen = view.getUint32(offset)
      const type = String.fromCharCode(
        png[offset + 4]!,
        png[offset + 5]!,
        png[offset + 6]!,
        png[offset + 7]!,
      )
      chunks.push(type)
      offset += 4 + 4 + chunkLen + 4
    }
    expect(chunks).toEqual(["IHDR", "PLTE", "IDAT", "IEND"])
  })

  it("validates CRC for each chunk", () => {
    const rows = [new Uint8Array([0, 1, 1, 0])]
    const png = encodePNG(4, 1, rows, [0, 0, 0], [255, 255, 255])

    let offset = 8
    while (offset < png.length) {
      const view = new DataView(png.buffer, png.byteOffset)
      const chunkLen = view.getUint32(offset)
      // type + data
      const typeAndData = png.slice(offset + 4, offset + 4 + 4 + chunkLen)
      const expectedCRC = crc32(typeAndData)
      const actualCRC = view.getUint32(offset + 4 + 4 + chunkLen)
      expect(actualCRC).toBe(expectedCRC)
      offset += 4 + 4 + chunkLen + 4
    }
  })
})
