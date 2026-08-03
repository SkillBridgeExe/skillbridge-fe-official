import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FileText, ListChecks, Quote, Eye, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import type {
  ExtractedSkill,
  EvidenceLedger,
  EvidenceStrength,
  RelevanceSkillItem,
  SkillImportance,
  SkillProficiencyHint,
  SkillsRelevanceBreakdown,
  TopSummary,
} from "@shared/api";

/* ─────────────────────────────────────────────────────────────────────────────
 * 3 block insights bổ sung trên màn kết quả diagnosis. Cả 3 chỉ render khi
 * field tương ứng CÓ trên response (backward-compat: BE chưa trả → ẩn).
 * Design theo minimalist-ui: chip pastel theo trạng thái, border #EAEAEA,
 * radius 8-12px, không gradient/neon, shadow siêu nhẹ.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Pastel state palette (minimalist-ui §4.A) */
const PASTEL = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
  gray: "bg-slate-50 text-slate-500 border-slate-200",
} as const;

/* ═══════════════════════════════════════════════════════════════════
 * ③ TOP SUMMARY — lead "sửa N việc này trước" (đặt ĐẦU trang kết quả)
 * ═══════════════════════════════════════════════════════════════════ */
export function TopSummaryCard({ summary }: { summary: TopSummary }) {
  const { t } = useTranslation("diagnosis");
  const lastCvId = useDiagnosisStore((s) => s.lastCvId);
  const storageKey = lastCvId ? `sb-actions-${lastCvId}` : null;

  const [tickedIndexes, setTickedIndexes] = useState<number[]>([]);

  // Load from localStorage on mount or lastCvId change
  useEffect(() => {
    if (!storageKey) {
      setTickedIndexes([]);
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setTickedIndexes(JSON.parse(stored));
      } else {
        setTickedIndexes([]);
      }
    } catch {
      setTickedIndexes([]);
    }
  }, [storageKey]);

  // Save to localStorage
  const toggleTick = (index: number) => {
    const next = tickedIndexes.includes(index)
      ? tickedIndexes.filter((i) => i !== index)
      : [...tickedIndexes, index];
    setTickedIndexes(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  };

  const total = summary.prioritized_actions.length;
  const done = tickedIndexes.filter((i) => i < total).length;

  return (
    <Card className="mb-6 border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-primary">
            <ListChecks className="w-4 h-4 text-sky-500" />
            {t("insights.fixFirst")}
          </div>
          {total > 0 && (
            <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {t("insights.actionsDone", { done, total })}
            </span>
          )}
        </div>
        {total > 0 && (
          <ol className="space-y-3.5">
            {summary.prioritized_actions.map((action, idx) => {
              const isTicked = tickedIndexes.includes(idx);
              return (
                <li
                  key={idx}
                  onClick={() => toggleTick(idx)}
                  className={cn(
                    "flex items-start gap-3.5 text-sm text-slate-900 p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all duration-200 cursor-pointer select-none",
                    isTicked && "bg-slate-50/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200",
                      isTicked
                        ? "bg-sky-500 border-sky-500 text-white"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    )}
                  >
                    {isTicked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={cn(
                      "font-semibold leading-relaxed transition-all duration-200 flex-1",
                      isTicked && "line-through text-slate-300 font-medium"
                    )}
                  >
                    {action}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * ① SKILLS EXTRACTED — chip skill + badge trình độ + dẫn chứng (tooltip)
 * ═══════════════════════════════════════════════════════════════════ */
const PROFICIENCY_ORDER: Record<SkillProficiencyHint, number> = {
  advanced: 0,
  intermediate: 1,
  beginner: 2,
  unknown: 3,
};

function SkillChip({ skill, t }: { skill: ExtractedSkill; t: (key: string) => string }) {
  const highlightEvidence = useDiagnosisStore((s) => s.highlightEvidence);
  const setHighlightEvidence = useDiagnosisStore((s) => s.setHighlightEvidence);
  const isActive = !!skill.evidence_text && highlightEvidence === skill.evidence_text;

  const handleClick = () => {
    if (!skill.evidence_text) return;
    if (isActive) {
      setHighlightEvidence(null);
    } else {
      setHighlightEvidence(skill.evidence_text);
    }
  };

  const PROFICIENCY_STYLE: Record<Exclude<SkillProficiencyHint, "unknown">, { label: string; chip: string }> = {
    advanced: { label: t("insights.proficiency.advanced"), chip: PASTEL.green },
    intermediate: { label: t("insights.proficiency.intermediate"), chip: PASTEL.yellow },
    beginner: { label: t("insights.proficiency.beginner"), chip: PASTEL.gray },
  };

  // Contract §6.3: proficiency 'unknown' → ẨN badge, chỉ hiện tên.
  const proficiency =
    skill.proficiency_hint !== "unknown" ? PROFICIENCY_STYLE[skill.proficiency_hint] : null;

  const chip = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all duration-200",
        isActive
          ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600/20"
          : "border-slate-200 bg-white hover:border-slate-300",
        skill.evidence_text && "cursor-pointer"
      )}
    >
      {skill.evidence_text && (
        <Eye className={cn("w-3 h-3 transition-opacity", isActive ? "text-indigo-600 opacity-90" : "text-slate-400 opacity-40")} />
      )}
      <span className="text-[13px] font-semibold text-slate-900">{skill.name}</span>
      {proficiency && (
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold border", proficiency.chip)}>
          {proficiency.label}
        </span>
      )}
      {skill.evidence_text && <Quote className="w-3 h-3 text-slate-300 shrink-0" />}
    </span>
  );

  if (!skill.evidence_text) {
    return chip;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          aria-pressed={isActive}
          className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          {chip}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs leading-relaxed">"{skill.evidence_text}"</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function SkillsExtractedCard({ skills }: { skills: ExtractedSkill[] }) {
  const { t } = useTranslation("diagnosis");
  const sorted = [...skills].sort(
    (a, b) => PROFICIENCY_ORDER[a.proficiency_hint] - PROFICIENCY_ORDER[b.proficiency_hint],
  );

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="pt-5 pb-5">
        <h3 className="text-sm font-bold text-slate-900">{t("insights.skillsTitle")}</h3>
        <div className="text-xs text-slate-500 mt-0.5 mb-3 leading-relaxed">
          <span>{t("insights.skillsHint")}</span>
          {skills.some((s) => s.evidence_text) && (
            <span className="block text-[11px] text-indigo-600 font-medium mt-1">
              {t("insights.evidenceHint")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sorted.map((skill) => (
            <SkillChip key={skill.name} skill={skill} t={t} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * ② SKILLS RELEVANCE — matched/partial/missing vs rubric của target role
 *    Contract §6.2: SkillItem objects; sort REQUIRED trước trong mỗi nhóm;
 *    partial hiện cv_level/required_level. (null = role chưa có rubric →
 *    call-site ẩn cả block.) FE KHÔNG tự tính lại điểm — chỉ hiển thị.
 * ═══════════════════════════════════════════════════════════════════ */
const IMPORTANCE_ORDER: Record<SkillImportance, number> = {
  REQUIRED: 0,
  PREFERRED: 1,
  NICE_TO_HAVE: 2,
};

function sortByImportance(items: RelevanceSkillItem[]): RelevanceSkillItem[] {
  return [...items].sort(
    (a, b) => IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance],
  );
}

export function SkillsRelevanceCard({ breakdown }: { breakdown: SkillsRelevanceBreakdown }) {
  const { t } = useTranslation("diagnosis");

  const RELEVANCE_GROUPS: {
    key: "matched" | "partial" | "missing";
    label: string;
    hint?: string;
    dot: string;
    chip: string;
    showLevels: boolean;
  }[] = [
    { key: "matched", label: t("insights.matched"), dot: "bg-emerald-700", chip: PASTEL.green, showLevels: false },
    { key: "partial", label: t("insights.partial"), dot: "bg-amber-700", chip: PASTEL.yellow, showLevels: true },
    { key: "missing", label: t("insights.missing"), hint: t("insights.addFirst"), dot: "bg-rose-700", chip: PASTEL.red, showLevels: false },
  ];

  const groups = RELEVANCE_GROUPS.filter((group) => breakdown[group.key].length > 0);
  if (groups.length === 0) {
    return null;
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t("insights.relevanceTitle")}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("insights.relevanceHint")}
          </p>
        </div>
        {groups.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", group.dot)} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {group.label}
              </span>
              {group.hint && (
                <span className="text-[11px] text-rose-700 font-medium">— {group.hint}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sortByImportance(breakdown[group.key]).map((item) => (
                <span
                  key={item.name}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold",
                    group.chip,
                  )}
                  title={`${item.importance.replace(/_/g, " ").toLowerCase()} · level ${item.required_level} required`}
                >
                  {item.name}
                  {group.showLevels && item.cv_level != null && (
                    <span className="font-mono tabular-nums text-[10px] opacity-80">
                      {item.cv_level}/{item.required_level}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function evidenceStrengthClass(strength: EvidenceStrength): string {
  if (strength === "demonstrated") return PASTEL.green;
  if (strength === "listed_only") return PASTEL.yellow;
  return PASTEL.gray;
}

export function EvidenceLedgerCard({ ledger }: { ledger: EvidenceLedger }) {
  const { t } = useTranslation("diagnosis");
  const items = ledger.items ?? [];
  if (items.length === 0) return null;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText className="w-4 h-4 text-primary" />
            {t("evidence.title")}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{t("evidence.gapHint")}</p>
        </div>

        <div className="space-y-3">
          {items.slice(0, 6).map((item) => {
            const sources = item.sources ?? [];
            const visibleSources = sources.slice(0, 3);
            const extra = Math.max(0, sources.length - visibleSources.length);
            return (
              <div key={item.skill_canonical} id={`evidence-${item.skill_canonical}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-900">{item.display_name}</span>
                  <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold", evidenceStrengthClass(item.strength))}>
                    {t(`evidence.strength.${item.strength}`)}
                  </span>
                  {item.most_recent_year != null && (
                    <span className="font-mono text-[10px] text-slate-500">{item.most_recent_year}</span>
                  )}
                </div>

                {visibleSources.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">{t("evidence.foundIn")}</span>
                    {visibleSources.map((source, idx) => (
                      <span
                        key={`${source.kind}-${source.ref}-${idx}`}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-900"
                        title={source.quote ?? undefined}
                      >
                        {t(`evidence.sourceKind.${source.kind}`)}
                        {source.ref?.trim() ? `: ${source.ref}` : ""}
                      </span>
                    ))}
                    {extra > 0 && <span className="text-[11px] text-slate-500">+{extra}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Gap notes live at LEDGER level on the BE contract (never per-item). */}
        {(ledger.evidence_gap?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[11px] font-bold text-amber-700">{t("evidence.gapTitle")}</p>
            <ul className="mt-1 space-y-0.5">
              {ledger.evidence_gap!.slice(0, 4).map((gap, idx) => (
                <li key={idx} className="text-xs leading-relaxed text-amber-700">{gap}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
