# W57 — CV Builder V2.1: Real Template Gallery + Visual Thumbnails

> **Owner:** Antigravity / FE  
> **Base requirement:** Start from `main` **after PR #120 (`feat/cv-builder-re-ux-v3`) is merged**. If PR #120 is not in your branch, stop and rebase/sync first.  
> **Goal:** Make the resume template selection feel like a real product, not placeholder cards. Users should immediately understand how each template differs before selecting it.

---

## Context

Resume Studio V1 introduced the React-pdf resume engine, template picker, studio topbar, preview panel, inspector controls, section order/visibility, and final hardening. V2 starts by making the **template discovery experience** production-grade.

The current gallery is functional, but the thumbnails are still simplified drawings. Reactive Resume feels better because the user sees a compact, meaningful template preview with clear layout/personality. We should learn from that UX pattern, but:

- **Do not copy Reactive Resume code, assets, or exact UI.**
- Use it only as product inspiration: compact gallery, clear preview, tags, selected state, and low-friction switching.
- Keep SkillBridge visual identity: clean, light, blue-primary, calm professional UI. Do not introduce a dark editor.

---

## Product Outcome

When the user opens the template picker:

1. Each template card looks visually distinct.
2. Thumbnail reflects the real template layout: sidebar/split/timeline/classic/compact/etc.
3. Tags are useful and localized.
4. Selecting a template is obvious.
5. The currently selected template is summarized in the right inspector.
6. Preview does not flicker or blank while switching templates.
7. Mobile/tablet layout remains usable.

This task is **not** a full Reactive Resume clone. It is the first V2 upgrade: template discovery and thumbnail quality.

---

## Files To Inspect First

Read these before coding:

- `src/components/cv-builder/preview/TemplatePicker.tsx`
- `src/components/cv-builder/studio/StudioInspector.tsx`
- `src/components/cv-builder/preview/PdfRendererWrapper.tsx`
- `src/lib/resume-engine/template-meta.ts`
- `src/store/useCvBuilderStore.ts`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/vi.ts`
- `docs/tasks/W56-resume-studio-final-product-hardening-AG.md`

If any of these files are missing, your branch is not based on the right post-PR #120 state.

---

## Scope

### In Scope

- Improve `TemplateGallery` visual design and usability.
- Improve template thumbnail fidelity without making expensive PDF renders for every card.
- Improve template metadata if needed.
- Improve selected template summary inside `StudioInspector`.
- Add lightweight filter chips/search if it remains simple and useful.
- Add/adjust tests for template resolution and i18n-safe rendering.
- Ensure English/Vietnamese strings are fully localized.

### Out Of Scope

- Do not build full drag/drop layout editor.
- Do not add resume versioning.
- Do not add import/export JSON.
- Do not change PDF generation architecture.
- Do not add new backend APIs.
- Do not copy Reactive Resume code/assets.
- Do not redesign the whole Diagnosis page.

---

## UX Requirements

### 1. Gallery Card

Each card should include:

- Meaningful thumbnail.
- Template name.
- 1 short localized description.
- 2-4 localized tags.
- Clear selected state.
- Keyboard-focus visible ring.

Recommended card shape:

- Radius: 12-16px.
- Border subtle.
- Selected: primary blue border/ring + check mark.
- Hover: slight lift or border emphasis, no loud animation.
- Text must not overflow.

### 2. Thumbnail Fidelity

The thumbnail should be generated from `TEMPLATE_PREVIEWS` metadata and should vary by:

- `layout`: classic / sidebar / split / timeline / compact-like.
- `accent` color.
- visible header area.
- section block arrangement.
- sidebar or column blocks where applicable.
- timeline vertical line where applicable.

Do **not** make all thumbnails look like the same blank white paper.

Minimum expected visual differences:

- Sidebar templates show a colored side strip.
- Split/two-column templates show two content columns.
- Timeline templates show a vertical line/dots.
- Compact templates show denser lines.
- Classic templates show single-column clean blocks.

### 3. Inspector Summary

The selected template block in `StudioInspector` should show:

- Larger thumbnail than before.
- Template name.
- Localized description.
- Localized tags.
- "Change template" button.

It should feel like a product setting, not a debug display.

### 4. Optional Filter/Search

Add only if simple:

- Filter chips: `All`, `ATS`, `One-column`, `Two-column`, `Sidebar`, `Creative`, `Technical`, etc.
- Search by name/tag.

If you add filters:

- No result state must be localized.
- Selected filter must be obvious.
- Do not hide the selected template permanently; user should be able to clear filter.

If filters become messy, skip them. Better a beautiful simple gallery than a noisy advanced one.

### 5. Mobile/Responsive

The gallery must work in:

- inspector dialog width on desktop.
- tablet width.
- mobile sheet/dialog width.

Use responsive grids:

- mobile: 1 column or 2 compact columns if it fits.
- tablet: 2 columns.
- desktop dialog: 3 columns.

No horizontal scrolling inside cards.

---

## Technical Guidance

### Preferred Structure

Keep `TemplatePicker.tsx` focused. If it grows too large, split into:

- `TemplatePicker.tsx`
- `TemplateThumbnail.tsx`
- `template-gallery-filter.ts`

Do not over-abstract if the file remains readable.

### Template Metadata

Use `src/lib/resume-engine/template-meta.ts` as source of truth.

If metadata is not enough, extend it with small stable fields, for example:

```ts
type TemplatePreviewMeta = {
  name: string;
  descKey?: string;
  tags: string[];
  layout: "classic" | "sidebar" | "split" | "timeline" | "compact";
  accent: string;
  background: string;
  density?: "airy" | "balanced" | "dense";
};
```

Only add fields that are actually used by the UI.

### i18n

Every user-facing string must go through `useTranslation("diagnosis")`.

Update both:

- `src/i18n/locales/en.ts`
- `src/i18n/locales/vi.ts`

Do not use `defaultValue` fallback strings in touched CV Builder files. We have repeatedly had English/Vietnamese drift because of that.

### Preview Stability

Do not regress W56:

- Template switching must not blank the center preview.
- Existing rendered preview should remain visible while the next PDF blob/canvas is preparing.
- Error state should keep old preview when possible.

If you touch `PdfRendererWrapper.tsx`, re-check this behavior carefully.

---

## Suggested Implementation Steps

### Step 1 — Baseline

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- src/lib/resume-engine/adapter.spec.ts src/store/useCvBuilderStore.spec.ts src/components/cv-builder/CvSectionNav.spec.tsx
```

