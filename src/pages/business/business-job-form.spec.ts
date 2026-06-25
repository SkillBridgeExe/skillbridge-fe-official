import { describe, expect, it } from "vitest";
import type { JobVersionDto } from "@/types/jobs";
import {
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
