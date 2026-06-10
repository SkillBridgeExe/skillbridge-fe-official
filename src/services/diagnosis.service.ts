// ─── Diagnosis Service ──────────────────────────────────────────────
// Tầng nghiệp vụ CV diagnosis — nối BE NestJS THẬT (POST /api/cvs chấm đồng bộ).
// Convention: Page → services (map BE → UI model) → api/cv/* → httpClient.
//
// Quy tắc map (docs/FE-diagnosis-rewire-plan.md §5):
// - BE là nguồn sự thật về điểm/band — service CHỈ đổi đơn vị hiển thị
//   (dim 0-20 → 0-100, level 1-5 → %), không tự tính điểm mới.
// - Field insights vắng → withMockInsights đắp tạm (mock tự nhường khi BE trả thật).

import { uploadCvApi } from "@/api/cv/upload";
import { reRunCvReviewApi } from "@/api/cv/review";
import { matchCvWithJdApi } from "@/api/cv/match";
import { getCvDetailApi, getCvListApi, type CvListQuery } from "@/api/cv/list";
import { getJobRecommendationsApi, type JobRecommendationsQuery } from "@/api/cv/recommendations";
import { getSkillGapApi, getTrendsInsightApi, type SkillGapQuery, type TrendsInsightQuery } from "@/api/cv/trends";
import { downloadCvFileApi } from "@/api/cv/file";
import { withMockInsights } from "@/lib/mock-data/diagnosis-insights";
import type {
  BeIssueSeverity,
  BeMatchedSkill,
  BeMissingSkill,
  BePartialSkill,
  CvDto,
  CvJdMatch,
  CvListItemDto,
  CvMatchDto,
  CvReviewData,
  Paginated,
  SkillMatchItem,
} from "@shared/api";

// ── Input/Output của service ────────────────────────────────────────

export interface AnalyzeCvInput {
  /** File CV (đường upload). Bỏ trống khi chấm lại CV builder qua builderCvId. */
  file?: File | null;
  /** CV đã tồn tại trên BE (từ builder) → chấm lại, không upload. */
  builderCvId?: string | null;
  /** Role code BE, vd "frontend_developer" — bắt buộc để rubric chấm relevance. */
  targetRole: string;
  /**
   * Consent xử lý dữ liệu cá nhân (PDPL) — BE từ chối nếu thiếu.
   * TODO(W3): truyền từ checkbox consent thật trên màn upload; hiện mặc định true
   * vì user chủ động bấm "Analyze" sau banner thông báo.
   */
  consentAccepted?: boolean;
}

export interface AnalyzeCvWithJdInput extends AnalyzeCvInput {
  jdText: string;
}

export interface AnalyzeOutcome {
  /** Id CV trên BE — dùng cho match/recommendations/builder CTA về sau. */
  cvId: string;
  review: CvReviewData;
}

// ── Auth guard ──────────────────────────────────────────────────────

/**
 * BE yêu cầu JWT; mock account (demo) KHÔNG có accessToken nên không gọi được
 * AI thật. Chặn sớm với message rõ thay vì để interceptor 401 đá về /login
 * giữa chừng (P0.3 — auth gate, UI đẹp hơn ở W3).
 */
export function requireSession(): void {
  if (!localStorage.getItem("accessToken")) {
    throw new Error(
      "Please sign in with a real account to run the AI analysis. Demo accounts can't reach the AI service yet.",
    );
  }
}

// ── Map BE → UI model ───────────────────────────────────────────────

const SEVERITY_MAP: Record<BeIssueSeverity, "high" | "medium" | "low"> = {
  error: "high",
  warning: "medium",
  info: "low",
};

/** Đổi đơn vị hiển thị: dim LLM 0-20 → thang 0-100 của UI (không phải tính điểm mới). */
const dimToPct = (value: number) => Math.round(value * 5);

/** Đổi đơn vị hiển thị: level rubric 1-5 → % cho radar/bars. */
const levelToPct = (level: number) => Math.round((level / 5) * 100);

