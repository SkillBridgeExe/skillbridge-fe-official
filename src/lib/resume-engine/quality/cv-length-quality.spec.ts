import { describe, it, expect } from "vitest";
import { evaluateCvLengthQuality } from "./cv-length-quality";
import type { CanonicalCvDocument } from "@shared/api";

type CanonicalProject = CanonicalCvDocument["projects"][number];
type CanonicalExperience = CanonicalCvDocument["experience"][number];
type CanonicalCertification = CanonicalCvDocument["certifications"][number];

function createMockCv(overrides: Partial<CanonicalCvDocument> = {}): CanonicalCvDocument {
  return {
    language: "en",
    contact: {
      name: "Test",
      email: null,
      phone: null,
      location: null,
      links: []
    },
    summary: "",
    education: [],
    experience: [],
    projects: [],
    skills: { technical: [], soft: [], languages: [], tools: [] },
    certifications: [],
    activities: [],
    ...overrides
  } as CanonicalCvDocument;
}

describe("evaluateCvLengthQuality", () => {
  it("returns good for empty fresher cv on 1 page", () => {
    const cv = createMockCv();
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 1,
      seniorityHint: "fresher"
    });

    expect(result.status).toBe("good");
    expect(result.targetPages).toBe(1);
    expect(result.sectionSuggestions.length).toBe(0);
  });

  it("returns watch for fresher cv on 2 pages", () => {
    const cv = createMockCv();
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 2,
      seniorityHint: "fresher"
    });

    expect(result.status).toBe("watch");
    expect(result.targetPages).toBe(1);
  });

  it("returns good for senior cv on 2 pages", () => {
    const cv = createMockCv();
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 2,
      seniorityHint: "senior"
    });

    expect(result.status).toBe("good");
    expect(result.targetPages).toBe(2);
  });

  it("returns too_long for fresher cv on 3 pages", () => {
    const cv = createMockCv();
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 3,
      seniorityHint: "fresher"
    });

    expect(result.status).toBe("too_long");
    expect(result.targetPages).toBe(1);
  });

  it("does not automatically mark senior target roles as too long on 2 pages", () => {
    const cv = createMockCv();
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 2,
      targetRole: "Senior Frontend Engineer"
    });

    expect(result.status).toBe("good");
    expect(result.targetPages).toBe(2);
  });

  it("uses content estimate when renderer page metadata is still one page", () => {
    const longBullet = "Built a role-relevant feature with measurable business impact. ".repeat(35);
    const longProjects = Array.from({ length: 5 }, (_, idx): CanonicalProject => ({
      name: `Project ${idx + 1}`,
      role: "Developer",
      tech: [],
      bullets: [longBullet, longBullet],
      link: null,
    }));
    const cv = createMockCv({
      projects: longProjects,
    });

    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 1,
      seniorityHint: "fresher"
    });

    expect(result.status).toBe("too_long");
    expect(result.pageCount).toBeGreaterThanOrEqual(3);
  });

  it("suggests shortening long summary", () => {
    const cv = createMockCv({
      summary: "This is a sentence. ".repeat(6) // 6 sentences
    });
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 1,
      seniorityHint: "fresher"
    });

    expect(result.sectionSuggestions.find(s => s.section === "summary")).toBeDefined();
  });

  it("suggests removing projects if fresher has more than 3", () => {
    const cv = createMockCv({
      projects: [
        { name: "P1", role: "", tech: [], bullets: [], link: null },
        { name: "P2", role: "", tech: [], bullets: [], link: null },
        { name: "P3", role: "", tech: [], bullets: [], link: null },
        { name: "P4", role: "", tech: [], bullets: [], link: null },
      ] satisfies CanonicalProject[]
    });
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 1,
      seniorityHint: "fresher"
    });

    expect(result.sectionSuggestions.find(s => s.section === "projects")).toBeDefined();
  });

  it("suggests improving weak bullets", () => {
    const cv = createMockCv({
      experience: [
        { org: "O", role: "R", start: null, end: null, location: null, bullets: ["Did stuff", "Helped team", "Good job"] }
      ] satisfies CanonicalExperience[]
    });
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 1,
      seniorityHint: "fresher"
    });

    expect(result.sectionSuggestions.find(s => s.section === "experience")).toBeDefined();
  });

  it("suggests trimming certs if more than 3", () => {
    const cv = createMockCv({
      certifications: [
        { name: "C1", issuer: "", date: "" },
        { name: "C2", issuer: "", date: "" },
        { name: "C3", issuer: "", date: "" },
        { name: "C4", issuer: "", date: "" },
      ] satisfies CanonicalCertification[]
    });
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 1,
      seniorityHint: "fresher"
    });

    expect(result.sectionSuggestions.find(s => s.section === "certifications")).toBeDefined();
  });

  it("suggests focusing skills when skill list is stuffed", () => {
    const cv = createMockCv({
      skills: {
        technical: Array.from({ length: 16 }, (_, idx) => `Skill ${idx + 1}`),
        soft: [],
        languages: [],
        tools: [],
      },
    });

    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 1,
      seniorityHint: "fresher"
    });

    expect(result.sectionSuggestions.find(s => s.section === "skills")).toBeDefined();
  });
  
  it("turns good into watch if too many warnings exist despite page count being good", () => {
    const cv = createMockCv({
      summary: "This is a sentence. ".repeat(6), // 1 warning
      projects: [
        { name: "P1", role: "", tech: [], bullets: [], link: null },
        { name: "P2", role: "", tech: [], bullets: [], link: null },
        { name: "P3", role: "", tech: [], bullets: [], link: null },
        { name: "P4", role: "", tech: [], bullets: [], link: null },
      ] satisfies CanonicalProject[] // 1 warning
    });
    
    const result = evaluateCvLengthQuality({
      document: cv,
      pageCount: 1,
      seniorityHint: "fresher"
    });

    expect(result.status).toBe("watch");
    expect(result.sectionSuggestions.length).toBeGreaterThanOrEqual(2);
  });
});
