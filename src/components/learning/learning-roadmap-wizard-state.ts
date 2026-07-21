import type {
  LearningCandidateSkill,
  LearningScheduleDraft,
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

export function buildScheduleDraft(input: {
  timezone: string;
  deadline: string;
  sessionMinutes: 30 | 45 | 60 | 90;
  weekdays: number[];
  startTime: string;
  slotMinutes: number;
}): LearningScheduleDraft {
  const weekdays = [...new Set(input.weekdays)].sort((a, b) => a - b);
  if (weekdays.length === 0)
    throw new Error("Choose at least one learning day.");
  if (!input.deadline) throw new Error("Choose a learning deadline.");
  return {
    timezone: input.timezone,
    deadline: input.deadline,
    session_minutes: input.sessionMinutes,
    slots: weekdays.map((isoWeekday) => ({
      iso_weekday: isoWeekday,
      start_time: input.startTime,
      duration_minutes: input.slotMinutes,
    })),
  };
}
