import { CalendarDays, CalendarCheck2, Eye, LayoutDashboard, UserRoundPen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useMyMentorProfile } from "@/hooks/use-mentors";
import { cn } from "@/lib/utils";

export default function MentorDashboardShell() {
  const { t } = useTranslation("common");
  const profileQuery = useMyMentorProfile();
  const publicSlug = profileQuery.data?.status === "APPROVED" ? profileQuery.data.slug : null;
  const items = [
    { to: "/mentor-dashboard", label: t("mentor.dashboard.overview"), icon: LayoutDashboard, end: true },
    { to: "/mentor-dashboard/profile", label: t("mentor.dashboard.editProfile"), icon: UserRoundPen, end: false },
    { to: "/mentor-dashboard/availability", label: t("mentor.dashboard.availability", "Lịch trống"), icon: CalendarDays, end: false },
    { to: "/mentor-dashboard/requests", label: t("mentor.dashboard.requests", "Yêu cầu"), icon: CalendarCheck2, end: false },
  ];

  return (
    <Layout>
      <main className="min-h-dvh bg-slate-50/70 dark:bg-slate-950">
        <div className="mx-auto grid max-w-[1440px] items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 lg:py-10">
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_50px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none lg:sticky lg:top-24">
            <div className="hidden px-3 pb-4 pt-2 lg:block">
              <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{t("mentor.dashboard.title")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t("mentor.dashboard.status")}</p>
            </div>
            <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Mentor dashboard">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {publicSlug ? (
              <Button asChild variant="outline" className="mt-3 hidden h-11 w-full rounded-xl border-slate-200 font-bold dark:border-slate-800 lg:flex">
                <Link to={`/ecosystem/mentor/${publicSlug}`}><Eye className="mr-2 h-4 w-4" />{t("mentor.dashboard.viewPublic")}</Link>
              </Button>
            ) : null}
          </aside>
          <div className="min-w-0"><Outlet /></div>
        </div>
      </main>
    </Layout>
  );
}
