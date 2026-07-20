import { describe, it, expect, beforeEach } from "vitest";
import { seedBuilderFromDocument } from "./edit-in-builder";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import type { CanonicalCvDocument } from "@shared/api";

const doc = {
  language: "vi",
  summary: "Tóm tắt",
  skills: { technical: [], soft: [], languages: [], tools: [] },
  education: [],
  experience: [],
  projects: [],
  certifications: [],
  activities: [],
} as unknown as CanonicalCvDocument;

describe("seedBuilderFromDocument — diagnosed-cv identity", () => {
  beforeEach(() => {
    useDiagnosisStore.setState({ lastCvId: null, targetRole: null });
    useCvBuilderStore.getState().setSeedSourceCvId(null);
    useCvBuilderStore.getState().setDiagnosisSourceCvId(null);
  });

  it("carries lastCvId into seedSourceCvId AND diagnosisSourceCvId", () => {
    useDiagnosisStore.setState({ lastCvId: "cv-123" });
    seedBuilderFromDocument(doc);
    const s = useCvBuilderStore.getState();
    expect(s.seedSourceCvId).toBe("cv-123");
    expect(s.diagnosisSourceCvId).toBe("cv-123");
    expect(s.seededFromDiagnosis).toBe(true);
  });

  it("stays null when no diagnosed cvId (giữ hành vi cũ)", () => {
    seedBuilderFromDocument(doc);
    expect(useCvBuilderStore.getState().seedSourceCvId).toBeNull();
    expect(useCvBuilderStore.getState().diagnosisSourceCvId).toBeNull();
  });
});
