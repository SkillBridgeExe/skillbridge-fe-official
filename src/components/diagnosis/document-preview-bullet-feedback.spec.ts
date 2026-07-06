// Regression for the 2026-07-06 contract-sync audit: bullet_feedback was typed
// Record<string, BulletFeedbackItem> but the BE sends an ARRAY — the old
// string-keyed lookup + Object.entries walk over array indexes ("0", "1", …)
// never matched a bullet, so the per-bullet tooltip never rendered.
import { describe, expect, it } from "vitest";
import { findBulletFeedback } from "./DocumentPreview";
import type { BulletFeedbackItem } from "@shared/api";

const item = (text: string, over: Partial<BulletFeedbackItem> = {}): BulletFeedbackItem => ({
  text,
  section: "experience",
  verbFirst: true,
  quantified: false,
  weakOpener: false,
  firstPerson: false,
  fillerCount: 0,
  tips: ["Add a metric"],
  ...over,
});

describe("findBulletFeedback (array contract)", () => {
  const fixture: BulletFeedbackItem[] = [
    item("Built a React dashboard used by 2,000 students"),
    item("Responsible for team meetings", { verbFirst: false, weakOpener: true }),
  ];

  it("finds feedback for a bullet by exact text (whitespace-insensitive)", () => {
    const fb = findBulletFeedback("Built a React dashboard  used by 2,000 students", fixture);
    expect(fb).not.toBeNull();
    expect(fb!.tips).toEqual(["Add a metric"]);
  });

  it("falls back to containment for trimmed/extended variants", () => {
    const fb = findBulletFeedback("• Responsible for team meetings", fixture);
    expect(fb).not.toBeNull();
    expect(fb!.weakOpener).toBe(true);
  });

  it("returns null when nothing matches or the list is empty/absent", () => {
    expect(findBulletFeedback("Completely different bullet", fixture)).toBeNull();
    expect(findBulletFeedback("anything", [])).toBeNull();
    expect(findBulletFeedback("anything", undefined)).toBeNull();
  });
});
