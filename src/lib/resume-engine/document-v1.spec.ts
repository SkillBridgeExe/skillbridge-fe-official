import { describe, expect, it } from "vitest";
import { resumeDocumentPaths } from "./document-v1-paths";
import { createDefaultResumeDocumentV1 } from "./document-v1";
import {
  builderStateToResumeDocumentV1,
  resumeDocumentV1ToBuilderState,
  resumeDocumentV1ToDiagnosisCanonical,
} from "./document-v1-adapter";
import type { CvBuilderState } from "@/store/useCvBuilderStore";

function richBuilderState(): CvBuilderState {
  return {
    fullName: "Nguyen Van A",
    email: "a@example.com",
    phone: "0909000000",
    location: "Ho Chi Minh City",
    linkedin: "https://linkedin.com/in/a",
    portfolio: "https://portfolio.example.com",
    github: "https://github.com/a",
    targetPosition: "Frontend Developer",
    careerLevel: "fresher",
    industry: "Software",
    summary: "Frontend fresher focused on React and accessible UI.",
    summaryMode: "manual",
    experience: [
      {
        id: "exp_1",
        company: "ABC",
        position: "Frontend Intern",
        startDate: "2024",
        endDate: "2025",
        description: "- Built reusable React components",
        responsibilities: "- Reviewed UI bugs",
        achievements: "- Reduced form errors by 20%",
        aiRewrite: "",
      },
      {
        id: "exp_2",
        company: "DEF",
        position: "Teaching Assistant",
        startDate: "2023",
        endDate: "2024",
        description: "Supported JavaScript lab sessions",
        responsibilities: "",
        achievements: "Helped 30 students finish capstone exercises",
        aiRewrite: "",
      },
    ],
    projects: [
      {
        id: "project_1",
        name: "Booking App",
        role: "Backend Developer",
        link: "https://github.com/a/booking",
        description: "- Built booking APIs",
        tools: "Node.js, PostgreSQL",
        contribution: "- Designed reservation schema",
        result: "- Served 200 demo users",
      },
      {
        id: "project_2",
        name: "Portfolio",
        role: "Frontend Developer",
        link: "https://portfolio.example.com",
        description: "Built responsive portfolio pages",
        tools: "React, Tailwind",
        contribution: "",
        result: "",
      },
    ],
    education: [
      {
        id: "edu_1",
        school: "FPT University",
        major: "Software Engineering",
        degree: "Bachelor",
        startYear: "2021",
        endYear: "2025",
        gpa: "3.4",
        coursework: "- Web development",
        achievements: "- Merit scholarship",
      },
    ],
    technicalSkills: ["React", "TypeScript"],
    softSkills: ["Communication"],
    tools: ["Git", "Figma"],
    languages: ["English B2"],
    certifications: [
      {
        id: "cert_1",
        name: "AWS Cloud Practitioner",
        organization: "AWS",
        issueDate: "2025",
        credentialUrl: "https://aws.example.com/cert",
      },
    ],
    template: "bronzor",
    cvLanguage: "vi",
    resumeAccentColor: "#1f6b57",
    resumeFontScale: "large",
    resumeDensity: "compact",
    resumeHideSectionIcons: true,
    sectionVisibility: {
      summary: true,
      experience: true,
      education: true,
      projects: false,
      skills: true,
      certifications: true,
    },
    sectionOrder: ["summary", "projects", "experience", "education", "skills", "certifications"],
  } as CvBuilderState;
}

