// ─── CvIntakeSkill ──────────────────────────────────────────────────
// Narrative extraction flow: user tells a story → AI extracts fields →
// field-by-field preview with provenance → user reviews → apply.
// Anti-fabrication: found=false → ask user, never auto-fill.

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Send, Check, X, Loader2, AlertTriangle, Quote,
  Sparkles,
} from "lucide-react";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useAssistantExtractMutation } from "@/hooks/use-cv-builder";
import { useTranslation } from "react-i18next";
import { computeIntakeFields, type IntakeFieldDiff } from "./cv-intake-apply";
import { assistantLocales } from "./assistant-locale";
import type { ExtractResponse } from "@/types/companion";

export interface CvIntakeSkillProps {
  draftId: string;
  entryIndex: number;
  currentEntry: {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
    achievements: string;
  };
  onApply: (fields: Record<string, string>) => void;
}

type Phase = "intake" | "thinking" | "preview";

// store-key (WorkExperience field) → BE extract field key.
const FIELD_TO_BE: Record<string, keyof ExtractResponse["fields"]> = {
  company: "company",
  position: "position",
  startDate: "start",
  endDate: "end",
  description: "description",
  achievements: "achievements",
};

export function CvIntakeSkill({
  draftId,
  currentEntry,
  onApply,
}: CvIntakeSkillProps) {
  const { t, i18n } = useTranslation("diagnosis");
  const cvLanguage = useCvBuilderStore((s) => s.cvLanguage);
  const setMascotState = useCvBuilderStore((s) => s.setMascotState);
  // Ask in the UI language; write extracted CV text in the CV's OWN language (mirror CvBuilderSkill).
  const { conversation: askLocale, output: outputLocale } = assistantLocales({
    uiLanguage: i18n.language,
    cvLanguage,
  });

  const extractMutation = useAssistantExtractMutation();

  const [phase, setPhase] = useState<Phase>("intake");
  const [narrative, setNarrative] = useState("");
  const [extracted, setExtracted] = useState<ExtractResponse | null>(null);
  const [diffs, setDiffs] = useState<IntakeFieldDiff[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [overrideChecked, setOverrideChecked] = useState<Record<string, boolean>>({});
  const [degraded, setDegraded] = useState(false);

  // ── Phase: INTAKE → THINKING → PREVIEW ──
  const handleExtract = useCallback(() => {
    if (!narrative.trim() || !draftId) return;
    setPhase("thinking");
    setMascotState("thinking"); // floating dolphin shows the thinking pose during extraction
    setDegraded(false);

    extractMutation.mutate(
      {
        draftId,
        section: "experience",
        narrative: narrative.trim(),
        locale: askLocale,
        output_lang: outputLocale,
      },
      {
        onSuccess: (res) => {
          setMascotState("idle");
          if (res.degraded) {
            setDegraded(true);
            setPhase("preview");
            return;
          }
          setExtracted(res);
          const computed = computeIntakeFields(res, currentEntry, askLocale);
          setDiffs(computed);
          // Initialize edited values with extracted values
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
  }, [narrative, draftId, askLocale, outputLocale, currentEntry, extractMutation, setMascotState]);

  // ── Apply ──
  const handleApply = useCallback(() => {
    const fields: Record<string, string> = {};
    for (const d of diffs) {
      const val = editedValues[d.field] ?? d.after;
      if (d.autoApply) {
        fields[d.field] = val;
      } else if (overrideChecked[d.field]) {
        fields[d.field] = val;
      }
      // else skip: user didn't opt-in to overwrite
    }
    onApply(fields);
    useCompanionStore.getState().dismissActive();
  }, [diffs, editedValues, overrideChecked, onApply]);

  // ── Discard ──
  const handleDiscard = useCallback(() => {
    useCompanionStore.getState().dismissActive();
  }, []);

  // ── INTAKE ──
  if (phase === "intake") {
    return (
      <div className="space-y-3">
        <p className="text-[13px] font-medium text-[#2F3437] leading-relaxed">
          {t("companion.intake.prompt", {
            defaultValue: "Kể cho tôi nghe về kinh nghiệm này (công ty, vị trí, thời gian, bạn làm gì, kết quả)…",
          })}
        </p>
        <Textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder={t("companion.intake.placeholder", {
            defaultValue: "Ví dụ: Tôi làm Frontend Developer ở FPT từ tháng 3/2023 đến 12/2024. Tôi xây dựng dashboard quản lý, triển khai CI/CD…",
          })}
          className="min-h-[100px] text-sm resize-none border-[#EAEAEA] focus:border-primary/40"
          rows={4}
        />
        <Button
          size="sm"
          onClick={handleExtract}
          disabled={!narrative.trim()}
          className="h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5"
        >
          <Send className="w-3 h-3" />
          {t("companion.intake.extract", { defaultValue: "Phân tích" })}
        </Button>
      </div>
    );
  }

  // ── THINKING ──
  if (phase === "thinking") {
    return (
      <div className="space-y-2 py-2">
        <div className="flex items-center gap-2 text-xs text-[#787774]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>{t("companion.intake.extracting", { defaultValue: "Đang đọc…" })}</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-100 rounded-full w-full animate-pulse" />
          <div className="h-3 bg-slate-100 rounded-full w-5/6 animate-pulse" style={{ animationDelay: "100ms" }} />
          <div className="h-3 bg-slate-100 rounded-full w-4/6 animate-pulse" style={{ animationDelay: "200ms" }} />
        </div>
      </div>
    );
  }

  // ── PREVIEW (degraded) ──
  if (degraded) {
    return (
      <div className="space-y-3">
        <p className="text-[13px] text-[#2F3437] leading-relaxed">
          {t("companion.intake.degraded", {
            defaultValue: "Mình chưa đọc được, bạn điền tay nhé.",
          })}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDiscard}
          className="h-8 text-xs"
        >
          {t("companion.intake.close", { defaultValue: "Đóng" })}
        </Button>
      </div>
    );
  }

  // ── PREVIEW (normal) ──
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        {t("companion.intake.previewTitle", { defaultValue: "Trích xuất từ chuyện kể" })}
      </p>

      <div className="space-y-2.5">
        {diffs.map((d) => {
          const extractedField = extracted?.fields[FIELD_TO_BE[d.field]];

          const isLowConfidence = extractedField?.confidence === "low";
          const sourceSpan = extractedField?.source_span;
          const isList = d.field === "description" || d.field === "achievements";

          return (
            <div key={d.field} className="rounded-lg border border-[#EAEAEA] bg-white p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#787774] uppercase tracking-wider">{d.label}</span>
                <div className="flex items-center gap-1.5">
                  {isLowConfidence && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {t("companion.intake.lowConfidence", { defaultValue: "kiểm lại" })}
                    </span>
                  )}
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
              </div>

              {/* Diff indicator for non-empty fields */}
              {!d.autoApply && (
                <div className="text-[10px] text-[#787774] italic">
                  {d.before} → {editedValues[d.field] ?? d.after}
                </div>
              )}

              {/* Editable value */}
              {isList ? (
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

              {/* Provenance */}
              {sourceSpan && (
                <p className="text-[10px] text-[#787774] italic flex items-center gap-1">
                  <Quote className="w-2.5 h-2.5 text-slate-400" />
                  {t("companion.intake.source", { defaultValue: "nguồn:" })} «{sourceSpan}»
                </p>
              )}
            </div>
          );
        })}

        {/* Missing fields (skip any field already shown as an extracted diff, e.g. ongoing "end"). */}
        {extracted?.missing
          .filter((field) => !diffs.some((d) => FIELD_TO_BE[d.field] === field))
          .map((field) => {
          const label = ({ company: askLocale === "vi" ? "Công ty" : "Company", position: askLocale === "vi" ? "Vị trí" : "Position", start: askLocale === "vi" ? "Bắt đầu" : "Start", end: askLocale === "vi" ? "Kết thúc" : "End", description: askLocale === "vi" ? "Mô tả" : "Description", achievements: askLocale === "vi" ? "Thành tích" : "Achievements" } as Record<string, string>)[field] ?? field;
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

      {/* Actions */}
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
          onClick={() => { setPhase("intake"); setDegraded(false); }}
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
