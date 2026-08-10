/**
 * A PNG reader for the tests, so that what the renderers produce can be decoded
 * rather than measured.
 *
 * Everything else in this suite checks the module matrix. The PNG is what a
 * user prints, and reading it back means undoing what the encoder did: the
 * zlib framing, the five row filters of the PNG specification, and the palette.
 *
 * Everything here is test-only; nothing from `src/` is imported.
 */

export interface DecodedPNG {
  width: number
  height: number
  /** 0 grayscale, 2 truecolour, 3 palette, 6 truecolour with alpha. */
  colorType: number
  bitDepth: number
  /** RGBA, four bytes a pixel, ready to hand to a reader. */
  rgba: Uint8ClampedArray
}

/** Undo the per-row filters of PNG 4.5, which need the row above and to the left. */
function unfilter(
  raw: Uint8Array,
  width: number,
  height: number,
  bytesPerPixel: number,
): Uint8Array {
  const stride = width * bytesPerPixel
  const out = new Uint8Array(stride * height)
  let read = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[read]!
    read++
    const line = out.subarray(y * stride, (y + 1) * stride)
    const above = y > 0 ? out.subarray((y - 1) * stride, y * stride) : undefined
    for (let i = 0; i < stride; i++) {
      const left = i >= bytesPerPixel ? line[i - bytesPerPixel]! : 0
      const up = above ? above[i]! : 0
      const upLeft = above && i >= bytesPerPixel ? above[i - bytesPerPixel]! : 0
      const value = raw[read + i]!
      switch (filter) {
        case 1:
          line[i] = (value + left) & 0xff
          break
        case 2:
          line[i] = (value + up) & 0xff
          break
        case 3:
          line[i] = (value + ((left + up) >> 1)) & 0xff
          break
        case 4: {
          const estimate = left + up - upLeft
          const dLeft = Math.abs(estimate - left)
          const dUp = Math.abs(estimate - up)
          const dUpLeft = Math.abs(estimate - upLeft)
          const nearest = dLeft <= dUp && dLeft <= dUpLeft ? left : dUp <= dUpLeft ? up : upLeft
          line[i] = (value + nearest) & 0xff
          break
        }
        default:
          line[i] = value
      }
    }
    read += stride
  }
  return out
}

/** Undo the zlib framing, whether the deflate blocks are stored or compressed. */
function inflate(zlib: Uint8Array): Uint8Array {
  // etiket emits stored blocks so that tests can read real pixels; walk them.
  let pos = 2
  const out: number[] = []
  for (;;) {
    const header = zlib[pos]!
    if ((header & 6) !== 0) throw new Error("only stored DEFLATE blocks are supported here")
    const length = zlib[pos + 1]! | (zlib[pos + 2]! << 8)
    pos += 5
    for (let i = 0; i < length; i++) out.push(zlib[pos + i]!)
    pos += length
    if (header & 1) break
  }
  return new Uint8Array(out)
}

/** Read a PNG into RGBA pixels. */
export function decodePNG(data: Uint8Array): DecodedPNG {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  for (const [i, byte] of signature.entries()) {
    if (data[i] !== byte) throw new Error("not a PNG")
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

  let pos = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let palette: Uint8Array<ArrayBufferLike> = new Uint8Array()
  const idat: number[] = []

  while (pos < data.length) {
    const length = view.getUint32(pos)
    const type = String.fromCharCode(...data.slice(pos + 4, pos + 8))
    const body = data.subarray(pos + 8, pos + 8 + length)
    if (type === "IHDR") {
      width = view.getUint32(pos + 8)
      height = view.getUint32(pos + 12)
      bitDepth = body[8]!
      colorType = body[9]!
      if (body[12] !== 0) throw new Error("interlaced PNG is not supported here")
    } else if (type === "PLTE") palette = body
    else if (type === "IDAT") for (const byte of body) idat.push(byte)
    else if (type === "IEND") break
    pos += 12 + length
  }

  if (bitDepth !== 8) throw new Error(`only 8 bit samples are supported here, got ${bitDepth}`)
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
  const pixels = unfilter(inflate(new Uint8Array(idat)), width, height, channels)

  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const source = i * channels
    let red: number
    let green: number
    let blue: number
    let alpha = 255
    if (colorType === 3) {
      const index = pixels[source]! * 3
      red = palette[index]!
      green = palette[index + 1]!
      blue = palette[index + 2]!
    } else if (channels === 1) {
      red = green = blue = pixels[source]!
    } else {
      red = pixels[source]!
      green = pixels[source + 1]!
      blue = pixels[source + 2]!
      if (channels === 4) alpha = pixels[source + 3]!
    }
    rgba[i * 4] = red
    rgba[i * 4 + 1] = green
    rgba[i * 4 + 2] = blue
    rgba[i * 4 + 3] = alpha
  }

  return { width, height, colorType, bitDepth, rgba }
}

/** A decoded PNG as the `ImageData` a reader expects. */
export function pngImageData(data: Uint8Array): ImageData {
  const { width, height, rgba } = decodePNG(data)
  return { data: rgba, width, height } as ImageData
}
