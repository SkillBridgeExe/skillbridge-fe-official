import type { LearningSession } from "./types";

type SessionResource = LearningSession["resources"][number];

function normalizeTitle(value?: string) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

export function getActiveSessionResource(
  session: LearningSession,
  activeSectionId: string,
): SessionResource | undefined {
  const activeIndex = session.sections.findIndex((section) => section.id === activeSectionId);
  const activeSection = activeIndex >= 0 ? session.sections[activeIndex] : session.sections[0];
  if (!activeSection) return undefined;

  const byId = session.resources.find((resource) => resource.id === activeSection.id);
  if (byId) return byId;

  const activeTitle = normalizeTitle(activeSection.title);
  const byTitle = session.resources.find((resource) => normalizeTitle(resource.title) === activeTitle);
  if (byTitle) return byTitle;

  if (!session.lessonContent && activeIndex >= 0) {
    return session.resources[activeIndex];
  }

  return undefined;
}
