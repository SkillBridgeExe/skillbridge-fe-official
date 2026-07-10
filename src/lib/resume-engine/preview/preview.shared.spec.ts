import { describe, expect, it } from "vitest";
import { DEFAULT_PDF_PAGE_SIZE, getPreviewCanvasScale } from "./preview.shared";

const MAX_DIMENSION = 4096;

describe("getPreviewCanvasScale", () => {
  it("renders at screen density with mild headroom, never the old fixed 4x", () => {
    // window is undefined in the node env → dpr falls back to 1 → floor 1.5.
    const scale = getPreviewCanvasScale(300, 424);
    expect(scale).toBe(1.5);
  });

  it("never produces a canvas side above the GPU texture limit (compositor freeze regression)", () => {
    // Portrait A4 at the builder's preview size: the old area-only cap
    // produced 3444x4871 — the >4096 side froze Chromium's compositor the
    // moment any overlay opened next to the preview.
    const width = DEFAULT_PDF_PAGE_SIZE.width * 1.5;
    const height = DEFAULT_PDF_PAGE_SIZE.height * 1.5;
    const scale = getPreviewCanvasScale(width, height);

    expect(Math.floor(width * scale)).toBeLessThanOrEqual(MAX_DIMENSION);
    expect(Math.floor(height * scale)).toBeLessThanOrEqual(MAX_DIMENSION);
  });

  it("still honors the total pixel budget for square-ish pages", () => {
    const scale = getPreviewCanvasScale(3000, 3000);
    expect(3000 * scale * 3000 * scale).toBeLessThanOrEqual(16_777_216 + 1);
    expect(3000 * scale).toBeLessThanOrEqual(MAX_DIMENSION);
  });

  it.each([
    [400, 566],
    [595.28, 841.89],
    [892.92, 1262.84],
    [1200, 1697],
    [4000, 5657],
  ])("dimensions stay within limits for %spx x %spx", (width, height) => {
    const scale = getPreviewCanvasScale(width, height);
    expect(width * scale).toBeLessThanOrEqual(MAX_DIMENSION + 1);
    expect(height * scale).toBeLessThanOrEqual(MAX_DIMENSION + 1);
    expect(width * scale * height * scale).toBeLessThanOrEqual(16_777_216 * 1.01);
    expect(scale).toBeGreaterThan(0);
  });
});
