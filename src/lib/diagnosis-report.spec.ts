import { describe, it, expect } from "vitest";
import { buildDiagnosisReport, buildKeywordRows } from "./diagnosis-report";
import type { CvReviewData } from "@shared/api";

describe("buildDiagnosisReport", () => {
  const mockT = (key: string) => key;

  it("should return empty array if reviewData is null or undefined", () => {
    expect(buildDiagnosisReport(null, mockT)).toEqual([]);
    expect(buildDiagnosisReport(undefined, mockT)).toEqual([]);
  });

  it("should map full reviewData correctly", () => {
    const mockData: CvReviewData = {
      overallScore: 80,
      breakdown: {
        ats: 90,
        structure: 85,
        skills: 75,
        experience: 80,
      },
      atsCheck: {
        ats_rule_score: 90,
        summary: { total: 3, passed: 1, warned: 1, failed: 1 },
        rules: [
          { rule_id: "rule1", label: "Rule 1", status: "pass", score: 100, evidence: "email found" },
          { rule_id: "rule2", label: "Rule 2", status: "warn", score: 50, hint: "add phone" },
          { rule_id: "rule3", label: "Rule 3", status: "fail", score: 0, hint: "bad format" },
        ],
      },
      bullet_feedback: [
        { text: "Bullet 1", section: "experience", verbFirst: true, quantified: true, weakOpener: false, firstPerson: false, fillerCount: 0, tips: [] },
        { text: "Bullet 2", section: "experience", verbFirst: false, quantified: false, weakOpener: true, firstPerson: true, fillerCount: 1, tips: [] },
      ],
      buzzwords_detected: ["team player"],
      skills_extracted: [
        { name: "React", proficiency_hint: "advanced", evidence_text: "Built SPA with React" },
      ],
      skills_relevance_breakdown: {
        matched: [{ name: "React", importance: "REQUIRED", required_level: 3, cv_level: 3 }],
        partial: [{ name: "TypeScript", importance: "REQUIRED", required_level: 3, cv_level: 2 }],
        missing: [{ name: "Node.js", importance: "REQUIRED", required_level: 3 }],
      },
      dimensions: [
        { key: "action_verbs", score20: 16, rationale: "Good verbs" },
        { key: "skills_relevance", score20: 12, rationale: "Need more skills" }, // 12 * 5 = 60 (warn)
      ],
      issues: [],
      strengths: [],
      actionPlan: [],
      parsedCv: { summary: "", skills: [] },
    };

    const report = buildDiagnosisReport(mockData, mockT);

    expect(report).toHaveLength(4);

    // Group 1: ATS
    const atsGroup = report.find((g) => g.id === "ats");
    expect(atsGroup).toBeDefined();
    expect(atsGroup?.score).toBe(90);
    expect(atsGroup?.issueCount).toBe(2); // warned + failed
    expect(atsGroup?.items).toHaveLength(3);
    expect(atsGroup?.items[0].status).toBe("pass");
    expect(atsGroup?.items[1].status).toBe("warn");

    // Group 2: Content (Nội dung)
    const contentGroup = report.find((g) => g.id === "content");
    expect(contentGroup).toBeDefined();
    expect(contentGroup?.score).toBe(85);
    // Unquantified = 1, weak opener = 1, buzzwords = 1, first person = 1 -> all 4 have status warn
    expect(contentGroup?.issueCount).toBe(4);
    expect(contentGroup?.items).toHaveLength(4);

    // Group 3: Skills (Kỹ năng)
    const skillsGroup = report.find((g) => g.id === "skills");
    expect(skillsGroup).toBeDefined();
    expect(skillsGroup?.score).toBe(75);
    expect(skillsGroup?.issueCount).toBe(2); // partial + missing

    // Group 4: AI eval (Đánh giá AI)
    const aiGroup = report.find((g) => g.id === "ai_eval");
    expect(aiGroup).toBeDefined();
    expect(aiGroup?.score).toBe(80);
    expect(aiGroup?.issueCount).toBe(1); // score20 = 12 is warn (1 issue)
    expect(aiGroup?.items).toHaveLength(2);
    expect(aiGroup?.items[0].status).toBe("pass"); // 16 * 5 = 80 >= 70
    expect(aiGroup?.items[1].status).toBe("warn"); // 12 * 5 = 60 >= 50
    // Companion citation contract: rows must carry the dim-* anchor
    expect(aiGroup?.items[0].anchorId).toBe("dim-action_verbs");
    // ATS rows must NOT carry a score (CheckRow renders score as "/20")
    const atsRows = report.find((g) => g.id === "ats")?.items ?? [];
    expect(atsRows.every((r) => r.score === undefined)).toBe(true);
  });

  it("attaches per-dimension issues as subItems and counts them", () => {
    const mockData = {
      overallScore: 60,
      breakdown: { ats: 60, structure: 60, skills: 60, experience: 60 },
      dimensions: [{ key: "action_verbs", score20: 16, rationale: "ok" }],
      issues: [],
      strengths: [],
      actionPlan: [],
      parsedCv: {},
    } as unknown as CvReviewData;
    const issue = { title: "T", detail: "D", severity: "high", suggestion: "S" } as const;

    const report = buildDiagnosisReport(mockData, mockT, [[issue]]);
    const aiGroup = report.find((g) => g.id === "ai_eval");
    expect(aiGroup?.items[0].subItems).toEqual([issue]);
    expect(aiGroup?.issueCount).toBe(1); // 0 non-pass rows + 1 attached issue
  });

  it("falls back to an issues group when BE returns issues[] without dimensions", () => {
    const mockData = {
      overallScore: 60,
      breakdown: { ats: 60, structure: 60, skills: 60, experience: 60 },
      issues: [
        { title: "Thin experience", detail: "Only one role listed", severity: "high", suggestion: "Add projects" },
        { title: "Long summary", detail: "Summary is 10 lines", severity: "low", suggestion: "Trim it" },
      ],
      strengths: [],
      actionPlan: [],
      parsedCv: {},
    } as unknown as CvReviewData;

    const report = buildDiagnosisReport(mockData, mockT);
    const issuesGroup = report.find((g) => g.id === "issues");
    expect(issuesGroup).toBeDefined();
    expect(issuesGroup?.items).toHaveLength(2);
    expect(issuesGroup?.items[0].status).toBe("fail"); // high → fail
    expect(issuesGroup?.items[1].status).toBe("warn"); // low → warn
    expect(issuesGroup?.issueCount).toBe(2);
  });

  it("surfaces score-only categories when detailed check data is missing", () => {
    const mockData: CvReviewData = {
      overallScore: 50,
      breakdown: { ats: 50, structure: 50, skills: 50, experience: 50 },
      issues: [],
      strengths: [],
      actionPlan: [],
      parsedCv: { summary: "", skills: [] },
    };

    const report = buildDiagnosisReport(mockData, mockT);
    // Scores exist but there's no atsCheck/bullet_feedback/skills/dimensions
    // data → the four canonical categories still appear (score-only, zero
    // issues) so the rail never silently drops a scored dimension.
    expect(report.map((g) => g.id)).toEqual(["ats", "content", "skills", "ai_eval"]);
    expect(report.every((g) => g.issueCount === 0 && g.items.length === 0)).toBe(true);
    expect(report.find((g) => g.id === "content")?.score).toBe(50);
  });
});

