import { describe, it, expect } from "vitest";
import en from "@/i18n/locales/en";
import vi from "@/i18n/locales/vi";

// market_careers/gap_results carry a 4th cross-JD suggestion ("Which JD fits me
// best?") on top of the original 3 (M2 cross-JD suggestion chip).
const EXPECTED_COUNTS: Record<string, number> = {
  cv_audit: 3,
  skills_analysis: 3,
  market_careers: 4,
  gap_results: 4,
};

describe("companion.chat.suggestionsByFocus parity", () => {
  for (const locale of [{ name: "en", t: en }, { name: "vi", t: vi }]) {
    it(`${locale.name} has the expected chip count for every focus`, () => {
      const byFocus = (
        locale.t as unknown as {
          diagnosis: { companion: { chat: { suggestionsByFocus: Record<string, string[]> } } };
        }
      ).diagnosis.companion.chat.suggestionsByFocus;
      for (const [f, count] of Object.entries(EXPECTED_COUNTS)) {
        expect(Array.isArray(byFocus[f]), `${locale.name}.${f}`).toBe(true);
        expect(byFocus[f].length).toBe(count);
      }
    });
  }
});
