# W59 — CV Builder V2.3: Layout Controls

> **Owner:** Antigravity / FE  
> **Base requirement:** Start after W58 is merged or rebase onto latest `main` with Resume Studio V1/V2 theme state.  
> **Goal:** Give users meaningful layout control: column width, sidebar position, section icons, divider style, and page density — while keeping templates ATS-safe and preview/PDF consistent.

---

## Context

Theme controls tune the visual tone. Layout controls tune structure. This task should make templates feel flexible without becoming a full layout programming tool.

The controls must remain guided. Users should not be able to create broken CV layouts through arbitrary values.

---

## Product Outcome

Users can adjust:

1. Sidebar position: left/right where template supports sidebar.
2. Sidebar width or column ratio.
3. Section icons on/off.
4. Divider style.
5. Page density.
6. Template support messaging when a setting does not apply.

The result should be visible in preview and exported PDF.

---

## Files To Inspect First

- `src/store/useCvBuilderStore.ts`
- `src/lib/resume-engine/adapter.ts`
- `src/lib/resume-engine/document-v1.ts`
- `src/lib/resume-engine/template-meta.ts`
- `src/lib/resume-engine/pdf/templates/*/*.tsx`
- `src/components/cv-builder/studio/StudioInspector.tsx`
- `src/components/cv-builder/preview/TemplatePicker.tsx`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/vi.ts`

---

## Scope

### In Scope

- Add layout settings to store/document adapter.
- Apply supported layout settings to PDF templates.
- Add controls in `StudioInspector`.
- Disable or explain unsupported controls per template.
- Add tests for layout setting persistence and adapter mapping.

### Out Of Scope

- Do not add arbitrary drag/drop columns in this task.
- Do not add page-level manual positioning.
- Do not add multi-page custom layout editor.
- Do not add backend APIs.
- Do not change resume content semantics.

---

## Layout Controls

### 1. Sidebar Position

Values:

- `left`
- `right`

Only enable for templates with sidebar/split layouts. For classic/timeline templates, show disabled state with localized helper:

> This template does not use a sidebar.

### 2. Column Width / Sidebar Width

Use bounded presets:

- `narrow` = 28%
- `normal` = 35%
- `wide` = 42%

Do not expose raw numeric sliders in V2.3 unless existing architecture already supports it cleanly.

### 3. Section Icons

Values:

- on
- off

If icons are not supported by a specific template, either ignore gracefully or show disabled helper.

### 4. Divider Style

Values:

- `none`
- `line`
- `accent`
- `subtle`

Apply consistently across section headings.

### 5. Page Density

If W58 already added density/spacing, avoid duplication. Page density should act as a high-level preset that maps to theme/layout values:

- `comfortable`
- `balanced`
- `compact`

If existing `density` already exists, polish it instead of adding a second concept.

---

## Data Shape Guidance

Prefer a focused object:

```ts
type ResumeLayoutSettings = {
  sidebarPosition: "left" | "right";
  sidebarWidth: "narrow" | "normal" | "wide";
  showSectionIcons: boolean;
  dividerStyle: "none" | "line" | "accent" | "subtle";
  density: "comfortable" | "balanced" | "compact";
};
```

If existing `density`, `showSectionIcons`, or section-order state already exists, reuse it. Do not create parallel fields.

---

## UI Requirements

Controls live in `StudioInspector` under `Layout` / `Bố cục`.

Recommended order:

1. Density.
2. Sidebar position.
3. Sidebar width.
4. Section icons.
5. Divider style.

Unsupported controls:

- visible but disabled, or hidden with an explanatory note.
- Do not let user click something that silently does nothing.

---

## Template Support Rules

Use template metadata to determine support.

Suggested helper:

```ts
function getTemplateLayoutCapabilities(template: Template) {
  return {
    supportsSidebar: meta.layout === "sidebar" || meta.layout === "split",
    supportsSidebarPosition: meta.layout === "sidebar" || meta.layout === "split",
    supportsSectionIcons: true,
    supportsDividerStyle: true,
  };
}
```

Keep helper pure and testable.

---

## Test Requirements

Add/update tests:

1. Sidebar controls disabled for non-sidebar template.
2. Sidebar position changes adapter output for sidebar template.
3. Sidebar width maps to stable numeric ratio.
4. Divider style maps to template props.
5. Section icons toggle affects adapter/template props.
6. Existing section order/visibility behavior still passes.

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

1. Pick sidebar template.
2. Move sidebar left/right.
3. Change sidebar width.
4. Toggle icons.
5. Change divider style.
6. Pick non-sidebar template and confirm disabled states are clear.
7. Download PDF and compare with preview.

---

## Definition Of Done

- Layout controls are bounded and clear.
- Unsupported controls do not silently fail.
- Preview and PDF agree.
- Tests cover mapping and template capability behavior.
- Verification passes.
- Commit message:

```powershell
git commit -m "feat(cv-builder): add resume layout controls"
```

