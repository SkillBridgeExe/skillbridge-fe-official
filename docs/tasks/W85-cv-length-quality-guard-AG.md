# W85 — CV Length Quality Guard (Resume Writing Standard)

Owner: Antigravity / FE  
Branch: `feat/cv-length-quality-guard`  
Goal: CV Studio must help users keep a CV concise and role-relevant using real resume-writing standards, not a naive "more pages = bad" rule.

## Why

Users can create CVs that technically render, but are too long, repetitive, or unfocused. For students, interns, and freshers, a polished 1-page CV is usually the strongest default. A 2-page CV can be acceptable only when the content is relevant, evidence-rich, and not padded. More than 2 pages should be treated as a strong warning for most SkillBridge users.

This feature should teach the user *how to write a better CV*, not only count pages.

## Product Standard

Use this standard everywhere in the UI copy and logic:

- Intern / fresher / student: target 1 page.
- Junior: target 1 page; 2 pages only if all content is relevant.
- Mid/Senior: 2 pages can be fine when experience is substantial.
- 3+ pages: almost always too long for this product’s target audience unless explicitly senior/academic, which is out of scope for V1.
- Length is not judged alone. The warning must consider content quality:
  - irrelevant items,
  - repeated bullets,
  - weak bullets without impact,
  - too many old/minor projects,
  - verbose summary,
  - skills section stuffing,
  - certifications/languages taking too much space.

## Scope

Build a first production-grade version inside CV Studio / CV Builder only.

Do:

- Add a deterministic `cvLengthQuality` helper.
- Surface a page/quality warning in the Studio shell and Review/Polish area.
- Show actionable suggestions by section.
- Keep all copy i18n-ready in EN/VI.
- Add tests for helper logic and UI rendering.

Do not:

- Change BE.
- Change scoring formula.
- Change PDF renderer behavior.
- Auto-delete user content.
- Auto-apply AI rewrites.
- Add a new quota-consuming LLM call.

## Required Behavior

### 1. Deterministic helper

Create a small pure module, suggested:

`src/lib/resume-engine/quality/cv-length-quality.ts`

Input should be the current canonical resume document plus render/page metadata if available:

```ts
type CvLengthQualityInput = {
  document: CanonicalCvDocument;
  pageCount?: number;
  targetRole?: string | null;
  seniorityHint?: "intern" | "fresher" | "junior" | "mid" | "senior" | null;
};
```

Output should be structured, for example:

```ts
type CvLengthQualityResult = {
  status: "good" | "watch" | "too_long";
  pageCount: number | null;
  targetPages: 1 | 2;
  headlineKey: string;
  explanationKey: string;
  sectionSuggestions: Array<{
    section: "summary" | "experience" | "projects" | "skills" | "certifications" | "education" | "languages";
    severity: "info" | "warning" | "critical";
    reasonKey: string;
    actionKey: string;
  }>;
};
```

Keep it deterministic and cheap. This is a quality guard, not an AI feature.

### 2. Page-count source

Use existing preview/render metadata if the Studio already knows page count. If not available in a clean way, estimate conservatively from document content and wire the UI so that adding real page count later is easy.

Important: do not block on perfect page counting. The first value is in the writing guidance and section suggestions.

### 3. Writing-quality rules

Implement at least these rules:

- Summary too long:
  - more than 3 sentences or clearly overlong text -> suggest 2-3 concise sentences.
- Projects too many for fresher:
  - more than 3 projects -> suggest keeping strongest 2-3 role-relevant projects.
- Experience/projects weak density:
  - many bullets with no numbers/impact/action verbs -> suggest rewriting, not deleting first.
- Skill stuffing:
  - too many skills with no evidence in experience/projects -> suggest keeping role-relevant skills and proving key ones.
- Old/minor certifications:
  - many certifications or very old low-value certs -> suggest moving lower or removing.
- Empty/low-value sections taking space:
  - language/certification/custom sections with little content -> suggest compact layout or removal.

Do not shame the user. Tone should be coaching:

- Bad: "Your CV is too long."
- Good: "For an intern/fresher CV, this is starting to read long. Keep the strongest evidence and trim anything that does not prove the target role."

### 4. UI placement

Add a small, visible but calm guard in CV Studio:

- In the right inspector or Review/Polish section: "CV length & focus".
- Show:
  - page status,
  - target page count,
  - top 3 section suggestions,
  - quick action buttons that jump to the relevant section.

If the status is `good`, do not add visual noise. Show a compact success state.

If `watch` or `too_long`, show a clear but non-alarming panel.

### 5. Section jump

Each suggestion should jump to or focus the section in the left editor if the section exists.

Do not invent a broken action button. If section focus is not already supported, implement a small local helper or render the action as a non-clickable recommendation.

### 6. i18n

All visible copy must be in i18n keys, EN and VI.

Vietnamese copy must sound natural, not literal:

- "CV đang hơi dài so với cấp độ mục tiêu"
- "Giữ 2-3 dự án mạnh nhất"
- "Rút gọn phần tóm tắt còn 2-3 câu"
- "Chỉ giữ kỹ năng có bằng chứng trong dự án/kinh nghiệm"

No hardcoded English in UI.

### 7. Tests

Add unit tests for the helper:

- fresher + pageCount 1 + concise content -> `good`
- fresher + pageCount 2 + many projects -> `watch`
- fresher + pageCount 3 -> `too_long`
- senior + pageCount 2 -> not automatically `too_long`
- long summary triggers summary suggestion
- too many projects triggers project suggestion
- many skills with weak evidence triggers skill suggestion

Add at least one component test if there is an existing test pattern for CV Builder panels:

- `watch` status renders target page guidance and top suggestions.
- `good` status renders compact success state.

## Acceptance Checklist

- [ ] CV Studio no longer treats length as a dumb page count only.
- [ ] Fresher/intern guidance clearly targets 1 page.
- [ ] 2 pages can be acceptable when content is justified.
- [ ] 3+ pages is warned strongly for normal SkillBridge users.
- [ ] Suggestions are section-specific and actionable.
- [ ] No auto-delete / no auto-rewrite.
- [ ] All UI copy has EN/VI i18n.
- [ ] Tests pass: `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build`.

## Suggested Manual Smoke

1. Create a short fresher CV with 1 page.
   - Expect compact "good" state.
2. Add 5 projects and a long summary.
   - Expect `watch` with project + summary suggestions.
3. Add enough content to overflow to 3 pages.
   - Expect stronger warning.
4. Switch language EN/VI.
   - Expect no hardcoded English.

## Notes For AG

Use existing SkillBridge visual language. Keep the panel restrained, clean, and helpful. Do not copy Reactive Resume UI wholesale here; this is a SkillBridge-specific coaching layer.

The goal is not to make users afraid of long CVs. The goal is to help them decide what deserves space.
