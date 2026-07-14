import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  TrendingUp, CheckCircle2, AlertCircle, X, Loader2,
  Briefcase, Globe, GraduationCap, Building2, MapPin, Code, XCircle
} from "lucide-react";
import { useGapReportQuery } from "@/hooks/use-diagnosis";
import type { GapReportDto } from "@shared/api";
import { JdIntelligenceCard } from "./JdIntelligenceCard";
import { SectionRule } from "./editorial";
import { ENABLE_DIAGNOSIS_ADDONS } from "@/lib/runtime-config";
import { isThrottledError } from "@/lib/api-error";

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
  jd: "bg-emerald-50 text-emerald-700 border-emerald-100",
  role_rubric: "bg-purple-50 text-purple-700 border-purple-100",
  market_implied: "bg-sky-50 text-sky-700 border-sky-100",
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

  const { data, isLoading, isError, error, refetch, isRefetching } = useGapReportQuery(
    matchId,
    lang,
  ) as {
    data: GapReportDto | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
    isRefetching: boolean;
  };
  const isThrottled = isError && isThrottledError(error);

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
      <div className={cn(
        "text-sm py-4 flex items-center gap-3 px-4 rounded-xl border w-fit",
        isThrottled ? "border-[#EAEAEA] bg-[#FBFBFA] text-[#787774]" : "text-[#9F2F2D] border-transparent"
      )}>
        <span>
          {isThrottled
            ? t("degraded.throttled", { defaultValue: "Bạn thao tác hơi nhanh, thử lại sau giây lát" })
            : t("gapReport.error")}
        </span>
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
            ? t("gapReport.sourceJdNew", { defaultValue: "theo JD bạn dán" })
            : data.source_of_requirements === "role_rubric"
              ? t("gapReport.sourceRubricNew", { defaultValue: "theo thước chuẩn vai trò" })
              : t("gapReport.sourceNone", { defaultValue: "chưa có cơ sở chấm" })}
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

          <div className="divide-y divide-[#F1F1EF] border border-[#EAEAEA] rounded-xl bg-white overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            {[...data.gap_items]
              .filter((g) => g.cv_status !== "matched")
              .sort((a, b) => b.severity - a.severity)
              .slice(0, 6)
              .map((gap, i) => {
                const cleanImportanceStyle = {
                  REQUIRED: "bg-rose-50 text-rose-700 border-rose-100/80",
                  PREFERRED: "bg-amber-50 text-amber-700 border-amber-100/80",
                  NICE_TO_HAVE: "bg-slate-50 text-slate-600 border-slate-200/60",
                }[gap.importance] || "bg-slate-50 text-slate-600 border-slate-200/60";

                const cleanFixabilityStyle = {
                  rewrite: "bg-emerald-50 text-emerald-700 border-emerald-100/80",
                  add_evidence: "bg-amber-50 text-amber-700 border-amber-100/80",
                  learn: "bg-sky-50 text-sky-700 border-sky-100/80",
                  not_fixable_now: "bg-slate-50 text-slate-600 border-slate-200/60",
                }[gap.fixability] || "bg-slate-50 text-slate-600 border-slate-200/60";

                const sevBand = severityBand(gap.severity);
                const lowConfidence = gap.confidence < 0.8;
                const cleanSeverityStyle = {
                  high: "bg-rose-50 text-rose-700 border-rose-100/80",
                  med: "bg-amber-50 text-amber-700 border-amber-100/80",
                  low: "bg-slate-50 text-slate-600 border-slate-200/60",
                }[sevBand];

                const severityBorderColor = {
                  matched: "border-l-emerald-500",
                  partial: "border-l-amber-500",
                  unproven: "border-l-amber-500",
                  missing: "border-l-rose-500",
                  overclaimed: "border-l-rose-500",
                }[gap.cv_status] || "border-l-slate-200";

                const statusIcon = {
                  matched: (
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ),
                  partial: (
                    <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  ),
                  unproven: (
                    <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  ),
                  missing: (
                    <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                      <XCircle className="w-3.5 h-3.5" />
                    </div>
                  ),
                  overclaimed: (
                    <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                      <XCircle className="w-3.5 h-3.5" />
                    </div>
                  ),
                }[gap.cv_status] || (
                  <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                );

                const riskStyle = {
                  high: "bg-rose-50 text-rose-700 border-rose-100/80",
                  medium: "bg-amber-50 text-amber-700 border-amber-100/80",
                  low: "bg-emerald-50 text-emerald-700 border-emerald-100/80",
                }[gap.evidence_risk] || "bg-slate-50 text-slate-600 border-slate-200/60";

                const showBottomMetadata = (gap.cv_level !== null && gap.required_level !== null) ||
                  (gap.evidence_risk && gap.evidence_risk !== "none") ||
                  (gap.evidence_refs && gap.evidence_refs.length > 0) ||
                  gap.market_demand !== null;

                return (
                  <div
                    key={`${gap.requirement_id || gap.canonical_name}-${i}`}
                    id={`gap-${gap.requirement_id}`}
                    className={cn(
                      "p-4 flex gap-3 hover:bg-slate-50/80 transition-all duration-200 border-l-[3px] first:rounded-t-xl last:rounded-b-xl",
                      severityBorderColor
                    )}
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                  >
                    {/* Left Icon Status */}
                    <div className="shrink-0 pt-0.5">
                      {statusIcon}
                    </div>

                    {/* Right Content Column */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      {/* Name & Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-bold text-slate-800 tracking-tight mr-1">
                          {gap.display_name}
                        </span>

                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-slate-200/60 bg-slate-50 text-slate-600 text-[10px] font-medium">
                          {GAP_TYPE_ICON[gap.type] || null}
                          {t(`gapReport.type.${gap.type}`, { defaultValue: gap.type })}
                        </span>

                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full border text-[10px] font-bold cursor-help",
                            GAP_SOURCE_STYLE[gap.source] || "bg-slate-50 text-slate-600 border-slate-200/60",
                          )}
                          title={t(`gapReport.sourceHint.${gap.source}`, {
                            confidence: Math.round(gap.confidence * 100),
                            defaultValue: `${gap.source} · ${Math.round(gap.confidence * 100)}% confidence`,
                          })}
                        >
                          {lowConfidence ? t("gapReport.estimatedPrefix") : null}
                          {t(`gapReport.source.${gap.source}`, { defaultValue: gap.source })}
                        </span>

                        <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-bold", cleanImportanceStyle)}>
                          {t(`jdIntel.importance.${gap.importance}`, { defaultValue: gap.importance })}
                        </span>

                        <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-bold", cleanSeverityStyle)}>
                          {t(`gapReport.severity.${sevBand}`)}
                        </span>

                        <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-bold", cleanFixabilityStyle)}>
                          {t(`gapReport.fix.${gap.fixability}`, { defaultValue: gap.fixability })}
                        </span>
                      </div>

                      {/* Recommended next action card callout */}
                      <div className="text-[12px] text-slate-600 leading-relaxed bg-slate-50/80 border border-slate-100 p-2.5 rounded-lg">
                        <span className="font-semibold text-slate-700 mr-1.5">{t("gapReport.actions")}:</span>{" "}
                        {gap.recommended_next_action}
                      </div>

                      {/* Bottom metadata tags */}
                      {showBottomMetadata && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium pt-1.5 border-t border-slate-100">
                          {gap.cv_level !== null && gap.required_level !== null && (
                            <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100/60">
                              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                              {t("gapReport.levelGap", { cv: gap.cv_level, required: gap.required_level })}
                            </span>
                          )}
                          {gap.evidence_risk && gap.evidence_risk !== "none" && (
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border", riskStyle)}>
                              {t("gapReport.evidenceRisk", {
                                risk: t(`gapReport.evidenceRiskVal.${gap.evidence_risk}`, { defaultValue: gap.evidence_risk })
                              })}
                            </span>
                          )}
                          {gap.market_demand !== null && (
                            <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100/60">
                              {t("gapReport.marketDemand", { pct: gap.market_demand })}
                            </span>
                          )}
                          {!gap.evidence && gap.evidence_refs && gap.evidence_refs.length > 0 && (
                            <span className="text-[10px] text-slate-400">
                              {t("gapReport.evidenceFrom", { sources: formatEvidenceRefs(gap.evidence_refs, t) })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* W39: Evidence block with quotes */}
                      {gap.evidence && gap.evidence.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-semibold text-slate-500">{t("diagnosis.evidenceTitle", "Bằng chứng từ CV")}</span>
                          {gap.evidence.map((ev, evIdx) => (
                            <div key={evIdx} className="pl-2 border-l-2 border-slate-200">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {/* W41: GitHub corroboration chip — special style */}
                                {ev.kind === "github" ? (
                                  <span
                                    title={t("gapReport.githubCorrobTooltip", { defaultValue: "This skill has a public GitHub repo backing it — evidence risk lowered" })}
                                    className="text-[10px] font-medium px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded inline-flex items-center gap-1"
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
          </div>

            {(() => {
              const remaining = data.gap_items!.filter((g) => g.cv_status !== "matched").length - 6;
              return remaining > 0 ? (
                <div className="text-[11px] font-medium text-slate-400 pl-1">
                  {t("gapReport.moreGaps", { count: remaining })}
                </div>
              ) : null;
            })()}
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
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-rose-600 mb-1.5">
                <X className="w-3.5 h-3.5" /> {t("gapReport.gapsExplicit")}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.explicit_gaps.map((g) => (
                  <span key={g.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-rose-50 text-rose-700 border-rose-100">
                    {g.display_name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.proficiency_gaps.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mb-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {t("gapReport.gapsProficiency")}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.proficiency_gaps.map((g) => (
                  <span key={g.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-100">
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
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t("gapReport.strengths")}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.strengths.matched.map((s) => (
              <span key={s.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-100">
                {s.display_name}
              </span>
            ))}
            {data.strengths.bonus.map((s) => (
              <span key={s.canonical_name} className="px-2 py-0.5 rounded border text-[11px] font-medium bg-slate-50 text-slate-600 border-slate-200">
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
