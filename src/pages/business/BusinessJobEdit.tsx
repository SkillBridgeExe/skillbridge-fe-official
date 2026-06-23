import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import {
  ArrowLeft,
  Bot,
  Briefcase,
  CheckCircle,
  Loader2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import {
  useBusinessJobDetailQuery,
  useExtractJobSkillsMutation,
  usePublishJobMutation,
  useUpdateJobDraftMutation,
} from "@/hooks/use-business-jobs";
import { useToast } from "@/hooks/use-toast";
import type { EmploymentType, ExperienceLevel, SalaryPeriod, WorkMode } from "@/types/jobs";
import {
  draftToBusinessJobForm,
  formToUpdateJobDraftRequest,
  type BusinessJobFormState,
} from "./business-job-form";

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "FULL_TIME",
  "PART_TIME",
  "INTERNSHIP",
  "CONTRACT",
  "FREELANCE",
];
const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "INTERN",
  "FRESHER",
  "JUNIOR",
  "MIDDLE",
  "SENIOR",
  "LEAD",
];
const WORK_MODES: WorkMode[] = ["ONSITE", "HYBRID", "REMOTE"];
const SALARY_PERIODS: SalaryPeriod[] = ["MONTH", "YEAR"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800",
        "outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100",
        props.disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
      ].join(" ")}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800",
        "outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100",
        props.disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
      ].join(" ")}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800",
        "outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100",
        props.disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "",
      ].join(" ")}
    />
  );
}

