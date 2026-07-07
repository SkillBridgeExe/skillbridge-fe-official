import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import {
  inferCareerTargetFromStory,
  storyExtract,
  computeStoryReadiness,
} from "@/services/cv-builder.service";
import type {
  CareerTargetFromStoryResponse,
  StoryExtractResponse,
  StoryReadinessResponse,
} from "@shared/api";
import { StoryReviewPanel } from "./StoryReviewPanel";
import { StoryReadinessPanel } from "./StoryReadinessPanel";
import { Loader2 } from "lucide-react";

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
 *
 * W32: After slice-1 succeeds, user can "Extract" (slice-2) to pull projects + certifications,
 * then review/apply them via StoryReviewPanel.
 *
 * W33: After apply is complete, computes and displays CV readiness & gap via StoryReadinessPanel.
 */
export function CareerTargetFromStory({ draftId, onApply }: CareerTargetFromStoryProps) {
  const { t } = useTranslation("diagnosis");
  const [story, setStory] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<CareerTargetFromStoryResponse | null>(null);

  // W32: extract state
  const [extractStatus, setExtractStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [extractResult, setExtractResult] = useState<StoryExtractResponse | null>(null);

  // W33: readiness & gap state
  const [readinessStatus, setReadinessStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [readinessResult, setReadinessResult] = useState<StoryReadinessResponse | null>(null);

  const canInfer = !!draftId && story.trim().length >= MIN_STORY_LEN && status !== "loading";

  async function handleInfer() {
    if (!draftId) return;
    setStatus("loading");
    setResult(null);
    setExtractResult(null);
    setExtractStatus("idle");
    setReadinessStatus("idle");
    setReadinessResult(null);
    try {
      const res = await inferCareerTargetFromStory(draftId, { story: story.trim() });
      setResult(res);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  // W32: extract projects + certs from story
  async function handleExtract() {
    if (!draftId) return;
    setExtractStatus("loading");
    try {
      const res = await storyExtract(draftId, { story: story.trim() });
      setExtractResult(res);
      setExtractStatus("done");
    } catch {
      setExtractStatus("error");
    }
  }

  const role = result?.display_name ?? null;
  const abstained = !!result && (result.needs_user_input || !role);
  const showExtractBtn = status === "done" && result && !abstained && role;
  const showReviewPanel = extractStatus === "done" && extractResult && result;

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      {/* ── Standard free narrative input ── */}
      {readinessStatus === "idle" && (
        <>
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
        </>
      )}

      {status === "error" && readinessStatus === "idle" && (
        <p className="text-xs text-red-600">{t("builder.story.error")}</p>
      )}

      {status === "done" &&
        result &&
        readinessStatus === "idle" &&
        (abstained ? (
          <p className="text-xs text-amber-600">
            {t(result.reason === "ambiguous" ? "builder.story.ambiguous" : "builder.story.needsInput")}
          </p>
        ) : (
          role && (
            <div className="space-y-2 rounded-md bg-muted/40 p-2 animate-in fade-in-50 duration-200">
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
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => onApply(role)}>
                  {t("builder.story.apply")}
                </Button>
                {/* W32: Extract button */}
                {showExtractBtn && extractStatus !== "done" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleExtract}
                    disabled={extractStatus === "loading"}
                  >
                    {extractStatus === "loading" ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        {t("builder.storyReview.extracting")}
                      </>
                    ) : (
                      t("builder.storyReview.extractBtn")
                    )}
                  </Button>
                )}
              </div>
              {extractStatus === "error" && (
                <p className="text-xs text-red-600">{t("builder.storyReview.extractError")}</p>
              )}
            </div>
          )
        ))}

      {/* W32: Review panel after extract */}
      {showReviewPanel && readinessStatus === "idle" && (
        <StoryReviewPanel
          draftId={draftId!}
          careerTarget={result}
          extractResult={extractResult}
          onApplied={async (appliedRoleCode) => {
            // Clear extract view
            setExtractStatus("idle");
            setExtractResult(null);

            // Determine role code to check readiness
            const roleCodeToCompute = appliedRoleCode || result?.role_code;
            if (!roleCodeToCompute || !draftId) {
              // Fallback reset
              setStatus("idle");
              setResult(null);
              setStory("");
              return;
            }

            // W33: Trigger readiness calculation after apply saves draft to DB
            setReadinessStatus("loading");
            try {
              const res = await computeStoryReadiness(draftId, { role_code: roleCodeToCompute });
              setReadinessResult(res);
              setReadinessStatus("done");
            } catch {
              setReadinessStatus("error");
            }
          }}
        />
      )}

      {/* W33: Readiness states */}
      {readinessStatus === "loading" && (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-slate-50/50 space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-slate-500 font-medium">
            {t("builder.storyReadiness.loading")}
          </span>
        </div>
      )}

      {readinessStatus === "error" && (
        <div className="p-5 border border-rose-100 rounded-lg bg-rose-50/20 text-center space-y-3">
          <p className="text-xs text-rose-700 font-medium">
            {t("builder.storyReadiness.error")}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              setReadinessStatus("idle");
              setReadinessResult(null);
              setStatus("idle");
              setResult(null);
              setStory("");
            }}
          >
            {t("builder.storyReadiness.retryBtn")}
          </Button>
        </div>
      )}

      {readinessStatus === "done" && readinessResult && (
        <StoryReadinessPanel
          data={readinessResult}
          onClose={() => {
            setReadinessStatus("idle");
            setReadinessResult(null);
            setStatus("idle");
            setResult(null);
            setStory("");
          }}
        />
      )}
    </div>
  );
}