export function mapCvDtoToReviewData(dto: CvDto): CvReviewData {
  const review = dto.review;
  if (!review) {
    throw new Error(
      "The CV was uploaded but the AI review is missing. Please try re-running the analysis.",
    );
  }

  const dims = review.llm_score_dimensions;

  return withMockInsights({
    overallScore: Math.round(review.overall_score),
    breakdown: {
      ats: Math.round(review.ats_rule_score),
      // UI Step2 hiện có 4 ô ats/structure/skills/experience — map dim gần nghĩa nhất.
      // W3 render 4 dim thật từ `dimensions` bên dưới; breakdown giữ cho UI cũ.
      structure: dimToPct(dims.action_verbs),
      skills: dimToPct(dims.skills_relevance),
      experience: dimToPct(dims.experience),
    },
    // 4 dim LLM thật + rationale — nguồn cho cards Step2 (W3).
    dimensions: (
      ["action_verbs", "skills_relevance", "experience", "education"] as const
    ).map((key) => ({
      key,
      score20: dims[key],
      rationale: review.rationale?.[key] ?? "",
    })),
    // Checklist ATS đầy đủ — tab ATS (W3c).
    atsCheck: review.ats_check,
    // CV cấu trúc hoá đầy đủ — preview giàu + highlight evidence (W3d).
    document: review.document,
    issues: review.sections.flatMap((section) =>
      section.issues.map((issue) => ({
        title: section.name,
        detail: issue.text,
        severity: SEVERITY_MAP[issue.severity] ?? "low",
        suggestion: issue.hint ?? "",
      })),
    ),
    // BE R1 không trả rewrite tĩnh/strengths — rewrite là tương tác builder (W5);
    // strengths sẽ lấy từ rationale khi W3 redesign. Mảng rỗng → UI ẩn khối.
    rewriteSuggestions: [],
    strengths: [],
    actionPlan: review.top_summary?.prioritized_actions ?? [],
    parsedCv: {
      name: review.ats_extracted?.name ?? undefined,
      email: review.ats_extracted?.email ?? undefined,
      phone: review.ats_extracted?.phone ?? undefined,
      summary: review.document?.summary ?? "",
      skills: review.ats_extracted?.skills_raw ?? [],
    },
    // Δ3: path thật của skills_extracted nằm trong ats_extracted — lift lên field phẳng.
    skills_extracted: review.ats_extracted?.skills_extracted,
    skills_relevance_breakdown: review.skills_relevance_breakdown,
    top_summary: review.top_summary,
    evidence_ledger: review.evidence_ledger,
  });
}

function toSkillMatchItem(
  skill: BeMatchedSkill | BePartialSkill | BeMissingSkill,
  status: SkillMatchItem["status"],
): SkillMatchItem {
  const cvLevel = "cv_level" in skill ? skill.cv_level : 0;
  return {
    name: skill.display_name || skill.canonical_name,
    canonical_name: skill.canonical_name,
    cvScore: levelToPct(cvLevel),
    jdRequired: levelToPct(skill.required_level),
    status,
    ...("gap_levels" in skill ? { gap_levels: skill.gap_levels } : {}),
  };
}

export function mapMatchDtoToJdMatch(match: CvMatchDto): CvJdMatch {
  const parsed = match.parsedResponse;
  const matched = parsed?.matched_skills ?? [];
  const partial = parsed?.partial_skills ?? [];
  const missing = parsed?.missing_skills ?? [];

  const hardSkills: SkillMatchItem[] = [
    ...matched.map((s) => toSkillMatchItem(s, "present")),
    ...partial.map((s) => toSkillMatchItem(s, "partial")),
    ...missing.map((s) => toSkillMatchItem(s, "missing")),
  ];

  // BE không tách hard/soft — toàn bộ vào hardSkills, tab soft trống (W3 xử lý UI).
  const breakdown = parsed?.scoring_breakdown;
  const total = breakdown?.total_requirements ?? hardSkills.length;
  const matchScore = Math.round(
    match.overallScore ?? parsed?.overall_score ?? match.matchRatio ?? 0,
  );

  return {
    matchScore,
    // Summary thuần số liệu BE — không bịa nhận định.
    summary: breakdown
      ? `Matched ${breakdown.matched_count}/${total} requirements (${breakdown.partial_count} partial, ${breakdown.missing_count} missing). Required-skill coverage: ${Math.round((parsed?.required_coverage ?? 0) * 100)}%.`
      : `Match score ${matchScore}/100.`,
    hardSkills,
    softSkills: [],
    radar: hardSkills.slice(0, 6).map((skill) => ({
      subject: skill.name,
      you: skill.cvScore,
      required: skill.jdRequired,
    })),
    criticalGaps: missing
      .filter((skill) => skill.importance === "REQUIRED")
      .map((skill) => skill.display_name || skill.canonical_name),
    required_coverage: parsed?.required_coverage ?? null,
    scoring_breakdown: parsed?.scoring_breakdown ?? null,
    experience_fit: parsed?.experience_fit ?? null,
    inferred_skills: parsed?.inferred_skills ?? [],
  };
}

