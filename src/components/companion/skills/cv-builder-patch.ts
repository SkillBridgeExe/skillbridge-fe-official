import type { ResumeDocumentV1 } from "@/lib/resume-engine/document-v1";
import type { ResumePatchOperation, ResumePatchSummary } from "@/lib/resume-engine/document-v1-patch";
import { applyResumePatch, summarizeResumePatch } from "@/lib/resume-engine/document-v1-patch";

export type CvBuilderPatchTarget = {
  section: "projects" | "experience" | "summary";
  fieldPath: string;
  after: string;
};

export type CvBuilderPatchProposal = {
  operation: ResumePatchOperation;
  summary: ResumePatchSummary;
  patchedDocument: ResumeDocumentV1;
};

export function companionTargetToResumePath(
  document: ResumeDocumentV1,
  target: Pick<CvBuilderPatchTarget, "section" | "fieldPath">,
): string | null {
  const { section, fieldPath: rawFieldPath } = target;

  if (!rawFieldPath) return null;

  // Companion contexts register field identities with a "cvbuilder:" namespace prefix
  // (e.g. ProjectsSection uses "cvbuilder:projects[0].description"). Strip it before
  // mapping — the anchored legacy regexes below never match a prefixed path, which
  // used to send every such Apply into patchRejected.
  const fieldPath = rawFieldPath.startsWith("cvbuilder:")
    ? rawFieldPath.slice("cvbuilder:".length)
    : rawFieldPath;

  // 1. If it's already a W52 absolute path, return it directly.
  if (fieldPath.startsWith("/sections/")) {
    return fieldPath;
  }

  // 2. Summary
  if (section === "summary" || fieldPath.includes("summary")) {
    return "/sections/summary/content";
  }

  // Helper to resolve index from string like `0` or `1`
  const parseIndex = (idxStr: string): number | null => {
    const idx = parseInt(idxStr, 10);
    return isNaN(idx) ? null : idx;
  };

  // Helper to extract id or index and field from formats like `projects[0].description`, `projects:1:description`, `projects.1.description`
  const matchLegacyPattern = (path: string, sectionPrefix: string) => {
    // Check array index form: section[index].field
    const bracketMatch = path.match(new RegExp(`^${sectionPrefix}\\[(\\d+)\\]\\.(.*)$`));
    if (bracketMatch) return { index: parseIndex(bracketMatch[1]), id: null, field: bracketMatch[2] };

    // Check dot/colon forms: section.id.field or section:id:field
    const delimMatch = path.match(new RegExp(`^${sectionPrefix}[.:]([^.:]+)[.:](.*)$`));
    if (delimMatch) {
      const maybeIndex = parseIndex(delimMatch[1]);
      if (maybeIndex !== null && maybeIndex < 1000) {
        // Assume small integers are indices if we have legacy array behavior
        return { index: maybeIndex, id: null, field: delimMatch[2] };
      }
      return { index: null, id: delimMatch[1], field: delimMatch[2] };
    }

    return null;
  };

  // 3. Projects
  if (section === "projects") {
    const parsed = matchLegacyPattern(fieldPath, "projects");
    if (parsed) {
      let resolvedId = parsed.id;
      if (resolvedId === null && parsed.index !== null) {
        const item = document.sections.projects.items[parsed.index];
        if (item) resolvedId = item.id;
      }
      if (resolvedId && (parsed.field === "description" || parsed.field === "contribution" || parsed.field === "result")) {
        return `/sections/projects/items/${resolvedId}/${parsed.field}`;
      }
    }
  }

  // 4. Experience
  if (section === "experience") {
    const parsed = matchLegacyPattern(fieldPath, "experience");
    if (parsed) {
      let resolvedId = parsed.id;
      if (resolvedId === null && parsed.index !== null) {
        const item = document.sections.experience.items[parsed.index];
        if (item) resolvedId = item.id;
      }
      if (resolvedId && (parsed.field === "description" || parsed.field === "responsibilities" || parsed.field === "achievements")) {
        return `/sections/experience/items/${resolvedId}/${parsed.field}`;
      }
    }
  }

  return null;
}

export function buildCvBuilderPatchProposal(
  document: ResumeDocumentV1,
  target: CvBuilderPatchTarget,
): CvBuilderPatchProposal {
  const path = companionTargetToResumePath(document, target);
  if (!path) {
    throw new Error(`Cannot map companion target to resume document path: ${target.fieldPath}`);
  }

  const operation: ResumePatchOperation = {
    op: "replace",
    path,
    value: target.after,
  };

  const patchedDocument = applyResumePatch(document, [operation]);

  return {
    operation,
    summary: summarizeResumePatch(document, [operation]),
    patchedDocument,
  };
}
