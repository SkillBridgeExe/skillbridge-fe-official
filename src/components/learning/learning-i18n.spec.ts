import { describe, expect, it } from "vitest";
import en from "@/i18n/locales/en";
import vi from "@/i18n/locales/vi";

describe("learning roadmap i18n keys", () => {
  it("defines roadmap chrome keys in both English and Vietnamese", () => {
    for (const locale of [en, vi]) {
      expect(locale.common.learning.page.info).toBeTruthy();
      expect(locale.common.learning.common.weekShort).toBeTruthy();
      expect(locale.common.learning.common.starProgress).toBeTruthy();
      expect(locale.common.learning.common.mins).toBeTruthy();
      expect(locale.common.learning.common.matchScore).toBeTruthy();
      expect(locale.common.learning.common.qualityScore).toBeTruthy();
      expect(locale.common.learning.common.freshnessScore).toBeTruthy();
      expect(locale.common.learning.common.openCourse).toBeTruthy();
      expect(locale.common.learning.session.practiceTasks).toBeTruthy();
      expect(locale.common.learning.session.emptyResources).toBeTruthy();
      expect(locale.common.learning.session.savedCourses).toBeTruthy();
      expect(locale.common.learning.internal.label).toBeTruthy();
      expect(locale.common.learning.internal.defaultDescription).toBeTruthy();
    }
  });
});
