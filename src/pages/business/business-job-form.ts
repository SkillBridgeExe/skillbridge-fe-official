import type {
  EmploymentType,
  ExperienceLevel,
  JobVersionDto,
  SalaryPeriod,
  UpdateJobDraftRequest,
  WorkMode,
  JobLocationDto,
  JobPublishReadiness,
} from "@/types/jobs";

export type BusinessJobEditorStep = "basic" | "content" | "skills" | "review";
export type BusinessJobStepErrors = Partial<Record<
  "title" | "roleCode" | "salary" | "experience" | "openingsCount" | "applicationDeadline" | "summary" | "responsibilities" | "requirements" | "locations",
  string
>>;

const SKILLS_SOURCE_FIELDS: Array<keyof BusinessJobFormState> = [
  "title",
  "roleCode",
  "responsibilitiesText",
  "requirementsText",
  "niceToHaveText",
];

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
  if (!Number.isFinite(parsed)) throw new Error("Invalid numeric value");
  return parsed;
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

export function updateBusinessJobLocation(
  locations: JobLocationDto[],
  index: number,
  field: keyof JobLocationDto,
  value: JobLocationDto[keyof JobLocationDto],
): JobLocationDto[] {
  return locations.map((location, locationIndex) => {
    if (locationIndex === index) return { ...location, [field]: value };
    if (field === "isPrimary" && value === true) return { ...location, isPrimary: false };
    return location;
  });
}

function toDateInputValue(date: Date): string {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

export function getDateInputBounds(now = new Date()): { min: string; max: string } {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const max = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60);
  return { min: toDateInputValue(tomorrow), max: toDateInputValue(max) };
}

function positiveFiniteNumber(value: string): boolean {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function finiteNumberInRange(value: string, minimum: number, maximum: number): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum;
}

function deadlineIsInRange(value: string, now: Date): boolean {
  if (!value) return false;
  const valueDate = new Date(value);
  if (Number.isNaN(valueDate.getTime())) return false;
  const { min, max } = getDateInputBounds(now);
  const valueDateString = toDateInputValue(valueDate);
  return valueDateString >= min && valueDateString <= max;
}

export function validateBusinessJobStep(
  form: BusinessJobFormState,
  step: Extract<BusinessJobEditorStep, "basic" | "content">,
  now = new Date(),
): BusinessJobStepErrors {
  const errors: BusinessJobStepErrors = {};
  if (step === "basic") {
    if (form.title.trim().length < 2) errors.title = "Enter at least 2 characters.";
    if (!form.roleCode.trim()) errors.roleCode = "Choose a role.";
    const salaryHasInvalidValue = [form.salaryMin, form.salaryMax].some(
      (value) => value.trim() && !finiteNumberInRange(value, 0, Number.MAX_SAFE_INTEGER),
    );
    if (salaryHasInvalidValue) {
      errors.salary = "Salary values must be finite non-negative numbers.";
    } else if (form.salaryMin.trim() && form.salaryMax.trim() && Number(form.salaryMin) > Number(form.salaryMax)) {
      errors.salary = "Maximum salary must be at least the minimum.";
    }
    const experienceHasInvalidValue = [form.minYearsExperience, form.maxYearsExperience].some(
      (value) => value.trim() && !finiteNumberInRange(value, 0, 99),
    );
    if (experienceHasInvalidValue) {
      errors.experience = "Experience values must be finite numbers from 0 through 99.";
    } else if (form.minYearsExperience.trim() && form.maxYearsExperience.trim() && Number(form.minYearsExperience) > Number(form.maxYearsExperience)) {
      errors.experience = "Maximum experience must be at least the minimum.";
    }
    if (form.openingsCount.trim() && (!positiveFiniteNumber(form.openingsCount) || !Number.isInteger(Number(form.openingsCount)) || Number(form.openingsCount) > 1000)) {
      errors.openingsCount = "Openings must be a whole number from 1 through 1000.";
    }
    return errors;
  }

  if (!deadlineIsInRange(form.applicationDeadline, now)) errors.applicationDeadline = "Choose a deadline from tomorrow through 60 days out.";
  if (!form.summary.trim()) errors.summary = "Add a job summary.";
  if (!splitLines(form.responsibilitiesText).length) errors.responsibilities = "Add at least one responsibility.";
  if (!splitLines(form.requirementsText).length) errors.requirements = "Add at least one requirement.";
  if (!form.locations.length || form.locations.some((location) => !location.cityCode.trim() || !/^[A-Za-z]{2}$/.test(location.countryCode.trim()))) {
    errors.locations = "Each location needs a city and a 2-letter country code.";
  }
  return errors;
}

/** Validation that must run before any draft serialization, including header Save draft. */
export function validateFormForSave(form: BusinessJobFormState): Pick<BusinessJobStepErrors, "salary" | "experience" | "openingsCount"> {
  const { salary, experience, openingsCount } = validateBusinessJobStep(form, "basic");
  return {
    ...(salary ? { salary } : {}),
    ...(experience ? { experience } : {}),
    ...(openingsCount ? { openingsCount } : {}),
  };
}

export function getSkillsRefreshState(
  savedForm: BusinessJobFormState,
  currentForm: BusinessJobFormState,
): { needsRefresh: boolean; changedFields: Array<keyof BusinessJobFormState> } {
  const changedFields = SKILLS_SOURCE_FIELDS.filter((field) => savedForm[field] !== currentForm[field]);
  return { needsRefresh: changedFields.length > 0, changedFields };
}

export function getStepForBlocker(
  blocker: JobPublishReadiness["blockers"][number],
): BusinessJobEditorStep {
  const token = `${blocker.code} ${blocker.field}`.toLowerCase();
  if (token.includes("company") || token.includes("profile")) return "review";
  if (token.includes("skill")) return "skills";
  if (/(title|role|salary|experience|opening)/.test(token)) return "basic";
  return "content";
}
