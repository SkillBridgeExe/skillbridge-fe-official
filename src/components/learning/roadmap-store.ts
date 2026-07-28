// lib/stores/roadmap-store.ts

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WeekPlan } from "@/components/learning/types";
import { sanitizeWeekPlans } from "@/services/learning-roadmap.service";
import type { LearningRoadmap } from "@/types/user";
import { useAuthStore } from "@/store/useAuthStore";
import {
  canUsePersistedRoadmap,
  selectOwnedRoadmap,
} from "./learning-storage";
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
  return {
    ...roadmap,
    projection: {
      ...roadmap.projection,
      completed_units: completedUnits,
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
  const activeRoadmap = useRoadmapStore((state) => state.activeRoadmap);
  const ownerUserId = useRoadmapStore((state) => state.ownerUserId);
  const weekPlans = useRoadmapStore((state) => state.weekPlans);
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  return useMemo(() => {
    if (!canUsePersistedRoadmap(ownerUserId, currentUserId)) return [];
    return activeRoadmap && weekPlans.length > 0
      ? sanitizeWeekPlans(weekPlans)
      : [];
  }, [activeRoadmap, currentUserId, ownerUserId, weekPlans]);
}

export function useActiveRoadmapV2(): ActiveLearningRoadmap | null {
  const activeRoadmap = useRoadmapStore((state) => state.activeRoadmap);
  const ownerUserId = useRoadmapStore((state) => state.ownerUserId);
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  return useMemo(
    () => selectOwnedRoadmap(activeRoadmap, ownerUserId, currentUserId),
    [activeRoadmap, currentUserId, ownerUserId],
  );
}

export function useActiveRoadmap(): LearningRoadmap {
  const activeRoadmap = useActiveRoadmapV2();
  return useMemo(
    () =>
      activeRoadmap
        ? roadmapV2ToLearningRoadmap(activeRoadmap)
        : { modules: [], estimatedCompletionWeeks: 0, totalHours: 0 },
    [activeRoadmap],
  );
}
