import { describe, it, expect } from "vitest";
import { applyResumePatch, summarizeResumePatch, type ResumePatchOperation } from "./document-v1-patch";
import { createDefaultResumeDocumentV1 } from "./document-v1";
import { resumeDocumentV1ToDiagnosisCanonical } from "./document-v1-adapter";

describe("ResumeDocumentV1 Patch Pipeline", () => {
  it("should replace summary and return preview", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.summary.content = "Old summary";

    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/sections/summary/content", value: "New summary updated" },
    ];

    const patched = applyResumePatch(doc, ops);
    
    // original is unchanged
    expect(doc.sections.summary.content).toBe("Old summary");
    // patched is updated
    expect(patched.sections.summary.content).toBe("New summary updated");

    const summary = summarizeResumePatch(doc, ops);
    expect(summary.changes[0]).toEqual({
      path: "/sections/summary/content",
      section: "summary",
      label: "Professional Summary",
      before: "Old summary",
      after: "New summary updated",
    });
  });

  it("should replace project description by ID", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.projects.items.push({
      id: "proj_1",
      name: "App",
      role: "Dev",
      link: "",
      description: "Old desc",
      tools: "",
      contribution: "",
      result: ""
    });

    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/sections/projects/items/proj_1/description", value: "New desc" },
    ];

    const patched = applyResumePatch(doc, ops);
    expect(patched.sections.projects.items[0].description).toBe("New desc");
  });

  it("should replace experience achievements by ID", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.experience.items.push({
      id: "exp_1",
      company: "A",
      position: "B",
      startDate: "",
      endDate: "",
      description: "",
      responsibilities: "",
      achievements: "Old ach",
      aiRewrite: "",
    });

    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/sections/experience/items/exp_1/achievements", value: "New ach" },
    ];

    const patched = applyResumePatch(doc, ops);
    expect(patched.sections.experience.items[0].achievements).toBe("New ach");
  });

  it("should reject unknown path without mutation", () => {
    const doc = createDefaultResumeDocumentV1();
    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/metadata/templateId", value: "new_template" },
    ];

    expect(() => applyResumePatch(doc, ops)).toThrowError(/Unauthorized patch path/);
  });

  it("should reject unsupported add/remove operations", () => {
    const doc = createDefaultResumeDocumentV1();

    expect(() =>
      applyResumePatch(doc, [
        { op: "add", path: "/sections/summary/content", value: "Should not overwrite" },
      ]),
    ).toThrowError(/Unsupported patch operation: add/);

    expect(() =>
      applyResumePatch(doc, [
        { op: "remove", path: "/sections/summary/content" },
      ]),
    ).toThrowError(/Unsupported patch operation: remove/);
  });

  it("should reject missing item ID", () => {
    const doc = createDefaultResumeDocumentV1();
    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/sections/projects/items/nope/description", value: "desc" },
    ];

    expect(() => applyResumePatch(doc, ops)).toThrowError(/Target project ID not found/);
  });

  it("should reject wrong value type", () => {
    const doc = createDefaultResumeDocumentV1();
    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/sections/summary/content", value: { foo: "bar" } },
    ];

    expect(() => applyResumePatch(doc, ops)).toThrowError(/Invalid patch value type/);
  });

  it("should reject empty replacement by default", () => {
    const doc = createDefaultResumeDocumentV1();
    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/sections/summary/content", value: "   " },
    ];

    expect(() => applyResumePatch(doc, ops)).toThrowError(/Empty text replacement rejected/);
  });

  it("should reject structured JSON payloads for text paths", () => {
    const doc = createDefaultResumeDocumentV1();
    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/sections/summary/content", value: "{\"content\":\"Injected\"}" },
    ];

    expect(() => applyResumePatch(doc, ops)).toThrowError(/Structured JSON payload rejected/);
  });

  it("should enforce batch atomicity", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.summary.content = "Initial";
    
    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/sections/summary/content", value: "Valid update" },
      { op: "replace", path: "/metadata/templateId", value: "onyx2" }, // Invalid path
    ];

    expect(() => applyResumePatch(doc, ops)).toThrowError(/Unauthorized patch path/);
    
    // original must remain Initial
    expect(doc.sections.summary.content).toBe("Initial");
  });

  it("should fail closed when summarizing an invalid patch", () => {
    const doc = createDefaultResumeDocumentV1();

    expect(() =>
      summarizeResumePatch(doc, [
        { op: "replace", path: "/metadata/templateId", value: "onyx2" },
      ]),
    ).toThrowError(/Unauthorized patch path/);
  });

  it("should be compatible with diagnosis canonical", () => {
    const doc = createDefaultResumeDocumentV1();
    doc.sections.experience.items.push({
      id: "exp_1",
      company: "A",
      position: "B",
      startDate: "",
      endDate: "",
      description: "before",
      responsibilities: "",
      achievements: "",
      aiRewrite: "",
    });

    const ops: ResumePatchOperation[] = [
      { op: "replace", path: "/sections/experience/items/exp_1/description", value: "patched text\n- bullet 2" },
    ];

    const patched = applyResumePatch(doc, ops);
    const canonical = resumeDocumentV1ToDiagnosisCanonical(patched);
    
    expect(canonical.experience[0].bullets).toContain("patched text");
    expect(canonical.experience[0].bullets).toContain("bullet 2");
  });
});
