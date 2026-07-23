import { describe, expect, it } from "vitest";
import en from "./en";
import vi from "./vi";

describe("learning locale coverage", () => {
  it("localizes the roadmap loading message in both supported locales", () => {
    expect(en.common.learning.page).toHaveProperty("loading");
    expect(vi.common.learning.page).toHaveProperty("loading");
  });
});
