// ─── Mock cho 3 field insights mới của cv_review ────────────────────────────
// TODO(BE): XOÁ file này khi BE trả skills_extracted / skills_relevance_breakdown /
// top_summary thật. withMockInsights chỉ ĐẮP KHI FIELD VẮNG (?? merge) nên BE ship
// field nào là field đó tự dùng dữ liệu thật, không cần đổi UI.

import type {
  CvReviewData,
  ExtractedSkill,
  SkillsRelevanceBreakdown,
  TopSummary,
} from "@shared/api";

export const MOCK_SKILLS_EXTRACTED: ExtractedSkill[] = [
  {
    name: "React",
    proficiency_hint: "advanced",
    evidence_text: "Built a reusable component library adopted by 3 teams",
  },
  {
    name: "TypeScript",
    proficiency_hint: "advanced",
    evidence_text: "Led strict-mode migration across a 40k-LOC codebase",
  },
  {
    name: "Tailwind CSS",
    proficiency_hint: "intermediate",
    evidence_text: "Rebuilt the marketing site design system with Tailwind",
  },
  {
    name: "Node.js",
    proficiency_hint: "intermediate",
    evidence_text: null,
  },
  {
    name: "REST API design",
    proficiency_hint: "intermediate",
    evidence_text: "Designed CRUD APIs for a student-club management app",
  },
  {
    name: "Docker",
    proficiency_hint: "beginner",
    evidence_text: "Containerized a course project for deployment",
  },
  {
    name: "Git",
    proficiency_hint: "beginner",
    evidence_text: null,
  },
  {
    name: "Figma",
    proficiency_hint: "unknown",
    evidence_text: null,
  },
];

// Shape đúng Notion §6.2: SkillItem objects, 3 nhóm, sort theo importance khi render.
export const MOCK_SKILLS_RELEVANCE: SkillsRelevanceBreakdown = {
  matched: [
    { name: "React", importance: "REQUIRED", required_level: 4, cv_level: 4 },
    { name: "TypeScript", importance: "REQUIRED", required_level: 3, cv_level: 4 },
    { name: "Tailwind CSS", importance: "PREFERRED", required_level: 3, cv_level: 3 },
    { name: "Git", importance: "NICE_TO_HAVE", required_level: 2, cv_level: 2 },
  ],
  partial: [
    { name: "REST API design", importance: "REQUIRED", required_level: 3, cv_level: 2 },
    { name: "Node.js", importance: "PREFERRED", required_level: 3, cv_level: 2 },
  ],
  missing: [
    { name: "Unit Testing (Jest)", importance: "REQUIRED", required_level: 3 },
    { name: "System Design", importance: "PREFERRED", required_level: 2 },
  ],
};

export const MOCK_TOP_SUMMARY: TopSummary = {
  headline: "Solid project section — but only 1 of 12 bullets is quantified. Fix that first.",
  prioritized_actions: [
    "Add numbers to your top 3 experience bullets (users, %, time saved).",
    "Add a testing skill (Jest/Vitest) — required by 8 of 10 Frontend JDs.",
    "Move the Skills section above Education so ATS ranks your keywords higher.",
  ],
};

/** Đắp mock CHỈ cho field còn vắng trên response thật (backward-compat 2 chiều). */
export function withMockInsights(data: CvReviewData): CvReviewData {
  return {
    ...data,
    skills_extracted: data.skills_extracted ?? MOCK_SKILLS_EXTRACTED,
    skills_relevance_breakdown: data.skills_relevance_breakdown ?? MOCK_SKILLS_RELEVANCE,
    top_summary: data.top_summary ?? MOCK_TOP_SUMMARY,
  };
}
