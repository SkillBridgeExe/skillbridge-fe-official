import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  Briefcase, MapPin, ExternalLink, Building2, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, RefreshCw, SlidersHorizontal, ArrowUpDown, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJobRecommendationsQuery } from "@/hooks/use-diagnosis";
import { matchScoreBand } from "@/lib/match-score-band";
import type { JobRecommendationDto } from "@shared/api";
import type { JobRecommendationsQuery } from "@/api/cv/recommendations";
import { FitBadge } from "./FitBadge";
import { InfoPopover } from "./InfoPopover";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { IT_ROLES } from "@/constants/it-roles";


type WorkModeType = "ONSITE" | "HYBRID" | "REMOTE";
type ExperienceLevelType = "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD";
type EmploymentTypeVal = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
type FitVerdictType = "safe_apply" | "stretch" | "not_recommended";
type SortOptionType = "RECOMMENDED" | "SKILL_MATCH" | "NEWEST" | "SALARY_DESC";

function asWorkMode(val: string): WorkModeType | undefined {
  return val === "ONSITE" || val === "HYBRID" || val === "REMOTE" ? val : undefined;
}

function asExperienceLevel(val: string): ExperienceLevelType | undefined {
  return val === "INTERN" || val === "FRESHER" || val === "JUNIOR" || val === "MIDDLE" || val === "SENIOR" || val === "LEAD" ? val : undefined;
}

function asEmploymentType(val: string): EmploymentTypeVal | undefined {
  return val === "FULL_TIME" || val === "PART_TIME" || val === "CONTRACT" || val === "INTERNSHIP" || val === "FREELANCE" ? val : undefined;
}

function asFitVerdict(val: string): FitVerdictType | undefined {
  return val === "safe_apply" || val === "stretch" || val === "not_recommended" ? val : undefined;
}

function asSortOption(val: string): SortOptionType {
  return val === "SKILL_MATCH" || val === "NEWEST" || val === "SALARY_DESC" ? val : "RECOMMENDED";
}

/* Moat L2 — top job thật khớp CV (GET /api/cvs/:cvId/job-recommendations).
   §0b design spec: card trắng + border #EAEAEA, pastel theo band, số mono, không gradient. */
const CARD = "bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md hover:border-blue-200/50 flex flex-col overflow-hidden";

/** Band màu cho match % — CÙNG thang 80/60 với màn compare (một con số, một màu). */
function matchBand(score: number): string {
  return matchScoreBand(score).chip;
}

