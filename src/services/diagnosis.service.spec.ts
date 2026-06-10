import { describe, expect, it } from "vitest";
import { mapCvDtoToReviewData, mapMatchDtoToJdMatch } from "./diagnosis.service";
import type { CvDto, CvMatchDto, CvReviewParsedResponse } from "@shared/api";

// ── Fixtures tối thiểu theo contract BE (docs/FE-diagnosis-rewire-plan.md §5) ──

const review: CvReviewParsedResponse = {
  language: "en",
  document: {
    language: "en",
    contact: { name: "An", email: "an@x.dev", phone: null, location: null, links: [] },
    summary: "Frontend intern with shipped side projects.",
    education: [],
    experience: [],
    projects: [],
    skills: { technical: [], soft: [], languages: [], tools: [] },
    certifications: [],
    activities: [],
  },
  overall_score: 67.4,
  ats_rule_score: 80,
  llm_score_dimensions: { action_verbs: 12, skills_relevance: 14, experience: 10, education: 16 },
  llm_total: 52,
  llm_normalized: 65,
  rationale: { action_verbs: "", skills_relevance: "", experience: "", education: "" },
  sections: [
    {
      name: "Experience",
      score: 10,
      issues: [
        { severity: "error", text: "No quantified results", hint: "Add metrics" },
        { severity: "info", text: "Dates use mixed formats" },
      ],
    },
  ],
  ats_extracted: {
    name: "An",
    email: "an@x.dev",
    phone: null,
    skills_raw: ["React", "TypeScript"],
    skills_extracted: [
      { name: "React", proficiency_hint: "intermediate", evidence_text: "Built 2 SPAs" },
    ],
  },
  skills_relevance_breakdown: {
    matched: [{ name: "React", importance: "REQUIRED", required_level: 3, cv_level: 3 }],
    partial: [],
    missing: [],
  },
  top_summary: { headline: "Solid base", prioritized_actions: ["Quantify results"] },
  evidence_ledger: {
    items: [
      {
        skill_canonical: "react",
        display_name: "React",
        strength: "demonstrated",
        sources: [{ kind: "project", label: "Portfolio SPA", excerpt: "Built 2 SPAs" }],
        most_recent_year: 2025,
        evidence_gap: null,
      },
    ],
  },
};

const cvDto: CvDto = {
  id: "cv-1",
  title: "my-cv.pdf",
  originalFileName: "my-cv.pdf",
  fileType: "application/pdf",
  fileSize: 1234,
  downloadUrl: "/api/cvs/cv-1/file",
  parsedText: "…",
  parsedJson: review.document,
  cvKind: "UPLOADED",
  language: "en",
  targetRole: "frontend_developer",
  isOcrOnly: false,
  atsReadabilityScore: 80,
  skills: [],
  review,
  createdAt: "2026-06-07T00:00:00Z",
  updatedAt: null,
};

const matchDto: CvMatchDto = {
  id: "m-1",
  cvId: "cv-1",
  jobDescriptionId: "jd-1",
  aiResultId: null,
  overallScore: 58.6,
  matchRatio: 60,
  requiredCoverage: 0.5,
  parsedResponse: {
    overall_score: 58.6,
    match_ratio: 60,
    matched_skills: [
      {
        skill_id: "s1",
        canonical_name: "react",
        display_name: "React",
        cv_level: 3,
        required_level: 3,
        importance: "REQUIRED",
        weight: 3,
      },
    ],
    partial_skills: [
      {
        skill_id: "s2",
        canonical_name: "typescript",
        display_name: "TypeScript",
        cv_level: 2,
        required_level: 4,
        importance: "PREFERRED",
        weight: 2,
        gap_levels: 2,
      },
    ],
    missing_skills: [
      {
        skill_id: "s3",
        canonical_name: "nextjs",
        display_name: "Next.js",
        required_level: 3,
        importance: "REQUIRED",
        weight: 3,
        gap_levels: 3,
      },
    ],
    bonus_skills: [],
    required_coverage: 0.5,
    unnormalized_cv_skills: [],
    unnormalized_jd_requirements: [],
    scoring_breakdown: {
      total_requirements: 3,
      matched_count: 1,
      partial_count: 1,
      missing_count: 1,
      weight_sum: 8,
      achieved_weight: 4,
      required_total: 2,
      required_met: 1,
      raw_weighted_score: 50,
      cap_applied: true,
    },
    source_of_requirements: "role_rubric",
    target_role: "frontend_developer",
    experience_fit: {
      status: "stretch",
      required_years_min: 2,
      required_years_max: 4,
      cv_years: 1,
      confidence: "estimated",
    },
    inferred_skills: [
      {
        canonical_name: "javascript",
        display_name: "JavaScript",
        tag: "ecosystem",
        reason: "React work usually implies JavaScript fundamentals.",
      },
    ],
  },
  jobDescription: null,
  createdAt: "2026-06-07T00:00:00Z",
};

