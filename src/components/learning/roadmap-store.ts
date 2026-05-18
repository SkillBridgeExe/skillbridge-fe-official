// lib/stores/roadmap-store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GeneratedRoadmap, WeekPlanFromRoadmap } from "@/components/learning/ai-roadmap";
import { DEMO_WEEKS, DEMO_ROADMAP } from "@/components/learning/demo-roadmap";

interface RoadmapStore {
  generatedRoadmap: GeneratedRoadmap | null;
  weekPlans: WeekPlanFromRoadmap[];
  isAIGenerated: boolean;

  setGeneratedRoadmap: (roadmap: GeneratedRoadmap) => void;
  setWeekPlans: (plans: WeekPlanFromRoadmap[]) => void;
  clearRoadmap: () => void;
}

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set) => ({
      generatedRoadmap: null,
      weekPlans: [],
      isAIGenerated: false,

      setGeneratedRoadmap: (roadmap) =>
        set({ generatedRoadmap: roadmap, isAIGenerated: true }),
      setWeekPlans: (plans) => set({ weekPlans: plans }),
      clearRoadmap: () =>
        set({ generatedRoadmap: null, weekPlans: [], isAIGenerated: false }),
    }),
    {
      name: "roadmap-store",
    }
  )
);

// ─── Selector helpers — dùng ngoài store để tránh bug persist ────────────────
// Gọi: const weeks = useActiveWeekPlans();

export function useActiveWeekPlans() {
  const { isAIGenerated, weekPlans } = useRoadmapStore();
  if (isAIGenerated && weekPlans.length > 0) {
    return weekPlans as unknown as typeof DEMO_WEEKS;
  }
  return DEMO_WEEKS;
}

export function useActiveRoadmap() {
  const { isAIGenerated, generatedRoadmap } = useRoadmapStore();
  if (!isAIGenerated || !generatedRoadmap) return DEMO_ROADMAP;

  return {
    modules: generatedRoadmap.courses.map((c) => ({
      id: c.courseId,
      title: c.courseName,
      description: c.reason,
      status: "locked" as const,
      weekNumber: c.weekNumber,
      estimatedHours: c.estimatedHours,
      topics: c.skills.slice(0, 4).map((s) => ({ title: s, completed: false })),
      resources: [],
    })),
    estimatedCompletionWeeks: generatedRoadmap.totalWeeks,
    totalHours: generatedRoadmap.totalHours,
  };
}
