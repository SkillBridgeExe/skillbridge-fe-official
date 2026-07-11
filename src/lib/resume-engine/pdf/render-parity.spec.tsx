import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it, vi } from "vitest";

// The icon package re-exports thousands of per-icon ES modules, which EMFILEs
// vitest's transform pipeline on Windows. Icons are decorative — none of the
// parity assertions (page count, text, avatar image ops) depend on them — so
// stub the single runtime entry the templates use.
// ponytail: icon glyphs are absent from byte-render output; icon regressions are browser-smoke territory.
vi.mock("phosphor-icons-react-pdf/dynamic", () => ({
  Icon: () => null,
}));
import { adaptCvBuilderStoreToResumeData } from "../adapter";
import { fixtureBuilderState, productionFixtures } from "../fixtures/production";
import type { ResumeData } from "../schema/resume/data";
import { templateSchema, type Template } from "../schema/templates";
import { getTemplateLayoutCapabilities } from "../template-meta";
import { ResumeDocument } from "./document";

/**
 * Physical parity evidence: render real PDF bytes through the same
 * ResumeDocument the preview and the download button use, then measure the
 * result with pdf.js. This is the tier that catches what logical parity
 * cannot — actual page breaks, missing avatars, dropped text.
 *
 * Fonts: fixtures are ASCII-only and typography is forced to Helvetica (a
 * standard PDF font), so rendering needs no webfont fetch and stays
 * deterministic offline. Diacritic (VI) fixtures are covered by logical
 * parity + browser smoke instead.
 */
const requireFromHere = createRequire(import.meta.url);
const standardFontDataUrl = join(dirname(requireFromHere.resolve("pdfjs-dist/package.json")), "standard_fonts") + "/";

const REPRESENTATIVE_TEMPLATES: Template[] = ["azurill", "gengar", "onyx", "kakuna", "glalie"];
// ponytail: CI renders the 5 representative templates; PARITY_ALL=1 sweeps all 15 (release candidate / manual).
const templatesUnderTest: Template[] = process.env.PARITY_ALL
  ? templateSchema.options
  : REPRESENTATIVE_TEMPLATES;

const byteRenderFixtures = productionFixtures.filter((fixture) => fixture.byteRenderSafe);

const withStandardFonts = (data: ResumeData): ResumeData => ({
  ...data,
  metadata: {
    ...data.metadata,
    typography: {
      ...data.metadata.typography,
      body: { ...data.metadata.typography.body, fontFamily: "Helvetica", fontWeights: ["400", "700"] },
      heading: { ...data.metadata.typography.heading, fontFamily: "Helvetica", fontWeights: ["400", "700"] },
    },
  },
});

type ParsedPdf = {
  numPages: number;
  pages: Array<{ compactText: string; imageOps: number }>;
};

async function parsePdf(buffer: Uint8Array): Promise<ParsedPdf> {
  const loadingTask = getDocument({ data: buffer, standardFontDataUrl });
  const doc = await loadingTask.promise;
  const pages: ParsedPdf["pages"] = [];
  for (let index = 1; index <= doc.numPages; index += 1) {
    const page = await doc.getPage(index);
    const textContent = await page.getTextContent();
    const compactText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join("")
      .toLowerCase()
      .replace(/\s+/g, "");
    const operators = await page.getOperatorList();
    const imageOps = operators.fnArray.filter(
      (fn) => fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject,
    ).length;
    pages.push({ compactText, imageOps });
  }
  const numPages = doc.numPages;
  await loadingTask.destroy();
  return { numPages, pages };
}

const compact = (value: string) => value.toLowerCase().replace(/\s+/g, "");

async function renderFixture(fixtureName: string, template: Template): Promise<ParsedPdf> {
  const fixture = byteRenderFixtures.find((f) => f.name === fixtureName)!;
  const data = withStandardFonts(
    adaptCvBuilderStoreToResumeData({ ...fixtureBuilderState(fixture), template }),
  );
  const buffer = await renderToBuffer(<ResumeDocument data={data} template={template} />);
  return parsePdf(new Uint8Array(buffer));
}

