import type { LearningSection, LearningSession, WeekPlan } from "./types";

type ScrollableSectionElement = {
  scrollIntoView: (arg?: boolean | ScrollIntoViewOptions) => void;
};

type SectionDocument = {
  getElementById: (elementId: string) => ScrollableSectionElement | null;
};

export function getNextLearningSectionId(
  sections: LearningSection[],
  activeSectionId: string,
): string | undefined {
  const activeIndex = sections.findIndex((section) => section.id === activeSectionId);
  if (activeIndex < 0) return undefined;
  return sections[activeIndex + 1]?.id;
}

export function selectLearningSection(
  sectionId: string,
  onSelectSection: (id: string) => void,
  doc: SectionDocument | undefined = typeof document !== "undefined" ? document : undefined,
) {
  onSelectSection(sectionId);
  const element = doc?.getElementById(`section-${sectionId}`);
  if (element && typeof element.scrollIntoView === "function") {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

export function orderLearningSessions(weeks: WeekPlan[]): LearningSession[] {
  return [...weeks]
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .flatMap((week) =>
      [...week.sessions].sort(
        (a, b) =>
          a.sessionNumber - b.sessionNumber ||
          a.scheduledStartAt?.localeCompare(b.scheduledStartAt ?? "") ||
          a.id.localeCompare(b.id),
      ),
    );
}
