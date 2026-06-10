import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Trash2, Sparkles, X, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAiRewrite } from "@/hooks/use-cv-builder";
import type { AiGateCode } from "@/lib/ai-input-gate";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useTranslation } from "react-i18next";


export function ExperienceSection() {
  const { experience, addExperience, updateExperience, removeExperience, draftId } = useCvBuilderStore();
  const { toast } = useToast();
  const { t } = useTranslation("diagnosis");

  // AI suggest states per field per entry
  const [activeSuggestion, setActiveSuggestion] = useState<{
    entryId: string;
    field: "description" | "achievements";
    suggestion: string;
    isFallback: boolean;
  } | null>(null);

  const [pendingTarget, setPendingTarget] = useState<{
    id: string;
    field: "description" | "achievements";
  } | null>(null);

  const [originalTextMap, setOriginalTextMap] = useState<Record<string, string>>({});

  // Input-gate hint per field — nút luôn bấm được, hint giải thích vì sao chưa chạy
  const [gateHint, setGateHint] = useState<{
    entryId: string;
    field: "description" | "achievements";
    reason: AiGateCode;
  } | null>(null);

  const aiRewrite = useAiRewrite();
  const targetRole = useDiagnosisStore((s) => s.targetRole);
  const isLoggedIn = !!localStorage.getItem("accessToken");

  const handleAiSuggest = (entryId: string, field: "description" | "achievements", currentText: string) => {
    if (!draftId) return;
    if (!currentText.trim()) {
      return toast({ title: t("builder.toastWriteTextFirst"), variant: "destructive" });
    }

    setGateHint(null);
    setPendingTarget({ id: entryId, field });
    setActiveSuggestion(null);

    aiRewrite.rewrite(
      {
        draftId,
        text: currentText,
        mode: "harvard",
        role_code: targetRole ?? undefined,
        section: "experience",
      },
      {
        onSuccess: (data) => {
          setActiveSuggestion({
            entryId,
            field,
            suggestion: data.suggestion,
            isFallback: !!data.fallback,
          });
          setPendingTarget(null);
        },
        onGateFail: (reason) => {
          setPendingTarget(null);
          setGateHint({ entryId, field, reason });
        },
        onError: (err: Error) => {
          setPendingTarget(null);
          toast({
            title: t("builder.toastAiSuggestFailed"),
            description: err?.message || t("builder.toastSomethingWrong"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleUseIt = (entryId: string, field: "description" | "achievements") => {
    if (!activeSuggestion) return;
    const entry = experience.find((e) => e.id === entryId);
    if (!entry) return;

    const oldValue = entry[field];
    updateExperience(entryId, field, activeSuggestion.suggestion);
    updateExperience(entryId, "aiRewrite", oldValue); // Sử dụng aiRewrite để lưu backup
    setOriginalTextMap((prev) => ({ ...prev, [`${entryId}_${field}`]: oldValue }));
  };

  const handleUndo = (entryId: string, field: "description" | "achievements") => {
    const backupValue = originalTextMap[`${entryId}_${field}`];
    if (!backupValue) return;

    updateExperience(entryId, field, backupValue);
    updateExperience(entryId, "aiRewrite", "");
    setOriginalTextMap((prev) => {
      const copy = { ...prev };
      delete copy[`${entryId}_${field}`];
      return copy;
    });
  };

  const handleClose = () => {
    setActiveSuggestion(null);
    setPendingTarget(null);
  };

  const renderGateHint = (entryId: string, field: "description" | "achievements") => {
    if (gateHint?.entryId !== entryId || gateHint?.field !== field) return null;
    return (
      <div className="text-[11px] text-[#8C6D1F] bg-[#FBF3DB]/60 border border-[#F2E5BC] rounded-lg p-2.5 leading-relaxed mt-1.5">
        {gateHint.reason === "OFF_TOPIC"
          ? t("builder.aiGate.offTopic")
          : t("builder.aiGate.needContext")}
      </div>
    );
  };

  const renderSuggestionBox = (entryId: string, field: "description" | "achievements") => {
    const isPending = aiRewrite.isPending && pendingTarget?.id === entryId && pendingTarget?.field === field;
    const entry = experience.find((e) => e.id === entryId);
    const hasUndo = entry && entry.aiRewrite && originalTextMap[`${entryId}_${field}`] === entry.aiRewrite;

    if (!isPending && (!activeSuggestion || activeSuggestion.entryId !== entryId || activeSuggestion.field !== field)) {
      return null;
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t("builder.aiSuggestLabel")}
          </span>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isPending ? (
          <div className="space-y-2 py-1">
            <div className="h-3.5 bg-slate-200 rounded w-full" />
            <div className="h-3.5 bg-slate-200 rounded w-5/6" />
          </div>
        ) : (
          <>
            <p className="text-[13px] text-slate-700 leading-relaxed font-sans font-medium">
              {activeSuggestion?.suggestion}
            </p>

            {activeSuggestion?.isFallback ? (
              <div className="text-[11px] text-[#8C6D1F] bg-[#FBF3DB]/60 border border-[#F2E5BC] rounded p-2 leading-relaxed">
                {t("builder.fallbackNote")}
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                {hasUndo && entry[field] === activeSuggestion?.suggestion ? (
                  <Button
                    size="sm"
                    onClick={() => handleUndo(entryId, field)}
                    variant="outline"
                    className="h-7 text-xs border-amber-500 text-amber-600 hover:bg-amber-50 gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t("builder.undo")}</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleUseIt(entryId, field)}
                    className="h-7 text-xs bg-primary hover:bg-primary/90 text-white"
                  >
                    {t("builder.useIt")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAiSuggest(entryId, field, entry ? entry[field] : "")}
                  className="h-7 text-xs text-slate-500 hover:text-slate-750 hover:bg-slate-200/50"
                >
                  {t("builder.retry")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      {experience.map((exp, index) => (
        <div key={exp.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-700">{t("builder.entry.experience")} #{index + 1}</h4>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeExperience(exp.id)} disabled={experience.length === 1}
              aria-label={`${t("builder.remove")} ${t("builder.entry.experience")} ${index + 1}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.company")} *</Label>
              <Input value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} placeholder={t("builder.ph.company")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.position")} *</Label>
              <Input value={exp.position} onChange={(e) => updateExperience(exp.id, "position", e.target.value)} placeholder={t("builder.ph.position")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.startDate")}</Label>
              <Input value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} placeholder={t("builder.ph.startDate")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.endDate")}</Label>
              <Input value={exp.endDate} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} placeholder={t("builder.ph.endDate")} />
            </div>

            {/* Description/Responsibilities field */}
            <div className="space-y-2 col-span-2 pt-2">
              <div className="flex items-center justify-between">
                <Label>{t("builder.fields.expDescription")}</Label>
                {isLoggedIn && draftId && exp.description.trim() && (
                  <Button 
                    variant="ghost" size="sm" 
                    className="h-6 text-xs text-primary hover:bg-primary/5 flex items-center gap-1 px-1.5"
                    onClick={() => handleAiSuggest(exp.id, "description", exp.description)}
                    disabled={aiRewrite.isPending && pendingTarget?.id === exp.id && pendingTarget?.field === "description"}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t("builder.aiSuggest")}</span>
                  </Button>
                )}
              </div>
              <Textarea
                value={exp.description}
                onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                placeholder={t("builder.ph.expDescription")}
                className="text-[13px] resize-none h-24 font-sans"
              />

              {/* Input-gate hint for Description */}
              {renderGateHint(exp.id, "description")}

              {/* Suggestion Box for Description */}
              {((pendingTarget?.id === exp.id && pendingTarget?.field === "description") ||
                (activeSuggestion?.entryId === exp.id && activeSuggestion?.field === "description")) &&
                renderSuggestionBox(exp.id, "description")
              }
            </div>

            {/* Achievements field */}
            <div className="space-y-2 col-span-2 pt-2">
              <div className="flex items-center justify-between">
                <Label>{t("builder.fields.keyAchievements")}</Label>
                {isLoggedIn && draftId && exp.achievements.trim() && (
                  <Button 
                    variant="ghost" size="sm" 
                    className="h-6 text-xs text-primary hover:bg-primary/5 flex items-center gap-1 px-1.5"
                    onClick={() => handleAiSuggest(exp.id, "achievements", exp.achievements)}
                    disabled={aiRewrite.isPending && pendingTarget?.id === exp.id && pendingTarget?.field === "achievements"}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t("builder.aiSuggest")}</span>
                  </Button>
                )}
              </div>
              <Textarea
                value={exp.achievements}
                onChange={(e) => updateExperience(exp.id, "achievements", e.target.value)}
                placeholder={t("builder.ph.keyAchievements")}
                className="text-[13px] resize-none h-20 font-sans"
              />

              {/* Input-gate hint for Achievements */}
              {renderGateHint(exp.id, "achievements")}

              {/* Suggestion Box for Achievements */}
              {((pendingTarget?.id === exp.id && pendingTarget?.field === "achievements") ||
                (activeSuggestion?.entryId === exp.id && activeSuggestion?.field === "achievements")) &&
                renderSuggestionBox(exp.id, "achievements")
              }
            </div>

          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={addExperience}>
        <Plus className="w-4 h-4 mr-2" /> {t("builder.add.experience")}
      </Button>
    </div>
  );
}