// ── Nghiệp vụ ───────────────────────────────────────────────────────

/** Chấm CV (không JD): upload mới hoặc chấm lại CV builder đã có trên BE. */
export async function analyzeCv({
  file,
  builderCvId,
  targetRole,
  consentAccepted = true,
}: AnalyzeCvInput): Promise<AnalyzeOutcome> {
  requireSession();

  const dto = builderCvId
    ? await reRunCvReviewApi(builderCvId)
    : await uploadCvApi({ file: file!, targetRole, consentAccepted });

  return { cvId: dto.id, review: mapCvDtoToReviewData(dto) };
}

/** Chấm CV + so JD: 2 bước tuần tự trên BE (upload/chấm → match cvId × jdText). */
export async function analyzeCvWithJd(
  input: AnalyzeCvWithJdInput,
): Promise<AnalyzeOutcome> {
  const base = await analyzeCv(input);
  const match = await matchCvWithJdApi(base.cvId, {
    jdText: input.jdText,
    targetRole: input.targetRole,
  });

  return {
    cvId: base.cvId,
    review: { ...base.review, jdMatch: mapMatchDtoToJdMatch(match) },
  };
}

/** Chấm LẠI một CV đã có trên BE theo cvId (nút "Phân tích lại") — không upload lại. */
export function reanalyzeCv({
  cvId,
  targetRole,
}: {
  cvId: string;
  targetRole: string;
}): Promise<AnalyzeOutcome> {
  return analyzeCv({ builderCvId: cvId, targetRole });
}

export interface CompareJdInput {
  /** Id CV đã chấm (store.lastCvId) — match KHÔNG upload lại file. */
  cvId: string;
  jdText: string;
  targetRole?: string | null;
}

/** So CV đã chấm với JD — chỉ 1 call match (rẻ, deterministic phía BE). */
export async function compareJdForCv({
  cvId,
  jdText,
  targetRole,
}: CompareJdInput): Promise<CvJdMatch> {
  requireSession();
  const match = await matchCvWithJdApi(cvId, {
    jdText,
    targetRole: targetRole ?? undefined,
  });
  return mapMatchDtoToJdMatch(match);
}

/** Lịch sử CV đã chấm (GET /api/diagnosis/history — alias GET /api/cvs). */
export async function getDiagnosisHistory(
  query: CvListQuery = {},
): Promise<Paginated<CvListItemDto>> {
  requireSession();
  return getCvListApi(query);
}

/**
 * Mở lại 1 CV cũ từ lịch sử (GET /api/cvs/:id) → map về UI model để render
 * thẳng màn kết quả. KHÔNG tốn quota chấm (chỉ đọc review đã lưu).
 * Trả null cho review nếu CV cũ chưa từng được chấm (cv_kind=BUILT chưa analyze).
 */
export async function loadCvFromHistory(id: string): Promise<AnalyzeOutcome> {
  requireSession();
  const dto = await getCvDetailApi(id);
  return { cvId: dto.id, review: mapCvDtoToReviewData(dto) };
}

/**
 * Top job thật khớp 1 CV (GET /api/cvs/:cvId/job-recommendations) — moat L2.
 * pool_size=0 → pool chưa có job cho role đó → UI hiện empty-state.
 */
export async function getJobRecommendations(
  cvId: string,
  query: JobRecommendationsQuery = {},
) {
  requireSession();
  return getJobRecommendationsApi(cvId, query);
}

/** Kỹ năng thị trường cần mà CV thiếu theo role (GET /api/trends/skills/gap/:cvId). */
export async function getSkillGap(cvId: string, query: SkillGapQuery = {}) {
  requireSession();
  return getSkillGapApi(cvId, query);
}

/** AI insight tá»« market trends cho CV hiá»‡n táº¡i (GET /api/trends/insight). */
export async function getTrendsInsight(query: TrendsInsightQuery) {
  requireSession();
  return getTrendsInsightApi(query);
}

/** Tải file CV gốc đã upload (GET /api/cvs/:id/file) — trả Blob để UI tải xuống. */
export async function downloadOriginalCvFile(cvId: string): Promise<Blob> {
  requireSession();
  return downloadCvFileApi(cvId);
}
