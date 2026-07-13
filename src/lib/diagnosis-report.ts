import type { CvReviewData, CvIssue, KeywordFrequency, PerSkillContribution } from "@shared/api";

export interface CheckRowData {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  evidence: string;
  hint?: string;
  score?: number; // displayed as score/20 — ONLY set for AI-eval dimension rows
  /** DOM id for companion citations (`dim-*` contract — element-issues.ts / useDiagnosisChatCompanion). */
  anchorId?: string;
  /** BE `issues[]` attached to this row (per-dimension slice — same source the companion cites). */
  subItems?: CvIssue[];
  provenance?: {
    source: "deterministic" | "llm";
    confidence: "high" | "medium" | "low";
    evidence: string[];
  };
}

export interface CheckGroupData {
  id: string;
  label: string;
  score?: number; // overall group score (0-100)
  issueCount: number;
  items: CheckRowData[];
  // Slot indicators for custom components in rendering layer
  hasSkillsSlot?: boolean;
}

export function buildDiagnosisReport(
  reviewData: CvReviewData | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
  /** Per-dimension slice of BE `issues[]` (from `dimensionIssueSlice` — single source with companion). */
  dimensionIssues?: CvIssue[][]
): CheckGroupData[] {
  if (!reviewData) return [];

  const groups: CheckGroupData[] = [];

  // 1. ATS check group
  if (reviewData.atsCheck && reviewData.atsCheck.rules && reviewData.atsCheck.rules.length > 0) {
    const rules = reviewData.atsCheck.rules;
    const items: CheckRowData[] = rules.map((rule) => ({
      id: rule.rule_id,
      label: rule.label,
      status: rule.status,
      evidence: rule.evidence || "",
      hint: rule.hint,
      // no `score`: rule.score is NOT on the /20 scale CheckRow renders
    }));

    const summary = reviewData.atsCheck.summary;
    const issueCount = (summary.warned ?? 0) + (summary.failed ?? 0);

    groups.push({
      id: "ats",
      label: t("report.groups.ats", { defaultValue: "Độ tương thích ATS" }),
      score: reviewData.breakdown?.ats,
      issueCount,
      items,
    });
  }

  // 2. Content check group (Nội dung)
  if (reviewData.bullet_feedback && reviewData.bullet_feedback.length > 0) {
    const bullets = reviewData.bullet_feedback;
    const buzzwords = reviewData.buzzwords_detected ?? [];
    
    // Count indicators
    const totalBullets = bullets.length;
    
    // Quantified: bullet point includes metrics
    const quantifiedCount = bullets.filter((b) => b.quantified).length;
    const unquantifiedCount = totalBullets - quantifiedCount;
    
    // Action verbs opener: weak opener or not starting with verb
    const weakOpenerCount = bullets.filter((b) => b.weakOpener || !b.verbFirst).length;
    
    // First person pronoun
    const firstPersonCount = bullets.filter((b) => b.firstPerson).length;
    
    const items: CheckRowData[] = [];
    
    // Check quantified
    const quantStatus = unquantifiedCount === 0 ? "pass" : "warn";
    items.push({
      id: "quantification",
      label: t("report.content.quantification.label", { defaultValue: "Số liệu đo lường" }),
      status: quantStatus,
      evidence: quantStatus === "pass"
        ? t("report.content.quantification.evidence_pass", { defaultValue: "Tất cả các bullet point đều chứa số liệu định lượng." })
        : t("report.content.quantification.evidence_fail", { 
            x: quantifiedCount, 
            y: totalBullets, 
            defaultValue: `Chỉ có ${quantifiedCount}/${totalBullets} bullet point chứa số liệu đo lường thành tích.` 
          }),
      hint: quantStatus !== "pass" 
        ? t("report.content.quantification.hint", { defaultValue: "Thêm số liệu cụ thể (%, $, thời gian, quy mô dự án) để tăng tính xác thực và thuyết phục cho các thành tựu của bạn." })
        : undefined,
    });

    // Check action verbs
    const verbStatus = weakOpenerCount === 0 ? "pass" : "warn";
    items.push({
      id: "action_verbs",
      label: t("report.content.action_verbs.label", { defaultValue: "Động từ hành động" }),
      status: verbStatus,
      evidence: verbStatus === "pass"
        ? t("report.content.action_verbs.evidence_pass", { defaultValue: "Không phát hiện động từ mở đầu yếu trong CV." })
        : t("report.content.action_verbs.evidence_fail", { 
            count: weakOpenerCount, 
            defaultValue: `Có ${weakOpenerCount} bullet point sử dụng động từ mở đầu yếu hoặc không có động từ hành động.` 
          }),
      hint: verbStatus !== "pass"
        ? t("report.content.action_verbs.hint", { defaultValue: "Sử dụng các động từ hành động mạnh mẽ và tích cực ở đầu mỗi bullet để nêu bật vai trò chủ động của bạn." })
        : undefined,
    });

    // Check buzzwords
    const buzzwordCount = buzzwords.length;
    const buzzStatus = buzzwordCount === 0 ? "pass" : "warn";
    items.push({
      id: "buzzwords",
      label: t("report.content.buzzwords.label", { defaultValue: "Tránh từ sáo rỗng" }),
      status: buzzStatus,
      evidence: buzzStatus === "pass"
        ? t("report.content.buzzwords.evidence_pass", { defaultValue: "Không phát hiện từ ngữ sáo rỗng trong CV." })
        : t("report.content.buzzwords.evidence_fail", { 
            count: buzzwordCount, 
            words: buzzwords.join(", "),
            defaultValue: `Phát hiện ${buzzwordCount} từ ngữ sáo rỗng: ${buzzwords.join(", ")}` 
          }),
      hint: buzzStatus !== "pass"
        ? t("report.content.buzzwords.hint", { defaultValue: "Thay thế các từ ngữ chung chung sáo rỗng bằng các hành động và kết quả thực tế bạn đạt được." })
        : undefined,
    });

    // Check first person pronouns
    const fpStatus = firstPersonCount === 0 ? "pass" : "warn";
    items.push({
      id: "first_person",
      label: t("report.content.first_person.label", { defaultValue: "Đại từ nhân xưng" }),
      status: fpStatus,
      evidence: fpStatus === "pass"
        ? t("report.content.first_person.evidence_pass", { defaultValue: "Không sử dụng đại từ nhân xưng ngôi thứ nhất." })
        : t("report.content.first_person.evidence_fail", { 
            count: firstPersonCount, 
            defaultValue: `Có ${firstPersonCount} bullet point sử dụng đại từ nhân xưng ngôi thứ nhất.` 
          }),
      hint: fpStatus !== "pass"
        ? t("report.content.first_person.hint", { defaultValue: "Tránh dùng các từ xưng hô như 'tôi', 'chúng tôi' trong CV chuyên nghiệp. Nên dùng cấu trúc ẩn chủ ngữ." })
        : undefined,
    });

    const issueCount = items.filter((item) => item.status !== "pass").length;

    groups.push({
      id: "content",
      label: t("report.groups.content", { defaultValue: "Độ tối ưu nội dung" }),
      score: reviewData.breakdown?.structure,
      issueCount,
      items,
    });
  }

  // 3. Skills check group (Kỹ năng)
  const hasRelevance = !!reviewData.skills_relevance_breakdown;
  const hasExtracted = !!reviewData.skills_extracted && reviewData.skills_extracted.length > 0;

  if (hasRelevance || hasExtracted) {
    let issueCount = 0;
    if (reviewData.skills_relevance_breakdown) {
      const relevance = reviewData.skills_relevance_breakdown;
      issueCount = (relevance.missing?.length ?? 0) + (relevance.partial?.length ?? 0);
    }

    groups.push({
      id: "skills",
      label: t("report.groups.skills", { defaultValue: "Độ phù hợp kỹ năng" }),
      score: reviewData.breakdown?.skills,
      issueCount,
      items: [], // Rendered via custom cards slot inside CheckGroup
      hasSkillsSlot: true,
    });
  }

  // 4. AI dimensions evaluation (Đánh giá AI)
  if (reviewData.dimensions && reviewData.dimensions.length > 0) {
    const dims = reviewData.dimensions;
    const items: CheckRowData[] = dims.map((dim, i) => {
      // Same banding as dimensionTone/element-issues.ts dimensionBand (pct = score20×5)
      const pct = dim.score20 * 5;
      const status = pct >= 70 ? "pass" : pct >= 50 ? "warn" : "fail";
      return {
        id: dim.key,
        label: t(`review.dims.${dim.key}`, { defaultValue: dim.key }),
        status,
        evidence: dim.rationale,
        score: dim.score20,
        anchorId: `dim-${dim.key}`,
        subItems: dimensionIssues?.[i] ?? [],
        provenance: dim.provenance,
      };
    });

    const issueCount =
      items.filter((item) => item.status !== "pass").length +
      items.reduce((n, item) => n + (item.subItems?.length ?? 0), 0);

    groups.push({
      id: "ai_eval",
      label: t("report.groups.ai_eval", { defaultValue: "Đánh giá chi tiết từ AI" }),
      score: reviewData.breakdown?.experience,
      issueCount,
      items,
    });
  } else if (reviewData.issues && reviewData.issues.length > 0) {
    // Fallback (old "Issues" card): BE returned issues[] but no dimensions to attach them to.
    const items: CheckRowData[] = reviewData.issues.map((issue, i) => ({
      id: `issue-${i}`,
      label: issue.title,
      status: issue.severity === "high" ? "fail" : "warn",
      evidence: issue.detail,
      hint: issue.suggestion,
    }));
    groups.push({
      id: "issues",
      label: t("report.groups.issues", { defaultValue: "Vấn đề cần xử lý" }),
      issueCount: items.length,
      items,
    });
  }

  // Rail consistency: always surface the 4 canonical score categories, even
  // when a CV lacks the detailed data that would build the check group (e.g.
  // no bullet_feedback → no content items). Any category the data-driven passes
  // above didn't emit is added as a score-only "passed" row so the rail never
  // silently drops a dimension that still has a score.
  const bd = reviewData.breakdown;
  const canonical: Array<{ id: string; labelKey: string; def: string; score: number | undefined; alt?: string }> = [
    { id: "ats", labelKey: "report.groups.ats", def: "Tương thích ATS", score: bd?.ats },
    { id: "content", labelKey: "report.groups.content", def: "Tối ưu nội dung", score: bd?.structure },
    { id: "skills", labelKey: "report.groups.skills", def: "Phù hợp kỹ năng", score: bd?.skills },
    { id: "ai_eval", labelKey: "report.groups.ai_eval", def: "AI đánh giá sâu", score: bd?.experience, alt: "issues" },
  ];
  for (const c of canonical) {
    const present = groups.some((g) => g.id === c.id || (c.alt !== undefined && g.id === c.alt));
    if (!present && c.score !== undefined) {
      groups.push({ id: c.id, label: t(c.labelKey, { defaultValue: c.def }), score: c.score, issueCount: 0, items: [] });
    }
  }
  const order = ["ats", "content", "skills", "ai_eval", "issues"];
  groups.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return groups;
}

