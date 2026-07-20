import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { usePostHog } from "@posthog/react";
import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Users,

  ChevronDown,
  SlidersHorizontal,
  X,
  Bookmark,
  BookmarkCheck,
  Zap,
  CheckCircle,
  Filter,
  ArrowUpRight,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  useJobsQuery, useJobFiltersQuery,
  useSaveJobMutation, useUnsaveJobMutation,
  useSavedJobsQuery,
} from "@/hooks/use-jobs";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";
import { getJobListAccess } from "./job-list-access";
import { getExternalJobApplyUrl } from "./job-access";
import type { PublicJobDto, PublicJobsQuery, WorkMode, EmploymentType, ExperienceLevel } from "@/types/jobs";

// ─── Helpers ────────────────────────────────────────────────────────
function formatSalary(job: PublicJobDto): string | null {
  const { salary } = job;
  if (!salary.visible) return null;
  if (salary.min == null && salary.max == null) return salary.negotiable ? "Negotiable" : null;
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
    return n.toLocaleString();
  };
  const parts = [salary.min != null ? fmt(salary.min) : null, salary.max != null ? fmt(salary.max) : null].filter(Boolean);
  const range = parts.join(" – ");
  const suffix = salary.period === "YEAR" ? "/yr" : salary.period === "MONTH" ? "/mo" : "";
  return `${range} ${salary.currency}${suffix}`.trim();
}

function postedAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

const SORT_OPTIONS = [
  { label: "Newest", value: "NEWEST" as const },
  { label: "Relevance", value: "RELEVANCE" as const },
  { label: "Highest Salary", value: "SALARY_DESC" as const },
];

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
};

const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  INTERN: "Intern",
  FRESHER: "Fresher",
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
};

// ─── Custom Dropdown ─────────────────────────────────────────────────
interface DropdownOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  variant?: "dark" | "light";
  placeholder?: string;
  align?: "left" | "right";
}