describe("mapCvDtoToReviewData", () => {
  it("maps BE review sang UI model: điểm BE giữ nguyên (chỉ round), dim 0-20 → 0-100", () => {
    const ui = mapCvDtoToReviewData(cvDto);
    expect(ui.overallScore).toBe(67);
    expect(ui.breakdown.ats).toBe(80);
    expect(ui.breakdown.structure).toBe(60); // action_verbs 12 × 5
    expect(ui.breakdown.skills).toBe(70); // skills_relevance 14 × 5
    expect(ui.breakdown.experience).toBe(50); // experience 10 × 5
  });

  it("flatten sections[].issues + map severity error/warning/info → high/medium/low", () => {
    const ui = mapCvDtoToReviewData(cvDto);
    expect(ui.issues).toHaveLength(2);
    expect(ui.issues[0]).toEqual({
      title: "Experience",
      detail: "No quantified results",
      severity: "high",
      suggestion: "Add metrics",
    });
    expect(ui.issues[1].severity).toBe("low");
    expect(ui.issues[1].suggestion).toBe("");
  });

  it("pass-through document đầy đủ cho preview giàu (W3d)", () => {
    const ui = mapCvDtoToReviewData(cvDto);
    expect(ui.document?.contact.name).toBe("An");
    expect(ui.document?.summary).toContain("Frontend intern");
  });

  it("pass-through ats_check đầy đủ cho tab ATS (W3c)", () => {
    const withAts = {
      ...cvDto,
      review: {
        ...review,
        ats_check: {
          ats_rule_score: 95,
          rules: [
            { rule_id: "email_present", label: "Có email", status: "pass" as const, score: 1, evidence: "an@x.dev" },
            { rule_id: "reasonable_length", label: "Độ dài hợp lý", status: "warn" as const, score: 0.5, hint: "CV ngắn" },
          ],
          summary: { total: 2, passed: 1, warned: 1, failed: 0 },
        },
      },
    };
    const ui = mapCvDtoToReviewData(withAts);
    expect(ui.atsCheck?.summary.passed).toBe(1);
    expect(ui.atsCheck?.rules[1].hint).toBe("CV ngắn");
  });

  it("pass-through 4 dim thật + rationale cho W3 UI", () => {
    const ui = mapCvDtoToReviewData(cvDto);
    expect(ui.dimensions).toHaveLength(4);
    expect(ui.dimensions?.[0]).toEqual({ key: "action_verbs", score20: 12, rationale: "" });
    expect(ui.dimensions?.[3].key).toBe("education");
    expect(ui.dimensions?.[3].score20).toBe(16);
  });

  it("lift skills_extracted từ ats_extracted (Δ3) + giữ insights thật (mock KHÔNG đè)", () => {
    const ui = mapCvDtoToReviewData(cvDto);
    expect(ui.skills_extracted).toHaveLength(1);
    expect(ui.skills_extracted?.[0].name).toBe("React");
    expect(ui.skills_relevance_breakdown?.matched[0].name).toBe("React");
    expect(ui.top_summary?.headline).toBe("Solid base");
    expect(ui.actionPlan).toEqual(["Quantify results"]);
  });

  it("pass-through evidence_ledger without transforming evidence data", () => {
    const ui = mapCvDtoToReviewData(cvDto);
    expect(ui.evidence_ledger?.items[0]).toMatchObject({
      skill_canonical: "react",
      display_name: "React",
      strength: "demonstrated",
      most_recent_year: 2025,
    });
    expect(ui.evidence_ledger?.items[0].sources[0]).toEqual({
      kind: "project",
      label: "Portfolio SPA",
      excerpt: "Built 2 SPAs",
    });
  });

  it("throw rõ ràng khi review null (upload xong nhưng thiếu kết quả chấm)", () => {
    expect(() => mapCvDtoToReviewData({ ...cvDto, review: null })).toThrow(/re-running/);
  });
});

describe("mapMatchDtoToJdMatch", () => {
  it("gộp matched/partial/missing thành hardSkills đúng status + level 1-5 → %", () => {
    const jd = mapMatchDtoToJdMatch(matchDto);
    expect(jd.matchScore).toBe(59);
    expect(jd.hardSkills).toHaveLength(3);
    expect(jd.hardSkills[0]).toEqual({
      name: "React",
      canonical_name: "react",
      cvScore: 60,
      jdRequired: 60,
      status: "present",
    });
    expect(jd.hardSkills[1].status).toBe("partial");
    expect(jd.hardSkills[2]).toMatchObject({ status: "missing", cvScore: 0, jdRequired: 60 });
  });

  it("criticalGaps = missing REQUIRED; summary đếm số liệu BE thật", () => {
    const jd = mapMatchDtoToJdMatch(matchDto);
    expect(jd.criticalGaps).toEqual(["Next.js"]);
    expect(jd.summary).toContain("Matched 1/3");
    expect(jd.summary).toContain("50%");
    expect(jd.scoring_breakdown?.cap_applied).toBe(true);
    expect(jd.required_coverage).toBe(0.5);
    expect(jd.experience_fit?.status).toBe("stretch");
    expect(jd.inferred_skills?.[0].canonical_name).toBe("javascript");
  });

  it("không vỡ khi parsedResponse null — fallback matchRatio/0", () => {
    const jd = mapMatchDtoToJdMatch({ ...matchDto, overallScore: null, parsedResponse: null });
    expect(jd.matchScore).toBe(60); // fallback matchRatio
    expect(jd.hardSkills).toEqual([]);
    expect(jd.criticalGaps).toEqual([]);
  });
});
