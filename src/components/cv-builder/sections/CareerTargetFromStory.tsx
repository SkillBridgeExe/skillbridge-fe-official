import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { inferCareerTargetFromStory } from "@/services/cv-builder.service";
import type { CareerTargetFromStoryResponse } from "@shared/api";

// A few words minimum — below this the deterministic engine abstains anyway, so don't even call.
const MIN_STORY_LEN = 20;

interface CareerTargetFromStoryProps {
  /** CV draft id (endpoint is /api/cvs/:id/builder/story). Null = draft not ready yet. */
  draftId: string | null;
  /** Apply the inferred role's display name into the Career Target field. */
  onApply: (roleLabel: string) => void;
}

/**
 * Story → Career Target (cold-start, slice 1c). User writes one free story; the BE deterministic
 * role-inference (NO LLM, no quota) suggests a role they can apply. Abstains honestly (coaching
 * prompt, never auto-fill) when the story is too weak or ambiguous. Mounted behind
 * ENABLE_STORY_CAREER_TARGET until the 1b endpoint ships.
 */
export function CareerTargetFromStory({ draftId, onApply }: CareerTargetFromStoryProps) {
  const { t } = useTranslation("diagnosis");
  const [story, setStory] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<CareerTargetFromStoryResponse | null>(null);

  const canInfer = !!draftId && story.trim().length >= MIN_STORY_LEN && status !== "loading";

  async function handleInfer() {
    if (!draftId) return;
    setStatus("loading");
    setResult(null);
    try {
      const res = await inferCareerTargetFromStory(draftId, { story: story.trim() });
      setResult(res);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const role = result?.display_name ?? null;
  const abstained = !!result && (result.needs_user_input || !role);

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Label htmlFor="careerStory" className="text-sm font-medium">
        {t("builder.story.title")}
      </Label>
      <p className="text-xs text-muted-foreground">{t("builder.story.help")}</p>
      <Textarea
        id="careerStory"
        rows={4}
        value={story}
        onChange={(e) => setStory(e.target.value)}
        placeholder={t("builder.story.placeholder")}
      />
      {!draftId && <p className="text-xs text-amber-600">{t("builder.story.needDraft")}</p>}
      <Button type="button" size="sm" onClick={handleInfer} disabled={!canInfer}>
        {status === "loading" ? t("builder.story.inferring") : t("builder.story.infer")}
      </Button>

      {status === "error" && <p className="text-xs text-red-600">{t("builder.story.error")}</p>}

      {status === "done" &&
        result &&
        (abstained ? (
          <p className="text-xs text-amber-600">
            {t(result.reason === "ambiguous" ? "builder.story.ambiguous" : "builder.story.needsInput")}
          </p>
        ) : (
          role && (
            <div className="space-y-1.5 rounded-md bg-muted/40 p-2">
              <p className="text-sm">
                <span className="font-medium">{t("builder.story.resultTitle")}:</span> {role}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("builder.story.confidence", { pct: Math.round((result.confidence ?? 0) * 100) })}
              </p>
              {result.matched_skills.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("builder.story.matched", { skills: result.matched_skills.join(", ") })}
                </p>
              )}
              <Button type="button" size="sm" variant="secondary" onClick={() => onApply(role)}>
                {t("builder.story.apply")}
              </Button>
            </div>
          )
        ))}
    </div>
  );
}