describe("physical PDF parity (byte render)", () => {
  const cases = byteRenderFixtures.flatMap((fixture) =>
    templatesUnderTest.map((template) => [`${fixture.name} × ${template}`, fixture.name, template] as const),
  );

  it.each(cases)(
    "%s renders the planned pages without losing content",
    async (label, fixtureName, template) => {
      const fixture = byteRenderFixtures.find((f) => f.name === fixtureName)!;
      const parsed = await renderFixture(fixtureName, template);

      // Physical page count may exceed the plan (dense content on airy
      // templates wraps — that is exactly what the in-app overflow warning
      // reports). What must never happen is a template DROPPING a planned
      // page, so the floor is strict.
      if (fixture.name === "long-cv-warn") {
        // The honesty case: the plan promises one page, the content does not fit.
        expect(parsed.numPages, `${label}: expected physical overflow`).toBeGreaterThan(fixture.plannedPages);
      } else if (fixture.name === "blank-first-resume") {
        expect(parsed.numPages, `${label}: blank resume must stay one page`).toBe(1);
      } else {
        expect(parsed.numPages, `${label}: planned page dropped`).toBeGreaterThanOrEqual(fixture.plannedPages);
      }

      // The document owner's name must actually appear in the rendered bytes.
      const fullName = compact(fixture.doc.basics.fullName);
      if (fullName) {
        expect(parsed.pages[0].compactText, `${label}: full name missing from page 1`).toContain(fullName);
      }

      // No section content may vanish from the rendered bytes. Content, not
      // section titles, is the invariant — some templates render e.g. the
      // summary as an untitled intro paragraph by design.
      const allText = parsed.pages.map((page) => page.compactText).join("");
      const contentProbes: Array<[string, string]> = [];
      if (fixture.doc.sections.summary.content) {
        contentProbes.push(["summary content", compact(fixture.doc.sections.summary.content).slice(0, 30)]);
      }
      for (const exp of fixture.doc.sections.experience.items) {
        contentProbes.push([`experience "${exp.company}"`, compact(exp.company)]);
      }
      for (const edu of fixture.doc.sections.education.items) {
        contentProbes.push([`education "${edu.school}"`, compact(edu.school)]);
      }
      for (const skill of fixture.doc.sections.skills.technicalSkills.slice(0, 1)) {
        contentProbes.push([`skill "${skill}"`, compact(skill)]);
      }
      for (const cert of fixture.doc.sections.certifications.items) {
        contentProbes.push([`certification "${cert.name}"`, compact(cert.name)]);
      }
      for (const [what, probe] of contentProbes) {
        expect(allText, `${label}: ${what} missing from rendered bytes`).toContain(probe);
      }

      // Custom section content must render, not just resolve.
      for (const custom of fixture.doc.sections.custom ?? []) {
        if (!custom.visible) continue;
        expect(allText, `${label}: custom section "${custom.title}" missing`).toContain(compact(custom.title));
      }
    },
    30_000,
  );

  it.each(templatesUnderTest.map((template) => [template] as const))(
    "avatar visibility matches ATS mode in rendered bytes (%s)",
    async (template) => {
      const caps = getTemplateLayoutCapabilities(template);

      const atsOff = await renderFixture("avatar-ats-off", template);
      const atsOffImages = atsOff.pages.reduce((sum, page) => sum + page.imageOps, 0);
      if (caps.supportsAvatar) {
        expect(atsOffImages, `${template}: avatar should render when ATS mode is off`).toBeGreaterThan(0);
      } else {
        expect(atsOffImages, `${template}: template has no avatar slot`).toBe(0);
      }

      const atsOn = await renderFixture("avatar-ats-on", template);
      const atsOnImages = atsOn.pages.reduce((sum, page) => sum + page.imageOps, 0);
      expect(atsOnImages, `${template}: ATS mode must hide the avatar`).toBe(0);
    },
    60_000,
  );
});
