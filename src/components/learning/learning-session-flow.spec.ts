import { describe, expect, it } from "vitest";
import {
  getLearningContinueAction,
  isLearningSessionCompleted,
} from "./learning-session-flow";

describe("learning session completion source", () => {
  it("does not let a local marker override Learning V2 status from the server", () => {
    expect(
      isLearningSessionCompleted({
        status: "in-progress",
        hasServerRoadmap: true,
        hasLocalCompletionMarker: true,
      }),
    ).toBe(false);
  });

  it("keeps local completion as a fallback for a legacy roadmap", () => {
    expect(
      isLearningSessionCompleted({
        status: "in-progress",
        hasServerRoadmap: false,
        hasLocalCompletionMarker: true,
      }),
    ).toBe(true);
  });
});

describe("learning session Continue flow", () => {
  it("moves to the next section while learning", () => {
    expect(
      getLearningContinueAction({
        mode: "learn",
        nextSectionId: "forms",
        hasPracticeRequirements: true,
        hasIncompletePractice: true,
        hasQuiz: true,
      }),
    ).toEqual({ type: "section", sectionId: "forms" });
  });

  it("moves from the final learning section to practice", () => {
    expect(
      getLearningContinueAction({
        mode: "learn",
        hasPracticeRequirements: true,
        hasIncompletePractice: true,
        hasQuiz: true,
      }),
    ).toEqual({ type: "mode", mode: "practice" });
  });

  it("focuses incomplete work instead of disabling Continue", () => {
    expect(
      getLearningContinueAction({
        mode: "practice",
        hasPracticeRequirements: true,
        hasIncompletePractice: true,
        firstIncompleteSectionId: "semantic-html",
        hasQuiz: true,
      }),
    ).toEqual({ type: "incomplete", sectionId: "semantic-html" });
  });

  it("moves from completed practice to the optional check step", () => {
    expect(
      getLearningContinueAction({
        mode: "practice",
        hasPracticeRequirements: true,
        hasIncompletePractice: false,
        hasQuiz: true,
      }),
    ).toEqual({ type: "mode", mode: "check" });
  });

  it("completes the session from the check step", () => {
    expect(
      getLearningContinueAction({
        mode: "check",
        hasPracticeRequirements: true,
        hasIncompletePractice: false,
        hasQuiz: true,
      }),
    ).toEqual({ type: "complete" });
  });
});
