export type LearningPageState = "loading" | "content" | "error" | "empty";

export function getLearningPageState(
  bootstrapStatus: "loading" | "ready" | "error",
  hasRoadmap: boolean,
): LearningPageState {
  if (hasRoadmap) return "content";
  if (bootstrapStatus === "loading") return "loading";
  if (bootstrapStatus === "error") return "error";
  return "empty";
}
