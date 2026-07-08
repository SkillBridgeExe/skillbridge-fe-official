import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RichTextEditor, normalizeToBulletText } from "@/components/ui/rich-text-editor";
import { useCvBuilderStore, type Project } from "@/store/useCvBuilderStore";
import { Plus, Sparkles, RotateCcw, LayoutTemplate, List as ListIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAiRewrite } from "@/hooks/use-cv-builder";
import type { AiGateCode } from "@/lib/ai-input-gate";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";
import { useCompanionStore } from "@/store/useCompanionStore";
import { SectionItemCard } from "./SectionItemCard";
import { useScrollToNewItem } from "@/hooks/use-scroll-to-new-item";
import { useFieldNudge } from "@/hooks/use-field-nudge";
import { FieldNudge } from "@/components/companion/FieldNudge";

/** Instruction cho mode 'custom' của BE rewrite (≤500 ký tự). */
const BULLETS_INSTRUCTION =
  "Chuyển nội dung thành 2-4 gạch đầu dòng CV (mỗi dòng bắt đầu bằng '- '), súc tích, giữ nguyên dữ kiện, không bịa thông tin mới.";

type ProjectNotice = AiGateCode | "LOCAL_ONLY" | "FALLBACK";

/**
 * Description field for ONE project entry: AI-suggest bullets + convert-to-bullets
 * + the companion trigger + its on-blur nudge. Extracted to its own component
 * (not inline in the parent's .map()) so `useFieldNudge` obeys the Rules of Hooks
 * regardless of how many projects are in the array.
 */
function ProjectDescriptionField({
  proj,
  index,
  draftId,
  locale,
  isLoggedIn,
  isPending,
  notice,
  noticeText,
  backup,
  onChange,
  onSuggestBullets,
  onConvertToBullets,
  onUndo,
}: {
  proj: Project;
  index: number;
  draftId: string | null;
  locale: "vi" | "en";
  isLoggedIn: boolean;
  isPending: boolean;
  notice: ProjectNotice | null;
  noticeText: (kind: ProjectNotice) => string;
  backup: string | undefined;
  onChange: (value: string) => void;
  onSuggestBullets: () => void;
  onConvertToBullets: () => void;
  onUndo: () => void;
}) {
  const { t } = useTranslation("diagnosis");
  const { updateProject, clearSectionEvaluation } = useCvBuilderStore();
  const fieldPath = `cvbuilder:projects[${index}].description`;

  /** Activate path for the companion — shared by the trigger button and the on-blur nudge. */
  const openCompanion = () => {
    useCompanionStore.getState().registerContext({
      id: fieldPath,
      getTurn: () => ({
        skill: "cv_builder",
        props: {
          draftId,
          fieldPath,
          section: "projects",
          currentValue: proj.description,
          onApply: (after: string) => {
            updateProject(proj.id, "description", after);
            clearSectionEvaluation("projects");
          },
        },
      }),
    });
    useCompanionStore.getState().activateContext(fieldPath);
    useCompanionStore.setState({ bubbleOpen: true });
  };

  const { count: nudgeCount, handleBlur } = useFieldNudge({
    draftId,
    section: "projects",
    currentValue: proj.description,
    fieldPath,
    locale,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("builder.fields.projectDescription")}</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary"
          onClick={onSuggestBullets}
          disabled={isPending}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          {isPending ? t("builder.generating") : t("builder.turnIntoBullets")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1 px-1.5"
          onClick={onConvertToBullets}
          title={t("builder.richText.convertToBullets")}
          aria-label={t("builder.richText.convertToBullets")}
        >
          <ListIcon className="w-3 h-3" />
          <span>{t("builder.richText.convertToBullets")}</span>
        </Button>
      </div>
      <div
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          handleBlur();
        }}
      >
        <RichTextEditor
          value={proj.description}
          onChange={onChange}
          placeholder={t("builder.ph.projectDescription")}
          className="text-[13px] min-h-[96px] font-sans"
        />
      </div>

      {/* Input-gate hint / fallback note */}
      {notice && (
        <div className="text-[11px] text-[#8C6D1F] bg-[#FBF3DB]/60 border border-[#F2E5BC] rounded-lg p-2.5 leading-relaxed">
          {noticeText(notice)}
        </div>
      )}

      {/* Hoàn tác sau khi áp bản viết lại của AI */}
      {backup !== undefined && (
        <Button
          size="sm"
          variant="outline"
          onClick={onUndo}
          className="h-7 text-xs border-amber-500 text-amber-600 hover:bg-amber-50 gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t("builder.undo")}</span>
        </Button>
      )}

      {/* Companion AI trigger for project description + on-blur nudge (same activate path) */}
      {isLoggedIn && draftId && proj.description.trim() && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary hover:bg-primary/5 flex items-center gap-1 px-2"
            onClick={openCompanion}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("companion.analyze")}</span>
          </Button>
          <FieldNudge count={nudgeCount} onClick={openCompanion} />
        </div>
      )}
    </div>
  );
}

