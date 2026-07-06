import type { ResumeDocumentV1 } from "@/lib/resume-engine/document-v1";
import { resumeDocumentPaths } from "@/lib/resume-engine/document-v1-paths";
import { textHasSkill } from "./find-bullet-with-skill";

export type DiagnosisAnchorSection = "summary" | "experience" | "projects";
export type DiagnosisAnchorSource = "evidence_text" | "skill_token";
export type DiagnosisAnchorConfidence = "high" | "medium";

export type DiagnosisFixAnchorInput = {
  document: ResumeDocumentV1;
  skill?: {
    canonical?: string | null;
    displayName?: string | null;
  } | null;
  evidenceText?: string | null;
};

export type DiagnosisFixAnchor =
  | {
      ok: true;
      section: DiagnosisAnchorSection;
      fieldPath: string; // canonical ResumeDocumentV1 path
      currentValue: string;
      source: DiagnosisAnchorSource;
      confidence: DiagnosisAnchorConfidence;
    }
  | {
      ok: false;
      reason: "NO_DOCUMENT_TEXT" | "NO_MATCH" | "UNSUPPORTED_TARGET";
    };


/** Check if evidence text exists inside a field using simple substring matching (case-insensitiveish). */
function textHasEvidence(text: string | undefined, evidence: string | null | undefined): boolean {
  if (!text || !evidence) return false;
  // A simple include check, stripping extra spaces
  const normalizedText = text.replace(/\s+/g, " ").toLowerCase();
  const normalizedEvidence = evidence.replace(/\s+/g, " ").toLowerCase();
  return normalizedText.includes(normalizedEvidence);
}

export function resolveDiagnosisFixAnchor(input: DiagnosisFixAnchorInput): DiagnosisFixAnchor {
  const doc = input.document;
  const skill = input.skill;
  const evidenceText = input.evidenceText;

  const validSkillTarget = skill?.canonical && skill?.displayName ? { canonical: skill.canonical, displayName: skill.displayName } : null;

  if (!evidenceText && !validSkillTarget) {
    return { ok: false, reason: "NO_MATCH" };
  }

  // Editable fields to search
  // W54 spec says:
  // /sections/summary/content
  // /sections/experience/items/<id>/description
  // /sections/experience/items/<id>/responsibilities
  // /sections/experience/items/<id>/achievements
  // /sections/projects/items/<id>/description
  // /sections/projects/items/<id>/contribution
  // /sections/projects/items/<id>/result

  const candidates: Array<{ section: DiagnosisAnchorSection; path: string; value: string }> = [];

  if (doc.sections?.summary?.content) {
    candidates.push({ section: "summary", path: resumeDocumentPaths.summaryContent(), value: doc.sections.summary.content });
  }

  for (const exp of doc.sections?.experience?.items ?? []) {
    if (exp.description) {
      candidates.push({
        section: "experience",
        path: resumeDocumentPaths.experienceDescription(exp.id),
        value: exp.description,
      });
    }
    if (exp.responsibilities) {
      candidates.push({
        section: "experience",
        path: resumeDocumentPaths.experienceResponsibilities(exp.id),
        value: exp.responsibilities,
      });
    }
    if (exp.achievements) {
      candidates.push({
        section: "experience",
        path: resumeDocumentPaths.experienceAchievements(exp.id),
        value: exp.achievements,
      });
    }
  }

  for (const proj of doc.sections?.projects?.items ?? []) {
    if (proj.description) {
      candidates.push({
        section: "projects",
        path: resumeDocumentPaths.projectDescription(proj.id),
        value: proj.description,
      });
    }
    if (proj.contribution) {
      candidates.push({
        section: "projects",
        path: resumeDocumentPaths.projectContribution(proj.id),
        value: proj.contribution,
      });
    }
    if (proj.result) {
      candidates.push({
        section: "projects",
        path: resumeDocumentPaths.projectResult(proj.id),
        value: proj.result,
      });
    }
  }

  // 1. Exact-ish evidenceText substring match in editable text fields -> confidence 'high'
  if (evidenceText) {
    for (const candidate of candidates) {
      if (textHasEvidence(candidate.value, evidenceText)) {
        return {
          ok: true,
          section: candidate.section,
          fieldPath: candidate.path,
          currentValue: candidate.value,
          source: "evidence_text",
          confidence: "high",
        };
      }
    }
  }

  // 2. Skill token match using displayName and canonical -> confidence 'medium'
  if (validSkillTarget) {
    for (const candidate of candidates) {
      if (textHasSkill(candidate.value, validSkillTarget)) {
        return {
          ok: true,
          section: candidate.section,
          fieldPath: candidate.path,
          currentValue: candidate.value,
          source: "skill_token",
          confidence: "medium",
        };
      }
    }
  }

  // If no text/skill match exists, return NO_MATCH.
  return { ok: false, reason: "NO_MATCH" };
}
