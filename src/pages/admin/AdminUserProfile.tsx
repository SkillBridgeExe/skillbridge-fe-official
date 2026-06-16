import { useMemo, type ElementType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, CreditCard, FileText, Mail, ShieldCheck, Video } from "lucide-react";
import { AdminLineChartCard } from "@/components/admin/AdminCharts";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_KEYS } from "@/constants/app";
import { getAdminUser, type AdminUserDetail } from "@/services/admin-users.service";

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function initials(user?: AdminUserDetail) {
  const source = user?.displayName || user?.email || "U";
  return source.slice(0, 2).toUpperCase();
}

export default function AdminUserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_USER(id ?? ""),
    queryFn: () => getAdminUser(id ?? ""),
    enabled: Boolean(id),
  });

  const user = userQuery.data;
  const monthlyCvData = useMemo(
    () =>
      (user?.monthlyActivitySeries ?? []).map((item) => ({
        month: item.month,
        cvCount: item.cvCount,
      })),
    [user?.monthlyActivitySeries],
  );
  const monthlyRevenueData = useMemo(
    () =>
      (user?.monthlyActivitySeries ?? []).map((item) => ({
        month: item.month,
        paidAmountVnd: item.paidAmountVnd,
      })),
    [user?.monthlyActivitySeries],
  );

  if (userQuery.isLoading) {
    return (
      <div className="flex flex-col gap-5 pb-10">
        <Skeleton className="h-44 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4 pb-10">
        <Button variant="ghost" className="w-fit" onClick={() => navigate("/admin/users")}>
          <ArrowLeft data-icon="inline-start" />
          Back to users
        </Button>
        <Card>
          <CardContent className="p-10 text-center">
            <div className="text-lg font-semibold text-foreground">User not available</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {userQuery.error instanceof Error ? userQuery.error.message : "The user profile could not be loaded."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Button variant="ghost" className="w-fit" onClick={() => navigate("/admin/users")}>
        <ArrowLeft data-icon="inline-start" />
        Back to users
      </Button>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="h-24 bg-primary/10" />
        <CardContent className="p-6">
          <div className="-mt-16 flex flex-col gap-5 md:flex-row md:items-end">
            <Avatar className="size-28 border-4 border-card shadow-lg">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl font-bold">{initials(user)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-8 md:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-3xl font-bold tracking-normal text-foreground">
                  {user.displayName || "No display name"}
                </h1>
                <AdminStatusBadge status={user.status} />
                {user.isEmailVerified ? (
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-[hsl(var(--status-success-border))] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))] [&_svg]:size-3.5"
                  >
                    <ShieldCheck />
                    Verified
                  </Badge>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-4" />
                  {user.email}
                </span>
                <span>Joined {formatDate(user.createdAt)}</span>
                <span>Last login {formatDate(user.lastLoginAt)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <Badge key={role} variant="outline" className="rounded-full">
                    {role}
                  </Badge>
                ))}
                {user.authProviders.map((provider) => (
                  <Badge key={provider} variant="secondary" className="rounded-full">
                    {provider}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="CVs" value={user.activityCounts.cvCount} icon={FileText} />
        <Metric title="Matches" value={user.activityCounts.matchCount} icon={ShieldCheck} />
        <Metric title="Interviews" value={user.activityCounts.interviewCount} icon={Video} />
        <Metric title="Paid" value={formatVnd(user.activityCounts.paidAmountVnd)} icon={CreditCard} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Account profile fields from the users API.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Detail label="University" value={user.profile?.university} />
            <Detail label="Major" value={user.profile?.major} />
            <Detail label="Experience" value={user.profile?.experienceYears != null ? `${user.profile.experienceYears} years` : null} />
            <Detail label="Target job" value={user.profile?.targetJob} />
            <Detail label="GitHub" value={user.profile?.githubUrl} />
            <Detail label="LinkedIn" value={user.profile?.linkedinUrl} />
            <Detail label="Portfolio" value={user.profile?.portfolioUrl} />
            <Detail label="Career goal" value={user.profile?.careerGoal} className="sm:col-span-2" />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>Skills mapped from user skill records.</CardDescription>
          </CardHeader>
          <CardContent>
            {user.skills.length ? (
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <Badge key={skill.id} variant="outline" className="px-3 py-1.5">
                    {skill.displayName} L{skill.level}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyState title="No skills yet" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminLineChartCard
          title="Monthly CV activity"
          xKey="month"
          dataKey="cvCount"
          data={monthlyCvData as unknown as Record<string, unknown>[]}
        />
        <AdminLineChartCard
          title="Monthly paid revenue"
          xKey="month"
          dataKey="paidAmountVnd"
          valueFormatter={formatVnd}
          data={monthlyRevenueData as unknown as Record<string, unknown>[]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <RecentCvs user={user} />
        <RecentInterviews user={user} />
        <RecentPayments user={user} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Active plans and recent subscription records.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Active plans</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {user.subscription.activePlanCodes.length ? (
                  user.subscription.activePlanCodes.map((plan) => (
                    <Badge key={plan} className="rounded-full">
                      {plan}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No active plan</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {user.subscription.recent.length ? (
                user.subscription.recent.map((subscription) => (
                  <div key={subscription.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="font-semibold text-foreground">{subscription.planCode}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {subscription.status} / {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="No subscription records" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Recent usage events</CardTitle>
            <CardDescription>Latest product usage events recorded for this user.</CardDescription>
          </CardHeader>
          <CardContent>
            {user.usageEvents.length ? (
              <div className="flex flex-col gap-2">
                {user.usageEvents.slice(0, 8).map((event, index) => (
                  <div key={`${event.featureKey}-${event.usedAt}-${index}`} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <div className="font-semibold text-foreground">{event.featureKey}</div>
                      <div className="text-xs text-muted-foreground">{event.sourceType ?? "Usage event"}</div>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">{formatDate(event.usedAt)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No usage events" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: ElementType;
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-sm font-semibold text-muted-foreground">{title}</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-normal text-foreground tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        </div>
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5">
          <Icon />
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">
        {value || "Not provided"}
      </div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center text-sm font-semibold text-muted-foreground">
      {title}
    </div>
  );
}

function RecentCvs({ user }: { user: AdminUserDetail }) {
  return (
    <RecentCard title="Recent CVs" description="Latest uploaded or built CV records.">
      {user.recentCvs.length ? (
        user.recentCvs.map((cv) => (
          <ListRow
            key={cv.id}
            title={cv.title || cv.originalFileName || "Untitled CV"}
            detail={cv.targetRole || "No target role"}
            date={formatDate(cv.createdAt)}
          />
        ))
      ) : (
        <EmptyState title="No CV activity" />
      )}
    </RecentCard>
  );
}

function RecentInterviews({ user }: { user: AdminUserDetail }) {
  return (
    <RecentCard title="Recent interviews" description="Latest interview sessions.">
      {user.recentInterviews.length ? (
        user.recentInterviews.map((interview) => (
          <ListRow
            key={interview.id}
            title={interview.targetRole}
            detail={`${interview.status}${interview.overallScore ? ` / ${interview.overallScore}` : ""}`}
            date={formatDate(interview.startedAt)}
          />
        ))
      ) : (
        <EmptyState title="No interview activity" />
      )}
    </RecentCard>
  );
}

function RecentPayments({ user }: { user: AdminUserDetail }) {
  return (
    <RecentCard title="Recent payments" description="Latest payment orders.">
      {user.recentPayments.length ? (
        user.recentPayments.map((payment) => (
          <ListRow
            key={payment.id}
            title={formatVnd(payment.amountVnd)}
            detail={`${payment.status}${payment.planCode ? ` / ${payment.planCode}` : ""}`}
            date={formatDate(payment.paidAt ?? payment.createdAt)}
          />
        ))
      ) : (
        <EmptyState title="No payment activity" />
      )}
    </RecentCard>
  );
}

function RecentCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}

function ListRow({
  title,
  detail,
  date,
}: {
  title: string;
  detail: string;
  date: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-foreground">{title}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{detail}</div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Calendar className="size-3.5" />
          {date}
        </div>
      </div>
    </div>
  );
}
