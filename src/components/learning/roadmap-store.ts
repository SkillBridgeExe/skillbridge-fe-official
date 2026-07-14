// lib/stores/roadmap-store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WeekPlan } from "@/components/learning/types";
import {
  roadmapToLearningRoadmap,
  roadmapToWeekPlans,
  sanitizeWeekPlans,
  type ComposedRoadmap,
} from "@/services/learning-roadmap.service";
import type { RoadmapTranslatedDisplayDto } from "@shared/api";
import type { LearningRoadmap } from "@/types/user";
import { clearStoredLearningProgress, deriveSessionStatuses } from "./session-progress";

interface RoadmapStore {
  composedRoadmap: ComposedRoadmap | null;
  persistedRoadmapId: string | null;
  weekPlans: WeekPlan[];
  isAIGenerated: boolean;

  setComposedRoadmap: (roadmap: ComposedRoadmap) => void;
  setPersistedRoadmap: (roadmapId: string, roadmap: ComposedRoadmap) => void;
  setPersistedRoadmapId: (roadmapId: string | null) => void;
  mergeComposedRoadmap: (roadmap: ComposedRoadmap) => void;
  setWeekPlans: (plans: WeekPlan[]) => void;
  moveSession: (sessionId: string, targetDayOfWeek: number) => void;
  applyTranslatedDisplay: (
    items: Array<{ id: string; translated_display: RoadmapTranslatedDisplayDto }>,
  ) => void;
  clearRoadmap: () => void;
}

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set) => ({
      composedRoadmap: null,
      persistedRoadmapId: null,
      weekPlans: [],
      isAIGenerated: false,

      setComposedRoadmap: (roadmap) =>
        {
          clearStoredLearningProgress();
          set({
            composedRoadmap: roadmap,
            persistedRoadmapId: null,
            weekPlans: sanitizeWeekPlans(roadmapToWeekPlans(roadmap)),
            isAIGenerated: true,
          });
        },
      setPersistedRoadmap: (roadmapId, roadmap) =>
        set({
          composedRoadmap: roadmap,
          persistedRoadmapId: roadmapId,
          weekPlans: sanitizeWeekPlans(roadmapToWeekPlans(roadmap)),
          isAIGenerated: true,
        }),
      setPersistedRoadmapId: (roadmapId) => set({ persistedRoadmapId: roadmapId }),
      mergeComposedRoadmap: (roadmap) =>
        set((state) => {
          const composedRoadmap = mergeRoadmaps(state.composedRoadmap, roadmap);
          return {
            composedRoadmap,
            persistedRoadmapId: state.persistedRoadmapId,
            weekPlans: mergeWeekPlans(state.weekPlans, roadmapToWeekPlans(roadmap)),
            isAIGenerated: true,
          };
        }),
      setWeekPlans: (plans) => set({ weekPlans: sanitizeWeekPlans(plans) }),
      moveSession: (sessionId, targetDayOfWeek) =>
        set((state) => ({
          weekPlans: sanitizeWeekPlans(
            state.weekPlans.map((week) => ({
              ...week,
              sessions: week.sessions.map((session) =>
                session.id === sessionId && session.status !== "completed"
                  ? { ...session, dayOfWeek: targetDayOfWeek }
                  : session,
              ),
            })),
          ),
        })),
      applyTranslatedDisplay: (items) =>
        set((state) => {
          const byId = new Map(items.map((item) => [item.id, item.translated_display]));
          return {
            composedRoadmap: state.composedRoadmap
              ? {
                  ...state.composedRoadmap,
                  sessions: state.composedRoadmap.sessions?.map((session) => ({
                    ...session,
                    translated_display: byId.get(session.id) ?? session.translated_display,
                    title: byId.get(session.id)?.title ?? session.title,
                  })),
                }
              : state.composedRoadmap,
            weekPlans: sanitizeWeekPlans(
              state.weekPlans.map((week) => ({
                ...week,
                sessions: week.sessions.map((session) => ({
                  ...session,
                  title: byId.get(session.id)?.title ?? session.title,
                })),
              })),
            ),
          };
        }),
      clearRoadmap: () => {
        clearStoredLearningProgress();
        set({
          composedRoadmap: null,
          persistedRoadmapId: null,
          weekPlans: [],
          isAIGenerated: false,
        });
      },
    }),
    {
      name: "roadmap-store",
    }
  )
);

function mergeRoadmaps(
  current: ComposedRoadmap | null,
  incoming: ComposedRoadmap,
): ComposedRoadmap {
  if (!current) return incoming;
  const steps = new Map(current.steps.map((step) => [step.skill_canonical, step]));
  for (const step of incoming.steps) {
    steps.set(step.skill_canonical, step);
  }
  const sessions = new Map((current.sessions ?? []).map((session) => [session.id, session]));
  for (const session of incoming.sessions ?? []) {
    sessions.set(session.id, session);
  }
  const sourceRefs = new Map(
    [...(current.source_refs ?? []), ...(incoming.source_refs ?? [])].map((source) => [
      `${source.type}:${source.id}`,
      source,
    ]),
  );

  return {
    ...incoming,
    budget_hours: current.budget_hours + incoming.budget_hours,
    steps: [...steps.values()],
    sessions: [...sessions.values()],
    not_feasible_items: incoming.not_feasible_items,
    source_refs: [...sourceRefs.values()],
  };
}

