import { describe, expect, it } from "vitest";
import { assistantLocales } from "./assistant-locale";

// The assistant talks to the user in the UI language but writes CV text in the CV's language:
//   - conversation (questions/chips/messages the USER reads) → UI language
//   - output (the rewritten bullet that goes INTO the CV) → CV language
describe("assistantLocales", () => {
  it("VN CV + VN UI → both vi", () => {
    expect(assistantLocales({ uiLanguage: "vi", cvLanguage: "vi" })).toEqual({
      conversation: "vi",
      output: "vi",
    });
  });

  it("EN CV + VN UI → ask in vi, write the CV bullet in en", () => {
    expect(assistantLocales({ uiLanguage: "vi", cvLanguage: "en" })).toEqual({
      conversation: "vi",
      output: "en",
    });
  });

  it("VN CV + EN UI → ask in en, write the CV bullet in vi", () => {
    expect(assistantLocales({ uiLanguage: "en", cvLanguage: "vi" })).toEqual({
      conversation: "en",
      output: "vi",
    });
  });

  it("EN CV + EN UI → both en", () => {
    expect(assistantLocales({ uiLanguage: "en", cvLanguage: "en" })).toEqual({
      conversation: "en",
      output: "en",
    });
  });

  it("normalizes UI language tags ('vi-VN') and treats unknown UI as en", () => {
    expect(assistantLocales({ uiLanguage: "vi-VN", cvLanguage: "en" }).conversation).toBe("vi");
    expect(assistantLocales({ uiLanguage: "fr", cvLanguage: "vi" }).conversation).toBe("en");
  });
});
