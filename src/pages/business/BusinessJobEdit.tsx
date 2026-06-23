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
  MapPin,
  Plus,
  Trash2,
  Globe,
  DollarSign,
  FileText,
  Star,
  ShieldCheck
} from "lucide-react";
import {
  useBusinessJobDetailQuery,
  useExtractJobSkillsMutation,
  usePublishJobMutation,
  useUpdateJobDraftMutation,
  useReplaceJobSkillsMutation,
} from "@/hooks/use-business-jobs";
import { useToast } from "@/hooks/use-toast";
import type { EmploymentType, ExperienceLevel, SalaryPeriod, WorkMode, JobLocationDto, JobSkillDto } from "@/types/jobs";
import {
  draftToBusinessJobForm,
  formToUpdateJobDraftRequest,
  type BusinessJobFormState,
} from "./business-job-form";

const EMPLOYMENT_TYPES: EmploymentType[] = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "FREELANCE"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEAD"];
const WORK_MODES: WorkMode[] = ["ONSITE", "HYBRID", "REMOTE"];
const SALARY_PERIODS: SalaryPeriod[] = ["MONTH", "YEAR"];

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="text-[13px] text-red-500">{error}</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900",
        "outline-none transition-colors placeholder:text-slate-400",
        props.hasError 
          ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
          : "border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500",
        props.disabled ? "cursor-not-allowed bg-slate-50 text-slate-500 opacity-80" : "",
      ].join(" ")}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 appearance-none",
        "outline-none transition-colors",
        props.hasError 
          ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
          : "border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500",
        props.disabled ? "cursor-not-allowed bg-slate-50 text-slate-500 opacity-80" : "",
      ].join(" ")}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: "right 0.5rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.5em 1.5em",
        paddingRight: "2.5rem"
      }}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }) {
  return (
    <textarea
      {...props}
      className={[
        "min-h-[120px] w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900",
        "outline-none transition-colors placeholder:text-slate-400 resize-y",
        props.hasError 
          ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
          : "border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500",
        props.disabled ? "cursor-not-allowed bg-slate-50 text-slate-500 opacity-80" : "",
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
  const replaceSkillsMutation = useReplaceJobSkillsMutation();
  const [form, setForm] = useState<BusinessJobFormState | null>(null);
  const [editableSkills, setEditableSkills] = useState<JobSkillDto[]>([]);

  const editableVersion = detailQuery.data?.draft ?? null;
  const displayVersion = detailQuery.data?.draft ?? detailQuery.data?.published ?? null;
  const canEdit = !!editableVersion && !!form;
  
  // Validation
  const salaryMinNum = form ? Number(form.salaryMin) : 0;
  const salaryMaxNum = form ? Number(form.salaryMax) : 0;
  const salaryError = !!form && !!form.salaryMin && !!form.salaryMax && salaryMinNum > salaryMaxNum;
  
  const canSubmitDraft = canEdit && !!form.title.trim() && !salaryError;
  const isSaving = updateMutation.isPending;
  const isPublishing = publishMutation.isPending;
  const isExtracting = extractMutation.isPending;

  useEffect(() => {
    if (displayVersion) {
      setForm(draftToBusinessJobForm(displayVersion));
    }
    if (editableVersion) {
      setEditableSkills([...editableVersion.skills]);
    }
  }, [displayVersion, editableVersion]);

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

  const handleAddLocation = () => {
    setForm(cur => cur ? {
      ...cur,
      locations: [...cur.locations, { cityCode: "", countryCode: "VN", addressLine: "", isPrimary: cur.locations.length === 0 }]
    } : cur);
  };

  const handleRemoveLocation = (index: number) => {
    setForm(cur => {
      if (!cur) return cur;
      const newLocs = [...cur.locations];
      const removed = newLocs.splice(index, 1)[0];
      if (removed.isPrimary && newLocs.length > 0) {
        newLocs[0].isPrimary = true;
      }
      return { ...cur, locations: newLocs };
    });
  };

  const handleLocationChange = (index: number, key: keyof JobLocationDto, value: JobLocationDto[keyof JobLocationDto]) => {
    setForm(cur => {
      if (!cur) return cur;
      const newLocs = [...cur.locations];
      if (key === "isPrimary" && value === true) {
        newLocs.forEach(l => l.isPrimary = false);
      }
      newLocs[index] = { ...newLocs[index], [key]: value };
      if (key === "isPrimary" && value === false) {
        if (!newLocs.some(l => l.isPrimary)) {
          newLocs[0].isPrimary = true;
        }
      }
      return { ...cur, locations: newLocs };
    });
  };

  const handleSave = () => {
    if (!jobId || !editableVersion || !form || salaryError) return;
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
    if (!jobId || !editableVersion || salaryError) return;
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

  const handleSkillChange = (index: number, key: keyof JobSkillDto, value: JobSkillDto[keyof JobSkillDto]) => {
    const newSkills = [...editableSkills];
    newSkills[index] = { ...newSkills[index], [key]: value };
    setEditableSkills(newSkills);
  };

  const handleRemoveSkill = (index: number) => {
    const newSkills = [...editableSkills];
    newSkills.splice(index, 1);
    setEditableSkills(newSkills);
  };

  const handleConfirmSkills = () => {
    if (!jobId || !editableVersion) return;
    replaceSkillsMutation.mutate({
      jobId,
      body: {
        expectedRevision: editableVersion.revision,
        skills: editableSkills,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Skills confirmed", description: "Your skill requirements have been saved." });
      }
    });
  };

  return (
    <BusinessLayout>
      <div className="mx-auto max-w-5xl space-y-6 pb-24">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              to="/business/jobs"
              className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to jobs
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Edit Job Draft</h1>
            <p className="mt-1 text-sm text-slate-500">
              Update details, extract skills, and publish.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExtractSkills}
              disabled={!canEdit || isExtracting || isSaving}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExtracting ? <Loader2 size={16} className="animate-spin text-slate-400" /> : <Sparkles size={16} className="text-amber-500" />}
              Extract Skills
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmitDraft || isSaving}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin text-slate-400" /> : <Save size={16} className="text-slate-400" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canSubmitDraft || isPublishing || isSaving}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? <Loader2 size={16} className="animate-spin text-slate-400" /> : <Send size={16} className="text-slate-300" />}
              Publish
            </button>
          </div>
        </div>

        {/* States */}
        {detailQuery.isLoading && (
          <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Loading draft...</p>
            </div>
          </div>
        )}

        {detailQuery.isError && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-600">
            Could not load this job. Please go back and try again.
          </div>
        )}

        {!detailQuery.isLoading && !detailQuery.isError && !displayVersion && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No draft or published version exists for this job yet.
          </div>
        )}

        {/* Editor Grid */}
        {displayVersion && form && (
          <div className="grid gap-8 lg:grid-cols-[1fr_300px] items-start">
            <div className="space-y-8">
              
              {!editableVersion && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  This job only has a published version. Draft editing is not available.
                </div>
              )}

              {/* Basic Info */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Briefcase size={16} className="text-slate-400" />
                  <h2 className="text-base font-semibold text-slate-900">Basic Information</h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Job Title" className="sm:col-span-2">
                    <TextInput
                      value={form.title}
                      disabled={!canEdit}
                      placeholder="e.g. Senior Frontend Engineer"
                      onChange={(e) => setField("title", e.target.value)}
                    />
                  </Field>
                  <Field label="Role Code">
                    <TextInput
                      value={form.roleCode}
                      disabled={!canEdit}
                      placeholder="e.g. frontend_engineer"
                      onChange={(e) => setField("roleCode", e.target.value)}
                    />
                  </Field>
                  <Field label="Openings">
                    <TextInput
                      value={form.openingsCount}
                      disabled={!canEdit}
                      inputMode="numeric"
                      placeholder="1"
                      onChange={(e) => setField("openingsCount", e.target.value)}
                    />
                  </Field>
                  <Field label="Employment Type">
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
                  <Field label="Work Mode">
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
                  <Field label="Experience Level">
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
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Min Years">
                      <TextInput
                        value={form.minYearsExperience}
                        disabled={!canEdit}
                        inputMode="decimal"
                        placeholder="0"
                        onChange={(e) => setField("minYearsExperience", e.target.value)}
                      />
                    </Field>
                    <Field label="Max Years">
                      <TextInput
                        value={form.maxYearsExperience}
                        disabled={!canEdit}
                        inputMode="decimal"
                        placeholder="e.g. 5"
                        onChange={(e) => setField("maxYearsExperience", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* Application Settings */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Globe size={16} className="text-slate-400" />
                  <h2 className="text-base font-semibold text-slate-900">Application Settings</h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Application Mode">
                    <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      {detailQuery.data?.job.applicationMode === "EXTERNAL" ? "External (URL)" : "Native (SkillBridge)"}
                    </div>
                  </Field>
                  <Field label="Deadline">
                    <TextInput
                      type="date"
                      value={form.applicationDeadline ? form.applicationDeadline.split('T')[0] : ""}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setField("applicationDeadline", val ? `${val}T23:59:59Z` : "");
                      }}
                    />
                  </Field>
                  {detailQuery.data?.job.applicationMode === "EXTERNAL" && detailQuery.data?.job.sourceUrl && (
                    <Field label="External Apply URL" className="sm:col-span-2">
                      <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 break-all">
                        {detailQuery.data.job.sourceUrl}
                      </div>
                    </Field>
                  )}
                </div>
              </section>

              {/* Compensation */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <DollarSign size={16} className="text-slate-400" />
                  <h2 className="text-base font-semibold text-slate-900">Compensation</h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Salary Min" error={salaryError ? "Min > Max" : undefined}>
                    <TextInput
                      value={form.salaryMin}
                      disabled={!canEdit}
                      inputMode="numeric"
                      hasError={salaryError}
                      onChange={(e) => setField("salaryMin", e.target.value)}
                    />
                  </Field>
                  <Field label="Salary Max" error={salaryError ? "Min > Max" : undefined}>
                    <TextInput
                      value={form.salaryMax}
                      disabled={!canEdit}
                      inputMode="numeric"
                      hasError={salaryError}
                      onChange={(e) => setField("salaryMax", e.target.value)}
                    />
                  </Field>
                  <Field label="Currency">
                    <TextInput
                      value={form.currency}
                      disabled={!canEdit}
                      placeholder="VND"
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
                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      checked={form.salaryVisible}
                      disabled={!canEdit}
                      onChange={(e) => setField("salaryVisible", e.target.checked)}
                    />
                    Display salary on job posting
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      checked={form.salaryNegotiable}
                      disabled={!canEdit}
                      onChange={(e) => setField("salaryNegotiable", e.target.checked)}
                    />
                    Salary is negotiable
                  </label>
                </div>
              </section>

              {/* Locations */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <h2 className="text-base font-semibold text-slate-900">Locations</h2>
                  </div>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={handleAddLocation}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50"
                  >
                    <Plus size={14} /> Add Location
                  </button>
                </div>
                
                {form.locations.length === 0 && (
                  <p className="text-sm text-slate-500 py-2">No locations specified. Click add location to specify where this role is based.</p>
                )}

                <div className="space-y-3">
                  {form.locations.map((loc, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-end gap-3 rounded-md border border-slate-200 p-3 bg-slate-50/50">
                      <div className="grid grid-cols-2 flex-1 gap-3 w-full">
                        <Field label="City Code">
                          <TextInput 
                            value={loc.cityCode} 
                            disabled={!canEdit}
                            placeholder="SGN, HAN..."
                            onChange={(e) => handleLocationChange(idx, "cityCode", e.target.value)} 
                          />
                        </Field>
                        <Field label="Country Code">
                          <TextInput 
                            value={loc.countryCode} 
                            disabled={!canEdit}
                            placeholder="VN"
                            onChange={(e) => handleLocationChange(idx, "countryCode", e.target.value)} 
                          />
                        </Field>
                        <Field label="Address Line" className="col-span-2">
                          <TextInput 
                            value={loc.addressLine} 
                            disabled={!canEdit}
                            placeholder="123 Example Street"
                            onChange={(e) => handleLocationChange(idx, "addressLine", e.target.value)} 
                          />
                        </Field>
                      </div>
                      <div className="flex items-center justify-between w-full sm:w-auto pb-2 sm:pb-3 shrink-0 gap-4">
                        <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="primaryLocation"
                            checked={loc.isPrimary}
                            disabled={!canEdit}
                            onChange={() => handleLocationChange(idx, "isPrimary", true)}
                            className="text-slate-900 focus:ring-slate-900"
                          />
                          Primary
                        </label>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleRemoveLocation(idx)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove location"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Content */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <FileText size={16} className="text-slate-400" />
                  <h2 className="text-base font-semibold text-slate-900">Job Content</h2>
                </div>
                <Field label="Summary">
                  <TextArea
                    value={form.summary}
                    disabled={!canEdit}
                    placeholder="Provide a brief overview of the role..."
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
                <Field label="Nice To Have (one per line)">
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
                <Field label="Interview Process (one per line)">
                  <TextArea
                    value={form.interviewProcessText}
                    disabled={!canEdit}
                    onChange={(e) => setField("interviewProcessText", e.target.value)}
                  />
                </Field>
              </section>

              {/* Extracted Skills */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-slate-400" />
                    <h2 className="text-base font-semibold text-slate-900">Extracted Skills</h2>
                  </div>
                  {editableVersion?.skillsConfirmedAt && (
                    <div className="flex items-center gap-1 text-[13px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={14} /> Confirmed
                    </div>
                  )}
                </div>
                
                {editableSkills.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2">No skills detected. Click "Extract Skills" to generate skills from your content.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 pb-2">Review the detected skills. You can adjust the required level or remove irrelevant ones before confirming.</p>
                    {editableSkills.map((skill, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-medium text-slate-900 truncate" title={skill.canonicalName}>{skill.canonicalName}</span>
                          {skill.rawText && <span className="text-[12px] text-slate-500 truncate" title={`Found as: ${skill.rawText}`}>Found as: {skill.rawText}</span>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <SelectInput 
                            value={skill.importance}
                            disabled={!canEdit}
                            onChange={(e) => handleSkillChange(idx, "importance", e.target.value)}
                            className="!py-1 !text-[13px] !w-32"
                          >
                            <option value="REQUIRED">Required</option>
                            <option value="NICE_TO_HAVE">Nice to have</option>
                          </SelectInput>
                          <SelectInput 
                            value={skill.minLevel || ""}
                            disabled={!canEdit}
                            onChange={(e) => handleSkillChange(idx, "minLevel", e.target.value ? Number(e.target.value) : null)}
                            className="!py-1 !text-[13px] !w-24"
                          >
                            <option value="">Any Lvl</option>
                            <option value="1">Lvl 1+</option>
                            <option value="2">Lvl 2+</option>
                            <option value="3">Lvl 3+</option>
                            <option value="4">Lvl 4+</option>
                            <option value="5">Lvl 5</option>
                          </SelectInput>
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleRemoveSkill(idx)}
                            className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                            title="Remove skill"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={!canEdit || replaceSkillsMutation.isPending}
                        onClick={handleConfirmSkills}
                        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {replaceSkillsMutation.isPending ? <Loader2 size={16} className="animate-spin text-emerald-300" /> : <ShieldCheck size={16} className="text-emerald-100" />}
                        Confirm Skills
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar Status */}
            <aside className="sticky top-6 space-y-4">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <h2 className="font-semibold text-slate-900">Status Tracking</h2>
                </div>
                <div className="space-y-4 text-[13px]">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Revision</span>
                    <span className="font-medium text-slate-900">{displayVersion.revision}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Version Status</span>
                    <span className="font-medium text-slate-900 capitalize">{displayVersion.status.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Detected Skills</span>
                    <span className="font-medium text-slate-900">{skillsSummary}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-2 font-medium text-slate-900">
                  <Bot size={16} className="text-slate-400" />
                  Editor Workflow
                </div>
                <ol className="ml-4 list-decimal space-y-2 text-[13px] text-slate-600">
                  <li>Edit content and <strong className="font-medium text-slate-900">Save Draft</strong>.</li>
                  <li>Click <strong className="font-medium text-slate-900">Extract Skills</strong> to refresh AI matching tags.</li>
                  <li>Review the detected skills (below).</li>
                  <li><strong className="font-medium text-slate-900">Publish</strong> to make the job live.</li>
                </ol>
              </section>
            </aside>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
