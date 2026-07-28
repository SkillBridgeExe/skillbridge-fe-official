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
export type LearningTrack = "FAST_TRACK" | "FOUNDATION";
export type LearningContentSource =
  | "DETERMINISTIC"
  | "AI_ENHANCED"
  | "DETERMINISTIC_FALLBACK";

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

export interface LearningCadenceDraft {
  timezone: string;
  start_date: string;
  study_days_per_week: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  session_minutes: 30 | 45 | 60 | 90;
}

export interface LearningProjection {
  start_date: string;
  estimated_completion_date: string | null;
  study_days_per_week: number;
  session_minutes: number;
  total_units: number;
  completed_units: number;
  planned_units_by_today: number;
  missed_units: number;
  pace_percentage: number;
  days_remaining: number;
}

export interface LearningPresentedResource extends LearningResourceDto {
  provider?: string;
  language?: string;
  validation_status?: "verified" | "pending" | "rejected";
  resource_role?: "PRIMARY" | "SUPPLEMENTARY";
  duration_kind?: "EXACT" | "ESTIMATED" | "UNKNOWN";
  language_verification?:
    | "AUDIO_METADATA"
    | "PUBLISHER_METADATA"
    | "MANUAL"
    | "UNKNOWN";
  recommended_minutes?: number;
  recommended_segment?: {
    label: string;
    chapter_ids: string[];
    start_seconds: number;
  };
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
  selected_resources: Record<string, string[]>;
  cadence: LearningCadenceDraft | null;
  schedule: LearningScheduleDraft | null;
}

export type CreateLearningRoadmapDraftRequest =
  | {
      intent: "JD_APPLICATION";
      cv_match_id: string;
      language_pref?: LearningLanguagePreference;
    }
  | {
      intent: "CAREER_ROLE";
      cv_id: string;
      target_role: string;
      target_level: "intern" | "fresher" | "mid";
      language_pref?: LearningLanguagePreference;
    };

export interface UpdateLearningRoadmapDraftRequest {
  expected_revision: number;
  language_pref?: LearningLanguagePreference;
  selected_priorities?: Array<{ skill_canonical: string; rank: number }>;
  selected_resources?: Record<string, string[]>;
  cadence?: LearningCadenceDraft;
  schedule?: LearningScheduleDraft;
}

export interface LearningRoadmapPreview {
  roadmap_id: string;
  revision: number;
  target_role: string | null;
  summary: string;
  learning_track: LearningTrack;
  content_source: LearningContentSource;
  capacity_minutes: number;
  scheduled_minutes: number;
  coverage_percentage: number;
  cadence: LearningCadenceDraft;
  estimated_completion_date: string | null;
  modules: Array<{
    skill_canonical: string;
    display_name: string;
    rank: number;
    estimated_minutes: number;
    feasibility: "FEASIBLE" | "DEFERRED";
    resources: LearningPresentedResource[];
    lesson_content: SkillBridgeLessonContentDto | null;
    quick_win_score: number;
    scope_status: "FULL" | "CORE_ONLY" | "INTRO_ONLY" | "DEFERRED";
    prerequisite_warnings: string[];
    lessons: Array<{
      id: string;
      title: string;
      summary: string;
      key_points: string[];
      estimated_minutes: number;
      importance: "CORE" | "EXTENSION";
      kind: "LEARN" | "PRACTICE";
      scope_status: "INCLUDED" | "OMITTED";
      omission_reason?: "TIME_LIMIT" | "PREREQUISITE" | "LOWER_PRIORITY";
      content_source: LearningContentSource;
    }>;
  }>;
  sessions: Array<{
    skill_canonical: string;
    sequence: number;
    scheduled_start_at: string;
    duration_minutes: number;
    lesson_ids: string[];
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
  learning_track: LearningTrack;
  content_source: LearningContentSource;
  coverage_percentage: number;
  projection: LearningProjection;
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
    prerequisite_warnings: string[];
    sessions: Array<{
      id: string;
      sequence: number;
      title: string;
      scheduled_start_at: string;
      duration_minutes: number;
      status: "COMPLETED" | "AVAILABLE";
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

export function getCurrentActiveLearningRoadmap(): Promise<ActiveLearningRoadmap | null> {
  requireSession();
  return unwrap(
    httpClient.get(API_ROUTES.LEARNING.ACTIVE_ROADMAP),
    "Failed to load the active learning roadmap.",
  );
}

export async function hydrateActiveLearningRoadmap(
  load: () => Promise<ActiveLearningRoadmap | null>,
  setActive: (roadmap: ActiveLearningRoadmap) => void,
  clear: () => void,
): Promise<ActiveLearningRoadmap | null> {
  const roadmap = await load();
  if (roadmap) setActive(roadmap);
  else clear();
  return roadmap;
}

export function listLearningRoadmaps(): Promise<LearningRoadmapDraft[]> {
  requireSession();
  return unwrap(
    httpClient.get(API_ROUTES.LEARNING.ROADMAPS),
    "Failed to load your learning roadmaps.",
  );
}

export function archiveActiveLearningRoadmap(): Promise<{ archived: number }> {
  requireSession();
  return unwrap(
    httpClient.delete(API_ROUTES.LEARNING.ACTIVE_ROADMAP),
    "Failed to archive the active learning roadmap.",
  );
}

export interface RescheduleLearningRoadmapRequest {
  expected_revision: number;
  start_date: string;
  study_days_per_week: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  session_minutes?: 30 | 45 | 60 | 90;
}

export function rescheduleLearningRoadmap(
  roadmapId: string,
  body: RescheduleLearningRoadmapRequest,
): Promise<ActiveLearningRoadmap> {
  requireSession();
  return unwrap(
    httpClient.post(API_ROUTES.LEARNING.ROADMAP_RESCHEDULE(roadmapId), body),
    "Failed to reschedule the learning roadmap.",
  );
}

export interface LearningDisplayTranslationItem {
  id: string;
  title?: string;
  description?: string;
  reason?: string;
  summary?: string;
}

export interface TranslateLearningDisplayRequest {
  locale: "vi" | "en";
  items: LearningDisplayTranslationItem[];
}

export type LearningDisplayTranslationResult =
  LearningDisplayTranslationItem & { locale: "vi" | "en" };

export function translateLearningDisplay(
  body: TranslateLearningDisplayRequest,
): Promise<LearningDisplayTranslationResult[]> {
  requireSession();
  return unwrap(
    httpClient.post(API_ROUTES.LEARNING.TRANSLATE_DISPLAY, body),
    "Failed to translate the learning content.",
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
            a.sequence - b.sequence ||
            Date.parse(a.scheduled_start_at) -
              Date.parse(b.scheduled_start_at),
        )
        .map((session) => {
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
            status:
              session.status === "COMPLETED"
                ? "completed"
                : "in-progress",
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
    .map((module) => {
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
        status:
          module.sessions.length > 0 &&
          module.sessions.every((session) => session.status === "COMPLETED")
            ? ("completed" as const)
            : ("in-progress" as const),
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
    estimatedCompletionWeeks: estimateCompletionWeeks(roadmap),
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
  };
}

function estimateCompletionWeeks(roadmap: ActiveLearningRoadmap): number {
  const dates = roadmap.modules.flatMap((module) =>
    module.sessions.map((session) => Date.parse(session.scheduled_start_at)),
  );
  if (dates.length < 2) return 1;
  const first = Math.min(...dates);
  const last = Math.max(...dates);
  return Math.max(1, Math.ceil((last - first + 86_400_000) / (7 * 86_400_000)));
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
