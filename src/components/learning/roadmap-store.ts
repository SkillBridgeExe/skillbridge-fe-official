// lib/stores/roadmap-store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WeekPlan } from "@/components/learning/types";
import { sanitizeWeekPlans } from "@/services/learning-roadmap.service";
import type { LearningRoadmap } from "@/types/user";
import { useAuthStore } from "@/store/useAuthStore";
import { canUsePersistedRoadmap } from "./learning-storage";
import {
  roadmapV2ToLearningRoadmap,
  roadmapV2ToWeekPlans,
  type ActiveLearningRoadmap,
} from "@/services/learning-roadmaps-v2.service";

interface RoadmapStore {
  weekPlans: WeekPlan[];
  ownerUserId: string | null;
  activeRoadmap: ActiveLearningRoadmap | null;

  setActiveRoadmap: (roadmap: ActiveLearningRoadmap) => void;
  setWeekPlans: (plans: WeekPlan[]) => void;
  applySessionCompletion: (
    sessionId: string,
    unlockedSessionIds: string[],
  ) => void;
  clearRoadmap: () => void;
}

export function applySessionCompletionToWeekPlans(
  plans: WeekPlan[],
  sessionId: string,
  unlockedSessionIds: string[],
): WeekPlan[] {
  const unlocked = new Set(unlockedSessionIds);
  return sanitizeWeekPlans(
    plans.map((week) => ({
      ...week,
      sessions: week.sessions.map((session) => {
        if (session.id === sessionId) {
          return { ...session, status: "completed" as const };
        }
        if (unlocked.has(session.id)) {
          return { ...session, status: "in-progress" as const };
        }
        return session;
      }),
    })),
  );
}

export function applySessionCompletionToActiveRoadmap(
  roadmap: ActiveLearningRoadmap,
  sessionId: string,
  unlockedSessionIds: string[],
): ActiveLearningRoadmap {
  const unlocked = new Set(unlockedSessionIds);
  const completedSession = roadmap.modules
    .flatMap((module) => module.sessions)
    .find((session) => session.id === sessionId);
  const isNewCompletion =
    Boolean(completedSession) && completedSession?.status !== "COMPLETED";
  const completedUnits = Math.min(
    roadmap.projection.total_units,
    roadmap.projection.completed_units + (isNewCompletion ? 1 : 0),
  );
  const completedMissedUnit =
    isNewCompletion &&
    completedSession !== undefined &&
    Date.parse(completedSession.scheduled_start_at) < Date.now();

  return {
    ...roadmap,
    projection: {
      ...roadmap.projection,
      completed_units: completedUnits,
      missed_units: completedMissedUnit
        ? Math.max(0, roadmap.projection.missed_units - 1)
        : roadmap.projection.missed_units,
      pace_percentage:
        roadmap.projection.planned_units_by_today > 0
          ? Math.round(
              (completedUnits / roadmap.projection.planned_units_by_today) *
                100,
            )
          : 100,
    },
    modules: roadmap.modules.map((module) => ({
      ...module,
      sessions: module.sessions.map((session) => {
        if (session.id === sessionId) {
          return { ...session, status: "COMPLETED" as const };
        }
        if (unlocked.has(session.id)) {
          return { ...session, status: "AVAILABLE" as const };
        }
        return session;
      }),
    })),
  };
}

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set) => ({
      weekPlans: [],
      ownerUserId: null,
      activeRoadmap: null,

      setActiveRoadmap: (roadmap) =>
        set({
          activeRoadmap: roadmap,
          weekPlans: roadmapV2ToWeekPlans(roadmap),
          ownerUserId: useAuthStore.getState().currentUser?.id ?? null,
        }),
      setWeekPlans: (plans) => set({ weekPlans: sanitizeWeekPlans(plans) }),
      applySessionCompletion: (sessionId, unlockedSessionIds) =>
        set((state) => ({
          weekPlans: applySessionCompletionToWeekPlans(
            state.weekPlans,
            sessionId,
            unlockedSessionIds,
          ),
          activeRoadmap: state.activeRoadmap
            ? applySessionCompletionToActiveRoadmap(
                state.activeRoadmap,
                sessionId,
                unlockedSessionIds,
              )
            : null,
        })),
      clearRoadmap: () =>
        set({
          weekPlans: [],
          ownerUserId: null,
          activeRoadmap: null,
        }),
    }),
    {
      name: "roadmap-store",
    }
  )
);

// ─── Selector helpers — dùng ngoài store để tránh bug persist ────────────────
// Gọi: const weeks = useActiveWeekPlans();

export function useActiveWeekPlans() {
  const { activeRoadmap, ownerUserId, weekPlans } = useRoadmapStore();
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  if (!canUsePersistedRoadmap(ownerUserId, currentUserId)) return [];
  if (activeRoadmap && weekPlans.length > 0) {
    return sanitizeWeekPlans(weekPlans);
  }
  return [];
}

export function useActiveRoadmap(): LearningRoadmap {
  const { activeRoadmap, ownerUserId } = useRoadmapStore();
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  if (!canUsePersistedRoadmap(ownerUserId, currentUserId)) {
    return { modules: [], estimatedCompletionWeeks: 0, totalHours: 0 };
  }
  if (activeRoadmap) return roadmapV2ToLearningRoadmap(activeRoadmap);
  return { modules: [], estimatedCompletionWeeks: 0, totalHours: 0 };
}
