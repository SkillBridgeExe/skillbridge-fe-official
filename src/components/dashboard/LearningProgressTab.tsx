import { useQueries } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { isSessionCompleted } from "@/components/learning/session-progress";
import { useHasApiSession } from "@/hooks/use-api-session";
import { getLearningSessionProgress } from "@/services/learning-roadmap.service";

export default function LearningProgressTab() {
  const weeks = useActiveWeekPlans();
  const hasApiSession = useHasApiSession();
  const sessions = weeks.flatMap((week) => week.sessions);
  const progressQueries = useQueries({
    queries: sessions.map((session) => ({
      queryKey: ["learning", "session-progress", session.id],
      queryFn: () => getLearningSessionProgress(session.id),
      enabled: hasApiSession,
      staleTime: 30_000,
      retry: false,
    })),
  });

  if (!weeks.length) {
    return (
      <Empty
        icon={<BookOpen className="h-6 w-6" />}
        title="No learning roadmap yet"
        description="Generate a roadmap from a real CV/job match to track learning progress."
        action="Generate roadmap"
        to="/diagnosis"
      />
    );
  }

  const loading = progressQueries.some((query) => query.isLoading);
  const completedIds = new Set(
    sessions.flatMap((session, index) => {
      const remote = progressQueries[index]?.data;
      const complete = remote
        ? isSessionCompleted(session, remote)
        : session.status === "completed";
      return complete ? [session.id] : [];
    }),
  );
  const completed = completedIds.size;
  const percent = sessions.length
    ? Math.round((completed / sessions.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Real session progress
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {completed}/{sessions.length} sessions completed
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            )}
            <span className="text-2xl font-black text-primary">{percent}%</span>
          </div>
        </div>
        <div className="mt-5 h-3 rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
            style={{ width: `${percent}%` }}
          />
        </div>
      </section>

      <div className="space-y-4">
        {weeks.map((week) => (
          <section
            key={week.weekNumber}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4">
              <p className="text-xs font-bold text-primary">
                WEEK {week.weekNumber}
              </p>
              <h3 className="font-bold text-slate-900">{week.moduleTitle}</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {week.sessions.map((session) => {
                const done = completedIds.has(session.id);
                return (
                  <Link
                    key={session.id}
                    to={`/learning/session/${encodeURIComponent(session.id)}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">
                        {session.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {session.estimatedMinutes} minutes
                      </p>
                    </div>
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {progressQueries.some((query) => query.isError) && (
        <p className="flex items-center gap-2 text-xs text-amber-700">
          <AlertCircle className="h-4 w-4" />
          Some server progress was unavailable; stored roadmap status is shown
          for those sessions.
        </p>
      )}
    </div>
  );
}

function Empty({
  icon,
  title,
  description,
  action,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  to: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-600">
        {icon}
      </div>
      <h2 className="font-bold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      <Link className="mt-5 font-semibold text-primary" to={to}>
        {action}
      </Link>
    </div>
  );
}