/* ═══════════════════════════════════════════════════════════════════════
 *  KeywordTable — join keyword_frequency × per_skill
 * ═══════════════════════════════════════════════════════════════════ */

export interface KeywordRowData {
  canonical_name: string;
  display_name: string;
  cv_count: number | null;
  jd_count: number | null;
  importance: "REQUIRED" | "PREFERRED" | "NICE_TO_HAVE" | null;
  status: "matched" | "partial" | "missing" | null;
}

const STATUS_ORDER: Record<string, number> = { missing: 0, partial: 1, matched: 2 };
const IMPORTANCE_ORDER: Record<string, number> = { REQUIRED: 0, PREFERRED: 1, NICE_TO_HAVE: 2 };

/**
 * Joins `keyword_frequency[]` with `scoring_breakdown.per_skill[]` by canonical_name.
 * Returns null when BOTH sources are absent (old match without either field).
 * Rows present in only one source still render with the other side blank.
 * Sort: missing REQUIRED first → partial → matched, then by importance.
 */
export function buildKeywordRows(
  keywordFrequency: KeywordFrequency[] | undefined | null,
  perSkill: PerSkillContribution[] | undefined | null,
): KeywordRowData[] | null {
  const hasKf = !!keywordFrequency && keywordFrequency.length > 0;
  const hasPs = !!perSkill && perSkill.length > 0;

  if (!hasKf && !hasPs) return null;

  const map = new Map<string, KeywordRowData>();

  // Seed from keyword_frequency
  if (hasKf) {
    for (const kf of keywordFrequency!) {
      const key = kf.keyword;
      map.set(key, {
        canonical_name: key,
        display_name: key,
        cv_count: kf.cv_count,
        jd_count: kf.jd_count,
        importance: null,
        status: null,
      });
    }
  }

  // Merge / overlay from per_skill
  if (hasPs) {
    for (const ps of perSkill!) {
      const key = ps.canonical_name;
      const existing = map.get(key);
      if (existing) {
        existing.display_name = ps.display_name || existing.display_name;
        existing.importance = ps.importance;
        existing.status = ps.status;
      } else {
        map.set(key, {
          canonical_name: key,
          display_name: ps.display_name || key,
          cv_count: null,
          jd_count: null,
          importance: ps.importance,
          status: ps.status,
        });
      }
    }
  }

  const rows = Array.from(map.values());

  // Sort: missing REQUIRED first, then partial, then matched
  rows.sort((a, b) => {
    const sa = STATUS_ORDER[a.status ?? "matched"] ?? 2;
    const sb = STATUS_ORDER[b.status ?? "matched"] ?? 2;
    if (sa !== sb) return sa - sb;
    const ia = IMPORTANCE_ORDER[a.importance ?? "NICE_TO_HAVE"] ?? 2;
    const ib = IMPORTANCE_ORDER[b.importance ?? "NICE_TO_HAVE"] ?? 2;
    return ia - ib;
  });

  return rows;
}
