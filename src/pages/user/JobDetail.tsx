import { FormEvent, useState } from "react";
import { ExternalLink, MapPin, RefreshCw } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { useJobApplicationCvs } from "@/hooks/use-job-application-cvs";
import { useApplyToJobMutation, useJobDetailQuery } from "@/hooks/use-jobs";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/useAuthStore";
import type { PublicJobContentDto, PublicJobDto } from "@/types/jobs";
import { getExternalJobApplyUrl } from "./job-access";

const CONSENT_VERSION = "job-apply-v1";
const DUPLICATE_CODES = new Set(["DUPLICATE_APPLICATION", "ALREADY_APPLIED", "JOB_ALREADY_APPLIED"]);
const EXPIRED_CODES = new Set(["JOB_EXPIRED", "JOB_CLOSED", "APPLICATION_CLOSED"]);
const VERSION_CODES = new Set(["JOB_VERSION_CHANGED", "STALE_JOB_VERSION", "JOB_VERSION_MISMATCH"]);

function formatSalary(job: PublicJobDto): string | null {
  const { salary } = job;
  if (!salary.visible) return null;
  if (salary.min == null && salary.max == null) return salary.negotiable ? "Negotiable" : null;
  const display = (amount: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
  const range = [salary.min, salary.max].filter((amount): amount is number => amount != null).map(display).join(" – ");
  const period = salary.period === "MONTH" ? "/ month" : salary.period === "YEAR" ? "/ year" : "";
  return `${range} ${salary.currency}${period}`;
}

function formatDeadline(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

function isExpired(job: PublicJobDto) {
  return Boolean(job.expiresAt && new Date(job.expiresAt).getTime() <= Date.now());
}

function ContentList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
        {values.map((value) => <li key={value}>{value}</li>)}
      </ul>
    </section>
  );
}

function JobContent({ content }: { content: PublicJobContentDto | null }) {
  if (!content) return null;
  return (
    <div className="space-y-7">
      {content.summary ? <section><h2 className="text-lg font-bold text-slate-900">About this role</h2><p className="mt-3 text-sm leading-6 text-slate-700">{content.summary}</p></section> : null}
      <ContentList title="Responsibilities" values={content.responsibilities} />
      <ContentList title="Requirements" values={content.requirements} />
      <ContentList title="Nice to have" values={content.niceToHave} />
      <ContentList title="Benefits" values={content.benefits} />
    </div>
  );
}

function DetailUnavailable({ title, description, retry }: { title: string; description: string; retry?: () => void }) {
  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-slate-600">{description}</p>
        {retry ? <button type="button" onClick={retry} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white"><RefreshCw size={16} />Retry</button> : null}
      </div>
    </Layout>
  );
}

