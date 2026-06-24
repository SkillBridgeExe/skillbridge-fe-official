import { describe, expect, it, vi } from "vitest";
import { getNextLearningSectionId, selectLearningSection } from "./session-navigation";
import type { LearningSection } from "./types";

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
});
