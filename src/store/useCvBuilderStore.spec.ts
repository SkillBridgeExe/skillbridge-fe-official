import { describe, expect, it } from "vitest";
import { useCvBuilderStore } from "./useCvBuilderStore";
import type { CanonicalCvDocument } from "@shared/api";

describe("useCvBuilderStore.hydrateFromCanonical", () => {
  it("hydrates contact, projects, and project links from a canonical CV", () => {
    const doc: CanonicalCvDocument = {
      language: "en",
      contact: {
        name: "Anonymized Candidate",
        email: "candidate@example.com",
        phone: "0912.345.678",
        location: "Thu Duc, Ho Chi Minh City",
        links: [
          { label: "LinkedIn", url: "https://linkedin.com/in/candidate" },
          { label: "GitHub", url: "https://github.com/candidate" },
        ],
      },
      summary: "Backend developer.",
      education: [],
      experience: [],
      projects: [
        {
          name: "Gender HealthCare Service Management System",
          role: "Backend Developer",
          tech: ["ASP.NET Core", "SQL Server"],
          bullets: ["Designed RESTful APIs.", "Secured endpoints with JWT."],
          link: "https://github.com/example/gender-healthcare",
        },
      ],
      skills: { technical: ["C#"], soft: [], languages: ["English"], tools: ["Docker"] },
      certifications: [],
      activities: [],
    };

    useCvBuilderStore.getState().hydrateFromCanonical(doc);
    const state = useCvBuilderStore.getState();

    expect(state.fullName).toBe("Anonymized Candidate");
    expect(state.email).toBe("candidate@example.com");
    expect(state.phone).toBe("0912.345.678");
    expect(state.location).toBe("Thu Duc, Ho Chi Minh City");
    expect(state.projects[0]).toMatchObject({
      name: "Gender HealthCare Service Management System",
      role: "Backend Developer",
      tools: "ASP.NET Core, SQL Server",
      description: "Designed RESTful APIs.\nSecured endpoints with JWT.",
      link: "https://github.com/example/gender-healthcare",
    });
  });

  it("tracks the source CV separately until the server draft is created", () => {
    useCvBuilderStore.getState().setSeedSourceCvId("uploaded-cv-1");

    expect(useCvBuilderStore.getState().seedSourceCvId).toBe("uploaded-cv-1");

    useCvBuilderStore.getState().reset();
    expect(useCvBuilderStore.getState().seedSourceCvId).toBeNull();
  });
});

describe("getSectionStatuses quality-gating", () => {
  const reset = () => useCvBuilderStore.getState().reset();

  it("marks Career Target needs-improvement when industry is gibberish", () => {
    reset();
    const s = useCvBuilderStore.getState();
    s.setCareerTarget("targetPosition", "Frontend Developer");
    s.setCareerTarget("careerLevel", "fresher");
    s.setCareerTarget("industry", "sssssssss");
    const career = useCvBuilderStore.getState().getSectionStatuses()[1];
    expect(career.status).toBe("needs-improvement");
  });

  it("marks Career Target needs-improvement on a role typo", () => {
    reset();
    const s = useCvBuilderStore.getState();
    s.setCareerTarget("targetPosition", "AI Enginer");
    s.setCareerTarget("careerLevel", "fresher");
    const career = useCvBuilderStore.getState().getSectionStatuses()[1];
    expect(career.status).toBe("needs-improvement");
    expect(career.reason).toContain("typo");
  });

  it("keeps Career Target completed for clean input", () => {
    reset();
    const s = useCvBuilderStore.getState();
    s.setCareerTarget("targetPosition", "Frontend Developer");
    s.setCareerTarget("careerLevel", "fresher");
    s.setCareerTarget("industry", "Fintech");
    const career = useCvBuilderStore.getState().getSectionStatuses()[1];
    expect(career.status).toBe("completed");
  });

  it("marks Summary needs-improvement when gibberish even if long", () => {
    reset();
    useCvBuilderStore.getState().setSummary("ssssssssssssssssssssssssssssssss");
    const summary = useCvBuilderStore.getState().getSectionStatuses()[2];
    expect(summary.status).toBe("needs-improvement");
  });
});
