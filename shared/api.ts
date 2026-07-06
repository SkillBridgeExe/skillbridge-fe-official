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



export interface ParsedCvSummary {
  name?: string;
  email?: string;
  phone?: string;
  summary: string;
  skills: string[];
  inferred_roles?: string[];
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

export interface KeywordFrequency {
  keyword: string;
  jd_count: number;
  cv_count: number;
}

export type FitVerdict = 'safe_apply' | 'stretch' | 'not_recommended';
export type FitReasonCode = 'LOW_COVERAGE' | 'SENIORITY_STRETCH' | 'DEAL_BREAKER_UNMET' | 'STRONG_COVERAGE' | string;

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
  fit?: { verdict: FitVerdict; reasons: FitReasonCode[] } | null;
  /** Thước seniority khi chấm theo rubric; null = chấm theo JD dán (thước của JD). */
  rubric_band?: RubricBand | null;
  fell_back_to_rubric?: boolean;
  source_of_requirements?: "role_rubric" | "jd_extraction" | "none";
  unnormalized_jd_requirements?: Array<{ raw_input: string; evidence_text?: string; reason: string }>;
  keyword_frequency?: KeywordFrequency[];
}

export type RubricBand = "intern" | "fresher" | "mid";

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
  cv_seniority: string;
  job_level: string;
  verdict: "fits" | "stretch" | "over_qualified" | "unknown";
  confidence: "low" | "medium" | "high";
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
  provenance?: { source: 'deterministic'|'llm'; confidence: 'high'|'medium'|'low'; evidence: string[] };
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
  /** Input-quality disclosure (mojibake/OCR/thin/sparse). Absent/null → no banner. */
  extraction_quality?: ExtractionQuality | null;
  bullet_feedback?: Record<string, BulletFeedbackItem>;
  buzzwords_detected?: string[];
  dimension_provenance?: Partial<Record<'action_verbs'|'skills_relevance'|'experience'|'education',
    { source: 'deterministic'|'llm'; confidence: 'high'|'medium'|'low'; evidence: string[] }>>;
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

export type ExtractionConfidence = "high" | "medium" | "low";

/** Deterministic read on how trustworthy the EXTRACTED CV text was (BE `extraction_quality`).
 *  Reportable signal ONLY — never affects the score. Absent on older payloads → FE renders nothing.
 *  snake_case mirrors the BE JSON contract for direct passthrough. */
