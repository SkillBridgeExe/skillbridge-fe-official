import { ArrowUpRight, CheckCircle2, Circle, Eye, FilePenLine, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MentorStatusBadge } from "@/components/mentor/MentorStatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyMentorProfile } from "@/hooks/use-mentors";
import { getMentorProfileCompletion } from "@/lib/mentor-marketplace";
import { QUERY_KEYS } from "@/constants/app";
import { getMyAvatarUrl, getSafeAvatarUrl, isProtectedAvatarUrl } from "@/services/user-profile.service";

export default function MentorOverview() {
  const { t } = useTranslation("common");
  const profileQuery = useMyMentorProfile();
  const profile = profileQuery.data;
  const avatarQuery = useQuery({
    queryKey: QUERY_KEYS.USER_AVATAR,
    queryFn: getMyAvatarUrl,
    enabled: isProtectedAvatarUrl(profile?.avatarUrl),
  });
  const avatarSrc = avatarQuery.data || getSafeAvatarUrl(profile?.avatarUrl);

  if (profileQuery.isLoading) return <OverviewSkeleton />;
  if (profileQuery.isError) return <ErrorPanel onRetry={() => void profileQuery.refetch()} />;

  if (!profile) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950 sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FilePenLine className="h-7 w-7" /></div>
        <h1 className="mt-6 text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{t("mentor.dashboard.emptyTitle")}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-500 dark:text-slate-400">{t("mentor.dashboard.emptyBody")}</p>
        <Button asChild className="mt-7 h-11 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"><Link to="/mentor-dashboard/profile">{t("mentor.dashboard.editProfile")}<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
      </section>
    );
  }

  const completion = getMentorProfileCompletion(profile);
  const statusMessage = profile.status === "PENDING_REVIEW"
    ? t("mentor.dashboard.pendingBody")
    : profile.status === "SUSPENDED"
      ? t("mentor.dashboard.suspendedBody")
      : profile.status === "APPROVED"
        ? t("mentor.dashboard.approvedBody")
        : profile.status === "REJECTED"
          ? profile.rejectionReason || t("mentor.dashboard.missingFields")
          : t("mentor.dashboard.missingFields");

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{t("mentor.dashboard.overview")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{t("mentor.dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 font-bold dark:border-slate-800"><Link to="/mentor-dashboard/profile"><FilePenLine className="mr-2 h-4 w-4" />{t("mentor.dashboard.editProfile")}</Link></Button>
          {profile.status === "APPROVED" ? <Button asChild className="h-11 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"><Link to={`/ecosystem/mentor/${profile.slug}`}><Eye className="mr-2 h-4 w-4" />{t("mentor.dashboard.viewPublic")}</Link></Button> : null}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t("mentor.dashboard.status")}</p><div className="mt-3"><MentorStatusBadge status={profile.status} /></div></div><ShieldCheck className="h-7 w-7 text-primary" /></div>
          <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">{statusMessage}</p>
          {profile.status === "REJECTED" && profile.rejectionReason ? <div className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200"><p className="font-bold">{t("mentor.dashboard.rejectionReason")}</p><p className="mt-1 leading-6">{profile.rejectionReason}</p></div> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t("mentor.dashboard.completion")}</p><span className="text-2xl font-black text-slate-950 dark:text-white">{completion.percentage}%</span></div>
          <Progress value={completion.percentage} className="mt-4 h-2" />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {[
              ["headline", t("mentor.dashboard.headline")],
              ["shortBio", t("mentor.dashboard.shortBio")],
              ["domains", t("mentor.dashboard.domains")],
              ["sessionPriceVnd", t("mentor.dashboard.price")],
              ["sessionDurationMinutes", t("mentor.dashboard.duration")],
              ["skills", t("mentor.dashboard.skills")],
              ["verificationContact", t("mentor.dashboard.verificationContact")],
            ].map(([field, label]) => {
              const missing = completion.missing.some((item) => item === field);
              return <div key={field} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">{missing ? <Circle className="h-4 w-4 text-slate-300 dark:text-slate-700" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}<span>{label}</span></div>;
            })}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 rounded-2xl"><AvatarImage src={avatarSrc} className="object-cover" /><AvatarFallback className="rounded-2xl bg-primary font-black text-primary-foreground">{profile.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{profile.displayName}</p><p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{profile.headline}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{profile.shortBio}</p></div>
        </div>
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return <div className="space-y-6"><Skeleton className="h-16 w-2/3" /><div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div><Skeleton className="h-44 rounded-2xl" /></div>;
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation("common");
  return <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center dark:border-rose-900 dark:bg-slate-950"><p className="font-bold text-slate-900 dark:text-white">{t("mentor.marketplace.loadErrorTitle")}</p><Button onClick={onRetry} className="mt-5 rounded-xl">{t("mentor.marketplace.retry")}</Button></div>;
}
