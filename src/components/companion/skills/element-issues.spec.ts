import { describe, expect, it } from "vitest";
import {
  collectElementIssues,
  pickActiveResolvableIssue,
  type ElementIssue,
} from "./element-issues";
import type {
  CvJdMatch,
  CvReviewData,
  SkillMatchItem,
  EvidenceLedger,
  GapReportDto,
  GapItem,
  CanonicalCvDocument,
  ExtractionQuality,
  JdIntelligenceItem,
} from "@shared/api";

// ── fixture builders (as-casts, like prove-it.spec.ts / diagnosis-review.spec.ts) ──

const skill = (over: Partial<SkillMatchItem>): SkillMatchItem =>
  ({ name: "React", canonical_name: "react", status: "present", cvScore: 50, ...over }) as SkillMatchItem;

const ledger = (...pairs: Array<[string, string, string?]>): EvidenceLedger =>
  ({
    items: pairs.map(([skill_canonical, strength, evidence_gap]) => ({
      skill_canonical,
      display_name: skill_canonical,
      strength,
      sources: [],
      most_recent_year: null,
      evidence_gap: evidence_gap ?? null,
    })),
  }) as unknown as EvidenceLedger;

const jdMatch = (over: Partial<CvJdMatch>): CvJdMatch =>
  ({
    matchId: "m1",
    matchScore: 60,
    summary: "",
    hardSkills: [],
    softSkills: [],
    radar: [],
    criticalGaps: [],
    ...over,
  }) as unknown as CvJdMatch;

const doc = (over: Partial<CanonicalCvDocument>): CanonicalCvDocument =>
  ({
    experience: [{ org: "X", role: "Dev", start: "2020", end: "2021" }],
    projects: [{ name: "P" }],
    skills: { technical: ["React"] },
    summary: "A solid summary",
    ...over,
  }) as unknown as CanonicalCvDocument;

const review = (over: Partial<CvReviewData>): CvReviewData =>
  ({
    overallScore: 70,
    breakdown: {},
    issues: [],
    rewriteSuggestions: [],
    strengths: [],
    actionPlan: [],
    parsedCv: {},
    document: doc({}),
    ...over,
  }) as unknown as CvReviewData;

const extractionQuality = (over: Partial<ExtractionQuality>): ExtractionQuality =>
  ({
    char_count: 1000,
    word_count: 200,
    mojibake_count: 0,
    mojibake_ratio: 0,
    wordlike_ratio: 0.95,
    section_count: 5,
    skill_count: 12,
    ocr_used: false,
    confidence: "high",
    flags: [],
    ...over,
  }) as unknown as ExtractionQuality;

const gapItem = (over: Partial<GapItem>): GapItem =>
  ({
    requirement_id: "req-1",
    source: "jd",
    type: "hard_skill",
    canonical_name: "react",
    display_name: "React",
    importance: "REQUIRED",
    cv_status: "missing",
    cv_level: null,
    required_level: 3,
    gap_levels: 3,
    satisfied_by: null,
    evidence_refs: [],
    evidence_risk: "none",
    fixability: "learn",
    market_demand: null,
    severity: 50,
    confidence: 0.9,
    recommended_next_action: "Learn React fundamentals",
    ...over,
  }) as unknown as GapItem;

const jdIntel = (over: Partial<JdIntelligenceItem>): JdIntelligenceItem =>
  ({
    dimension: "language",
    value_text: "English B2",
    level_hint: "B2",
    min_years: null,
    importance: "REQUIRED",
    deal_breaker: true,
    evidence_text: "English required",
    graded: false,
    cv_signal: null,
    verdict: null,
    ...over,
  }) as unknown as JdIntelligenceItem;

const gapReport = (over: Partial<GapReportDto>): GapReportDto =>
  ({
    target_role: null,
    overall_score: 60,
    source_of_requirements: "jd_extraction",
    explicit_gaps: [],
    proficiency_gaps: [],
    evidence_gaps: [],
    seniority: {},
    jd_emphasis_gaps: [],
    strengths: { matched: [], demonstrated: [], bonus: [] },
    language: "vi",
    recommended_actions: [],
    market_trend_gaps: null,
    jd_market_position: { available: false },
    gap_items: [],
    ...over,
  }) as unknown as GapReportDto;

const cleanInput = () => ({
  jdMatch: jdMatch({
    hardSkills: [skill({ canonical_name: "react", status: "present" })],
  }),
  reviewData: review({
    evidence_ledger: ledger(["react", "demonstrated"]),
    extraction_quality: extractionQuality({}),
    document: doc({}),
  }),
  gapReport: gapReport({ gap_items: [gapItem({ cv_status: "matched" })] }),
});

