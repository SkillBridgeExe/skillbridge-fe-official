import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Edit2,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useBusinessJobsQuery, useCreateJobDraftMutation, useDeleteJobMutation, useCloseJobMutation, useDuplicateJobMutation } from "@/hooks/use-business-jobs";
import type { JobEntityDto, JobStatus } from "@/types/jobs";

const STATUS_BADGES: Record<JobStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600 border-slate-200" },
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  closed: { label: "Closed", className: "bg-amber-50 text-amber-700 border-amber-200" },
  expired: { label: "Expired", className: "bg-red-50 text-red-600 border-red-200" },
  removed: { label: "Removed", className: "bg-red-50 text-red-600 border-red-200" },
};

const STATUS_FILTERS: Array<{ key: "all" | JobStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "closed", label: "Closed" },
];

const PAGE_SIZE = 20;

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, index) => {
          const page = index + 1;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold transition ${
                page === currentPage
                  ? "bg-sky-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.draft;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}

export default function BusinessJobs() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRoleCode, setNewRoleCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // API queries
  const jobsQuery = useBusinessJobsQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit: PAGE_SIZE,
  });
  const createMutation = useCreateJobDraftMutation();
  const deleteMutation = useDeleteJobMutation();
  const closeMutation = useCloseJobMutation();
  const duplicateMutation = useDuplicateJobMutation();

  const total = jobsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Client-side search filter (backend already filters by status)
  const filtered = useMemo(() => {
    const items = jobsQuery.data?.items ?? [];
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        job.slug.toLowerCase().includes(q) ||
        job.location?.toLowerCase().includes(q),
    );
  }, [jobsQuery.data, query]);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate(
      { title: newTitle.trim(), roleCode: newRoleCode.trim() || undefined },
      {
        onSuccess: (created) => {
          setNewTitle("");
          setNewRoleCode("");
          setShowCreateForm(false);
          setSubmitted(true);
          setTimeout(() => setSubmitted(false), 3000);
          navigate(`/business/jobs/${created.job.id}/edit`);
        },
      },
    );
  };

  const handleDelete = (job: JobEntityDto) => {
    if (job.status !== "draft") return;
    deleteMutation.mutate(job.id);
  };

  const handleClose = (job: JobEntityDto) => {
    if (job.status !== "active") return;
    closeMutation.mutate(job.id);
  };

  const handleDuplicate = (job: JobEntityDto) => {
    if (job.status !== "closed" && job.status !== "expired") return;
    duplicateMutation.mutate(job.id);
  };

  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  return (
    <BusinessLayout title="Job Listings" subtitle="Manage, publish, and monitor all open positions.">
      <div className="space-y-5">
        {submitted && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle size={16} className="text-emerald-600" />
            <p className="text-sm text-emerald-800 font-medium">
              Job draft created successfully. Edit and publish when ready.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <p className="text-sm text-slate-500">
              {jobsQuery.isLoading ? "Loading..." : `Showing ${startIndex}-${endIndex} of ${total} jobs`}
            </p>
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setNewTitle("");
                setNewRoleCode("");
              }}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} />
              Post New Job
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter current page by title or location"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
              />
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setStatusFilter(item.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md font-semibold ${
                    statusFilter === item.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl border border-sky-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Create New Job Draft</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Job Title *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Developer"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Role Code (optional)</label>
                  <input
                    type="text"
                    value={newRoleCode}
                    onChange={(e) => setNewRoleCode(e.target.value)}
                    placeholder="e.g. frontend_developer"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || createMutation.isPending}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Create Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {jobsQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                  <div className="h-8 w-20 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {jobsQuery.isError && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
            <XCircle size={24} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-700 font-medium">Failed to load jobs.</p>
            <button
              onClick={() => jobsQuery.refetch()}
              className="mt-2 text-xs text-red-600 underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Job list */}
        {jobsQuery.isSuccess && (
          <div className="space-y-3">
            {filtered.map((job) => (
              <div
                key={job.id}
                className={`bg-white rounded-xl border transition-all ${
                  job.status === "active" ? "border-slate-200" : "border-slate-200 opacity-80"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-900">{job.title}</h3>
                        <JobStatusBadge status={job.status} />
                        {job.sourceType !== "employer" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                            {job.sourceType}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Users size={11} />
                          {job.openingsCount} slot{job.openingsCount !== 1 ? "s" : ""}
                        </span>
                        {job.location && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={11} />
                            {job.location}
                          </span>
                        )}
                        {job.expiresAt && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar size={11} />
                            Expires: {new Date(job.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                        {job.postedAt && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={11} />
                            Posted: {new Date(job.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Edit — only employer jobs */}
                      {job.sourceType === "employer" && (
                        <button
                          onClick={() => navigate(`/business/jobs/${job.id}/edit`)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      {/* Close — only active */}
                      {job.status === "active" && (
                        <button
                          onClick={() => handleClose(job)}
                          disabled={closeMutation.isPending}
                          className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600"
                          title="Close"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                      {/* Duplicate — closed/expired */}
                      {(job.status === "closed" || job.status === "expired") && (
                        <button
                          onClick={() => handleDuplicate(job)}
                          disabled={duplicateMutation.isPending}
                          className="p-2 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600"
                          title="Duplicate"
                        >
                          <Copy size={15} />
                        </button>
                      )}
                      {/* Delete — only draft */}
                      {job.status === "draft" && (
                        <button
                          onClick={() => handleDelete(job)}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
                <Briefcase size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No jobs match your current filters.</p>
              </div>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </BusinessLayout>
  );
}
