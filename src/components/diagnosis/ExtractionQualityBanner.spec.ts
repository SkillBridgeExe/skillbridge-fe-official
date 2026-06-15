import { describe, expect, it } from "vitest";
import { extractionBannerView } from "./ExtractionQualityBanner";
import type { ExtractionQuality } from "@shared/api";

const q = (over: Partial<ExtractionQuality>): ExtractionQuality => ({
  char_count: 2000,
  word_count: 300,
  mojibake_count: 0,
  mojibake_ratio: 0,
  wordlike_ratio: 0.9,
  section_count: 5,
  skill_count: 10,
  ocr_used: false,
  confidence: "high",
  flags: [],
  ...over,
});

describe("extractionBannerView", () => {
  it("renders nothing when quality is absent (undefined / null)", () => {
    expect(extractionBannerView(undefined)).toBeNull();
    expect(extractionBannerView(null)).toBeNull();
  });

  it("renders nothing for high confidence (the common case — no nagging)", () => {
    expect(extractionBannerView(q({ confidence: "high" }))).toBeNull();
  });

  it("low confidence → low tone + low message key + flags passthrough", () => {
    const view = extractionBannerView(q({ confidence: "low", flags: ["OCR_USED", "THIN_CONTENT"] }));
    expect(view).toEqual({
      tone: "low",
      messageKey: "review.extractionQuality.low",
      flags: ["OCR_USED", "THIN_CONTENT"],
    });
  });

  it("medium confidence → medium tone + medium message key", () => {
    const view = extractionBannerView(q({ confidence: "medium", flags: ["SPARSE_SECTIONS"] }));
    expect(view?.tone).toBe("medium");
    expect(view?.messageKey).toBe("review.extractionQuality.medium");
    expect(view?.flags).toEqual(["SPARSE_SECTIONS"]);
  });

  it("tolerates a missing flags array", () => {
    const view = extractionBannerView({ confidence: "low" } as unknown as ExtractionQuality);
    expect(view?.flags).toEqual([]);
  });
});
