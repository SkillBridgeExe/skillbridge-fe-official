import { useEffect, useState } from "react";
import BusinessLayout from "./BusinessLayout";
import {
  CheckCircle,
  FileText,
  Loader2,
  Users,
  XCircle,
  Clock,
  Briefcase,
  Download,
  Eye
} from "lucide-react";
import {
  useBusinessJobsQuery,
  useBusinessApplicationsQuery,
  useBusinessApplicationDetailQuery,
  useUpdateApplicationStatusMutation,
  useDownloadApplicationCvMutation
} from "@/hooks/use-business-jobs";
import type { ApplicationStatus, JobApplicationDto } from "@/types/jobs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api-error";

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; tile: string }> = {
  SUBMITTED: {
    label: "New",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    tile: "bg-amber-50 border-amber-200 text-amber-700",
  },
  IN_REVIEW: {
    label: "Under Review",
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    tile: "bg-sky-50 border-sky-200 text-sky-700",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    tile: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    tile: "bg-red-50 border-red-200 text-red-700",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    color: "text-slate-700",
    bg: "bg-slate-50 border-slate-200",
    tile: "bg-slate-50 border-slate-200 text-slate-700",
  },
};

const AVATAR_GRADIENTS = [
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
] as const;

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (value: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, idx) => {
          const p = idx + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold ${
                p === page ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export default function BusinessApplicants() {
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<JobApplicationDto | null>(null);
  const [page, setPage] = useState(1);

  // Fetch jobs for the selector
  const jobsQuery = useBusinessJobsQuery({ limit: 100, status: "active" });
  
  // Set default selected job
  useEffect(() => {
    if (jobsQuery.data?.items && jobsQuery.data.items.length > 0 && selectedJobId === "all") {
      setSelectedJobId(jobsQuery.data.items[0].id);
    }
  }, [jobsQuery.data, selectedJobId]);

  // Fetch applications
  const validJobId = selectedJobId !== "all" ? selectedJobId : undefined;
  const applicationsQuery = useBusinessApplicationsQuery(validJobId, {
    page,
    limit: 10,
    status: filterStatus !== "all" ? (filterStatus as ApplicationStatus) : undefined
  });
  const applicationDetailQuery = useBusinessApplicationDetailQuery(selectedApplication?.id);

  const updateStatusMutation = useUpdateApplicationStatusMutation();
  const downloadCvMutation = useDownloadApplicationCvMutation();

  const handleUpdateStatus = (applicationId: string, currentStatus: ApplicationStatus, nextStatus: 'IN_REVIEW' | 'SHORTLISTED' | 'REJECTED') => {
    updateStatusMutation.mutate({
      applicationId,
      body: {
        expectedStatus: currentStatus,
        status: nextStatus
      }
    }, {
      onSuccess: () => {
        toast({ title: "Status updated", description: `Application has been moved to ${STATUS_CONFIG[nextStatus].label}` });
      },
      onError: (err: unknown) => {
        toast({ variant: "destructive", title: "Failed to update", description: getApiErrorMessage(err, "Conflict occurred.") });
        applicationsQuery.refetch(); // Refetch to get latest status
      }
    });
  };

  const handleDownloadCV = (applicationId: string, originalFileName: string | null) => {
    downloadCvMutation.mutate(applicationId, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = originalFileName || `CV_${applicationId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Download failed", description: "Could not download CV." });
      }
    });
  };

  const statusOptions = ["all", "SUBMITTED", "IN_REVIEW", "SHORTLISTED", "REJECTED", "WITHDRAWN"];

  const applications = applicationsQuery.data?.items || [];
  const total = applicationsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const selectedApplicationDetail = applicationDetailQuery.data?.application ?? selectedApplication;
  const selectedApplicationEvents = applicationDetailQuery.data?.events ?? [];

  return (
    <BusinessLayout title="Applicants" subtitle="Review, shortlist, and manage your pipeline.">
      <div className="space-y-5">
        
        {/* Job Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 whitespace-nowrap">
            <Briefcase size={16} className="text-slate-400" />
            Select Job:
          </div>
          <select
            value={selectedJobId}
            onChange={(e) => {
              setSelectedJobId(e.target.value);
              setPage(1);
            }}
            className="w-full sm:max-w-md px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {jobsQuery.isLoading && <option value="all">Loading jobs...</option>}
            {jobsQuery.data?.items?.map(job => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
            {(!jobsQuery.data?.items || jobsQuery.data.items.length === 0) && !jobsQuery.isLoading && (
              <option value="all">No active jobs found</option>
            )}
          </select>
        </div>

        {/* Status Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilterStatus(status);
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  filterStatus === status
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                }`}
              >
                {status === "all" ? "All" : STATUS_CONFIG[status as ApplicationStatus]?.label || status}
              </button>
            ))}
          </div>
        </div>

        {/* Applicants List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {applicationsQuery.isLoading ? (
            <div className="p-10 text-center">
              <Loader2 size={32} className="animate-spin text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-10 text-center">
              <Users size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No applicants found for this job and status.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {applications.map((app) => {
                const statusInfo = STATUS_CONFIG[app.status] || STATUS_CONFIG.SUBMITTED;
                const colorIndex = app.candidateName.charCodeAt(0) % AVATAR_GRADIENTS.length;
                const avatarChar = app.candidateName.charAt(0).toUpperCase();

                return (
                  <div key={app.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[colorIndex]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                        {avatarChar}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{app.candidateName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-slate-500">{app.candidateEmail}</span>
                          {app.candidatePhone && <span className="text-xs text-slate-500">{app.candidatePhone}</span>}
                          {app.matchScore && <span className="text-xs text-sky-600 font-medium">Match: {app.matchScore}%</span>}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(app.submittedAt).toLocaleDateString("en-US")}
                          </span>
                        </div>

                        {app.cvSkillsSnapshot && app.cvSkillsSnapshot.length > 0 && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {app.cvSkillsSnapshot.map((skill) => (
                              <span key={skill.skillId} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full" title={skill.canonicalName}>
                                {skill.displayName}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {app.coverNote && (
                          <div className="mt-2 text-[12px] text-slate-600 italic bg-slate-50 p-2 rounded-md border border-slate-100">
                            "{app.coverNote}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button 
                          onClick={() => handleDownloadCV(app.id, app.cvOriginalFileName)}
                          disabled={downloadCvMutation.isPending}
                          className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 disabled:opacity-50" 
                          title="Download CV"
                        >
                          <Download size={15} />
                        </button>

                        {/* Transitions */}
                        {app.status === "SUBMITTED" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(app.id, "SUBMITTED", "IN_REVIEW")}
                              className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                              title="Mark as In Review"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(app.id, "SUBMITTED", "REJECTED")}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {app.status === "IN_REVIEW" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(app.id, "IN_REVIEW", "SHORTLISTED")}
                              className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              title="Shortlist"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(app.id, "IN_REVIEW", "REJECTED")}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {app.status === "SHORTLISTED" && (
                          <button
                            onClick={() => handleUpdateStatus(app.id, "SHORTLISTED", "REJECTED")}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                            title="Reject"
                          >
                            <XCircle size={15} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedApplication(app)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg shadow-sm"
                        >
                          <FileText size={13} />
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

        <Dialog open={Boolean(selectedApplication)} onOpenChange={(open) => !open && setSelectedApplication(null)}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Applicant details</DialogTitle>
            </DialogHeader>

            {selectedApplicationDetail ? (
              <div className="space-y-5 text-sm">
                {applicationDetailQuery.isLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Loading full application detail...
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{selectedApplicationDetail.candidateName}</p>
                      <p className="text-slate-600">{selectedApplicationDetail.candidateEmail}</p>
                      {selectedApplicationDetail.candidatePhone ? (
                        <p className="text-slate-500">{selectedApplicationDetail.candidatePhone}</p>
                      ) : null}
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CONFIG[selectedApplicationDetail.status].bg} ${STATUS_CONFIG[selectedApplicationDetail.status].color}`}>
                      {STATUS_CONFIG[selectedApplicationDetail.status].label}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-400">Submitted</p>
                    <p className="mt-1 text-slate-700">{new Date(selectedApplicationDetail.submittedAt).toLocaleString("en-US")}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-400">Match</p>
                    <p className="mt-1 text-slate-700">
                      {selectedApplicationDetail.matchScore ? `${selectedApplicationDetail.matchScore}%` : selectedApplicationDetail.matchStatus}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-400">CV file</p>
                    <p className="mt-1 text-slate-700">{selectedApplicationDetail.cvOriginalFileName || "No file name"}</p>
                    <p className="text-xs text-slate-400">{selectedApplicationDetail.cvKind || selectedApplicationDetail.cvContentType || "Unknown type"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-400">Consent</p>
                    <p className="mt-1 text-slate-700">{new Date(selectedApplicationDetail.consentAcceptedAt).toLocaleString("en-US")}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-semibold text-slate-900">Cover note</p>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700">
                    {selectedApplicationDetail.coverNote || <span className="text-slate-400">No cover note provided.</span>}
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-semibold text-slate-900">Skills snapshot</p>
                  {selectedApplicationDetail.cvSkillsSnapshot.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedApplicationDetail.cvSkillsSnapshot.map((skill) => (
                        <span key={skill.skillId} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {skill.displayName || skill.canonicalName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 p-3 text-slate-400">No skills snapshot available.</p>
                  )}
                </div>

                {selectedApplicationEvents.length > 0 ? (
                  <div>
                    <p className="mb-2 font-semibold text-slate-900">Application timeline</p>
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                      {selectedApplicationEvents.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          <div className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800">
                              {event.fromStatus ? `${STATUS_CONFIG[event.fromStatus].label} -> ` : ""}
                              {STATUS_CONFIG[event.toStatus].label}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(event.createdAt).toLocaleString("en-US")}
                              {event.internalNote ? ` · ${event.internalNote}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 font-semibold text-slate-900">Application timeline</p>
                    <p className="rounded-xl border border-dashed border-slate-200 p-3 text-slate-400">No timeline events available.</p>
                  </div>
                )}

                {selectedApplicationDetail.matchResult ? (
                  <div>
                    <p className="mb-2 font-semibold text-slate-900">Match result summary</p>
                    <pre className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
                      {JSON.stringify(selectedApplicationDetail.matchResult, null, 2)}
                    </pre>
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadCV(selectedApplicationDetail.id, selectedApplicationDetail.cvOriginalFileName)}
                    disabled={downloadCvMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download size={14} />
                    Download CV
                  </button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </BusinessLayout>
  );
}
