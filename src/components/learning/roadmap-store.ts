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

interface RoadmapStore {
  composedRoadmap: ComposedRoadmap | null;
  weekPlans: WeekPlan[];
  isAIGenerated: boolean;

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

      setComposedRoadmap: (roadmap) =>
        set({
          composedRoadmap: roadmap,
          weekPlans: sanitizeWeekPlans(roadmapToWeekPlans(roadmap)),
          isAIGenerated: true,
        }),
      setWeekPlans: (plans) => set({ weekPlans: sanitizeWeekPlans(plans) }),
      clearRoadmap: () =>
        set({
          composedRoadmap: null,
          weekPlans: [],
          isAIGenerated: false,
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
  const { composedRoadmap, isAIGenerated, weekPlans } = useRoadmapStore();
  if (isAIGenerated && weekPlans.length > 0) {
    return sanitizeWeekPlans(weekPlans);
  }
  if (isAIGenerated && composedRoadmap) {
    return sanitizeWeekPlans(roadmapToWeekPlans(composedRoadmap));
  }
  return [];
}

export function useActiveRoadmap(): LearningRoadmap {
  const { composedRoadmap, isAIGenerated } = useRoadmapStore();
  if (isAIGenerated && composedRoadmap) return roadmapToLearningRoadmap(composedRoadmap);
  return { modules: [], estimatedCompletionWeeks: 0, totalHours: 0 };
}
