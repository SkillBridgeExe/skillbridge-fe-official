// ─── Assessment Mock Data ──────────────────────────────────
// Simulates skill assessment data linked to Diagnosis skill gaps

export interface SkillRadarPoint {
  skill: string;
  before: number; // 0-100, from Diagnosis
  after: number;  // 0-100, after learning + assessment
}

export interface AssessmentQuestion {
  id: string;
  type: "multiple-choice" | "code-output" | "true-false" | "scenario";
  question: string;
  code?: string;       // for code-output type
  options: string[];
  correctIndex: number;
  explanation: string;
  skill: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface AssessmentModule {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  skill: string;
  totalQuestions: number;
  timeMinutes: number;
  status: "not-started" | "in-progress" | "completed";
  score?: number;        // 0-100
  grade?: string;        // A+, A, B, C, F
  completedAt?: string;
  bestScore?: number;
  attempts: number;
}

export interface AssessmentResult {
  moduleId: string;
  score: number;
  grade: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  timeSpent: string;
  breakdown: { skill: string; correct: number; total: number; percentage: number }[];
  skillImpact: { skill: string; before: number; after: number }[];
  recommendations: string[];
}

// ─── Radar Chart Data ──────────────────────────────────────
export const SKILL_RADAR_DATA: SkillRadarPoint[] = [
  { skill: "TypeScript",        before: 35, after: 78 },
  { skill: "React",             before: 40, after: 72 },
  { skill: "State Management",  before: 20, after: 55 },
  { skill: "Testing",           before: 15, after: 45 },
  { skill: "DevOps",            before: 10, after: 30 },
  { skill: "System Design",     before: 25, after: 40 },
];

// ─── Assessment Modules ────────────────────────────────────
export const ASSESSMENT_MODULES: AssessmentModule[] = [
  {
    id: "assess-1",
    moduleId: "m1",
    title: "Advanced TypeScript Patterns",
    description: "Test your understanding of generics, mapped types, conditional types, and utility types.",
    skill: "TypeScript",
    totalQuestions: 12,
    timeMinutes: 20,
    status: "completed",
    score: 85,
    grade: "A",
    completedAt: "2026-03-05",
    bestScore: 85,
    attempts: 1,
  },
  {
    id: "assess-2",
    moduleId: "m2",
    title: "React Performance Optimisation",
    description: "Evaluate your knowledge of React Profiler, useMemo, useCallback, and lazy loading strategies.",
    skill: "React",
    totalQuestions: 10,
    timeMinutes: 15,
    status: "in-progress",
    score: undefined,
    attempts: 0,
  },
  {
    id: "assess-3",
    moduleId: "m3",
    title: "State Management at Scale",
    description: "Assess your expertise in Zustand, React Query, and server state management patterns.",
    skill: "State Management",
    totalQuestions: 10,
    timeMinutes: 15,
    status: "not-started",
    attempts: 0,
  },
  {
    id: "assess-4",
    moduleId: "m4",
    title: "Testing Strategies for React",
    description: "Verify your ability to write unit tests, integration tests, and use Vitest effectively.",
    skill: "Testing",
    totalQuestions: 8,
    timeMinutes: 12,
    status: "not-started",
    attempts: 0,
  },
  {
    id: "assess-5",
    moduleId: "m5",
    title: "CI/CD & Frontend DevOps",
    description: "Check your understanding of GitHub Actions, deployment pipelines, and build optimization.",
    skill: "DevOps",
    totalQuestions: 8,
    timeMinutes: 12,
    status: "not-started",
    attempts: 0,
  },
  {
    id: "assess-6",
    moduleId: "m6",
    title: "System Design for Frontend Engineers",
    description: "Test your knowledge of micro-frontend architecture, performance budgets, and scalability.",
    skill: "System Design",
    totalQuestions: 10,
    timeMinutes: 18,
    status: "not-started",
    attempts: 0,
  },
];

// ─── Sample Questions (for module assess-2: React) ─────────
export const SAMPLE_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "q1",
    type: "multiple-choice",
    question: "Which hook should you use to memoize an expensive computation that depends on specific props?",
    options: ["useEffect", "useMemo", "useCallback", "useRef"],
    correctIndex: 1,
    explanation: "useMemo memoizes the result of an expensive computation. It only recalculates when its dependencies change.",
    skill: "React",
    difficulty: "easy",
  },
  {
    id: "q2",
    type: "code-output",
    question: "What will be logged to the console?",
    code: `const [count, setCount] = useState(0);

useEffect(() => {
  console.log("Effect:", count);
  return () => console.log("Cleanup:", count);
}, [count]);

// User clicks button that calls setCount(1)`,
    options: ["Cleanup: 0, Effect: 1", "Effect: 1", "Effect: 0, Cleanup: 0, Effect: 1", "Cleanup: 1, Effect: 1"],
    correctIndex: 0,
    explanation: "When count changes from 0 to 1, React first runs the cleanup function from the previous effect (logging 'Cleanup: 0'), then runs the new effect (logging 'Effect: 1').",
    skill: "React",
    difficulty: "medium",
  },
  {
    id: "q3",
    type: "true-false",
    question: "React.memo performs a deep comparison of props by default.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "React.memo performs a shallow comparison of props by default. For deep comparison, you need to provide a custom comparison function as the second argument.",
    skill: "React",
    difficulty: "easy",
  },
  {
    id: "q4",
    type: "scenario",
    question: "You notice that a child component re-renders every time the parent renders, even though the child's props haven't changed. The child displays a list of 1000+ items. What's the best approach?",
    options: [
      "Wrap the child component with React.memo()",
      "Move the child's state to the parent",
      "Use useRef to store the list data",
      "Add a key prop to the child"
    ],
    correctIndex: 0,
    explanation: "Wrapping the child with React.memo() prevents unnecessary re-renders by doing a shallow comparison of props. This is especially important for components rendering large lists.",
    skill: "React",
    difficulty: "medium",
  },
  {
    id: "q5",
    type: "multiple-choice",
    question: "What is the primary purpose of the useCallback hook?",
    options: [
      "To cache the result of a function call",
      "To memoize a function reference between renders",
      "To run side effects after render",
      "To create a ref for a DOM element"
    ],
    correctIndex: 1,
    explanation: "useCallback returns a memoized version of the callback function that only changes if one of the dependencies has changed. This is useful when passing callbacks to optimized child components.",
    skill: "React",
    difficulty: "easy",
  },
  {
    id: "q6",
    type: "code-output",
    question: "What will this component render?",
    code: `function App() {
  const [items] = useState([1, 2, 3]);
  const doubled = useMemo(() => items.map(i => i * 2), [items]);
  return <div>{doubled.join(', ')}</div>;
}`,
    options: ["1, 2, 3", "2, 4, 6", "Error", "undefined"],
    correctIndex: 1,
    explanation: "useMemo computes the doubled array [2, 4, 6] from items [1, 2, 3]. The result is then joined and displayed as '2, 4, 6'.",
    skill: "React",
    difficulty: "easy",
  },
  {
    id: "q7",
    type: "scenario",
    question: "Your React app's bundle size is 2.5MB and the initial load takes 8 seconds. Which strategy would have the MOST impact on reducing initial load time?",
    options: [
      "Add more useMemo hooks to existing components",
      "Implement code splitting with React.lazy() and Suspense",
      "Switch from useState to useReducer",
      "Add React.StrictMode to the app root"
    ],
    correctIndex: 1,
    explanation: "Code splitting with React.lazy() and Suspense enables loading components on demand, significantly reducing the initial bundle size and load time. This is the most impactful optimization for large bundles.",
    skill: "React",
    difficulty: "hard",
  },
  {
    id: "q8",
    type: "true-false",
    question: "useEffect with an empty dependency array [] runs after every render.",
    options: ["True", "False"],
    correctIndex: 1,
    explanation: "useEffect with an empty dependency array runs only once after the initial render (mount), similar to componentDidMount. Without any dependency array, it would run after every render.",
    skill: "React",
    difficulty: "easy",
  },
  {
    id: "q9",
    type: "multiple-choice",
    question: "Which React feature allows you to split your UI into independent pieces and load them lazily?",
    options: ["React.Fragment", "React.Suspense + React.lazy", "React.createPortal", "React.forwardRef"],
    correctIndex: 1,
    explanation: "React.Suspense combined with React.lazy() provides code-splitting at the component level, allowing you to lazily load components and display a fallback while they're loading.",
    skill: "React",
    difficulty: "medium",
  },
  {
    id: "q10",
    type: "scenario",
    question: "You're building a data table that fetches data from an API. The table re-fetches on every keystroke in a search input. How would you optimize this?",
    options: [
      "Use useRef to store the search value",
      "Implement debouncing on the search input",
      "Move the fetch logic to a useEffect without dependencies",
      "Wrap the entire table in React.memo"
    ],
    correctIndex: 1,
    explanation: "Debouncing the search input delays the API call until the user stops typing for a specified period. This prevents excessive API calls on every keystroke while still providing responsive search functionality.",
    skill: "React",
    difficulty: "medium",
  },
];

// ─── Sample Result ─────────────────────────────────────────
export const SAMPLE_RESULT: AssessmentResult = {
  moduleId: "assess-1",
  score: 85,
  grade: "A",
  totalQuestions: 12,
  correct: 10,
  wrong: 2,
  timeSpent: "16:42",
  breakdown: [
    { skill: "Generics",         correct: 3, total: 3, percentage: 100 },
    { skill: "Mapped Types",     correct: 3, total: 3, percentage: 100 },
    { skill: "Conditional Types", correct: 2, total: 3, percentage: 67 },
    { skill: "Utility Types",    correct: 2, total: 3, percentage: 67 },
  ],
  skillImpact: [
    { skill: "TypeScript", before: 35, after: 78 },
    { skill: "React",      before: 40, after: 40 },
  ],
  recommendations: [
    "Review Conditional Types — you missed questions about infer keyword usage",
    "Practice more with Utility Types — especially Record and Exclude patterns",
  ],
};

// ─── JD Match Progress ─────────────────────────────────────
export const JD_MATCH_PROGRESS = {
  initial: 42,    // from Diagnosis
  current: 68,    // after learning + assessments
  target: 85,     // JD requirement threshold
};
