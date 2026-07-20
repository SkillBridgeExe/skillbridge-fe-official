import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deriveSessionStatuses,
  isSessionCompleted,
  type SessionProgressState,
} from "./session-progress";
import type { WeekPlan, LearningSession } from "./types";

describe("Learning roadmap fixes", () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T09:00:00+07:00"));
    vi.clearAllMocks();
    vi.stubGlobal("window", { localStorage: localStorageMock });
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockSession1: LearningSession = {
    id: "session-1",
    moduleId: "module-1",
    sessionNumber: 1,
    title: "Session 1",
    skill: "React",
    dayOfWeek: 2,
    estimatedMinutes: 60,
    status: "locked",
    stars: 0,
    maxStars: 3,
    sections: [
      {
        id: "sec-1",
        title: "Section 1",
        completed: false,
        exercises: 0,
        completedExercises: 0,
        type: "reading",
      },
    ],
    resources: [],
  };

  const mockSession2: LearningSession = {
    id: "session-2",
    moduleId: "module-2",
    sessionNumber: 2,
    title: "Session 2",
    skill: "React",
    dayOfWeek: 2,
    estimatedMinutes: 60,
    status: "locked",
    stars: 0,
    maxStars: 3,
    sections: [
      {
        id: "sec-2",
        title: "Section 2",
        completed: false,
        exercises: 0,
        completedExercises: 0,
        type: "reading",
      },
    ],
    resources: [],
  };

  const mockWeeks: WeekPlan[] = [
    {
      weekNumber: 1,
      moduleId: "module-1",
      moduleTitle: "Module 1",
      sessions: [mockSession1, mockSession2],
    },
  ];

  describe("deriveSessionStatuses", () => {
    it("opens all incomplete sessions scheduled for today", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = deriveSessionStatuses(mockWeeks);

      expect(result[0].sessions[0].status).toBe("in-progress");
      expect(result[0].sessions[1].status).toBe("in-progress");
    });

    it("marks completed sessions as 'completed' and keeps today's remaining sessions open", () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key.includes("session-1")) {
          return JSON.stringify({
            checkedChecklistItems: {
              __session: ["completed"],
            },
          });
        }
        return null;
      });

      const result = deriveSessionStatuses(mockWeeks);

      expect(result[0].sessions[0].status).toBe("completed");
      expect(result[0].sessions[1].status).toBe("in-progress");
    });

    it("opens past and current-day sessions across parallel lanes", () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key.includes("kotlin-day-1")) {
          return JSON.stringify({
            checkedChecklistItems: {
              __session: ["completed"],
            },
          });
        }
        return null;
      });

      const weeks: WeekPlan[] = [
        {
          weekNumber: 1,
          moduleId: "parallel",
          moduleTitle: "Parallel study",
          sessions: [
            { ...mockSession1, id: "swift-day-1", skill: "Swift", laneIndex: 0, dayOfWeek: 1 },
            { ...mockSession2, id: "kotlin-day-1", skill: "Kotlin", laneIndex: 1, dayOfWeek: 1 },
            { ...mockSession1, id: "swift-day-2", skill: "Swift", laneIndex: 0, dayOfWeek: 2 },
            { ...mockSession2, id: "java-day-2", skill: "Java", laneIndex: 1, dayOfWeek: 2 },
          ],
        },
      ];

      const result = deriveSessionStatuses(weeks);
      const statuses = Object.fromEntries(
        result[0].sessions.map((session) => [session.id, session.status]),
      );

      expect(statuses["swift-day-1"]).toBe("in-progress");
      expect(statuses["kotlin-day-1"]).toBe("completed");
      expect(statuses["swift-day-2"]).toBe("in-progress");
      expect(statuses["java-day-2"]).toBe("in-progress");
    });

    it("keeps future sessions in the open week locked", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const weeks: WeekPlan[] = [
        {
          weekNumber: 1,
          moduleId: "typescript",
          moduleTitle: "TypeScript",
          sessions: [
            { ...mockSession1, id: "typescript-monday", dayOfWeek: 1 },
            { ...mockSession2, id: "typescript-friday", dayOfWeek: 5 },
          ],
        },
      ];

      const result = deriveSessionStatuses(weeks);

      expect(result[0].sessions[0].status).toBe("in-progress");
      expect(result[0].sessions[1].status).toBe("locked");
    });

    it("unlocks sessions from the saved roadmap start date instead of the current weekday when provided", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const weeks: WeekPlan[] = [
        {
          weekNumber: 1,
          moduleId: "typescript",
          moduleTitle: "TypeScript",
          sessions: [
            { ...mockSession1, id: "typescript-start-day", dayOfWeek: 2 },
            { ...mockSession2, id: "typescript-next-day", dayOfWeek: 3 },
          ],
        },
      ];

      const result = deriveSessionStatuses(weeks, "2026-07-14");

      expect(result[0].sessions[0].status).toBe("in-progress");
      expect(result[0].sessions[1].status).toBe("locked");
    });

    it("opens week 2 when the previous lane session is completed", () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key.includes("react-week-1")) {
          return JSON.stringify({
            checkedChecklistItems: {
              __session: ["completed"],
            },
          });
        }
        return null;
      });

      const weeks: WeekPlan[] = [
        {
          weekNumber: 1,
          moduleId: "react",
          moduleTitle: "React",
          sessions: [
            { ...mockSession1, id: "react-week-1", laneIndex: 0, dayOfWeek: 5 },
          ],
        },
        {
          weekNumber: 2,
          moduleId: "react",
          moduleTitle: "React",
          sessions: [
            { ...mockSession2, id: "react-week-2", laneIndex: 0, dayOfWeek: 1 },
          ],
        },
      ];

      const result = deriveSessionStatuses(weeks);

      expect(result[0].sessions[0].status).toBe("completed");
      expect(result[1].sessions[0].status).toBe("in-progress");
    });
  });

  describe("isSessionCompleted", () => {
    it("returns true when '__session' contains 'completed'", () => {
      const progress: SessionProgressState = {
        checkedChecklistItems: {
          __session: ["completed"],
        },
        exerciseProofs: {},
      };
      const result = isSessionCompleted(mockSession1, progress);
      expect(result).toBe(true);
    });

    it("returns false when session progress is incomplete", () => {
      const progress: SessionProgressState = {
        checkedChecklistItems: {
          "sec-1": [],
        },
        exerciseProofs: {},
      };
      const result = isSessionCompleted(mockSession1, progress);
      expect(result).toBe(false);
    });
  });
});
