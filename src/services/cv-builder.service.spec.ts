import { describe, expect, it } from "vitest";
import {
  mapStoreToCanonical,
  pickSectionContent,
  type BuilderSnapshot,
} from "./cv-builder.service";

const snapshot: BuilderSnapshot = {
  fullName: "Nguyen Minh An",
  email: "an@x.dev",
  phone: "0901 234 567",
  location: "Ho Chi Minh City",
  linkedin: "linkedin.com/in/anminh",
  portfolio: "",
  github: "github.com/anminh-dev",
  targetPosition: "Frontend Intern",
  summary: "Final-year SE student.",
  education: [
    {
      id: "e1",
      school: "FPT University",
      major: "Software Engineering",
      degree: "BSc",
      startYear: "2022",
      endYear: "2026",
      gpa: "3.4/4.0",
      coursework: "Web Development\nDatabase Systems",
      achievements: "",
    },
  ],
  experience: [
    {
      id: "x1",
      company: "CodeLight",
      position: "Frontend Intern",
      startDate: "06/2025",
      endDate: "09/2025",
      description: "Built React dashboard.",
      responsibilities: "Owned UI components.\nReviewed PRs.",
      achievements: "Cut load time by 30%.",
      aiRewrite: "TRANSIENT — không được gửi lên BE",
    },
    // entry trống → mapStoreToCanonical phải lọc bỏ
    {
      id: "x2",
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      description: "",
      responsibilities: "",
      achievements: "",
      aiRewrite: "",
    },
  ],
  projects: [
    {
      id: "p1",
      name: "StudyMate",
      role: "Lead",
      description: "Flashcard app.",
      tools: "React, TypeScript; Zustand",
      contribution: "Led FE architecture.",
      result: "400+ users.",
    },
  ],
  technicalSkills: ["React", "TypeScript"],
  softSkills: ["Teamwork"],
  tools: ["Git"],
  languages: ["English"],
  certifications: [
    {
      id: "c1",
      name: "freeCodeCamp RWD",
      organization: "freeCodeCamp",
      issueDate: "2024",
      credentialUrl: "https://freecodecamp.org/cert/1",
    },
  ],
  cvLanguage: "en",
};

describe("mapStoreToCanonical", () => {
  it("đổi format store → CanonicalCvDocument: bullets tách dòng, links gom, entry trống bị lọc", () => {
    const doc = mapStoreToCanonical(snapshot);
    expect(doc.language).toBe("en");
    expect(doc.contact.name).toBe("Nguyen Minh An");
    expect(doc.contact.links).toEqual([
      { label: "LinkedIn", url: "linkedin.com/in/anminh" },
      { label: "GitHub", url: "github.com/anminh-dev" },
    ]);
    expect(doc.experience).toHaveLength(1); // entry trống bị lọc
    expect(doc.experience[0].org).toBe("CodeLight");
    expect(doc.experience[0].bullets).toEqual([
      "Built React dashboard.",
      "Owned UI components.",
      "Reviewed PRs.",
      "Cut load time by 30%.",
    ]);
    expect(doc.projects[0].tech).toEqual(["React", "TypeScript", "Zustand"]);
    expect(doc.education[0].field).toBe("Software Engineering");
    expect(doc.education[0].highlights).toEqual(["Web Development", "Database Systems"]);
    expect(doc.certifications[0].issuer).toBe("freeCodeCamp");
    expect(doc.activities).toEqual([]);
  });
});

describe("pickSectionContent", () => {
  it("experience: gửi store verbatim, BỎ id + aiRewrite (transient)", () => {
    const content = pickSectionContent("experience", snapshot) as {
      entries: Record<string, unknown>[];
    };
    expect(content.entries).toHaveLength(2); // evaluate nhận cả entry trống — BE tự chấm
    expect(content.entries[0]).toEqual({
      company: "CodeLight",
      position: "Frontend Intern",
      startDate: "06/2025",
      endDate: "09/2025",
      description: "Built React dashboard.",
      responsibilities: "Owned UI components.\nReviewed PRs.",
      achievements: "Cut load time by 30%.",
    });
    expect(content.entries[0]).not.toHaveProperty("id");
    expect(content.entries[0]).not.toHaveProperty("aiRewrite");
  });

  it("skills + basic: đúng shape DTO", () => {
    expect(pickSectionContent("skills", snapshot)).toEqual({
      technicalSkills: ["React", "TypeScript"],
      softSkills: ["Teamwork"],
      tools: ["Git"],
      languages: ["English"],
    });
    expect(pickSectionContent("basic", snapshot)).toMatchObject({
      fullName: "Nguyen Minh An",
      github: "github.com/anminh-dev",
    });
  });
});
