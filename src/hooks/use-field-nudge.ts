import { useEffect, useRef, useState } from "react";
import { assistantAnalyze } from "@/services/cv-builder.service";

/**
 * Cheap on-blur nudge: runs the RULE `/analyze` (0 LLM, no quota) when the user
 * leaves a content field, and surfaces the number of gaps it finds. This is the
 * proactive discovery layer — clicking the resulting nudge opens the companion
 * via the SAME existing activate path (see `openCompanion` in each section).
 * Blur must never throw or toast — errors are swallowed to count 0.
 */
export function useFieldNudge(args: {
  draftId: string | null | undefined;
  section: "summary" | "projects" | "experience";
  currentValue: string;
  fieldPath: string;
  locale: "vi" | "en";
}): { count: number; handleBlur: () => void } {
  const { draftId, section, currentValue, fieldPath, locale } = args;
  const [count, setCount] = useState(0);
  // Dedup: skip re-analyzing a value we already ran on the last blur.
  const lastAnalyzed = useRef<string | null>(null);
  const isMounted = useRef(true);
  useEffect(() => () => {
    isMounted.current = false;
  }, []);

  const handleBlur = () => {
    if (!draftId || !currentValue.trim()) {
      setCount(0);
      return;
    }
    if (lastAnalyzed.current === currentValue) return;
    lastAnalyzed.current = currentValue;

    assistantAnalyze(draftId, {
      current_value: currentValue,
      section,
      field_path: fieldPath,
      locale,
    })
      .then((turn) => {
        if (isMounted.current) setCount(turn.questions.length);
      })
      .catch(() => {
        if (isMounted.current) setCount(0);
      });
  };

  return { count, handleBlur };
}
