import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Eye,
  Linkedin,
  Loader2,
  Phone,
  Search,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { MentorStatusBadge } from "@/components/mentor/MentorStatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminMentorAvatar,
  useAdminMentors,
  useUpdateAdminMentorStatus,
} from "@/hooks/use-mentors";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  MENTOR_PROFILE_STATUSES,
  type MentorProfileDto,
  type MentorProfileStatus,
} from "@/services/mentor.service";
import { API_ROUTES } from "@/constants/api-routes";

export default function AdminMentors() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MentorProfileStatus | undefined>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MentorProfileDto | null>(null);
  const [reason, setReason] = useState("");
  const [reviewAvatarUrl, setReviewAvatarUrl] = useState<string | null>(null);
  const query = useMemo(
    () => ({ query: search.trim() || undefined, status, page, limit: 20 }),
    [page, search, status],
  );
  const mentorsQuery = useAdminMentors(query);
  const statusMutation = useUpdateAdminMentorStatus();
  const requiresProtectedAvatar = Boolean(
    selected &&
    selected.avatarUrl === API_ROUTES.ADMIN_MENTORS.AVATAR(selected.id),
  );
  const adminAvatarQuery = useAdminMentorAvatar(
    selected?.id,
    requiresProtectedAvatar,
  );
  const selectedAvatarUrl =
    reviewAvatarUrl ||
    (requiresProtectedAvatar ? undefined : (selected?.avatarUrl ?? undefined));
  const totalPages = Math.max(
    1,
    Math.ceil((mentorsQuery.data?.total ?? 0) / 20),
  );

  useEffect(() => {
    if (!adminAvatarQuery.data) {
      setReviewAvatarUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(adminAvatarQuery.data);
    setReviewAvatarUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [adminAvatarQuery.data]);

  const updateStatus = async (
    nextStatus: "APPROVED" | "REJECTED" | "SUSPENDED",
  ) => {
    if (!selected || (nextStatus === "REJECTED" && !reason.trim())) return;
    try {
      await statusMutation.mutateAsync({
        profileId: selected.id,
        payload: { status: nextStatus, rejectionReason: reason.trim() || null },
      });
      toast({ title: t("mentor.admin.updated") });
      setSelected(null);
      setReason("");
    } catch (error) {
      toast({
        title: t("mentor.marketplace.loadErrorTitle"),
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">
          {t("mentor.admin.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t("mentor.admin.subtitle")}
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t("mentor.admin.searchPlaceholder")}
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <Select
          value={status ?? "all"}
          onValueChange={(value) => {
            setStatus(
              value === "all" ? undefined : (value as MentorProfileStatus),
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("mentor.admin.allStatuses")}</SelectItem>
            {MENTOR_PROFILE_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`mentor.status.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[840px] text-left text-sm">
            <TableHeader className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <TableRow>
                <TableHead className="px-5 py-4">
                  {t("mentor.admin.profile")}
                </TableHead>
                <TableHead className="px-4 py-4">
                  {t("mentor.dashboard.domains")}
                </TableHead>
                <TableHead className="px-4 py-4">
                  {t("mentor.dashboard.status")}
                </TableHead>
                <TableHead className="px-4 py-4">
                  {t("mentor.admin.submitted")}
                </TableHead>
                <TableHead className="px-5 py-4 text-right">
                  {t("mentor.admin.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
              {mentorsQuery.isLoading
                ? Array.from({ length: 5 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={5} className="px-5 py-4">
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {mentorsQuery.data?.items.map((mentor) => (
                <TableRow
                  key={mentor.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60"
                >
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-xl">
                        <AvatarImage
                          src={getListAvatarUrl(mentor)}
                          alt={mentor.displayName}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-xl bg-primary text-xs font-bold text-primary-foreground">
                          {mentor.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {mentor.displayName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {mentor.headline || mentor.company}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 text-slate-600 dark:text-slate-300">
                    {mentor.domains.join(", ") || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <MentorStatusBadge status={mentor.status} />
                  </TableCell>
                  <TableCell className="px-4 py-4 text-slate-500">
                    {mentor.submittedAt
                      ? new Date(mentor.submittedAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(mentor);
                        setReason(mentor.rejectionReason ?? "");
                      }}
                      className="rounded-lg"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {t("mentor.admin.review")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!mentorsQuery.isLoading && !mentorsQuery.data?.items.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    {t("mentor.admin.empty")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        {mentorsQuery.data && totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 p-3 dark:border-slate-800">
            <Button
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              {t("mentor.marketplace.previous")}
            </Button>
            <span className="text-xs font-semibold text-slate-500">
              {t("mentor.marketplace.page", {
                current: page,
                total: totalPages,
              })}
            </span>
            <Button
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              {t("mentor.marketplace.next")}
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 rounded-xl">
                <AvatarImage
                  src={selectedAvatarUrl}
                  alt={selected?.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-xl bg-primary font-bold text-primary-foreground">
                  {selected?.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DialogTitle>{selected?.displayName}</DialogTitle>
                <DialogDescription>{selected?.headline}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selected ? (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <MentorStatusBadge status={selected.status} />
                {selected.domains.map((domain) => (
                  <span
                    key={domain}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-900"
                  >
                    {domain}
                  </span>
                ))}
              </div>
              <p className="whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">
                {selected.bio || selected.shortBio}
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.skills.map((skill) => (
                  <Badge
                    key={skill.id}
                    variant="secondary"
                    className="rounded-full"
                  >
                    {skill.displayName}
                  </Badge>
                ))}
              </div>
              <section className="rounded-xl border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-bold text-foreground">
                  {t("mentor.admin.verificationContact")}
                </h3>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Linkedin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {selected.linkedinUrl ? (
                      <a
                        href={selected.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-1 break-all font-semibold text-primary hover:underline"
                      >
                        {selected.linkedinUrl}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("mentor.admin.notProvided")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="font-semibold text-foreground">
                      {selected.phoneNumber || t("mentor.admin.notProvided")}
                    </span>
                  </div>
                </div>
              </section>
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {t("mentor.admin.reason")}
                </label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t("mentor.admin.reasonPlaceholder")}
                  rows={4}
                  className="mt-2 rounded-xl"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={statusMutation.isPending}
              onClick={() => void updateStatus("SUSPENDED")}
              className="rounded-xl text-orange-700"
            >
              <ShieldX className="mr-2 h-4 w-4" />
              {t("mentor.admin.suspend")}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={statusMutation.isPending || !reason.trim()}
                onClick={() => void updateStatus("REJECTED")}
                className="rounded-xl"
              >
                {t("mentor.admin.reject")}
              </Button>
              <Button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => void updateStatus("APPROVED")}
                className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              >
                {statusMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                {t("mentor.admin.approve")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getListAvatarUrl(mentor: MentorProfileDto): string | undefined {
  return mentor.avatarUrl === API_ROUTES.ADMIN_MENTORS.AVATAR(mentor.id)
    ? undefined
    : (mentor.avatarUrl ?? undefined);
}
