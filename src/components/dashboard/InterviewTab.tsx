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
import { buildInterviewSummary, isQuotaError } from "./dashboard-view-model";

export default function InterviewTab() {
  const query = useInterviewHistory(true, { page: 1, limit: 20 });
  const items = query.data?.items ?? [];
  const summary = buildInterviewSummary(items);

  if (query.isLoading)
    return (
      <Centered
        icon={<Loader2 className="h-6 w-6 animate-spin" />}
        title="Loading interview history"
      />
    );
  if (query.isError)
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
  if (!items.length)
    return (
      <Centered
        icon={<Video className="h-6 w-6" />}
        title="No interview sessions yet"
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={<Trophy />}
          label="Completed"
          value={String(summary.completed)}
        />
        <Metric
          icon={<Video />}
          label="Overall"
          value={score(summary.averageOverall)}
        />
        <Metric
          icon={<Trophy />}
          label="Technical"
          value={score(summary.averageSemantic)}
        />
        <Metric
          icon={<MessageSquare />}
          label="Communication"
          value={score(summary.averageCommunication)}
        />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Recent sessions</h2>
            <p className="text-xs text-slate-500">
              Scores returned by the interview API
            </p>
          </div>
          <Link to="/interview" className="text-sm font-semibold text-primary">
            Practice again
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-5"
            >
              <div>
                <p className="font-semibold text-slate-800">
                  {item.targetRole.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(item.startedAt).toLocaleDateString()} ·{" "}
                  {item.interviewType}
                </p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {item.status}
              </span>
              <span className="font-black text-primary">
                {item.overallScore == null
                  ? "—"
                  : Math.round(item.overallScore)}
              </span>
            </div>
          ))}
        </div>
      </section>
      <p className="text-xs text-slate-500">
        Vocal pacing and personality traits are hidden because the current API
        does not provide those measurements.
      </p>
    </div>
  );
}

function score(value: number | null) {
  return value == null ? "—" : `${value}%`;
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 h-5 w-5 text-primary">{icon}</div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
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
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
      {icon}
      <h2 className="font-bold text-slate-900">{title}</h2>
      {action}
    </div>
  );
}
