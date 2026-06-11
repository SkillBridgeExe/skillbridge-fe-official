/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type SkillStatus = "present" | "partial" | "missing";

export interface CvScoreBreakdown {
  ats: number;
  structure: number;
  skills: number;
  experience: number;
}

export interface CvIssue {
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  suggestion: string;
}

export interface CvRewriteSuggestion {
  section: string;
  original: string;
  improved: string;
  reason: string;
}

export interface ParsedCvSummary {
  name?: string;
  email?: string;
  phone?: string;
  summary: string;
  skills: string[];
}

export interface SkillMatchItem {
  name: string;
  canonical_name?: string | null;
  cvScore: number;
  jdRequired: number;
  status: SkillStatus;
  gap_levels?: number | null;
  /** Skill con đã thỏa requirement (hiển thị "tính từ X" — trung thực, BE #51). */
  satisfied_by?: string | null;
}

export interface RadarMetric {
  subject: string;
  you: number;
  required: number;
}

export interface CvJdMatch {
  matchId?: string;
  match_id?: string | null;
  matchScore: number;
  summary: string;
  hardSkills: SkillMatchItem[];
  softSkills: SkillMatchItem[];
  radar: RadarMetric[];
  criticalGaps: string[];
  required_coverage?: number | null;
  scoring_breakdown?: ScoringBreakdown | null;
  experience_fit?: ExperienceFit | null;
  inferred_skills?: InferredSkill[];
}

export interface ScoringBreakdown {
  total_requirements: number;
  matched_count: number;
  partial_count: number;
  missing_count: number;
  weight_sum: number;
  achieved_weight: number;
  required_total: number;
  required_met: number;
  raw_weighted_score: number;
  cap_applied: boolean;
}

export interface MatchPartialSkill {
  display_name: string;
  canonical_name: string;
  gap_levels: number;
}

export interface ExperienceFit {
  status: "fits" | "stretch" | "overqualified" | "unknown";
  required_years_min: number | null;
  required_years_max: number | null;
  cv_years: number | null;
  confidence?: "high" | "estimated" | "low" | null;
}

export interface InferredSkill {
  canonical_name: string;
  display_name: string;
  tag: "ecosystem" | "adjacent" | "tooling";
  reason?: string | null;
}

/** ① Skill trích xuất kèm trình độ + dẫn chứng (BE field: skills_extracted; skills_raw là alias cũ). */
export type SkillProficiencyHint = "beginner" | "intermediate" | "advanced" | "unknown";

export interface ExtractedSkill {
  name: string;
  proficiency_hint: SkillProficiencyHint;
  evidence_text: string | null;
}

/** ② Phân loại kỹ năng theo rubric của target_role — BE tính deterministic, FE CHỈ hiển thị
 *  (❌ không tự tính lại điểm/band). Contract: Notion "FE — Quy tắc nối API" §6.2. */
export type SkillImportance = "REQUIRED" | "PREFERRED" | "NICE_TO_HAVE";

export interface RelevanceSkillItem {
  name: string;
  importance: SkillImportance;
  /** Mức rubric yêu cầu, 1-5. */
  required_level: number;
  /** Mức trên CV — chỉ có ở matched/partial. */
  cv_level?: number;
}

export interface SkillsRelevanceBreakdown {
  matched: RelevanceSkillItem[];
  partial: RelevanceSkillItem[];
  missing: RelevanceSkillItem[];
}

/** ③ Lead "sửa N việc này trước" — BE tính từ dim thấp nhất + ATS fail nặng nhất. */
export interface TopSummary {
  headline: string;
  prioritized_actions: string[];
}

/** 1 chiều chấm LLM thật của BE (0-20) kèm giải thích — để UI render 4 dim + rationale. */
export interface ReviewDimension {
  key: "action_verbs" | "skills_relevance" | "experience" | "education";
  /** Điểm BE 0-20 — UI tự nhân 5 khi cần thang 100 (đơn vị hiển thị). */
  score20: number;
  rationale: string;
}

