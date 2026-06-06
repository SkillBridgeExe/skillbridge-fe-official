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
  cvScore: number;
  jdRequired: number;
  status: SkillStatus;
}

export interface RadarMetric {
  subject: string;
  you: number;
  required: number;
}

export interface CvJdMatch {
  matchScore: number;
  summary: string;
  hardSkills: SkillMatchItem[];
  softSkills: SkillMatchItem[];
  radar: RadarMetric[];
  criticalGaps: string[];
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

export interface CvReviewData {
  overallScore: number;
  breakdown: CvScoreBreakdown;
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
}

export interface CvReviewSuccessResponse {
  success: true;
  data: CvReviewData;
  meta: {
    model: string;
    processingMs: number;
    warnings: string[];
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type CvReviewResponse = CvReviewSuccessResponse | ApiErrorResponse;
