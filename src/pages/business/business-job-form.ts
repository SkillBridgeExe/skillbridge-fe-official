import type {
  EmploymentType,
  ExperienceLevel,
  JobVersionDto,
  SalaryPeriod,
  UpdateJobDraftRequest,
  WorkMode,
} from "@/types/jobs";

export interface BusinessJobFormState {
  title: string;
  roleCode: string;
  employmentType: "" | EmploymentType;
  experienceLevel: "" | ExperienceLevel;
  minYearsExperience: string;
  maxYearsExperience: string;
  workMode: "" | WorkMode;
  openingsCount: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  salaryPeriod: "" | SalaryPeriod;
  salaryVisible: boolean;
  salaryNegotiable: boolean;
  educationLevel: string;
  languageCode: string;
  applicationDeadline: string;
  summary: string;
  responsibilitiesText: string;
  requirementsText: string;
  niceToHaveText: string;
  benefitsText: string;
  interviewProcessText: string;
  workingTime: string;
}

export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function nullableString(value: string | null | undefined): string {
  return value ?? "";
}

function numberString(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function draftToBusinessJobForm(draft: JobVersionDto): BusinessJobFormState {
  return {
    title: draft.title,
    roleCode: nullableString(draft.roleCode),
    employmentType: draft.employmentType ?? "",
    experienceLevel: draft.experienceLevel ?? "",
    minYearsExperience: numberString(draft.minYearsExperience),
    maxYearsExperience: numberString(draft.maxYearsExperience),
    workMode: draft.workMode ?? "",
    openingsCount: numberString(draft.openingsCount),
    salaryMin: numberString(draft.salaryMin),
    salaryMax: numberString(draft.salaryMax),
    currency: draft.currency || "VND",
    salaryPeriod: draft.salaryPeriod ?? "",
    salaryVisible: draft.salaryVisible,
    salaryNegotiable: draft.salaryNegotiable,
    educationLevel: nullableString(draft.educationLevel),
    languageCode: nullableString(draft.languageCode),
    applicationDeadline: nullableString(draft.applicationDeadline),
    summary: nullableString(draft.summary),
    responsibilitiesText: draft.responsibilities.join("\n"),
    requirementsText: draft.requirements.join("\n"),
    niceToHaveText: draft.niceToHave.join("\n"),
    benefitsText: draft.benefits.join("\n"),
    interviewProcessText: draft.interviewProcess.join("\n"),
    workingTime: nullableString(draft.workingTime),
  };
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function formToUpdateJobDraftRequest(
  form: BusinessJobFormState,
  expectedRevision: number,
): UpdateJobDraftRequest {
  return {
    expectedRevision,
    title: form.title.trim(),
    roleCode: optionalString(form.roleCode),
    employmentType: form.employmentType || undefined,
    experienceLevel: form.experienceLevel || undefined,
    minYearsExperience: optionalNumber(form.minYearsExperience),
    maxYearsExperience: optionalNumber(form.maxYearsExperience),
    workMode: form.workMode || undefined,
    openingsCount: optionalNumber(form.openingsCount),
    salaryMin: optionalNumber(form.salaryMin),
    salaryMax: optionalNumber(form.salaryMax),
    currency: form.currency.trim() || "VND",
    salaryPeriod: form.salaryPeriod || undefined,
    salaryVisible: form.salaryVisible,
    salaryNegotiable: form.salaryNegotiable,
    educationLevel: optionalString(form.educationLevel),
    languageCode: optionalString(form.languageCode),
    applicationDeadline: optionalString(form.applicationDeadline),
    summary: optionalString(form.summary),
    responsibilities: splitLines(form.responsibilitiesText),
    requirements: splitLines(form.requirementsText),
    niceToHave: splitLines(form.niceToHaveText),
    benefits: splitLines(form.benefitsText),
    interviewProcess: splitLines(form.interviewProcessText),
    workingTime: optionalString(form.workingTime),
  };
}
