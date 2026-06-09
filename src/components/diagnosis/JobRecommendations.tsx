import { useTranslation } from "react-i18next";
import { Briefcase, MapPin, ExternalLink, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJobRecommendationsQuery } from "@/hooks/use-diagnosis";
import type { JobRecommendationDto } from "@shared/api";

/* Moat L2 — top job thật khớp CV (GET /api/cvs/:cvId/job-recommendations).
   §0b design spec: card trắng + border #EAEAEA, pastel theo band, số mono, không gradient. */
const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

/** Band màu cho match_score (0-100) — hiển thị, KHÔNG tính lại. */
function matchBand(score: number): string {
  if (score >= 70) return "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]";
  if (score >= 40) return "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]";
  return "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]";
}

/** VND → "tr" (triệu), ngoại tệ → số + mã. null cả hai → null (ẩn). */
function formatSalary(min: number | null, max: number | null, currency: string): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => (currency === "VND" ? `${Math.round(n / 1_000_000)}` : n.toLocaleString());
  const unit = currency === "VND" ? "tr" : ` ${currency}`;
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}${unit}`;
  return `${fmt((min ?? max) as number)}${unit}`;
}

function JobCard({ job, t }: { job: JobRecommendationDto; t: (key: string) => string }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  // BE trả envelope.data thô (không chuẩn hoá) — guard kẻo 1 job thiếu missing_skills làm trắng cả lưới.
  const missing = job.missing_skills ?? [];
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-[13px] font-semibold text-[#2F3437] leading-snug line-clamp-2">{job.title}</h4>
        <span className={cn("shrink-0 text-[11px] font-bold font-mono tabular-nums px-2 py-0.5 rounded border", matchBand(job.match_score))}>
          {job.match_score}%
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[12px] text-[#787774]">
        <span className="flex items-center gap-1 min-w-0">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{job.company_name}</span>
        </span>
        {job.location && (
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" />{job.location}</span>
        )}
        {salary && <span className="font-mono tabular-nums text-[#346538] font-semibold">{salary}</span>}
      </div>
      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[11px] text-[#787774]">{t("jobs.missing")}</span>
          {missing.slice(0, 3).map((s) => (
            <span key={s.display_name} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#FDEBEC] text-[#9F2F2D]">
              {s.display_name}
            </span>
          ))}
          {missing.length > 3 && (
            <span className="text-[10px] text-[#787774]">+{missing.length - 3}</span>
          )}
        </div>
      )}
    </>
  );

  const base = cn(CARD, "block p-4 transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-slate-300");
  if (!job.source_url) return <div className={base}>{body}</div>;
  return (
    <a
      href={job.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(base, "group active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40")}
    >
      {body}
      <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-primary">
        {t("jobs.apply")}
        <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </a>
  );
}

/** Render khi có cvId + đã login (hook tự gate). pool rỗng → empty-state; lỗi → ẩn. */
export function JobRecommendations({ cvId }: { cvId: string | null }) {
  const { t } = useTranslation("diagnosis");
  const { data, isLoading, isError } = useJobRecommendationsQuery(cvId, { limit: 5 });
  const recs = data?.recommendations ?? [];

  if (!cvId || isError) return null;

  return (
    <section className="mt-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-[#2F3437]">{t("jobs.title")}</h3>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-[#F1F1EF] rounded-xl animate-pulse" />)}
        </div>
      ) : recs.length === 0 ? (
        <div className={cn(CARD, "p-6 text-center")}>
          <Briefcase className="w-7 h-7 text-[#B9B9B7] mx-auto mb-2" />
          <p className="text-[13px] text-[#787774]">{t("jobs.empty")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recs.map((job) => <JobCard key={job.job_id} job={job} t={t} />)}
          </div>
          <p className="text-[11px] text-[#787774] mt-2.5 leading-relaxed">{t("jobs.disclaimer")}</p>
        </>
      )}
    </section>
  );
}
