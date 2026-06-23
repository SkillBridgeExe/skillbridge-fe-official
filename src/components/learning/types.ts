export interface LearningSection {
  id: string;
  title: string;
  completed: boolean;
  exercises: number;
  completedExercises: number;
  type: "video" | "reading" | "practice" | "quiz";
  body?: string;
  checklist?: string[];
}

export interface LearningLessonContent {
  title: string;
  summary: string;
  licenseType: "skillbridge_original" | "official_reference" | "link_only";
  reusePolicy: "full_reuse_allowed" | "summary_only" | "link_only";
  sourceResourceIds: string[];
  sections: Array<{
    id: string;
    title: string;
    body: string;
    checklist: string[];
  }>;
  quiz: Array<{
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  }>;
  exercises: Array<{
    id: string;
    title: string;
    prompt: string;
    acceptanceCriteria: string[];
    proofOfCompletion: string;
  }>;
}

export interface LearningSession {
  id: string;
  moduleId: string;
  sessionNumber: number;
  title: string;
  skill: string;
  dayOfWeek: number;
  estimatedMinutes: number;
  status: "completed" | "in-progress" | "locked";
  stars: number;
  maxStars: number;
  sections: LearningSection[];
  lessonContent?: LearningLessonContent;
  resources: Array<{
    id: string;
    title: string;
    url: string;
    type: "youtube" | "article" | "course";
    duration?: string;
    platform?: string;
    isInternal?: boolean;
    lowConfidence?: boolean;
    sourceType?: string;
    outcomeType?: string;
    contentTemplateId?: string;
    description?: string;
    proofOfCompletion?: string;
    matchScore?: number;
    qualityScore?: number;
    freshnessScore?: number;
  }>;
  recommendedCourses?: Array<{
    id: string;
    title: string;
    url: string;
    provider?: string;
    duration?: string;
    isFree?: boolean;
    language?: string;
    difficulty?: string;
    rating?: number;
    skills?: Array<{ skill_canonical_name: string; teaches_level: number }>;
    matchScore?: number;
  }>;
}

export interface WeekPlan {
  weekNumber: number;
  moduleId: string;
  moduleTitle: string;
  sessions: LearningSession[];
}
