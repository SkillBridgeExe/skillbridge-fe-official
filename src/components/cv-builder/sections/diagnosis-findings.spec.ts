import { describe, it, expect } from "vitest";
import { buildDiagnosisFindingRows } from "./diagnosis-findings";
import type { CvReviewData } from "@shared/api";
import type { ResumeDocumentV1 } from "@/lib/resume-engine/document-v1";

const docWith = (bullet: string): ResumeDocumentV1 =>
  ({
    sections: {
      summary: { content: "" },
      experience: { items: [{ id: "e1", description: bullet, responsibilities: "", achievements: "" }] },
      projects: { items: [] },
    },
  }) as unknown as ResumeDocumentV1;

const review = {
  overallScore: 60,
  bullet_feedback: [
    {
      text: "Làm việc với team phát triển web",
      section: "experience",
      tips: ["Mở đầu bằng động từ hành động", "Thêm kết quả đo được"],
    },
    { text: "Bullet sạch không tip", section: "experience", tips: [] },
  ],
  top_summary: { headline: "x", prioritized_actions: ["Thêm số liệu vào kinh nghiệm"] },
} as unknown as CvReviewData;

describe("buildDiagnosisFindingRows", () => {
  it("returns [] when reviewData is null (honest-empty)", () => {
    expect(buildDiagnosisFindingRows({ reviewData: null, gapReport: null, document: docWith("x") })).toEqual([]);
  });

  it("maps bullet_feedback tips verbatim with a resolvable anchor when bullet still in draft", () => {
    const rows = buildDiagnosisFindingRows({
      reviewData: review,
      gapReport: null,
      document: docWith("Làm việc với team phát triển web"),
    });
    const bulletRow = rows.find((r) => r.id.startsWith("bullet:"));
    expect(bulletRow?.label).toBe("Mở đầu bằng động từ hành động · Thêm kết quả đo được");
    expect(bulletRow?.anchor?.ok).toBe(true);
    // bullet KHÔNG có tips không sinh row
    expect(rows.filter((r) => r.id.startsWith("bullet:"))).toHaveLength(1);
  });

  it("marks the anchor unresolved after the bullet text changed (staleness)", () => {
    const rows = buildDiagnosisFindingRows({
      reviewData: review,
      gapReport: null,
      document: docWith("Dẫn dắt team 3 người xây web app"),
    });
    const bulletRow = rows.find((r) => r.id.startsWith("bullet:"));
    expect(bulletRow?.anchor && !bulletRow.anchor.ok).toBe(true);
  });

  it("surfaces prioritized_actions as non-anchorable info rows, sau các bullet rows", () => {
    const rows = buildDiagnosisFindingRows({ reviewData: review, gapReport: null, document: docWith("x") });
    const action = rows.find((r) => r.id.startsWith("action:"));
    expect(action?.label).toBe("Thêm số liệu vào kinh nghiệm");
    expect(action?.anchor).toBeNull();
    expect(rows.findIndex((r) => r.id.startsWith("action:"))).toBeGreaterThan(
      rows.findIndex((r) => r.id.startsWith("bullet:")),
    );
  });
});
