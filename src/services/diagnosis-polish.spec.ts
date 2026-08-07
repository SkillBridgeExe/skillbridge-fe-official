import { describe, expect, it, vi } from "vitest";
import enLocale from "@/i18n/locales/en";
import viLocale from "@/i18n/locales/vi";
import {
  buildMatchDiagnosisState,
  buildHistoryDiagnosisState,
  persistDiagnosisState,
  resolveDiagnosisCvDisplayName,
} from "@/store/useDiagnosisStore";

// ── Item 4: results.collapse/expand keys must exist in BOTH locales ──
// (the JD-highlight toggle used a t("common.collapse") hack → EN users saw VN)
describe("diagnosis results i18n keys", () => {
  it("en defines results.collapse and results.expand", () => {
    expect((enLocale.diagnosis.results as Record<string, string>).collapse).toBeTruthy();
    expect((enLocale.diagnosis.results as Record<string, string>).expand).toBeTruthy();
  });
  it("vi defines results.collapse and results.expand", () => {
    expect((viLocale.diagnosis.results as Record<string, string>).collapse).toBeTruthy();
    expect((viLocale.diagnosis.results as Record<string, string>).expand).toBeTruthy();
  });

  // extraction_quality disclosure banner — both confidence copies must exist in BOTH locales
  // (a missing key would render the raw i18n path to the user).
  it("en + vi define review.extractionQuality.medium / .low / .flagsLabel", () => {
    for (const loc of [enLocale, viLocale]) {
      const eq = (loc.diagnosis.review as { extractionQuality?: Record<string, unknown> })
        .extractionQuality;
      expect(eq?.medium).toBeTruthy();
      expect(eq?.low).toBeTruthy();
      expect(eq?.flagsLabel).toBeTruthy();
    }
  });
});

// ── Item 3: persist only durable result state; never transient / File objects ──
describe("persistDiagnosisState (store partialize)", () => {
  it("keeps the analysis result so a reload does not wipe it", () => {
    const kept = persistDiagnosisState({
      step: "results",
      reviewData: { overallScore: 70 },
      lastCvId: "cv-1",
      targetRole: "frontend_developer",
      analysisMode: "cv-jd",
      hasActivatedJdMode: true,
      jobDescription: "Build a React dashboard",
      cvDisplayName: "frontend-cv.pdf",
      builderCvName: null,
    } as never);
    expect(kept.reviewData).toEqual({ overallScore: 70 });
    expect(kept.lastCvId).toBe("cv-1");
    expect(kept.step).toBe("results");
    expect(kept.targetRole).toBe("frontend_developer");
    expect(kept.jobDescription).toBe("Build a React dashboard");
    expect(kept.cvDisplayName).toBe("frontend-cv.pdf");
  });

  it("drops transient flags and non-serializable File objects", () => {
    const file = new File(["x"], "cv.pdf");
    const kept = persistDiagnosisState({
      step: "results",
      reviewData: { overallScore: 70 },
      isAnalyzing: true,
      apiError: "boom",
      highlightEvidence: "React",
      cvFile: file,
      jdFile: file,
    } as never) as Record<string, unknown>;
    expect("isAnalyzing" in kept).toBe(false);
    expect("apiError" in kept).toBe(false);
    expect("highlightEvidence" in kept).toBe(false);
    expect("cvFile" in kept).toBe(false);
    expect("jdFile" in kept).toBe(false);
  });
});

describe("buildHistoryDiagnosisState", () => {
  it("opens history with metadata from that CV and clears stale upload/JD/builder context", () => {
    const next = buildHistoryDiagnosisState({
      cvId: "cv-history",
      review: { overallScore: 82 } as never,
      cvDisplayName: "backend-fresher.pdf",
      targetRole: "backend_developer",
    });

    expect(next).toMatchObject({
      step: "cv-review",
      lastCvId: "cv-history",
      reviewData: { overallScore: 82 },
      cvFile: null,
      jdFile: null,
      jobDescription: "",
      analysisMode: "cv-only",
      hasActivatedJdMode: false,
      showJdInput: false,
      targetRole: "backend_developer",
      cvDisplayName: "backend-fresher.pdf",
      isFromBuilder: false,
      builderCvId: null,
      builderCvName: null,
    });
  });

  it("never keeps the previous role when historical metadata has no target role", () => {
    expect(
      buildHistoryDiagnosisState({
        cvId: "cv-history",
        review: { overallScore: 82 } as never,
        cvDisplayName: null,
        targetRole: null,
      }).targetRole,
    ).toBeNull();
  });
});

describe("buildMatchDiagnosisState", () => {
  it("switches to the cited match atomically and clears stale JD/builder metadata", () => {
    const next = buildMatchDiagnosisState({
      cvId: "cv-2",
      review: { overallScore: 70, jdMatch: { matchId: "match-2" } } as never,
      cvDisplayName: "backend-cv.pdf",
      targetRole: "backend_developer",
    });

    expect(next).toMatchObject({
      step: "results",
      lastCvId: "cv-2",
      reviewData: { overallScore: 70, jdMatch: { matchId: "match-2" } },
      cvFile: null,
      cvDisplayName: "backend-cv.pdf",
      jdFile: null,
      jobDescription: "",
      analysisMode: "cv-jd",
      hasActivatedJdMode: true,
      targetRole: "backend_developer",
      isFromBuilder: false,
      builderCvId: null,
      builderCvName: null,
    });
  });
});

describe("resolveDiagnosisCvDisplayName", () => {
  it("prefers the current Builder draft name over stale diagnosis metadata", () => {
    expect(resolveDiagnosisCvDisplayName({
      cvFileName: null,
      cvDisplayName: "old-upload.pdf",
      isFromBuilder: true,
      builderCvName: "Backend Fresher CV",
      fallback: "Untitled CV",
    })).toBe("Backend Fresher CV");
  });
});

// ── Item 1 (Download button): fetch the original CV file as a blob ──
vi.mock("@/api/core/http-client", () => ({ httpClient: { get: vi.fn() } }));

describe("downloadCvFileApi", () => {
  it("GETs /api/cvs/:id/file as a blob and returns the blob", async () => {
    const { httpClient } = await import("@/api/core/http-client");
    const { downloadCvFileApi } = await import("@/api/cv/file");
    const blob = new Blob(["pdf-bytes"], { type: "application/pdf" });
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: blob });

    const result = await downloadCvFileApi("cv-1");

    expect(httpClient.get).toHaveBeenCalledWith("/api/cvs/cv-1/file", { responseType: "blob" });
    expect(result).toBe(blob);
  });
});
