import { httpClient } from "@/api/core/http-client";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { API_ROUTES } from "@/constants/api-routes";
import { hasApiAuthSession } from "@/services/auth-session.service";
import type { LearningRoadmap } from "@/types/user";
import type { LearningSession, WeekPlan } from "@/components/learning/types";
import type {
  GenerateRoadmapFromMatchRequest,
  AnswerLearningQuizQuestionRequest,
  LearningChatRequest,
  LearningChatResponse,
  LearningNextQuestionsResponseDto,
  LearningQuizAnswerResponseDto,
  LearningSessionProgressDto,
  PatchLearningChecklistItemRequest,
  RecommendedCourseDto,
  LearningResourceDto,
  LearningResourceSourceType,
  SkillBridgeLessonContentDto,
  NotFeasibleItemDto,
  RoadmapFromMatchResponse,
  UpsertLearningSessionProgressRequest,
} from "@shared/api";
import type { SessionProgressState } from "@/components/learning/session-progress";

export type RoadmapBudgetInput = GenerateRoadmapFromMatchRequest;
export type ComposedRoadmap = RoadmapFromMatchResponse;
export type ComposedRoadmapResource = LearningResourceDto;
export type NotFeasibleItem = NotFeasibleItemDto;

export const DEFAULT_ROADMAP_BUDGET: Required<RoadmapBudgetInput> = {
  available_days: 30,
  hours_per_week: 8,
  language_pref: "vi",
};

function requireSession(): void {
  if (!hasApiAuthSession()) {
    throw new Error(
      "Please sign in with a real account to generate a learning roadmap.",
    );
  }
}

export async function generateRoadmapFromMatch(
  matchId: string,
  body: RoadmapBudgetInput = DEFAULT_ROADMAP_BUDGET,
): Promise<ComposedRoadmap> {
  requireSession();
  const envelope = await unwrapEnvelope<ApiEnvelope<ComposedRoadmap>>(
    httpClient.post(API_ROUTES.CV_MATCHES.ROADMAP(matchId), body),
    "Failed to generate the learning roadmap.",
  );
  return envelope.data;
}

export async function sendLearningChatMessage(
  body: LearningChatRequest,
): Promise<LearningChatResponse> {
  requireSession();
  const envelope = await unwrapEnvelope<ApiEnvelope<LearningChatResponse>>(
    httpClient.post(API_ROUTES.LEARNING.CHAT, body),
    "Failed to send the learning chat message.",
  );
  return envelope.data;
}

export async function getLearningChatHistory(
  conversationId: string,
): Promise<LearningChatResponse> {
  requireSession();
  const envelope = await unwrapEnvelope<ApiEnvelope<LearningChatResponse>>(
    httpClient.get(API_ROUTES.LEARNING.CHAT_HISTORY(conversationId)),
    "Failed to load the learning chat history.",
  );
  return envelope.data;
}

function toSessionProgressState(dto: LearningSessionProgressDto): SessionProgressState {
  return {
    checkedChecklistItems: dto.checked_checklist_items ?? {},
    exerciseProofs: dto.exercise_proofs ?? {},
    quizAttempts: Object.fromEntries(
      Object.entries(dto.quiz_attempts ?? {}).map(([questionId, attempt]) => [
        questionId,
        {
          selectedOptionIndex: attempt.selected_option_index,
          isCorrect: attempt.is_correct,
          attemptCount: attempt.attempts,
          answeredAt: attempt.answered_at,
          lastAnsweredAt: attempt.last_answered_at,
        },
      ]),
    ),
  };
}

function toUpsertSessionProgressRequest(
  progress: SessionProgressState,
): UpsertLearningSessionProgressRequest {
  return {
    checked_checklist_items: progress.checkedChecklistItems,
    exercise_proofs: progress.exerciseProofs,
  };
}

export async function getLearningSessionProgress(sessionId: string): Promise<SessionProgressState> {
  requireSession();
  const envelope = await unwrapEnvelope<ApiEnvelope<LearningSessionProgressDto>>(
    httpClient.get(API_ROUTES.LEARNING.SESSION_PROGRESS(sessionId)),
    "Failed to load the learning session progress.",
  );
  return toSessionProgressState(envelope.data);
}

export async function saveLearningSessionProgress(
  sessionId: string,
  progress: SessionProgressState,
): Promise<SessionProgressState> {
  requireSession();
  const envelope = await unwrapEnvelope<ApiEnvelope<LearningSessionProgressDto>>(
    httpClient.put(
      API_ROUTES.LEARNING.SESSION_PROGRESS(sessionId),
      toUpsertSessionProgressRequest(progress),
    ),
    "Failed to save the learning session progress.",
  );
  return toSessionProgressState(envelope.data);
}

export async function answerLearningQuizQuestion(
  sessionId: string,
  body: AnswerLearningQuizQuestionRequest,
): Promise<LearningQuizAnswerResponseDto> {
  requireSession();
  const envelope = await unwrapEnvelope<ApiEnvelope<LearningQuizAnswerResponseDto>>(
    httpClient.post(API_ROUTES.LEARNING.QUIZ_ANSWER(sessionId), body),
    "Failed to score the quiz answer.",
  );
  return envelope.data;
}

