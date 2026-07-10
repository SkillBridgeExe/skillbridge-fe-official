import type { BuilderSnapshot } from "@/services/cv-builder.service";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

export const getBuilderSnapshot = (
  state: ReturnType<typeof useCvBuilderStore.getState>,
): BuilderSnapshot => ({
  resumeTitle: state.resumeTitle,
  fullName: state.fullName,
  email: state.email,
  phone: state.phone,
  location: state.location,
  linkedin: state.linkedin,
  portfolio: state.portfolio,
  github: state.github,
  targetPosition: state.targetPosition,
  summary: state.summary,
  education: state.education,
  experience: state.experience,
  projects: state.projects,
  technicalSkills: state.technicalSkills,
  softSkills: state.softSkills,
  tools: state.tools,
  languages: state.languages,
  certifications: state.certifications,
  customSections: state.customSections,
  cvLanguage: state.cvLanguage,
});
