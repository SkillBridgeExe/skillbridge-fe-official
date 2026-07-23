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
import type { LearningRoadmap } from "@/types/user";
import { deriveSessionStatuses } from "./session-progress";
import { useAuthStore } from "@/store/useAuthStore";
import { canUsePersistedRoadmap } from "./learning-storage";
import {
  roadmapV2ToLearningRoadmap,
  roadmapV2ToWeekPlans,
  type ActiveLearningRoadmap,
} from "@/services/learning-roadmaps-v2.service";

interface RoadmapStore {
  composedRoadmap: ComposedRoadmap | null;
  weekPlans: WeekPlan[];
  isAIGenerated: boolean;
  ownerUserId: string | null;
  activeRoadmap: ActiveLearningRoadmap | null;

  setComposedRoadmap: (roadmap: ComposedRoadmap) => void;
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

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set) => ({
      composedRoadmap: null,
      weekPlans: [],
      isAIGenerated: false,
      ownerUserId: null,
      activeRoadmap: null,

      setComposedRoadmap: (roadmap) =>
        set({
          composedRoadmap: roadmap,
          weekPlans: sanitizeWeekPlans(roadmapToWeekPlans(roadmap)),
          isAIGenerated: true,
          activeRoadmap: null,
          ownerUserId: useAuthStore.getState().currentUser?.id ?? null,
        }),
      setActiveRoadmap: (roadmap) =>
        set({
          activeRoadmap: roadmap,
          composedRoadmap: null,
          weekPlans: roadmapV2ToWeekPlans(roadmap),
          isAIGenerated: true,
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
        })),
      clearRoadmap: () =>
        set({
          composedRoadmap: null,
          weekPlans: [],
          isAIGenerated: false,
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
  const { activeRoadmap, composedRoadmap, isAIGenerated, ownerUserId, weekPlans } =
    useRoadmapStore();
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  if (!canUsePersistedRoadmap(ownerUserId, currentUserId)) return [];
  if (isAIGenerated && activeRoadmap && weekPlans.length > 0) {
    return sanitizeWeekPlans(weekPlans);
  }
  if (isAIGenerated && weekPlans.length > 0) {
    return deriveSessionStatuses(sanitizeWeekPlans(weekPlans));
  }
  if (isAIGenerated && composedRoadmap) {
    return deriveSessionStatuses(sanitizeWeekPlans(roadmapToWeekPlans(composedRoadmap)));
  }
  return [];
}

export function useActiveRoadmap(): LearningRoadmap {
  const { activeRoadmap, composedRoadmap, isAIGenerated, ownerUserId } = useRoadmapStore();
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  if (!canUsePersistedRoadmap(ownerUserId, currentUserId)) {
    return { modules: [], estimatedCompletionWeeks: 0, totalHours: 0 };
  }
  if (isAIGenerated && activeRoadmap) return roadmapV2ToLearningRoadmap(activeRoadmap);
  if (isAIGenerated && composedRoadmap) return roadmapToLearningRoadmap(composedRoadmap);
  return { modules: [], estimatedCompletionWeeks: 0, totalHours: 0 };
}