// ── honest-empty (the spine) ──

describe("collectElementIssues — honest-empty", () => {
  it("returns [] for a fully clean CV (no LLM, no fabrication)", () => {
    expect(collectElementIssues(cleanInput())).toEqual([]);
  });

  it("returns [] when all inputs are null", () => {
    expect(collectElementIssues({ jdMatch: null, reviewData: null, gapReport: null })).toEqual([]);
  });
});

// ── listed_no_evidence detector ──

describe("collectElementIssues — listed_no_evidence", () => {
  it("fires on a JD-required listed_only skill and surfaces evidence_gap verbatim as why", () => {
    const input = {
      jdMatch: jdMatch({ hardSkills: [skill({ canonical_name: "react", status: "present" })] }),
      reviewData: review({
        evidence_ledger: ledger(["react", "listed_only", "Chỉ liệt kê, chưa có dẫn chứng cụ thể"]),
      }),
      gapReport: null,
    };
    const issues = collectElementIssues(input);
    const issue = issues.find((i) => i.kind === "listed_no_evidence");
    expect(issue).toBeDefined();
    expect(issue!.why).toBe("Chỉ liệt kê, chưa có dẫn chứng cụ thể");
    expect(issue!.anchorId).toBe("evidence-react");
    expect(issue!.ctaKind).toBe("rewrite");
  });

  it("is clean ([] for this kind) when the skill is demonstrated", () => {
    const issues = collectElementIssues({
      jdMatch: jdMatch({ hardSkills: [skill({ canonical_name: "react", status: "present" })] }),
      reviewData: review({ evidence_ledger: ledger(["react", "demonstrated"]) }),
      gapReport: null,
    });
    expect(issues.filter((i) => i.kind === "listed_no_evidence")).toEqual([]);
  });
});

// ── gap_item detector ──

describe("collectElementIssues — gap_item", () => {
  it("fires on an unmatched GapItem, carrying its severity + recommended_next_action as why", () => {
    const gi = gapItem({
      requirement_id: "req-react",
      cv_status: "missing",
      severity: 88,
      recommended_next_action: "Bổ sung dự án dùng React",
      market_demand: 42,
    });
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: null,
      gapReport: gapReport({ gap_items: [gi] }),
    });
    const issue = issues.find((i) => i.kind === "gap_item");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe(88);
    expect(issue!.why).toBe("Bổ sung dự án dùng React");
    expect(issue!.anchorId).toBe("gap-req-react");
    expect(issue!.severityFactors?.market_demand).toBe(42);
  });

  it("omits severityFactors.market_demand when the gap has none (honest — only present factors)", () => {
    const gi = gapItem({ cv_status: "missing", market_demand: null });
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: null,
      gapReport: gapReport({ gap_items: [gi] }),
    });
    const issue = issues.find((i) => i.kind === "gap_item")!;
    expect(issue.severityFactors?.market_demand).toBeUndefined();
  });

  it("ignores matched GapItems (clean)", () => {
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: null,
      gapReport: gapReport({ gap_items: [gapItem({ cv_status: "matched" })] }),
    });
    expect(issues.filter((i) => i.kind === "gap_item")).toEqual([]);
  });
});

// ── exp_no_dates detector ──

describe("collectElementIssues — exp_no_dates", () => {
  it("fires when an experience entry lacks dates (why=null, whyKey set)", () => {
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: review({ document: doc({ experience: [{ org: "X", role: "Dev" }] as never }) }),
      gapReport: null,
    });
    const issue = issues.find((i) => i.kind === "exp_no_dates");
    expect(issue).toBeDefined();
    expect(issue!.why).toBeNull();
    expect(issue!.whyKey).toBeTruthy();
  });

  it("is clean when every experience entry has dates", () => {
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: review({ document: doc({}) }),
      gapReport: null,
    });
    expect(issues.filter((i) => i.kind === "exp_no_dates")).toEqual([]);
  });
});

// ── missing_section detector ──

describe("collectElementIssues — missing_section", () => {
  it("fires when the CV has no experience section", () => {
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: review({ document: doc({ experience: [] }) }),
      gapReport: null,
    });
    const issue = issues.find((i) => i.kind === "missing_section");
    expect(issue).toBeDefined();
    expect(issue!.why).toBeNull();
    expect(issue!.whyKey).toBeTruthy();
    expect(issue!.ctaKind).toBe("builder");
  });
});

// ── parse_quality detector (Improvement 3 — honest-uncertainty) ──

