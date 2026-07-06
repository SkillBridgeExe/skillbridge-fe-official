# W56 - Resume Studio Final Product Hardening

> Owner: Antigravity  
> Reviewer: Codex  
> Branch: continue on `feat/cv-builder-re-ux-v3`  
> Depends on: W50-W55 committed on this branch  
> Product bar: this is the final pre-merge polish pass for the Resume Studio. Do not add a large new feature. Make the current builder feel trustworthy, stable, localized, and demo-safe.

## Why This Exists

W50-W55 made the CV Builder much closer to a real resume editor:

- studio layout inspired by Reactive Resume, but still SkillBridge-light;
- real `ResumeDocumentV1` contract;
- safe JSON patch validation;
- diagnosis evidence anchors;
- assistant-applied fixes now mark section scores as stale and offer re-check.

W56 is the final hardening pass before merging this branch. The goal is to catch the remaining product issues users notice immediately:

- preview flicker or blank preview during ordinary editing;
- raw PDF/react errors leaking into UI;
- top bar / preview / inspector copy not fully localized;
- controls that look enabled but are not reliable;
- missing loading/error/empty states around save, analyze, download, preview, template change, and re-check;
- mobile/tablet awkwardness from the studio layout.

## Non-Negotiables

- Do not change BE/NestJS.
- Do not change diagnosis scoring, CV/JD matching, job recommendation, roadmap, interview, learning, auth, billing, or APIs.
- Do not copy Reactive Resume code.
- Do not add fake controls.
- Do not add a new dependency unless absolutely necessary and approved.
- Do not convert the builder to dark UI.
- Do not break W52/W53/W54/W55 safety:
  - patch validation still runs before assistant apply;
  - diagnosis fix still jumps to the exact field;
  - assistant/diagnosis edits still create stale re-check feedback;
  - re-check success still clears stale feedback;
  - re-check failure still keeps stale feedback.
- Every new visible string, title, tooltip, aria-label, error message, empty state, and fallback must be in `src/i18n/locales/vi.ts` and `src/i18n/locales/en.ts`.
- Leave unrelated untracked files alone, especially `docs/production-validation-report.html` if it is still present.

## Files To Inspect First

- `src/components/cv-builder/CvPreviewPanel.tsx`
- `src/components/cv-builder/preview/PdfRendererWrapper.tsx`
- `src/components/cv-builder/preview/TemplatePicker.tsx`
- `src/components/cv-builder/studio/StudioTopBar.tsx`
- `src/components/cv-builder/studio/StudioInspector.tsx`
- `src/components/cv-builder/CvFormPanel.tsx`
- `src/components/cv-builder/CvSectionNav.tsx`
- `src/components/cv-builder/sections/ReviewSection.tsx`
- `src/store/useCvBuilderStore.ts`
- `src/i18n/locales/vi.ts`
- `src/i18n/locales/en.ts`
- Existing specs around CV builder, preview, and resume engine.

Also read:

- `docs/tasks/W50-resume-studio-production-grade-master-AG.md`
- `docs/tasks/W51-resume-document-contract-v1-AG.md`
- `docs/tasks/W52-resume-json-patch-proposal-AG.md`
- `docs/tasks/W53-resume-assistant-patch-wire-AG.md`
- `docs/tasks/W54-diagnosis-evidence-anchor-AG.md`
- `docs/tasks/W55-resume-fix-outcome-ledger-AG.md`

## Task 1 - Preview Stability Audit

**Files:**

- Modify: `src/components/cv-builder/CvPreviewPanel.tsx`
- Modify: `src/components/cv-builder/preview/PdfRendererWrapper.tsx`
- Add focused tests if practical.

Audit the preview update path:

```txt
builder store -> getResumeData() -> debounce -> PdfRendererWrapper -> createResumePdfBlob -> PdfCanvasDocument
```

Fix only real issues found. Target behavior:

