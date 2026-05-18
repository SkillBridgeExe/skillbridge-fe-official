import type { LearningRoadmap } from "@/types/user";

// Extended types for richer session data
export interface LearningSection {
  id: string;
  title: string;
  completed: boolean;
  exercises: number;
  completedExercises: number;
  type: "video" | "reading" | "practice" | "quiz";
}

export interface LearningSession {
  id: string;
  moduleId: string;
  sessionNumber: number;
  title: string;
  skill: string; // e.g. "Reading", "Writing", "TypeScript"
  dayOfWeek: number; // 0=Mon .. 6=Sun (within the week)
  estimatedMinutes: number;
  status: "completed" | "in-progress" | "locked";
  stars: number; // 0-5
  maxStars: number;
  sections: LearningSection[];
  resources: Array<{
    title: string;
    url: string;
    type: "youtube" | "article" | "course";
    duration?: string;
    platform?: string;
  }>;
}

export interface WeekPlan {
  weekNumber: number;
  moduleId: string;
  moduleTitle: string;
  sessions: LearningSession[];
}

export const DEMO_WEEKS: WeekPlan[] = [
  {
    weekNumber: 1,
    moduleId: "demo-1",
    moduleTitle: "Advanced TypeScript Patterns",
    sessions: [
      {
        id: "s1-1",
        moduleId: "demo-1",
        sessionNumber: 1,
        title: "Generics & Constraints",
        skill: "TypeScript",
        dayOfWeek: 1, // Tuesday
        estimatedMinutes: 90,
        status: "completed",
        stars: 3,
        maxStars: 5,
        sections: [
          { id: "s1-1-a", title: "Section 1: Introduction to Generics", completed: true, exercises: 5, completedExercises: 5, type: "reading" },
          { id: "s1-1-b", title: "Section 2: Generic Functions", completed: true, exercises: 8, completedExercises: 8, type: "practice" },
          { id: "s1-1-c", title: "Section 3: Generic Constraints", completed: true, exercises: 6, completedExercises: 6, type: "practice" },
          { id: "s1-1-d", title: "Section 4: Comprehensive Practice", completed: false, exercises: 4, completedExercises: 0, type: "quiz" },
        ],
        resources: [
          { title: "TypeScript Full Course for Beginners", url: "https://www.youtube.com/watch?v=30LWjhZzg50", type: "youtube", duration: "3h 10m" },
          { title: "TypeScript Handbook – Generics", url: "https://www.typescriptlang.org/docs/handbook/2/generics.html", type: "article", platform: "Official Docs" },
        ],
      },
      {
        id: "s1-2",
        moduleId: "demo-1",
        sessionNumber: 2,
        title: "Conditional & Mapped Types",
        skill: "TypeScript",
        dayOfWeek: 3, // Thursday
        estimatedMinutes: 80,
        status: "completed",
        stars: 4,
        maxStars: 5,
        sections: [
          { id: "s1-2-a", title: "Section 1: Basic Conditional Types", completed: true, exercises: 6, completedExercises: 6, type: "reading" },
          { id: "s1-2-b", title: "Section 2: infer keyword", completed: true, exercises: 5, completedExercises: 5, type: "practice" },
          { id: "s1-2-c", title: "Section 3: Mapped Types", completed: true, exercises: 8, completedExercises: 8, type: "practice" },
          { id: "s1-2-d", title: "Section 4: Advanced Combinations", completed: false, exercises: 4, completedExercises: 0, type: "quiz" },
        ],
        resources: [
          { title: "No BS TS – Jack Herrington", url: "https://www.youtube.com/watch?v=j92fxPpFaL8", type: "youtube", duration: "1h 20m" },
          { title: "TypeScript Handbook – Conditional Types", url: "https://www.typescriptlang.org/docs/handbook/2/conditional-types.html", type: "article", platform: "Official Docs" },
        ],
      },
      {
        id: "s1-3",
        moduleId: "demo-1",
        sessionNumber: 3,
        title: "Utility Types Deep-dive",
        skill: "TypeScript",
        dayOfWeek: 5, // Saturday
        estimatedMinutes: 70,
        status: "completed",
        stars: 5,
        maxStars: 5,
        sections: [
          { id: "s1-3-a", title: "Section 1: Partial, Required, Readonly", completed: true, exercises: 6, completedExercises: 6, type: "reading" },
          { id: "s1-3-b", title: "Section 2: Pick, Omit, Exclude", completed: true, exercises: 7, completedExercises: 7, type: "practice" },
          { id: "s1-3-c", title: "Section 3: Record, Extract, NonNullable", completed: true, exercises: 5, completedExercises: 5, type: "practice" },
          { id: "s1-3-d", title: "Section 4: Review & Quiz", completed: true, exercises: 10, completedExercises: 10, type: "quiz" },
        ],
        resources: [
          { title: "TypeScript Handbook – Utility Types", url: "https://www.typescriptlang.org/docs/handbook/utility-types.html", type: "article", platform: "Official Docs" },
          { title: "Type Challenges", url: "https://github.com/type-challenges/type-challenges", type: "course", platform: "GitHub" },
        ],
      },
    ],
  },
  {
    weekNumber: 2,
    moduleId: "demo-2",
    moduleTitle: "React Performance Optimisation",
    sessions: [
      {
        id: "s2-1",
        moduleId: "demo-2",
        sessionNumber: 4,
        title: "React Profiler & DevTools",
        skill: "React",
        dayOfWeek: 1,
        estimatedMinutes: 60,
        status: "completed",
        stars: 3,
        maxStars: 5,
        sections: [
          { id: "s2-1-a", title: "Section 1: Intro to React Profiler", completed: true, exercises: 4, completedExercises: 4, type: "reading" },
          { id: "s2-1-b", title: "Section 2: Reading Flame Graphs", completed: true, exercises: 3, completedExercises: 3, type: "practice" },
          { id: "s2-1-c", title: "Section 3: Finding bottlenecks", completed: false, exercises: 5, completedExercises: 0, type: "practice" },
        ],
        resources: [
          { title: "React Performance Optimisation", url: "https://www.youtube.com/watch?v=shehAKSWLog", type: "youtube", duration: "58m" },
          { title: "React Docs – Profiler", url: "https://react.dev/reference/react/Profiler", type: "article", platform: "react.dev" },
        ],
      },
      {
        id: "s2-2",
        moduleId: "demo-2",
        sessionNumber: 5,
        title: "useMemo, useCallback & memo",
        skill: "React",
        dayOfWeek: 3,
        estimatedMinutes: 90,
        status: "in-progress",
        stars: 2,
        maxStars: 5,
        sections: [
          { id: "s2-2-a", title: "Section 1: When to memo?", completed: true, exercises: 4, completedExercises: 4, type: "reading" },
          { id: "s2-2-b", title: "Section 2: useMemo Practice", completed: false, exercises: 6, completedExercises: 0, type: "practice" },
          { id: "s2-2-c", title: "Section 3: useCallback Practice", completed: false, exercises: 5, completedExercises: 0, type: "practice" },
          { id: "s2-2-d", title: "Section 4: React.memo", completed: false, exercises: 4, completedExercises: 0, type: "quiz" },
        ],
        resources: [
          { title: "Before You memo() – Dan Abramov", url: "https://overreacted.io/before-you-memo/", type: "article", platform: "overreacted.io" },
          { title: "React Docs – useMemo", url: "https://react.dev/reference/react/useMemo", type: "article", platform: "react.dev" },
        ],
      },
      {
        id: "s2-3",
        moduleId: "demo-2",
        sessionNumber: 6,
        title: "Code-splitting & Lazy Loading",
        skill: "React",
        dayOfWeek: 5,
        estimatedMinutes: 75,
        status: "locked",
        stars: 0,
        maxStars: 5,
        sections: [
          { id: "s2-3-a", title: "Section 1: Dynamic import", completed: false, exercises: 4, completedExercises: 0, type: "reading" },
          { id: "s2-3-b", title: "Section 2: React.lazy & Suspense", completed: false, exercises: 5, completedExercises: 0, type: "practice" },
          { id: "s2-3-c", title: "Section 3: Route-level splitting", completed: false, exercises: 4, completedExercises: 0, type: "practice" },
        ],
        resources: [
          { title: "React Docs – Code Splitting", url: "https://react.dev/reference/react/lazy", type: "article", platform: "react.dev" },
          { title: "Vite Code Splitting Guide", url: "https://vitejs.dev/guide/build.html#chunking-strategy", type: "article", platform: "Vite Docs" },
        ],
      },
    ],
  },
  {
    weekNumber: 3,
    moduleId: "demo-3",
    moduleTitle: "State Management at Scale",
    sessions: [
      {
        id: "s3-1",
        moduleId: "demo-3",
        sessionNumber: 7,
        title: "Zustand Fundamentals",
        skill: "State Management",
        dayOfWeek: 1,
        estimatedMinutes: 80,
        status: "locked",
        stars: 0,
        maxStars: 5,
        sections: [
          { id: "s3-1-a", title: "Section 1: Why Zustand?", completed: false, exercises: 3, completedExercises: 0, type: "reading" },
          { id: "s3-1-b", title: "Section 2: Creating your first store", completed: false, exercises: 5, completedExercises: 0, type: "practice" },
          { id: "s3-1-c", title: "Section 3: Slices & middleware", completed: false, exercises: 4, completedExercises: 0, type: "practice" },
        ],
        resources: [
          { title: "Zustand vs Jotai vs Recoil", url: "https://www.youtube.com/watch?v=_ngCLZ5Iz-0", type: "youtube", duration: "25m" },
          { title: "Zustand Docs", url: "https://zustand-demo.pmnd.rs/", type: "article", platform: "Zustand" },
        ],
      },
      {
        id: "s3-2",
        moduleId: "demo-3",
        sessionNumber: 8,
        title: "React Query & Server State",
        skill: "State Management",
        dayOfWeek: 3,
        estimatedMinutes: 100,
        status: "locked",
        stars: 0,
        maxStars: 5,
        sections: [
          { id: "s3-2-a", title: "Section 1: Client vs Server state", completed: false, exercises: 3, completedExercises: 0, type: "reading" },
          { id: "s3-2-b", title: "Section 2: Basic useQuery", completed: false, exercises: 6, completedExercises: 0, type: "practice" },
          { id: "s3-2-c", title: "Section 3: useMutation & cache", completed: false, exercises: 5, completedExercises: 0, type: "practice" },
          { id: "s3-2-d", title: "Section 4: Optimistic updates", completed: false, exercises: 4, completedExercises: 0, type: "quiz" },
        ],
        resources: [
          { title: "TanStack Query Crash Course", url: "https://www.youtube.com/watch?v=r8Dg0KVnfMA", type: "youtube", duration: "45m" },
          { title: "React Query Docs", url: "https://tanstack.com/query/latest/docs/framework/react/overview", type: "course", platform: "TanStack" },
        ],
      },
    ],
  },
  {
    weekNumber: 4,
    moduleId: "demo-4",
    moduleTitle: "Testing Strategies for React",
    sessions: [
      {
        id: "s4-1",
        moduleId: "demo-4",
        sessionNumber: 9,
        title: "Vitest & Unit Testing",
        skill: "Testing",
        dayOfWeek: 1,
        estimatedMinutes: 90,
        status: "locked",
        stars: 0,
        maxStars: 5,
        sections: [
          { id: "s4-1-a", title: "Section 1: Vitest Setup", completed: false, exercises: 3, completedExercises: 0, type: "reading" },
          { id: "s4-1-b", title: "Section 2: test() and expect()", completed: false, exercises: 6, completedExercises: 0, type: "practice" },
          { id: "s4-1-c", title: "Section 3: Mocking modules", completed: false, exercises: 5, completedExercises: 0, type: "practice" },
        ],
        resources: [
          { title: "React Testing Library Tutorial", url: "https://www.youtube.com/watch?v=7dTTFW7yACQ", type: "youtube", duration: "1h 15m" },
          { title: "Vitest Docs", url: "https://vitest.dev/guide/", type: "article", platform: "Vitest" },
        ],
      },
    ],
  },
  {
    weekNumber: 5,
    moduleId: "demo-5",
    moduleTitle: "CI/CD & Frontend DevOps",
    sessions: [
      {
        id: "s5-1",
        moduleId: "demo-5",
        sessionNumber: 10,
        title: "GitHub Actions Basics",
        skill: "DevOps",
        dayOfWeek: 1,
        estimatedMinutes: 80,
        status: "locked",
        stars: 0,
        maxStars: 5,
        sections: [
          { id: "s5-1-a", title: "Section 1: Workflows & triggers", completed: false, exercises: 4, completedExercises: 0, type: "reading" },
          { id: "s5-1-b", title: "Section 2: Jobs and steps", completed: false, exercises: 5, completedExercises: 0, type: "practice" },
          { id: "s5-1-c", title: "Section 3: Secrets & environments", completed: false, exercises: 3, completedExercises: 0, type: "practice" },
        ],
        resources: [
          { title: "GitHub Actions Full Course", url: "https://www.youtube.com/watch?v=R8_veQiYBjI", type: "youtube", duration: "1h 40m" },
          { title: "GitHub Actions Docs", url: "https://docs.github.com/en/actions", type: "article", platform: "GitHub Docs" },
        ],
      },
    ],
  },
  {
    weekNumber: 6,
    moduleId: "demo-6",
    moduleTitle: "System Design for Frontend Engineers",
    sessions: [
      {
        id: "s6-1",
        moduleId: "demo-6",
        sessionNumber: 11,
        title: "Micro-frontend Architecture",
        skill: "System Design",
        dayOfWeek: 1,
        estimatedMinutes: 100,
        status: "locked",
        stars: 0,
        maxStars: 5,
        sections: [
          { id: "s6-1-a", title: "Section 1: Why micro-frontends?", completed: false, exercises: 3, completedExercises: 0, type: "reading" },
          { id: "s6-1-b", title: "Section 2: Module Federation", completed: false, exercises: 5, completedExercises: 0, type: "practice" },
          { id: "s6-1-c", title: "Section 3: Shared state between MFEs", completed: false, exercises: 4, completedExercises: 0, type: "practice" },
        ],
        resources: [
          { title: "Frontend System Design Interview", url: "https://www.youtube.com/watch?v=5vyKhB3M2XQ", type: "youtube", duration: "50m" },
          { title: "Micro-frontends Guide", url: "https://micro-frontends.org/", type: "article", platform: "micro-frontends.org" },
        ],
      },
    ],
  },
];

