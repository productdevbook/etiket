/**
 * A rasteriser for the tests, so that what the SVG renderers draw can be
 * decoded rather than measured.
 *
 * SVG is the library's main output and nothing read one back: the renderer
 * tests pull the rectangles out and check their geometry, which catches a
 * misplaced module but not a missing one. This draws the document instead —
 * the two shapes etiket emits, a `<rect>` per bar and one `<path>` of
 * axis-aligned rectangles per matrix — and hands the pixels to a reader.
 *
 * Everything here is test-only; nothing from `src/` is imported.
 */

interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

/** Every dark rectangle in the document, in user units. */
export function svgRectangles(svg: string): Rectangle[] {
  const out: Rectangle[] = []

  // <rect x= y= width= height=>, skipping the background, which is a percentage
  for (const match of svg.matchAll(
    /<rect\s+x=["']([\d.-]+)["']\s+y=["']([\d.-]+)["']\s+width=["']([\d.-]+)["']\s+height=["']([\d.-]+)["']/g,
  )) {
    out.push({
      x: Number(match[1]),
      y: Number(match[2]),
      width: Number(match[3]),
      height: Number(match[4]),
    })
  }

  // <path d="M x,y h w v h h-w z ...">, which is how a matrix and a postal
  // symbol are drawn
  for (const path of svg.matchAll(/<path[^>]*\sd=["']([^"']+)["']/g)) {
    for (const match of path[1]!.matchAll(
      /M(-?[\d.]+),(-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)h(-?[\d.]+)/g,
    )) {
      out.push({
        x: Number(match[1]),
        y: Number(match[2]),
        width: Number(match[3]),
        height: Number(match[4]),
      })
    }
  }

  return out
}

/**
 * Draw an SVG as pixels: white ground, every rectangle in black.
 *
 * `scale` is pixels per user unit, so a module drawn 6.9 units wide comes out
 * about 14 pixels at the default and a reader has something to work with.
 */
export function rasterizeSVG(svg: string, scale = 2): ImageData {
  const viewBox = /viewBox=["']0 0 ([\d.]+) ([\d.]+)["']/.exec(svg)
  if (!viewBox) throw new Error("no viewBox to rasterize")
  const width = Math.round(Number(viewBox[1]) * scale)
  const height = Math.round(Number(viewBox[2]) * scale)

  const data = new Uint8ClampedArray(width * height * 4)
  data.fill(255)

  for (const rectangle of svgRectangles(svg)) {
    const left = Math.round(rectangle.x * scale)
    const top = Math.round(rectangle.y * scale)
    const right = Math.round((rectangle.x + rectangle.width) * scale)
    const bottom = Math.round((rectangle.y + rectangle.height) * scale)
    for (let y = Math.max(0, top); y < Math.min(height, bottom); y++) {
      for (let x = Math.max(0, left); x < Math.min(width, right); x++) {
        const i = (y * width + x) * 4
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
    }
  }

  return { data, width, height } as ImageData
}
