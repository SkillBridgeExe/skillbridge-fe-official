import { describe, expect, it } from "vitest";
import { getLearningPageState } from "./learning-page-state";

describe("learning page state", () => {
  it("distinguishes a failed load from an empty server result", () => {
    expect(getLearningPageState("loading", false)).toBe("loading");
    expect(getLearningPageState("error", false)).toBe("error");
    expect(getLearningPageState("ready", false)).toBe("empty");
    expect(getLearningPageState("error", true)).toBe("content");
  });
});
