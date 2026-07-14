import {
  AlertCircle,
  ArrowRight,
  Loader2,
  MessageSquare,
  Trophy,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useInterviewHistory } from "@/hooks/use-interview";
import {
  buildInterviewSummary,
  isQuotaError,
  selectScoredInterviews,
} from "./dashboard-view-model";

const DASHBOARD_HISTORY_LIMIT = 10;
const VISIBLE_SESSION_LIMIT = 5;

export default function InterviewTab() {
  const query = useInterviewHistory(true, {
    page: 1,
    limit: DASHBOARD_HISTORY_LIMIT,
    scoredOnly: true,
  });
  const scoredItems = selectScoredInterviews(query.data?.items ?? []);
  const recentItems = scoredItems.slice(0, VISIBLE_SESSION_LIMIT);
  const summary = buildInterviewSummary(scoredItems);
  const scoredTotal = query.data?.total ?? scoredItems.length;

  if (query.isLoading) {
    return (
      <Centered
        icon={<Loader2 className="h-6 w-6 animate-spin" />}
        title="Loading interview history"
      />
    );
  }

  if (query.isError) {
    return (
      <Centered
        icon={<AlertCircle className="h-6 w-6" />}
        title={
          isQuotaError(query.error)
            ? "Interview quota is exhausted"
            : "Interview history could not be loaded"
        }
        action={
          <Link
            to={isQuotaError(query.error) ? "/pricing" : "/interview"}
            className="font-semibold text-primary"
          >
            {isQuotaError(query.error) ? "View plans" : "Open interview prep"}
          </Link>
        }
      />
    );
  }

  if (!scoredItems.length) {
    return (
      <Centered
        icon={<Video className="h-6 w-6" />}
        title="No scored interviews yet"
        action={
          <Link
            to="/interview"
            className="inline-flex items-center gap-2 font-semibold text-primary"
          >
            Start an interview <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Trophy />}
          label="Scored sessions"
          value={String(scoredTotal)}
        />
        <Metric
          icon={<Video />}
          label="Overall"
          value={formatAverageScore(summary.averageOverall)}
        />
        <Metric
          icon={<Trophy />}
          label="Technical"
          value={formatAverageScore(summary.averageSemantic)}
        />
        <Metric
          icon={<MessageSquare />}
          label="Communication"
          value={formatAverageScore(summary.averageCommunication)}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-bold text-slate-900">Recent sessions</h2>
            <p className="text-xs text-slate-500">
              Your five latest scored interview results
            </p>
          </div>
          <Link to="/interview" className="text-sm font-semibold text-primary">
            Practice again
          </Link>
        </div>

        <div className="divide-y divide-slate-100 px-4 sm:px-5">
          {recentItems.map((item) => (
            <div
              key={item.id}
              data-testid="interview-session-row"
              className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(330px,auto)] lg:items-center lg:gap-6"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold capitalize text-slate-800">
                  {item.targetRole.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(item.startedAt).toLocaleDateString()} / {item.interviewType}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <SessionScore label="Overall" value={item.overallScore} primary />
                <SessionScore label="Technical" value={item.semanticScore} />
                <SessionScore
                  label="Communication"
                  value={item.communicationScore}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatAverageScore(value: number | null) {
  return value == null ? "N/A" : `${value}%`;
}

function SessionScore({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: number | null;
  primary?: boolean;
}) {
  const display = value == null ? "N/A" : String(Math.round(value));

  return (
    <div
      aria-label={`${label} score ${display}`}
      className={
        primary
          ? "min-w-0 rounded-xl bg-primary/10 px-2 py-2.5 text-center"
          : "min-w-0 rounded-xl bg-slate-50 px-2 py-2.5 text-center"
      }
    >
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={
          primary
            ? "mt-0.5 font-black text-primary"
            : "mt-0.5 font-bold text-slate-800"
        }
      >
        {display}
      </p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 h-4 w-4 text-primary [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function Centered({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
      {icon}
      <h2 className="font-bold text-slate-900">{title}</h2>
      {action}
    </div>
  );
}