export interface ExtractionQuality {
  char_count: number;
  word_count: number;
  mojibake_count: number;
  mojibake_ratio: number;
  wordlike_ratio: number;
  section_count: number;
  skill_count: number;
  ocr_used: boolean;
  confidence: ExtractionConfidence;
  /** Machine flags that fired, e.g. MOJIBAKE_HIGH / OCR_USED / THIN_CONTENT / SPARSE_SECTIONS. */
  flags: string[];
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

export interface BulletFeedbackItem {
  text: string;
  section: "experience" | "projects" | "activities";
  verbFirst: boolean;
  quantified: boolean;
  weakOpener: boolean;
  firstPerson: boolean;
  fillerCount: number;
  tips: string[];
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
  bullet_feedback?: Record<string, BulletFeedbackItem>;
  buzzwords_detected?: string[];
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
  /** Deterministic input-quality signal (BE). Optional — absent on older cached reviews. */
  extraction_quality?: ExtractionQuality | null;
  dimension_provenance?: Partial<Record<'action_verbs'|'skills_relevance'|'experience'|'education',
    { source: 'deterministic'|'llm'; confidence: 'high'|'medium'|'low'; evidence: string[] }>>;
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
  fit?: { verdict: FitVerdict; reasons: FitReasonCode[] };
  target_role: string | null;
  /** Số lần xuất hiện per skill (CV vs JD) — mirror BE KeywordFrequency[], match cũ có thể thiếu. */
  keyword_frequency?: Array<{
    canonical_name: string;
    display_name: string;
    cv_count: number;
    jd_count: number;
  }>;
  inferred_skills?: InferredSkill[];
  /** BE #54/#56: non-null CHỈ khi requirements_source = role_rubric (JD path không band). */
  rubric_band?: RubricBand | null;
  /** cv_jd_match_v2: non-skill dimensions extracted from JD (seniority/language/education/domain/work_mode). */
  jd_dimensions?: JdDimension[];
  fell_back_to_rubric?: boolean;
  experience_fit?: ExperienceFit | null;
}

export interface CvMatchDto {
  id: string;
  cvId: string;
  jobDescriptionId: string | null;
  aiResultId: string | null;
  overall_match_score: number | null;
  seniority_match?: GapSeniorityBlock | null;
  fit?: { verdict: FitVerdict; reasons: FitReasonCode[] };
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
  /** 0-100, deterministic — cùng engine với CV/JD match. CHỈ skill match (để giải thích minh bạch);
   *  KHÔNG bị seniority guard tác động. */
  match_score: number;
  /** 0-100 — điểm HIỂN THỊ đã điều chỉnh seniority = match_score × seniority factor. Bằng match_score
   *  khi fit; thấp hơn khi 'stretch' (CV dưới level job), cùng chiều với thứ tự rank của BE. Đây là số
   *  minh bạch cho UI, KHÔNG phải khoá sort: BE rank nội bộ bằng fused(skill+semantic) × factor + nudge.
   *  Có thể vắng ở response cũ. */
  recommendation_score?: number;
  seniority_match?: GapSeniorityBlock | null;
  experience_fit?: ExperienceFit | null;
  fit?: { verdict: FitVerdict; reasons: FitReasonCode[] };
  /** true khi job cao hơn CV ≥3 bậc seniority (vd fresher→LEAD) — UI badge/lọc. */
  severe_stretch?: boolean;
  semantic_similarity: number | null;
  /** RRF-fused rank, 1 = tốt nhất. */
  rank: number;
  matched_skills: string[];
  partial_skills?: MatchPartialSkill[];
  missing_skills: Array<{ display_name: string; importance: string }>;
  scoring_breakdown?: ScoringBreakdown | null;
  seniority_factor?: number;
  level_gap?: number;
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
/** Builder rewrite modes (mọi mode TRỪ tailor). */
export type BuilderRewriteMode = Exclude<RewriteMode, "tailor">;

interface RewriteRequestBase {
  /** 1 field text duy nhất (1 bullet / 1 đoạn summary). */
  text: string;
  /**
   * Token tạo-lại: lần gợi ý ĐẦU bỏ trống (BE cache — mở lại field không tốn);
   * khi user bấm "Viết lại / Tạo lại" thì gửi giá trị thay đổi để BE bỏ cache và
   * sinh gợi ý MỚI (temperature cao hơn) thay vì trả câu cũ. ≤16 ký tự.
   */
  variant?: string;
}

/** CV-builder rewrite (harvard/translate/custom). KHÔNG dùng cho tailor (xem TailorRewriteRequest). */
export interface BuilderRewriteRequest extends RewriteRequestBase {
  mode: BuilderRewriteMode;
  /** Bắt buộc khi mode='translate'. */
  target_lang?: "vi" | "en";
  /** Bắt buộc khi mode='custom' (≤500 ký tự). */
  instruction?: string;
  role_code?: string;
  section?: BuilderSection;
}

/**
 * Tailor rewrite (PR4.5) — server-verified. FE KHÔNG còn tự gửi skill/level facts: CHỈ gửi
 * `match_id` + `action_id`. BE tự load match, verify quyền sở hữu + dựng lại gap-report, rồi build
 * instruction từ action ĐÃ verify. `action_id` = `${action_type}:${skill_canonical}` lấy từ
 * gap-report. Cả hai field BẮT BUỘC ở mức type — không gửi đủ là lỗi biên dịch. Field
 * `tailor_action` (skill/level facts) cũ đã BỎ khỏi contract: không thể gửi trong luồng này nữa.
 */
export interface TailorRewriteRequest extends RewriteRequestBase {
  mode: "tailor";
  match_id: string;
  action_id: string;
}

export type RewriteRequest = BuilderRewriteRequest | TailorRewriteRequest;

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

// ── Story → Career Target (cold-start role inference, slice 1) ─────────────
// POST /api/cvs/:id/builder/story — 1 free story → suggested role. The engine is the
// skillbridge-ai deterministic role-inference (weighted skill coverage over the role rubric,
// NO LLM, no quota): same input → same output. 1b endpoint = Khoa; this is the wire contract.
export interface CareerTargetFromStoryRequest {
  /** Free narrative of what the user has done (no form, no role needed). */
  story: string;
  /** UI language for display names; defaults 'vi'. */
  language?: "vi" | "en";
}

export interface CareerTargetCandidate {
  role_code: string;
  /** Human label (BE rubric display_name in the requested language). */
  display_name: string;
  /** Weighted coverage 0..1 of this role's profile. */
  score: number;
}

export interface CareerTargetFromStoryResponse {
  /** Inferred role_code, or null when the engine abstains (too weak / ambiguous). */
  role_code: string | null;
  /** Human label for role_code; null when abstaining. */
  display_name: string | null;
  /** Weighted coverage 0..1 of the winning role. */
  confidence: number;
  /** Canonical skills the story matched for the winning role. */
  matched_skills: string[];
  /** Ranked roles (top first) — surfaced so the user can pick when ambiguous. */
  candidates: CareerTargetCandidate[];
  /** true → ask the user instead of guessing (UI shows a coaching prompt, no auto-fill). */
  needs_user_input: boolean;
  reason: "ok" | "too_weak" | "ambiguous" | "no_roles";
}

// ── Story → CV Extract (slice-2, POST /api/cvs/:id/builder/story/extract) ──
// User's free story → extracted projects + certifications (deterministic, no LLM).
export interface StoryExtractRequest {
  story: string;
  language?: "vi" | "en";
}

export interface StoryExtractedProject {
  name: string;
  role: string | null;
  tech: string[];
  bullets: string[];
  link: string | null;
  /** Fields the engine could not find in the story — UI should prompt user to fill. */
  missing_fields: string[];
}

export interface StoryExtractedCertification {
  name: string;
  issuer: string | null;
  date: string | null;
}

export interface StoryExtractResponse {
  projects: StoryExtractedProject[];
  certifications: StoryExtractedCertification[];
  /** true when the LLM project extraction degraded (call/parse failure). Certs still returned;
   *  the UI must show an honest "some parts couldn't be extracted" note, never fabricate. */
  degraded: boolean;
}

// ── Story → CV Apply Preview (slice-3, POST /api/cvs/:id/builder/story/apply-preview) ──
// Merge selected extract items into current CV doc (BE handles dedup by normalized name).
// Does NOT persist — FE must PUT the merged doc via autosave route.
export interface StoryApplyPreviewRequest {
  doc: CanonicalCvDocument;
  selected: {
    role_code?: string;
    projects: StoryExtractedProject[];
    certifications: StoryExtractedCertification[];
  };
}

export interface StoryApplyPreviewResponse {
  doc: CanonicalCvDocument;
  applied: { projects: number; certifications: number };
  skipped_duplicates: Array<{ section: "projects" | "certifications"; name: string }>;
}

// ── Story → CV Readiness & Gap (slice-4, POST /api/cvs/:id/builder/story/readiness) ──
export interface StoryReadinessRequest {
  role_code: string;
  band?: "intern" | "fresher" | "mid" | string;
}

export interface StoryReadinessResponse {
  readiness: number;
  band: "starting" | "building" | "ready";
  overall_score: number;
  required_coverage: number;
  matched_count: number;
  missing_count: number;
  gap_items: GapItem[];
  roadmap_pointer: {
    route: string;
    payload: Record<string, any>;
  } | null;
  role_has_rubric: boolean;
}

// ── Story → Project Intake (W34, POST /api/cvs/:id/builder/project/intake) ──
export interface ProjectIntakeProject {
  name: string;
  role: string | null;
  tech: string[];
  bullets: string[];
  link: string | null;
  found_fields: string[];
  missing_fields: string[];
}

export interface ProjectIntakeRequest {
  story: string;
  language?: "vi" | "en";
}

export interface ProjectIntakeResponse {
  project: ProjectIntakeProject | null;
  degraded: boolean;
  multiple_detected: boolean;
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

// Mirror of BE trends-insight.types.ts (GET /api/trends/insight) — numbers are
// re-attached from deterministic FACTS server-side; the LLM only writes prose.
export interface TrendsRecommendedSkill {
  skill: string;
  display_name: string;
  pct_of_postings: number;
  salary_p50_vnd: number | null;
}

export interface TrendsInsightItem {
  skill: string;
  display_name: string;
  pct_of_postings: number;
  trend_delta: number | null;
  /** null = role-level insight (no CV to check coverage against). */
  covered: boolean | null;
  comment: string;
}

/** Skill pair that co-occurs in the SAME postings — counts are real SQL facts. */
export interface TrendsSkillPairInsight {
  a: string;
  a_display: string;
  b: string;
  b_display: string;
  pair_count: number;
  pct_of_postings: number;
  comment: string;
}

export interface TrendsInsightResponse {
  role_code: string;
  period: string;
  /** Active postings in the role scope — basis for data_confidence. */
  sample_size: number;
  data_confidence: "high" | "medium" | "low";
  personalized: boolean;
  summary: string;
  insights: TrendsInsightItem[];
  recommended_skills: TrendsRecommendedSkill[];
  /** May be empty when the pool/LLM has no pair worth mentioning. */
  skill_pairs: TrendsSkillPairInsight[];
  cached: boolean;
  /** True when the snapshot is older than the disclosure threshold (3 days). */
  stale?: boolean;
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
  /** True when there were no skill-type gaps to probe (honest empty-state, no LLM call). */
  no_focus_areas?: boolean;
}

// Learning roadmap derived from a CV/JD match's GapReport (POST /api/cv-matches/:matchId/roadmap).
export type RoadmapLanguagePref = "vi" | "en" | "both";

export interface GenerateRoadmapFromMatchRequest {
  available_days?: number;
  hours_per_week?: number;
  language_pref?: RoadmapLanguagePref;
}

export type LearningResourceSourceType =
  | "course"
  | "official_doc"
  | "video"
  | "exercise"
  | "mini_project"
  | "interview_drill"
  | "cv_fix_task";

export interface LearningResourceDto {
  id: string;
  source_type: LearningResourceSourceType;
  title: string;
  url?: string;
  is_internal: boolean;
  content_template_id?: string;
  description?: string;
  duration_minutes: number;
  outcome_type: string;
  proof_of_completion?: string;
  match_score: number;
  quality_score: number;
  freshness_score: number;
  low_confidence: boolean;
  video_chapters?: Array<{
    id: string;
    title: string;
    start_seconds: number;
    objective_id?: string;
  }>;
}

export interface RecommendedCourseDto {
  id: string;
  title: string;
  url?: string;
  provider?: string;
  duration_minutes?: number;
  is_free?: boolean;
  language?: string;
  difficulty?: string;
  rating?: number;
  skills?: Array<{ skill_canonical_name: string; teaches_level: number }>;
  match_score?: number;
  match_breakdown?: {
    rating_pts: number;
    language_pts: number;
    free_pts: number;
    level_fit_pts: number;
    multi_skill_pts: number;
  };
}

export interface LessonSectionContentDto {
  id: string;
  title: string;
  body: string;
  objective_id?: string;
  checklist: Array<string | { id: string; label: string; objective_id?: string }>;
}

export interface LessonQuizQuestionDto {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  kind?: "concept" | "scenario" | "debug" | "mini_case";
  objective_id?: string;
  section_id?: string;
  remediation?: {
    section_id?: string;
    video_resource_id?: string;
    video_chapter_id?: string;
    start_seconds?: number;
  };
}

export interface LessonExerciseContentDto {
  id: string;
  title: string;
  prompt: string;
  acceptance_criteria: string[];
  proof_of_completion: string;
}

export interface SkillBridgeLessonContentDto {
  skill_canonical: string;
  title: string;
  summary: string;
  license_type: "skillbridge_original" | "official_reference" | "link_only";
  reuse_policy: "full_reuse_allowed" | "summary_only" | "link_only";
  source_resource_ids: string[];
  learning_objectives?: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  sections: LessonSectionContentDto[];
  quiz_bank?: LessonQuizQuestionDto[];
  pass_policy?: {
    min_correct_per_objective: number;
    min_accuracy: number;
  };
  quiz: LessonQuizQuestionDto[];
  exercises: LessonExerciseContentDto[];
}

export interface ComposedRoadmapStepDto {
  skill_canonical: string;
  display_name: string;
  strategy: "deep_build" | "crash_prep";
  estimated_hours: number;
  priority: number;
  resources: LearningResourceDto[];
  recommended_courses?: RecommendedCourseDto[];
  lesson_content?: SkillBridgeLessonContentDto;
}

export interface NotFeasibleItemDto {
  skill_canonical: string;
  display_name: string;
  reason?: string;
  estimated_hours?: number;
  required_hours?: number;
}

export interface RoadmapFromMatchResponse {
  budget_hours: number;
  steps: ComposedRoadmapStepDto[];
  not_feasible_items: NotFeasibleItemDto[];
  ai_summary: string;
  no_learning_gaps?: boolean;
}

export interface LearningSessionProgressDto {
  session_id: string;
  checked_checklist_items: Record<string, string[]>;
  exercise_proofs: Record<string, string>;
  quiz_attempts?: Record<string, {
    selected_option_index: number;
    is_correct: boolean;
    attempts: number;
    answered_at: string;
    last_answered_at?: string;
  }>;
  updated_at: string | null;
}

export interface UpsertLearningSessionProgressRequest {
  checked_checklist_items: Record<string, string[]>;
  exercise_proofs: Record<string, string>;
}

export interface AnswerLearningQuizQuestionRequest {
  skill_canonical: string;
  question_id: string;
  selected_option_index: number;
}

export interface PatchLearningChecklistItemRequest {
  section_id: string;
  checked: boolean;
}

export interface LearningQuizAnswerResponseDto {
  question_id: string;
  selected_option_index: number;
  is_correct: boolean;
  scored: boolean;
  attempt_count: number;
  correct_option_index: number;
  explanation: string;
  objective_mastery: {
    objective_id: string;
    correct: number;
    total_answered: number;
    accuracy: number;
    mastered: boolean;
  };
  lesson_status: "not_started" | "in_progress" | "mastered";
  next_recommended_questions: Array<{
    id: string;
    question: string;
    options: string[];
    explanation: string;
    kind?: "concept" | "scenario" | "debug" | "mini_case";
    objective_id?: string;
    section_id?: string;
  }>;
  remediation?: {
    section_id?: string;
    video_resource_id?: string;
    video_chapter_id?: string;
    start_seconds?: number;
  };
}

export interface LearningNextQuestionsResponseDto {
  weak_objectives: Array<{
    objective_id: string;
    correct: number;
    total_answered: number;
    accuracy: number;
    mastered: boolean;
  }>;
  next_recommended_questions: Array<{
    id: string;
    question: string;
    options: string[];
    explanation: string;
    kind?: "concept" | "scenario" | "debug" | "mini_case";
    objective_id: string;
    section_id: string;
  }>;
}

export interface LearningChatRequest {
  message: string;
  conversationId?: string;
  language?: "vi" | "en";
  session_id?: string;
  skill_canonical?: string;
}

export interface LearningChatMessageDto {
  id?: string;
  role: "assistant" | "user";
  message?: string;
  text?: string;
  createdAt?: string;
  citations?: Array<{ title: string; url?: string }>;
}

export interface LearningChatResponse {
  conversationId: string;
  message: string;
  citations?: Array<{ title: string; url?: string }>;
  history?: LearningChatMessageDto[];
}

export type TailorActionType = "missing_required" | "add_evidence" | "emphasize" | "deepen_wording" | "not_fixable_now" | "already_met";

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
  jd_level: string | null;
  verdict: ExperienceVerdict;
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
  gap_severity?: number | null;
  // PR4 CV Patch Engine (BE) — all OPTIONAL/additive; absent on the legacy payload.
  /** Stable key for dedupe / React key: `${action_type}:${skill_canonical}`. */
  action_id?: string;
  /** Canonical GapItem this action addresses (cross-flow tracker; may be null). */
  requirement_id?: string | null;
  fixability?: "rewrite" | "add_evidence" | "learn" | "not_fixable_now" | null;
  /** Localized CV-location label, e.g. "Dự án: Booking App" (prefer over `anchor.ref`). */
  cv_section?: string | null;
  anchor_confidence?: "high" | "low" | null;
  /** The exact existing CV bullet to reword — only present for an evidence-backed rewrite. */
  before?: string | null;
  /** emphasize only: raw ledger ref of where the skill currently appears. */
  target_section?: string | null;
  /** emphasize only: deterministic hint on how to surface the skill (no single-bullet edit). */
  insertion_hint?: string | null;
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
  market?: { available: true; role_code: string; period: string } | { available: false; reason: string };
  generated_with_ledger?: boolean;
  /** cv_jd_match_v2: JD non-skill disclosure (seniority/language/education/domain/work_mode). */
  jd_intelligence?: JdIntelligenceBlock | null;
  /** cv_jd_match_v2: canonical gap objects from Gap Engine v2. */
  gap_items?: GapItem[];
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

// ── JD-Intelligence (cv_jd_match_v2) ───────────────────────────────────────────
export type JdDimensionType = 'seniority' | 'language' | 'education' | 'domain' | 'work_mode';
export type ExperienceVerdict = 'fits' | 'stretch' | 'over_qualified' | 'unknown';

/** Non-skill requirement normalised from JD (lives on match parsed-response). */
export interface JdDimension {
  dimension: JdDimensionType;
  value_text: string;
  level_hint: string | null;
  min_years: number | null;
  importance: 'REQUIRED' | 'PREFERRED' | 'NICE_TO_HAVE';
  deal_breaker: boolean;
  evidence_text: string;
}

/** A row in the jd_intelligence disclosure block on the gap report. */
export interface JdIntelligenceItem {
  dimension: JdDimensionType;
  value_text: string;
  level_hint: string | null;
  min_years: number | null;
  importance: string;
  deal_breaker: boolean;
  evidence_text: string;
  /** true = already graded into a gap_item (seniority + language/education/domain). */
  graded: boolean;
  /** CV signal e.g. "B2 (ielts) · high"; null if CV has none. */
  cv_signal: string | null;
  /** Only for seniority; null for language/education/domain/work_mode. */
  verdict: ExperienceVerdict | null;
}

export interface JdIntelligenceBlock {
  dimensions: JdIntelligenceItem[];
  note: string;
}

// ── Canonical gap object (Gap Engine v2) ───────────────────────────────────────
export type GapSource = 'jd' | 'role_rubric' | 'market_implied';
export type GapType =
  | 'hard_skill' | 'soft_skill' | 'seniority' | 'language' | 'domain' | 'education' | 'work_mode';
export type GapCvStatus = 'matched' | 'partial' | 'missing' | 'unproven' | 'overclaimed';
export type GapEvidenceRisk = 'none' | 'listed_only' | 'unproven';
export type GapFixability = 'rewrite' | 'add_evidence' | 'learn' | 'not_fixable_now';

export interface GapItem {
  requirement_id: string;
  source: GapSource;
  type: GapType;
  canonical_name: string;
  display_name: string;
  importance: 'REQUIRED' | 'PREFERRED' | 'NICE_TO_HAVE';
  cv_status: GapCvStatus;
  cv_level: number | null;
  required_level: number | null;
  gap_levels: number;
  satisfied_by: string | null;
  evidence_refs: string[];
  evidence_risk: GapEvidenceRisk;
  fixability: GapFixability;
  market_demand: number | null;
  severity: number;
  confidence: number;
  recommended_next_action: string;
  severity_factors?: { importance: number; core: number; market_mult: number };
  evidence?: Array<{ kind: string; ref: string; quote: string | null }>;
}

export interface GapTransitionDto {
  canonical_name: string;
  display_name: string;
  prev_status: GapCvStatus | null;
  curr_status: GapCvStatus;
  kind: 'closed' | 'improved' | 'worsened' | 'new' | 'unchanged';
  prev_severity: number | null;
  curr_severity: number;
}

export interface ProgressReportDto {
  baseline: boolean;
  prev_count: number;
  curr_count: number;
  gaps_closed: string[];
  gaps_worsened: string[];
  avg_severity_delta: number;
  prev_score: number | null;
  curr_score: number | null;
  transitions: GapTransitionDto[];
  dimension_changes: Array<{ dimension: string; prev_verdict: string; curr_verdict: string; changed: boolean }>;
  evidence_recognized: string[];
  strengths_kept: string[];
  required_coverage_delta: number | null;
  template_changed: boolean;
}

export interface ChatThreadTurnDto {
  role: "user" | "assistant";
  text: string;
  ts: string;
}

export interface ChatThreadResponseDto {
  turns: ChatThreadTurnDto[];
}