export interface CvReviewData {
  overallScore: number;
  breakdown: CvScoreBreakdown;
  /** 4 dim LLM thật + rationale (BE llm_score_dimensions/rationale) — W3 UI render từ đây. */
  dimensions?: ReviewDimension[];
  /** Checklist ATS rule-based đầy đủ (10 rule + summary) — tab ATS (W3c) render từ đây. */
  atsCheck?: AtsCheckResult;
  /** CV cấu trúc hoá ĐẦY ĐỦ (BE review.document) — DocumentPreview render education/
   *  experience/projects bullets + W3d highlight evidence_text trong bullets. */
  document?: CanonicalCvDocument;
  issues: CvIssue[];
  rewriteSuggestions: CvRewriteSuggestion[];
  strengths: string[];
  actionPlan: string[];
  parsedCv: ParsedCvSummary;
  jdMatch?: CvJdMatch;
  /** Field bổ sung từ BE (snake_case theo contract Notion §6) — VẮNG/null thì FE ẩn block.
   *  Lưu ý mapping W1: trên response thật, skills_extracted nằm ở `ats_extracted.skills_extracted`
   *  — tầng service lift lên field phẳng này cho UI. */
  skills_extracted?: ExtractedSkill[];
  skills_relevance_breakdown?: SkillsRelevanceBreakdown | null;
  top_summary?: TopSummary;
  evidence_ledger?: EvidenceLedger | null;
}

export type EvidenceKind = "experience" | "project" | "education" | "certification" | "skill_list" | "skills_list" | "summary" | "other";
export type EvidenceStrength = "demonstrated" | "mentioned" | "listed_only";

export interface EvidenceSource {
  kind: EvidenceKind;
  label: string;
  excerpt?: string | null;
}

export interface EvidenceItem {
  skill_canonical: string;
  display_name: string;
  strength: EvidenceStrength;
  sources: EvidenceSource[];
  most_recent_year: number | null;
  evidence_gap?: string | null;
}

export interface EvidenceLedger {
  items: EvidenceItem[];
}

// ════════════════════════════════════════════════════════════════════════════
// REAL NestJS BE contract (skillbridge-ai) — trích từ controllers/DTOs 2026-06-07.
// Nguồn: docs/FE-diagnosis-rewire-plan.md §5. snake_case bên trong `review` là
// CHUẨN BE — giữ nguyên tên; tầng service map sang UI model (CvReviewData) ở trên.
// Envelope mọi response: { success, message, data, errors, errorCode } —
// xem src/api/auth/envelope.ts (unwrapEnvelope).
// ════════════════════════════════════════════════════════════════════════════

/** Hub cấu trúc CV chuẩn hoá — dùng chung parse/builder/render (BE: canonical-cv.ts). */
export interface CanonicalCvDocument {
  language: string;
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    links: Array<{ label: string; url: string }>;
  };
  summary: string;
  education: Array<{
    school: string;
    degree: string | null;
    field: string | null;
    start: string | null;
    end: string | null;
    gpa: string | null;
    highlights: string[];
  }>;
  experience: Array<{
    org: string;
    role: string | null;
    start: string | null;
    end: string | null;
    location: string | null;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    role: string | null;
    tech: string[];
    bullets: string[];
    link: string | null;
  }>;
  skills: { technical: string[]; soft: string[]; languages: string[]; tools: string[] };
  certifications: Array<{ name: string; issuer: string | null; date: string | null }>;
  activities: Array<{ org: string; role: string | null; bullets: string[] }>;
}

/** 1 rule ATS deterministic (BE AtsRuleChecker) — label hiện BE trả sẵn tiếng Việt. */
export interface AtsRuleResult {
  rule_id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  score: number;
  /** Trích dẫn bằng chứng từ CV (vd email/SĐT tìm thấy). */
  evidence?: string;
  /** Gợi ý sửa khi warn/fail. */
  hint?: string;
}

