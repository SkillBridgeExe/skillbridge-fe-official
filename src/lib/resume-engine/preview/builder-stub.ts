import type { ResumeData } from "@resume-engine/schema/resume/data";

// DIVERGENCE (README-VENDOR.txt): RR's preview reads live edits from the
// builder's Zustand/Jotai draft store (`apps/web/src/features/resume/builder/draft.ts`).
// The builder is out of scope for RE-V0 (lands in RE-V2), so this stub always
// returns undefined — every RE-V0 consumer (the /dev/resume-smoke page) passes
// `data` explicitly instead of relying on a live draft. Replace this import
// with the real draft store once the editor is vendored.
export function useResumeData(): ResumeData | undefined {
	return undefined;
}
