Vendored from Reactive Resume (MIT) — do not hand-edit beyond compile
necessity. Every divergence from the upstream source must be logged below,
in the same PR that introduces it.

Upstream: https://github.com/AmruthPillai/Reactive-Resume
Source commit vendored: 4c8cc5c016fcc6fa7c83423f1a0f36303eec6b45
License: THIRD_PARTY_LICENSES.txt (repo root)

Directory map
-------------
schema/   <- packages/schema/src/          (zod resume schema, templates enum, page sizes)
pdf/      <- packages/pdf/src/             (15 @react-pdf/renderer templates + shared render kit)
fonts/    <- packages/fonts/src/           (webfontlist.json + font resolution helpers)
utils/    <- packages/utils/src/{color,field,locale,style}.ts (small subset actually used by
             schema/pdf/fonts — NOT the full @reactive-resume/utils package)
patch/    <- packages/resume/src/patch.ts  (JSON-Patch apply/validate; wiring lands in RE-V5)
preview/  <- apps/web/src/features/resume/{preview/*, export/pdf-document.tsx}

Not vendored (RE-V0 scope)
--------------------------
- packages/pdf/src/server.tsx — BE-side SSR/Puppeteer PDF export. RE-V4 territory.
- Every *.test.ts / *.test.tsx alongside the vendored files (Vitest suites tied to RR's
  own path aliases/fixtures). Re-add when we're ready to port the eval harness.
- apps/web/src/features/resume/builder/** (the editor). RE-V2 will bring this in.
- apps/web/src/libs/resume/section-title.ts / section-title-locale.ts (Lingui-backed).
  Replaced with a local stub (see below).
- @reactive-resume/ui (the full shadcn-based editor UI kit). Only the one component it
  contributed to vendored code (<Spinner>) was inlined.

Divergences from upstream (compile-necessity + explicit product decisions)
----------------------------------------------------------------------------
1. Internal package imports rewritten. `@reactive-resume/{schema,pdf,fonts,utils}/*` ->
   `@resume-engine/*` via one tsconfig + vite.config.ts path alias
   (`@resume-engine/* -> src/lib/resume-engine/*`), instead of rewriting every relative
   import by hand.

2. `#react-pdf-renderer` subpath import (pdf/renderer.ts) — RR wires this through its
   package.json `imports` field; this repo has no such field, so it was rewritten to a
   direct `@react-pdf/renderer` import.

3. zod v3 vs v4. FE already runs zod@3.25 for existing forms (react-hook-form resolvers
   etc). RR's vendored schema requires zod v4 APIs (`z.strictObject`, etc — not present
   in v3). Rather than upgrading the whole app to zod v4 (breaking change, out of scope),
   added an aliased dependency `"zod-v4": "npm:zod@^4.4.3"` and rewrote every
   `from "zod"` inside `src/lib/resume-engine/**` to `from "zod-v4"`. Zod v3 usage
   elsewhere in the app is untouched. Files touched: schema/resume/data.ts,
   schema/resume/analysis.ts, schema/templates.ts, patch/patch.ts, utils/locale.ts.

4. React 18 vs RR's React 19. RR's `pdf/context.tsx`, `pdf/templates/shared/context.tsx`,
   and `pdf/templates/shared/sections.tsx` used the React 19 `use()` hook for plain
   context reads. FE is on React 18.3, which has no `use`. Replaced with `useContext`
   (equivalent for a non-conditional, non-Promise context read).

5. tsconfig `target`/`lib` bumped ES2020 -> ES2022 (repo-wide, in tsconfig.json). The 15
   template pages + fonts/index.ts use `String.prototype.replaceAll` and
   `Array.prototype.at()`. This only widens the type-checking surface (no runtime
   transpile-target change — Vite/SWC already targets evergreen browsers that support
   both natively); existing app code is unaffected, only gains new allowed globals.

6. `@reactive-resume/ui/components/spinner` (preview/preview.shared.tsx) — the full
   editor UI kit wasn't vendored. Inlined a minimal `<Spinner>` (spinning SVG) instead.

7. `motion/react` (preview/preview.browser.tsx) -> `framer-motion`. FE already ships
   framer-motion (same team/API surface as `motion` post-merge); `AnimatePresence`
   and `m` exist in both. Adapted the import instead of adding a new dependency.

8. `usehooks-ts`'s `useIsClient` (preview/preview.tsx) — a one-line hook. Inlined
   directly (`useState` + `useEffect`) instead of adding the dependency for a single hook.

9. Builder store stub. RR's preview reads live edits via
   `apps/web/src/features/resume/builder/draft.ts` (`useResumeData`). The builder is
   out of scope for RE-V0 (RE-V2 vendors the editor). `preview/builder-stub.ts` exports
   a `useResumeData()` that always returns `undefined`; every RE-V0 consumer (the
   /dev/resume-smoke page) passes `data` explicitly. Swap this stub for the real draft
   store import once the builder lands.

10. i18n / Lingui. RR resolves section titles through `@lingui/core` (`setupI18n`, the
    `msg` macro, `.po` catalogs) in `apps/web/src/libs/resume/section-title.ts` and
    `section-title-locale.ts`. Lingui is NOT wired in RE-V0 per scope (full i18n lands
    in RE-V2). `preview/section-title-locale.ts` is a local, from-scratch stub exposing
    the same `createSectionTitleResolverForLocale` / `useSectionTitleResolver` shape,
    backed by a hardcoded en/vi title map (mirrors RR's `sectionTitleMessages` keys).
    Unknown locales fall through to the English `defaultEnglishTitle` that
    `pdf/section-title.ts` already computes.

11. `apps/web/src/features/resume/export/pdf-document.tsx` was folded into
    `preview/pdf-document.tsx` (no separate `export/` subdir — task scope only named
    `preview/` + `patch/`).
