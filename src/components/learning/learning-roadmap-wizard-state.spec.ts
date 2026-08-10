import { describe, expect, it } from "vitest";
import {
  buildCadenceDraft,
  buildPrioritySelection,
  buildResourceSelection,
  removeSkillId,
  reorderSkillIds,
  restoreSkillId,
} from "./learning-roadmap-wizard-state";

const candidates = [
  {
    skill_canonical: "react",
    display_name: "React",
    system_priority: 0.9,
    rationale: "",
    prerequisites: [],
  },
  {
    skill_canonical: "typescript",
    display_name: "TypeScript",
    system_priority: 0.8,
    rationale: "",
    prerequisites: [],
  },
];

describe("learning roadmap wizard state", () => {
  it("reorders only valid drag-and-drop IDs and treats invalid drops as no-op", () => {
    expect(
      reorderSkillIds(["react", "typescript", "node_js"], "node_js", "react"),
    ).toEqual(["node_js", "react", "typescript"]);
    expect(reorderSkillIds(["react", "typescript"], "missing", "react")).toEqual([
      "react",
      "typescript",
    ]);
    expect(reorderSkillIds(["react", "typescript"], "react", "missing")).toEqual([
      "react",
      "typescript",
    ]);
  });

  it("moves removed skills to ignored and restores them at the end without duplicates", () => {
    const removed = removeSkillId(["react", "typescript"], ["node_js"], "typescript");
    expect(removed).toEqual({
      ordered: ["react"],
      ignored: ["node_js", "typescript"],
    });
    expect(restoreSkillId(removed.ordered, removed.ignored, "typescript")).toEqual({
      ordered: ["react", "typescript"],
      ignored: ["node_js"],
    });
    expect(restoreSkillId(["react", "typescript"], ["node_js"], "react")).toEqual({
      ordered: ["react", "typescript"],
      ignored: ["node_js"],
    });
  });
  it("ranks only unique server candidates in the user's order", () => {
    expect(
      buildPrioritySelection(candidates, [
        "typescript",
        "unknown",
        "react",
        "typescript",
      ]),
    ).toEqual([
      { skill_canonical: "typescript", rank: 1 },
      { skill_canonical: "react", rank: 2 },
    ]);
  });

  it("builds a deadline-free cadence and rejects an invalid frequency", () => {
    expect(
      buildCadenceDraft({
        timezone: "Asia/Ho_Chi_Minh",
        startDate: "2026-09-01",
        studyDaysPerWeek: 3,
      }),
    ).toEqual({
      timezone: "Asia/Ho_Chi_Minh",
      start_date: "2026-09-01",
      study_days_per_week: 3,
      session_minutes: 60,
    });
    expect(() =>
      buildCadenceDraft({
        timezone: "Asia/Ho_Chi_Minh",
        startDate: "2026-09-01",
        studyDaysPerWeek: 0,
      }),
    ).toThrow("learning.wizard.errors.studyDaysRange");
    expect(() =>
      buildCadenceDraft({
        timezone: "Asia/Ho_Chi_Minh",
        startDate: "",
        studyDaysPerWeek: 3,
      }),
    ).toThrow("learning.wizard.errors.startDateRequired");
  });

  it("selects only server-curated primary resources by default", () => {
    expect(
      buildResourceSelection({
        modules: [
          {
            skill_canonical: "react",
            resources: [
              { id: "long-course", resource_role: "SUPPLEMENTARY" },
            ],
          },
          {
            skill_canonical: "typescript",
            resources: [
              { id: "primary-video", resource_role: "PRIMARY" },
              { id: "reference", resource_role: "SUPPLEMENTARY" },
            ],
          },
        ],
      }),
    ).toEqual({
      react: [],
      typescript: ["primary-video"],
    });
  });
});