export function ProjectsSection() {
  const { projects, addProject, updateProject, removeProject, duplicateProject, moveProject, draftId, clearSectionEvaluation } = useCvBuilderStore();
  const { toast } = useToast();
  const { t, i18n } = useTranslation("diagnosis");
  const locale = (i18n.language.startsWith("vi") ? "vi" : "en") as "vi" | "en";

  // Per-entry trạng thái: hint gate/fallback + backup để hoàn tác sau khi áp AI
  const [notice, setNotice] = useState<{ id: string; kind: ProjectNotice } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [backupMap, setBackupMap] = useState<Record<string, string>>({});

  const aiRewrite = useAiRewrite();
  // Số lần "Chuyển thành gạch đầu dòng" theo project id → token variant để BE bỏ cache.
  const attempts = useRef<Record<string, number>>({});
  const targetRole = useDiagnosisStore((s) => s.targetRole);
  const isLoggedIn = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.authSource === "api",
  );

  useScrollToNewItem(projects, "projects");

  const noticeText = (kind: ProjectNotice) => {
    switch (kind) {
      case "LOCAL_ONLY":
        return t("builder.localOnly");
      case "FALLBACK":
        return t("builder.aiGate.fallbackNote");
      case "OFF_TOPIC":
        return t("builder.aiGate.offTopic");
      default:
        return t("builder.aiGate.needContext");
    }
  };

  /**
   * "Chuyển thành gạch đầu dòng" THẬT: gửi chính mô tả user đã viết qua BE
   * rewrite (mode 'custom'). Không còn template giả ghi đè nội dung.
   */
  const suggestBullets = (id: string, currentText: string) => {
    if (!currentText.trim()) {
      return toast({ title: t("builder.toastWriteTextFirst"), variant: "destructive" });
    }

    setNotice(null);
    if (!isLoggedIn || !draftId) {
      return setNotice({ id, kind: "LOCAL_ONLY" });
    }

    setPendingId(id);
    // Lần đầu cho 1 project = cache; bấm lại (kể cả sau Undo, cùng input) = variant mới.
    const n = attempts.current[id] ?? 0;
    attempts.current[id] = n + 1;

    aiRewrite.rewrite(
      {
        draftId,
        text: currentText,
        mode: "custom",
        instruction: BULLETS_INSTRUCTION,
        role_code: targetRole ?? undefined,
        section: "projects",
        ...(n > 0 ? { variant: String(n) } : {}),
      },
      {
        onSuccess: (data) => {
          setPendingId(null);
          setBackupMap((prev) => ({ ...prev, [id]: currentText }));
          updateProject(id, "description", data.suggestion);
          clearSectionEvaluation("projects");
          if (data.fallback) setNotice({ id, kind: "FALLBACK" });
        },
        onGateFail: (reason) => {
          setPendingId(null);
          setNotice({ id, kind: reason });
        },
        onError: (err: Error) => {
          setPendingId(null);
          toast({
            title: t("builder.toastAiSuggestFailed"),
            description: err?.message || t("builder.toastSomethingWrong"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleUndo = (id: string) => {
    const backup = backupMap[id];
    if (backup === undefined) return;
    updateProject(id, "description", backup);
    setBackupMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setNotice(null);
  };

  const handleConvertToBullets = (id: string, currentText: string) => {
    if (!currentText.trim()) return;
    updateProject(id, "description", normalizeToBulletText(currentText));
  };

  return (
    <div className="space-y-6">
      {projects.length > 0 ? projects.map((proj, index) => {
        const title = proj.name || t("builder.ph.projectName");
        const subtitle = proj.role || t("builder.entry.project");

        return (
          <div key={proj.id} id={`projects-${proj.id}`}>
          <SectionItemCard
            key={proj.id}
            title={title}
            subtitle={subtitle}
            onRemove={() => removeProject(proj.id)}
            canRemove={true}
            requireConfirmOnRemove={!!proj.name || !!proj.role || !!proj.description}
            onDuplicate={() => duplicateProject(proj.id)}
            canDuplicate={true}
            onMoveUp={() => moveProject(proj.id, "up")}
            canMoveUp={index > 0}
            onMoveDown={() => moveProject(proj.id, "down")}
            canMoveDown={index < projects.length - 1}
            defaultExpanded={index === 0 || !proj.name}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm text-slate-700">{t("builder.entry.project")} #{index + 1}</h4>
              {isLoggedIn && draftId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:bg-primary/5 flex items-center justify-center gap-1 px-2"
                  onClick={() => {
                    const id = `cvbuilder:intake:projects[${index}]`;
                    useCompanionStore.getState().registerContext({
                      id,
                      getTurn: () => ({
                        skill: "cv_project_intake",
                        props: {
                          draftId,
                          entryIndex: index,
                          currentEntry: {
                            name: proj.name,
                            role: proj.role,
                            tools: proj.tools,
                            link: proj.link,
                            description: proj.description,
                          },
                          onApply: (fields: Record<string, string>) => {
                            for (const [field, value] of Object.entries(fields)) {
                              updateProject(proj.id, field as keyof typeof proj, value);
                            }
                            clearSectionEvaluation("projects");
                          },
                        },
                      }),
                    });
                    useCompanionStore.getState().activateContext(id);
                    useCompanionStore.setState({ bubbleOpen: true });
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="leading-none">{t("companion.projectIntake.trigger")}</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label>{t("builder.fields.projectName")} *</Label>
                <Input value={proj.name} onChange={(e) => updateProject(proj.id, "name", e.target.value)} placeholder={t("builder.ph.projectName")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.role")}</Label>
                <Input value={proj.role} onChange={(e) => updateProject(proj.id, "role", e.target.value)} placeholder={t("builder.ph.role")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.tools")}</Label>
                <Input value={proj.tools} onChange={(e) => updateProject(proj.id, "tools", e.target.value)} placeholder={t("builder.ph.tools")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.projectLink")}</Label>
                <Input
                  type="url"
                  value={proj.link}
                  onChange={(e) => updateProject(proj.id, "link", e.target.value)}
                  placeholder={t("builder.ph.projectLink")}
                />
              </div>
              <ProjectDescriptionField
                proj={proj}
                index={index}
                draftId={draftId}
                locale={locale}
                isLoggedIn={isLoggedIn}
                isPending={aiRewrite.isPending && pendingId === proj.id}
                notice={notice?.id === proj.id ? notice.kind : null}
                noticeText={noticeText}
                backup={backupMap[proj.id]}
                onChange={(value) => updateProject(proj.id, "description", value)}
                onSuggestBullets={() => suggestBullets(proj.id, proj.description)}
                onConvertToBullets={() => handleConvertToBullets(proj.id, proj.description)}
                onUndo={() => handleUndo(proj.id)}
              />
            </div>
          </SectionItemCard>
          </div>
        );
      }) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <LayoutTemplate className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700 mb-1">{t("builder.empty.projectsTitle")}</h4>
          <p className="text-xs text-slate-500 mb-4 max-w-[240px]">{t("builder.empty.projectsDesc")}</p>
          <Button onClick={addProject} size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-slate-700 hover:bg-slate-50 border-slate-200">
            <Plus className="w-3.5 h-3.5"/>
            {t("builder.add.project")}
          </Button>
        </div>
      )}
      
      {projects.length > 0 && (
      <button 
        onClick={addProject}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer group"
      >
        <Plus className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" /> 
        <span className="font-medium text-sm">{t("builder.add.project")}</span>
      </button>
      )}
    </div>
  );
}
