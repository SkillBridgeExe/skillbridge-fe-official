import type { CanonicalCvDocument } from "@shared/api";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";

/**
 * Seed the CV builder from a parsed diagnosis document and jump to the builder
 * step. Single source for "Sửa CV gốc" — used by DocumentPreview and the
 * "CV của bạn" tab header (keeps the two entry points from drifting).
 */
export function seedBuilderFromDocument(docToEdit: CanonicalCvDocument | null | undefined): void {
  if (!docToEdit) return;

  const seedDoc: CanonicalCvDocument = {
    ...docToEdit,
    skills: docToEdit.skills || { technical: [], soft: [], languages: [], tools: [] },
    education: docToEdit.education || [],
    experience: docToEdit.experience || [],
    projects: docToEdit.projects || [],
    certifications: docToEdit.certifications || [],
    activities: docToEdit.activities || [],
  };

  const builder = useCvBuilderStore.getState();
  builder.hydrateFromCanonical(seedDoc);

  const diag = useDiagnosisStore.getState();
  if (diag.targetRole) {
    builder.setCareerTarget("targetPosition", diag.targetRole);
  }

  diag.setStep("builder");
}
