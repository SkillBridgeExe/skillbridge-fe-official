import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient } from "@/api/core/http-client";
import type {
  LearningLessonContent,
  LearningSection,
  WeekPlan,
} from "@/components/learning/types";
import { API_ROUTES } from "@/constants/api-routes";
import { hasApiAuthSession } from "@/services/auth-session.service";
import {
  toLessonContent,
  toSessionResource,
} from "@/services/learning-roadmap.service";
import type {
  LearningResourceDto,
  SkillBridgeLessonContentDto,
} from "@shared/api";
import type { LearningRoadmap } from "@/types/user";

export type LearningRoadmapIntent = "JD_APPLICATION" | "CAREER_ROLE";
export type LearningLanguagePreference = "vi" | "en" | "both";

export interface LearningCandidateSkill {
  skill_canonical: string;
  display_name: string;
  system_priority: number;
  rationale: string;
  prerequisites: string[];
}

export interface LearningScheduleDraft {
  timezone: string;
  deadline: string;
  session_minutes: 30 | 45 | 60 | 90;
  slots: Array<{
    iso_weekday: number;
    start_time: string;
    duration_minutes: number;
  }>;
}

export interface LearningRoadmapDraft {
  id: string;
  intent: LearningRoadmapIntent;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  revision: number;
  cv_match_id: string | null;
  cv_id: string | null;
  target_role: string | null;
  target_level: string | null;
  language_pref: LearningLanguagePreference;
  candidate_skills: LearningCandidateSkill[];
  selected_priorities: Array<{ skill_canonical: string; rank: number }>;
  schedule: LearningScheduleDraft | null;
}

export type CreateLearningRoadmapDraftRequest =
  | {
      intent: "JD_APPLICATION";
      cv_match_id: string;
      language_pref: LearningLanguagePreference;
    }
  | {
      intent: "CAREER_ROLE";
      cv_id: string;
      target_role: string;
      target_level: "intern" | "fresher" | "mid";
      language_pref: LearningLanguagePreference;
    };

export interface UpdateLearningRoadmapDraftRequest {
  expected_revision: number;
  language_pref?: LearningLanguagePreference;
  selected_priorities?: Array<{ skill_canonical: string; rank: number }>;
  schedule?: LearningScheduleDraft;
}

export interface LearningRoadmapPreview {
  roadmap_id: string;
  revision: number;
  target_role: string | null;
  summary: string;
  capacity_minutes: number;
  scheduled_minutes: number;
  modules: Array<{
    skill_canonical: string;
    display_name: string;
    rank: number;
    estimated_minutes: number;
    feasibility: "FEASIBLE" | "DEFERRED";
    resources: LearningResourceDto[];
    lesson_content: SkillBridgeLessonContentDto | null;
  }>;
  sessions: Array<{
    skill_canonical: string;
    sequence: number;
    scheduled_start_at: string;
    duration_minutes: number;
  }>;
  deferred: Array<{ skill_canonical: string; remaining_minutes: number }>;
}

interface PersistedTask {
  type: "study" | "resources" | "lesson" | "evidence";
  items?: LearningResourceDto[];
  content?: SkillBridgeLessonContentDto;
}

export interface ActiveLearningRoadmap {
  id: string;
  intent: LearningRoadmapIntent;
  status: "ACTIVE";
  revision: number;
  target_role: string | null;
  target_level: string | null;
  version: {
    id: string;
    version_no: number;
    resource_catalog_version: string;
    content_version: string;
    created_at: string;
  };
  modules: Array<{
    id: string;
    skill_canonical: string;
    display_name: string;
    rank: number;
    estimated_minutes: number;
    feasibility: "FEASIBLE" | "DEFERRED";
    sessions: Array<{
      id: string;
      sequence: number;
      title: string;
      scheduled_start_at: string;
      duration_minutes: number;
      required_tasks: PersistedTask[];
    }>;
  }>;
}

export interface GeneratedLearningRoadmap extends LearningRoadmapPreview {
  version_id: string;
  status: "ACTIVE";
}

function requireSession(): void {
  if (!hasApiAuthSession())
    throw new Error("Please sign in to manage a learning roadmap.");
}

async function unwrap<T>(
  request: Promise<unknown>,
  fallback: string,
): Promise<T> {
  const envelope = await unwrapEnvelope<ApiEnvelope<T>>(
    request as never,
    fallback,
  );
  return envelope.data;
}

export function createLearningRoadmapDraft(
  body: CreateLearningRoadmapDraftRequest,
): Promise<LearningRoadmapDraft> {
  requireSession();
  return unwrap(
    httpClient.post(API_ROUTES.LEARNING.ROADMAPS, body),
    "Failed to create the learning roadmap draft.",
  );
}

export function updateLearningRoadmapDraft(
  roadmapId: string,
  body: UpdateLearningRoadmapDraftRequest,
): Promise<LearningRoadmapDraft> {
  requireSession();
  return unwrap(
    httpClient.patch(API_ROUTES.LEARNING.ROADMAP_DRAFT(roadmapId), body),
    "Failed to save the learning roadmap draft.",
  );
}

