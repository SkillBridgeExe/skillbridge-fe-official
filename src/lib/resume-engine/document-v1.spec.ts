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
    resumeHeadingScale: "prominent",
    resumeBaseFontSize: 12,
    resumeLineHeight: "relaxed",
    resumePageMargin: "compact",
    resumeSectionSpacing: "compact",
    resumeSidebarPosition: "right",
    resumeSidebarWidth: "wide",
    resumeDividerStyle: "accent",
    resumeHideSectionIcons: true,
    resumeAtsSafeMode: true,
    resumeTextColor: "#111827",
    resumePictureVisible: true,
    resumePictureShape: "rounded",
    resumePictureSize: 88,
    resumePictureBorderWidth: 2,
    resumePictureBorderColor: "#2563eb",
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
    expect(restored.resumeHeadingScale).toBe("prominent");
    expect(restored.resumeBaseFontSize).toBe(12);
    expect(restored.resumeLineHeight).toBe("relaxed");
    expect(restored.resumePageMargin).toBe("compact");
    expect(restored.resumeSectionSpacing).toBe("compact");
    expect(restored.resumeSidebarPosition).toBe("right");
    expect(restored.resumeSidebarWidth).toBe("wide");
    expect(restored.resumeDividerStyle).toBe("accent");
    expect(restored.resumeHideSectionIcons).toBe(true);
    expect(restored.resumeAtsSafeMode).toBe(true);
    expect(restored.resumeTextColor).toBe("#111827");
    expect(restored.resumePictureVisible).toBe(true);
    expect(restored.resumePictureShape).toBe("rounded");
    expect(restored.resumePictureSize).toBe(88);
    expect(restored.resumePictureBorderWidth).toBe(2);
    expect(restored.resumePictureBorderColor).toBe("#2563eb");
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

  it("round-trips placement, page plan and custom sections losslessly (P4)", () => {
    const source = richBuilderState();
    source.sectionPlacement = { summary: "sidebar", experience: "main", skills: "main" };
    source.layoutPages = [{ id: "pg_a", name: "Trang chính" }, { id: "pg_b", fullWidth: true }];
    source.sectionPage = { education: "pg_b", custom_act: "pg_b" };
    source.customSections = [
      {
        id: "custom_act",
        title: "Hoạt động",
        placement: "sidebar",
        visible: true,
        items: [{ id: "i1", heading: "CLB Guitar", body: "Trưởng nhóm 2024" }],
      },
    ];

    const doc = builderStateToResumeDocumentV1(source);
    expect(doc.metadata.layout?.pages.map((page) => page.id)).toEqual(["pg_a", "pg_b"]);
    expect(doc.metadata.layout?.pages[1].fullWidth).toBe(true);
    expect(doc.metadata.layout?.pages[1].main).toContain("education");
    expect(doc.metadata.layout?.pages[1].sidebar).toContain("custom_act");
    expect(doc.sections.custom).toHaveLength(1);

    const restored = resumeDocumentV1ToBuilderState(doc);
    expect(restored.sectionPlacement?.summary).toBe("sidebar");
    expect(restored.sectionPlacement?.skills).toBe("main");
    expect(restored.sectionPage?.education).toBe("pg_b");
    expect(restored.layoutPages).toEqual([{ id: "pg_a", name: "Trang chính" }, { id: "pg_b", fullWidth: true }]);
    expect(restored.customSections).toEqual(source.customSections);

    // Second round-trip is stable (no drift).
    const again = resumeDocumentV1ToBuilderState(
      builderStateToResumeDocumentV1({ ...source, ...restored } as CvBuilderState),
    );
    expect(again.layoutPages).toEqual(restored.layoutPages);
    expect(again.sectionPlacement).toEqual(restored.sectionPlacement);
    expect(again.customSections).toEqual(restored.customSections);
  });

  it("derives the historical split for docs saved before the layout plan existed", () => {
    const doc = builderStateToResumeDocumentV1(richBuilderState());
    delete doc.metadata.layout;
    delete doc.sections.custom;

    const restored = resumeDocumentV1ToBuilderState(doc);
    expect(restored.layoutPages).toEqual([{ id: "page_1" }]);
    expect(restored.sectionPlacement?.experience).toBe("main");
    expect(restored.sectionPlacement?.summary).toBe("sidebar");
    expect(restored.sectionPlacement?.certifications).toBe("sidebar");
    expect(restored.customSections).toEqual([]);
    // Legacy mirror still drives the order.
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