- No full white/blank flash during ordinary typing if a previous PDF blob exists.
- While rendering a new version, keep showing the previous stable preview with a small "updating" indicator.
- If rendering fails after a previous preview exists, keep the previous preview visible and show a non-blocking warning.
- If first render fails and no preview exists, show a clean error card with:
  - friendly localized message;
  - retry button;
  - technical details hidden under disclosure.
- Do not show raw error text as the main large headline.
- Avoid remounting the whole PDF canvas unless data/template actually changed.

Important:

- The current wrapper already keeps `pdfBlob` on some errors. Preserve and tighten that behavior.
- Do not increase debounce so much that preview feels dead.
- Do not remove the PDF canvas path.

Suggested tests:

1. first render failure shows friendly error + retry;
2. render failure after a successful blob keeps old preview and shows temporary warning;
3. changing data renders again without clearing old blob first.

If a test is too hard because pdf.js/browser canvas is heavy, extract a small pure state helper and test that.

## Task 2 - i18n Hardening Pass

**Files:**

- Modify: `src/components/cv-builder/**`
- Modify: `src/i18n/locales/vi.ts`
- Modify: `src/i18n/locales/en.ts`

Run grep and eliminate newly introduced hardcoded user-facing strings in CV Builder files.

Required grep:

```powershell
rg -n "defaultValue:|isVi \\?|currentLang ===|Technical details|Temporary error|Retry|Untitled Resume|Download CV|AI Assistant|Đang|Lỗi|Thử lại|Tải xuống|CV chưa đặt tên" src/components/cv-builder src/i18n/locales
```

Rules:

- `defaultValue` is acceptable only for legacy copy already outside W50-W56 scope. For touched files, prefer real locale keys.
- `isVi ? "..." : "..."` should be replaced with `t(...)` unless it is purely internal and not rendered.
- `title` attributes count as visible UX copy and need i18n.
- If a string appears in error, tooltip, empty state, button text, label, placeholder, or aria-label, add both VI/EN keys.

Acceptance:

- No new hardcoded EN/VI strings remain in touched CV Builder UI.
- Locale keys are placed under existing `builder.*` / `builder.preview.*` / `builder.studio.*` patterns, not random root keys.

## Task 3 - Top Bar Reliability + Accessibility

**Files:**

- Modify: `src/components/cv-builder/studio/StudioTopBar.tsx`
- Modify locale files.
- Add a small spec if there is an existing feasible test pattern.

Polish the top bar actions:

- Back button has localized accessible label/title.
- Resume title input has localized `aria-label`.
- Save, AI Assistant, Analyze, Download have localized `aria-label` and `title`.
- Buttons clearly disable while pending:
  - save while saving;
  - analyze while analyzing;
  - download while rendering.
- Local-only/server-unavailable toast copy is clear:
  - no draft on server => user understands save/analyze/download cannot run yet.
- Download file name should be safe:
  - trim title;
  - replace path-unsafe chars;
  - fallback to `skillbridge-cv`.

Do not change the navigation flow unless you find a concrete bug.

## Task 4 - Template Picker Final Usability

**Files:**

- Modify: `src/components/cv-builder/preview/TemplatePicker.tsx`
- Modify: `src/lib/resume-engine/template-meta.ts` only if metadata is wrong.
- Modify locale files if any visible copy changes.

Check the template picker against the product bar:

- Cards should not look like 12 identical blank white cards.
- Each template card should show a meaningful thumbnail or distinct skeleton:
  - one-column vs two-column;
  - sidebar vs no sidebar;
  - header/accent variation.
- Selected state is obvious.
- Template description/tags are localized.
- If a template is not reliable, disable it honestly with localized reason.
- Switching templates must not reset CV data.

Do not invent a template customization engine here. W56 is only final polish and reliability for the existing picker.

Suggested tests:

1. selecting a template updates the store template;
2. current template is marked selected;
3. disabled template, if any, cannot be selected.

## Task 5 - Review/Re-check Regression Guard