export async function getLearningNextQuestions(
  sessionId: string,
  skillCanonical: string,
): Promise<LearningNextQuestionsResponseDto> {
  requireSession();
  const envelope = await unwrapEnvelope<ApiEnvelope<LearningNextQuestionsResponseDto>>(
    httpClient.get(API_ROUTES.LEARNING.NEXT_QUESTIONS(sessionId, skillCanonical)),
    "Failed to load the next quiz questions.",
  );
  return envelope.data;
}

export async function patchLearningChecklistItem(
  sessionId: string,
  itemId: string,
  body: PatchLearningChecklistItemRequest,
): Promise<SessionProgressState> {
  requireSession();
  const envelope = await unwrapEnvelope<ApiEnvelope<LearningSessionProgressDto>>(
    httpClient.put(API_ROUTES.LEARNING.CHECKLIST_ITEM(sessionId, itemId), body),
    "Failed to update the checklist item.",
  );
  return toSessionProgressState(envelope.data);
}

function formatHours(minutes: number): string {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function strategyLabel(strategy: "deep_build" | "crash_prep"): string {
  return strategy === "deep_build" ? "Deep build" : "Crash prep";
}

function sourcePlatform(resource: LearningResourceDto): string {
  if (resource.is_internal) return "Internal";
  const labels: Record<LearningResourceSourceType, string> = {
    course: "Course",
    official_doc: "Official doc",
    video: "Video",
    exercise: "Exercise",
    mini_project: "Mini project",
    interview_drill: "Interview drill",
    cv_fix_task: "CV fix task",
  };
  return labels[resource.source_type];
}

function sourceTypeToUiType(
  sourceType: LearningResourceSourceType,
): "youtube" | "article" | "course" {
  if (sourceType === "video") return "youtube";
  if (sourceType === "official_doc") return "article";
  return "course";
}

function toSessionResource(resource: LearningResourceDto) {
  return {
    id: resource.id,
    title: resource.title,
    url: resource.url ?? "",
    type: sourceTypeToUiType(resource.source_type),
    duration: formatHours(resource.duration_minutes),
    platform: sourcePlatform(resource),
    isInternal: resource.is_internal,
    lowConfidence: resource.low_confidence,
    sourceType: resource.source_type,
    outcomeType: resource.outcome_type,
    contentTemplateId: resource.content_template_id,
    description: resource.description,
    proofOfCompletion: resource.proof_of_completion,
    matchScore: resource.match_score,
    qualityScore: resource.quality_score,
    freshnessScore: resource.freshness_score,
    videoChapters: resource.video_chapters?.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      startSeconds: chapter.start_seconds,
      objectiveId: chapter.objective_id,
    })),
  };
}

function toModuleResource(resource: LearningResourceDto) {
  return toSessionResource(resource);
}

function toRecommendedCourse(course: RecommendedCourseDto) {
  return {
    id: course.id,
    title: course.title,
    url: course.url ?? "",
    provider: course.provider,
    duration:
      typeof course.duration_minutes === "number"
        ? formatHours(course.duration_minutes)
        : undefined,
    isFree: course.is_free,
    language: course.language,
    difficulty: course.difficulty,
    rating: course.rating,
    skills: course.skills,
    matchScore: course.match_score,
    matchBreakdown: course.match_breakdown
      ? {
          ratingPts: course.match_breakdown.rating_pts,
          languagePts: course.match_breakdown.language_pts,
          freePts: course.match_breakdown.free_pts,
          levelFitPts: course.match_breakdown.level_fit_pts,
          multiSkillPts: course.match_breakdown.multi_skill_pts,
        }
      : undefined,
  };
}

function toLessonContent(lesson: SkillBridgeLessonContentDto) {
  const quiz = lesson.quiz_bank ?? lesson.quiz;
  return {
    title: lesson.title,
    summary: lesson.summary,
    licenseType: lesson.license_type,
    reusePolicy: lesson.reuse_policy,
    sourceResourceIds: lesson.source_resource_ids,
    learningObjectives: (lesson.learning_objectives ?? []).map((objective) => ({
      id: objective.id,
      title: objective.title,
      description: objective.description,
    })),
    sections: lesson.sections.map((section) => ({
      id: section.id,
      title: section.title,
      body: section.body,
      objectiveId: section.objective_id,
      checklist: section.checklist.map((item, index) =>
        typeof item === "string"
          ? { id: `${section.id}-${index + 1}`, label: item, objectiveId: section.objective_id }
          : { id: item.id, label: item.label, objectiveId: item.objective_id },
      ),
    })),
    quiz: quiz.map((question) => ({
      id: question.id,
      question: question.question,
      options: question.options,
      correctOptionIndex: question.correct_option_index,
      explanation: question.explanation,
      kind: question.kind,
      objectiveId: question.objective_id,
      sectionId: question.section_id,
      remediation: question.remediation
        ? {
            sectionId: question.remediation.section_id,
            videoResourceId: question.remediation.video_resource_id,
            videoChapterId: question.remediation.video_chapter_id,
            startSeconds: question.remediation.start_seconds,
          }
        : undefined,
    })),
    exercises: lesson.exercises.map((exercise) => ({
      id: exercise.id,
      title: exercise.title,
      prompt: exercise.prompt,
      acceptanceCriteria: exercise.acceptance_criteria,
      proofOfCompletion: exercise.proof_of_completion,
    })),
  };
}

