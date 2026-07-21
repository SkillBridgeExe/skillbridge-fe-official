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

interface RoadmapStore {
  composedRoadmap: ComposedRoadmap | null;
  weekPlans: WeekPlan[];
  isAIGenerated: boolean;
  ownerUserId: string | null;

  setComposedRoadmap: (roadmap: ComposedRoadmap) => void;
  setWeekPlans: (plans: WeekPlan[]) => void;
  clearRoadmap: () => void;
}

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set) => ({
      composedRoadmap: null,
      weekPlans: [],
      isAIGenerated: false,
      ownerUserId: null,

      setComposedRoadmap: (roadmap) =>
        set({
          composedRoadmap: roadmap,
          weekPlans: sanitizeWeekPlans(roadmapToWeekPlans(roadmap)),
          isAIGenerated: true,
          ownerUserId: useAuthStore.getState().currentUser?.id ?? null,
        }),
      setWeekPlans: (plans) => set({ weekPlans: sanitizeWeekPlans(plans) }),
      clearRoadmap: () =>
        set({
          composedRoadmap: null,
          weekPlans: [],
          isAIGenerated: false,
          ownerUserId: null,
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
  const { composedRoadmap, isAIGenerated, ownerUserId, weekPlans } = useRoadmapStore();
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  if (!canUsePersistedRoadmap(ownerUserId, currentUserId)) return [];
  if (isAIGenerated && weekPlans.length > 0) {
    return deriveSessionStatuses(sanitizeWeekPlans(weekPlans));
  }
  if (isAIGenerated && composedRoadmap) {
    return deriveSessionStatuses(sanitizeWeekPlans(roadmapToWeekPlans(composedRoadmap)));
  }
  return [];
}

export function useActiveRoadmap(): LearningRoadmap {
  const { composedRoadmap, isAIGenerated, ownerUserId } = useRoadmapStore();
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  if (!canUsePersistedRoadmap(ownerUserId, currentUserId)) {
    return { modules: [], estimatedCompletionWeeks: 0, totalHours: 0 };
  }
  if (isAIGenerated && composedRoadmap) return roadmapToLearningRoadmap(composedRoadmap);
  return { modules: [], estimatedCompletionWeeks: 0, totalHours: 0 };
}
