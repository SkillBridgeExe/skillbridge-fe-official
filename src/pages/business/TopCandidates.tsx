import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ChevronLeft, ChevronRight, Loader2, Trophy, Users } from "lucide-react";
import BusinessLayout from "./BusinessLayout";
import ApplicationMatchExplanation from "@/components/business/ApplicationMatchExplanation";
import { useBusinessApplicationsQuery, useBusinessJobsQuery } from "@/hooks/use-business-jobs";
import type { JobStatus } from "@/types/jobs";

const PAGE_SIZE = 20;

export default function TopCandidates() {
  const [jobStatus, setJobStatus] = useState<Extract<JobStatus, "active" | "closed">>("active");
  const [selectedJobId, setSelectedJobId] = useState<string>();
  const [page, setPage] = useState(1);
  const jobs = useBusinessJobsQuery({ status: jobStatus, page: 1, limit: 100 });

  useEffect(() => {
    const jobItems = jobs.data?.items ?? [];
    const firstJob = jobItems[0];
    if (!firstJob) {
      setSelectedJobId(undefined);
      return;
    }
    if (!jobItems.some((job) => job.id === selectedJobId)) setSelectedJobId(firstJob.id);
  }, [jobs.data, selectedJobId]);

  useEffect(() => setPage(1), [selectedJobId]);

  const applications = useBusinessApplicationsQuery(selectedJobId, {
    pipeline: "ACTIVE",
    sort: "MATCH_DESC",
    page,
    limit: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil((applications.data?.total ?? 0) / PAGE_SIZE));

  return (
    <BusinessLayout title="Top Candidates" subtitle="Rank applicants for a specific job using the stored skills-only match.">
      <div className="space-y-5">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <div className="flex gap-3"><Trophy size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Applicants, not a public talent pool</p><p className="mt-1 text-xs text-sky-700">Only candidates who applied to the selected job appear here. Pending or unavailable matches never receive an invented score.</p></div></div>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
          <label className="text-xs font-semibold text-slate-600">Job state
            <select value={jobStatus} onChange={(event) => setJobStatus(event.target.value as "active" | "closed")} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
              <option value="active">Active jobs</option><option value="closed">Closed jobs</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Job
            <select value={selectedJobId ?? ""} onChange={(event) => setSelectedJobId(event.target.value || undefined)} disabled={!jobs.data?.items.length} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 disabled:bg-slate-50">
              {!jobs.data?.items.length && <option value="">No {jobStatus} jobs</option>}
              {jobs.data?.items.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>
        </div>

        {jobs.isLoading || applications.isLoading ? (
          <div className="flex min-h-56 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 size={18} className="mr-2 animate-spin" /> Loading ranked applicants…</div>
        ) : applications.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Could not load candidates for this job.</div>
        ) : !selectedJobId ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><Briefcase size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-800">No {jobStatus} job selected</p><p className="mt-1 text-xs text-slate-500">Create or select a job before reviewing ranked applicants.</p></div>
        ) : applications.data?.items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center"><Users size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-800">No active-pipeline applicants</p><p className="mt-1 text-xs text-slate-500">Submitted, under-review, and shortlisted applications will appear here.</p></div>
        ) : (
          <div className="space-y-3">
            {applications.data?.items.map((application, index) => (
              <article key={application.id} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 lg:grid-cols-[48px_minmax(180px,0.8fr)_minmax(280px,1.4fr)_110px] lg:items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">#{(page - 1) * PAGE_SIZE + index + 1}</div>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{application.candidateName}</p><p className="truncate text-xs text-slate-500">{application.candidateEmail}</p><span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{application.status.replaceAll("_", " ")}</span></div>
                <ApplicationMatchExplanation explanation={application.matchExplanation} compact />
                <Link to={`/business/applicants?jobId=${encodeURIComponent(selectedJobId)}`} className="inline-flex items-center justify-center rounded-lg border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">Review application</Link>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600"><button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="flex items-center gap-1 rounded-md px-2 py-1.5 disabled:opacity-40"><ChevronLeft size={14} /> Previous</button><span>Page {page} of {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} className="flex items-center gap-1 rounded-md px-2 py-1.5 disabled:opacity-40">Next <ChevronRight size={14} /></button></div>
        )}
      </div>
    </BusinessLayout>
  );
}
