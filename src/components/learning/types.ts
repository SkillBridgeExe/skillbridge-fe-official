export interface LearningSection {
  id: string;
  title: string;
  completed: boolean;
  exercises: number;
  completedExercises: number;
  type: "video" | "reading" | "practice" | "quiz";
  body?: string;
  objectiveId?: string;
  checklist?: Array<{ id: string; label: string; objectiveId?: string }>;
}

export interface LearningObjective {
  id: string;
  title: string;
  description: string;
}

export interface LearningVideoChapter {
  id: string;
  title: string;
  startSeconds: number;
  objectiveId?: string;
}

export interface LearningLessonContent {
  title: string;
  summary: string;
  licenseType: "skillbridge_original" | "official_reference" | "link_only";
  reusePolicy: "full_reuse_allowed" | "summary_only" | "link_only";
  sourceResourceIds: string[];
  learningObjectives: LearningObjective[];
  sections: Array<{
    id: string;
    title: string;
    body: string;
    objectiveId?: string;
    checklist: Array<{ id: string; label: string; objectiveId?: string }>;
  }>;
  quiz: Array<{
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
    kind?: "concept" | "scenario" | "debug" | "mini_case";
    objectiveId?: string;
    sectionId?: string;
    remediation?: {
      sectionId?: string;
      videoResourceId?: string;
      videoChapterId?: string;
      startSeconds?: number;
    };
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
  /** Canonical skill name ("node_js") — the BE lesson/quiz lookup key. moduleId is its SLUG
   *  ("node-js") and must never be sent as skill_canonical: the BE dictionary lookup is exact,
   *  so every underscore skill 404s (live bug this field fixes). */
  skillCanonical?: string;
  sessionNumber: number;
  title: string;
  skill: string;
  dayOfWeek: number;
  estimatedMinutes: number;
  /** Exact persisted calendar occurrence. Legacy roadmaps may omit this field. */
  scheduledStartAt?: string;
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
    videoChapters?: LearningVideoChapter[];
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
    matchBreakdown?: {
      ratingPts: number;
      languagePts: number;
      freePts: number;
      levelFitPts: number;
      multiSkillPts: number;
    };
  }>;
}

export interface WeekPlan {
  weekNumber: number;
  moduleId: string;
  moduleTitle: string;
  sessions: LearningSession[];
}
