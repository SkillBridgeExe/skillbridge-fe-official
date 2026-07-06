import { describe, expect, it } from "vitest";
import { resolveDiagnosisFixAnchor } from "./diagnosis-fix-anchor";
import type { ResumeDocumentV1 } from "@/lib/resume-engine/document-v1";
import { resumeDocumentPaths } from "@/lib/resume-engine/document-v1-paths";

function createMockDoc(): ResumeDocumentV1 {
  return {
    schemaVersion: 1,
    id: "doc-1",
    title: "Test Doc",
    language: "en",
    basics: {
      fullName: "Test User",
      email: "test@example.com",
      phone: "123456789",
      location: "City",
      linkedin: "",
      portfolio: "",
      github: "",
      targetPosition: "",
    },
    sections: {
      summary: {
        content: "Experienced developer with a passion for web technologies",
        mode: "manual",
      },
      education: { items: [] },
      experience: {
        items: [
          {
            id: "exp-1",
            company: "Tech Corp",
            position: "Frontend Engineer",
            startDate: "2020",
            endDate: "2023",
            description: "Developed web applications using React and Next.js.\nImproved performance by 20%.",
            responsibilities: "",
            achievements: "",
            aiRewrite: "",
          },
          {
            id: "exp-2",
            company: "Legacy Inc",
            position: "Backend Dev",
            startDate: "2018",
            endDate: "2020",
            description: "Maintained a .NET monolith.",
            responsibilities: "",
            achievements: "",
            aiRewrite: "",
          }
        ]
      },
      projects: {
        items: [
          {
            id: "proj-1",
            name: "E-commerce Platform",
            role: "Lead",
            link: "",
            tools: "React, Node.js, MongoDB",
            description: "Led a team of 5 to build a scalable e-commerce platform.",
            contribution: "Implemented complex state management using Zustand.",
            result: "",
          },
        ]
      },
      skills: {
        technicalSkills: ["React", "Node.js", "TypeScript", ".NET"],
        softSkills: [],
        tools: [],
        languages: [],
      },
      certifications: { items: [] },
    },
    metadata: {
      templateId: "onyx",
      resumeFontScale: "normal",
      resumeDensity: "comfortable",
      resumeAccentColor: "#0f172a",
      resumeHideSectionIcons: false,
      sectionVisibility: {},
      sectionOrder: [],
      careerLevel: "",
      industry: "",
    }
  };
}

describe("resolveDiagnosisFixAnchor", () => {
  it("case 1: Evidence text matches experience description -> exact path, high confidence", () => {
    const doc = createMockDoc();
    const result = resolveDiagnosisFixAnchor({
      document: doc,
      skill: { canonical: "react", displayName: "React" },
      evidenceText: "Developed web applications using React and Next.js.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.section).toBe("experience");
      expect(result.fieldPath).toBe(resumeDocumentPaths.experienceDescription("exp-1"));
      expect(result.source).toBe("evidence_text");
      expect(result.confidence).toBe("high");
      expect(result.currentValue).toContain("Developed web applications using React and Next.js.");
    }
  });

  it("case 2: Evidence text matches project contribution -> exact path, high confidence", () => {
    const doc = createMockDoc();
    // W54 spec says "project description/contribution/result", currently projects have bullets which map to description in V1?
    // Let's assume bullets are searched and we return projectDescription path
    const result = resolveDiagnosisFixAnchor({
      document: doc,
      skill: { canonical: "zustand", displayName: "Zustand" },
      evidenceText: "Implemented complex state management using Zustand.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.section).toBe("projects");
      expect(result.fieldPath).toBe(resumeDocumentPaths.projectContribution("proj-1"));
      expect(result.source).toBe("evidence_text");
      expect(result.confidence).toBe("high");
      expect(result.currentValue).toContain("Implemented complex state management using Zustand.");
    }
  });

  it("case 3: Skill token matches summary content -> returns summary path, confidence medium", () => {
    const doc = createMockDoc();
    const result = resolveDiagnosisFixAnchor({
      document: doc,
      skill: { canonical: "web_technologies", displayName: "Web Technologies" },
      evidenceText: "Some evidence that doesn't exist",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.section).toBe("summary");
      expect(result.fieldPath).toBe(resumeDocumentPaths.summaryContent());
      expect(result.source).toBe("skill_token");
      expect(result.confidence).toBe("medium");
      expect(result.currentValue).toBe("Experienced developer with a passion for web technologies");
    }
  });

  it("case 4: Skill token 'react' does not match 'reaction', 'interact', or 'reactive'", () => {
    const doc = createMockDoc();
    doc.sections.summary.content = "A highly reactive developer who interacts well and has fast reaction time.";
    const result = resolveDiagnosisFixAnchor({
      document: doc,
      skill: { canonical: "react", displayName: "React" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.section).toBe("experience");
      expect(result.fieldPath).toBe(resumeDocumentPaths.experienceDescription("exp-1"));
    }
  });

  it("case 5: Skill token '.net' matches '.NET'", () => {
    const doc = createMockDoc();
    const result = resolveDiagnosisFixAnchor({
      document: doc,
      skill: { canonical: ".net", displayName: ".NET" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.section).toBe("experience");
      expect(result.fieldPath).toBe(resumeDocumentPaths.experienceDescription("exp-2"));
    }
  });

  it("case 6: Project 'tools' contains React but description/contribution/result do not -> returns NO_MATCH (unsupported target)", () => {
    const doc = createMockDoc();
    if (doc.sections.projects.items.length > 0) {
      doc.sections.projects.items[0].description = "Led a team of 5";
      doc.sections.projects.items[0].contribution = "Implemented something else";
    }
    
    const result = resolveDiagnosisFixAnchor({
      document: doc,
      skill: { canonical: "mongodb", displayName: "MongoDB" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("NO_MATCH");
    }
  });

  it("case 7: No evidence and no skill hit -> returns NO_MATCH", () => {
    const doc = createMockDoc();
    const result = resolveDiagnosisFixAnchor({
      document: doc,
      skill: { canonical: "vue", displayName: "Vue" },
      evidenceText: "I used Vue",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("NO_MATCH");
    }
  });
});
