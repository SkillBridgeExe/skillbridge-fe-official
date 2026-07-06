# W60 — CV Builder V2.4: Section UX Upgrade

> **Owner:** Antigravity / FE  
> **Base requirement:** Start after W59 is merged or rebase onto latest `main` with Resume Studio V2 theme/layout controls.  
> **Goal:** Make editing resume sections feel fast and calm: smooth collapse/expand, sticky navigation, jump-to-preview highlight, and clearer reorder affordances.

---

## Context

V1 made the editor functional. W57-W59 improve templates/theme/layout. W60 improves the daily editing experience: the user should not feel lost inside a long form.

This task is UI/UX-heavy but must preserve all existing CV builder logic, assistant patch logic, diagnosis handoff, and autosave behavior.

---

## Product Outcome

When editing a CV:

1. Left section list is sticky and useful.
2. User can collapse/expand sections smoothly.
3. Clicking a section jumps to that section.
4. Editing a section can briefly highlight the matching preview area or at least the section card.
5. Reorder controls feel discoverable.
6. Empty sections still guide the user instead of looking broken.
7. No scroll trap, no layout jump, no lost focus.

---

## Files To Inspect First

- `src/components/cv-builder/CvFormPanel.tsx`
- `src/components/cv-builder/CvSectionNav.tsx`
- `src/components/cv-builder/sections/SectionItemCard.tsx`
- `src/components/cv-builder/sections/*Section.tsx`
- `src/components/cv-builder/builder-snapshot.ts`
- `src/hooks/use-scroll-to-new-item.ts`
- `src/store/useCvBuilderStore.ts`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/vi.ts`

---

## Scope

### In Scope

- Sticky section navigation polish.
- Smooth collapse/expand per section.
- Jump-to-section behavior.
- Section focus/highlight behavior.
- Better reorder affordance for repeatable items.
- Empty/error/loading polish inside section editor.
- Tests for section nav and collapse state.

### Out Of Scope

- Do not add true drag/drop in this task unless already trivial.
- Do not change PDF rendering engine.
- Do not change AI patch semantics.
- Do not change backend API.
- Do not redesign whole Diagnosis route.

---

## UX Requirements

### 1. Sticky Section Navigation

`CvSectionNav` should:

- stay visible while editing;
- show completion/fix status if already available;
- show active section;
- allow keyboard navigation where practical;
- not cover content on mobile.

For mobile:

- use horizontal sticky pill nav or compact dropdown if easier.
- avoid a tall sidebar that crushes the form.

### 2. Collapse/Expand

Each major section should support collapse/expand:

- Basic info
- Summary
- Experience
- Education
- Projects
- Skills
- Certifications
- Review/Fix panel if present

State can be local or in store. Prefer store only if multiple components need it.

Rules:

- New/active section should auto-expand.
- Collapsing should not lose unsaved input.
- Keyboard focus must remain sane.
- Use subtle motion only.

### 3. Jump-To-Preview Highlight

Ideal behavior:

- When user focuses/edits a section, corresponding preview section briefly highlights.

If direct PDF preview section highlight is not feasible because the preview is canvas/PDF:

- implement editor-side highlight + preview toolbar hint.
- document why PDF-section highlight is deferred.

Do not hack brittle DOM overlays on PDF canvas unless there is a stable mapping.

### 4. Reorder Affordance

For repeatable items:

- Experience rows.
- Education rows.
- Projects.
- Certifications.

Make reorder buttons clearer:

- visible handle/drag icon or up/down group;
- aria-labels localized;
- disabled state at first/last item;
- no accidental delete near reorder.

If implementing drag/drop, use existing dependency only if already present. Do not add a large dependency without clear reason.

### 5. Empty States

Every repeatable section should have:

- friendly empty copy;
- add button;
- optional suggestion text;
- no giant blank card.

All localized.

---

## State Guidance

Suggested store shape if needed:

```ts
type CvBuilderUiState = {
  activeSection: CvBuilderSectionKey | null;
  collapsedSections: Partial<Record<CvBuilderSectionKey, boolean>>;
  focusedFieldPath: string | null;
};
```

If similar state already exists, reuse it. Avoid duplicating active-section concepts.

---

## Test Requirements

Add/update tests:

1. Clicking nav item scrolls/activates section.
2. Collapsing a section hides body but keeps header visible.
3. Re-expanding restores content.
4. Adding an item expands/focuses the relevant section.
5. Reorder controls have disabled state at boundaries.
6. No raw i18n keys in touched section labels.

Use React Testing Library where possible. Avoid timing-flaky animation assertions.

---

## Verification

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
git diff --check
```

Manual smoke:

1. Open CV Builder with a long CV.
2. Scroll from top to bottom.
3. Use section nav to jump between sections.
4. Collapse/expand every section.
5. Add/reorder/delete project and experience items.
6. Confirm no input text is lost.
7. Confirm mobile/tablet layout remains usable.
8. Switch EN/VI and confirm labels are localized.

---

## Definition Of Done

- Editing a long CV feels organized.
- Section nav is useful and sticky.
- Collapse/expand is stable.
- Reorder affordance is obvious.
- No lost input.
- Verification passes.
- Commit message:

```powershell
git commit -m "feat(cv-builder): improve resume section editing UX"
```