function mergeWeekPlans(current: WeekPlan[], incoming: WeekPlan[]): WeekPlan[] {
  const currentSessions = new Map(
    current.flatMap((week) => week.sessions.map((session) => [session.id, session] as const)),
  );
  const weeks = new Map<number, WeekPlan>();

  for (const week of [...current, ...incoming]) {
    const existing = weeks.get(week.weekNumber);
    const sessions = week.sessions.map((session) => currentSessions.get(session.id) ?? session);
    if (!existing) {
      weeks.set(week.weekNumber, { ...week, sessions });
      continue;
    }
    const byId = new Map(existing.sessions.map((session) => [session.id, session]));
    for (const session of sessions) byId.set(session.id, session);
    weeks.set(week.weekNumber, { ...existing, sessions: [...byId.values()] });
  }

  return rescheduleMergedWeekPlans([...weeks.values()]);
}

function rescheduleMergedWeekPlans(plans: WeekPlan[]): WeekPlan[] {
  const sanitized = sanitizeWeekPlans(plans);
  const sessionEntries = sanitized.flatMap((week) =>
    week.sessions.map((session) => ({ session, weekNumber: week.weekNumber })),
  );
  if (sessionEntries.length === 0) return [];

  const activeDays = inferActiveDays(sessionEntries.map((entry) => entry.session));
  const sessionsPerDay = inferSessionsPerDay(sessionEntries.map((entry) => entry.session));
  const subjects = groupSessionsBySubject(sessionEntries);
  const lanes: Array<typeof subjects[number]["entries"] | null> = Array.from(
    { length: sessionsPerDay },
    () => null,
  );
  const scheduledWeeks = new Map<number, WeekPlan>();
  let nextSubjectIndex = 0;
  let weekNumber = 1;
  let sessionIndex = 1;

  const fillOpenLanes = () => {
    for (let laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
      if (lanes[laneIndex] || nextSubjectIndex >= subjects.length) continue;
      lanes[laneIndex] = [...subjects[nextSubjectIndex].entries];
      nextSubjectIndex += 1;
    }
  };

  while (nextSubjectIndex < subjects.length || lanes.some((lane) => lane && lane.length > 0)) {
    for (const dayOfWeek of activeDays) {
      fillOpenLanes();
      if (!lanes.some((lane) => lane && lane.length > 0)) break;

      for (let laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
        const lane = lanes[laneIndex];
        if (!lane) continue;
        const entry = lane.shift();
        if (!entry) {
          lanes[laneIndex] = null;
          continue;
        }

        const nextSession = {
          ...entry.session,
          sessionNumber: sessionIndex,
          laneIndex,
          dayOfWeek,
        };
        const week = scheduledWeeks.get(weekNumber) ?? {
          weekNumber,
          moduleId: nextSession.moduleId,
          moduleTitle: nextSession.skill,
          sessions: [],
        };
        week.sessions.push(nextSession);
        scheduledWeeks.set(weekNumber, week);
        sessionIndex += 1;

        if (lane.length === 0) lanes[laneIndex] = null;
      }
    }

    weekNumber += 1;
    sessionIndex = 1;
  }

  return [...scheduledWeeks.values()].sort((a, b) => a.weekNumber - b.weekNumber);
}

type SessionEntry = {
  session: WeekPlan["sessions"][number];
  weekNumber: number;
};

function groupSessionsBySubject(entries: SessionEntry[]) {
  const groups = new Map<string, SessionEntry[]>();
  for (const entry of entries) {
    const session = entry.session;
    const key = session.skillCanonical ?? session.moduleId ?? session.skill;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, group]) => ({
    key,
    entries: [...group].sort(compareSessionsForStudyOrder),
  }));
}

function compareSessionsForStudyOrder(
  a: SessionEntry,
  b: SessionEntry,
) {
  return (
    a.weekNumber - b.weekNumber ||
    (a.session.laneIndex ?? 0) - (b.session.laneIndex ?? 0) ||
    dayOrder(a.session.dayOfWeek) - dayOrder(b.session.dayOfWeek) ||
    a.session.sessionNumber - b.session.sessionNumber ||
    a.session.id.localeCompare(b.session.id)
  );
}

function inferActiveDays(sessions: WeekPlan["sessions"]): number[] {
  const days = [...new Set(sessions.map((session) => session.dayOfWeek))]
    .filter((day): day is number => typeof day === "number")
    .sort((a, b) => dayOrder(a) - dayOrder(b));
  return days.length > 0 ? days : [1, 2, 3, 4, 5];
}

function inferSessionsPerDay(sessions: WeekPlan["sessions"]): number {
  const maxLaneIndex = Math.max(0, ...sessions.map((session) => session.laneIndex ?? 0));
  return Math.max(1, maxLaneIndex + 1);
}

function dayOrder(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

// ─── Selector helpers — dùng ngoài store để tránh bug persist ────────────────
// Gọi: const weeks = useActiveWeekPlans();

export function useActiveWeekPlans() {
  const { composedRoadmap, isAIGenerated, weekPlans } = useRoadmapStore();
  if (isAIGenerated && weekPlans.length > 0) {
    return deriveSessionStatuses(sanitizeWeekPlans(weekPlans));
  }
  if (isAIGenerated && composedRoadmap) {
    return deriveSessionStatuses(sanitizeWeekPlans(roadmapToWeekPlans(composedRoadmap)));
  }
  return [];
}

export function useActiveRoadmap(): LearningRoadmap {
  const { composedRoadmap, isAIGenerated } = useRoadmapStore();
  if (isAIGenerated && composedRoadmap) return roadmapToLearningRoadmap(composedRoadmap);
  return { modules: [], estimatedCompletionWeeks: 0, totalHours: 0 };
}
