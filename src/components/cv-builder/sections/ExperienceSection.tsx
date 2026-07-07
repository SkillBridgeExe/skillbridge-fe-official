import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor, normalizeToBulletText } from "@/components/ui/rich-text-editor";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Sparkles, X, RotateCcw, Briefcase, List as ListIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAiRewrite } from "@/hooks/use-cv-builder";
import type { AiGateCode } from "@/lib/ai-input-gate";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";
import { useCompanionStore } from "@/store/useCompanionStore";
import { openIntakeCoach } from "@/components/companion/skills/open-intake-coach";
import type { CoachTrigger } from "@/components/companion/skills/coach-flow";
import { findBulletWithSkill } from "@/components/companion/skills/find-bullet-with-skill";
import { SectionItemCard } from "./SectionItemCard";
import {
  getAchievementLine,
  replaceAchievementLine,
  suggestionKeyForField,
} from "./achievement-line-patch";
import { useScrollToNewItem } from "@/hooks/use-scroll-to-new-item";
import { resumeDocumentPaths } from "@/lib/resume-engine/document-v1-paths";


export function ExperienceSection() {
  const {
    experience,
    addExperience,
    updateExperience,
    removeExperience,
    duplicateExperience,
    moveExperience,
    draftId,
    clearSectionEvaluation,
    markSectionNeedsRecheck,
    pendingProveIt,
    setPendingProveIt,
  } = useCvBuilderStore();
  const { toast } = useToast();
  const { t } = useTranslation("diagnosis");

  // AI suggest states per field per entry
  const [activeSuggestion, setActiveSuggestion] = useState<{
    entryId: string;
    field: "description" | "achievements";
    achievementIndex?: number;
    suggestion: string;
    isFallback: boolean;
  } | null>(null);

  const [pendingTarget, setPendingTarget] = useState<{
    id: string;
    field: "description" | "achievements";
    achievementIndex?: number;
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
  const isLoggedIn = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.authSource === "api",
  );
  // Số lần "Viết lại" theo từng (entry, field) → token variant để BE bỏ cache.
  const attempts = useRef<Record<string, number>>({});

  useScrollToNewItem(experience, "experience");

  // Pillar 3 (no-dead-end): route a stuck field (input-gate reject OR an empty
  // field with nothing to rewrite) INTO the intake coaching loop instead of a
  // dead-end. Reuses the SAME `cv_intake` context the "✨ Trợ lý điền nhanh"
  // button opens; generation still flows only through extract→computeIntakeFields.
  const routeFieldToIntakeCoach = useCallback((
    entryIndex: number,
    field: "description" | "achievements",
    trigger: CoachTrigger,
  ) => {
    if (!draftId) return;
    const exp = experience[entryIndex];
    if (!exp) return;
    openIntakeCoach({
      id: `intake-coach:experience[${entryIndex}].${field}`,
      draftId,
      entryIndex,
      currentEntry: {
        company: exp.company,
        position: exp.position,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description,
        achievements: exp.achievements,
      },
      coachTrigger: trigger,
      seedNarrative: exp[field],
      onApply: (fields) => {
        for (const [key, value] of Object.entries(fields)) {
          updateExperience(exp.id, key as keyof typeof exp, value);
        }
        markSectionNeedsRecheck("experience", {
          source: "assistant_patch",
          fieldPath: resumeDocumentPaths.experienceDescription(exp.id),
          beforePreview: "intake coach update",
          afterPreview: "intake coach applied",
        });
      },
    });
  }, [markSectionNeedsRecheck, draftId, experience, updateExperience]);

  const handleAiSuggest = useCallback((
    entryId: string,
    field: "description" | "achievements",
    currentText: string,
    regenerate = false,
    achievementIndex?: number,
  ) => {
    if (!draftId) return;
    if (!currentText.trim()) {
      return toast({ title: t("builder.toastWriteTextFirst"), variant: "destructive" });
    }

    setGateHint(null);
    setPendingTarget({ id: entryId, field, achievementIndex });
    setActiveSuggestion(null);

    const key = suggestionKeyForField(entryId, field, achievementIndex);
    const attempt = regenerate ? (attempts.current[key] = (attempts.current[key] ?? 0) + 1) : 0;

    aiRewrite.rewrite(
      {
        draftId,
        text: currentText,
        mode: "harvard",
        role_code: targetRole ?? undefined,
        section: "experience",
        ...(attempt > 0 ? { variant: String(attempt) } : {}),
      },
      {
        onSuccess: (data) => {
          setActiveSuggestion({
            entryId,
            field,
            achievementIndex,
            suggestion: data.suggestion,
            isFallback: !!data.fallback,
          });
          setPendingTarget(null);
        },
        onGateFail: (reason) => {
          setPendingTarget(null);
          setGateHint({ entryId, field, reason });
          // No dead-end: open the intake coaching loop so the user can re-tell the
          // story instead of being stuck behind a gate reject.
          const idx = experience.findIndex((e) => e.id === entryId);
          if (idx >= 0) routeFieldToIntakeCoach(idx, field, "gate");
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
  }, [aiRewrite, draftId, experience, routeFieldToIntakeCoach, t, targetRole, toast]);

  useEffect(() => {
    if (!pendingProveIt) return;
    // The builder can mount before the server draft id is ready. Keep the signal
    // alive until rewrite can actually run; clearing it early would lose the user's
    // explicit "prove this skill" action.
    if (!draftId) return;

    const match = findBulletWithSkill(experience, pendingProveIt);
    if (!match) {
      document.getElementById("experience")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast({
        title: t("builder.proveit.pickBullet", { skill: pendingProveIt.displayName }),
      });
      setPendingProveIt(null);
      return;
    }

    const entry = experience.find((item) => item.id === match.entryId);
    if (!entry) {
      setPendingProveIt(null);
      return;
    }

    const field = match.field === "description" ? "description" : "achievements";
    const currentText = entry[field];

    const index = experience.findIndex(e => e.id === entry.id);
    const contextId = `cvbuilder:experience[${index}].${field}`;
    const fieldPath = field === "description"
      ? resumeDocumentPaths.experienceDescription(entry.id)
      : resumeDocumentPaths.experienceAchievements(entry.id);

    useCompanionStore.getState().registerContext({
      id: contextId,
      getTurn: () => ({
        skill: "cv_builder",
        props: {
          draftId,
          fieldPath,
          section: "experience",
          currentValue: currentText,
          onApply: (after: string) => {
            updateExperience(entry.id, field, after);
            markSectionNeedsRecheck("experience", {
              source: "diagnosis_fix",
              fieldPath,
              beforePreview: currentText.substring(0, 100),
              afterPreview: after.substring(0, 100),
            });
          },
        },
      }),
    });
    useCompanionStore.getState().activateContext(contextId);
    useCompanionStore.setState({ bubbleOpen: true });

    setPendingProveIt(null);
  }, [draftId, experience, handleAiSuggest, pendingProveIt, setPendingProveIt, t, toast, markSectionNeedsRecheck, updateExperience]);

  const handleConvertToBullets = (entryId: string, field: "description" | "achievements", currentText: string) => {
    if (!currentText.trim()) return;
    updateExperience(entryId, field, normalizeToBulletText(currentText));
  };

  const handleUseIt = (entryId: string, field: "description" | "achievements") => {
    if (!activeSuggestion) return;
    const entry = experience.find((e) => e.id === entryId);
    if (!entry) return;

    const key = suggestionKeyForField(entryId, field, activeSuggestion.achievementIndex);
    const isLineRewrite = field === "achievements" && activeSuggestion.achievementIndex !== undefined;
    const oldValue = isLineRewrite
      ? getAchievementLine(entry.achievements, activeSuggestion.achievementIndex as number)
      : entry[field];
    const nextValue = isLineRewrite
      ? replaceAchievementLine(entry.achievements, activeSuggestion.achievementIndex as number, activeSuggestion.suggestion)
      : activeSuggestion.suggestion;
    updateExperience(entryId, field, nextValue);
    updateExperience(entryId, "aiRewrite", oldValue); // Sử dụng aiRewrite để lưu backup
    setOriginalTextMap((prev) => ({ ...prev, [key]: oldValue }));

    const fieldPath = field === "description"
      ? resumeDocumentPaths.experienceDescription(entryId)
      : resumeDocumentPaths.experienceAchievements(entryId);

    markSectionNeedsRecheck("experience", {
      source: "assistant_patch",
      fieldPath,
      beforePreview: oldValue.substring(0, 100),
      afterPreview: nextValue.substring(0, 100),
    });
  };

  const handleUndo = (entryId: string, field: "description" | "achievements") => {
    const achievementIndex = activeSuggestion?.entryId === entryId && activeSuggestion.field === field
      ? activeSuggestion.achievementIndex
      : undefined;
    const key = suggestionKeyForField(entryId, field, achievementIndex);
    const backupValue = originalTextMap[key];
    if (!backupValue) return;

    const entry = experience.find((e) => e.id === entryId);
    if (!entry) return;
    const nextValue = field === "achievements" && achievementIndex !== undefined
      ? replaceAchievementLine(entry.achievements, achievementIndex, backupValue)
      : backupValue;
    updateExperience(entryId, field, nextValue);
    updateExperience(entryId, "aiRewrite", "");
    setOriginalTextMap((prev) => {
      const copy = { ...prev };
      delete copy[key];
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
    const achievementIndex = activeSuggestion?.entryId === entryId && activeSuggestion.field === field
      ? activeSuggestion.achievementIndex
      : pendingTarget?.id === entryId && pendingTarget.field === field
        ? pendingTarget.achievementIndex
        : undefined;
    const targetValue = entry && field === "achievements" && achievementIndex !== undefined
      ? getAchievementLine(entry.achievements, achievementIndex)
      : entry?.[field];
    const key = suggestionKeyForField(entryId, field, achievementIndex);
    const hasUndo = Boolean(entry && entry.aiRewrite && originalTextMap[key] === entry.aiRewrite);

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
                {hasUndo && targetValue === activeSuggestion?.suggestion ? (
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
                  onClick={() => handleAiSuggest(entryId, field, targetValue ?? "", true, achievementIndex)}
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
    <div className="space-y-6">
      {experience.length > 0 ? experience.map((exp, index) => {
        return (
          <div key={exp.id} id={`experience-${exp.id}`}>
          <SectionItemCard
            key={exp.id}
            title={exp.position || exp.company || t("builder.fields.newExperience")}
            subtitle={exp.startDate || exp.endDate ? `${exp.startDate} - ${exp.endDate}` : undefined}
            onRemove={() => removeExperience(exp.id)}
            canRemove={true}
            requireConfirmOnRemove={!!exp.company || !!exp.position || !!exp.description || !!exp.achievements}
            onDuplicate={() => {
              duplicateExperience(exp.id);
              // Focus could be handled here or rely on react rendering
            }}
            canDuplicate={true}
            onMoveUp={() => moveExperience(exp.id, "up")}
            canMoveUp={index > 0}
            onMoveDown={() => moveExperience(exp.id, "down")}
            canMoveDown={index < experience.length - 1}
            defaultExpanded={index === 0 || !exp.company}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm text-slate-700">{t("builder.entry.experience")} #{index + 1}</h4>
              {isLoggedIn && draftId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:bg-primary/5 flex items-center justify-center gap-1 px-2"
                  onClick={() => {
                    const id = `cvbuilder:intake:experience[${index}]`;
                    useCompanionStore.getState().registerContext({
                      id,
                      getTurn: () => ({
                        skill: "cv_intake",
                        props: {
                          draftId,
                          entryIndex: index,
                          currentEntry: {
                            company: exp.company,
                            position: exp.position,
                            startDate: exp.startDate,
                            endDate: exp.endDate,
                            description: exp.description,
                            achievements: exp.achievements,
                          },
                          onApply: (fields: Record<string, string>) => {
                            for (const [field, value] of Object.entries(fields)) {
                              updateExperience(exp.id, field as keyof typeof exp, value);
                            }
                            clearSectionEvaluation("experience");
                          },
                        },
                      }),
                    });
                    useCompanionStore.getState().activateContext(id);
                    useCompanionStore.setState({ bubbleOpen: true });
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="leading-none">{t("companion.intake.trigger")}</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label>{t("builder.fields.company")} *</Label>
                <Input value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} placeholder={t("builder.ph.company")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.position")} *</Label>
                <Input value={exp.position} onChange={(e) => updateExperience(exp.id, "position", e.target.value)} placeholder={t("builder.ph.position")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.startDate")}</Label>
                <Input value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} placeholder={t("builder.ph.startDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.endDate")}</Label>
                <Input value={exp.endDate} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} placeholder={t("builder.ph.endDate")} />
              </div>

            {/* Description/Responsibilities field */}
            <div className="space-y-2 pt-2">
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
              <RichTextEditor
                value={exp.description}
                onChange={(val) => updateExperience(exp.id, "description", val)}
                placeholder={t("builder.ph.expDescription")}
                className="text-[13px] min-h-[96px] font-sans"
              />
              <div className="flex justify-end pt-0.5">
                <Button
                  variant="ghost" size="sm"
                  className="h-6 text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1 px-1.5"
                  onClick={() => handleConvertToBullets(exp.id, "description", exp.description)}
                  title={t("builder.richText.convertToBullets")}
                  aria-label={t("builder.richText.convertToBullets")}
                >
                  <ListIcon className="w-3 h-3" />
                  <span>{t("builder.richText.convertToBullets")}</span>
                </Button>
              </div>

              {/* Input-gate hint for Description */}
              {renderGateHint(exp.id, "description")}

              {/* Suggestion Box for Description */}
              {((pendingTarget?.id === exp.id && pendingTarget?.field === "description") ||
                (activeSuggestion?.entryId === exp.id && activeSuggestion?.field === "description")) &&
                renderSuggestionBox(exp.id, "description")
              }

              {/* Companion AI trigger for description (has text → rewrite skill) */}
              {isLoggedIn && draftId && exp.description.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:bg-primary/5 flex items-center gap-1 px-2"
                  disabled={!draftId || !exp.description.trim()}
                  onClick={() => {
                    const id = `cvbuilder:experience[${index}].description`;
                    useCompanionStore.getState().registerContext({
                      id,
                      getTurn: () => ({
                        skill: "cv_builder",
                        props: {
                          draftId,
                          fieldPath: resumeDocumentPaths.experienceDescription(exp.id),
                          section: "experience",
                          currentValue: exp.description,
                          onApply: (after: string) => {
                            updateExperience(exp.id, "description", after);
                            clearSectionEvaluation("experience");
                          },
                        },
                      }),
                    });
                    useCompanionStore.getState().activateContext(id);
                    useCompanionStore.setState({ bubbleOpen: true });
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("companion.analyze")}</span>
                </Button>
              )}
              {/* Empty field → no dead-end: open the intake coaching loop */}
              {isLoggedIn && draftId && !exp.description.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:bg-primary/5 flex items-center gap-1 px-2"
                  onClick={() => routeFieldToIntakeCoach(index, "description", "gate")}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("companion.intake.coachStuck")}</span>
                </Button>
              )}
            </div>

            {/* Achievements field */}
            <div className="space-y-2 pt-2">
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
              <RichTextEditor
                value={exp.achievements}
                onChange={(val) => updateExperience(exp.id, "achievements", val)}
                placeholder={t("builder.ph.keyAchievements")}
                className="text-[13px] min-h-[96px] font-sans"
              />
              <div className="flex justify-end pt-0.5">
                <Button
                  variant="ghost" size="sm"
                  className="h-6 text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1 px-1.5"
                  onClick={() => handleConvertToBullets(exp.id, "achievements", exp.achievements)}
                  title={t("builder.richText.convertToBullets")}
                  aria-label={t("builder.richText.convertToBullets")}
                >
                  <ListIcon className="w-3 h-3" />
                  <span>{t("builder.richText.convertToBullets")}</span>
                </Button>
              </div>

              {/* Input-gate hint for Achievements */}
              {renderGateHint(exp.id, "achievements")}

              {/* Suggestion Box for Achievements */}
              {((pendingTarget?.id === exp.id && pendingTarget?.field === "achievements") ||
                (activeSuggestion?.entryId === exp.id && activeSuggestion?.field === "achievements")) &&
                renderSuggestionBox(exp.id, "achievements")
              }

              {/* Companion AI trigger for achievements (has text → rewrite skill) */}
              {isLoggedIn && draftId && exp.achievements.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:bg-primary/5 flex items-center gap-1 px-2"
                  disabled={!draftId || !exp.achievements.trim()}
                  onClick={() => {
                    const id = `cvbuilder:experience[${index}].achievements`;
                    useCompanionStore.getState().registerContext({
                      id,
                      getTurn: () => ({
                        skill: "cv_builder",
                        props: {
                          draftId,
                          fieldPath: resumeDocumentPaths.experienceAchievements(exp.id),
                          section: "experience",
                          currentValue: exp.achievements,
                          onApply: (after: string) => {
                            updateExperience(exp.id, "achievements", after);
                            clearSectionEvaluation("experience");
                          },
                        },
                      }),
                    });
                    useCompanionStore.getState().activateContext(id);
                    useCompanionStore.setState({ bubbleOpen: true });
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("companion.analyze")}</span>
                </Button>
              )}
              {/* Empty field → no dead-end: open the intake coaching loop */}
              {isLoggedIn && draftId && !exp.achievements.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:bg-primary/5 flex items-center gap-1 px-2"
                  onClick={() => routeFieldToIntakeCoach(index, "achievements", "gate")}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("companion.intake.coachStuck")}</span>
                </Button>
              )}
            </div>

          </div>
          </SectionItemCard>
          </div>
        );
      }) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700 mb-1">{t("builder.empty.experienceTitle")}</h4>
          <p className="text-xs text-slate-500 mb-4 max-w-[240px]">{t("builder.empty.experienceDesc")}</p>
          <Button onClick={addExperience} size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-slate-700 hover:bg-slate-50 border-slate-200">
            <Plus className="w-3.5 h-3.5"/>
            {t("builder.add.experience")}
          </Button>
        </div>
      )}

      {experience.length > 0 && (
      <button
        onClick={addExperience}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer group"
      >
        <Plus className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
        <span className="font-medium text-sm">{t("builder.add.experience")}</span>
      </button>
      )}
    </div>
  );
}
