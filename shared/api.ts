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

export interface CvReviewData {
  overallScore: number;
  breakdown: CvScoreBreakdown;
  issues: CvIssue[];
  rewriteSuggestions: CvRewriteSuggestion[];
  strengths: string[];
  actionPlan: string[];
  parsedCv: ParsedCvSummary;
  jdMatch?: CvJdMatch;
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
