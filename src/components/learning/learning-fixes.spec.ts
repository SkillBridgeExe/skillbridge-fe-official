import { describe, expect, it, vi, beforeEach } from "vitest";
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
    vi.clearAllMocks();
    vi.stubGlobal("window", { localStorage: localStorageMock });
    vi.stubGlobal("localStorage", localStorageMock);
  });

  const mockSession1: LearningSession = {
    id: "session-1",
    moduleId: "module-1",
    sessionNumber: 1,
    title: "Session 1",
    skill: "React",
    dayOfWeek: 0,
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
    dayOfWeek: 1,
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
      sessions: [mockSession1],
    },
    {
      weekNumber: 2,
      moduleId: "module-2",
      moduleTitle: "Module 2",
      sessions: [mockSession2],
    },
  ];

  describe("deriveSessionStatuses", () => {
    it("marks the first incomplete session as 'in-progress' and subsequent ones as 'locked'", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = deriveSessionStatuses(mockWeeks);

      expect(result[0].sessions[0].status).toBe("in-progress");
      expect(result[1].sessions[0].status).toBe("locked");
    });

    it("marks completed sessions as 'completed' and unlocks the next session as 'in-progress'", () => {
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
