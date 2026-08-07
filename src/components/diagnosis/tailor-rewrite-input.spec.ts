import { describe, expect, it } from "vitest";
import { resolveTailorRewriteInput, syncTailorRewriteText } from "./tailor-rewrite-input";

describe("resolveTailorRewriteInput", () => {
  it("prefers the exact bullet resolved by the backend", () => {
    expect(
      resolveTailorRewriteInput("Built the checkout API.", ["Guessed bullet"]),
    ).toEqual({
      initialText: "Built the checkout API.",
      requiresManualSelection: false,
    });
  });

  it("falls back to a non-empty bullet found in the current CV", () => {
    expect(resolveTailorRewriteInput(null, ["", "Reduced API latency."])).toEqual({
      initialText: "Reduced API latency.",
      requiresManualSelection: false,
    });
  });

  it("returns an explicit manual-selection state instead of an unexplained blank rewrite", () => {
    expect(resolveTailorRewriteInput(undefined, [])).toEqual({
      initialText: "",
      requiresManualSelection: true,
    });
  });
});

describe("syncTailorRewriteText", () => {
  it("hydrates a late-arriving bullet while the user has not edited the field", () => {
    expect(syncTailorRewriteText("", "Reduced API latency.", false)).toBe(
      "Reduced API latency.",
    );
  });

  it("never overwrites text after the user starts editing", () => {
    expect(syncTailorRewriteText("My draft", "Backend suggestion", true)).toBe("My draft");
  });
});
