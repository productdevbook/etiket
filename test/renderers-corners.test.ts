import { describe, expect, it } from "vitest"
import { getFinderOuterPath, getFinderInnerPath } from "../src/renderers/svg/shapes"

/**
 * Parse an SVG path string into a list of {command, args} segments.
 * Handles M, m, h, v, a, l, z and their uppercase variants.
 */
function parsePath(d: string): Array<{ cmd: string; args: number[] }> {
  const segments: Array<{ cmd: string; args: number[] }> = []
  const re = /([MmHhVvAaLlZz])([^MmHhVvAaLlZz]*)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(d)) !== null) {
    const cmd = match[1]!
    const raw = match[2]!.trim()
    const args = raw.length > 0 ? raw.split(/[\s,]+/).map(Number) : []
    segments.push({ cmd, args })
  }
  return segments
}

/**
 * Walk an SVG path and return every absolute point the pen visits
 * (start of each segment + arc/line endpoints).
 */
function tracePoints(d: string): Array<[number, number]> {
  const segs = parsePath(d)
  const points: Array<[number, number]> = []
  let cx = 0
  let cy = 0
  for (const { cmd, args } of segs) {
    switch (cmd) {
      case "M":
        cx = args[0]!
        cy = args[1]!
        points.push([cx, cy])
        break
      case "h":
        cx += args[0]!
        points.push([cx, cy])
        break
      case "H":
        cx = args[0]!
        points.push([cx, cy])
        break
      case "v":
        cy += args[0]!
        points.push([cx, cy])
        break
      case "V":
        cy = args[0]!
        points.push([cx, cy])
        break
      case "a": {
        // relative arc: last two args are dx, dy
        for (let i = 0; i < args.length; i += 7) {
          cx += args[i + 5]!
          cy += args[i + 6]!
          points.push([cx, cy])
        }
        break
      }
      case "l":
        cx += args[0]!
        cy += args[1]!
        points.push([cx, cy])
        break
      case "z":
      case "Z":
        break
    }
  }
  return points
}

/**
 * Extract bounding box from traced path points.
 */
function pathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const pts = tracePoints(d)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of pts) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

describe("finder pattern corner shapes", () => {
  const moduleSize = 10
  const x = 0
  const y = 0
  const finderSize = moduleSize * 7 // 70

  describe.each(["square", "rounded", "extra-rounded", "classy", "dots"] as const)(
    "outer shape: %s",
    (shape) => {
      const d = getFinderOuterPath(x, y, moduleSize, shape)

      it("produces non-empty path data", () => {
        expect(d.length).toBeGreaterThan(0)
      })

      if (shape !== "dots") {
        it("outer path stays within the 7×7 module bounding box", () => {
          const bounds = pathBounds(d)
          expect(bounds.minX).toBeGreaterThanOrEqual(x - 0.01)
          expect(bounds.minY).toBeGreaterThanOrEqual(y - 0.01)
          expect(bounds.maxX).toBeLessThanOrEqual(x + finderSize + 0.01)
          expect(bounds.maxY).toBeLessThanOrEqual(y + finderSize + 0.01)
        })
      }

      it("contains exactly 2 sub-paths (outer boundary + inner hole)", () => {
        const mCount = (d.match(/M/g) || []).length
        expect(mCount).toBe(2)
      })

      it("inner hole stays within outer boundary", () => {
        // Split at second M to get outer and inner paths
        const secondM = d.indexOf("M", 1)
        const outerD = d.substring(0, secondM)
        const innerD = d.substring(secondM)

        const outerBounds = pathBounds(outerD)
        const innerBounds = pathBounds(innerD)

        // Inner must be strictly inside outer
        expect(innerBounds.minX).toBeGreaterThan(outerBounds.minX - 0.01)
        expect(innerBounds.minY).toBeGreaterThan(outerBounds.minY - 0.01)
        expect(innerBounds.maxX).toBeLessThan(outerBounds.maxX + 0.01)
        expect(innerBounds.maxY).toBeLessThan(outerBounds.maxY + 0.01)
      })
    },
  )

  describe.each(["square", "rounded", "dots"] as const)("inner shape: %s", (shape) => {
    const d = getFinderInnerPath(x, y, moduleSize, shape)

    it("produces non-empty path data", () => {
      expect(d.length).toBeGreaterThan(0)
    })

    it("inner dot is centered at 3.5 modules", () => {
      const bounds = pathBounds(d)
      const centerX = (bounds.minX + bounds.maxX) / 2
      const centerY = (bounds.minY + bounds.maxY) / 2
      const expectedCenter = moduleSize * 3.5
      expect(centerX).toBeCloseTo(expectedCenter, 1)
      expect(centerY).toBeCloseTo(expectedCenter, 1)
    })

    it("inner dot size is 3 modules", () => {
      const bounds = pathBounds(d)
      const width = bounds.maxX - bounds.minX
      // For circles, traced endpoints only capture horizontal extent (arcs go above/below),
      // but width = diameter is sufficient to verify size since circles are symmetric
      expect(width).toBeCloseTo(moduleSize * 3, 1)
    })
  })

  describe("rounded corner geometry regression", () => {
    it("inner hole of rounded shape matches expected dimensions", () => {
      const d = getFinderOuterPath(0, 0, 10, "rounded")
      // Inner hole: starts at (moduleSize, moduleSize) = (10,10), size = 5*moduleSize = 50
      const secondM = d.indexOf("M", 1)
      const innerD = d.substring(secondM)
      const bounds = pathBounds(innerD)

      // Inner rect should be at (10,10) with size 50x50
      expect(bounds.minX).toBeCloseTo(10, 0)
      expect(bounds.minY).toBeCloseTo(10, 0)
      expect(bounds.maxX).toBeCloseTo(60, 0)
      expect(bounds.maxY).toBeCloseTo(60, 0)
    })

    it("inner hole of extra-rounded shape matches expected dimensions", () => {
      const d = getFinderOuterPath(0, 0, 10, "extra-rounded")
      const secondM = d.indexOf("M", 1)
      const innerD = d.substring(secondM)
      const bounds = pathBounds(innerD)

      expect(bounds.minX).toBeCloseTo(10, 0)
      expect(bounds.minY).toBeCloseTo(10, 0)
      expect(bounds.maxX).toBeCloseTo(60, 0)
      expect(bounds.maxY).toBeCloseTo(60, 0)
    })

    it("offset finder patterns stay within bounds", () => {
      // Test with non-zero origin to catch offset bugs
      const ox = 50
      const oy = 80
      for (const shape of ["rounded", "extra-rounded", "classy"] as const) {
        const d = getFinderOuterPath(ox, oy, moduleSize, shape)
        const bounds = pathBounds(d)
        expect(bounds.minX).toBeGreaterThanOrEqual(ox - 0.01)
        expect(bounds.minY).toBeGreaterThanOrEqual(oy - 0.01)
        expect(bounds.maxX).toBeLessThanOrEqual(ox + finderSize + 0.01)
        expect(bounds.maxY).toBeLessThanOrEqual(oy + finderSize + 0.01)
      }
    })
  })
})
