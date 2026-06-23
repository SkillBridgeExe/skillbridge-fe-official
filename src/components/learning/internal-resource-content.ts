import type { LearningSession } from "./types";

type Resource = LearningSession["resources"][number];

export interface InternalResourceTask {
  label: string;
  description: string;
  criteria: string[];
  proofOfCompletion: string;
}

export interface InternalResourceTaskCopy {
  label: string;
  defaultProof: string;
  defaultDescription?: string;
  genericCriteria: string[];
  outcomeCriteria: Record<string, string[]>;
}

const DEFAULT_PROOF = "Save a short note, screenshot, transcript, or project link in portfolio notes.";

const GENERIC_CRITERIA = [
  "Complete the task inside SkillBridge before marking the session done.",
  "Keep the result specific enough to reuse as portfolio or interview evidence.",
  "Write one short reflection on what improved and what still needs practice.",
];

const OUTCOME_CRITERIA: Record<string, string[]> = {
  interview_answer: [
    "Answer in English for 90-120 seconds.",
    "Use the STAR structure: Situation, Task, Action, Result.",
    "Close with one concrete project, metric, or lesson learned.",
  ],
  project: [
    "Build a small working artifact, not only notes.",
    "Include a short README with setup steps and decisions.",
    "Capture one screenshot or link that proves the result works.",
  ],
  portfolio: [
    "Create one portfolio-ready evidence item.",
    "Explain the context, your role, and the result clearly.",
    "Attach a link, screenshot, or transcript as proof.",
  ],
  cv_bullet: [
    "Rewrite the evidence as a measurable CV bullet.",
    "Use a strong action verb and include impact where possible.",
    "Check that the bullet matches the target role requirement.",
  ],
};

const DEFAULT_COPY: InternalResourceTaskCopy = {
  label: "Internal task",
  defaultProof: DEFAULT_PROOF,
  genericCriteria: GENERIC_CRITERIA,
  outcomeCriteria: OUTCOME_CRITERIA,
};

function humanize(value?: string): string {
  return value?.replace(/_/g, " ").trim() || "practice";
}

export function buildInternalResourceTask(
  resource: Resource,
  copy: InternalResourceTaskCopy = DEFAULT_COPY,
): InternalResourceTask | null {
  if (!resource.isInternal) return null;

  const criteria = copy.outcomeCriteria[resource.outcomeType ?? ""] ?? copy.genericCriteria;
  const description =
    resource.description?.trim() ||
    copy.defaultDescription?.trim() ||
    `Complete this SkillBridge ${humanize(resource.outcomeType)} task for "${resource.title}".`;

  return {
    label: copy.label,
    description,
    criteria,
    proofOfCompletion: resource.proofOfCompletion?.trim() || copy.defaultProof,
  };
}