describe("ResumeDocumentV1 contract", () => {
  it("creates safe defaults for all sections and metadata", () => {
    const doc = createDefaultResumeDocumentV1();

    expect(doc.schemaVersion).toBe(1);
    expect(doc.id).toBeNull();
    expect(doc.sections.experience.items).toEqual([]);
    expect(doc.sections.projects.items).toEqual([]);
    expect(doc.sections.education.items).toEqual([]);
    expect(doc.sections.certifications.items).toEqual([]);
    expect(doc.sections.skills.technicalSkills).toEqual([]);
    expect(doc.metadata.templateId).toBe("onyx");
    expect(doc.metadata.sectionVisibility).toMatchObject({
      summary: true,
      experience: true,
      education: true,
      projects: true,
      skills: true,
      certifications: true,
    });
    expect(doc.metadata.sectionOrder).toEqual([
      "summary",
      "experience",
      "education",
      "projects",
      "skills",
      "certifications",
    ]);
  });

  it("round-trips meaningful builder data without semantic loss", () => {
    const source = richBuilderState();
    const doc = builderStateToResumeDocumentV1(source);
    const restored = resumeDocumentV1ToBuilderState(doc);

    expect(restored.fullName).toBe(source.fullName);
    expect(restored.email).toBe(source.email);
    expect(restored.targetPosition).toBe(source.targetPosition);
    expect(restored.summary).toBe(source.summary);
    expect(restored.experience?.map((item) => item.id)).toEqual(["exp_1", "exp_2"]);
    expect(restored.experience?.[0].achievements).toBe("- Reduced form errors by 20%");
    expect(restored.projects?.[0].tools).toBe("Node.js, PostgreSQL");
    expect(restored.education?.[0].coursework).toBe("- Web development");
    expect(restored.technicalSkills).toEqual(["React", "TypeScript"]);
    expect(restored.certifications?.[0].credentialUrl).toBe("https://aws.example.com/cert");
    expect(restored.template).toBe("bronzor");
    expect(restored.resumeAccentColor).toBe("#1f6b57");
    expect(restored.resumeFontScale).toBe("large");
    expect(restored.resumeDensity).toBe("compact");
    expect(restored.resumeHideSectionIcons).toBe(true);
    expect(restored.sectionVisibility?.projects).toBe(false);
    expect(restored.sectionOrder).toEqual([
      "summary",
      "projects",
      "experience",
      "education",
      "skills",
      "certifications",
    ]);
  });

  it("preserves existing ids and deterministically creates missing ids", () => {
    const state = richBuilderState();
    state.projects = [
      {
        id: "",
        name: "Clinic App",
        role: "Backend Developer",
        link: "",
        description: "Built appointment API",
        tools: "Node.js",
        contribution: "",
        result: "",
      },
    ];

    const firstDoc = builderStateToResumeDocumentV1(state);
    const secondDoc = builderStateToResumeDocumentV1(state);

    expect(firstDoc.sections.experience.items[0].id).toBe("exp_1");
    expect(firstDoc.sections.projects.items[0].id).toMatch(/^cv_project_/);
    expect(secondDoc.sections.projects.items[0].id).toBe(firstDoc.sections.projects.items[0].id);

    const editedState = { ...state, projects: [{ ...state.projects[0], result: "Demoed to mentors" }] };
    expect(builderStateToResumeDocumentV1(editedState).sections.projects.items[0].id).toBe(
      firstDoc.sections.projects.items[0].id,
    );
  });

  it("keeps diagnosis canonical text for scoring inputs", () => {
    const canonical = resumeDocumentV1ToDiagnosisCanonical(builderStateToResumeDocumentV1(richBuilderState()));

    expect(canonical.contact.name).toBe("Nguyen Van A");
    expect(canonical.summary).toContain("React");
    expect(canonical.experience[0].bullets).toEqual([
      "Built reusable React components",
      "Reviewed UI bugs",
      "Reduced form errors by 20%",
    ]);
    expect(canonical.projects[0].tech).toEqual(["Node.js", "PostgreSQL"]);
    expect(canonical.projects[0].bullets).toEqual([
      "Built booking APIs",
      "Designed reservation schema",
      "Served 200 demo users",
    ]);
    expect(canonical.skills.technical).toEqual(["React", "TypeScript"]);
    expect(canonical.certifications[0].issuer).toBe("AWS");
  });

  it("uses stable id-based paths for future patch and evidence anchors", () => {
    expect(resumeDocumentPaths.summaryContent()).toBe("/sections/summary/content");
    expect(resumeDocumentPaths.projectDescription("project_1")).toBe(
      "/sections/projects/items/project_1/description",
    );
    expect(resumeDocumentPaths.experienceAchievements("exp_1")).toBe(
      "/sections/experience/items/exp_1/achievements",
    );
    expect(resumeDocumentPaths.certificationName("cert_1")).toBe(
      "/sections/certifications/items/cert_1/name",
    );
  });
});
