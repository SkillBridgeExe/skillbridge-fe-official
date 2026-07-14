import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Loader2,
  Map,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { CvDto } from "@shared/api";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { isQuotaError } from "./dashboard-view-model";

interface OverviewTabProps {
  cv: CvDto | null;
  isLoading: boolean;
  error: unknown;
}

export default function OverviewTab({
  cv,
  isLoading,
  error,
}: OverviewTabProps) {
  const weeks = useActiveWeekPlans();

  if (isLoading) {
    return (
      <StateCard
        icon={<Loader2 className="h-6 w-6 animate-spin" />}
        title="Loading your dashboard"
        description="Fetching your latest CV diagnosis."
      />
    );
  }
  if (error) {
    const quota = isQuotaError(error);
    return (
      <StateCard
        icon={<AlertCircle className="h-6 w-6" />}
        title={
          quota
            ? "Your CV analysis quota is exhausted"
            : "Dashboard data could not be loaded"
        }
        description={
          quota
            ? "Upgrade your plan to run more CV analyses."
            : "Please refresh and try again."
        }
        action={
          <Link
            className="font-semibold text-primary"
            to={quota ? "/pricing" : "/diagnosis"}
          >
            {quota ? "View plans" : "Open diagnosis"}
          </Link>
        }
      />
    );
  }
  if (!cv) {
    return (
      <StateCard
        icon={<FileSearch className="h-6 w-6" />}
        title="Scan your first CV"
        description="Your real score, recommendations and roadmap will appear here after a diagnosis."
        action={
          <Link
            className="inline-flex items-center gap-2 font-semibold text-primary"
            to="/diagnosis"
          >
            Start CV diagnosis <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
    );
  }

  const review = cv.review;
  const actions = review?.top_summary?.prioritized_actions ?? [];
  const headline = review?.top_summary?.headline || "Your latest CV diagnosis";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Latest scan
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {headline}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {cv.title || cv.originalFileName || "Uploaded CV"}
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center">
            <p className="text-2xl font-black text-primary">
              {review?.overall_score == null
                ? "—"
                : Math.round(review.overall_score)}
            </p>
            <p className="text-[11px] font-bold uppercase text-slate-500">
              CV score
            </p>
          </div>
        </div>
        <h3 className="mb-3 font-bold text-slate-800">Priority actions</h3>
        {actions.length ? (
          <ul className="space-y-3">
            {actions.map((action) => (
              <li
                key={action}
                className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {action}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            No prioritized actions were returned for this scan.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
            <Map className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Learning roadmap</h2>
            <p className="text-xs text-slate-500">
              Generated from your real skill gaps
            </p>
          </div>
        </div>
        {weeks.length ? (
          <div className="space-y-3">
            {weeks.slice(0, 4).map((week) => {
              const completed = week.sessions.filter(
                (session) => session.status === "completed",
              ).length;
              return (
                <div
                  key={week.weekNumber}
                  className="rounded-xl border border-slate-100 p-3"
                >
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-800">
                      Week {week.weekNumber}
                    </span>
                    <span className="text-xs text-slate-500">
                      {completed}/{week.sessions.length} sessions
                    </span>
                  </div>
                </div>
              );
            })}
            <Link
              to="/learning"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              Continue learning <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Generate a roadmap from a CV/job match to see progress here.
          </p>
        )}
      </section>
    </div>
  );
}

function StateCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="mb-4 rounded-full bg-slate-100 p-3 text-slate-600">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-lg text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