function CustomDropdown({
  value,
  options,
  onChange,
  icon,
  variant = "light",
  align = "left",
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];
  const isDark = variant === "dark";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 transition-all duration-150 rounded-xl px-3 py-2 ${
          isDark
            ? "backdrop-blur-sm text-slate-200 hover:bg-white/10"
            : open
            ? "bg-sky-50 border border-sky-300 text-sky-700"
            : "bg-white border border-slate-200 text-slate-700 hover:border-sky-300"
        }`}
        style={isDark ? { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" } : {}}
      >
        {icon && (
          <span className={isDark ? "text-sky-300" : "text-slate-400"}>
            {icon}
          </span>
        )}
        <span className={`text-sm font-medium whitespace-nowrap ${isDark ? "text-slate-100" : ""}`}>
          {selected.label}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 flex-shrink-0 ${
            open ? "rotate-180" : ""
          } ${isDark ? "text-slate-300" : "text-slate-400"}`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 py-1.5 rounded-2xl shadow-xl border overflow-hidden ${
            align === "right" ? "right-0" : "left-0"
          }`}
          style={{
            minWidth: 180,
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(16px)",
            borderColor: "rgba(226,232,240,0.8)",
            boxShadow: "0 8px 32px -4px rgba(15,23,42,0.12), 0 2px 8px -2px rgba(15,23,42,0.06)",
            animation: "dropdownIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="px-3 pb-1.5 mb-0.5">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>
          <div className="max-h-64 overflow-y-auto px-1.5">
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-100 group ${
                    isSelected
                      ? "bg-sky-500 text-white"
                      : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                    isSelected ? "bg-white" : "bg-transparent"
                  }`} />
                  {opt.icon && (
                    <span className={isSelected ? "text-white" : "text-slate-400 group-hover:text-sky-500"}>
                      {opt.icon}
                    </span>
                  )}
                  <span className="text-sm font-medium">{opt.label}</span>
                  {isSelected && (
                    <CheckCircle size={13} className="ml-auto text-white/80 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Job Card ────────────────────────────────────────────────────────
export function JobCard({ job, saved, showSave, externalApplyUrl, onSave }: { job: PublicJobDto; saved: boolean; showSave: boolean; externalApplyUrl: string | null; onSave: (id: string) => void }) {
  const salary = formatSalary(job);
  const posted = postedAgo(job.postedAt);
  const isNew = job.postedAt && (Date.now() - new Date(job.postedAt).getTime()) < 2 * 86_400_000;
  const logo = job.company.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // Deterministic color from company slug
  const hue = (job.company.slug ?? job.company.name).split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  const companyColor = `hsl(${hue}, 65%, 52%)`;

  return (
    <div className="group bg-white border border-slate-100 rounded-2xl p-5 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-50 transition-all duration-300 relative overflow-hidden">
      {isNew && (
        <div className="absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl bg-emerald-500 text-white">
          ✨ NEW
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Company logo */}
        {job.company.logoUrl ? (
          <img
            src={job.company.logoUrl}
            alt={job.company.name}
            className="w-12 h-12 rounded-xl flex-shrink-0 object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm"
            style={{ backgroundColor: companyColor }}
          >
            {logo}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug">
              {job.title}
            </h3>
            {showSave ? (
              <button
                onClick={() => onSave(job.id)}
                aria-label={saved ? "Unsave job" : "Save job"}
                className="flex-shrink-0 p-1 text-slate-300 hover:text-sky-500 transition-colors mt-0.5"
              >
                {saved ? <BookmarkCheck size={16} className="text-sky-500" /> : <Bookmark size={16} />}
              </button>
            ) : null}
          </div>

          {/* Company + info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-slate-600">{job.company.name}</span>
            {job.experienceLevel && (
              <span className="text-[11px] text-slate-400">
                · {EXPERIENCE_LEVEL_LABELS[job.experienceLevel] ?? job.experienceLevel}
              </span>
            )}
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {job.location && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                <MapPin size={10} /> {job.location}
              </span>
            )}
            {job.workMode && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                <Briefcase size={10} /> {WORK_MODE_LABELS[job.workMode] ?? job.workMode}
              </span>
            )}
            {job.employmentType && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                <Clock size={10} /> {EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType}
              </span>
            )}
            {salary && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-semibold">
                <DollarSign size={10} /> {salary}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <Users size={10} /> {job.openingsCount} slot{job.openingsCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-50">
        <div className="flex items-center gap-3">
          {posted && (
            <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
              <Clock size={10} /> {posted}
            </span>
          )}
          {job.applicationMode === "EXTERNAL" && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
              External
            </span>
          )}
        </div>
        {/* CTA: external jobs always show "Apply on site" if sourceUrl exists,
             native jobs gate on canApply, otherwise show Closed */}
        {job.applicationMode === "EXTERNAL" && externalApplyUrl ? (
          <a
            href={externalApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 group/btn"
          >
            Apply on site
            <ArrowUpRight size={13} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </a>
        ) : job.canApply && job.applicationMode === "NATIVE" ? (
          <Link
            to={`/jobs/${job.slug}`}
            className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 group/btn"
          >
            Apply now
            <ArrowUpRight size={13} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </Link>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">Closed</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function Jobs() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<PublicJobsQuery["sort"]>("NEWEST");
  const [workModeFilter, setWorkModeFilter] = useState<string>("All");
  const [employmentFilter, setEmploymentFilter] = useState<string>("All");
  const [experienceFilter, setExperienceFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const heroRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authSource = useAuthStore((s) => s.authSource);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { canQuerySavedJobs: canSaveJobs, showSaveAction } = getJobListAccess({
    isAuthenticated,
    authSource,
    role: currentUser?.role,
  });
  const { toast } = useToast();
  const posthog = usePostHog();

  // Build query — arrays serialized as comma-separated for backend contract
  const apiQuery: PublicJobsQuery = useMemo(() => ({
    q: search || undefined,
    sort: sortBy,
    workModes: workModeFilter !== "All" ? [workModeFilter as WorkMode] : undefined,
    employmentTypes: employmentFilter !== "All" ? [employmentFilter as EmploymentType] : undefined,
    experienceLevels: experienceFilter !== "All" ? [experienceFilter as ExperienceLevel] : undefined,
    page,
    limit: 20,
  }), [search, sortBy, workModeFilter, employmentFilter, experienceFilter, page]);

  const jobsQuery = useJobsQuery(apiQuery);
  const filtersQuery = useJobFiltersQuery();
  // Only fetch saved jobs when user is logged in — this is a USER route
  const savedJobsQuery = useSavedJobsQuery({ limit: 100, enabled: canSaveJobs });
  const saveMutation = useSaveJobMutation();
  const unsaveMutation = useUnsaveJobMutation();

  const savedJobIds = useMemo(() => {
    const ids = new Set<string>();
    savedJobsQuery.data?.items.forEach(item => ids.add(item.job.id));
    return ids;
  }, [savedJobsQuery.data]);

  const jobs = jobsQuery.data?.items ?? [];
  const total = jobsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  // Use ref-based style mutation for mouse glow — avoids re-rendering
  // the entire page on every mouse move event.
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect || !glowRef.current) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    glowRef.current.style.background = `
      radial-gradient(ellipse 55% 45% at ${x}% ${y}%,
        rgba(14,165,233,0.18) 0%, transparent 65%),
      radial-gradient(ellipse 40% 50% at ${100 - x * 0.6}% ${y * 0.7 + 20}%,
        rgba(99,102,241,0.13) 0%, transparent 60%),
      radial-gradient(ellipse 35% 40% at ${x * 0.4 + 30}% ${100 - y * 0.5}%,
        rgba(20,184,166,0.10) 0%, transparent 55%)
    `;
  }, []);

  const toggleSave = (id: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để lưu công việc này.",
      });
      return;
    }

    if (!canSaveJobs) return;

    if (savedJobIds.has(id)) {
      unsaveMutation.mutate(id);
    } else {
      posthog?.capture("job_saved", { job_id: id });
      saveMutation.mutate(id);
    }
  };

  // Build filter options from API response
  const workModeOptions = useMemo(() => {
    const items = filtersQuery.data?.workModes ?? [];
    return [
      { label: "All Modes", value: "All" },
      ...items.map(f => ({
        label: `${WORK_MODE_LABELS[f.value as WorkMode] ?? f.value} (${f.count})`,
        value: f.value,
      })),
    ];
  }, [filtersQuery.data]);

  const employmentOptions = useMemo(() => {
    const items = filtersQuery.data?.employmentTypes ?? [];
    return [
      { label: "All Types", value: "All" },
      ...items.map(f => ({
        label: `${EMPLOYMENT_TYPE_LABELS[f.value as EmploymentType] ?? f.value} (${f.count})`,
        value: f.value,
      })),
    ];
  }, [filtersQuery.data]);

  const experienceOptions = useMemo(() => {
    const items = filtersQuery.data?.experienceLevels ?? [];
    return [
      { label: "All Levels", value: "All" },
      ...items.map(f => ({
        label: `${EXPERIENCE_LEVEL_LABELS[f.value as ExperienceLevel] ?? f.value} (${f.count})`,
        value: f.value,
      })),
    ];
  }, [filtersQuery.data]);

  const activeFilterCount = [
    workModeFilter !== "All",
    employmentFilter !== "All",
    experienceFilter !== "All",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setWorkModeFilter("All");
    setEmploymentFilter("All");
    setExperienceFilter("All");
  };

  return (
    <Layout>
      <div className="min-h-dvh bg-slate-50">
        {/* ── Hero Banner ── */}
        <div
          ref={heroRef}
          onMouseMove={handleMouseMove}
          className="relative pt-28 pb-16 px-6 overflow-hidden select-none"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #0c1a2e 40%, #0d1f3c 70%, #0f172a 100%)",
          }}
        >
          {/* Animated gradient blobs following mouse — updated via ref, not state */}
          <div
            ref={glowRef}
            className="absolute inset-0 pointer-events-none transition-[background] duration-700 ease-out"
            style={{
              background: `
                radial-gradient(ellipse 55% 45% at 50% 50%,
                  rgba(14,165,233,0.18) 0%, transparent 65%),
                radial-gradient(ellipse 40% 50% at 70% 55%,
                  rgba(99,102,241,0.13) 0%, transparent 60%),
                radial-gradient(ellipse 35% 40% at 50% 75%,
                  rgba(20,184,166,0.10) 0%, transparent 55%)
              `,
            }}
          />

          {/* Static ambient glows */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-[600px] h-[400px] opacity-20"
              style={{ background: "radial-gradient(ellipse at 20% 0%, rgba(56,189,248,0.4) 0%, transparent 60%)" }} />
            <div className="absolute bottom-0 right-0 w-[500px] h-[300px] opacity-15"
              style={{ background: "radial-gradient(ellipse at 80% 100%, rgba(139,92,246,0.5) 0%, transparent 60%)" }} />
          </div>

          {/* Dot grid texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Thin top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />

          {/* Content */}
          <div className="max-w-5xl mx-auto relative z-10">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border backdrop-blur-sm"
                style={{
                  background: "rgba(14,165,233,0.12)",
                  borderColor: "rgba(14,165,233,0.25)",
                  color: "#7dd3fc",
                }}>
                <Zap size={11} className="fill-yellow-300 text-yellow-300" />
                {total > 0 ? `${total} jobs available` : "Discover opportunities"}
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl md:text-[2.75rem] font-black leading-tight mb-3 tracking-tight">
              <span className="text-white">Find your next </span>
              <span style={{
                background: "linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #34d399 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                opportunity
              </span>
            </h1>
            <p className="text-sm mb-8 max-w-xl leading-relaxed" style={{ color: "#94a3b8" }}>
              Top companies are actively hiring SkillBridge graduates. Your learning score unlocks higher-match positions.
            </p>

            {/* Search bar */}
            <div className="flex gap-2 rounded-2xl p-1.5 shadow-2xl"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(16px)",
              }}>
              <div className="flex-1 flex items-center gap-2 px-4 bg-white rounded-xl">
                <Search size={17} className="text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Job title, company, or skill..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent py-3"
                />
                {search && (
                  <button onClick={() => { setSearch(""); setPage(1); }} className="text-slate-300 hover:text-slate-500 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95 flex items-center gap-2 flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
                  boxShadow: "0 4px 24px rgba(14,165,233,0.35)",
                }}
              >
                <Search size={15} />
                Search
              </button>
            </div>

            {/* Popular tags */}
            <div className="flex flex-wrap gap-2 mt-5 items-center">
              <span className="text-xs font-medium" style={{ color: "#64748b" }}>Popular:</span>
              {["React", "Python", "Product Manager", "Data Analyst", "Remote"].map(tag => (
                <button
                  key={tag}
                  onClick={() => { setSearch(tag); setPage(1); }}
                  className="text-xs px-3 py-1 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "#94a3b8",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(248,250,252,0.08))" }} />
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-7">
          {/* ── Sidebar Filters ── */}
          <aside className={`
            flex-shrink-0 w-64 space-y-5
            ${showFilters ? "block" : "hidden"} lg:block
          `}>
            {/* Filter header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-sky-500" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-sky-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </h2>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">
                  <X size={12} /> Reset
                </button>
              )}
            </div>

            {/* Work Mode */}
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Work Mode</h3>
              <div className="space-y-1.5">
                {workModeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setWorkModeFilter(opt.value); setPage(1); }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-all font-medium ${
                      workModeFilter === opt.value
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Employment Type */}
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Employment Type</h3>
              <div className="space-y-1.5">
                {employmentOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setEmploymentFilter(opt.value); setPage(1); }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-all font-medium ${
                      employmentFilter === opt.value
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Experience Level</h3>
              <div className="space-y-1.5">
                {experienceOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setExperienceFilter(opt.value); setPage(1); }}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-all font-medium ${
                      experienceFilter === opt.value
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Job List ── */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-sky-300 transition-all"
                >
                  <Filter size={14} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 bg-sky-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <p className="text-sm text-slate-600">
                  {jobsQuery.isLoading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin text-sky-500" /> Loading...
                    </span>
                  ) : (
                    <>
                      <span className="font-bold text-slate-900">{total}</span> jobs found
                      {search && <span className="text-slate-400"> for &quot;{search}&quot;</span>}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Sort by:</span>
                <CustomDropdown
                  value={sortBy ?? "NEWEST"}
                  options={SORT_OPTIONS}
                  onChange={(v) => { setSortBy(v as PublicJobsQuery["sort"]); setPage(1); }}
                  variant="light"
                  align="right"
                />
              </div>
            </div>

            {/* Error state */}
            {jobsQuery.isError && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-8 text-center">
                <XCircle size={28} className="text-red-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-red-700">Failed to load jobs</p>
                <button
                  onClick={() => jobsQuery.refetch()}
                  className="mt-2 text-xs text-red-600 underline hover:text-red-800"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {jobsQuery.isLoading && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                        <div className="flex gap-2 mt-2">
                          <div className="h-5 bg-slate-100 rounded-full w-16" />
                          <div className="h-5 bg-slate-100 rounded-full w-20" />
                          <div className="h-5 bg-slate-100 rounded-full w-14" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Job cards grid */}
            {jobsQuery.isSuccess && (
              <>
                {jobs.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {jobs.map(job => (
                      <JobCard
                        key={job.id}
                        job={job}
                        saved={savedJobIds.has(job.id)}
                        showSave={showSaveAction}
                        externalApplyUrl={getExternalJobApplyUrl({ isAuthenticated, role: currentUser?.role }, job.sourceUrl)}
                        onSave={toggleSave}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Search size={24} className="text-slate-300" />
                    </div>
                    <p className="text-base font-semibold text-slate-700 mb-1">No jobs found</p>
                    <p className="text-sm text-slate-400 mb-4">Try adjusting your search or filters</p>
                    <button
                      onClick={() => { setSearch(""); resetFilters(); setPage(1); }}
                      className="text-sm text-sky-600 font-semibold hover:text-sky-700 underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-500">
                      Page <strong>{page}</strong> of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}

                {/* Saved jobs note */}
                {savedJobIds.size > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
                    <BookmarkCheck size={14} className="text-sky-500" />
                    <span>You have <strong className="text-sky-700">{savedJobIds.size}</strong> saved job{savedJobIds.size > 1 ? "s" : ""}.</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
