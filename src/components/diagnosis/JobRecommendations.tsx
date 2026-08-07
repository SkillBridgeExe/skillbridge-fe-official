import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  Briefcase, MapPin, ExternalLink, Building2, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, RefreshCw, SlidersHorizontal, ArrowUpDown, X,
  CircleDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJobRecommendationsQuery } from "@/hooks/use-diagnosis";
import { matchScoreBand } from "@/lib/match-score-band";
import type { JobRecommendationDto, JobRecommendationsResponse } from "@shared/api";
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
import { getRoleLabel, IT_ROLES } from "@/constants/it-roles";


type WorkModeType = "ONSITE" | "HYBRID" | "REMOTE";
type ExperienceLevelType = "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD";
type EmploymentTypeVal = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
type FitVerdictType = "safe_apply" | "stretch" | "not_recommended";
type SortOptionType = "RECOMMENDED" | "SKILL_MATCH" | "NEWEST" | "SALARY_DESC";

const MARKETPLACE_ROLE_CODES = new Set(IT_ROLES.map((role) => role.code));

function normalizeMarketplaceRole(role: string | null | undefined): string | undefined {
  if (!role) return undefined;
  return role === "all" || MARKETPLACE_ROLE_CODES.has(role) ? role : "all";
}

function withSalaryCurrency(
  query: JobRecommendationsQuery,
): JobRecommendationsQuery {
  const hasSalaryBound = query.salaryMin != null || query.salaryMax != null;
  if (!hasSalaryBound || query.salaryCurrency) return query;
  return { ...query, salaryCurrency: "VND" };
}

function hasInvalidSalaryRange(query: JobRecommendationsQuery): boolean {
  return (
    query.salaryMin != null &&
    query.salaryMax != null &&
    query.salaryMin > query.salaryMax
  );
}

function countActiveFilters(query: JobRecommendationsQuery): number {
  return (
    (query.q?.trim() ? 1 : 0) +
    (query.cityCodes?.length ? 1 : 0) +
    (query.cityNames?.length ? 1 : 0) +
    (query.districtCodes?.length ? 1 : 0) +
    (query.sourceNames?.length ? 1 : 0) +
    (query.workModes?.length ? 1 : 0) +
    (query.experienceLevels?.length ? 1 : 0) +
    (query.employmentTypes?.length ? 1 : 0) +
    (query.fit?.length ? 1 : 0) +
    (query.role && query.role !== "all" ? 1 : 0) +
    (query.postedFrom ? 1 : 0) +
    (query.postedTo ? 1 : 0) +
    (query.salaryMin != null ? 1 : 0) +
    (query.salaryMax != null ? 1 : 0) +
    (query.salaryCurrency ? 1 : 0) +
    (query.salaryOnly ? 1 : 0)
  );
}

function localizedCity(value: string, t: ReturnType<typeof import("react-i18next").useTranslation>["t"]): string {
  const translated = t(`jobs.cities.${value}`, { defaultValue: "" });
  // If i18n has a real label, use it; otherwise fall back to unknownLocation
  // so the user never sees a raw technical code like "HAN" or "HCM".
  return translated || t("jobs.unknownLocation");
}

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

/**
 * Keep the visible default list aligned with the score shown on each card.
 * The BE owns ranking, but this presentation guard also keeps accumulated
 * pagination rows honest while an older API revision is still serving data.
 */
export function sortRecommendedJobsForDisplay(
  recommendations: JobRecommendationDto[],
): JobRecommendationDto[] {
  const visibleScore = (job: JobRecommendationDto): number => {
    const score = job.recommendation_score ?? job.match_score;
    return Number.isFinite(score) ? score : Number.NEGATIVE_INFINITY;
  };

  return [...recommendations].sort(
    (a, b) =>
      visibleScore(b) - visibleScore(a) ||
      b.match_score - a.match_score ||
      a.rank - b.rank ||
      a.job_id.localeCompare(b.job_id),
  );
}

/* Moat L2 — top job thật khớp CV (GET /api/cvs/:cvId/job-recommendations).
   §0b design spec: card trắng + border #EAEAEA, pastel theo band, số mono, không gradient. */
const CARD = "bg-white border border-slate-200 rounded-lg shadow-sm transition-colors duration-200 hover:border-slate-300 flex flex-col overflow-hidden";

/** Band màu cho match % — CÙNG thang 80/60 với màn compare (một con số, một màu). */
function matchBand(score: number): string {
  return matchScoreBand(score).chip;
}

