import type { LearningSession, WeekPlan } from "./types";

export function toIsoWeekday(jsWeekday: number): number {
  return jsWeekday === 0 ? 7 : jsWeekday;
}

export function getSessionsForRoadmapWeek(
  weeks: WeekPlan[],
  weekOffset: number,
): LearningSession[] {
  if (weekOffset < 0) return [];
  const roadmapWeekNumber = weekOffset + 1;
  return weeks.find((week) => week.weekNumber === roadmapWeekNumber)?.sessions ?? [];
}

export function getSessionsForIsoWeekday(
  isoWeekday: number,
  sessions: LearningSession[],
): LearningSession[] {
  return sessions.filter((session) => session.dayOfWeek === isoWeekday);
}
