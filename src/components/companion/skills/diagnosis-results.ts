import type { NextStepItem } from "@/types/companion";

export function pickTopNextStep(steps: NextStepItem[]): NextStepItem | null {
  if (steps.length === 0) return null;
  return [...steps].sort((a, b) => b.severity - a.severity || a.rank - b.rank)[0];
}

const EVIDENCE_STATUSES = new Set(["unproven", "overclaimed"]);
export function ctaForStep(step: NextStepItem): "roadmap" | "builder" {
  return EVIDENCE_STATUSES.has(step.status.toLowerCase()) ? "builder" : "roadmap";
}