/** VND → "tr" (triệu), ngoại tệ → số + mã. null cả hai → null (ẩn). */
function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
  period: "MONTH" | "YEAR" | null,
  t: ReturnType<typeof import("react-i18next").useTranslation>["t"],
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => (currency === "VND" ? `${Math.round(n / 1_000_000)}` : n.toLocaleString());
  const unit = currency === "VND" ? "tr" : ` ${currency}`;
  const periodLabel = period ? t(`jobs.salaryPeriods.${period}`, { defaultValue: period === "MONTH" ? "/month" : "/year" }) : "";
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}${unit}${periodLabel}`;
  return `${fmt((min ?? max) as number)}${unit}${periodLabel}`;
}

type PriorityGap = {
  key: string;
  label: string;
  kind: "missing" | "partial";
};

/** One compact, deterministic queue: hard missing requirements before partial gaps. */
function priorityGaps(job: JobRecommendationDto): PriorityGap[] {
  const seen = new Set<string>();
  const result: PriorityGap[] = [];
  const add = (label: string, key: string, kind: PriorityGap["kind"]) => {
    const normalized = (key || label).trim().toLocaleLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push({ key: normalized, label, kind });
  };

  for (const skill of job.missing_skills ?? []) {
    add(skill.display_name, skill.display_name, "missing");
  }
  for (const skill of job.partial_skills ?? []) {
    add(skill.display_name, skill.canonical_name ?? skill.display_name, "partial");
  }
  return result;
}

function JobMarketSummary({
  data,
  t,
}: {
  data: JobRecommendationsResponse;
  t: ReturnType<typeof import("react-i18next").useTranslation>["t"];
}) {
  const { total, facets, role_scope, pool_size, eligible_pool_size } = data;
  const finalTotal = total ?? eligible_pool_size ?? pool_size ?? 0;

  const roleCode = role_scope?.role_code;
  const roleName = roleCode
    ? t(`jobs.roles.${roleCode}`, { defaultValue: getRoleLabel(roleCode) })
    : t("jobs.allRoles");

  type FacetBucket = { value: string; count: number };

  // Find top location (most jobs)
  const topLocation = facets?.city_names && facets.city_names.length > 0
    ? facets.city_names.reduce((prev: FacetBucket, current: FacetBucket) => (prev.count > current.count) ? prev : current, facets.city_names[0])
    : undefined;

  const cityName = topLocation?.value ?? null;

  // Find top work mode
  const topWorkMode = facets?.work_modes && facets.work_modes.length > 0
    ? facets.work_modes.reduce((prev: FacetBucket, current: FacetBucket) => (prev.count > current.count) ? prev : current, facets.work_modes[0])
    : undefined;

  const safeFit = facets?.fit?.find((f: FacetBucket) => f.value === "safe_apply");

  return (
    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 sm:p-5 flex flex-wrap gap-x-8 gap-y-4 items-center">
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("jobs.marketSummary.totalJobs")}</span>
        <span className="text-xl font-bold text-slate-900">{finalTotal}</span>
      </div>

      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("jobs.marketSummary.roleAnalyzed")}</span>
        <span className="text-sm font-bold text-sky-600 flex items-center gap-1.5 mt-1">
          <Briefcase className="w-3.5 h-3.5" />
          {roleName}
        </span>
      </div>

      {topLocation && (
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("jobs.marketSummary.topLocation")}</span>
          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            {cityName} <span className="text-slate-500 text-xs font-mono ml-0.5">({topLocation.count})</span>
          </span>
        </div>
      )}

      {topWorkMode && (
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("jobs.marketSummary.topWorkMode")}</span>
          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-1">
            <Building2 className="w-3.5 h-3.5 text-emerald-500" />
            {t(`jobs.workModes.${topWorkMode.value}`, { defaultValue: topWorkMode.value })} <span className="text-slate-500 text-xs font-mono ml-0.5">({topWorkMode.count})</span>
          </span>
        </div>
      )}

      {safeFit && (
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("jobs.marketSummary.safeFit")}</span>
          <span className="text-[13px] font-bold text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {safeFit.count} {t("jobs.marketSummary.positions")}
          </span>
        </div>
      )}
    </div>
  );
}

function formatLocationDisplay(loc: import("@shared/api").JobLocationDisplay, t: ReturnType<typeof import("react-i18next").useTranslation>["t"]): string | null {
  const parts: string[] = [];
  if (loc.address_line?.trim()) parts.push(loc.address_line.trim());
  if (loc.district_name?.trim()) parts.push(loc.district_name.trim());
  if (loc.city_name?.trim()) {
    parts.push(loc.city_name.trim());
  } else if (loc.city_code?.trim()) {
    const city = loc.city_name?.trim() || localizedCity(loc.city_code.trim(), t);
    if (city && city !== "null") parts.push(city);
  }

  const uniqueParts = parts.filter((val, idx, arr) =>
    arr.findIndex(v => v.toLowerCase() === val.toLowerCase()) === idx
  );

  return uniqueParts.join(", ") || null;
}

function JobLocationsBadge({ locations, fallbackLocation, t }: { locations?: import("@shared/api").JobLocationDisplay[], fallbackLocation: string | null, t: ReturnType<typeof import("react-i18next").useTranslation>["t"] }) {
  if (!locations || locations.length === 0) {
    const text = fallbackLocation || t("jobs.unknownLocation");
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{text}</span>
      </span>
    );
  }

  const primary = locations.find((l) => l.is_primary) || locations[0];
  const formatted = formatLocationDisplay(primary, t);
  const primaryText = formatted || fallbackLocation || t("jobs.unknownLocation");

  if (locations.length === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0" title={primaryText}>
        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{primaryText}</span>
      </span>
    );
  }

  return (
    <InfoPopover
      align="left"
      label={t("jobs.multipleLocations")}
      trigger={
        <span className="inline-flex items-center gap-1.5 min-w-0 cursor-pointer hover:text-slate-900 transition-colors">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-sky-500" />
          <span className="truncate underline decoration-dotted underline-offset-2">{locations.length} {t("jobs.locationsCount")}</span>
        </span>
      }
    >
      <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {locations.map((loc, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
            <MapPin className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", loc.is_primary ? "text-sky-500" : "text-slate-400")} />
            <span>{formatLocationDisplay(loc, t) || t("jobs.unknownLocation")}</span>
          </li>
        ))}
      </ul>
    </InfoPopover>
  );
}

function JobCard({
  job,
  t,
  showRank,
  displayRank,
}: {
  job: JobRecommendationDto;
  t: ReturnType<typeof import("react-i18next").useTranslation>["t"];
  showRank?: boolean;
  displayRank?: number;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const salary = job.salary_visible === false
    ? null
    : formatSalary(job.salary_min, job.salary_max, job.currency, job.salary_period, t);

  const recScore = job.recommendation_score ?? job.match_score;
  const matchScoreVal = job.match_score;
  const demoted = typeof matchScoreVal === "number" && recScore < matchScoreVal;
  const severe = job.severe_stretch === true;
  const visibleRank = typeof displayRank === "number" ? displayRank : null;
  const top1LabelKey = job.fit?.verdict === "safe_apply"
    ? "jobs.top1Label"
    : "jobs.top1ScoreLabel";

  const gaps = priorityGaps(job);
  const visibleGaps = gaps.slice(0, 3);
  const remainingGapCount = Math.max(0, gaps.length - visibleGaps.length);
  const strengths = (job.matched_skills ?? []).slice(0, 2);
  const breakdown = job.scoring_breakdown;
  const experienceFit = job.experience_fit?.verdict && job.experience_fit.verdict !== "unknown" ? job.experience_fit : null;
  const fitClass = experienceFit?.verdict === "fits"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : experienceFit?.verdict === "stretch"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-500 border-slate-200";

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
    <article className={cn(CARD, "relative")}>
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {showRank && visibleRank !== null && Number.isInteger(visibleRank) && visibleRank >= 1 && visibleRank <= 3 && (
              <div className="mb-2">
                <InfoPopover
                  align="left"
                  label={t("jobs.rankLabel")}
                  trigger={
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold",
                      visibleRank === 1 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      Top {visibleRank}{visibleRank === 1 ? ` - ${t(top1LabelKey)}` : ""}
                    </span>
                  }
                >
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t("jobs.rankDescription")}
                  </p>
                </InfoPopover>
              </div>
            )}
            <h4 className="text-base font-bold text-slate-950 leading-snug line-clamp-2">
              {job.title}
            </h4>
            <span className="flex items-center gap-1.5 mt-1.5 min-w-0 font-medium text-xs text-slate-600">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{job.company_name}</span>
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t("jobs.recommendationScore")}
            </span>
            {job.seniority_factor && job.seniority_factor < 1 ? (
              <InfoPopover
                align="right"
                label={t("jobs.seniorityLabel", { defaultValue: "Vì sao điểm bị điều chỉnh" })}
                trigger={
                  <span className={cn("mt-1 inline-flex text-sm font-bold font-mono tabular-nums px-2.5 py-1 rounded-md border underline decoration-dotted underline-offset-2", matchBand(recScore))}>
                    {recScore}/100
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
              <span className={cn("mt-1 inline-flex text-sm font-bold font-mono tabular-nums px-2.5 py-1 rounded-md border", matchBand(recScore))}>
                {recScore}/100
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
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
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-slate-600">
            <span>{t("jobs.skillMatchLabel")}</span>
            <strong className="font-mono tabular-nums text-slate-900">{matchScoreVal}/100</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[11px] text-slate-600 font-medium">
          <JobLocationsBadge locations={job.locations} fallbackLocation={job.location} t={t} />
          {workModeLabel && (
            <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />{workModeLabel}</span>
          )}
          {experienceLevelLabel && (
            <span>{experienceLevelLabel}</span>
          )}
          {employmentTypeLabel && (
            <span>{employmentTypeLabel}</span>
          )}
          {salary && (
            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-slate-800 font-semibold">
              <CircleDollarSign className="w-3.5 h-3.5 text-slate-400" />
              {salary}
            </span>
          )}
        </div>

        {(strengths.length > 0 || visibleGaps.length > 0) && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {strengths.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("jobs.strengths")}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {strengths.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {visibleGaps.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("jobs.actionableGaps")}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {visibleGaps.map((gap) => (
                    <span key={`${gap.kind}-${gap.key}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">
                      <span className={cn("h-1.5 w-1.5 rounded-full", gap.kind === "missing" ? "bg-rose-500" : "bg-amber-500")} />{gap.label}
                    </span>
                  ))}
                  {remainingGapCount > 0 && (
                    <span className="inline-flex items-center px-1.5 text-[10px] font-medium text-slate-500">
                      {t("jobs.moreGaps", { count: remainingGapCount })}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 p-4 mt-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
                  <div className="mt-2.5 grid grid-cols-2 gap-y-2 gap-x-3 text-[10px] font-medium text-slate-600 bg-white p-3 rounded-md border border-slate-200">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{t("results.matched")}: {breakdown.matched_count}</span>
                    <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-600" />{t("results.partial")}: {breakdown.partial_count}</span>
                    <span className="flex items-center gap-1.5 ml-5">{t("results.missing")}: {breakdown.missing_count}</span>
                    <span className="flex items-center gap-1.5 ml-5 font-mono text-slate-400">{t("matchDepth.coverage")}: {breakdown.required_met}/{breakdown.required_total}</span>
                    {job.score_basis && <span className="col-span-2 text-slate-500">{t(`jobs.scoreBasis.${job.score_basis}`)}</span>}
                    {breakdown.cap_applied && <span className="col-span-2 text-amber-700 bg-amber-50 px-2 py-1 rounded-md mt-1">{t("matchDepth.capped")}</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {job.source_url ? (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
                job.fit?.verdict === "not_recommended"
                  ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  : "bg-blue-600 text-white hover:bg-blue-700",
              )}
            >
              {t(job.fit?.verdict === "not_recommended" ? "jobs.viewDescription" : job.fit?.verdict === "stretch" ? "jobs.viewOpportunity" : "jobs.apply")}
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
    </article>
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
  const roleOptions = IT_ROLES.map((role) => ({
    code: role.code,
    label: t(`jobs.roles.${role.code}`, { defaultValue: role.label }),
  }));
  const normalizedTargetRole = normalizeMarketplaceRole(targetRole);

  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [stateCvId, setStateCvId] = useState(cvId);
  const [queryState, setQueryState] = useState<JobRecommendationsQuery>({
    limit: 5,
    offset: 0,
    sort: "RECOMMENDED",
  });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [desktopAdvancedOpen, setDesktopAdvancedOpen] = useState(false);
  const [mobileDraftQuery, setMobileDraftQuery] = useState<JobRecommendationsQuery>(queryState);
  const [searchInput, setSearchInput] = useState(queryState.q || "");
  const [accumulatedRecs, setAccumulatedRecs] = useState<JobRecommendationDto[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (isExplorerOpen) {
        setQueryState(p => {
          if (p.q === searchInput) return p;
          setAccumulatedRecs([]);
          return { ...p, q: searchInput || undefined, offset: 0 };
        });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, isExplorerOpen]);
  const cvChanged = stateCvId !== cvId;

  const activeQuery = useMemo(() => {
    if (cvChanged) {
      return {
        limit: 5,
        offset: 0,
        sort: "RECOMMENDED" as const,
        ...(normalizedTargetRole ? { role: normalizedTargetRole } : {}),
      };
    }
    const role = normalizeMarketplaceRole(queryState.role ?? normalizedTargetRole);
    const query = isExplorerOpen
      ? { ...queryState, ...(role ? { role } : {}), limit: 10 }
      : {
          limit: 5,
          offset: 0,
          sort: "RECOMMENDED" as const,
          ...(role ? { role } : {})
        };
    return withSalaryCurrency(query);
  }, [cvChanged, isExplorerOpen, normalizedTargetRole, queryState]);

  const salaryRangeInvalid = hasInvalidSalaryRange(activeQuery);

  const { data, isLoading, isError, error, refetch, isRefetching } = useJobRecommendationsQuery(
    salaryRangeInvalid ? null : cvId,
    activeQuery,
  );

  const rawRecs = useMemo(() => data?.recommendations ?? [], [data?.recommendations]);
  const total = data?.total ?? data?.eligible_pool_size ?? data?.pool_size ?? rawRecs.length;
  const facets = data?.facets;
  const lastPageCount = rawRecs.length;
  const loadedThrough = (data?.offset ?? activeQuery.offset ?? 0) + lastPageCount;
  const hasMore = isExplorerOpen && lastPageCount > 0 && loadedThrough < total;
  // W-LOCATION-FILTER-PRODUCTION-FE-AGY: ALWAYS show explorer button even if total <= 5
  const filterQuery = mobileFilterOpen ? mobileDraftQuery : queryState;
  const mobileSalaryRangeInvalid = hasInvalidSalaryRange(mobileDraftQuery);

  useEffect(() => {
    setStateCvId(cvId);
    setIsExplorerOpen(false);
    setMobileFilterOpen(false);
    setQueryState({ limit: 5, offset: 0, sort: "RECOMMENDED" });
    setMobileDraftQuery({ limit: 5, offset: 0, sort: "RECOMMENDED" });
    setAccumulatedRecs([]);
    setSearchInput("");
  }, [cvId]);

  // Capture snapshot token exactly once per snapshot
  useEffect(() => {
    if (data?.generation?.snapshot_token && !queryState.snapshotToken) {
      const token = data.generation.snapshot_token;
      setQueryState(prev => ({ ...prev, snapshotToken: token }));
      setMobileDraftQuery(prev => ({ ...prev, snapshotToken: token }));
    }
  }, [data?.generation?.snapshot_token, queryState.snapshotToken]);

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

  const displayRecs = useMemo(() => {
    const source = isExplorerOpen && accumulatedRecs.length > 0 ? accumulatedRecs : rawRecs;
    return (activeQuery.sort ?? "RECOMMENDED") === "RECOMMENDED"
      ? sortRecommendedJobsForDisplay(source)
      : source;
  }, [activeQuery.sort, accumulatedRecs, isExplorerOpen, rawRecs]);

  const isPaginationRequest =
    isExplorerOpen &&
    (activeQuery.offset ?? 0) > 0 &&
    accumulatedRecs.length > 0;
  const isLoadingMore = isPaginationRequest && isLoading;
  const isLoadMoreError = isPaginationRequest && isError;

  if (!cvId) return null;

  const errorStatus = isAxiosError(error)
    ? error.response?.status
    : error && typeof error === "object"
      ? (error as { status?: number }).status
      : undefined;
  const quotaBlocked = errorStatus === 402;

  const handleRetryRecommendations = () => {
    if (errorStatus === 410 && queryState.snapshotToken) {
      setQueryState((prev) => {
        const { snapshotToken: _, ...rest } = prev;
        return { ...rest, offset: 0 };
      });
      setMobileDraftQuery((prev) => {
        const { snapshotToken: _, ...rest } = prev;
        return { ...rest, offset: 0 };
      });
      setAccumulatedRecs([]);
      return;
    }
    refetch();
  };

  const activeFilterCount = countActiveFilters(queryState);
  const draftFilterCount = countActiveFilters(mobileDraftQuery);

  const fitCounts = facets?.fit ?? [];
  const hasSafeJobs = fitCounts.some((item) => item.value === "safe_apply" && item.count > 0);
  const hasStretchJobs = fitCounts.some((item) => item.value === "stretch" && item.count > 0);
  const resultHeadingKey = hasSafeJobs
    ? "jobs.headingSafe"
    : hasStretchJobs
      ? "jobs.headingStretch"
      : fitCounts.length > 0
        ? "jobs.headingClosest"
        : isExplorerOpen
          ? "jobs.explorerTitle"
          : "jobs.top5Title";

  const handleResetFilters = () => {
    if (mobileFilterOpen) {
      setMobileDraftQuery((prev) => ({
        limit: 10,
        offset: 0,
        sort: "RECOMMENDED",
        snapshotToken: prev.snapshotToken,
      }));
      setSearchInput("");
      return;
    }
    setQueryState((prev) => ({
      limit: 10,
      offset: 0,
      sort: "RECOMMENDED",
      snapshotToken: prev.snapshotToken,
    }));
    setAccumulatedRecs([]);
    setSearchInput("");
  };

  const updateFilterQuery = (
    updater: (previous: JobRecommendationsQuery) => JobRecommendationsQuery,
  ) => {
    if (mobileFilterOpen) {
      setMobileDraftQuery((prev) => {
        const next = updater(prev);
        return { ...next };
      });
      return;
    }
    setQueryState((prev) => {
      const next = updater(prev);
      return { ...next };
    });
    setAccumulatedRecs([]);
  };

  const handleSetRole = (roleCode: string) => {
    updateFilterQuery((prev) => ({
      ...prev,
      role: roleCode,
      offset: 0,
    }));
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

      {/* Market Summary Block */}
      {!isLoading && !quotaBlocked && !isError && data && (
        <JobMarketSummary data={data} t={t} />
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t(resultHeadingKey)}
            </h3>
            {total > 0 && (
              <p className="text-[11px] text-slate-500">
                {t("jobs.totalMatching", { count: total, defaultValue: `Tìm thấy ${total} vị trí trong kho dữ liệu` })}
              </p>
            )}
          </div>
        </div>

        {/* View All / Show Top 5 toggle button */}
        {!isLoading && !quotaBlocked && !isError && (
          <Button
            size="sm"
            variant={isExplorerOpen ? "outline" : "default"}
            onClick={() => {
              setIsExplorerOpen((v) => !v);
              setQueryState((prev) => ({ limit: isExplorerOpen ? 5 : 10, offset: 0, sort: "RECOMMENDED", snapshotToken: prev.snapshotToken }));
              setAccumulatedRecs([]);
            }}
            className={cn(
              "rounded-full text-xs font-bold shrink-0 gap-1.5 h-8 px-4 transition-all",
              !isExplorerOpen
                ? "bg-sky-500 hover:bg-sky-600 text-white border-0"
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


              {/* Search Input */}
              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
                <input
                  type="text"
                  placeholder={t("jobs.searchPlaceholder", { defaultValue: "Tìm kiếm..." })}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 w-40"
                />
              </div>

              {/* Role Select Dropdown */}
              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
                <span className="text-xs font-semibold text-slate-600">{t("jobs.roleLabel", { defaultValue: "Vai trò:" })}</span>
                <select
                  id="job-role-filter-desktop"
                  aria-label={t("jobs.roleLabel", { defaultValue: "Vai trò" })}
                  value={
                    filterQuery.role ??
                    data?.role_scope?.role_code ??
                    normalizedTargetRole ??
                    (data?.role_scope?.source === "cv_target_missing" ? "" : "all")
                  }
                  onChange={(e) => handleSetRole(e.target.value)}
                  className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {data?.role_scope?.source === "cv_target_missing" && (
                    <option value="" disabled>
                      {t("jobs.roleMissing", { defaultValue: "Chọn vai trò mục tiêu" })}
                    </option>
                  )}
                  <option value="all">{t("jobs.allRoles", { defaultValue: "Tất cả vai trò" })}</option>
                  {roleOptions.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </div>


              {/* District facet buttons */}
              {facets?.district_codes && facets.district_codes.length > 0 && (
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                  <span className="text-xs font-semibold text-slate-600">{t("jobs.districtFilter", { defaultValue: "Quận/Huyện" })}:</span>
                  {facets.district_codes.map((district) => {
                    const isSelected = filterQuery.districtCodes?.includes(district.value);
                    return (
                      <button
                        key={district.value}
                        type="button"
                        aria-pressed={Boolean(isSelected)}
                        onClick={() => updateFilterQuery(prev => {
                          const current = prev.districtCodes ?? [];
                          const updated = current.includes(district.value) ? current.filter(c => c !== district.value) : [...current, district.value];
                          return { ...prev, districtCodes: updated.length ? updated : undefined, offset: 0 };
                        })}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all tabular-nums ${isSelected ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {district.value} ({district.count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Source facet buttons */}
              {facets?.source_names && facets.source_names.length > 0 && (
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                  <span className="text-xs font-semibold text-slate-600">{t("jobs.sourceFilter", { defaultValue: "Nguồn" })}:</span>
                  {facets.source_names.map((source) => {
                    const isSelected = filterQuery.sourceNames?.includes(source.value);
                    return (
                      <button
                        key={source.value}
                        type="button"
                        aria-pressed={Boolean(isSelected)}
                        onClick={() => updateFilterQuery(prev => {
                          const current = prev.sourceNames ?? [];
                          const updated = current.includes(source.value) ? current.filter(c => c !== source.value) : [...current, source.value];
                          return { ...prev, sourceNames: updated.length ? updated : undefined, offset: 0 };
                        })}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all tabular-nums ${isSelected ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {source.value} ({source.count})
                      </button>
                    );
                  })}
                </div>
              )}
              {/* City facet buttons */}
              {facets?.city_names && facets.city_names.length > 0 && (
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                  {facets.city_names.map((city) => {
                    const isSelected = filterQuery.cityNames?.includes(city.value);
                    return (
                      <button
                        key={city.value}
                        type="button"
                        aria-pressed={Boolean(isSelected)}
                        onClick={() => updateFilterQuery(prev => { const current = prev.cityNames ?? []; const updated = current.includes(city.value) ? current.filter(c => c !== city.value) : [...current, city.value]; return { ...prev, cityNames: updated.length ? updated : undefined, offset: 0 }; })}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all tabular-nums",
                          isSelected
                            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
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
                            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {modeLabel} ({modeItem.count})
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                aria-expanded={desktopAdvancedOpen}
                onClick={() => setDesktopAdvancedOpen((open) => !open)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {t("jobs.advancedFilters")}
                {activeFilterCount > 0 && <span className="font-mono text-sky-700">{activeFilterCount}</span>}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", desktopAdvancedOpen && "rotate-180")} />
              </button>

              {desktopAdvancedOpen && (<>
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
                            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
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
                            ? "bg-sky-500 text-white border-sky-500 shadow-sm"
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

              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {t("jobs.dateFrom", { defaultValue: "Đăng từ ngày" })}
                  <input
                    type="date"
                    value={filterQuery.postedFrom ?? ""}
                    onChange={(event) => updateFilterQuery((prev) => ({ ...prev, postedFrom: event.target.value || undefined, offset: 0 }))}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  />
                </label>
                <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {t("jobs.dateTo", { defaultValue: "Đăng đến ngày" })}
                  <input
                    type="date"
                    value={filterQuery.postedTo ?? ""}
                    onChange={(event) => updateFilterQuery((prev) => ({ ...prev, postedTo: event.target.value || undefined, offset: 0 }))}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  />
                </label>
                <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {t("jobs.salaryMin", { defaultValue: "Lương tối thiểu" })}
                  <input
                    type="number"
                    min={0}
                    value={filterQuery.salaryMin ?? ""}
                    onChange={(event) =>
                      updateFilterQuery((prev) =>
                        withSalaryCurrency({
                          ...prev,
                          salaryMin: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                          offset: 0,
                        }),
                      )
                    }
                    className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  />
                </label>
                <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {t("jobs.salaryMax", { defaultValue: "Lương tối đa" })}
                  <input
                    type="number"
                    min={0}
                    value={filterQuery.salaryMax ?? ""}
                    onChange={(event) =>
                      updateFilterQuery((prev) =>
                        withSalaryCurrency({
                          ...prev,
                          salaryMax: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                          offset: 0,
                        }),
                      )
                    }
                    className="w-28 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  />
                </label>
                <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {t("jobs.salaryCurrency", { defaultValue: "Đơn vị tiền tệ" })}
                  <select
                    value={filterQuery.salaryCurrency ?? ""}
                    onChange={(event) =>
                      updateFilterQuery((prev) =>
                        withSalaryCurrency({
                          ...prev,
                          salaryCurrency: event.target.value || undefined,
                          offset: 0,
                        }),
                      )
                    }
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  >
                    <option value="">--</option>
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                {salaryRangeInvalid && (
                  <p className="w-full text-xs font-semibold text-rose-600" role="alert">
                    {t("jobs.salaryRangeError", {
                      defaultValue: "Lương tối thiểu không được lớn hơn lương tối đa",
                    })}
                  </p>
                )}
              </div>

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

              </>)}

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
                className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t("jobs.filterTitle", { defaultValue: "Bộ lọc" })}</span>
                  {draftFilterCount > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-mono flex items-center justify-center">
                      {draftFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
                <SheetHeader className="p-4 sm:p-6 pb-3 border-b border-slate-100 shrink-0 bg-white z-10">
                  <SheetTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                    <span>{t("jobs.filterTitle", { defaultValue: "Bộ lọc việc làm" })}</span>
                    {draftFilterCount > 0 && (
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
                        normalizedTargetRole ??
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
                      {roleOptions.map((r) => (
                        <option key={r.code} value={r.code}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="job-search-mobile" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {t("jobs.searchPlaceholder", { defaultValue: "Tìm kiếm việc làm" })}
                    </label>
                    <input
                      id="job-search-mobile"
                      type="search"
                      value={mobileDraftQuery.q ?? ""}
                      onChange={(event) => setMobileDraftQuery((prev) => ({ ...prev, q: event.target.value || undefined, offset: 0 }))}
                      placeholder={t("jobs.searchPlaceholder", { defaultValue: "Tìm kiếm việc làm" })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  {/* City facet */}
                  {facets?.city_names && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {t("jobs.cityLabel", { defaultValue: "Địa điểm" })}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {facets.city_names.map((city) => {
                          const isSelected = mobileDraftQuery.cityNames?.includes(city.value);
                          return (
                            <button
                              key={city.value}
                              type="button"
                              aria-pressed={Boolean(isSelected)}
                              onClick={() => updateFilterQuery(prev => { const current = prev.cityNames ?? []; const updated = current.includes(city.value) ? current.filter(c => c !== city.value) : [...current, city.value]; return { ...prev, cityNames: updated.length ? updated : undefined, offset: 0 }; })}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg border tabular-nums",
                                isSelected ? "bg-sky-500 text-white border-sky-500" : "bg-slate-50 text-slate-700 border-slate-200"
                              )}
                            >
                              {city.value} ({city.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {facets?.district_codes && facets.district_codes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {t("jobs.districtFilter", { defaultValue: "Quận/Huyện" })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {facets.district_codes.map((district) => {
                          const selected = mobileDraftQuery.districtCodes?.includes(district.value);
                          return (
                            <button
                              key={district.value}
                              type="button"
                              aria-pressed={Boolean(selected)}
                              onClick={() => updateFilterQuery((prev) => {
                                const current = prev.districtCodes ?? [];
                                const next = current.includes(district.value) ? current.filter((item) => item !== district.value) : [...current, district.value];
                                return { ...prev, districtCodes: next.length ? next : undefined, offset: 0 };
                              })}
                              className={cn("rounded-lg border px-3 py-1.5 text-xs font-bold", selected ? "border-sky-500 bg-sky-500 text-white" : "border-slate-200 bg-slate-50 text-slate-700")}
                            >
                              {district.value} ({district.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {facets?.source_names && facets.source_names.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {t("jobs.sourceFilter", { defaultValue: "Nguồn tuyển dụng" })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {facets.source_names.map((source) => {
                          const selected = mobileDraftQuery.sourceNames?.includes(source.value);
                          return (
                            <button
                              key={source.value}
                              type="button"
                              aria-pressed={Boolean(selected)}
                              onClick={() => updateFilterQuery((prev) => {
                                const current = prev.sourceNames ?? [];
                                const next = current.includes(source.value) ? current.filter((item) => item !== source.value) : [...current, source.value];
                                return { ...prev, sourceNames: next.length ? next : undefined, offset: 0 };
                              })}
                              className={cn("rounded-lg border px-3 py-1.5 text-xs font-bold", selected ? "border-sky-500 bg-sky-500 text-white" : "border-slate-200 bg-slate-50 text-slate-700")}
                            >
                              {source.value} ({source.count})
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
                          const isSelected = mobileDraftQuery.workModes?.includes(modeVal);
                          const modeLabel = t(`jobs.workModes.${modeItem.value}`, { defaultValue: modeItem.value });
                          return (
                            <button
                              key={modeItem.value}
                              type="button"
                              aria-pressed={Boolean(isSelected)}
                              onClick={() => handleToggleWorkMode(modeVal)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg border tabular-nums",
                                isSelected ? "bg-sky-500 text-white border-sky-500" : "bg-slate-50 text-slate-700 border-slate-200"
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
                          const isSelected = mobileDraftQuery.employmentTypes?.includes(typeVal);
                          const typeLabel = t(`jobs.employmentTypes.${typeItem.value}`, { defaultValue: typeItem.value });
                          return (
                            <button
                              key={typeItem.value}
                              type="button"
                              aria-pressed={Boolean(isSelected)}
                              onClick={() => handleToggleEmploymentType(typeVal)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg border tabular-nums",
                                isSelected ? "bg-sky-500 text-white border-sky-500" : "bg-slate-50 text-slate-700 border-slate-200"
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
                          const isSelected = mobileDraftQuery.experienceLevels?.includes(expVal);
                          const expLabel = t(`jobs.experienceLevels.${expItem.value}`, { defaultValue: expItem.value });
                          return (
                            <button
                              key={expItem.value}
                              type="button"
                              aria-pressed={Boolean(isSelected)}
                              onClick={() => handleToggleExperienceLevel(expVal)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg border tabular-nums",
                                isSelected ? "bg-sky-500 text-white border-sky-500" : "bg-slate-50 text-slate-700 border-slate-200"
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
                          const isSelected = mobileDraftQuery.fit?.includes(fitVal);
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

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {t("jobs.dateRange", { defaultValue: "Thời gian đăng" })}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1 text-xs font-semibold text-slate-600">
                        {t("jobs.dateFrom", { defaultValue: "Đăng từ ngày" })}
                        <input type="date" value={mobileDraftQuery.postedFrom ?? ""} onChange={(event) => setMobileDraftQuery((prev) => ({ ...prev, postedFrom: event.target.value || undefined, offset: 0 }))} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" />
                      </label>
                      <label className="grid gap-1 text-xs font-semibold text-slate-600">
                        {t("jobs.dateTo", { defaultValue: "Đăng đến ngày" })}
                        <input type="date" value={mobileDraftQuery.postedTo ?? ""} onChange={(event) => setMobileDraftQuery((prev) => ({ ...prev, postedTo: event.target.value || undefined, offset: 0 }))} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" />
                      </label>
                    </div>
                    <p className="pt-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                      {t("jobs.salaryRange", { defaultValue: "Khoảng lương" })}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1 text-xs font-semibold text-slate-600">
                        {t("jobs.salaryMin", { defaultValue: "Lương tối thiểu" })}
                        <input
                          type="number"
                          min={0}
                          value={mobileDraftQuery.salaryMin ?? ""}
                          onChange={(event) =>
                            setMobileDraftQuery((prev) =>
                              withSalaryCurrency({
                                ...prev,
                                salaryMin: event.target.value
                                  ? Number(event.target.value)
                                  : undefined,
                                offset: 0,
                              }),
                            )
                          }
                          className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-semibold text-slate-600">
                        {t("jobs.salaryMax", { defaultValue: "Lương tối đa" })}
                        <input
                          type="number"
                          min={0}
                          value={mobileDraftQuery.salaryMax ?? ""}
                          onChange={(event) =>
                            setMobileDraftQuery((prev) =>
                              withSalaryCurrency({
                                ...prev,
                                salaryMax: event.target.value
                                  ? Number(event.target.value)
                                  : undefined,
                                offset: 0,
                              }),
                            )
                          }
                          className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                        />
                      </label>
                    </div>
                    <label className="grid gap-1 text-xs font-semibold text-slate-600">
                      {t("jobs.salaryCurrency", { defaultValue: "Đơn vị tiền tệ" })}
                      <select
                        value={mobileDraftQuery.salaryCurrency ?? ""}
                        onChange={(event) =>
                          setMobileDraftQuery((prev) =>
                            withSalaryCurrency({
                              ...prev,
                              salaryCurrency: event.target.value || undefined,
                              offset: 0,
                            }),
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                      >
                        <option value="">--</option>
                        <option value="VND">VND</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                    {mobileSalaryRangeInvalid && (
                      <p className="text-xs font-semibold text-rose-600" role="alert">
                        {t("jobs.salaryRangeError", {
                          defaultValue: "Lương tối thiểu không được lớn hơn lương tối đa",
                        })}
                      </p>
                    )}
                  </div>

                  {/* Salary Only Toggle */}
                  <div className="pt-2">
                    <button
                      type="button"
                      aria-pressed={Boolean(mobileDraftQuery.salaryOnly)}
                      onClick={handleToggleSalaryOnly}
                      className={cn(
                        "w-full py-2.5 px-4 text-xs font-bold rounded-xl border text-center transition-all",
                        mobileDraftQuery.salaryOnly ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-700 border-slate-200"
                      )}
                    >
                      {t("jobs.salaryOnly", { defaultValue: "Có hiển thị mức lương" })}
                    </button>
                  </div>
                </div>

                <SheetFooter className="p-4 border-t border-slate-100 shrink-0 bg-white pb-[calc(16px+env(safe-area-inset-bottom))] shadow-md">
                  <SheetClose asChild>
                    <Button
                      disabled={mobileSalaryRangeInvalid}
                      onClick={() => {
                        setQueryState({ ...mobileDraftQuery, offset: 0, limit: 10 });
                        setSearchInput(mobileDraftQuery.q ?? "");
                        setAccumulatedRecs([]);
                      }}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm h-11 rounded-xl"
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
      {isLoading && !isPaginationRequest ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[280px] bg-slate-100 rounded-2xl" />)}
        </div>
      ) : quotaBlocked && !isPaginationRequest ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
          <p className="min-w-0 flex-1 text-[13px] text-slate-900">{t("jobs.quotaBlocked")}</p>
          <Link
            to="/pricing"
            className="shrink-0 text-[13px] font-bold text-primary hover:underline"
          >
            {t("quota.upgradeCta")}
          </Link>
        </div>
      ) : isError && !isPaginationRequest ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
          <p className="min-w-0 flex-1 text-[13px] text-slate-500">{t("jobs.error")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryRecommendations}
            disabled={isRefetching}
            className="rounded-full shadow-sm"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
            {t("jobs.retry")}
          </Button>
        </div>
      ) : displayRecs.length === 0 ? (
        <div className={cn(CARD, "p-8 text-center space-y-3")}>
          <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-[13px] text-slate-500 font-medium">
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
            <div className="h-1 w-full bg-sky-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 animate-pulse w-2/3" />
            </div>
          )}

          {/* Job Cards Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {displayRecs.map((job, index) => (
              <JobCard
                key={job.job_id}
                job={job}
                t={t}
                showRank={(queryState.sort ?? "RECOMMENDED") === "RECOMMENDED"}
                displayRank={index + 1}
              />
            ))}
          </div>

          {isLoadingMore && (
            <div
              data-testid="jobs-load-more-loading"
              role="status"
              className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              {t("jobs.loadingMore")}
            </div>
          )}

          {isLoadMoreError && (
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-medium text-rose-800">{t("jobs.loadMoreError")}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryRecommendations}
                disabled={isRefetching}
                className="rounded-full border-rose-200 bg-white text-xs font-bold text-rose-800 hover:bg-rose-100"
              >
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRefetching && "animate-spin")} />
                {t("jobs.retry")}
              </Button>
            </div>
          )}

          {/* Accumulated Load More Pagination for Explorer */}
          {hasMore && !isLoadingMore && !isLoadMoreError && (
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

          <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">{t("jobs.disclaimer")}</p>
        </>
      )}
    </section>
  );
}
