import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  TrendingUp, CheckCircle2, AlertCircle, X, Loader2,
  Briefcase, Globe, GraduationCap, Building2, MapPin, Code
} from "lucide-react";
import { useGapReportQuery } from "@/hooks/use-diagnosis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GapReportDto } from "@shared/api";
import { JdIntelligenceCard } from "./JdIntelligenceCard";
import { SectionRule } from "./editorial";
import { ENABLE_DIAGNOSIS_ADDONS } from "@/lib/runtime-config";

const GAP_TYPE_ICON: Record<string, React.ReactNode> = {
  hard_skill: <Code className="w-3.5 h-3.5" />,
  soft_skill: <Code className="w-3.5 h-3.5" />,
  seniority: <Briefcase className="w-3.5 h-3.5" />,
  language: <Globe className="w-3.5 h-3.5" />,
  education: <GraduationCap className="w-3.5 h-3.5" />,
  domain: <Building2 className="w-3.5 h-3.5" />,
  work_mode: <MapPin className="w-3.5 h-3.5" />,
};

const GAP_SOURCE_STYLE: Record<string, string> = {
  jd: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
  role_rubric: "bg-[#F6F4FB] text-[#6943C7] border-[#E2D9F3]",
  market_implied: "bg-[#F4F9FC] text-[#1E7497] border-[#CBE5EF]",
};

