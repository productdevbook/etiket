import { describe, expect, it } from "vitest";
import { renderBarcodeRaster, renderMatrixRaster } from "../src/renderers/png/rasterize";
import type { RasterData } from "../src/renderers/png/rasterize";

describe("renderBarcodeRaster", () => {
  it("returns raw pixel rows with correct dimensions", () => {
    const bars = [2, 1, 3, 1, 2];
    const result: RasterData = renderBarcodeRaster(bars, { scale: 1, height: 10, margin: 0 });
    expect(result.width).toBe(9);
    expect(result.height).toBe(10);
    expect(result.rows).toHaveLength(10);
    expect(result.rows[0]).toBeInstanceOf(Uint8Array);
    expect(result.rows[0]!.length).toBe(9);
  });

  it("has foreground pixels (1) in bar positions", () => {
    const bars = [2, 1, 2];
    const result = renderBarcodeRaster(bars, { scale: 1, height: 5, margin: 0 });
    const row = result.rows[0]!;
    // bars[0]=2 (fg), bars[1]=1 (bg), bars[2]=2 (fg)
    expect(row[0]).toBe(1);
    expect(row[1]).toBe(1);
    expect(row[2]).toBe(0);
    expect(row[3]).toBe(1);
    expect(row[4]).toBe(1);
  });

  it("applies margin", () => {
    const bars = [1];
    const result = renderBarcodeRaster(bars, { scale: 1, height: 1, margin: 5 });
    expect(result.width).toBe(11); // 1 + 5*2
    expect(result.height).toBe(11); // 1 + 5*2
    expect(result.rows).toHaveLength(11);
  });
});

describe("renderMatrixRaster", () => {
  it("returns raw pixel rows with correct dimensions", () => {
    const matrix = [
      [true, false],
      [false, true],
    ];
    const result: RasterData = renderMatrixRaster(matrix, { moduleSize: 1, margin: 0 });
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]![0]).toBe(1);
    expect(result.rows[0]![1]).toBe(0);
    expect(result.rows[1]![0]).toBe(0);
    expect(result.rows[1]![1]).toBe(1);
  });

  it("scales with moduleSize", () => {
    const matrix = [[true]];
    const result = renderMatrixRaster(matrix, { moduleSize: 4, margin: 0 });
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0]!.every((v) => v === 1)).toBe(true);
  });

  it("applies margin", () => {
    const matrix = [[true]];
    const result = renderMatrixRaster(matrix, { moduleSize: 2, margin: 1 });
    expect(result.width).toBe(6); // (1 + 1*2) * 2
    expect(result.height).toBe(6);
  });
});