export interface AtsCheckResult {
  ats_rule_score: number;
  rules: AtsRuleResult[];
  summary: { total: number; passed: number; warned: number; failed: number };
}

export type BeIssueSeverity = "info" | "warning" | "error";

export interface BeReviewSection {
  name: string;
  score: number;
  issues: Array<{ severity: BeIssueSeverity; text: string; hint?: string }>;
}

/** Kết quả chấm CV của BE — nằm trong `CvDto.review` (POST /api/cvs trả ĐỒNG BỘ). */
export interface CvReviewParsedResponse {
  language: string;
  document: CanonicalCvDocument;
  /** = ats_rule_score*0.4 + llm_normalized*0.6 — FE KHÔNG tự tính lại. */
  overall_score: number;
  ats_rule_score: number;
  ats_check?: AtsCheckResult;
  /** 4 dim LLM-rubric, 0-20 mỗi dim. */
  llm_score_dimensions: {
    action_verbs: number;
    skills_relevance: number;
    experience: number;
    education: number;
  };
  llm_total: number;
  llm_normalized: number;
  rationale: {
    action_verbs: string;
    skills_relevance: string;
    experience: string;
    education: string;
  };
  sections: BeReviewSection[];
  ats_extracted: {
    name: string | null;
    email: string | null;
    phone: string | null;
    skills_raw: string[];
    /** Path thật của skills_extracted (Δ3) — service lift lên CvReviewData. */
    skills_extracted: ExtractedSkill[];
  };
  /** Alias backward-compat của ats_extracted (BE giữ cho client cũ). */
  parsed_cv?: unknown;
  action_verbs_analysis?: unknown;
  scoring_weights_version?: string;
  skills_relevance_breakdown?: SkillsRelevanceBreakdown | null;
  top_summary?: TopSummary;
  evidence_ledger?: EvidenceLedger | null;
}

export interface CvSkillDto {
  id: string | null;
  canonicalName: string | null;
  displayName: string | null;
  rawInput: string;
  matchedVia: string;
  confidence: number;
}

