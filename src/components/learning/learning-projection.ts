import type { LearningProjection } from "@/services/learning-roadmaps-v2.service";

export function getLearningProjectionView(projection: LearningProjection) {
  const completionPercentage =
    projection.total_units > 0
      ? Math.round(
          (Math.min(projection.completed_units, projection.total_units) /
            projection.total_units) *
            100,
        )
      : 0;
  const pacePercentage = clampPercentage(projection.pace_percentage);
  return {
    completionPercentage,
    pacePercentage,
    paceTone:
      pacePercentage >= 100
        ? ("ahead" as const)
        : pacePercentage >= 80
          ? ("steady" as const)
          : ("behind" as const),
  };
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