**Files:**

- `src/components/cv-builder/sections/ReviewSection.tsx`
- `src/components/cv-builder/CvSectionNav.tsx`
- `src/components/cv-builder/CvFormPanel.tsx`
- Existing W55 specs.

Re-run W55 behavior manually in code and tests:

- stale state is shown after assistant/diagnosis/manual fix;
- per-section re-check CTA calls the correct `BuilderSection`;
- re-check success clears stale feedback;
- re-check failure keeps stale feedback and shows localized error;
- fresh score always takes precedence over stale feedback.

If you touch these files in W56, update W55 specs rather than weakening them.

## Task 6 - Responsive Smoke

No major redesign. Just fix obvious breakage at:

- 1440px desktop;
- 1280px laptop;
- 1024px tablet-ish;
- mobile width.

Checklist:

- top bar does not wrap into two rows;
- left icon rail remains usable;
- editor column scrolls independently;
- preview canvas remains visible and does not create accidental page-wide horizontal overflow;
- inspector can be opened/used or gracefully hidden on smaller screens;
- bottom preview toolbar does not cover critical content permanently.

If a full responsive redesign is needed, stop and report. Do not sneak it into W56.

## Manual Smoke Checklist

Use:

```txt
http://localhost:8080/diagnosis?mode=builder
```

Smoke A - Empty builder:

1. Open builder with empty local state.
2. Expected:
   - preview empty state is clean;
   - no raw PDF error;
   - top bar buttons either work or show clear local/server unavailable toast.

Smoke B - Fill + preview:

1. Fill name, email, summary, one experience, one project.
2. Expected:
   - preview appears;
   - typing does not blank the preview;
   - updating indicator is non-blocking.

Smoke C - Template:

1. Open template picker.
2. Switch 3 templates.
3. Expected:
   - cards look meaningfully different;
   - selected state is visible;
   - CV data remains.

Smoke D - Assistant/re-check:

1. Apply a summary or experience assistant suggestion.
2. Expected:
   - section becomes "needs re-check";
   - Review tab has per-section CTA;
   - successful re-check clears stale state.

Smoke E - VI/EN:

1. Switch app language to Vietnamese.
2. Expected:
   - preview/topbar/template/re-check copy is Vietnamese;
   - no "Needs Re-check", "Retry", "Temporary error", "Untitled Resume", or similar English leftovers in CV Builder.

## Verification Commands

Run targeted first:

```powershell
npm.cmd run test -- src/components/cv-builder/CvSectionNav.spec.tsx src/components/cv-builder/sections/ReviewSection.spec.tsx src/store/useCvBuilderStore.spec.ts src/components/companion/skills/CvBuilderSkill.spec.tsx
```

Add any new focused specs you create to the targeted command.

Then run full gate:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
git diff --check
```

## Expected Handoff

Report:

- files changed;
- exact commands run and results;
- what preview stability issue was found/fixed, or explicit "no code change needed" with evidence;
- i18n grep result and any remaining intentional exceptions;
- top bar/accessibility fixes;
- template picker fixes;
- manual smoke notes for A-E;
- known limitations that should be deferred instead of hidden.

## Definition Of Done

W56 is done when:

- preview is stable during ordinary editing;
- first-render and later-render errors have clean localized handling;
- top bar actions are accessible and localized;
- template picker looks and behaves like a real selector;
- W55 re-check loop still passes;
- no new hardcoded visible strings in touched CV Builder UI;
- lint/typecheck/test/build/diff-check pass;
- no unrelated files are staged.

## Reviewer Rejection Criteria

Codex will reject if:

- preview still flashes blank on normal typing;
- raw PDF/react errors dominate the user-facing UI;
- template cards regress to identical blank placeholders;
- English copy leaks in Vietnamese mode from touched files;
- re-check stale/fresh logic regresses;
- buttons appear enabled but do nothing useful;
- unrelated files are committed.
