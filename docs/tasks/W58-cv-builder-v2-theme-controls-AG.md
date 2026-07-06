# W58 — CV Builder V2.2: Theme Controls

> **Owner:** Antigravity / FE  
> **Base requirement:** Start after W57 is merged or consciously rebase onto the latest `main` that includes Resume Studio V1.  
> **Goal:** Let users tune resume visual theme safely: font family, font scale, line height, margins, section spacing, and accent palette — with live preview and stable PDF output.

---

## Context

W57 improves template discovery. W58 makes each selected template more customizable. The key is production-grade controls that affect both preview and downloaded PDF consistently.

This is inspired by professional resume builders, but must fit SkillBridge:

- clean, light UI;
- clear controls;
- safe defaults;
- no overwhelming design panel;
- no breaking ATS readability.

---

## Product Outcome

Users can customize a resume theme without needing design knowledge:

1. Choose font family.
2. Adjust font size scale.
3. Adjust line height.
4. Adjust page margins.
5. Adjust section spacing.
6. Pick accent color.
7. See preview update without blank/flicker.
8. Download PDF with the same theme.

---

## Files To Inspect First

- `src/store/useCvBuilderStore.ts`
- `src/lib/resume-engine/adapter.ts`
- `src/lib/resume-engine/document-v1.ts`
- `src/lib/resume-engine/pdf/templates/*/*.tsx`
- `src/components/cv-builder/studio/StudioInspector.tsx`
- `src/components/cv-builder/preview/PdfRendererWrapper.tsx`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/vi.ts`
- `docs/tasks/W57-cv-builder-v2-real-template-gallery-AG.md`

---

## Scope

### In Scope

- Add or extend theme state in `useCvBuilderStore`.
- Apply theme state in resume adapter/PDF templates.
- Add theme controls to `StudioInspector`.
- Ensure preview/export consistency.
- Localize all labels.
- Add tests for store + adapter theme mapping.

### Out Of Scope

- Do not add custom font upload.
- Do not add arbitrary CSS editor.
- Do not add template marketplace.
- Do not add backend APIs.
- Do not change diagnosis scoring or AI logic.

---

## Theme Controls

### 1. Font Family

Provide a small curated list:

- Inter / System Sans
- Source Serif / Serif
- Roboto / Modern Sans
- Merriweather / Editorial Serif
- Mono / Technical

Implementation can map to available PDF-safe fonts or fallback families. If a font is not embedded in PDF, use safe fallback and document it in code comments.

Do not present 20+ fonts. This should feel guided.

### 2. Font Size Scale

Use existing `fontScale` if present. If it exists, keep and polish UI.

Recommended values:

- `small`
- `normal`
- `large`

Do not allow extreme sizes that break one-page layout.

### 3. Line Height

Add controlled values:

- `tight`
- `normal`
- `relaxed`

Recommended mapping:

```ts
const LINE_HEIGHT_MAP = {
  tight: 1.15,
  normal: 1.3,
  relaxed: 1.45,
} as const;
```

### 4. Margins

Add page margin control:

- `compact`
- `normal`
- `spacious`

Use bounded values in PDF points/mm. Do not expose raw numeric input in V2.2.

### 5. Section Spacing

Add spacing control:

- `compact`
- `normal`
- `spacious`

This should affect gaps between sections, not random internal padding everywhere.

### 6. Accent Palette

Keep current accent color if already exists, but improve UX:

- curated swatches;
- accessible labels;
- selected state;
- optional custom color only if already supported safely.

No neon/low-contrast colors.

---

## Data Shape Guidance

Prefer a focused theme object:

```ts
type ResumeThemeSettings = {
  fontFamily: "inter" | "serif" | "roboto" | "merriweather" | "mono";
  fontScale: "small" | "normal" | "large";
  lineHeight: "tight" | "normal" | "relaxed";
  pageMargin: "compact" | "normal" | "spacious";
  sectionSpacing: "compact" | "normal" | "spacious";
  accentColor: string;
};
```

If existing store fields already cover some of these, avoid duplicating. Either migrate carefully or keep backward-compatible selectors.

---

## UI Requirements

Place controls under `StudioInspector` in a clear `Appearance` / `Giao diện` section.

Recommended layout:

- Font family: select.
- Font size: segmented buttons.
- Line height: segmented buttons.
- Page margin: segmented buttons.
- Section spacing: segmented buttons.
- Accent palette: swatches.

Every control must have:

- localized label;
- accessible name;
- selected state;
- immediate preview update.

No giant nested cards. Keep the panel compact.

---

## Test Requirements

Add/update tests:

1. Store default theme is stable.
2. Updating font family changes adapter output.
3. Updating line height changes PDF style props.
4. Updating margins changes page layout props.
5. Updating accent color remains reflected in adapter/template props.
6. Invalid values are not accepted if there is a parser/validator.

Use existing test style. Avoid brittle visual snapshots.

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

1. Open CV Builder.
2. Change each theme setting.
3. Confirm preview updates without blank/flicker.
4. Download PDF.
5. Confirm PDF reflects settings.
6. Switch EN/VI and confirm no raw keys.

---

## Definition Of Done

- Theme controls are real, bounded, and understandable.
- Preview and PDF agree.
- No raw i18n keys.
- No broken one-page layout from extreme settings.
- Verification passes.
- Commit message:

```powershell
git commit -m "feat(cv-builder): add resume theme controls"
```

