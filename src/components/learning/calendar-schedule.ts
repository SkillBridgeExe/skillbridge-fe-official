import type { LearningSession, WeekPlan } from "./types";

export function toIsoWeekday(jsWeekday: number): number {
  return jsWeekday === 0 ? 7 : jsWeekday;
}

export function getSessionsForRoadmapWeek(
  weeks: WeekPlan[],
  weekOffset: number,
  now: Date = new Date(),
): LearningSession[] {
  if (weekOffset < 0) return [];
  const sessions = weeks.flatMap((week) => week.sessions);
  if (sessions.some((session) => Boolean(session.scheduledStartAt))) {
    const weekStart = new Date(now);
    const daysSinceMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - daysSinceMonday + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return sessions.filter((session) => {
      if (!session.scheduledStartAt) return false;
      const scheduledAt = new Date(session.scheduledStartAt);
      return scheduledAt >= weekStart && scheduledAt < nextWeek;
    });
  }
  const roadmapWeekNumber = weekOffset + 1;
  return weeks.find((week) => week.weekNumber === roadmapWeekNumber)?.sessions ?? [];
}

export function getSessionsForIsoWeekday(
  isoWeekday: number,
  sessions: LearningSession[],
): LearningSession[] {
  return sessions.filter((session) => session.dayOfWeek === isoWeekday);
}