describe("collectElementIssues — parse_quality", () => {
  it("fires when extraction confidence is not high", () => {
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: review({
        extraction_quality: extractionQuality({ confidence: "low", flags: ["THIN_CONTENT"] }),
      }),
      gapReport: null,
    });
    const issue = issues.find((i) => i.kind === "parse_quality");
    expect(issue).toBeDefined();
    expect(issue!.why).toBeNull();
    expect(issue!.whyKey).toBeTruthy();
  });

  it("is clean when extraction confidence is high", () => {
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: review({ extraction_quality: extractionQuality({ confidence: "high" }) }),
      gapReport: null,
    });
    expect(issues.filter((i) => i.kind === "parse_quality")).toEqual([]);
  });
});

// ── deal_breaker detector ──

describe("collectElementIssues — deal_breaker", () => {
  it("fires on a deal-breaker JD dimension with no CV signal", () => {
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: null,
      gapReport: gapReport({
        jd_intelligence: {
          dimensions: [jdIntel({ dimension: "language", deal_breaker: true, cv_signal: null })],
          note: "",
        },
      }),
    });
    const issue = issues.find((i) => i.kind === "deal_breaker");
    expect(issue).toBeDefined();
    expect(issue!.why).toBeNull();
    expect(issue!.whyKey).toBeTruthy();
  });

  it("is clean when the deal-breaker has a CV signal (already covered)", () => {
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: null,
      gapReport: gapReport({
        jd_intelligence: {
          dimensions: [jdIntel({ deal_breaker: true, cv_signal: "B2 (ielts) · high" })],
          note: "",
        },
      }),
    });
    expect(issues.filter((i) => i.kind === "deal_breaker")).toEqual([]);
  });

  it("is clean when the dimension is not a deal-breaker", () => {
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: null,
      gapReport: gapReport({
        jd_intelligence: {
          dimensions: [jdIntel({ deal_breaker: false, cv_signal: null })],
          note: "",
        },
      }),
    });
    expect(issues.filter((i) => i.kind === "deal_breaker")).toEqual([]);
  });
});

// ── sorting: severity desc ──

describe("collectElementIssues — sorting", () => {
  it("sorts by severity descending", () => {
    const high = gapItem({ requirement_id: "hi", cv_status: "missing", severity: 95 });
    const low = gapItem({ requirement_id: "lo", cv_status: "missing", severity: 10 });
    const issues = collectElementIssues({
      jdMatch: null,
      reviewData: null,
      gapReport: gapReport({ gap_items: [low, high] }),
    });
    const severities = issues.map((i: ElementIssue) => i.severity);
    const sorted = [...severities].sort((a, b) => b - a);
    expect(severities).toEqual(sorted);
    expect(issues[0].anchorId).toBe("gap-hi");
  });

  it("ranks a high-severity gap_item above a fixed-rank non-gap detector", () => {
    const input = {
      jdMatch: null,
      reviewData: review({ document: doc({ experience: [{ org: "X", role: "Dev" }] as never }) }),
      gapReport: gapReport({ gap_items: [gapItem({ cv_status: "missing", severity: 99 })] }),
    };
    const issues = collectElementIssues(input);
    expect(issues[0].kind).toBe("gap_item");
  });
});

// ── pickActiveResolvableIssue (Fix C — only point at an on-screen card) ──

describe("pickActiveResolvableIssue", () => {
  const mk = (id: string, anchorId: string): ElementIssue => ({
    id,
    kind: "gap_item",
    anchorId,
    severity: 1,
    whatKey: "k.what",
    why: null,
    whyKey: "k.why",
    ctaKind: null,
  });

  it("returns the FIRST (worst, since severity-sorted) issue whose anchor resolves", () => {
    const visible = [mk("a", "anchor-a"), mk("b", "anchor-b"), mk("c", "anchor-c")];
    // anchor-a is off-screen (e.g. the OTHER step) → skip it; anchor-b is on-screen.
    const onScreen = new Set(["anchor-b", "anchor-c"]);
    const active = pickActiveResolvableIssue(visible, (id) => onScreen.has(id));
    expect(active?.id).toBe("b");
  });

  it("returns null when NO visible issue resolves (honest-empty, no corner-parking)", () => {
    const visible = [mk("a", "anchor-a"), mk("b", "anchor-b")];
    const active = pickActiveResolvableIssue(visible, () => false);
    expect(active).toBeNull();
  });

  it("returns null for an empty visible queue", () => {
    expect(pickActiveResolvableIssue([], () => true)).toBeNull();
  });

  it("preserves severity order — the worst resolvable wins even if a lower one also resolves", () => {
    // queue is already severity-sorted; first resolvable is the worst on-screen.
    const visible = [mk("worst", "off"), mk("mid", "on-1"), mk("low", "on-2")];
    const active = pickActiveResolvableIssue(visible, (id) => id.startsWith("on-"));
    expect(active?.id).toBe("mid");
  });
});
