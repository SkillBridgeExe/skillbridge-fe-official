import { describe, expect, it } from "vitest";
import type { JobVersionDto } from "@/types/jobs";
import {
  getDateInputBounds,
  getSkillsRefreshState,
  getStepForBlocker,
  updateBusinessJobLocation,
  validateFormForSave,
  validateBusinessJobStep,
  dateInputToEndOfDayIso,
  draftToBusinessJobForm,
  formToUpdateJobDraftRequest,
  splitLines,
} from "./business-job-form";

const baseDraft: JobVersionDto = {
  id: "version-1",
  jobId: "job-1",
  versionNo: 1,
  status: "DRAFT",
  revision: 7,
  createdByUserId: "user-1",
  title: "Frontend Intern",
  roleCode: "frontend_developer",
  employmentType: "INTERNSHIP",
  experienceLevel: "INTERN",
  minYearsExperience: "0",
  maxYearsExperience: "1",
  workMode: "HYBRID",
  openingsCount: 2,
  salaryMin: "3000000",
  salaryMax: "5000000",
  currency: "VND",
  salaryPeriod: "MONTH",
  salaryVisible: true,
  salaryNegotiable: false,
  educationLevel: "College",
  languageCode: "vi",
  applicationDeadline: "2026-07-01T00:00:00.000Z",
  summary: "Build student-facing web screens.",
  responsibilities: ["Build UI", "Fix bugs"],
  requirements: ["React basics", "Git"],
  niceToHave: ["TypeScript"],
  benefits: ["Mentor support"],
  interviewProcess: ["HR screen", "Technical chat"],
  workingTime: "Mon-Fri",
  locations: [{ cityCode: "SGN", countryCode: "VN", addressLine: "Q1", isPrimary: true }],
  skills: [],
  skillsConfirmedAt: null,
  publishedAt: null,
  createdAt: "2026-06-23T00:00:00.000Z",
  updatedAt: null,
};