export const DEMO_ROADMAP: LearningRoadmap = {
  modules: [
    {
      id: "demo-1",
      title: "Advanced TypeScript Patterns",
      description: "Dive deep into generics, conditional types, and type-safe design patterns used in production codebases.",
      status: "completed",
      weekNumber: 1,
      estimatedHours: 14,
      topics: [
        { title: "Generics & Constraints", completed: true },
        { title: "Conditional & Mapped Types", completed: true },
        { title: "Discriminated Unions", completed: true },
        { title: "Utility Types deep-dive", completed: true },
      ],
      resources: [
        { title: "TypeScript Full Course for Beginners", url: "https://www.youtube.com/watch?v=30LWjhZzg50", type: "youtube", duration: "3h 10m" },
        { title: "No BS TS – Jack Herrington", url: "https://www.youtube.com/watch?v=j92fxPpFaL8", type: "youtube", duration: "1h 20m" },
        { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html", type: "article", platform: "Official Docs" },
        { title: "Type Challenges", url: "https://github.com/type-challenges/type-challenges", type: "course", platform: "GitHub" },
      ],
    },
    {
      id: "demo-2",
      title: "React Performance Optimisation",
      description: "Learn to identify and fix re-render bottlenecks, implement code-splitting, and use advanced hooks patterns.",
      status: "in-progress",
      weekNumber: 2,
      estimatedHours: 18,
      topics: [
        { title: "React Profiler & DevTools", completed: true },
        { title: "useMemo, useCallback, memo", completed: true },
        { title: "Code-splitting & lazy loading", completed: false },
        { title: "Virtual lists & windowing", completed: false },
      ],
      resources: [
        { title: "React Performance Optimisation", url: "https://www.youtube.com/watch?v=shehAKSWLog", type: "youtube", duration: "58m" },
        { title: "Before You memo() – Dan Abramov", url: "https://overreacted.io/before-you-memo/", type: "article", platform: "overreacted.io" },
        { title: "React Docs – Performance", url: "https://react.dev/learn/render-and-commit", type: "course", platform: "react.dev" },
      ],
    },
    {
      id: "demo-3",
      title: "State Management at Scale",
      description: "Compare Zustand, Jotai, and React Query.",
      status: "locked",
      weekNumber: 3,
      estimatedHours: 16,
      topics: [
        { title: "Zustand fundamentals", completed: false },
        { title: "React Query & server state", completed: false },
        { title: "Jotai atomic state", completed: false },
        { title: "Integrating multiple state layers", completed: false },
      ],
      resources: [
        { title: "Zustand vs Jotai vs Recoil", url: "https://www.youtube.com/watch?v=_ngCLZ5Iz-0", type: "youtube", duration: "25m" },
        { title: "TanStack Query Crash Course", url: "https://www.youtube.com/watch?v=r8Dg0KVnfMA", type: "youtube", duration: "45m" },
        { title: "React Query Docs", url: "https://tanstack.com/query/latest/docs/framework/react/overview", type: "course", platform: "TanStack" },
      ],
    },
    {
      id: "demo-4",
      title: "Testing Strategies for React",
      description: "Unit, integration and E2E tests with Vitest, Testing Library, and Playwright.",
      status: "locked",
      weekNumber: 4,
      estimatedHours: 20,
      topics: [
        { title: "Vitest & unit testing", completed: false },
        { title: "React Testing Library", completed: false },
        { title: "MSW for API mocking", completed: false },
        { title: "Playwright E2E tests", completed: false },
      ],
      resources: [
        { title: "React Testing Library Tutorial", url: "https://www.youtube.com/watch?v=7dTTFW7yACQ", type: "youtube", duration: "1h 15m" },
        { title: "Playwright in 45 Minutes", url: "https://www.youtube.com/watch?v=Xz6lhEzgI5I", type: "youtube", duration: "45m" },
        { title: "Testing Library Docs", url: "https://testing-library.com/docs/", type: "course", platform: "testing-library.com" },
      ],
    },
    {
      id: "demo-5",
      title: "CI/CD & Frontend DevOps",
      description: "Ship code with confidence using GitHub Actions and Docker.",
      status: "locked",
      weekNumber: 5,
      estimatedHours: 12,
      topics: [
        { title: "GitHub Actions basics", completed: false },
        { title: "Docker for frontend apps", completed: false },
        { title: "Automated deploy to Netlify / Vercel", completed: false },
        { title: "Lighthouse CI quality gates", completed: false },
      ],
      resources: [
        { title: "GitHub Actions Full Course", url: "https://www.youtube.com/watch?v=R8_veQiYBjI", type: "youtube", duration: "1h 40m" },
        { title: "Docker for Beginners", url: "https://www.youtube.com/watch?v=pg19Z8LL06w", type: "youtube", duration: "2h 5m" },
        { title: "freeCodeCamp DevOps Path", url: "https://www.freecodecamp.org/learn/", type: "course", platform: "freeCodeCamp" },
      ],
    },
    {
      id: "demo-6",
      title: "System Design for Frontend Engineers",
      description: "Large-scale UI architectures, micro-frontends, and API communication patterns.",
      status: "locked",
      weekNumber: 6,
      estimatedHours: 14,
      topics: [
        { title: "Micro-frontend architecture", completed: false },
        { title: "API design & BFF pattern", completed: false },
        { title: "Web performance metrics (Core Web Vitals)", completed: false },
        { title: "Design system principles", completed: false },
      ],
      resources: [
        { title: "Frontend System Design Interview", url: "https://www.youtube.com/watch?v=5vyKhB3M2XQ", type: "youtube", duration: "50m" },
        { title: "Micro-frontends Guide", url: "https://micro-frontends.org/", type: "article", platform: "micro-frontends.org" },
        { title: "Frontend Masters – System Design", url: "https://frontendmasters.com/courses/enterprise-patterns/", type: "course", platform: "Frontend Masters" },
      ],
    },
  ],
  estimatedCompletionWeeks: 6,
  totalHours: 94,
};