/** BE CvResponseDto — data của POST /api/cvs, GET /api/cvs/:id, POST /api/diagnosis/cv-review. */
export interface CvDto {
  id: string;
  title: string | null;
  originalFileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  downloadUrl: string;
  parsedText: string | null;
  parsedJson: CanonicalCvDocument | null;
  cvKind: "UPLOADED" | "BUILT";
  language: string | null;
  targetRole: string | null;
  isOcrOnly: boolean;
  atsReadabilityScore: number | null;
  skills: CvSkillDto[];
  review: CvReviewParsedResponse | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CvListItemDto {
  id: string;
  title: string | null;
  originalFileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  language: string | null;
  targetRole: string | null;
  isOcrOnly: boolean;
  atsReadabilityScore: number | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ── CV × JD match (POST /api/cvs/:cvId/match) ──────────────────────────────

export interface BeMatchedSkill {
  skill_id: string;
  canonical_name: string;
  display_name: string;
  cv_level: number;
  required_level: number;
  importance: SkillImportance;
  weight: number;
  /** Canonical của skill CON đã thỏa requirement này (sql_server cho sql) — BE #51. Vắng = match trực tiếp. */
  satisfied_by?: string;
}

export interface BePartialSkill extends BeMatchedSkill {
  gap_levels: number;
}

export interface BeMissingSkill {
  skill_id: string;
  canonical_name: string;
  display_name: string;
  required_level: number;
  importance: SkillImportance;
  weight: number;
  gap_levels: number;
}

export interface CvJdMatchParsedResponse {
  overall_score: number;
  match_ratio: number;
  matched_skills: BeMatchedSkill[];
  partial_skills: BePartialSkill[];
  missing_skills: BeMissingSkill[];
  bonus_skills: Array<{ canonical_name: string; display_name: string; cv_level: number }>;
  /** 0-1: tỉ lệ kỹ năng REQUIRED đã đạt. */
  required_coverage: number;
  unnormalized_cv_skills: Array<{ raw_input: string; evidence_text?: string; reason: string }>;
  unnormalized_jd_requirements: Array<{ raw_input: string; evidence_text?: string; reason: string }>;
  scoring_breakdown: ScoringBreakdown;
  source_of_requirements: "role_rubric" | "jd_extraction" | "none";
  target_role: string | null;
  experience_fit?: ExperienceFit | null;
  inferred_skills?: InferredSkill[];
}

export interface CvMatchDto {
  id: string;
  cvId: string;
  jobDescriptionId: string | null;
  aiResultId: string | null;
  overallScore: number | null;
  matchRatio: number | null;
  requiredCoverage: number | null;
  parsedResponse: CvJdMatchParsedResponse | null;
  jobDescription: {
    id: string;
    title: string | null;
    sourceType: string | null;
    createdAt: string;
  } | null;
  createdAt: string;
}

// ── Job recommendations (GET /api/cvs/:cvId/job-recommendations) ───────────

export interface JobRecommendationDto {
  job_id: string;
  title: string;
  company_name: string;
  location: string | null;
  role_code: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  source_url: string | null;
  posted_at: string | null;
  /** 0-100, deterministic — cùng engine với CV/JD match. */
  match_score: number;
  semantic_similarity: number | null;
  /** RRF-fused rank, 1 = tốt nhất. */
  rank: number;
  matched_skills: string[];
  partial_skills?: MatchPartialSkill[];
  missing_skills: Array<{ display_name: string; importance: string }>;
  scoring_breakdown?: ScoringBreakdown | null;
  experience_fit?: ExperienceFit | null;
}

export interface JobRecommendationsResponse {
  cv_id: string;
  pool_size: number;
  recommendations: JobRecommendationDto[];
}

// ── CV Builder AI (POST /api/cvs/:id/builder/*) — R1b contract ─────────────
// BE DTO khớp store FE field-for-field (evaluate-section.dto.ts): FE gửi state
// section NGUYÊN VĂN, không remap. Label/checklist/missing đã localize theo `language`.

export type BuilderSection =
  | "basic"
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications";

export interface BuilderBasicContent {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface BuilderExperienceEntry {
  position?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  responsibilities?: string;
  achievements?: string;
}

export interface BuilderEducationEntry {
  school?: string;
  major?: string;
  degree?: string;
  startYear?: string;
  endYear?: string;
  gpa?: string;
  coursework?: string;
  achievements?: string;
}

export interface BuilderProjectEntry {
  name?: string;
  role?: string;
  tools?: string;
  description?: string;
  contribution?: string;
  result?: string;
}

export interface BuilderSkillsContent {
  technicalSkills?: string[];
  softSkills?: string[];
  tools?: string[];
  languages?: string[];
}

export interface BuilderCertificationEntry {
  name?: string;
  organization?: string;
  issueDate?: string;
  credentialUrl?: string;
}

export type BuilderSectionContent =
  | BuilderBasicContent
  | { summary?: string }
  | { entries: BuilderExperienceEntry[] }
  | { entries: BuilderEducationEntry[] }
  | { entries: BuilderProjectEntry[] }
  | BuilderSkillsContent
  | { entries: BuilderCertificationEntry[] };

export interface EvaluateSectionRequest {
  section: BuilderSection;
  /** 1 trong 8 role code IT — làm sắc gợi ý "missing"; optional. */
  role_code?: string;
  language?: "vi" | "en";
  content: BuilderSectionContent;
}

export interface BuilderChecklistItem {
  /** Id ổn định, vd 'exp_verb_first' — FE key ✅/❌ theo đây. */
  id: string;
  /** Label đã localize theo request language. */
  criterion: string;
  pass: boolean;
}

export interface EvaluateSectionResponse {
  /** round(passed/total × 100); 0 khi section trống. */
  score: number;
  /** Đã localize: 'Rất tốt' ≥80 · 'Cần cải thiện' 1-79 · 'Chưa có thông tin' 0. */
  label: string;
  checklist: BuilderChecklistItem[];
  /** "Cần bổ sung" — gợi ý hành động từ tiêu chí fail (+ role rubric). */
  missing: string[];
}

export type RewriteMode = "harvard" | "translate" | "custom" | "tailor";

export interface TailorRewriteAction {
  action_type: "emphasize" | "deepen_wording";
  skill_display: string;
  cv_level?: number | null;
  required_level?: number | null;
}

export interface RewriteRequest {
  /** 1 field text duy nhất (1 bullet / 1 đoạn summary). */
  text: string;
  mode: RewriteMode;
  /** Bắt buộc khi mode='translate'. */
  target_lang?: "vi" | "en";
  /** Bắt buộc khi mode='custom' (≤500 ký tự). */
  instruction?: string;
  role_code?: string;
  section?: BuilderSection;
  tailor_action?: TailorRewriteAction;
}

export interface RewriteResponse {
  /** "AI đề xuất" — KHÔNG tự ghi đè input; user bấm [Sử dụng] mới áp. */
  suggestion: string;
  /** true nếu guardrail deterministic trả về nguyên bản (vd nghi bịa số liệu). */
  fallback?: boolean;
}

export interface CreateBuilderDraftInput {
  /** Prefill từ CV đã chấm (parsed_json); bỏ trống = seed từ upload gần nhất hoặc trống. */
  sourceCvId?: string;
  title?: string;
  targetRole?: string;
  language?: "vi" | "en";
}

export interface UpdateBuilderDraftInput {
  /** BẮT BUỘC — toàn bộ CV canonical từ form builder. */
  parsedJson: CanonicalCvDocument;
  title?: string;
  targetRole?: string;
  language?: "vi" | "en";
}

// ── Skill trends (GET /api/trends/skills[/gap/:cvId]) ──────────────────────

export interface SkillDemandRow {
  canonical_name: string;
  display_name: string;
  posting_count: number;
  pct_of_postings: number;
  salary_p50_vnd: number | null;
  trend_delta: number | null;
}

export interface SkillGapRow extends SkillDemandRow {
  covered: boolean;
}

export interface SkillGapResponse {
  cv_id: string;
  role_code: string;
  period: string;
  skills: SkillGapRow[];
  /** Subset missing, đã sort theo demand — danh sách ưu tiên upskill. */
  gap: SkillGapRow[];
}

export interface TrendsRecommendedSkill {
  canonical_name: string;
  display_name: string;
  posting_count?: number;
  pct_of_postings?: number;
  trend_delta?: number | null;
}

export interface TrendsInsightItem {
  title: string;
  detail: string;
  trend_delta?: number | null;
}

export interface TrendsInsightResponse {
  cv_id: string;
  role_code: string;
  period?: string;
  summary: string;
  insights: TrendsInsightItem[];
  recommended_skills: TrendsRecommendedSkill[];
}

// Diagnosis add-ons (W11/W12/W13)
export type InterviewFocusType = "gap_probe" | "depth_probe" | "evidence_probe" | "strength_showcase";

export interface InterviewPlanItem {
  skill_canonical: string;
  display_name: string;
  focus_type: InterviewFocusType;
  reason: string;
  difficulty: "foundation" | "applied";
  template_question: string;
  question: string;
  good_answer_hints: string[];
}

export interface InterviewPlanResponse {
  ai_request_id: string;
  target_role: string;
  language: "vi" | "en";
  items: InterviewPlanItem[];
  llm_enhanced: boolean;
  token_usage: number;
}

export type TailorActionType = "missing_required" | "add_evidence" | "emphasize" | "deepen_wording";

export interface GapEvidenceItem {
  skill_canonical: string;
  display_name: string;
  importance: string;
  cv_level: number | null;
  required_level: number | null;
}

export interface GapEmphasisItem {
  skill_canonical: string;
  display_name: string;
  jd_count: number;
  cv_count: number;
  importance: string;
}

export interface GapSeniorityBlock {
  cv: {
    bucket: string;
    est_years: number | null;
    confidence: string;
    signals: string[];
  } | null;
  jd_level: null;
  verdict: "unknown";
  note: string;
}

export interface TailorActionDto {
  action_type: TailorActionType;
  skill_canonical: string;
  display_name: string;
  why: string;
  rewrite_eligible: boolean;
  anchor: { kind: string; ref: string } | null;
  jd_importance: string | null;
  jd_count: number | null;
  cv_count: number | null;
  cv_level?: number | null;
  required_level?: number | null;
}

export type TailorAction = TailorActionDto;
export type MarketPosition = "niche" | "common" | "standard";

export interface JdMarketSkillDto {
  skill_canonical: string;
  display_name: string;
  jd_importance: string;
  pct_of_postings: number;
  posting_count: number;
  trend_delta: number | null;
  position: MarketPosition;
  why: string;
}

export type JdMarketSkill = JdMarketSkillDto;

export interface ImpliedSkillDto {
  skill_canonical: string;
  display_name: string;
  pct_of_postings: number;
  posting_count: number;
  trend_delta: number | null;
  covered: boolean;
  why: string;
}

export type ImpliedSkill = ImpliedSkillDto;

export type JdMarketPositionDto =
  | {
      available: true;
      role_code: string;
      period: string;
      total_active_jobs: number;
      jd_skills: JdMarketSkillDto[];
      implied: ImpliedSkillDto[];
    }
  | { available: false; reason: "NO_ROLE" | "NO_SNAPSHOT" };

export type JdMarketPosition = JdMarketPositionDto;

export interface GapReportDto {
  target_role: string | null;
  overall_score: number;
  source_of_requirements: "role_rubric" | "jd_extraction" | "none";
  explicit_gaps: BeMissingSkill[];
  proficiency_gaps: BePartialSkill[];
  evidence_gaps: GapEvidenceItem[];
  seniority: GapSeniorityBlock;
  jd_emphasis_gaps: GapEmphasisItem[];
  strengths: {
    matched: BeMatchedSkill[];
    demonstrated: string[];
    bonus: Array<{ canonical_name: string; display_name: string; cv_level: number }>;
  };
  language: "vi" | "en";
  recommended_actions: TailorActionDto[];
  market_trend_gaps: ImpliedSkillDto[] | null;
  jd_market_position: JdMarketPositionDto;
  generated_with_ledger?: boolean;
}

export type GapReportResponse = GapReportDto;

export interface GithubRepoRef {
  name: string;
  url: string;
  pushed_year: number | null;
}

export interface GithubSkillEvidence {
  skill_canonical: string;
  display_name: string;
  repos: GithubRepoRef[];
  repo_count: number;
  most_recent_year: number | null;
  why: string;
}

export type GithubEvidenceResponse =
  | {
      available: true;
      username: string;
      analyzed_repo_count: number;
      cv_skill_join: boolean;
      corroborated: GithubSkillEvidence[];
      github_only: GithubSkillEvidence[];
    }
  | {
      available: false;
      reason: "CONSENT_REQUIRED" | "INVALID_USERNAME" | "USER_NOT_FOUND" | "RATE_LIMITED" | "FETCH_FAILED";
    };

export interface MeEntitlementDto {
  feature: string;
  used: number;
  limit: number;
  period: "DAILY" | "MONTHLY";
  remaining: number | null;
  unlimited: boolean;
  allowed: boolean;
  resets_at: string;
}
