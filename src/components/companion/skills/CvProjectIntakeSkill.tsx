import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Send,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { ThinkingDots } from "../ThinkingDots";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useProjectIntakeMutation } from "@/hooks/use-cv-builder";
import { useTranslation } from "react-i18next";
import { assistantLocales } from "./assistant-locale";
import type { ProjectIntakeResponse } from "@shared/api";
import {
  computeProjectIntakeFields,
  type CurrentProjectEntry,
  type ProjectIntakeFieldDiff,
} from "./cv-project-intake-apply";

export interface CvProjectIntakeSkillProps {
  draftId: string;
  entryIndex: number;
  currentEntry: CurrentProjectEntry;
  onApply: (fields: Record<string, string>) => void;
}

type Phase = "intake" | "thinking" | "preview";

export function CvProjectIntakeSkill({
  draftId,
  currentEntry,
  onApply,
}: CvProjectIntakeSkillProps) {
  const { t, i18n } = useTranslation("diagnosis");
  const cvLanguage = useCvBuilderStore((s) => s.cvLanguage);
  const setMascotState = useCvBuilderStore((s) => s.setMascotState);

  const { conversation: askLocale, output: outputLocale } = assistantLocales({
    uiLanguage: i18n.language,
    cvLanguage,
  });

  const intakeMutation = useProjectIntakeMutation();

  const [phase, setPhase] = useState<Phase>("intake");
  const [narrative, setNarrative] = useState("");
  const [extracted, setExtracted] = useState<ProjectIntakeResponse | null>(null);
  const [diffs, setDiffs] = useState<ProjectIntakeFieldDiff[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [overrideChecked, setOverrideChecked] = useState<Record<string, boolean>>({});

  const handleExtract = useCallback(() => {
    if (!narrative.trim() || !draftId) return;
    setPhase("thinking");
    setMascotState("thinking");

    intakeMutation.mutate(
      {
        draftId,
        story: narrative.trim(),
        language: outputLocale as "vi" | "en",
      },
      {
        onSuccess: (res) => {
          setMascotState("idle");
          if (!res.project || res.degraded) {
            // Honest dead-end guard: keep the response so the intake-phase banner
            // can say WHY nothing filled (degraded vs. nothing grounded) instead of
            // silently returning to the textarea.
            // ponytail: light no-dead-end = honest banner + editable narrative + re-run,
            // not the full openIntakeCoach funnel (that's Experience-field specific).
            // Upgrade to a project coach funnel only if users actually get stuck here.
            setExtracted(res);
            setPhase("intake");
            return;
          }
          setExtracted(res);
          const computed = computeProjectIntakeFields(res.project, currentEntry, askLocale);
          setDiffs(computed);

          const edits: Record<string, string> = {};
          for (const d of computed) edits[d.field] = d.after;
          setEditedValues(edits);
          setPhase("preview");
        },
        onError: () => {
          setMascotState("idle");
          setPhase("intake");
        },
      },
    );
  }, [narrative, draftId, askLocale, outputLocale, currentEntry, intakeMutation, setMascotState]);

  const handleApply = useCallback(() => {
    const fields: Record<string, string> = {};
    for (const d of diffs) {
      const val = editedValues[d.field] ?? d.after;
      if (d.autoApply) {
        fields[d.field] = val;
      } else if (overrideChecked[d.field]) {
        fields[d.field] = val;
      }
    }
    onApply(fields);
    useCompanionStore.getState().dismissActive();
  }, [diffs, editedValues, overrideChecked, onApply]);

  const handleDiscard = useCallback(() => {
    useCompanionStore.getState().dismissActive();
  }, []);

  if (phase === "intake") {
    return (
      <div className="space-y-3">
        <p className="text-[13px] font-medium text-[#2F3437] leading-relaxed">
          {t("companion.projectIntake.prompt", {
            defaultValue: "Kể cho tôi nghe về dự án này (tên, vai trò, công nghệ, mô tả, link)…",
          })}
        </p>
        <Textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder={t("companion.projectIntake.placeholder", {
            defaultValue: "Ví dụ: Mình làm dự án Shop Online bằng React và Node.js, nhóm 4 người, link github.com/me/shop...",
          })}
          className="min-h-[100px] text-sm resize-none border-[#EAEAEA] focus:border-primary/40"
          rows={4}
        />
        {extracted && (extracted.degraded || !extracted.project) && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded p-2">
            {extracted.degraded
              ? t("companion.projectIntake.degraded", {
                  defaultValue: "Chưa trích xuất được thông tin dự án — bạn hãy kể rõ hơn nhé.",
                })
              : t("companion.projectIntake.notFound", {
                  defaultValue: "Chưa trích được dự án nào từ chuyện kể — bạn kể rõ hơn (tên, công nghệ, vai trò) nhé.",
                })}
          </p>
        )}
        <Button
          size="sm"
          onClick={handleExtract}
          disabled={!narrative.trim() || intakeMutation.isPending}
          className="h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5"
        >
          <Send className="w-3 h-3" />
          {t("companion.intake.extract", { defaultValue: "Phân tích" })}
        </Button>
      </div>
    );
  }

  if (phase === "thinking") {
    return (
      <div className="space-y-2 py-2">
        <ThinkingDots label={t("companion.intake.extracting", { defaultValue: "Đang đọc…" })} />
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-100 rounded-full w-full animate-pulse" />
          <div className="h-3 bg-slate-100 rounded-full w-5/6 animate-pulse" style={{ animationDelay: "100ms" }} />
          <div className="h-3 bg-slate-100 rounded-full w-4/6 animate-pulse" style={{ animationDelay: "200ms" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        {t("companion.intake.previewTitle", { defaultValue: "Trích xuất từ chuyện kể" })}
      </p>

      {extracted?.multiple_detected && (
        <div className="text-[11px] text-[#8C6D1F] bg-[#FBF3DB]/60 border border-[#F2E5BC] rounded p-2 leading-relaxed">
          {t("companion.projectIntake.multipleDetected", {
            defaultValue: "Phát hiện nhiều dự án, đã điền dự án đầu tiên — hãy tách phần còn lại thủ công.",
          })}
        </div>
      )}

      <div className="space-y-2.5">
        {diffs.map((d) => {
          const isDescription = d.field === "description";
          return (
            <div key={d.field} className="rounded-lg border border-[#EAEAEA] bg-white p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#787774] uppercase tracking-wider">{d.label}</span>
                {!d.autoApply && (
                  <label className="inline-flex items-center gap-1 text-[10px] text-[#787774] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!overrideChecked[d.field]}
                      onChange={(e) => setOverrideChecked((prev) => ({ ...prev, [d.field]: e.target.checked }))}
                      className="w-3 h-3 rounded border-slate-300 text-primary focus:ring-primary/40 accent-primary"
                    />
                    {t("companion.intake.override", { defaultValue: "Ghi đè" })}
                  </label>
                )}
              </div>

              {!d.autoApply && (
                <div className="text-[10px] text-[#787774] italic truncate max-w-full">
                  {d.before} → {editedValues[d.field] ?? d.after}
                </div>
              )}

              {isDescription ? (
                <Textarea
                  value={editedValues[d.field] ?? d.after}
                  onChange={(e) => setEditedValues((prev) => ({ ...prev, [d.field]: e.target.value }))}
                  className="text-xs min-h-[60px] resize-none border-[#EAEAEA]"
                  rows={3}
                />
              ) : (
                <Input
                  value={editedValues[d.field] ?? d.after}
                  onChange={(e) => setEditedValues((prev) => ({ ...prev, [d.field]: e.target.value }))}
                  className="text-xs h-8 border-[#EAEAEA]"
                />
              )}
            </div>
          );
        })}

        {extracted?.project?.missing_fields
          .filter((field) => {
            const mappedStoreKey = ({ name: "name", role: "role", tech: "tools", link: "link", bullets: "description" } as Record<string, string>)[field];
            return !diffs.some((d) => d.field === mappedStoreKey);
          })
          .map((field) => {
            const label = ({
              name: askLocale === "vi" ? "Tên dự án" : "Project name",
              role: askLocale === "vi" ? "Vai trò" : "Role",
              tech: askLocale === "vi" ? "Công nghệ" : "Technologies",
              link: askLocale === "vi" ? "Liên kết" : "Project link",
              bullets: askLocale === "vi" ? "Mô tả dự án" : "Project description",
            } as Record<string, string>)[field] ?? field;
            return (
              <div key={field} className="rounded-lg border border-dashed border-[#EAEAEA] bg-slate-50/50 p-3 space-y-1">
                <span className="text-[11px] font-bold text-[#787774] uppercase tracking-wider">{label}</span>
                <p className="text-[11px] text-[#787774] italic">
                  {t("companion.intake.missing", { defaultValue: "Chuyện chưa nhắc — bạn bổ sung?" })}
                </p>
              </div>
            );
          })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleApply}
          className="h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5"
        >
          <Check className="w-3 h-3" />
          {t("companion.intake.apply", { defaultValue: "Áp dụng" })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setPhase("intake"); }}
          className="h-8 text-xs text-[#787774] hover:text-[#2F3437]"
        >
          {t("companion.intake.editStory", { defaultValue: "Sửa lại chuyện" })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDiscard}
          className="h-8 text-xs text-[#787774] hover:text-[#2F3437]"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
