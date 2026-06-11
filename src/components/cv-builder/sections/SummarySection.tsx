import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Sparkles, Edit3, X, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAiRewrite } from "@/hooks/use-cv-builder";
import { assessAiInput, type AiGateCode } from "@/lib/ai-input-gate";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";

/** Instruction cho mode 'custom' của BE rewrite (≤500 ký tự). */
const GENERATE_SUMMARY_INSTRUCTION =
  "Viết đoạn tóm tắt (summary) CV 2-3 câu, súc tích, không đại từ nhân xưng, dựa HOÀN TOÀN trên thông tin đã cho.";

/**
 * Gom dữ kiện THẬT user đã điền trong builder thành 2-4 dòng nguồn cho AI —
 * không bịa: chỉ join các mảnh không rỗng (mục tiêu/học vấn/kinh nghiệm/kỹ năng).
 */
function composeSummarySource(): string {
  const s = useCvBuilderStore.getState();
  const lines: string[] = [];

  if (s.summary.trim()) lines.push(s.summary.trim());

  const target = [s.targetPosition.trim(), s.careerLevel].filter(Boolean).join(" — ");
  const education = s.education
    .filter((e) => e.school.trim() || e.major.trim())
    .map((e) => [e.major.trim(), e.school.trim()].filter(Boolean).join(", "))
    .join("; ");
  const profileLine = [
    target && `Target role: ${target}`,
    education && `Education: ${education}`,
  ]
    .filter(Boolean)
    .join(" · ");
  if (profileLine) lines.push(profileLine);

  const experience = s.experience
    .filter((e) => e.company.trim() || e.position.trim())
    .map((e) => [e.position.trim(), e.company.trim()].filter(Boolean).join(" at "))
    .join("; ");
  const projects = s.projects
    .filter((p) => p.name.trim())
    .map((p) => p.name.trim())
    .join("; ");
  const workLine = [
    experience && `Experience: ${experience}`,
    projects && `Projects: ${projects}`,
  ]
    .filter(Boolean)
    .join(" · ");
  if (workLine) lines.push(workLine);

  const skills = [...s.technicalSkills, ...s.tools, ...s.softSkills].join(", ");
  if (skills) lines.push(`Skills: ${skills}`);

  return lines.join("\n");
}

type SummaryHint = AiGateCode | "LOCAL_ONLY";

