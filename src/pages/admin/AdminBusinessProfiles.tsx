import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Building2,
  CheckCircle,
  Eye,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  useAdminBusinessProfilesQuery,
  useAdminBusinessProfileDetailQuery,
  useAdminBusinessProfileMediaQuery,
  useReviewBusinessProfileMutation,
} from "@/hooks/use-admin-jobs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBlobUrl } from "@/hooks/use-blob-url";
import type {
  BusinessProfileDto,
  BusinessProfileStatus,
  AdminBusinessProfilesQuery,
} from "@/types/jobs";

function StatusBadge({ status }: { status: BusinessProfileStatus }) {
  const colors = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    PENDING_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
    VERIFIED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-100 text-red-700 border-red-200",
    SUSPENDED: "bg-orange-100 text-orange-700 border-orange-200",
  };

  const labels = {
    DRAFT: "Draft",
    PENDING_REVIEW: "Pending Review",
    VERIFIED: "Verified",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function CompanyLogo({
  profileId,
  enabled,
}: {
  profileId: string;
  enabled: boolean;
}) {
  const logoQuery = useAdminBusinessProfileMediaQuery(
    profileId,
    "logo",
    enabled,
  );
  const logoUrl = useBlobUrl(logoQuery.data);

  if (!logoUrl) {
    return <Building2 size={32} className="text-slate-300" />;
  }

  return (
    <img
      src={logoUrl}
      alt="Company logo"
      className="h-full w-full object-cover"
    />
  );
}

function ReviewModal({
  profileId,
  onClose,
}: {
  profileId: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError } =
    useAdminBusinessProfileDetailQuery(profileId);
  const reviewMutation = useReviewBusinessProfileMutation();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm text-slate-500">Loading profile details...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertCircle className="text-red-500 mx-auto mb-3" size={32} />
          <p className="text-sm font-semibold">
            Failed to load profile details
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { profile, company } = data;

  const handleApprove = () => {
    if (
      window.confirm(
        "Are you sure you want to approve this company? It will become public.",
      )
    ) {
      reviewMutation.mutate(
        {
          profileId: profile.id,
          body: { status: "VERIFIED" },
        },
        {
          onSuccess: () => onClose(),
        },
      );
    }
  };

  const handleReject = () => {
    const reason = window.prompt("Please provide a reason for rejection:");
    if (reason !== null) {
      if (!reason.trim()) {
        alert("Rejection reason is required.");
        return;
      }
      reviewMutation.mutate(
        {
          profileId: profile.id,
          body: { status: "REJECTED", reason },
        },
        {
          onSuccess: () => onClose(),
        },
      );
    }
  };

  const handleSuspend = () => {
    const reason = window.prompt("Please provide a reason for suspension:");
    if (reason !== null) {
      if (!reason.trim()) {
        alert("Suspension reason is required.");
        return;
      }
      reviewMutation.mutate(
        {
          profileId: profile.id,
          body: { status: "SUSPENDED", reason },
        },
        {
          onSuccess: () => onClose(),
        },
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white h-full w-full max-w-2xl shadow-2xl flex flex-col animate-in slide-in-from-right-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Review Business Profile
            </h2>
            <p className="text-sm text-slate-500">ID: {profile.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <XCircle size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Header Info */}
          <div className="flex items-start gap-5">
            <div className="w-24 h-24 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              <CompanyLogo
                profileId={profile.id}
                enabled={Boolean(company.logoUrl)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold text-slate-900 truncate">
                  {company.name}
                </h3>
                <StatusBadge status={profile.status} />
              </div>
              <p className="text-sm text-slate-500 mb-1">
                Created: {format(new Date(company.createdAt), "PPP")}
              </p>
              {profile.submittedAt && (
                <p className="text-sm text-slate-500">
                  Submitted: {format(new Date(profile.submittedAt), "PPP")}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
                Company Details
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Industry
                  </span>
                  <span className="text-sm text-slate-900">
                    {company.industryCode || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Size
                  </span>
                  <span className="text-sm text-slate-900">
                    {company.companySize || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Website
                  </span>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-sky-600 hover:underline"
                    >
                      {company.website}
                    </a>
                  ) : (
                    <span className="text-sm text-slate-900">N/A</span>
                  )}
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Headquarters
                  </span>
                  <span className="text-sm text-slate-900">
                    {company.headquartersAddress || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
                Contact Person
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Name
                  </span>
                  <span className="text-sm text-slate-900">
                    {profile.contactName || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Work Email
                  </span>
                  <span className="text-sm text-slate-900 flex items-center gap-2">
                    {profile.workEmail || "N/A"}
                    {profile.workEmailVerifiedAt && (
                      <CheckCircle size={14} className="text-emerald-500" />
                    )}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-slate-500">
                    Phone
                  </span>
                  <span className="text-sm text-slate-900">
                    {profile.contactPhone || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Description
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {company.description || "No description provided."}
            </div>
          </div>

          {(profile.rejectionReason || profile.suspensionReason) && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
                Previous Moderation Notes
              </h4>
              {profile.rejectionReason && (
                <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm border border-red-100">
                  <span className="font-semibold block mb-1">
                    Rejection Reason:
                  </span>
                  {profile.rejectionReason}
                </div>
              )}
              {profile.suspensionReason && (
                <div className="bg-orange-50 text-orange-700 rounded-lg p-4 text-sm border border-orange-100">
                  <span className="font-semibold block mb-1">
                    Suspension Reason:
                  </span>
                  {profile.suspensionReason}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center sticky bottom-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>

          <div className="flex gap-3">
            {profile.status !== "VERIFIED" && (
              <button
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {reviewMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Approve & Verify
              </button>
            )}
            {profile.status === "PENDING_REVIEW" && (
              <button
                onClick={handleReject}
                disabled={reviewMutation.isPending}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            )}
            {profile.status === "VERIFIED" && (
              <button
                onClick={handleSuspend}
                disabled={reviewMutation.isPending}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-50"
              >
                Suspend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminBusinessProfiles() {
  const [query, setQuery] = useState<AdminBusinessProfilesQuery>({
    page: 1,
    limit: 20,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useAdminBusinessProfilesQuery(query);

  const setStatusFilter = (status: BusinessProfileStatus | undefined) => {
    setQuery((prev) => ({ ...prev, status, page: 1 }));
  };

  const page = query.page ?? 1;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (query.limit ?? 20)));
  const setPage = (next: number) =>
    setQuery((prev) => ({ ...prev, page: Math.min(totalPages, Math.max(1, next)) }));

  // Unlike the read-only billing lists, approve/reject SHRINKS a filtered result
  // set: resolving the last item on the last page collapses totalPages and
  // unmounts the pager, stranding the admin on an empty page. Clamp back once
  // data is present (guarded so a mid-fetch undefined doesn't bounce; R4).
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages]);

  const TABS: { label: string; value: BusinessProfileStatus | undefined }[] = [
    { label: "All", value: undefined },
    { label: "Pending Review", value: "PENDING_REVIEW" },
    { label: "Verified", value: "VERIFIED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Suspended", value: "SUSPENDED" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {selectedId && (
        <ReviewModal
          profileId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Business Profiles
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and moderate company profiles before they go public.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => {
          const isActive = query.status === tab.value;
          return (
            <button
              key={tab.label}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search companies... (mock)"
              disabled
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Total records: {data?.total || 0}
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Building2 className="text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-900">
              No profiles found
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              No business profiles match the current filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-sm">
              <TableHeader className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <TableRow>
                  <TableHead className="px-6 py-3 whitespace-nowrap">
                    Company
                  </TableHead>
                  <TableHead className="px-6 py-3 whitespace-nowrap">
                    Contact Email
                  </TableHead>
                  <TableHead className="px-6 py-3 whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="px-6 py-3 whitespace-nowrap">
                    Submitted
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {data.items.map((profile: BusinessProfileDto) => {
                  const companyLabel =
                    profile.contactName ||
                    profile.workEmail ||
                    `Company ${profile.companyId.slice(0, 8)}`;

                  return (
                    <TableRow
                      key={profile.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <Building2 size={16} className="text-slate-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                              {companyLabel}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">
                              Company ID: {profile.companyId.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-600">
                        {profile.workEmail || "N/A"}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <StatusBadge status={profile.status} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {profile.submittedAt
                          ? format(new Date(profile.submittedAt), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedId(profile.id)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Eye size={18} />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination — render whenever more than one page exists so rows past
            the first 20 are reachable/moderatable (bug hunt R3 07-22). */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <p>
              Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors font-medium text-slate-700"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors font-medium text-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
