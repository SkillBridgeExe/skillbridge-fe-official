import type {
  LearningDisplayTranslationItem,
  LearningDisplayTranslationResult,
} from "@/services/learning-roadmaps-v2.service";
import type { LearningSession } from "./types";

const MAX_TRANSLATION_ITEMS = 50;

export function buildLearningDisplayTranslationItems(
  session: LearningSession,
): LearningDisplayTranslationItem[] {
  const items: LearningDisplayTranslationItem[] = [
    { id: "session", title: session.title },
    ...session.sections.map((section) => ({
      id: `section:${section.id}`,
      title: section.title,
      summary: section.body,
    })),
    ...session.resources.map((resource) => ({
      id: `resource:${resource.id}`,
      title: resource.title,
      description: resource.description,
    })),
  ];

  if (session.lessonContent) {
    items.push({
      id: "lesson",
      title: session.lessonContent.title,
      summary: session.lessonContent.summary,
    });
    items.push(
      ...session.lessonContent.learningObjectives.map((objective) => ({
        id: `objective:${objective.id}`,
        title: objective.title,
        description: objective.description,
      })),
      ...session.lessonContent.exercises.map((exercise) => ({
        id: `exercise:${exercise.id}`,
        title: exercise.title,
        summary: exercise.prompt,
        description: exercise.proofOfCompletion,
      })),
    );
  }

  return items
    .filter(hasDisplayText)
    .slice(0, MAX_TRANSLATION_ITEMS);
}

export function applyLearningDisplayTranslations(
  session: LearningSession,
  translations: LearningDisplayTranslationResult[],
): LearningSession {
  const byId = new Map(translations.map((item) => [item.id, item]));
  const sessionTranslation = byId.get("session");
  const lessonTranslation = byId.get("lesson");

  return {
    ...session,
    title: sessionTranslation?.title ?? session.title,
    sections: session.sections.map((section) => {
      const translated = byId.get(`section:${section.id}`);
      return {
        ...section,
        title: translated?.title ?? section.title,
        body: translated?.summary ?? section.body,
      };
    }),
    resources: session.resources.map((resource) => {
      const translated = byId.get(`resource:${resource.id}`);
      return {
        ...resource,
        title: translated?.title ?? resource.title,
        description: translated?.description ?? resource.description,
      };
    }),
    lessonContent: session.lessonContent
      ? {
          ...session.lessonContent,
          title: lessonTranslation?.title ?? session.lessonContent.title,
          summary:
            lessonTranslation?.summary ?? session.lessonContent.summary,
          sections: session.lessonContent.sections.map((section) => {
            const translated = byId.get(`section:${section.id}`);
            return {
              ...section,
              title: translated?.title ?? section.title,
              body: translated?.summary ?? section.body,
            };
          }),
          learningObjectives:
            session.lessonContent.learningObjectives.map((objective) => {
              const translated = byId.get(`objective:${objective.id}`);
              return {
                ...objective,
                title: translated?.title ?? objective.title,
                description:
                  translated?.description ?? objective.description,
              };
            }),
          exercises: session.lessonContent.exercises.map((exercise) => {
            const translated = byId.get(`exercise:${exercise.id}`);
            return {
              ...exercise,
              title: translated?.title ?? exercise.title,
              prompt: translated?.summary ?? exercise.prompt,
              proofOfCompletion:
                translated?.description ?? exercise.proofOfCompletion,
            };
          }),
        }
      : undefined,
  };
}

function hasDisplayText(item: LearningDisplayTranslationItem): boolean {
  return Boolean(
    item.title?.trim() ||
      item.description?.trim() ||
      item.reason?.trim() ||
      item.summary?.trim(),
  );
}
