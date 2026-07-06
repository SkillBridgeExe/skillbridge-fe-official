import { describe, it, expect } from "vitest";
import { companionTargetToResumePath, buildCvBuilderPatchProposal } from "./cv-builder-patch";
import { createDefaultResumeDocumentV1 } from "@/lib/resume-engine/document-v1";

describe("CvBuilder Patch Mapping", () => {
  it("maps summary correctly", () => {
    const doc = createDefaultResumeDocumentV1();
    const path = companionTargetToResumePath(doc, { section: "summary", fieldPath: "summary.content" });
    expect(path).toBe("/sections/summary/content");
  });

  it("accepts already normalized W52 path", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.experience.items.push({
      id: "exp_1", company: "", position: "", startDate: "", endDate: "",
      description: "old", responsibilities: "", achievements: "", aiRewrite: "",
    });

    const proposal = buildCvBuilderPatchProposal(doc, {
      section: "experience",
      fieldPath: "/sections/experience/items/exp_1/description",
      after: "normalized path update",
    });

    expect(proposal.operation.path).toBe("/sections/experience/items/exp_1/description");
    expect(proposal.patchedDocument.sections.experience.items[0].description).toBe("normalized path update");
  });

  it("resolves experience[0].description to item id", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.experience.items.push({
      id: "exp_1", company: "", position: "", startDate: "", endDate: "",
      description: "old", responsibilities: "", achievements: "", aiRewrite: ""
    });
    
    const path = companionTargetToResumePath(doc, { section: "experience", fieldPath: "experience[0].description" });
    expect(path).toBe("/sections/experience/items/exp_1/description");
  });

  it("resolves experience[0].achievements to item id", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.experience.items.push({
      id: "exp_2", company: "", position: "", startDate: "", endDate: "",
      description: "", responsibilities: "", achievements: "old", aiRewrite: ""
    });
    
    const path = companionTargetToResumePath(doc, { section: "experience", fieldPath: "experience[0].achievements" });
    expect(path).toBe("/sections/experience/items/exp_2/achievements");
  });

  it("resolves experience id and colon forms", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.experience.items.push({
      id: "exp_1", company: "", position: "", startDate: "", endDate: "",
      description: "", responsibilities: "old", achievements: "", aiRewrite: "",
    });

    expect(companionTargetToResumePath(doc, {
      section: "experience",
      fieldPath: "experience.exp_1.responsibilities",
    })).toBe("/sections/experience/items/exp_1/responsibilities");

    expect(companionTargetToResumePath(doc, {
      section: "experience",
      fieldPath: "experience:exp_1:responsibilities",
    })).toBe("/sections/experience/items/exp_1/responsibilities");
  });

  it("resolves projects[0].description to item id", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.projects.items.push({
      id: "proj_1", name: "", role: "", link: "", description: "old", tools: "", contribution: "", result: ""
    });
    
    const path = companionTargetToResumePath(doc, { section: "projects", fieldPath: "projects[0].description" });
    expect(path).toBe("/sections/projects/items/proj_1/description");
  });

  it("returns null for missing index", () => {
    const doc = createDefaultResumeDocumentV1();
    // No items pushed
    const path = companionTargetToResumePath(doc, { section: "projects", fieldPath: "projects[0].description" });
    expect(path).toBeNull();
  });

  it("returns null for unknown field", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.projects.items.push({
      id: "proj_1", name: "", role: "", link: "", description: "old", tools: "", contribution: "", result: ""
    });
    
    const path = companionTargetToResumePath(doc, { section: "projects", fieldPath: "projects[0].invalidField" });
    expect(path).toBeNull();
  });

  it("buildCvBuilderPatchProposal rejects missing target before applying", () => {
    const doc = createDefaultResumeDocumentV1();
    expect(() => {
      buildCvBuilderPatchProposal(doc, { section: "projects", fieldPath: "projects[0].description", after: "new" });
    }).toThrowError(/Cannot map companion target/);
  });

  it("buildCvBuilderPatchProposal rejects invalid text payload through W52", () => {
    const doc = createDefaultResumeDocumentV1();

    expect(() => {
      buildCvBuilderPatchProposal(doc, {
        section: "summary",
        fieldPath: "summary",
        after: "{\"content\":\"Injected\"}",
      });
    }).toThrowError(/Structured JSON payload rejected/);
  });

  it("buildCvBuilderPatchProposal keeps original document unchanged", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.summary.content = "old";
    
    const proposal = buildCvBuilderPatchProposal(doc, { section: "summary", fieldPath: "summary", after: "new summary" });
    
    // original doc unchanged
    expect(doc.sections.summary.content).toBe("old");
    // patched doc updated
    expect(proposal.patchedDocument.sections.summary.content).toBe("new summary");
    expect(proposal.operation.path).toBe("/sections/summary/content");
    expect(proposal.summary.changes[0].after).toBe("new summary");
  });
});
