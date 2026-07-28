import { useEffect, useState } from "react";
import { useRoadmapStore } from "@/components/learning/roadmap-store";
import {
  getCurrentActiveLearningRoadmap,
  hydrateActiveLearningRoadmap,
} from "@/services/learning-roadmaps-v2.service";

type BootstrapStatus = "loading" | "ready" | "error";

export function useActiveLearningRoadmapBootstrap() {
  const setActiveRoadmap = useRoadmapStore((state) => state.setActiveRoadmap);
  const clearRoadmap = useRoadmapStore((state) => state.clearRoadmap);
  const [reloadToken, setReloadToken] = useState(0);
  const [status, setStatus] = useState<BootstrapStatus>("loading");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    hydrateActiveLearningRoadmap(
      getCurrentActiveLearningRoadmap,
      setActiveRoadmap,
      clearRoadmap,
    )
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause
            : new Error("Không thể tải lộ trình học."),
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [clearRoadmap, reloadToken, setActiveRoadmap]);

  return {
    status,
    error,
    retry: () => setReloadToken((current) => current + 1),
  };
}