export function SummarySection() {
  const { summary, summaryMode, setSummary, setSummaryMode, draftId } = useCvBuilderStore();
  const { toast } = useToast();
  const { t } = useTranslation("diagnosis");

  // AI Suggest states
  const [suggestionText, setSuggestionText] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  // Input-gate hint (inline — nút luôn bấm được, hint giải thích vì sao chưa chạy)
  const [gateHint, setGateHint] = useState<SummaryHint | null>(null);
  // BE guardrail giữ nguyên input khi Generate (fallback=true) → note nhỏ
  const [generateFallback, setGenerateFallback] = useState(false);

  const suggestRewrite = useAiRewrite();
  const generateRewrite = useAiRewrite();
  const targetRole = useDiagnosisStore((s) => s.targetRole);
  const isLoggedIn = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.authSource === "api",
  );

  const hintText = (hint: SummaryHint) =>
    hint === "LOCAL_ONLY"
      ? t("builder.localOnly")
      : hint === "OFF_TOPIC"
        ? t("builder.aiGate.offTopic")
        : t("builder.aiGate.needContext");

  const handleAiSuggest = () => {
    if (!draftId) return;
    if (!summary.trim()) {
      return toast({ title: t("builder.toastWriteSummaryFirst"), variant: "destructive" });
    }

    setGateHint(null);
    setShowSuggestion(true);
    setSuggestionText(null);
    setIsFallback(false);

    suggestRewrite.rewrite(
      {
        draftId,
        text: summary,
        mode: "harvard",
        role_code: targetRole ?? undefined,
        section: "summary",
      },
      {
        onSuccess: (data) => {
          setSuggestionText(data.suggestion);
          setIsFallback(!!data.fallback);
        },
        onGateFail: (reason) => {
          setShowSuggestion(false);
          setGateHint(reason);
        },
        onError: (err: Error) => {
          setShowSuggestion(false);
          toast({
            title: t("builder.toastAiSuggestFailed"),
            description: err?.message || t("builder.toastSomethingWrong"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleUseIt = () => {
    if (!suggestionText) return;
    setOriginalText(summary);
    setSummary(suggestionText);
  };

  const handleUndo = () => {
    if (originalText === null) return;
    setSummary(originalText);
    setOriginalText(null);
  };

  const handleClose = () => {
    setShowSuggestion(false);
    setSuggestionText(null);
    setIsFallback(false);
  };

  /**
   * "Tạo tóm tắt" THẬT: gom dữ kiện đã điền → FE gate (instant) → BE rewrite
   * mode 'custom'. Không còn template giả — AI chỉ viết từ thông tin thật.
   */
  const handleGenerate = () => {
    setGateHint(null);
    setGenerateFallback(false);

    const sourceText = composeSummarySource();
    const verdict = assessAiInput(sourceText);
    if (!verdict.ok) {
      return setGateHint(verdict.reason ?? "INSUFFICIENT_CONTEXT");
    }
    if (!isLoggedIn || !draftId) {
      return setGateHint("LOCAL_ONLY");
    }

    generateRewrite.rewrite(
      {
        draftId,
        text: sourceText,
        mode: "custom",
        instruction: GENERATE_SUMMARY_INSTRUCTION,
        role_code: targetRole ?? undefined,
        section: "summary",
      },
      {
        onSuccess: (data) => {
          setSummary(data.suggestion);
          setSummaryMode("manual");
          setGenerateFallback(!!data.fallback);
          toast({ title: t("builder.toastSummaryGenerated") });
        },
        onGateFail: (reason) => setGateHint(reason),
        onError: (err: Error) => {
          toast({
            title: t("builder.toastAiSuggestFailed"),
            description: err?.message || t("builder.toastSomethingWrong"),
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn("flex-1", summaryMode === "manual" && "border-primary text-primary bg-primary/5")}
          onClick={() => setSummaryMode("manual")}
        >
          <Edit3 className="w-4 h-4 mr-2" /> {t("builder.writeManually")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn("flex-1", summaryMode === "ai" && "border-primary text-primary bg-primary/5")}
          onClick={() => setSummaryMode("ai")}
        >
          <Sparkles className="w-4 h-4 mr-2" /> {t("builder.generateWithAi")}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{summaryMode === "ai" ? t("builder.tellAiLabel") : t("builder.summaryLabel")}</Label>
          {isLoggedIn && draftId && summary.trim() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAiSuggest}
              className="h-7 text-xs text-primary hover:bg-primary/5 hover:text-primary/90 flex items-center gap-1 px-2 py-1 shrink-0"
              disabled={suggestRewrite.isPending}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("builder.aiSuggest")}</span>
            </Button>
          )}
        </div>
        <Textarea
          className="min-h-[120px] resize-none text-[13px]"
          placeholder={
            summaryMode === "ai"
              ? t("builder.summaryAiPlaceholder")
              : t("builder.summaryManualPlaceholder")
          }
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      {/* Input-gate hint — giải thích vì sao AI chưa chạy (thay vì nút chết) */}
      {gateHint && (
        <div className="text-[11px] text-[#8C6D1F] bg-[#FBF3DB]/60 border border-[#F2E5BC] rounded-lg p-2.5 leading-relaxed">
          {hintText(gateHint)}
        </div>
      )}

      {/* BE guardrail giữ nguyên nội dung khi Generate */}
      {generateFallback && (
        <div className="text-[11px] text-[#8C6D1F] bg-[#FBF3DB]/60 border border-[#F2E5BC] rounded-lg p-2.5 leading-relaxed">
          {t("builder.aiGate.fallbackNote")}
        </div>
      )}

      {/* Suggestion Box */}
      {showSuggestion && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t("builder.aiSuggestLabel")}
            </span>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {suggestRewrite.isPending ? (
            <div className="space-y-2 py-1">
              <div className="h-3.5 bg-slate-200 rounded w-full" />
              <div className="h-3.5 bg-slate-200 rounded w-5/6" />
            </div>
          ) : (
            <>
              <p className="text-[13px] text-slate-700 leading-relaxed font-sans font-medium">
                {suggestionText}
              </p>

              {isFallback ? (
                <div className="text-[11px] text-[#8C6D1F] bg-[#FBF3DB]/60 border border-[#F2E5BC] rounded p-2 leading-relaxed">
                  {t("builder.fallbackNote")}
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1.5">
                  {originalText && summary === suggestionText ? (
                    <Button
                      size="sm"
                      onClick={handleUndo}
                      variant="outline"
                      className="h-7 text-xs border-amber-500 text-amber-600 hover:bg-amber-50 gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t("builder.undo")}</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleUseIt}
                      className="h-7 text-xs bg-primary hover:bg-primary/90 text-white"
                    >
                      {t("builder.useIt")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAiSuggest}
                    className="h-7 text-xs text-slate-500 hover:text-slate-750 hover:bg-slate-200/50"
                  >
                    {t("builder.retry")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {summaryMode === "ai" && (
        <div className="flex justify-end gap-2">
          <Button onClick={handleGenerate} disabled={generateRewrite.isPending} size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            {generateRewrite.isPending ? t("builder.generating") : t("builder.generateSummary")}
          </Button>
        </div>
      )}

      {summaryMode === "manual" && summary && !showSuggestion && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSummaryMode("ai")}>
            <Sparkles className="w-3 h-3 mr-1" /> {t("builder.regenerate")}
          </Button>
        </div>
      )}
    </div>
  );
}