describe("buildKeywordRows", () => {
  it("returns null when both keyword_frequency and per_skill are absent", () => {
    expect(buildKeywordRows(undefined, undefined)).toBeNull();
    expect(buildKeywordRows(null, null)).toBeNull();
    expect(buildKeywordRows([], [])).toBeNull();
  });

  it("joins keyword_frequency with per_skill by canonical_name", () => {
    const kf = [
      { keyword: "react", jd_count: 3, cv_count: 2 },
      { keyword: "node", jd_count: 1, cv_count: 0 },
    ];
    const ps = [
      { canonical_name: "react", display_name: "React", status: "matched" as const, importance: "REQUIRED" as const, weight: 1, effective_weight: 1, strength: 1, points_earned: 10, points_possible: 10 },
      { canonical_name: "node", display_name: "Node.js", status: "missing" as const, importance: "REQUIRED" as const, weight: 1, effective_weight: 1, strength: 0, points_earned: 0, points_possible: 10 },
    ];

    const rows = buildKeywordRows(kf, ps)!;
    expect(rows).toHaveLength(2);

    // missing REQUIRED should be first
    expect(rows[0].canonical_name).toBe("node");
    expect(rows[0].display_name).toBe("Node.js");
    expect(rows[0].cv_count).toBe(0);
    expect(rows[0].jd_count).toBe(1);
    expect(rows[0].importance).toBe("REQUIRED");
    expect(rows[0].status).toBe("missing");

    expect(rows[1].canonical_name).toBe("react");
    expect(rows[1].status).toBe("matched");
    expect(rows[1].cv_count).toBe(2);
  });

  it("sorts: missing REQUIRED → partial REQUIRED → matched", () => {
    const ps = [
      { canonical_name: "a", display_name: "A", status: "matched" as const, importance: "REQUIRED" as const, weight: 1, effective_weight: 1, strength: 1, points_earned: 10, points_possible: 10 },
      { canonical_name: "b", display_name: "B", status: "partial" as const, importance: "REQUIRED" as const, weight: 1, effective_weight: 1, strength: 0.5, points_earned: 5, points_possible: 10 },
      { canonical_name: "c", display_name: "C", status: "missing" as const, importance: "PREFERRED" as const, weight: 1, effective_weight: 1, strength: 0, points_earned: 0, points_possible: 10 },
      { canonical_name: "d", display_name: "D", status: "missing" as const, importance: "REQUIRED" as const, weight: 1, effective_weight: 1, strength: 0, points_earned: 0, points_possible: 10 },
    ];

    const rows = buildKeywordRows(null, ps)!;
    expect(rows[0].canonical_name).toBe("d"); // missing REQUIRED
    expect(rows[1].canonical_name).toBe("c"); // missing PREFERRED
    expect(rows[2].canonical_name).toBe("b"); // partial REQUIRED
    expect(rows[3].canonical_name).toBe("a"); // matched REQUIRED
  });

  it("renders rows from only keyword_frequency when per_skill is absent", () => {
    const kf = [{ keyword: "python", jd_count: 5, cv_count: 3 }];
    const rows = buildKeywordRows(kf, null)!;
    expect(rows).toHaveLength(1);
    expect(rows[0].importance).toBeNull();
    expect(rows[0].status).toBeNull();
    expect(rows[0].cv_count).toBe(3);
  });

  it("renders rows from only per_skill when keyword_frequency is absent", () => {
    const ps = [
      { canonical_name: "go", display_name: "Go", status: "matched" as const, importance: "NICE_TO_HAVE" as const, weight: 1, effective_weight: 1, strength: 1, points_earned: 5, points_possible: 5 },
    ];
    const rows = buildKeywordRows(null, ps)!;
    expect(rows).toHaveLength(1);
    expect(rows[0].cv_count).toBeNull();
    expect(rows[0].jd_count).toBeNull();
    expect(rows[0].display_name).toBe("Go");
  });
});