/** VND → "tr" (triệu), ngoại tệ → số + mã. null cả hai → null (ẩn). */
function formatSalary(min: number | null, max: number | null, currency: string): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => (currency === "VND" ? `${Math.round(n / 1_000_000)}` : n.toLocaleString());
  const unit = currency === "VND" ? "tr" : ` ${currency}`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}${unit}`;
  return `${fmt((min ?? max) as number)}${unit}`;
}

function JobCard({ job, t }: { job: JobRecommendationDto; t: (key: string, options?: Record<string, unknown>) => string }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);

  const recScore = job.recommendation_score ?? job.match_score;
  const matchScoreVal = job.match_score;
  const demoted = typeof matchScoreVal === "number" && recScore < matchScoreVal;
  const severe = job.severe_stretch === true;

  const missing = job.missing_skills ?? [];
  const partial = job.partial_skills ?? [];
  const breakdown = job.scoring_breakdown;
  const experienceFit = job.experience_fit?.verdict && job.experience_fit.verdict !== "unknown" ? job.experience_fit : null;
  const fitClass = experienceFit?.verdict === "fits"
    ? "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]"
    : experienceFit?.verdict === "stretch"
      ? "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]"
      : "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]";

  const workModeLabel = job.work_mode
    ? t(`jobs.workModes.${job.work_mode}`, { defaultValue: job.work_mode })
    : null;

  const employmentTypeLabel = job.employment_type
    ? t(`jobs.employmentTypes.${job.employment_type}`, { defaultValue: job.employment_type })
    : null;

  const experienceLevelLabel = job.experience_level
    ? t(`jobs.experienceLevels.${job.experience_level}`, { defaultValue: job.experience_level })
    : null;

  return (
    <div className={cn(CARD, "group relative")}>
      {/* Top Section: Essential Info */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-[15px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
              {job.title}
            </h4>
            <span className="flex items-center gap-1.5 mt-2 min-w-0 font-medium text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{job.company_name}</span>
            </span>
          </div>
          {/* Match Score */}
          <div className="shrink-0 flex flex-col items-end">
            {job.seniority_factor && job.seniority_factor < 1 ? (
              <InfoPopover
                align="right"
                label={t("jobs.seniorityLabel", { defaultValue: "Vì sao điểm bị điều chỉnh" })}
                trigger={
                  <span className={cn("shrink-0 text-xs font-bold font-mono tabular-nums px-2.5 py-1 rounded-lg border underline decoration-dotted underline-offset-2 transition-colors", matchBand(recScore))}>
                    {recScore}%
                  </span>
                }
              >
                <p className="text-xs leading-relaxed text-slate-700">
                  {t("jobs.seniorityTooltip", {
                    defaultValue: "Điểm gốc {{match}} × {{factor}} (điều chỉnh cấp bậc: chênh {{level}} bậc)",
                    match: matchScoreVal,
                    factor: job.seniority_factor.toFixed(2),
                    level: job.level_gap ?? 0,
                  })}
                </p>
              </InfoPopover>
            ) : (
              <span className={cn("shrink-0 text-xs font-bold font-mono tabular-nums px-2.5 py-1 rounded-lg border transition-colors", matchBand(recScore))}>
                {recScore}%
              </span>
            )}
            
            {typeof matchScoreVal === "number" && (job.fit || demoted) && (
              <span className="mt-1.5 block text-[10px] font-mono tabular-nums text-slate-500">
                {t("jobs.skillMatch", { score: matchScoreVal, defaultValue: `Kỹ năng ${matchScoreVal}%` })}
              </span>
            )}
          </div>
        </div>

        {/* Match Fit Indicators */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {job.fit && <FitBadge fit={job.fit} />}
          {!job.fit && demoted && (
            <span className={cn(
              "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold",
              severe ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200",
            )}>
              {t(severe ? "jobs.severeStretch" : "jobs.stretch")}
            </span>
          )}
          {!job.fit && experienceFit && !demoted && (
            <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold", fitClass, experienceFit.confidence !== "high" && "opacity-80")}>
              {t(`matchDepth.fit.${experienceFit.verdict}`)}
              {experienceFit.confidence !== "high" && ` · ${t("matchDepth.fit.estimate")}`}
            </span>
          )}
          {job.score_basis && (
            <span className="text-[10px] text-slate-400">{t(`jobs.scoreBasis.${job.score_basis}`)}</span>
          )}
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] text-slate-500 font-medium">
          {job.location && (
            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              {job.location}
            </span>
          )}
          {workModeLabel && (
            <span className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100">{workModeLabel}</span>
          )}
          {experienceLevelLabel && (
            <span className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100">{experienceLevelLabel}</span>
          )}
          {employmentTypeLabel && (
            <span className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100">{employmentTypeLabel}</span>
          )}
          {salary && (
            <span className="font-mono tabular-nums text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/50">
              {salary}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Section (Bento Split) for Skills & Actions */}
      <div className="bg-slate-50/50 border-t border-slate-200/50 p-4 mt-auto">
        {/* Skills breakdown tags */}
        {(partial.length > 0 || missing.length > 0) && (
          <div className="space-y-2 mb-3">
            {partial.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600/70 mr-1">{t("matchDepth.partial")}</span>
                {partial.slice(0, 3).map((s) => (
                  <span key={s.canonical_name ?? s.display_name} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100/50 border border-amber-200/50 text-amber-700">
                    {s.display_name}
                    {typeof s.gap_levels === "number" && ` · ${t("matchDepth.gapLevels", { count: s.gap_levels })}`}
                  </span>
                ))}
                {partial.length > 3 && <span className="text-[10px] text-slate-400 font-mono">+{partial.length - 3}</span>}
              </div>
            )}
            {missing.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600/70 mr-1">{t("jobs.missing")}</span>
                {missing.slice(0, 3).map((s) => (
                  <span key={s.display_name} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-700">
                    {s.display_name}
                  </span>
                ))}
                {missing.length > 3 && (
                  <span className="text-[10px] text-slate-400 font-mono">+{missing.length - 3}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-end justify-between gap-3 mt-1">
          {/* Why Score collapsible */}
          <div className="flex-1 min-w-0">
            {breakdown && (
              <div>
                <button
                  type="button"
                  aria-expanded={whyOpen}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setWhyOpen((value) => !value);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {t("matchDepth.whyScore")}
                  {whyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {whyOpen && (
                  <div className="mt-2.5 grid grid-cols-2 gap-y-2 gap-x-3 text-[10px] font-medium text-slate-600 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{t("results.matched")}: {breakdown.matched_count}</span>
                    <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-600" />{t("results.partial")}: {breakdown.partial_count}</span>
                    <span className="flex items-center gap-1.5 ml-5">{t("results.missing")}: {breakdown.missing_count}</span>
                    <span className="flex items-center gap-1.5 ml-5 font-mono text-slate-400">{t("matchDepth.coverage")}: {breakdown.required_met}/{breakdown.required_total}</span>
                    {breakdown.cap_applied && <span className="col-span-2 text-amber-700 bg-amber-50 px-2 py-1 rounded-md mt-1">{t("matchDepth.capped")}</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Apply CTAs */}
          {job.source_url ? (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 shadow-sm hover:shadow-md"
            >
              {t("jobs.apply")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : job.application_mode === "NATIVE" ? (
            <span
              className="shrink-0 inline-flex items-center gap-1 px-4 py-2 cursor-not-allowed text-xs font-bold text-slate-400 bg-slate-100 rounded-full border border-slate-200"
              title={t("jobs.inAppSoon")}
            >
              {t("jobs.inAppSoon")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Job Recommendations & Job Explorer Component. */
export function JobRecommendations({
  cvId,
  targetRole,
}: {
  cvId: string | null;
  targetRole?: string | null;
}) {
  const { t } = useTranslation("diagnosis");

  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [stateCvId, setStateCvId] = useState(cvId);
  const [queryState, setQueryState] = useState<JobRecommendationsQuery>({
    limit: 5,
    offset: 0,
    sort: "RECOMMENDED",
  });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileDraftQuery, setMobileDraftQuery] = useState<JobRecommendationsQuery>(queryState);
  const [accumulatedRecs, setAccumulatedRecs] = useState<JobRecommendationDto[]>([]);
  const cvChanged = stateCvId !== cvId;

  const activeQuery = useMemo(() => {
    if (cvChanged) {
      return {
        limit: 5,
        offset: 0,
        sort: "RECOMMENDED" as const,
        ...(targetRole ? { role: targetRole } : {}),
      };
    }
    const role = queryState.role ?? targetRole ?? undefined;
    return isExplorerOpen
      ? { ...queryState, ...(role ? { role } : {}), limit: 10 }
      : {
          limit: 5,
          offset: 0,
          sort: "RECOMMENDED" as const,
          ...(role ? { role } : {}),
        };
  }, [cvChanged, isExplorerOpen, queryState, targetRole]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useJobRecommendationsQuery(
    cvId,
    activeQuery,
  );

  const rawRecs = data?.recommendations ?? [];
  const total = data?.total ?? data?.eligible_pool_size ?? data?.pool_size ?? rawRecs.length;
  const facets = data?.facets;
  const lastPageCount = rawRecs.length;
  const loadedThrough = (data?.offset ?? activeQuery.offset ?? 0) + lastPageCount;
  const hasMore = isExplorerOpen && lastPageCount > 0 && loadedThrough < total;
  const filterQuery = mobileFilterOpen ? mobileDraftQuery : queryState;

  useEffect(() => {
    setStateCvId(cvId);
    setIsExplorerOpen(false);
    setMobileFilterOpen(false);
    setQueryState({ limit: 5, offset: 0, sort: "RECOMMENDED" });
    setMobileDraftQuery({ limit: 5, offset: 0, sort: "RECOMMENDED" });
    setAccumulatedRecs([]);
  }, [cvId]);

  // Accumulated pagination ("Tải thêm"): append newly fetched recommendations to existing list
  useEffect(() => {
    if (!data?.recommendations) return;
    if (!isExplorerOpen || (queryState.offset ?? 0) === 0) {
      setAccumulatedRecs(data.recommendations);
    } else {
      setAccumulatedRecs((prev) => {
        const existingMap = new Map(prev.map((item) => [item.job_id, item]));
        for (const item of data.recommendations) {
          existingMap.set(item.job_id, item);
        }
        return Array.from(existingMap.values());
      });
    }
  }, [data?.recommendations, queryState.offset, isExplorerOpen]);

  const displayRecs = isExplorerOpen && accumulatedRecs.length > 0 ? accumulatedRecs : rawRecs;

  if (!cvId) return null;

  const quotaBlocked =
    (isAxiosError(error) && error.response?.status === 402) ||
    (error && typeof error === "object" && (error as { status?: number }).status === 402);

  const activeFilterCount =
    (queryState.cityCodes?.length ? 1 : 0) +
    (queryState.workModes?.length ? 1 : 0) +
    (queryState.experienceLevels?.length ? 1 : 0) +
    (queryState.employmentTypes?.length ? 1 : 0) +
    (queryState.fit?.length ? 1 : 0) +
    (queryState.role && queryState.role !== "all" ? 1 : 0) +
    (queryState.salaryOnly ? 1 : 0);

  const handleResetFilters = () => {
    const reset = {
      limit: 10,
      offset: 0,
      sort: "RECOMMENDED",
    } satisfies JobRecommendationsQuery;
    if (mobileFilterOpen) {
      setMobileDraftQuery(reset);
      return;
    }
    setQueryState(reset);
    setAccumulatedRecs([]);
  };

  const updateFilterQuery = (
    updater: (previous: JobRecommendationsQuery) => JobRecommendationsQuery,
  ) => {
    if (mobileFilterOpen) {
      setMobileDraftQuery(updater);
      return;
    }
    setQueryState(updater);
    setAccumulatedRecs([]);
  };

  const handleSetRole = (roleCode: string) => {
    updateFilterQuery((prev) => ({
      ...prev,
      // `undefined` means "use the CV target role" in the BE contract. Preserve
      // the explicit "all" token so the user can genuinely browse every role.
      role: roleCode,
      offset: 0,
    }));
  };

  const handleToggleCity = (code: string) => {
    updateFilterQuery((prev) => {
      const current = prev.cityCodes ?? [];
      const updated = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      return { ...prev, cityCodes: updated.length ? updated : undefined, offset: 0 };
    });
  };

  const handleToggleWorkMode = (mode: "ONSITE" | "HYBRID" | "REMOTE") => {
    updateFilterQuery((prev) => {
      const current = prev.workModes ?? [];
      const updated = current.includes(mode)
        ? current.filter((m) => m !== mode)
        : [...current, mode];
      return { ...prev, workModes: updated.length ? updated : undefined, offset: 0 };
    });
  };

  const handleToggleExperienceLevel = (level: "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD") => {
    updateFilterQuery((prev) => {
      const current = prev.experienceLevels ?? [];
      const updated = current.includes(level)
        ? current.filter((l) => l !== level)
        : [...current, level];
      return { ...prev, experienceLevels: updated.length ? updated : undefined, offset: 0 };
    });
  };

  const handleToggleEmploymentType = (type: EmploymentTypeVal) => {
    updateFilterQuery((prev) => {
      const current = prev.employmentTypes ?? [];
      const updated = current.includes(type)
        ? current.filter((tVal) => tVal !== type)
        : [...current, type];
      return { ...prev, employmentTypes: updated.length ? updated : undefined, offset: 0 };
    });
  };

  const handleToggleFit = (fitVal: "safe_apply" | "stretch" | "not_recommended") => {
    updateFilterQuery((prev) => {
      const current = prev.fit ?? [];
      const updated = current.includes(fitVal)
        ? current.filter((f) => f !== fitVal)
        : [...current, fitVal];
      return { ...prev, fit: updated.length ? updated : undefined, offset: 0 };
    });
  };

  const handleToggleSalaryOnly = () => {
    updateFilterQuery((prev) => ({ ...prev, salaryOnly: !prev.salaryOnly, offset: 0 }));
  };

  const handleSetSort = (sortVal: "RECOMMENDED" | "SKILL_MATCH" | "NEWEST" | "SALARY_DESC") => {
    setQueryState((prev) => ({ ...prev, sort: sortVal, offset: 0 }));
    setAccumulatedRecs([]);
  };

  return (
    <section className="mt-6 animate-in fade-in duration-500 space-y-5">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00AEEF]/10 flex items-center justify-center text-[#00AEEF] shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2F3437]">
              {isExplorerOpen
                ? t("jobs.explorerTitle", { defaultValue: "Khám phá việc làm phù hợp" })
                : t("jobs.top5Title", { defaultValue: "Top 5 việc làm phù hợp nhất" })}
            </h3>
            {total > 0 && (
              <p className="text-[11px] text-[#787774]">
                {t("jobs.totalMatching", { count: total, defaultValue: `Tìm thấy ${total} vị trí trong kho dữ liệu` })}
              </p>
            )}
          </div>
        </div>

        {/* View All / Show Top 5 toggle button */}
        {!isLoading && !quotaBlocked && !isError && total > 5 && (
          <Button
            size="sm"
            variant={isExplorerOpen ? "outline" : "default"}
            onClick={() => {
              setIsExplorerOpen((v) => !v);
              setQueryState({ limit: isExplorerOpen ? 5 : 10, offset: 0, sort: "RECOMMENDED" });
              setAccumulatedRecs([]);
            }}
            className={cn(
              "rounded-full text-xs font-bold shrink-0 gap-1.5 h-8 px-4 transition-all",
              !isExplorerOpen
                ? "bg-[#00AEEF] hover:bg-[#049bd7] text-white border-0"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            {isExplorerOpen ? (
              <span>{t("jobs.showTop5", { defaultValue: "Xem Top 5 gọn" })}</span>
            ) : (
              <span>{t("jobs.viewAllJobs", { total, defaultValue: `Xem tất cả ${total} việc làm` })}</span>
            )}
          </Button>
        )}
      </div>

      {/* Explorer Controls Toolbar (Only active in Explorer Mode) */}
      {isExplorerOpen && (
        <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
          {/* Desktop Toolbar (>= 1024px) */}
          <div className="hidden lg:flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {t("jobs.filterTitle", { defaultValue: "Bộ lọc:" })}
              </span>

              {/* Role Select Dropdown */}
              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
                <span className="text-xs font-semibold text-slate-600">{t("jobs.roleLabel", { defaultValue: "Vai trò:" })}</span>
                <select
                  id="job-role-filter-desktop"
                  aria-label={t("jobs.roleLabel", { defaultValue: "Vai trò" })}
                  value={
                    filterQuery.role ??
                    data?.role_scope?.role_code ??
                    targetRole ??
                    (data?.role_scope?.source === "cv_target_missing" ? "" : "all")
                  }
                  onChange={(e) => handleSetRole(e.target.value)}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
                >
                  {data?.role_scope?.source === "cv_target_missing" && (
                    <option value="" disabled>
                      {t("jobs.roleMissing", { defaultValue: "Chọn vai trò mục tiêu" })}
                    </option>
                  )}
                  <option value="all">{t("jobs.allRoles", { defaultValue: "Tất cả vai trò" })}</option>
                  {IT_ROLES.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* City facet buttons */}
              {facets?.city_codes && facets.city_codes.length > 0 && (
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                  {facets.city_codes.map((city) => {
                    const isSelected = filterQuery.cityCodes?.includes(city.value);
                    return (
                      <button
                        key={city.value}
                        type="button"
                        aria-pressed={Boolean(isSelected)}
                        onClick={() => handleToggleCity(city.value)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all tabular-nums",
                          isSelected
                            ? "bg-[#00AEEF] text-white border-[#00AEEF] shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {city.value} ({city.count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Work mode facet buttons */}
              {facets?.work_modes && facets.work_modes.length > 0 && (
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                  {facets.work_modes.map((modeItem) => {
                    const modeVal = asWorkMode(modeItem.value);
                    if (!modeVal) return null;
                    const isSelected = filterQuery.workModes?.includes(modeVal);
                    const modeLabel = t(`jobs.workModes.${modeItem.value}`, { defaultValue: modeItem.value });
                    return (
                      <button
                        key={modeItem.value}
                        type="button"
                        aria-pressed={Boolean(isSelected)}
                        onClick={() => handleToggleWorkMode(modeVal)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all tabular-nums",
                          isSelected
                            ? "bg-[#00AEEF] text-white border-[#00AEEF] shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {modeLabel} ({modeItem.count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Employment type facet buttons */}
              {facets?.employment_types && facets.employment_types.length > 0 && (
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                  {facets.employment_types.map((typeItem) => {
                    const typeVal = asEmploymentType(typeItem.value);
                    if (!typeVal) return null;
                    const isSelected = filterQuery.employmentTypes?.includes(typeVal);
                    const typeLabel = t(`jobs.employmentTypes.${typeItem.value}`, { defaultValue: typeItem.value });
                    return (
                      <button
                        key={typeItem.value}
                        type="button"
                        aria-pressed={Boolean(isSelected)}
                        onClick={() => handleToggleEmploymentType(typeVal)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all tabular-nums",
                          isSelected
                            ? "bg-[#00AEEF] text-white border-[#00AEEF] shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {typeLabel} ({typeItem.count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Seniority / Experience level facet buttons */}
              {facets?.experience_levels && facets.experience_levels.length > 0 && (
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                  {facets.experience_levels.map((expItem) => {
                    const expVal = asExperienceLevel(expItem.value);
                    if (!expVal) return null;
                    const isSelected = filterQuery.experienceLevels?.includes(expVal);
                    const expLabel = t(`jobs.experienceLevels.${expItem.value}`, { defaultValue: expItem.value });
                    return (
                      <button
                        key={expItem.value}
                        type="button"
                        aria-pressed={Boolean(isSelected)}
                        onClick={() => handleToggleExperienceLevel(expVal)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all tabular-nums",
                          isSelected
                            ? "bg-[#00AEEF] text-white border-[#00AEEF] shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {expLabel} ({expItem.count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fit facet buttons */}
              {facets?.fit && facets.fit.length > 0 && (
                <div className="flex items-center gap-1">
                  {facets.fit.map((fitItem) => {
                    const fitVal = asFitVerdict(fitItem.value);
                    if (!fitVal) return null;
                    const isSelected = filterQuery.fit?.includes(fitVal);
                    const labelKey = fitItem.value === "safe_apply" ? "safe_apply" : fitItem.value === "stretch" ? "stretch" : "not_recommended";
                    const label = t(`jobs.fitFilter.${labelKey}`, { defaultValue: fitItem.value });
                    return (
                      <button
                        key={fitItem.value}
                        type="button"
                        aria-pressed={Boolean(isSelected)}
                        onClick={() => handleToggleFit(fitVal)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all tabular-nums",
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {label} ({fitItem.count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Salary-only toggle */}
              <button
                type="button"
                aria-pressed={Boolean(filterQuery.salaryOnly)}
                onClick={handleToggleSalaryOnly}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ml-1",
                  filterQuery.salaryOnly
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                )}
              >
                {t("jobs.salaryOnly", { defaultValue: "Có hiển thị mức lương" })}
              </button>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 ml-1"
                >
                  <X className="w-3 h-3" />
                  {t("jobs.clearFilters", { defaultValue: "Xóa bộ lọc" })}
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" />
                {t("jobs.sortLabel", { defaultValue: "Sắp xếp:" })}
              </span>
              <select
                aria-label={t("jobs.sortLabel", { defaultValue: "Sắp xếp" })}
                value={queryState.sort ?? "RECOMMENDED"}
                onChange={(e) => handleSetSort(asSortOption(e.target.value))}
                className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
              >
                <option value="RECOMMENDED">{t("jobs.sort.RECOMMENDED", { defaultValue: "Đề xuất tốt nhất" })}</option>
                <option value="SKILL_MATCH">{t("jobs.sort.SKILL_MATCH", { defaultValue: "Khớp kỹ năng" })}</option>
                <option value="NEWEST">{t("jobs.sort.NEWEST", { defaultValue: "Mới đăng" })}</option>
                <option value="SALARY_DESC" disabled={data?.data_quality?.salary_sort_supported === false}>
                  {t("jobs.sort.SALARY_DESC", { defaultValue: "Lương cao" })}
                </option>
              </select>
            </div>
          </div>

          {/* Mobile Filter Button & Drawer (< 1024px) */}
          <div className="lg:hidden flex items-center justify-between gap-2">
            <Sheet
              open={mobileFilterOpen}
              onOpenChange={(open) => {
                if (open) setMobileDraftQuery({ ...queryState, offset: 0 });
                setMobileFilterOpen(open);
              }}
            >
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs font-bold border-slate-200 bg-white">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#00AEEF]" />
                  <span>{t("jobs.filterTitle", { defaultValue: "Bộ lọc" })}</span>
                  {activeFilterCount > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-[#00AEEF] text-white text-[10px] font-mono flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
                <SheetHeader className="p-4 sm:p-6 pb-3 border-b border-slate-100 shrink-0 bg-white z-10">
                  <SheetTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                    <span>{t("jobs.filterTitle", { defaultValue: "Bộ lọc việc làm" })}</span>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        {t("jobs.clearFilters", { defaultValue: "Xóa bộ lọc" })}
                      </button>
                    )}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    {t("jobs.filterDescription", {
                      defaultValue:
                        "Chọn vai trò, địa điểm, hình thức làm việc và mức độ phù hợp trước khi áp dụng.",
                    })}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-left">
                  {/* Role Select */}
                  <div className="space-y-2">
                    <label htmlFor="job-role-filter-mobile" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {t("jobs.roleLabel", { defaultValue: "Vai trò" })}
                    </label>
                    <select
                      id="job-role-filter-mobile"
                      value={
                        mobileDraftQuery.role ??
                        data?.role_scope?.role_code ??
                        targetRole ??
                        (data?.role_scope?.source === "cv_target_missing" ? "" : "all")
                      }
                      onChange={(e) => handleSetRole(e.target.value)}
                      className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700"
                    >
                      {data?.role_scope?.source === "cv_target_missing" && (
                        <option value="" disabled>
                          {t("jobs.roleMissing", { defaultValue: "Chọn vai trò mục tiêu" })}
                        </option>
                      )}
                      <option value="all">{t("jobs.allRoles", { defaultValue: "Tất cả vai trò" })}</option>
                      {IT_ROLES.map((r) => (
                        <option key={r.code} value={r.code}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* City facet */}
                  {facets?.city_codes && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {t("jobs.cityLabel", { defaultValue: "Địa điểm" })}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {facets.city_codes.map((city) => {
                          const isSelected = filterQuery.cityCodes?.includes(city.value);
                          return (
                            <button
                              key={city.value}
                              type="button"
                              aria-pressed={Boolean(isSelected)}
                              onClick={() => handleToggleCity(city.value)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg border tabular-nums",
                                isSelected ? "bg-[#00AEEF] text-white border-[#00AEEF]" : "bg-slate-50 text-slate-700 border-slate-200"
                              )}
                            >
                              {city.value} ({city.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Work mode facet */}
                  {facets?.work_modes && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {t("jobs.workModeLabel", { defaultValue: "Hình thức làm việc" })}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {facets.work_modes.map((modeItem) => {
                          const modeVal = asWorkMode(modeItem.value);
                          if (!modeVal) return null;
                          const isSelected = filterQuery.workModes?.includes(modeVal);
                          const modeLabel = t(`jobs.workModes.${modeItem.value}`, { defaultValue: modeItem.value });
                          return (
                            <button
                              key={modeItem.value}
                              type="button"
                              aria-pressed={Boolean(isSelected)}
                              onClick={() => handleToggleWorkMode(modeVal)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg border tabular-nums",
                                isSelected ? "bg-[#00AEEF] text-white border-[#00AEEF]" : "bg-slate-50 text-slate-700 border-slate-200"
                              )}
                            >
                              {modeLabel} ({modeItem.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Employment type facet */}
                  {facets?.employment_types && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {t("jobs.employmentTypeLabel", { defaultValue: "Loại hình công việc" })}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {facets.employment_types.map((typeItem) => {
                          const typeVal = asEmploymentType(typeItem.value);
                          if (!typeVal) return null;
                          const isSelected = filterQuery.employmentTypes?.includes(typeVal);
                          const typeLabel = t(`jobs.employmentTypes.${typeItem.value}`, { defaultValue: typeItem.value });
                          return (
                            <button
                              key={typeItem.value}
                              type="button"
                              aria-pressed={Boolean(isSelected)}
                              onClick={() => handleToggleEmploymentType(typeVal)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg border tabular-nums",
                                isSelected ? "bg-[#00AEEF] text-white border-[#00AEEF]" : "bg-slate-50 text-slate-700 border-slate-200"
                              )}
                            >
                              {typeLabel} ({typeItem.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Seniority / Experience level facet */}
                  {facets?.experience_levels && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {t("jobs.experienceLevelLabel", { defaultValue: "Cấp bậc kinh nghiệm" })}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {facets.experience_levels.map((expItem) => {
                          const expVal = asExperienceLevel(expItem.value);
                          if (!expVal) return null;
                          const isSelected = filterQuery.experienceLevels?.includes(expVal);
                          const expLabel = t(`jobs.experienceLevels.${expItem.value}`, { defaultValue: expItem.value });
                          return (
                            <button
                              key={expItem.value}
                              type="button"
                              aria-pressed={Boolean(isSelected)}
                              onClick={() => handleToggleExperienceLevel(expVal)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg border tabular-nums",
                                isSelected ? "bg-[#00AEEF] text-white border-[#00AEEF]" : "bg-slate-50 text-slate-700 border-slate-200"
                              )}
                            >
                              {expLabel} ({expItem.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fit facet */}
                  {facets?.fit && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {t("jobs.fitLabel", { defaultValue: "Mức độ phù hợp" })}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {facets.fit.map((fitItem) => {
                          const fitVal = asFitVerdict(fitItem.value);
                          if (!fitVal) return null;
                          const isSelected = filterQuery.fit?.includes(fitVal);
                          const labelKey = fitItem.value === "safe_apply" ? "safe_apply" : fitItem.value === "stretch" ? "stretch" : "not_recommended";
                          const label = t(`jobs.fitFilter.${labelKey}`, { defaultValue: fitItem.value });
                          return (
                            <button
                              key={fitItem.value}
                              type="button"
                              aria-pressed={Boolean(isSelected)}
                              onClick={() => handleToggleFit(fitVal)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg border tabular-nums",
                                isSelected ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-700 border-slate-200"
                              )}
                            >
                              {label} ({fitItem.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Salary Only Toggle */}
                  <div className="pt-2">
                    <button
                      type="button"
                      aria-pressed={Boolean(filterQuery.salaryOnly)}
                      onClick={handleToggleSalaryOnly}
                      className={cn(
                        "w-full py-2.5 px-4 text-xs font-bold rounded-xl border text-center transition-all",
                        filterQuery.salaryOnly ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-700 border-slate-200"
                      )}
                    >
                      {t("jobs.salaryOnly", { defaultValue: "Có hiển thị mức lương" })}
                    </button>
                  </div>
                </div>

                <SheetFooter className="p-4 border-t border-slate-100 shrink-0 bg-white pb-[calc(16px+env(safe-area-inset-bottom))] shadow-md">
                  <SheetClose asChild>
                    <Button
                      onClick={() => {
                        setQueryState({ ...mobileDraftQuery, offset: 0, limit: 10 });
                        setAccumulatedRecs([]);
                      }}
                      className="w-full bg-[#00AEEF] hover:bg-[#049bd7] text-white font-bold text-sm h-11 rounded-xl"
                    >
                      {t("jobs.applyFilters", { defaultValue: "Áp dụng bộ lọc" })}
                    </Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            {/* Mobile Sort */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">{t("jobs.sortLabel", { defaultValue: "Sắp xếp:" })}</span>
              <select
                aria-label={t("jobs.sortLabel", { defaultValue: "Sắp xếp" })}
                value={queryState.sort ?? "RECOMMENDED"}
                onChange={(e) => handleSetSort(asSortOption(e.target.value))}
                className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              >
                <option value="RECOMMENDED">{t("jobs.sort.RECOMMENDED", { defaultValue: "Đề xuất tốt nhất" })}</option>
                <option value="SKILL_MATCH">{t("jobs.sort.SKILL_MATCH", { defaultValue: "Khớp kỹ năng" })}</option>
                <option value="NEWEST">{t("jobs.sort.NEWEST", { defaultValue: "Mới đăng" })}</option>
                <option value="SALARY_DESC" disabled={data?.data_quality?.salary_sort_supported === false}>
                  {t("jobs.sort.SALARY_DESC", { defaultValue: "Lương cao" })}
                </option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main List & Data States */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[280px] bg-slate-100 rounded-2xl" />)}
        </div>
      ) : quotaBlocked ? (
        <div className={cn(CARD, "flex flex-wrap items-center gap-x-3 gap-y-2 p-5")}>
          <AlertCircle className="w-4 h-4 shrink-0 text-[#956400]" />
          <p className="min-w-0 flex-1 text-[13px] text-[#2F3437]">{t("jobs.quotaBlocked")}</p>
          <Link
            to="/pricing"
            className="shrink-0 text-[13px] font-bold text-primary hover:underline"
          >
            {t("quota.upgradeCta")}
          </Link>
        </div>
      ) : isError ? (
        <div className={cn(CARD, "flex flex-wrap items-center gap-x-3 gap-y-2 p-5")}>
          <AlertCircle className="w-4 h-4 shrink-0 text-[#9F2F2D]" />
          <p className="min-w-0 flex-1 text-[13px] text-[#787774]">{t("jobs.error")}</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
            {t("jobs.retry")}
          </button>
        </div>
      ) : displayRecs.length === 0 ? (
        <div className={cn(CARD, "p-8 text-center space-y-3")}>
          <Briefcase className="w-8 h-8 text-[#B9B9B7] mx-auto" />
          <p className="text-[13px] text-[#787774] font-medium">
            {activeFilterCount > 0
              ? t("jobs.emptyFilter", { defaultValue: "Không có kết quả với bộ lọc này." })
              : t("jobs.emptyPool", { defaultValue: "Chưa có việc làm phù hợp cho vị trí này — thử đổi vị trí hoặc quay lại sau." })}
          </p>
          {activeFilterCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetFilters}
              className="rounded-full text-xs font-bold border-slate-200"
            >
              {t("jobs.clearFilters", { defaultValue: "Xóa bộ lọc" })}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Background refetch indicator */}
          {isRefetching && (
            <div className="h-1 w-full bg-[#00AEEF]/20 rounded-full overflow-hidden">
              <div className="h-full bg-[#00AEEF] animate-pulse w-2/3" />
            </div>
          )}

          {/* Job Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {displayRecs.map((job) => <JobCard key={job.job_id} job={job} t={t} />)}
          </div>

          {/* Accumulated Load More Pagination for Explorer */}
          {hasMore && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="sm"
                disabled={isRefetching}
                onClick={() =>
                  setQueryState((prev) => ({
                    ...prev,
                    offset: (data?.offset ?? prev.offset ?? 0) + (data?.limit ?? 10),
                  }))
                }
                className="rounded-full px-6 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50"
              >
                {isRefetching && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {t("jobs.loadMore", { defaultValue: "Tải thêm việc làm" })}
              </Button>
            </div>
          )}

          <p className="text-[11px] text-[#787774] mt-2.5 leading-relaxed">{t("jobs.disclaimer")}</p>
        </>
      )}
    </section>
  );
}
