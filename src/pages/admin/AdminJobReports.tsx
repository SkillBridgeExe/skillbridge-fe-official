import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Flag,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText,
  Trash2,
} from "lucide-react";
import {
  useAdminJobReportsQuery,
  useRemoveAdminJobMutation,
  useResolveJobReportMutation,
} from "@/hooks/use-admin-jobs";
import type { JobReportDto } from "@/types/jobs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  OPEN: {
    label: "Open",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  DISMISSED: {
    label: "Dismissed",
    color: "text-slate-700",
    bg: "bg-slate-50 border-slate-200",
  },
  ACTIONED: {
    label: "Actioned",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
};

const REASON_CONFIG: Record<string, string> = {
  SCAM: "Scam / Fraud",
  MISLEADING: "Misleading",
  DISCRIMINATION: "Discrimination",
  EXPIRED: "Expired",
  OTHER: "Other",
};

export default function AdminJobReports() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<
    "OPEN" | "DISMISSED" | "ACTIONED" | "ALL"
  >("OPEN");
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<JobReportDto | null>(
    null,
  );
  const [pendingResolution, setPendingResolution] = useState<
    "DISMISSED" | "ACTIONED" | "REMOVE_AND_ACTION" | null
  >(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const searchQuery = "";
  const reportsQuery = useAdminJobReportsQuery({
    page,
    limit: 20,
    status: filterStatus !== "ALL" ? filterStatus : undefined,
  });

  const resolveMutation = useResolveJobReportMutation();
  const removeJobMutation = useRemoveAdminJobMutation();
  const canResolve = resolutionNote.trim().length > 0;
  const isModerating = resolveMutation.isPending || removeJobMutation.isPending;

  const handleResolve = async () => {
    if (!selectedReport) return;
    if (!pendingResolution) return;
    if (!canResolve) return;

    const note = resolutionNote.trim();
    const finalStatus =
      pendingResolution === "DISMISSED" ? "DISMISSED" : "ACTIONED";

    try {
      if (pendingResolution === "REMOVE_AND_ACTION") {
        await removeJobMutation.mutateAsync({
          jobId: selectedReport.jobId,
          body: { status: "removed", reason: note },
        });
      }

      await resolveMutation.mutateAsync({
        reportId: selectedReport.id,
        body: { status: finalStatus, resolutionNote: note },
      });

      toast({
        title:
          pendingResolution === "REMOVE_AND_ACTION"
            ? "Job removed"
            : "Report resolved",
        description:
          pendingResolution === "REMOVE_AND_ACTION"
            ? "The job was removed and the report was marked as actioned."
            : `Marked as ${finalStatus}.`,
      });
      setSelectedReport(null);
      setPendingResolution(null);
      setResolutionNote("");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: getApiErrorMessage(
          err,
          "Could not complete moderation action.",
        ),
      });
    }
  };

  const reports = reportsQuery.data?.items || [];
  const total = reportsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  // Resolving the last item on a page shrinks the set; without this the pager
  // (gated on totalPages > 1) unmounts and strands the admin on an empty page
  // with no way back (bug hunt R3 07-22). Clamp back into range.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Job Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and moderate community job reports.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {(["OPEN", "DISMISSED", "ACTIONED", "ALL"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStatus(status);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                    filterStatus === status
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              readOnly
              placeholder="Search reports..."
              title="Search is not supported by the current reports API yet."
              className="w-full cursor-not-allowed pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {reportsQuery.isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm font-medium">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Flag size={48} className="mb-4 text-slate-200" />
            <p className="text-base font-semibold text-slate-600">
              No reports found
            </p>
            <p className="text-sm mt-1 text-center max-w-sm">
              We couldn't find any job reports matching your criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-sm whitespace-nowrap">
              <TableHeader className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <TableRow>
                  <TableHead className="px-6 py-3">Report ID</TableHead>
                  <TableHead className="px-6 py-3">Reason</TableHead>
                  <TableHead className="px-6 py-3">Date</TableHead>
                  <TableHead className="px-6 py-3">Status</TableHead>
                  <TableHead className="px-6 py-3 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 text-slate-600">
                {reports.map((report) => {
                  const statusInfo = STATUS_CONFIG[report.status];
                  return (
                    <TableRow
                      key={report.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${report.status === "OPEN" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}
                          >
                            <AlertTriangle size={16} />
                          </div>
                          <div>
                            <p
                              className="font-semibold text-slate-900 truncate max-w-[120px]"
                              title={report.id}
                            >
                              {report.id.slice(0, 8)}...
                            </p>
                            <a
                              href={`/jobs/${report.jobId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-sky-600 hover:underline"
                            >
                              View Job
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-medium text-slate-900">
                        {REASON_CONFIG[report.reasonCode] || report.reasonCode}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-500">
                        {format(
                          new Date(report.createdAt),
                          "MMM d, yyyy HH:mm",
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <FileText size={14} className="mr-1.5" />
                          Review
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <p>
              Page <span className="font-semibold text-slate-900">{page}</span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors font-medium text-slate-700"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors font-medium text-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <AlertTriangle className="text-red-500" size={24} />
              Review Job Report
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-xs mb-1">Reason</p>
                  <p className="font-semibold text-slate-900">
                    {REASON_CONFIG[selectedReport.reasonCode] ||
                      selectedReport.reasonCode}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-slate-500 text-xs mb-1">Status</p>
                  <p className="font-semibold text-slate-900">
                    {STATUS_CONFIG[selectedReport.status]?.label}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  Details provided
                </p>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap min-h-[80px]">
                  {selectedReport.details || (
                    <span className="text-slate-400 italic">
                      No additional details provided.
                    </span>
                  )}
                </div>
              </div>

              {selectedReport.status === "OPEN" && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    Resolution Note (Internal)
                  </p>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Required. Example: Investigated the report and warned the employer."
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[80px] bg-white"
                  />
                  {!canResolve && (
                    <p className="mt-1 text-xs text-red-500">
                      A resolution note is required before dismissing or
                      actioning a report.
                    </p>
                  )}
                </div>
              )}

              {selectedReport.status !== "OPEN" &&
                selectedReport.resolutionNote && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">
                      Resolution Note
                    </p>
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-sm text-emerald-800 whitespace-pre-wrap">
                      {selectedReport.resolutionNote}
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setSelectedReport(null)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            {selectedReport?.status === "OPEN" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingResolution("DISMISSED")}
                  disabled={isModerating || !canResolve}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Dismiss
                </button>
                <button
                  onClick={() => setPendingResolution("REMOVE_AND_ACTION")}
                  disabled={isModerating || !canResolve}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Remove job
                </button>
                <button
                  onClick={() => setPendingResolution("ACTIONED")}
                  disabled={isModerating || !canResolve}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  Take Action
                </button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingResolution)}
        onOpenChange={(open) => !open && setPendingResolution(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingResolution === "REMOVE_AND_ACTION"
                ? "Remove this job and action the report?"
                : pendingResolution === "ACTIONED"
                  ? "Take action on this report?"
                  : "Dismiss this report?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingResolution === "REMOVE_AND_ACTION"
                ? "This will remove the reported job, then mark the report as actioned using the note you entered."
                : "This will resolve the report with the note you entered. The action cannot be undone from this screen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isModerating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isModerating || !canResolve}
              onClick={(event) => {
                event.preventDefault();
                handleResolve();
              }}
              className={
                pendingResolution !== "DISMISSED"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : undefined
              }
            >
              {isModerating ? "Resolving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