export default function BusinessJobEdit() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const detailQuery = useBusinessJobDetailQuery(jobId);
  const updateMutation = useUpdateJobDraftMutation();
  const extractMutation = useExtractJobSkillsMutation();
  const publishMutation = usePublishJobMutation();
  const [form, setForm] = useState<BusinessJobFormState | null>(null);

  const editableVersion = detailQuery.data?.draft ?? null;
  const displayVersion = detailQuery.data?.draft ?? detailQuery.data?.published ?? null;
  const canEdit = !!editableVersion && !!form;
  const canSubmitDraft = canEdit && !!form.title.trim();
  const isSaving = updateMutation.isPending;
  const isPublishing = publishMutation.isPending;
  const isExtracting = extractMutation.isPending;

  useEffect(() => {
    if (displayVersion) {
      setForm(draftToBusinessJobForm(displayVersion));
    }
  }, [displayVersion]);

  const skillsSummary = useMemo(() => {
    const skills = displayVersion?.skills ?? [];
    if (skills.length === 0) return "No confirmed skills yet";
    return `${skills.length} skill${skills.length > 1 ? "s" : ""} detected`;
  }, [displayVersion]);

  const setField = <K extends keyof BusinessJobFormState>(
    key: K,
    value: BusinessJobFormState[K],
  ) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = () => {
    if (!jobId || !editableVersion || !form) return;
    updateMutation.mutate(
      {
        jobId,
        body: formToUpdateJobDraftRequest(form, editableVersion.revision),
      },
      {
        onSuccess: () => {
          toast({ title: "Draft saved", description: "Your job draft has been updated." });
        },
      },
    );
  };

  const handleExtractSkills = () => {
    if (!jobId || !editableVersion) return;
    extractMutation.mutate(
      { jobId, revision: editableVersion.revision },
      {
        onSuccess: () => {
          toast({ title: "Skills extracted", description: "Review the detected skills before publishing." });
        },
      },
    );
  };

  const handlePublish = () => {
    if (!jobId || !editableVersion) return;
    publishMutation.mutate(
      { jobId, revision: editableVersion.revision },
      {
        onSuccess: () => {
          toast({ title: "Job published", description: "Your job is now visible to candidates." });
          navigate("/business/jobs");
        },
      },
    );
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              to="/business/jobs"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-sky-600"
            >
              <ArrowLeft size={16} />
              Back to jobs
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Edit job draft</h1>
            <p className="mt-1 text-sm text-slate-500">
              Update the draft, extract skills, then publish when it is ready.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExtractSkills}
              disabled={!canEdit || isExtracting || isSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Extract skills
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmitDraft || isSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save draft
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canSubmitDraft || isPublishing || isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Publish
            </button>
          </div>
        </div>

        {detailQuery.isLoading && (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-sm text-slate-500">
            Loading job draft...
          </div>
        )}

        {detailQuery.isError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
            Could not load this job. Please go back and try again.
          </div>
        )}

        {!detailQuery.isLoading && !detailQuery.isError && !displayVersion && (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-sm text-slate-500">
            No draft or published version exists for this job yet.
          </div>
        )}

        {displayVersion && form && (
          <>
            {!editableVersion && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                This job only has a published version. Draft editing is not available for this job yet.
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Briefcase size={18} className="text-sky-600" />
                    <h2 className="font-semibold text-slate-900">Basic information</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Title">
                      <TextInput
                        value={form.title}
                        disabled={!canEdit}
                        onChange={(e) => setField("title", e.target.value)}
                      />
                    </Field>
                    <Field label="Role code">
                      <TextInput
                        value={form.roleCode}
                        disabled={!canEdit}
                        placeholder="backend_developer"
                        onChange={(e) => setField("roleCode", e.target.value)}
                      />
                    </Field>
                    <Field label="Employment type">
                      <SelectInput
                        value={form.employmentType}
                        disabled={!canEdit}
                        onChange={(e) => setField("employmentType", e.target.value as BusinessJobFormState["employmentType"])}
                      >
                        <option value="">Not specified</option>
                        {EMPLOYMENT_TYPES.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Experience level">
                      <SelectInput
                        value={form.experienceLevel}
                        disabled={!canEdit}
                        onChange={(e) => setField("experienceLevel", e.target.value as BusinessJobFormState["experienceLevel"])}
                      >
                        <option value="">Not specified</option>
                        {EXPERIENCE_LEVELS.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Work mode">
                      <SelectInput
                        value={form.workMode}
                        disabled={!canEdit}
                        onChange={(e) => setField("workMode", e.target.value as BusinessJobFormState["workMode"])}
                      >
                        <option value="">Not specified</option>
                        {WORK_MODES.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Openings">
                      <TextInput
                        value={form.openingsCount}
                        disabled={!canEdit}
                        inputMode="numeric"
                        onChange={(e) => setField("openingsCount", e.target.value)}
                      />
                    </Field>
                    <Field label="Min years">
                      <TextInput
                        value={form.minYearsExperience}
                        disabled={!canEdit}
                        inputMode="decimal"
                        onChange={(e) => setField("minYearsExperience", e.target.value)}
                      />
                    </Field>
                    <Field label="Max years">
                      <TextInput
                        value={form.maxYearsExperience}
                        disabled={!canEdit}
                        inputMode="decimal"
                        onChange={(e) => setField("maxYearsExperience", e.target.value)}
                      />
                    </Field>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 font-semibold text-slate-900">Compensation</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Salary min">
                      <TextInput
                        value={form.salaryMin}
                        disabled={!canEdit}
                        inputMode="numeric"
                        onChange={(e) => setField("salaryMin", e.target.value)}
                      />
                    </Field>
                    <Field label="Salary max">
                      <TextInput
                        value={form.salaryMax}
                        disabled={!canEdit}
                        inputMode="numeric"
                        onChange={(e) => setField("salaryMax", e.target.value)}
                      />
                    </Field>
                    <Field label="Currency">
                      <TextInput
                        value={form.currency}
                        disabled={!canEdit}
                        onChange={(e) => setField("currency", e.target.value)}
                      />
                    </Field>
                    <Field label="Period">
                      <SelectInput
                        value={form.salaryPeriod}
                        disabled={!canEdit}
                        onChange={(e) => setField("salaryPeriod", e.target.value as BusinessJobFormState["salaryPeriod"])}
                      >
                        <option value="">Not specified</option>
                        {SALARY_PERIODS.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.salaryVisible}
                        disabled={!canEdit}
                        onChange={(e) => setField("salaryVisible", e.target.checked)}
                      />
                      Show salary
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.salaryNegotiable}
                        disabled={!canEdit}
                        onChange={(e) => setField("salaryNegotiable", e.target.checked)}
                      />
                      Negotiable
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 font-semibold text-slate-900">Job content</h2>
                  <div className="space-y-4">
                    <Field label="Summary">
                      <TextArea
                        value={form.summary}
                        disabled={!canEdit}
                        onChange={(e) => setField("summary", e.target.value)}
                      />
                    </Field>
                    <Field label="Responsibilities (one per line)">
                      <TextArea
                        value={form.responsibilitiesText}
                        disabled={!canEdit}
                        onChange={(e) => setField("responsibilitiesText", e.target.value)}
                      />
                    </Field>
                    <Field label="Requirements (one per line)">
                      <TextArea
                        value={form.requirementsText}
                        disabled={!canEdit}
                        onChange={(e) => setField("requirementsText", e.target.value)}
                      />
                    </Field>
                    <Field label="Nice to have (one per line)">
                      <TextArea
                        value={form.niceToHaveText}
                        disabled={!canEdit}
                        onChange={(e) => setField("niceToHaveText", e.target.value)}
                      />
                    </Field>
                    <Field label="Benefits (one per line)">
                      <TextArea
                        value={form.benefitsText}
                        disabled={!canEdit}
                        onChange={(e) => setField("benefitsText", e.target.value)}
                      />
                    </Field>
                    <Field label="Interview process (one per line)">
                      <TextArea
                        value={form.interviewProcessText}
                        disabled={!canEdit}
                        onChange={(e) => setField("interviewProcessText", e.target.value)}
                      />
                    </Field>
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-600" />
                    <h2 className="font-semibold text-slate-900">Draft status</h2>
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-slate-400">Revision</dt>
                      <dd className="font-semibold text-slate-700">{displayVersion.revision}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Skills</dt>
                      <dd className="font-semibold text-slate-700">{skillsSummary}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Version status</dt>
                      <dd className="font-semibold text-slate-700">{displayVersion.status}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm text-sky-800">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Bot size={17} />
                    Editor flow
                  </div>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Save the draft after editing content.</li>
                    <li>Extract skills to refresh matching signals.</li>
                    <li>Publish when the job is ready for candidates.</li>
                  </ol>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </BusinessLayout>
  );
}
