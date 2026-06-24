import { describe, it, expect } from "vitest";
import en from "@/i18n/locales/en";
import vi from "@/i18n/locales/vi";

const FOCUSES = ["cv_audit", "skills_analysis", "market_careers", "gap_results"] as const;

describe("companion.chat.suggestionsByFocus parity", () => {
  for (const locale of [{ name: "en", t: en }, { name: "vi", t: vi }]) {
    it(`${locale.name} has 3 chips for every focus`, () => {
      const byFocus = (
        locale.t as unknown as {
          diagnosis: { companion: { chat: { suggestionsByFocus: Record<string, string[]> } } };
        }
      ).diagnosis.companion.chat.suggestionsByFocus;
      for (const f of FOCUSES) {
        expect(Array.isArray(byFocus[f]), `${locale.name}.${f}`).toBe(true);
        expect(byFocus[f].length).toBe(3);
      }
    });
  }
});
