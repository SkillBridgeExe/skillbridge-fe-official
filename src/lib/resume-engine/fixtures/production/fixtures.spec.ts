import { describe, expect, it } from "vitest";
import { adaptCvBuilderStoreToResumeData } from "../../adapter";
import { builderStateToResumeDocumentV1 } from "../../document-v1-adapter";
import {
  buildImportBackupInvalid,
  buildImportBackupValid,
  cvDtoA,
  cvDtoB,
  fixtureBuilderState,
  productionFixtureByName,
  productionFixtures,
  versionSummaries,
} from "./index";

// Mirror of the import validator in StudioTopBar — the fixture must keep
// satisfying/violating the real gate.
const looksLikeValidBackup = (value: Record<string, unknown>) =>
  value.$schema === "skillbridge-cv-v1" &&
  Array.isArray(value.education) &&
  Array.isArray(value.experience) &&
  Array.isArray(value.projects);

describe("production fixture catalog", () => {
  it("covers the eight required fixture classes with unique names", () => {
    const names = productionFixtures.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining([
        "blank-first-resume",
        "fresher-one-page",
        "experienced-two-page",
        "long-cv-warn",
        "avatar-ats-off",
        "avatar-ats-on",
        "no-avatar-template",
        "custom-sidebar-placement",
        "localized-vi",
      ]),
    );
  });

  it.each(productionFixtures.map((f) => [f.name, f] as const))(
    "%s flows through document-v1 hydrate and the render adapter",
    (_name, fixture) => {
      const state = fixtureBuilderState(fixture);
      const resume = adaptCvBuilderStoreToResumeData(state);

      expect(resume.metadata.template, fixture.name).toBe(fixture.doc.metadata.templateId);
      expect(resume.metadata.layout.pages, fixture.name).toHaveLength(fixture.plannedPages);

      // Round-trip back into the document contract must not throw or lose
      // structural content.
      const doc = builderStateToResumeDocumentV1(state);
      expect(doc.basics.fullName, fixture.name).toBe(fixture.doc.basics.fullName);
      expect(doc.metadata.layout?.pages, fixture.name).toHaveLength(fixture.plannedPages);
      expect(doc.sections.custom ?? [], fixture.name).toHaveLength(fixture.doc.sections.custom?.length ?? 0);
    },
  );

  it("keeps avatar visibility honest per template capability and ATS mode", () => {
    const atsOff = adaptCvBuilderStoreToResumeData(
      fixtureBuilderState(productionFixtureByName.get("avatar-ats-off")!),
    );
    const atsOn = adaptCvBuilderStoreToResumeData(
      fixtureBuilderState(productionFixtureByName.get("avatar-ats-on")!),
    );
    const noAvatar = adaptCvBuilderStoreToResumeData(
      fixtureBuilderState(productionFixtureByName.get("no-avatar-template")!),
    );

    expect(atsOff.picture.hidden).toBe(false);
    expect(atsOn.picture.hidden).toBe(true);
    expect(noAvatar.picture.hidden).toBe(true);
  });

  it("places custom sections in their declared columns", () => {
    const resume = adaptCvBuilderStoreToResumeData(
      fixtureBuilderState(productionFixtureByName.get("custom-sidebar-placement")!),
    );
    const page = resume.metadata.layout.pages[0];

    expect(page.sidebar).toContain("custom_volunteering");
    expect(page.main).toContain("custom_awards");

    const volunteering = resume.customSections.find((s) => s.id === "custom_volunteering");
    expect(volunteering?.hidden).toBe(false);
  });

  it("contains no real-looking PII anywhere in the catalog", () => {
    const serialized = JSON.stringify({ productionFixtures, cvDtoA, cvDtoB, versionSummaries });
    const emails = serialized.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];

    expect(emails.length).toBeGreaterThan(0);
    for (const email of emails) {
      expect(email, email).toMatch(/@example\.com$/);
    }
    expect(serialized).not.toMatch(/gmail\.com|yahoo\.|skillbridge\.vn/i);
  });

  it("keeps byteRenderSafe fixtures ASCII-only so Helvetica can render them offline", () => {
    for (const fixture of productionFixtures.filter((f) => f.byteRenderSafe)) {
      const content = JSON.stringify({ basics: fixture.doc.basics, sections: fixture.doc.sections });
      expect(content, fixture.name).toMatch(/^[\x20-\x7E]*$/);
    }
    // And the VI fixture genuinely exercises diacritics.
    const vi = productionFixtureByName.get("localized-vi")!;
    expect(JSON.stringify(vi.doc.sections)).not.toMatch(/^[\x20-\x7E]*$/);
  });

  it("ships distinguishable CvDto fixtures for recover/restore assertions", () => {
    expect(cvDtoA.id).not.toBe(cvDtoB.id);
    expect(cvDtoA.title).not.toBe(cvDtoB.title);
    expect(cvDtoA.parsedJson?.contact.name).not.toBe(cvDtoB.parsedJson?.contact.name);
    expect(cvDtoA.parsedJson?.experience.length).toBeGreaterThan(0);
    expect(cvDtoB.parsedJson?.experience.length).toBeGreaterThan(0);
  });

  it("covers all three version origins", () => {
    expect(versionSummaries.map((v) => v.origin).sort()).toEqual([
      "AUTO_PRE_IMPORT",
      "AUTO_PRE_RESTORE",
      "MANUAL",
    ]);
  });

  it("import fixtures pass and fail the real backup gate respectively", () => {
    expect(looksLikeValidBackup(buildImportBackupValid())).toBe(true);
    expect(looksLikeValidBackup(buildImportBackupInvalid())).toBe(false);
  });
});
