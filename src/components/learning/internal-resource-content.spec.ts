import { describe, expect, it } from "vitest";
import { buildInternalResourceTask } from "./internal-resource-content";
import type { LearningSession } from "./types";

type Resource = LearningSession["resources"][number];

describe("buildInternalResourceTask", () => {
  it("turns an internal interview resource into an actionable in-app task", () => {
    const resource: Resource = {
      id: "english-l4-project",
      title: "English interview communication level 4 evidence project",
      url: "",
      type: "course",
      duration: "4h",
      platform: "Internal",
      isInternal: true,
      sourceType: "mini_project",
      outcomeType: "interview_answer",
      contentTemplateId: "skillbridge.english_proficiency.l4.project",
      description:
        "Internal SkillBridge English interview communication project for level 4 portfolio evidence.",
      proofOfCompletion: "Save the answer transcript in portfolio notes.",
    };

    const task = buildInternalResourceTask(resource);

    expect(task).toMatchObject({
      label: "Internal task",
      description:
        "Internal SkillBridge English interview communication project for level 4 portfolio evidence.",
      proofOfCompletion: "Save the answer transcript in portfolio notes.",
    });
    expect(task?.criteria).toContain("Answer in English for 90-120 seconds.");
    expect(task?.criteria.join(" ")).toContain("STAR");
  });

  it("does not create internal task copy for external resources", () => {
    const resource: Resource = {
      id: "react-docs",
      title: "React Quick Start",
      url: "https://react.dev/learn",
      type: "article",
      platform: "Official doc",
      isInternal: false,
    };

    expect(buildInternalResourceTask(resource)).toBeNull();
  });
});
