import { describe, expect, it } from "vitest";
import {
  DEFAULT_PDF_PAGE_SIZE,
  getPreviewCanvasScale,
  PAGE_CSS_SIZE,
  PDF_POINT_TO_CSS_PX,
} from "./preview.shared";

const MAX_DIMENSION = 4096;

describe("page unit parity (preview clipping regression)", () => {
  it("an A4 page rendered at PDF_POINT_TO_CSS_PX fits the A4 CSS box exactly", () => {
    // 595.28pt × (96/72) ≈ 793.7px — must never exceed the 794px wrapper,
    // and must not undershoot it by more than a hairline (the old 1.5
    // pageScale produced 893px inside a 794px box → both edges clipped).
    const cssWidth = DEFAULT_PDF_PAGE_SIZE.width * PDF_POINT_TO_CSS_PX;
    const cssHeight = DEFAULT_PDF_PAGE_SIZE.height * PDF_POINT_TO_CSS_PX;
    expect(cssWidth).toBeLessThanOrEqual(PAGE_CSS_SIZE.a4.width);
    expect(cssWidth).toBeGreaterThan(PAGE_CSS_SIZE.a4.width - 1);
    expect(cssHeight).toBeLessThanOrEqual(PAGE_CSS_SIZE.a4.height);
    expect(cssHeight).toBeGreaterThan(PAGE_CSS_SIZE.a4.height - 1);
  });

  it("a Letter page (612×792pt) fits the Letter CSS box exactly", () => {
    expect(612 * PDF_POINT_TO_CSS_PX).toBeCloseTo(PAGE_CSS_SIZE.letter.width, 5);
    expect(792 * PDF_POINT_TO_CSS_PX).toBeCloseTo(PAGE_CSS_SIZE.letter.height, 5);
  });
});

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
