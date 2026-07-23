import { describe, expect, it, vi } from "vitest";
import {
  getNextLearningSectionId,
  orderLearningSessions,
  selectLearningSection,
} from "./session-navigation";
import type { LearningSection, WeekPlan } from "./types";

const sections = [
  { id: "intro", title: "Intro" },
  { id: "automation", title: "Automation" },
] as LearningSection[];

describe("learning session navigation", () => {
  it("resolves the next section id from the active section", () => {
    expect(getNextLearningSectionId(sections, "intro")).toBe("automation");
    expect(getNextLearningSectionId(sections, "automation")).toBeUndefined();
  });

  it("selects the section and scrolls its content into view", () => {
    const scrollIntoView = vi.fn();
    const onSelectSection = vi.fn();
    const doc = {
      getElementById: vi.fn(() => ({ scrollIntoView })),
    };

    selectLearningSection("automation", onSelectSection, doc);

    expect(onSelectSection).toHaveBeenCalledWith("automation");
    expect(doc.getElementById).toHaveBeenCalledWith("section-automation");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("orders sessions by module rank and then sequence when numbers repeat", () => {
    const weeks = [
      week(2, [session("module-2-session-2", 2), session("module-2-session-1", 1)]),
      week(1, [session("module-1-session-2", 2), session("module-1-session-1", 1)]),
    ];

    expect(orderLearningSessions(weeks).map((session) => session.id)).toEqual([
      "module-1-session-1",
      "module-1-session-2",
      "module-2-session-1",
      "module-2-session-2",
    ]);
  });
});

function week(weekNumber: number, sessions: WeekPlan["sessions"]): WeekPlan {
  return {
    weekNumber,
    moduleId: `module-${weekNumber}`,
    moduleTitle: `Module ${weekNumber}`,
    sessions,
  };
}

function session(id: string, sessionNumber: number): WeekPlan["sessions"][number] {
  return {
    id,
    moduleId: id.startsWith("module-1") ? "module-1" : "module-2",
    sessionNumber,
    title: id,
    skill: "HTML",
    dayOfWeek: 1,
    estimatedMinutes: 60,
    status: "in-progress",
    stars: 0,
    maxStars: 5,
    sections: [],
    resources: [],
  };
}