export function previewLearningRoadmap(
  roadmapId: string,
  expectedRevision: number,
): Promise<LearningRoadmapPreview> {
  requireSession();
  return unwrap(
    httpClient.post(API_ROUTES.LEARNING.ROADMAP_PREVIEW(roadmapId), {
      expected_revision: expectedRevision,
    }),
    "Failed to preview the learning roadmap.",
  );
}

export function generateLearningRoadmap(
  roadmapId: string,
  expectedRevision: number,
): Promise<GeneratedLearningRoadmap> {
  requireSession();
  return unwrap(
    httpClient.post(API_ROUTES.LEARNING.ROADMAP_GENERATE(roadmapId), {
      expected_revision: expectedRevision,
    }),
    "Failed to generate the learning roadmap.",
  );
}

export function getActiveLearningRoadmap(
  roadmapId: string,
): Promise<ActiveLearningRoadmap> {
  requireSession();
  return unwrap(
    httpClient.get(API_ROUTES.LEARNING.ROADMAP(roadmapId)),
    "Failed to load the active learning roadmap.",
  );
}

export function listLearningRoadmaps(): Promise<LearningRoadmapDraft[]> {
  requireSession();
  return unwrap(
    httpClient.get(API_ROUTES.LEARNING.ROADMAPS),
    "Failed to load your learning roadmaps.",
  );
}

export function roadmapV2ToWeekPlans(
  roadmap: ActiveLearningRoadmap,
): WeekPlan[] {
  return [...roadmap.modules]
    .sort((a, b) => a.rank - b.rank)
    .map((module) => ({
      weekNumber: module.rank,
      moduleId: module.id,
      moduleTitle: module.display_name,
      sessions: [...module.sessions]
        .sort(
          (a, b) =>
            Date.parse(a.scheduled_start_at) -
              Date.parse(b.scheduled_start_at) || a.sequence - b.sequence,
        )
        .map((session, index) => {
          const resourcesTask = session.required_tasks.find(
            (task) => task.type === "resources",
          );
          const lessonTask = session.required_tasks.find(
            (task) => task.type === "lesson",
          );
          const resources = (resourcesTask?.items ?? []).map(toSessionResource);
          const lessonContent = lessonTask?.content
            ? toLessonContent(lessonTask.content)
            : undefined;
          return {
            id: session.id,
            moduleId: module.id,
            skillCanonical: module.skill_canonical,
            sessionNumber: session.sequence,
            title: session.title,
            skill: module.display_name,
            dayOfWeek: toIsoWeekday(
              new Date(session.scheduled_start_at).getDay(),
            ),
            scheduledStartAt: session.scheduled_start_at,
            estimatedMinutes: session.duration_minutes,
            status: module.rank === 1 && index === 0 ? "in-progress" : "locked",
            stars: 0,
            maxStars: 5,
            sections: toSections(lessonContent, resources),
            lessonContent,
            resources,
            recommendedCourses: [],
          };
        }),
    }));
}

export function roadmapV2ToLearningRoadmap(
  roadmap: ActiveLearningRoadmap,
): LearningRoadmap {
  const modules = [...roadmap.modules]
    .sort((a, b) => a.rank - b.rank)
    .map((module, index) => {
      const resourceTasks = module.sessions.flatMap((session) =>
        session.required_tasks.filter((task) => task.type === "resources"),
      );
      const resources = resourceTasks
        .flatMap((task) => task.items ?? [])
        .map(toSessionResource);
      return {
        id: module.id,
        title: module.display_name,
        description:
          module.feasibility === "FEASIBLE"
            ? `${module.estimated_minutes} minutes scheduled`
            : `${module.estimated_minutes} minutes · needs more availability`,
        status: index === 0 ? ("in-progress" as const) : ("locked" as const),
        weekNumber: module.rank,
        estimatedHours: module.estimated_minutes / 60,
        topics: resources.slice(0, 4).map((resource) => ({
          title: resource.title,
          completed: false,
        })),
        resources,
      };
    });
  const totalMinutes = roadmap.modules.reduce(
    (total, module) => total + module.estimated_minutes,
    0,
  );
  return {
    modules,
    estimatedCompletionWeeks: Math.max(1, roadmap.modules.length),
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
  };
}

function toIsoWeekday(jsWeekday: number): number {
  return jsWeekday === 0 ? 7 : jsWeekday;
}

function toSections(
  lesson: LearningLessonContent | undefined,
  resources: ReturnType<typeof toSessionResource>[],
): LearningSection[] {
  if (lesson) {
    return lesson.sections.map((section) => ({
      id: section.id,
      title: section.title,
      completed: false,
      exercises: lesson.exercises.length,
      completedExercises: 0,
      type: "reading",
      body: section.body,
      objectiveId: section.objectiveId,
      checklist: section.checklist,
    }));
  }
  return resources.map((resource) => ({
    id: resource.id,
    title: resource.title,
    completed: false,
    exercises: 1,
    completedExercises: 0,
    type: resource.sourceType === "video" ? "video" : "reading",
  }));
}