export default function JobDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const [cvId, setCvId] = useState("");
  const [phone, setPhone] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState<string | null>(null);
  const authSource = useAuthStore((state) => state.authSource);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.currentUser);
  const detailQuery = useJobDetailQuery(slug);
  const eligibleCandidate = authSource === "api" && isAuthenticated && currentUser?.role === "user";
  const cvsQuery = useJobApplicationCvs(currentUser?.id, eligibleCandidate);
  const applyMutation = useApplyToJobMutation();
  const { toast } = useToast();

  if (detailQuery.isLoading) {
    return <DetailUnavailable title="Loading job…" description="Please wait while we load this opportunity." />;
  }

  if (detailQuery.isError) {
    const code = getApiErrorCode(detailQuery.error);
    if (code === "NOT_FOUND" || code === "JOB_NOT_FOUND") {
      return <DetailUnavailable title="Job not found" description="This job may have been removed or the link is incorrect." />;
    }
    return <DetailUnavailable title="Could not load this job" description={getApiErrorMessage(detailQuery.error, "Please try again.")} retry={() => detailQuery.refetch()} />;
  }

  const job = detailQuery.data;
  if (!job) {
    return <DetailUnavailable title="Job not found" description="This job may have been removed or the link is incorrect." />;
  }

  const expired = isExpired(job);
  const deadline = formatDeadline(job.expiresAt);
  const isExternal = job.applicationMode === "EXTERNAL";
  const externalApplyUrl = getExternalJobApplyUrl({
    isAuthenticated,
    role: currentUser?.role,
  }, job.sourceUrl);
  const canApply = job.canApply && !expired && Boolean(job.currentVersionId);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser || !job.currentVersionId || !cvId || !consent) return;
    setApplicationMessage(null);
    try {
      await applyMutation.mutateAsync({
        jobId: job.id,
        body: {
          jobVersionId: job.currentVersionId,
          cvId,
          candidateName: currentUser.name,
          candidateEmail: currentUser.email,
          ...(phone.trim() ? { candidatePhone: phone.trim() } : {}),
          ...(coverNote.trim() ? { coverNote: coverNote.trim() } : {}),
          consentAccepted: true,
          consentVersion: CONSENT_VERSION,
        },
      });
      setSubmitted(true);
      setApplicationMessage("Application submitted");
      toast({ title: "Application submitted", description: "The employer can now review your application." });
    } catch (error) {
      const code = getApiErrorCode(error);
      if (code && DUPLICATE_CODES.has(code)) {
        setSubmitted(true);
        setApplicationMessage("You have already applied to this job.");
      } else if (code && VERSION_CODES.has(code)) {
        setApplicationMessage("This job changed while you were applying. Refresh the page and review the latest version.");
      } else if (code && EXPIRED_CODES.has(code)) {
        setApplicationMessage("This job is no longer accepting applications.");
      } else {
        setApplicationMessage(getApiErrorMessage(error, "We could not submit your application. Please try again."));
      }
    }
  };

  return (
    <Layout>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            {job.company.logoUrl ? <img src={job.company.logoUrl} alt={job.company.name} className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-100 font-bold text-sky-700">{job.company.name.slice(0, 2).toUpperCase()}</div>}
            <div>
              <p className="font-semibold text-sky-700">{job.company.name}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{job.title}</h1>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                {job.location ? <span className="inline-flex items-center gap-1"><MapPin size={15} />{job.location}</span> : null}
                {formatSalary(job) ? <span>{formatSalary(job)}</span> : null}
                {deadline ? <span>Apply by {deadline}</span> : null}
              </div>
            </div>
          </div>
          {expired ? <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">This job has expired and is no longer accepting applications.</p> : null}
          {!expired && !job.canApply ? <p className="mt-6 rounded-lg bg-slate-100 p-3 text-sm font-medium text-slate-700">Applications for this job are closed.</p> : null}
          <div className="mt-8"><JobContent content={job.content} /></div>
        </article>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {isExternal && externalApplyUrl && !expired ? (
            <a href={externalApplyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-700">
              Apply on company site <ExternalLink size={16} />
            </a>
          ) : null}
          {!isExternal && !isAuthenticated ? (
            <button type="button" onClick={() => setLoginOpen(true)} className="w-full rounded-lg bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-700">Log in to apply</button>
          ) : null}
          {!isExternal && isAuthenticated && !eligibleCandidate ? <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">Only candidate accounts can apply to jobs. You can still review this listing.</p> : null}
          {!isExternal && eligibleCandidate && canApply ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-slate-900">Apply with SkillBridge</h2>
              <label className="block text-sm font-semibold text-slate-700">Candidate name<input value={currentUser.name} readOnly className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2" /></label>
              <label className="block text-sm font-semibold text-slate-700">Candidate email<input value={currentUser.email} readOnly className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2" /></label>
              <label className="block text-sm font-semibold text-slate-700">CV<select aria-label="CV" value={cvId} onChange={(event) => setCvId(event.target.value)} required disabled={cvsQuery.isLoading} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2"><option value="">Select a CV</option>{cvsQuery.data?.items.map((cv) => <option key={cv.id} value={cv.id}>{cv.title || cv.originalFileName || "Untitled CV"}</option>)}</select></label>
              {cvsQuery.isError ? <p className="text-sm text-red-600">Could not load your CVs. <button type="button" className="underline" onClick={() => cvsQuery.refetch()}>Retry</button></p> : null}
              <label className="block text-sm font-semibold text-slate-700">Phone<input aria-label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2" /></label>
              <label className="block text-sm font-semibold text-slate-700">Cover note (optional)<textarea value={coverNote} onChange={(event) => setCoverNote(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" /></label>
              <label className="flex gap-2 text-sm text-slate-700"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I agree to share my application details with this employer.</label>
              {applicationMessage ? <p className="text-sm font-medium text-slate-700">{applicationMessage}</p> : null}
              <button type="submit" disabled={!cvId || !consent || submitted || applyMutation.isPending} className="w-full rounded-lg bg-sky-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{submitted ? "Application submitted" : applyMutation.isPending ? "Submitting…" : "Submit application"}</button>
            </form>
          ) : null}
        </aside>
      </div>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} redirectTo={`${location.pathname}${location.search}${location.hash}`} />
    </Layout>
  );
}