describe("business job form mapping", () => {
  it("validates the required Basic fields and optional advanced ranges", () => {
    const form = draftToBusinessJobForm(baseDraft);
    form.title = "x";
    form.roleCode = "";
    form.salaryMin = "500";
    form.salaryMax = "100";
    form.minYearsExperience = "4";
    form.maxYearsExperience = "2";
    form.openingsCount = "0";

    expect(validateBusinessJobStep(form, "basic")).toMatchObject({
      title: "Enter at least 2 characters.",
      roleCode: "Choose a role.",
      salary: "Maximum salary must be at least the minimum.",
      experience: "Maximum experience must be at least the minimum.",
      openingsCount: "Openings must be a whole number from 1 through 1000.",
    });
  });

  it("rejects non-finite and out-of-range numeric values instead of coercing them away", () => {
    const form = draftToBusinessJobForm(baseDraft);
    form.openingsCount = "1001";
    form.salaryMin = "Infinity";
    form.salaryMax = "-1";
    form.minYearsExperience = "NaN";
    form.maxYearsExperience = "100";

    expect(validateBusinessJobStep(form, "basic")).toMatchObject({
      openingsCount: "Openings must be a whole number from 1 through 1000.",
      salary: "Salary values must be finite non-negative numbers.",
      experience: "Experience values must be finite numbers from 0 through 99.",
    });
    expect(() => formToUpdateJobDraftRequest(form, baseDraft.revision)).toThrow("Invalid numeric value");
  });

  it("validates numeric constraints for direct draft saves", () => {
    const form = draftToBusinessJobForm(baseDraft);
    form.openingsCount = "1001";
    form.salaryMin = "Infinity";
    form.maxYearsExperience = "NaN";

    expect(validateFormForSave(form)).toEqual({
      openingsCount: "Openings must be a whole number from 1 through 1000.",
      salary: "Salary values must be finite non-negative numbers.",
      experience: "Experience values must be finite numbers from 0 through 99.",
    });
  });

  it("changes only the selected location unless making it primary", () => {
    const locations = [
      { cityCode: "SGN", countryCode: "VN", addressLine: "One", isPrimary: true },
      { cityCode: "HAN", countryCode: "VN", addressLine: "Two", isPrimary: false },
    ];

    expect(updateBusinessJobLocation(locations, 1, "cityCode", "DAD")).toEqual([
      locations[0],
      { ...locations[1], cityCode: "DAD" },
    ]);
    expect(updateBusinessJobLocation(locations, 1, "isPrimary", true)).toEqual([
      { ...locations[0], isPrimary: false },
      { ...locations[1], isPrimary: true },
    ]);
  });

  it("requires deadline, content and complete hiring locations on the content step", () => {
    const form = draftToBusinessJobForm(baseDraft);
    form.applicationDeadline = "";
    form.summary = " ";
    form.responsibilitiesText = "\n";
    form.requirementsText = "";
    form.locations = [{ cityCode: " ", countryCode: "VNM", addressLine: "", isPrimary: true }];

    expect(validateBusinessJobStep(form, "content", new Date("2026-07-20T12:00:00"))).toMatchObject({
      applicationDeadline: "Choose a deadline from tomorrow through 60 days out.",
      summary: "Add a job summary.",
      responsibilities: "Add at least one responsibility.",
      requirements: "Add at least one requirement.",
      locations: "Each location needs a city and a 2-letter country code.",
    });
  });

  it("maps readiness blockers to the step a user can fix", () => {
    expect(getStepForBlocker({ code: "MISSING_SKILLS", field: "skills", message: "Extract skills" })).toBe("skills");
    expect(getStepForBlocker({ code: "COMPANY_PROFILE", field: "company", message: "Complete profile" })).toBe("review");
    expect(getStepForBlocker({ code: "MISSING_TITLE", field: "title", message: "Title" })).toBe("basic");
    expect(getStepForBlocker({ code: "MISSING_SUMMARY", field: "summary", message: "Summary" })).toBe("content");
  });

  it("treats material content edits as requiring a fresh confirmed skills set", () => {
    const form = draftToBusinessJobForm(baseDraft);
    expect(getSkillsRefreshState(form, { ...form, benefitsText: "New benefit" })).toEqual({
      needsRefresh: false,
      changedFields: [],
    });
    expect(getSkillsRefreshState(form, { ...form, requirementsText: "Changed" })).toEqual({
      needsRefresh: true,
      changedFields: ["requirementsText"],
    });
  });

  it("sets the deadline input bounds to tomorrow through sixty days", () => {
    expect(getDateInputBounds(new Date("2026-07-20T12:00:00"))).toEqual({
      min: "2026-07-21",
      max: "2026-09-18",
    });
  });

  it("hydrates editable form values from a draft", () => {
    const form = draftToBusinessJobForm(baseDraft);

    expect(form.title).toBe("Frontend Intern");
    expect(form.openingsCount).toBe("2");
    expect(form.salaryMin).toBe("3000000");
    expect(form.responsibilitiesText).toBe("Build UI\nFix bugs");
    expect(form.requirementsText).toBe("React basics\nGit");
    expect(form.locations).toHaveLength(1);
    expect(form.locations[0].cityCode).toBe("SGN");
  });

  it("trims and drops blank lines when building array fields", () => {
    expect(splitLines(" Build UI \n\nFix bugs\n ")).toEqual(["Build UI", "Fix bugs"]);
  });

  it("builds update request with expected revision and numeric fields", () => {
    const form = draftToBusinessJobForm(baseDraft);
    form.title = "Frontend Fresher";
    form.openingsCount = "3";
    form.salaryMin = "";
    form.salaryMax = "7000000";
    form.requirementsText = "React\nTypeScript\n";

    const request = formToUpdateJobDraftRequest(form, baseDraft.revision);

    expect(request).toMatchObject({
      expectedRevision: 7,
      title: "Frontend Fresher",
      openingsCount: 3,
      salaryMin: null,
      salaryMax: 7000000,
      requirements: ["React", "TypeScript"],
      locations: [{ cityCode: "SGN", countryCode: "VN", addressLine: "Q1", isPrimary: true }],
    });
  });

  it("sends empty arrays and nulls so existing draft values can be cleared", () => {
    const form = draftToBusinessJobForm(baseDraft);
    form.locations = [];
    form.roleCode = "";
    form.applicationDeadline = "";
    form.summary = "";

    const request = formToUpdateJobDraftRequest(form, baseDraft.revision);

    expect(request).toMatchObject({
      locations: [],
      roleCode: null,
      applicationDeadline: null,
      summary: null,
    });
  });

  it("converts a selected deadline to the local end of day", () => {
    const result = new Date(dateInputToEndOfDayIso("2026-07-01"));

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
  });

  it("keeps a cleared deadline empty", () => {
    expect(dateInputToEndOfDayIso("")).toBe("");
  });
});