/** Map evidence_refs ("experience_0") → human source labels ("Kinh nghiệm #1"), max 3. */
function formatEvidenceRefs(
  refs: string[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  return refs
    .slice(0, 3)
    .map((r) => {
      const m = r.match(/^([a-z_]+?)_(\d+)$/i);
      if (!m) return r;
      const [, kind, idx] = m;
      const label = t(`gapReport.evidenceKind.${kind}`, { defaultValue: kind });
      return `${label} #${Number(idx) + 1}`;
    })
    .join(", ");
}

/** Severity band from the 0-1 score (matches the sort already applied). */
function severityBand(severity: number): "high" | "med" | "low" {
  if (severity >= 0.66) return "high";
  if (severity >= 0.33) return "med";
  return "low";
}

/**
 * Báo cáo gap hợp nhất (GET /api/cv-matches/:matchId/gap-report — BE #43/#49).
 * Deterministic phía BE, KHÔNG tốn quota chấm — card tự fetch khi có matchId.
 * Mọi số liệu (jd_count/cv_count/%, posting_count) là số thật từ BE; FE chỉ render.
 *
 * W24: restyle editorial — hairline divider, serif heading, bỏ Card wrapper.
 * W23 logic giữ nguyên: gap_items filter/sort/slice, render-when-present, fallback.
 */
export function GapReportCard({ matchId }: { matchId: string }) {
  const { t, i18n } = useTranslation("diagnosis");
  const lang: "vi" | "en" = i18n.language?.startsWith("vi") ? "vi" : "en";

  const { data, isLoading, isError, refetch, isRefetching } = useGapReportQuery(
    matchId,
    lang,
  ) as {
    data: GapReportDto | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
    isRefetching: boolean;
  };

  if (!ENABLE_DIAGNOSIS_ADDONS) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#787774] py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> {t("gapReport.loading")}
      </div>
    );
  }
  if (isError || !data) {
    // Same recover-in-place pattern as JobRecommendations/RoadmapFromMatchSection — the query
    // has retry:false, so without this button the only way out of a transient error is a full
    // page reload (audited 2026-07-06: the ONE place that lacked it was the most important one).
    return (
      <div className="text-sm text-[#9F2F2D] py-4 flex items-center gap-3">
        <span>{t("gapReport.error")}</span>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1 rounded border border-[#E3E0D8] px-2 py-0.5 text-xs text-[#37352F] hover:bg-[#F1F0EC] disabled:opacity-50"
        >
          {isRefetching ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {t("gapReport.retry", { defaultValue: lang === "vi" ? "Thử lại" : "Retry" })}
        </button>
      </div>
    );
  }

  const market = data.jd_market_position;
  const impliedMissing = market.available
    ? market.implied.filter((s) => !s.covered).slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] font-mono text-[#787774]">
          {data.source_of_requirements === "jd_extraction"
            ? t("gapReport.sourceJd")
            : t("gapReport.sourceRubric")}
        </span>
      </div>

      {/* Priority gaps block (W23 — LOGIC UNTOUCHED) */}
      {data.gap_items && data.gap_items.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-[#2F3437] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#9F2F2D]" />
              {t("gapReport.priorityTitle")}
            </h3>
            <p className="text-[11px] text-[#787774] leading-relaxed">
              {t("gapReport.priorityDesc")}
            </p>
          </div>

          <div className="space-y-2.5">
            {[...data.gap_items]
              .filter((g) => g.cv_status !== "matched")
              .sort((a, b) => b.severity - a.severity)
              .slice(0, 6)
              .map((gap, i) => {
                const importanceStyle = {
                  REQUIRED: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
                  PREFERRED: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
                  NICE_TO_HAVE: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
                }[gap.importance] || "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]";

                const statusStyle = {
                  matched: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
                  partial: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
                  unproven: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
                  missing: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
                  overclaimed: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
                }[gap.cv_status] || "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]";

                const fixabilityStyle = {
                  rewrite: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
                  add_evidence: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
                  learn: "bg-ink-accent-tint text-ink-accent border-ink-accent/20",
                  not_fixable_now: "bg-slate-100 text-slate-700 border-slate-200",
                }[gap.fixability] || "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]";

                const sevBand = severityBand(gap.severity);
                const lowConfidence = gap.confidence < 0.8;
                const severityStyle = {
                  high: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
                  med: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
                  low: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
                }[sevBand];

                const severityBorderColor = {
                  matched: "border-l-[#346538]",
                  partial: "border-l-[#956400]",
                  unproven: "border-l-[#956400]",
                  missing: "border-l-[#9F2F2D]",
                  overclaimed: "border-l-[#9F2F2D]",
                }[gap.cv_status] || "border-l-[#EAEAEA]";

                return (
                  <div
                    key={`${gap.requirement_id || gap.canonical_name}-${i}`}
                    id={`gap-${gap.requirement_id}`}
                    className="p-1.5 rounded-2xl bg-slate-50 border border-slate-200/50 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.01] hover:shadow-md group"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                  >
                    {/* Inner Core */}
                    <div
                      className={cn(
                        "p-4 rounded-[calc(1rem-0.375rem)] bg-white border border-slate-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] space-y-3 transition-colors duration-500",
                        severityBorderColor,
                        "border-l-[3px]"
                      )}
                    >
                    {/* Top row: Name, Type, Importance, Status, Fixability */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-bold text-[#2F3437] mr-1">
                        {gap.display_name}
                      </span>

                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#EAEAEA] bg-[#F7F6F3] text-[#787774] text-[10px] font-medium">
                        {GAP_TYPE_ICON[gap.type] || null}
                        {t(`gapReport.type.${gap.type}`, { defaultValue: gap.type })}
                      </span>

                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded border text-[10px] font-bold cursor-help",
                          GAP_SOURCE_STYLE[gap.source] || "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
                        )}
                        title={t(`gapReport.sourceHint.${gap.source}`, {
                          confidence: Math.round(gap.confidence * 100),
                          defaultValue: `${gap.source} · ${Math.round(gap.confidence * 100)}% confidence`,
                        })}
                      >
                        {lowConfidence ? t("gapReport.estimatedPrefix") : null}
                        {t(`gapReport.source.${gap.source}`, { defaultValue: gap.source })}
                      </span>

                      <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-bold", importanceStyle)}>
                        {t(`jdIntel.importance.${gap.importance}`, { defaultValue: gap.importance })}
                      </span>

                      <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-bold", statusStyle)}>
                        {t(`gapReport.status.${gap.cv_status}`, { defaultValue: gap.cv_status })}
                      </span>

                      <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-bold", fixabilityStyle)}>
                        {t(`gapReport.fix.${gap.fixability}`, { defaultValue: gap.fixability })}
                      </span>

                      {gap.severity_factors ? (
                        <Popover>
                          <PopoverTrigger>
                            <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity", severityStyle)}>
                              {t(`gapReport.severity.${sevBand}`)}
                            </span>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 shadow-lg" side="top" align="center">
                            <div className="space-y-2 text-sm text-[#2F3437]">
                              <p className="font-semibold text-[13px] border-b pb-1.5">{t("diagnosis.severityBreakdown.title", "Chi tiết độ nghiêm trọng")}</p>
                              <div className="flex justify-between text-[12px]">
                                <span className="text-slate-500">{t("diagnosis.severityBreakdown.importance", "Độ quan trọng (JD)")}</span>
                                <span className="font-medium">{gap.severity_factors.importance.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between text-[12px]">
                                <span className="text-slate-500">{t("diagnosis.severityBreakdown.core", "Năng lực lõi (Core)")}</span>
                                <span className="font-medium">{gap.severity_factors.core.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between text-[12px]">
                                <span className="text-slate-500">{t("diagnosis.severityBreakdown.market", "Hệ số thị trường")}</span>
                                <span className="font-medium">{gap.severity_factors.market_mult.toFixed(3)}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-2 bg-slate-50 p-1.5 rounded">
                                {t("diagnosis.severityBreakdown.formula", "Severity = Importance × Core × Market")}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-bold", severityStyle)}>
                          {t(`gapReport.severity.${sevBand}`)}
                        </span>
                      )}
                    </div>

                    {/* Middle row: Action */}
                    <p className="text-[12px] text-[#2F3437] leading-relaxed">
                      <span className="font-semibold text-slate-500">{t("gapReport.actions")}:</span>{" "}
                      {gap.recommended_next_action}
                    </p>

                    {/* Bottom row: compact metadata */}
                    {((gap.cv_level !== null && gap.required_level !== null) ||
                      (gap.evidence_risk && gap.evidence_risk !== "none") ||
                      (gap.evidence_refs && gap.evidence_refs.length > 0) ||
                      gap.market_demand !== null) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#787774] font-medium pt-1.5 border-t border-[#F1F1EF]">
                        {gap.cv_level !== null && gap.required_level !== null && (
                          <span>
                            {t("gapReport.levelGap", { cv: gap.cv_level, required: gap.required_level })}
                          </span>
                        )}
                        {gap.evidence_risk && gap.evidence_risk !== "none" && (
                          <span>
                            {t("gapReport.evidenceRisk", {
                              risk: t(`gapReport.evidenceRiskVal.${gap.evidence_risk}`, { defaultValue: gap.evidence_risk })
                            })}
                          </span>
                        )}
                        {gap.market_demand !== null && (
                          <span>
                            {t("gapReport.marketDemand", { pct: gap.market_demand })}
                          </span>
                        )}
                        {!gap.evidence && gap.evidence_refs && gap.evidence_refs.length > 0 && (
                          <span>
                            {t("gapReport.evidenceFrom", { sources: formatEvidenceRefs(gap.evidence_refs, t) })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* W39: Evidence block with quotes */}
                    {gap.evidence && gap.evidence.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[#F1F1EF]">
                        <span className="text-[11px] font-medium text-slate-500">{t("diagnosis.evidenceTitle", "Bằng chứng từ CV")}</span>
                        {gap.evidence.map((ev, evIdx) => (
                          <div key={evIdx} className="pl-2 border-l-2 border-slate-200">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {/* W41: GitHub corroboration chip — special style */}
                              {ev.kind === "github" ? (
                                <span
                                  title={t("gapReport.githubCorrobTooltip", { defaultValue: "This skill has a public GitHub repo backing it — evidence risk lowered" })}
                                  className="text-[10px] font-medium px-1.5 py-0.5 bg-[#EDF3EC] text-[#346538] border border-[#DCE9D7] rounded inline-flex items-center gap-1"
                                >
                                  ✓ GitHub: {ev.ref}
                                </span>
                              ) : (
                                <>
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                    {t(`gapReport.evidenceKind.${ev.kind}`, { defaultValue: ev.kind })}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{ev.ref}</span>
                                </>
                              )}
                            </div>
                            {ev.quote && (
                              <p className="text-[12px] italic text-slate-600 line-clamp-2 mt-0.5">
                                "{ev.quote}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}

            {(() => {
              const remaining = data.gap_items!.filter((g) => g.cv_status !== "matched").length - 6;
              return remaining > 0 ? (
                <div className="text-[11px] font-medium text-slate-400 pl-1">
                  {t("gapReport.moreGaps", { count: remaining })}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Recommended actions — việc đáng làm trước, số liệu thật từ BE */}
      {data.recommended_actions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#2F3437] mb-2">{t("gapReport.actions")}</h3>
          <ol className="space-y-2">
            {data.recommended_actions.map((a, i) => (
              <li key={`${a.skill_canonical}-${i}`} className="flex items-start gap-2.5 text-[13px] text-[#2F3437]">
                <span className="font-mono tabular-nums text-[11px] font-bold text-slate-400 mt-0.5 shrink-0">
                  {i + 1}.
                </span>
                <div className="min-w-0">
                  <span className="font-semibold">{a.display_name}</span>
                  <span className="text-[#787774]"> — {a.why}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Gaps: thiếu hẳn (đỏ) + thiếu cấp độ (vàng) — fallback khi gap_items chưa có */}
      {!data.gap_items?.length && (data.explicit_gaps.length > 0 || data.proficiency_gaps.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.explicit_gaps.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#9F2F2D] mb-1.5">
                <X className="w-3.5 h-3.5" /> {t("gapReport.gapsExplicit")}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.explicit_gaps.map((g) => (
                  <span key={g.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]">
                    {g.display_name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.proficiency_gaps.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#956400] mb-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {t("gapReport.gapsProficiency")}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.proficiency_gaps.map((g) => (
                  <span key={g.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]">
                    {g.display_name} (+{g.gap_levels})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strengths */}
      {(data.strengths.matched.length > 0 || data.strengths.bonus.length > 0) && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#346538] mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t("gapReport.strengths")}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.strengths.matched.map((s) => (
              <span key={s.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]">
                {s.display_name}
              </span>
            ))}
            {data.strengths.bonus.map((s) => (
              <span key={s.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-medium bg-[#F7F6F3] text-[#787774] border-[#EAEAEA]">
                + {s.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Thị trường kỳ vọng ngầm (pool thật) — chỉ khi snapshot có */}
      {impliedMissing.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#2F3437] mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-ink-accent" /> {t("gapReport.marketTitle")}
          </h4>
          <ul className="space-y-1.5">
            {impliedMissing.map((s) => (
              <li key={s.skill_canonical} className="text-[12px] text-[#787774] leading-relaxed">
                <span className="font-semibold text-[#2F3437]">{s.display_name}</span>
                <span className="font-mono tabular-nums text-[11px] text-slate-400"> · {s.pct_of_postings}%</span>
                <span> — {s.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* W19: JD Intelligence — yêu cầu ngoài kỹ năng (render-when-present) */}
      {/* W23 #2: pass gapItems to join cv_status/severity/fixability per dimension */}
      {data.jd_intelligence && (
        <>
          <SectionRule className="my-2" />
          <JdIntelligenceCard data={data.jd_intelligence} gapItems={data.gap_items} />
        </>
      )}

      <p className="text-[11px] text-slate-400 border-t border-[#F1F1EF] pt-3">
        {t("gapReport.footnote")}
      </p>
    </div>
  );
}