Expected: all pass before changes. If not, stop and report.

### Step 2 — Improve Thumbnail Component

In `TemplatePicker.tsx` or new `TemplateThumbnail.tsx`:

- Render template-specific shapes based on metadata.
- Use decorative divs only; no PDF rendering inside gallery.
- Keep it fast and deterministic.
- Add `aria-hidden="true"` for pure decorative thumbnail internals.

Acceptance:

- 15 templates do not look identical.
- Sidebar/split/timeline are visually distinguishable.

### Step 3 — Upgrade Gallery Cards

Update `TemplateGallery`:

- Better card hierarchy.
- Clear selected state.
- Localized description/tags.
- Better hover/focus.
- No clipped text.

Acceptance:

- User can compare templates without opening each one.
- Selected template is obvious at a glance.

### Step 4 — Upgrade Inspector Selected Template Summary

Update `StudioInspector.tsx`:

- Use the same thumbnail component if possible.
- Show localized description and tags.
- Keep the "Change template" dialog.

Acceptance:

- Right inspector summarizes the selected template clearly.
- No duplicate hardcoded metadata.

### Step 5 — Optional Filter/Search

If implemented, keep it small:

- Filter state local to `TemplateGallery`.
- Filter options generated from known tags or a small curated list.
- Localize all labels.

Acceptance:

- Filter reset works.
- Empty state is localized.
- Keyboard/mouse usable.

### Step 6 — Tests

Add or update tests where practical:

- `resolveBuilderTemplate` returns fallback for unknown template.
- Template gallery renders all templates.
- Template descriptions/tags do not render raw i18n keys in EN/VI if current test setup supports it.
- Store `setTemplate` is called when selecting a card.

Use existing test style in the repo. Do not create brittle pixel tests.

### Step 7 — Verification

Run full verification:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
git diff --check
```

Expected:

- typecheck: pass
- lint: 0 errors
- test: all pass
- build: pass
- diff check: no whitespace errors

If build has existing chunk-size warnings, note them but do not expand scope.

---

## Manual Smoke Checklist

Open CV Builder after changes:

1. Open template picker dialog.
2. Confirm template thumbnails are visibly different.
3. Switch between at least 5 templates.
4. Confirm center preview does not blank/flicker heavily.
5. Confirm selected card is obvious.
6. Switch language EN ↔ VI.
7. Confirm no raw i18n keys appear.
8. Resize to tablet/mobile width.
9. Confirm gallery remains usable.
10. Download PDF once after switching template.

---

## Definition Of Done

- Template gallery looks production-grade, not placeholder-grade.
- Selected template summary in inspector is polished.
- No hardcoded EN/VI strings in touched files.
- No new backend/API dependency.
- No Reactive Resume code/assets copied.
- Verification commands pass.
- Commit message:

```powershell
git commit -m "feat(cv-builder): upgrade template gallery thumbnails"
```

---

## Notes For Review

When reporting completion, include:

- Files changed.
- Screenshots before/after if possible.
- Verification command outputs.
- Any skipped optional filter/search with reason.
- Any known limitation that should move to V2.2.
