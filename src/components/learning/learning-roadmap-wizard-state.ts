import type {
  LearningCadenceDraft,
  LearningCandidateSkill,
} from "@/services/learning-roadmaps-v2.service";

export function buildPrioritySelection(
  candidates: LearningCandidateSkill[],
  orderedCanonicals: string[],
): Array<{ skill_canonical: string; rank: number }> {
  const allowed = new Set(
    candidates.map((candidate) => candidate.skill_canonical),
  );
  const seen = new Set<string>();
  const selected: Array<{ skill_canonical: string; rank: number }> = [];
  for (const canonical of orderedCanonicals) {
    if (!allowed.has(canonical) || seen.has(canonical)) continue;
    seen.add(canonical);
    selected.push({ skill_canonical: canonical, rank: selected.length + 1 });
  }
  return selected;
}

export function buildCadenceDraft(input: {
  timezone: string;
  startDate: string;
  studyDaysPerWeek: number;
}): LearningCadenceDraft {
  if (!input.startDate) throw new Error("Choose a learning start date.");
  if (
    !Number.isInteger(input.studyDaysPerWeek) ||
    input.studyDaysPerWeek < 1 ||
    input.studyDaysPerWeek > 7
  ) {
    throw new Error("Choose between 1 and 7 learning days.");
  }
  return {
    timezone: input.timezone,
    start_date: input.startDate,
    study_days_per_week:
      input.studyDaysPerWeek as LearningCadenceDraft["study_days_per_week"],
    session_minutes: 60,
  };
}
