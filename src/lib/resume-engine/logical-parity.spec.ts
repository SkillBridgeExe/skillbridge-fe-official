import { describe, expect, it } from "vitest";
import { adaptCvBuilderStoreToResumeData } from "./adapter";
import { fixtureBuilderState, productionFixtures } from "./fixtures/production";
import { getTemplateLayoutCapabilities } from "./template-meta";

/**
 * Logical preview↔PDF parity: preview and download consume the same
 * adapter output (pdf/browser.tsx), so whatever this matrix pins down is
 * structurally guaranteed to hold in both. One case per production fixture
 * per representative template (one per layout family, same set as
 * adapter.spec.ts).
 */
const REPRESENTATIVE_TEMPLATES = ["azurill", "gengar", "onyx", "kakuna", "glalie"] as const;

const cases = productionFixtures.flatMap((fixture) =>
  REPRESENTATIVE_TEMPLATES.map((template) => [`${fixture.name} × ${template}`, fixture, template] as const),
);

describe("logical parity matrix (fixtures × representative templates)", () => {
  it.each(cases)("%s keeps layout, sections and ATS state intact", (label, fixture, template) => {
    const state = fixtureBuilderState(fixture);
    const resume = adaptCvBuilderStoreToResumeData({ ...state, template } as typeof state);
    const caps = getTemplateLayoutCapabilities(template);

    // Template selection survives adaptation (no silent fallback).
    expect(resume.metadata.template, label).toBe(template);

    // The planned page count is preserved for every template family.
    expect(resume.metadata.layout.pages, label).toHaveLength(fixture.plannedPages);

    // No visible section may vanish: every visible builtin with content and
    // every visible custom section must land on some page column.
    const placed = new Set(
      resume.metadata.layout.pages.flatMap((page) => [...page.main, ...page.sidebar]),
    );
    const visibility = fixture.doc.metadata.sectionVisibility;
    for (const section of fixture.doc.metadata.sectionOrder) {
      if (visibility[section] === false) continue;
      expect(placed.has(section), `${label}: lost section "${section}"`).toBe(true);
    }
    for (const custom of fixture.doc.sections.custom ?? []) {
      if (!custom.visible) continue;
      expect(placed.has(custom.id), `${label}: lost custom section "${custom.id}"`).toBe(true);
      expect(
        resume.customSections.some((section) => section.id === custom.id && !section.hidden),
        `${label}: custom section "${custom.id}" not in render data`,
      ).toBe(true);
    }

    // Sidebar-less templates must fold sidebar content into main, never drop it.
    if (!caps.supportsSidebar) {
      for (const page of resume.metadata.layout.pages) {
        for (const id of page.sidebar) {
          expect(placed.has(id), `${label}: sidebar id "${id}" unplaced`).toBe(true);
        }
      }
    }

    // ATS safe mode: avatar hidden and monochrome output, on every template.
    if (fixture.doc.metadata.resumeAtsSafeMode) {
      expect(resume.picture.hidden, label).toBe(true);
      expect(resume.metadata.design.colors.primary, label).toBe("#000000");
      expect(resume.metadata.page.hideSectionIcons, label).toBe(true);
    }

    // Avatar visibility follows template capability when ATS mode is off.
    if (!fixture.doc.metadata.resumeAtsSafeMode && state.photoUrl) {
      const supportsAvatar = getTemplateLayoutCapabilities(template).supportsAvatar;
      expect(resume.picture.hidden, `${label}: avatar visibility`).toBe(
        supportsAvatar ? !(fixture.doc.metadata.resumePictureVisible ?? true) : true,
      );
    }

    // Language must pass through untouched (localized fixtures).
    expect(resume.metadata.page.locale, label).toBe(fixture.doc.language === "vi" ? "vi-VN" : "en-US");
  });
});
