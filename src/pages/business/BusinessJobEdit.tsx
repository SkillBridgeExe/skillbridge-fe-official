import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import { BasicStep, ContentStep, EDITOR_STEPS, ReviewStep, SkillsStep } from "@/components/business/job-editor/JobEditorSteps";
import {
  useBusinessJobDetailQuery,
  useExtractJobSkillsMutation,
  usePublishJobMutation,
  useReplaceJobSkillsMutation,
  useUpdateJobDraftMutation,
} from "@/hooks/use-business-jobs";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { useUnsavedNavigationGuard } from "@/hooks/use-unsaved-navigation-guard";
import type { JobLocationDto, JobPublishReadiness, JobSkillDto } from "@/types/jobs";
import {
  draftToBusinessJobForm,
  formToUpdateJobDraftRequest,
  getDateInputBounds,
  getSkillsRefreshState,
  getStepForBlocker,
  updateBusinessJobLocation,
  validateFormForSave,
  validateBusinessJobStep,
  type BusinessJobEditorStep,
  type BusinessJobFormState,
  type BusinessJobStepErrors,
} from "./business-job-form";

const EMPTY_READINESS: JobPublishReadiness = { ready: false, blockers: [] };

export default function BusinessJobEdit() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const detailQuery = useBusinessJobDetailQuery(jobId);
  const updateMutation = useUpdateJobDraftMutation();
  const extractMutation = useExtractJobSkillsMutation();
  const replaceSkillsMutation = useReplaceJobSkillsMutation();
  const publishMutation = usePublishJobMutation();
  const [form, setForm] = useState<BusinessJobFormState | null>(null);
  const [savedForm, setSavedForm] = useState<BusinessJobFormState | null>(null);
  const [editableSkills, setEditableSkills] = useState<JobSkillDto[]>([]);
  const [formDirty, setFormDirty] = useState(false);
  const [skillsDirty, setSkillsDirty] = useState(false);
  const [step, setStep] = useState<BusinessJobEditorStep>("basic");
  const [errors, setErrors] = useState<BusinessJobStepErrors>({});

  const draft = detailQuery.data?.draft ?? null;
  const displayVersion = draft ?? detailQuery.data?.published ?? null;
  const editableVersion = draft ?? detailQuery.data?.published ?? null;
  const canEdit = Boolean(form && displayVersion && ["draft", "active"].includes(detailQuery.data?.job.status ?? ""));
  const readiness = detailQuery.data?.publishReadiness ?? EMPTY_READINESS;
  const deadlineBounds = useMemo(() => getDateInputBounds(), []);
  const refreshState = useMemo(() => savedForm && form ? getSkillsRefreshState(savedForm, form) : { needsRefresh: false, changedFields: [] }, [form, savedForm]);
  const skillsNeedRefresh = Boolean(skillsDirty || refreshState.needsRefresh || !draft?.skillsConfirmedAt);
  const isDirty = formDirty || skillsDirty;
  useUnsavedNavigationGuard(isDirty);
  const publishReady = readiness.ready && !detailQuery.isFetching;

  useEffect(() => {
    if (!displayVersion) return;
    const nextForm = draftToBusinessJobForm(displayVersion);
    setForm(nextForm);
    setSavedForm(nextForm);
    setEditableSkills(draft?.skills ?? []);
    setFormDirty(false);
    setSkillsDirty(false);
    setErrors({});
  }, [displayVersion, draft]);

  const changeField = <K extends keyof BusinessJobFormState>(field: K, value: BusinessJobFormState[K]) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
    setFormDirty(true);
  };

  const saveDraft = (onSaved?: () => void) => {
    if (!jobId || !editableVersion || !form) return;
    const saveErrors = validateFormForSave(form);
    if (Object.keys(saveErrors).length) {
      setErrors((current) => ({ ...current, ...saveErrors }));
      toast({ variant: "destructive", title: "Fix numeric fields", description: "Check openings, salary, and experience before saving." });
      return;
    }
    let body;
    try {
      body = formToUpdateJobDraftRequest(form, editableVersion.revision);
    } catch (error) {
      toast({ variant: "destructive", title: "Save failed", description: getApiErrorMessage(error) });
      return;
    }
    updateMutation.mutate({ jobId, body }, {
      onSuccess: (returnedDraft) => {
        const nextForm = draftToBusinessJobForm(returnedDraft);
        setForm(nextForm);
        setSavedForm(nextForm);
        setEditableSkills(returnedDraft.skills);
        setFormDirty(false);
        setSkillsDirty(false);
        toast({ title: "Draft saved", description: "Your latest draft is ready for the next step." });
        onSaved?.();
      },
      onError: (error) => toast({ variant: "destructive", title: "Save failed", description: getApiErrorMessage(error) }),
    });
  };

  const continueStep = () => {
    if (!form) return;
    if (step === "basic" || step === "content") {
      const nextErrors = validateBusinessJobStep(form, step);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;
    }
    const nextIndex = EDITOR_STEPS.findIndex((item) => item.id === step) + 1;
    const move = () => setStep(EDITOR_STEPS[Math.min(nextIndex, EDITOR_STEPS.length - 1)].id);
    if (formDirty) saveDraft(move); else move();
  };

  const extractSkills = () => {
    if (!jobId || !draft || formDirty) return;
    extractMutation.mutate({ jobId, revision: draft.revision }, {
      onSuccess: (returnedDraft) => {
        setEditableSkills(returnedDraft.skills);
        setSkillsDirty(false);
        toast({ title: "Skills extracted", description: "Review and confirm the detected skills." });
      },
      onError: (error) => toast({ variant: "destructive", title: "Extraction failed", description: getApiErrorMessage(error) }),
    });
  };

  const confirmSkills = () => {
    if (!jobId || !draft || formDirty || !editableSkills.length) return;
    replaceSkillsMutation.mutate({ jobId, body: { expectedRevision: draft.revision, skills: editableSkills } }, {
      onSuccess: (returnedDraft) => {
        setEditableSkills(returnedDraft.skills);
        setSkillsDirty(false);
        toast({ title: "Skills confirmed", description: "The current skill requirements are saved." });
      },
      onError: (error) => toast({ variant: "destructive", title: "Skill confirmation failed", description: getApiErrorMessage(error) }),
    });
  };

  const publish = () => {
    if (!jobId || !draft || formDirty || skillsNeedRefresh || !publishReady) return;
    publishMutation.mutate({ jobId, revision: draft.revision }, {
      onSuccess: () => { toast({ title: "Job published", description: "Your job is now visible to candidates." }); navigate("/business/jobs"); },
      onError: (error) => toast({ variant: "destructive", title: "Publish failed", description: getApiErrorMessage(error) }),
    });
  };

  const addLocation = () => changeField("locations", [...(form?.locations ?? []), { cityCode: "", countryCode: "VN", addressLine: "", isPrimary: !(form?.locations.length) }]);
  const removeLocation = (index: number) => {
    if (!form) return;
    const locations = form.locations.filter((_, itemIndex) => itemIndex !== index);
    if (locations.length && !locations.some((location) => location.isPrimary)) locations[0] = { ...locations[0], isPrimary: true };
    changeField("locations", locations);
  };
  const changeLocation = (index: number, field: keyof JobLocationDto, value: JobLocationDto[keyof JobLocationDto]) => {
    if (!form) return;
    changeField("locations", updateBusinessJobLocation(form.locations, index, field, value));
  };
  const changeSkill = (index: number, field: keyof JobSkillDto, value: JobSkillDto[keyof JobSkillDto]) => {
    setEditableSkills((current) => current.map((skill, itemIndex) => itemIndex === index ? { ...skill, [field]: value } : skill));
    setSkillsDirty(true);
  };
  const leave = () => {
    navigate("/business/jobs");
  };
  const localBlockers: JobPublishReadiness["blockers"] = [
    ...(formDirty ? [{ code: "UNSAVED_CHANGES", field: step, message: "Save the current form changes." }] : []),
    ...(skillsNeedRefresh ? [{ code: "SKILLS_NEED_CONFIRMATION", field: "skills", message: "Extract, review, and confirm skills." }] : []),
  ];
  const visitBlocker = (blocker: JobPublishReadiness["blockers"][number]) => {
    if (`${blocker.code} ${blocker.field}`.toLowerCase().match(/company|profile/)) { navigate("/business/profile"); return; }
    setStep(getStepForBlocker(blocker));
  };

  return <BusinessLayout><div className="mx-auto max-w-4xl space-y-6 pb-24">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5"><div><button type="button" onClick={leave} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-950"><ArrowLeft size={15} /> Back to jobs</button><h1 className="text-2xl font-semibold text-slate-950">Edit job draft</h1><p className="mt-1 text-sm text-slate-500">Save each step explicitly; no changes are saved automatically.</p></div><button type="button" disabled={!canEdit || !formDirty || updateMutation.isPending} onClick={() => saveDraft()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"><Save size={16} />{updateMutation.isPending ? "Saving…" : "Save draft"}</button></header>
    {detailQuery.isLoading ? <Loading /> : null}{detailQuery.isError ? <Message text="Could not load this job. Please return to your jobs and try again." /> : null}{!detailQuery.isLoading && !detailQuery.isError && !displayVersion ? <Message text="No draft or published version is available for this job." /> : null}
    {form && displayVersion ? <><nav aria-label="Job editor steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{EDITOR_STEPS.map((item, index) => <button key={item.id} type="button" onClick={() => setStep(item.id)} className={`rounded-md border px-3 py-2 text-left text-sm ${step === item.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}><span className="mr-1 opacity-70">{index + 1}.</span>{item.label}</button>)}</nav><main className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
      {step === "basic" ? <BasicStep form={form} errors={errors} disabled={!canEdit} onChange={changeField} /> : null}
      {step === "content" ? <ContentStep form={form} errors={errors} disabled={!canEdit} deadlineBounds={deadlineBounds} onChange={changeField} onAddLocation={addLocation} onRemoveLocation={removeLocation} onLocationChange={changeLocation} /> : null}
      {step === "skills" ? <SkillsStep skills={editableSkills} disabled={!canEdit} formDirty={formDirty} skillsNeedRefresh={skillsNeedRefresh} confirmedAt={draft?.skillsConfirmedAt} extracting={extractMutation.isPending} confirming={replaceSkillsMutation.isPending} onExtract={extractSkills} onConfirm={confirmSkills} onChange={changeSkill} onRemove={(index) => { setEditableSkills((items) => items.filter((_, itemIndex) => itemIndex !== index)); setSkillsDirty(true); }} /> : null}
      {step === "review" ? <ReviewStep form={form} readiness={readiness} localBlockers={localBlockers} onBlocker={visitBlocker} onCompanyProfile={() => navigate("/business/profile")} /> : null}
    </main><footer className="flex items-center justify-between gap-3"><button type="button" disabled={step === "basic"} onClick={() => setStep(EDITOR_STEPS[Math.max(0, EDITOR_STEPS.findIndex((item) => item.id === step) - 1)].id)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50">Back</button>{step === "review" ? <button type="button" disabled={!canEdit || formDirty || skillsNeedRefresh || !publishReady || publishMutation.isPending} onClick={publish} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Send size={16} />{publishMutation.isPending ? "Publishing…" : "Publish"}</button> : <button type="button" disabled={!canEdit || updateMutation.isPending} onClick={continueStep} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save & continue</button>}</footer></> : null}
  </div></BusinessLayout>;
}

function Loading() { return <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" />Loading job draft…</div>; }
function Message({ text }: { text: string }) { return <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">{text}</div>; }