function hasRenderableLearningContent(
  step: ComposedRoadmap["steps"][number],
): boolean {
  return Boolean(
    step.lesson_content ||
      step.resources.length > 0 ||
      (step.recommended_courses?.length ?? 0) > 0,
  );
}

function isPlaceholderSession(session: LearningSession): boolean {
  return (
    !session.lessonContent &&
    session.resources.length === 0 &&
    (session.recommendedCourses?.length ?? 0) === 0 &&
    session.sections.length === 1 &&
    session.sections[0]?.title === "No mapped learning resources yet"
  );
}

export function sanitizeWeekPlans(plans: WeekPlan[]): WeekPlan[] {
  return plans
    .map((week) => ({
      ...week,
      sessions: week.sessions.filter((session) => !isPlaceholderSession(session)),
    }))
    .filter((week) => week.sessions.length > 0);
}

// NOTE (cross-repo contract): the BE maps learning mastery back to skills by re-slugging
// canonicals and matching the `roadmap-${moduleId}` session ids this file creates
// (skillbridge-ai src/platform/learning/mastered-skills.ts). Changing this slug or the
// `roadmap-` prefix silently breaks `learning_completed` on the progress report.
function slugPart(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function roadmapToLearningRoadmap(roadmap: ComposedRoadmap): LearningRoadmap {
  const sortedSteps = [...roadmap.steps]
    .filter(hasRenderableLearningContent)
    .sort((a, b) => b.priority - a.priority);

  return {
    totalHours: roadmap.budget_hours,
    estimatedCompletionWeeks: Math.max(1, Math.ceil(roadmap.budget_hours / 8)),
    modules: sortedSteps.map((step, index) => ({
      id: step.skill_canonical,
      title: step.display_name,
      description: `${strategyLabel(step.strategy)} - ${step.estimated_hours}h`,
      status: index === 0 ? "in-progress" : "locked",
      weekNumber: index + 1,
      estimatedHours: step.estimated_hours,
      topics: step.resources.slice(0, 4).map((resource) => ({
        title: resource.title,
        completed: false,
      })),
      resources: step.resources.map(toModuleResource),
    })),
  };
}

export function roadmapToWeekPlans(roadmap: ComposedRoadmap): WeekPlan[] {
  const sortedSteps = [...roadmap.steps]
    .filter(hasRenderableLearningContent)
    .sort((a, b) => b.priority - a.priority);
  const daySpread = [1, 2, 3, 4, 5];

  return sortedSteps.map((step, index) => {
    const moduleId = slugPart(step.skill_canonical, `step-${index + 1}`);
    const resources = step.resources.map(toSessionResource);
    const lessonContent = step.lesson_content ? toLessonContent(step.lesson_content) : undefined;

    return {
      weekNumber: index + 1,
      moduleId,
      moduleTitle: step.display_name,
      sessions: [
        {
          id: `roadmap-${moduleId}`,
          moduleId,
          skillCanonical: step.skill_canonical,
          sessionNumber: index + 1,
          title: `${step.display_name} - ${strategyLabel(step.strategy)}`,
          skill: step.display_name,
          dayOfWeek: daySpread[index % daySpread.length],
          estimatedMinutes: Math.max(30, Math.round(step.estimated_hours * 60)),
          status: index === 0 ? "in-progress" : "locked",
          stars: 0,
          maxStars: 5,
          sections: [
            ...(lessonContent
              ? lessonContent.sections.map((section) => ({
                  id: section.id,
                  title: section.title,
                  completed: false,
                  exercises: lessonContent.exercises.length,
                  completedExercises: 0,
                  type: "reading" as const,
                  body: section.body,
                  checklist: section.checklist,
                  objectiveId: section.objectiveId,
                }))
              : step.resources.length
                ? step.resources.map((resource) => ({
                  id: resource.id,
                  title: resource.title,
                  completed: false,
                  exercises: 1,
                  completedExercises: 0,
                  type:
                    resource.source_type === "video"
                      ? ("video" as const)
                      : resource.source_type === "official_doc"
                        ? ("reading" as const)
                        : ("practice" as const),
                  }))
                : (step.recommended_courses ?? []).map((course) => ({
                  id: course.id,
                  title: course.title,
                  completed: false,
                  exercises: 1,
                  completedExercises: 0,
                  type: "practice" as const,
                }))),
            ...(lessonContent
              ? resources
                  .filter((r) => r.sourceType === "video")
                  .map((resource) => ({
                    id: resource.id,
                    title: resource.title,
                    completed: false,
                    exercises: 0,
                    completedExercises: 0,
                    type: "video" as const,
                  }))
              : []),
          ],
          lessonContent,
          resources,
          recommendedCourses: step.recommended_courses?.map(toRecommendedCourse) ?? [],
        },
      ],
    };
  });
}
