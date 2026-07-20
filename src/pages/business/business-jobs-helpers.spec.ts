import { describe, expect, it } from "vitest";
import {
  canCreateBusinessJobDraft,
  normalizeBusinessJobSearch,
} from "./business-jobs-helpers";

describe("business jobs helpers", () => {
  it("requires a two-character draft title", () => {
    expect(canCreateBusinessJobDraft(" A ")).toBe(false);
    expect(canCreateBusinessJobDraft(" QA ")).toBe(true);
  });

  it("trims search text and omits an empty query", () => {
    expect(normalizeBusinessJobSearch("  frontend  ")).toBe("frontend");
    expect(normalizeBusinessJobSearch("   ")).toBeUndefined();
  });
});
