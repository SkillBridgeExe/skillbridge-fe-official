import { Link } from "react-router-dom";
import { AlertCircle, Briefcase, ChevronRight, Clock, Loader2, Users, UserCheck } from "lucide-react";
import BusinessLayout from "./BusinessLayout";
import { useBusinessDashboardQuery } from "@/hooks/use-business-jobs";
import type { ApplicationStatus } from "@/types/jobs";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "New",
  IN_REVIEW: "Under review",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export default function BusinessDashboard() {
  const dashboard = useBusinessDashboardQuery();

  if (dashboard.isLoading) {
    return (
      <BusinessLayout title="Overview" subtitle="Track your hiring pipeline.">
        <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 animate-spin" size={18} /> Loading dashboard…
        </div>
      </BusinessLayout>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <BusinessLayout title="Overview" subtitle="Track your hiring pipeline.">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          We could not load your hiring dashboard. Please try again.
        </div>
      </BusinessLayout>
    );
  }

  const { company, metrics, recentApplications } = dashboard.data;
  const stats = [
    { label: "Active jobs", value: metrics.activeJobs, icon: Briefcase, tone: "bg-sky-100 text-sky-700" },
    { label: "Total applicants", value: metrics.totalApplications, icon: Users, tone: "bg-violet-100 text-violet-700" },
    { label: "Under review", value: metrics.inReview, icon: Clock, tone: "bg-amber-100 text-amber-700" },
    { label: "Shortlisted", value: metrics.shortlisted, icon: UserCheck, tone: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <BusinessLayout title="Overview" subtitle="Track hiring progress from application to shortlist.">
      <div className="space-y-6">
        {(!company || !company.publishAllowed) && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {company?.status === "PENDING_REVIEW" ? "Company profile is awaiting review" : "Complete company verification before publishing jobs"}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Your draft jobs remain safe. <Link to="/business/profile" className="font-semibold underline">Review company profile</Link>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon size={18} /></div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h2 className="text-sm font-semibold text-slate-900">Recent applicants</h2><p className="text-xs text-slate-500">The five latest submissions across your jobs</p></div>
              <Link to="/business/applicants" className="flex items-center gap-1 text-xs font-semibold text-sky-700">View pipeline <ChevronRight size={13} /></Link>
            </div>
            {recentApplications.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">No applications have been submitted yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentApplications.map((application) => (
                  <div key={application.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_100px_120px] sm:items-center">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{application.candidateName}</p><p className="truncate text-xs text-slate-500">{application.job?.title ?? "Job unavailable"} · {formatSubmittedAt(application.submittedAt)}</p></div>
                    <div className="text-xs font-semibold text-slate-700">
                      {application.matchExplanation.status === "READY" && application.matchExplanation.score !== null ? `${Math.round(application.matchExplanation.score)}% match` : application.matchExplanation.status === "FAILED" ? "Match unavailable" : "Matching…"}
                    </div>
                    <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">{STATUS_LABELS[application.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Pipeline snapshot</h2>
            <div className="mt-4 space-y-3">
              {[
                ["New submissions", metrics.submitted],
                ["Under review", metrics.inReview],
                ["Shortlisted", metrics.shortlisted],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3"><span className="text-xs text-slate-600">{label}</span><strong className="text-sm text-slate-900">{value}</strong></div>
              ))}
            </div>
            <Link to="/business/jobs" className="mt-5 flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">Manage job listings</Link>
          </section>
        </div>
      </div>
    </BusinessLayout>
  );
}
