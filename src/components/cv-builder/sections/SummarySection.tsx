import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Sparkles, Edit3, X, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRewriteFieldMutation } from "@/hooks/use-cv-builder";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useTranslation } from "react-i18next";

export function SummarySection() {
  const { summary, summaryMode, setSummary, setSummaryMode, draftId } = useCvBuilderStore();
  const { toast } = useToast();
  const { t } = useTranslation("diagnosis");
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Suggest states
  const [suggestionText, setSuggestionText] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const rewriteMutation = useRewriteFieldMutation();
  const targetRole = useDiagnosisStore((s) => s.targetRole);
  const isLoggedIn = !!localStorage.getItem("accessToken");

  const handleAiSuggest = () => {
    if (!draftId) return;
    if (!summary.trim()) {
      return toast({ title: "Please write some summary first", variant: "destructive" });
    }

    setShowSuggestion(true);
    setSuggestionText(null);
    setIsFallback(false);

    rewriteMutation.mutate(
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
        onError: (err: any) => {
          setShowSuggestion(false);
          toast({
            title: "AI Suggestion failed",
            description: err?.message || "Something went wrong.",
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

  const handleGenerate = () => {
    if (!summary.trim()) {
      return toast({ title: "Please tell us about yourself first", variant: "destructive" });
    }
    setIsGenerating(true);
    setTimeout(() => {
      setSummary(
        `Results-driven ${summary.includes("student") ? "student" : "professional"} with a passion for innovation. ` +
        `Eager to apply theoretical knowledge and practical experience in a dynamic work environment.`
      );
      setIsGenerating(false);
      setSummaryMode("manual");
      toast({ title: "Summary Generated" });
    }, 1500);
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
          <Edit3 className="w-4 h-4 mr-2" /> Write Manually
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn("flex-1", summaryMode === "ai" && "border-primary text-primary bg-primary/5")}
          onClick={() => setSummaryMode("ai")}
        >
          <Sparkles className="w-4 h-4 mr-2" /> Generate with AI
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{summaryMode === "ai" ? "Tell AI about yourself" : "Professional Summary"}</Label>
          {isLoggedIn && draftId && summary.trim() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAiSuggest}
              className="h-7 text-xs text-primary hover:bg-primary/5 hover:text-primary/90 flex items-center gap-1 px-2 py-1 shrink-0"
              disabled={rewriteMutation.isPending}
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
              ? "Example: I am a final-year Software Engineering student interested in Business Analysis. I have experience writing user stories..."
              : "Write a brief summary of your background, skills, and career goals..."
          }
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

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

          {rewriteMutation.isPending ? (
            <div className="space-y-2 py-1 animate-pulse">
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
          <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Summary"}
          </Button>
        </div>
      )}

      {summaryMode === "manual" && summary && !showSuggestion && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSummaryMode("ai")}>
            <Sparkles className="w-3 h-3 mr-1" /> Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}
