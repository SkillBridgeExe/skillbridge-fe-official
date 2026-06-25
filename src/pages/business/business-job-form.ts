import type {
  EmploymentType,
  ExperienceLevel,
  JobVersionDto,
  SalaryPeriod,
  UpdateJobDraftRequest,
  WorkMode,
  JobLocationDto,
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
  locations: JobLocationDto[];
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

function nullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
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
    locations: draft.locations ?? [],
    summary: nullableString(draft.summary),
    responsibilitiesText: draft.responsibilities.join("\n"),
    requirementsText: draft.requirements.join("\n"),
    niceToHaveText: draft.niceToHave.join("\n"),
    benefitsText: draft.benefits.join("\n"),
    interviewProcessText: draft.interviewProcess.join("\n"),
    workingTime: nullableString(draft.workingTime),
  };
}

function nullableStringInput(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function formToUpdateJobDraftRequest(
  form: BusinessJobFormState,
  expectedRevision: number,
): UpdateJobDraftRequest {
  return {
    expectedRevision,
    title: form.title.trim(),
    roleCode: nullableStringInput(form.roleCode),
    employmentType: form.employmentType || null,
    experienceLevel: form.experienceLevel || null,
    minYearsExperience: nullableNumber(form.minYearsExperience),
    maxYearsExperience: nullableNumber(form.maxYearsExperience),
    workMode: form.workMode || null,
    openingsCount: nullableNumber(form.openingsCount) ?? 1,
    salaryMin: nullableNumber(form.salaryMin),
    salaryMax: nullableNumber(form.salaryMax),
    currency: form.currency.trim() || "VND",
    salaryPeriod: form.salaryPeriod || null,
    salaryVisible: form.salaryVisible,
    salaryNegotiable: form.salaryNegotiable,
    educationLevel: nullableStringInput(form.educationLevel),
    languageCode: nullableStringInput(form.languageCode),
    applicationDeadline: nullableStringInput(form.applicationDeadline),
    summary: nullableStringInput(form.summary),
    locations: form.locations,
    responsibilities: splitLines(form.responsibilitiesText),
    requirements: splitLines(form.requirementsText),
    niceToHave: splitLines(form.niceToHaveText),
    benefits: splitLines(form.benefitsText),
    interviewProcess: splitLines(form.interviewProcessText),
    workingTime: nullableStringInput(form.workingTime),
  };
}

export function dateInputToEndOfDayIso(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}
