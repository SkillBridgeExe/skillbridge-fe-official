import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Loader2,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useJobRecommendationsQuery } from "@/hooks/use-diagnosis";
import { useMyApplicationsQuery } from "@/hooks/use-jobs";
import { matchScoreBand } from "@/lib/match-score-band";
import { isQuotaError } from "./dashboard-view-model";

interface CareerTabProps {
  cvId: string | null;
}

export default function CareerTab({ cvId }: CareerTabProps) {
  const recommendations = useJobRecommendationsQuery(cvId, { limit: 5 });
  const applications = useMyApplicationsQuery({ page: 1, limit: 20 });
  const jobs = recommendations.data?.recommendations ?? [];
  const applicationItems = applications.data?.items ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">Job recommendations</h2>
            <p className="mt-1 text-xs text-slate-500">
              Matched against your latest scanned CV
            </p>
          </div>
          <Link to="/jobs" className="text-sm font-semibold text-primary">
            Browse jobs
          </Link>
        </div>
        {!cvId ? (
          <Empty
            icon={<Briefcase className="h-5 w-5" />}
            text="Scan a CV to receive job matches."
            link="/diagnosis"
            label="Scan CV"
          />
        ) : recommendations.isLoading ? (
          <Loading />
        ) : recommendations.isError ? (
          <Empty
            icon={<AlertCircle className="h-5 w-5" />}
            text={
              isQuotaError(recommendations.error)
                ? "Recommendation quota is exhausted."
                : "Recommendations could not be loaded."
            }
            link={isQuotaError(recommendations.error) ? "/pricing" : "/jobs"}
            label={
              isQuotaError(recommendations.error) ? "View plans" : "Browse jobs"
            }
          />
        ) : jobs.length ? (
          <div className="space-y-3">
            {jobs.map((job) => (
              <article
                key={job.job_id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {job.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {job.company_name}
                    </p>
                    {job.location && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-sm font-black ${
                      matchScoreBand(
                        Math.round(job.recommendation_score ?? job.match_score),
                      ).chip
                    }`}
                  >
                    {Math.round(job.recommendation_score ?? job.match_score)}%
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={<Briefcase className="h-5 w-5" />}
            text="No matching jobs are currently available in the pool."
            link="/jobs"
            label="Browse all jobs"
          />
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="font-bold text-slate-900">Applications</h2>
          <p className="mt-1 text-xs text-slate-500">
            Your real application status history
          </p>
        </div>
        {applications.isLoading ? (
          <Loading />
        ) : applications.isError ? (
          <Empty
            icon={<AlertCircle className="h-5 w-5" />}
            text="Applications could not be loaded."
            link="/jobs"
            label="Open jobs"
          />
        ) : applicationItems.length ? (
          <div className="divide-y divide-slate-100">
            {applicationItems.map((application) => (
              <div
                key={application.id}
                className="flex items-start justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {application.job?.title || "Job unavailable"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {application.job?.companyName || "Company unavailable"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Applied{" "}
                    {new Date(application.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {application.status.replaceAll("_", " ")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon={<Briefcase className="h-5 w-5" />}
            text="You have not applied to a job yet."
            link="/jobs"
            label="Find jobs"
          />
        )}
      </section>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-40 items-center justify-center text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
function Empty({
  icon,
  text,
  link,
  label,
}: {
  icon: React.ReactNode;
  text: string;
  link: string;
  label: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl bg-slate-50 p-5 text-center">
      <div className="text-slate-400">{icon}</div>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
      <Link
        to={link}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
