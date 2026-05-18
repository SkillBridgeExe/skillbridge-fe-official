// lib/data/courses-data.ts
// 10 IT courses with full content: video, reading, practice & quiz
// Each session has 4 sections, all sections populated with real content

export type SectionType = "video" | "reading" | "practice" | "quiz";
export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface CourseSection {
  id: string;
  title: string;
  type: SectionType;
  durationMinutes: number;
  videoUrl?: string;
  content?: string;
  quiz?: QuizQuestion[];
}

export interface CourseSession {
  id: string;
  sessionNumber: number;
  title: string;
  estimatedMinutes: number;
  sections: CourseSection[];
  resources: { title: string; url: string; type: "youtube" | "article" | "course"; duration?: string; platform?: string }[];
}

export interface Course {
  id: string;
  name: string;
  shortName: string;
  description: string;
  level: CourseLevel;
  estimatedHours: number;
  skills: string[];
  tags: string[];
  color: string;
  sessions: CourseSession[];
}

export const ALL_COURSES: Course[] = [
  {
    id: "ts-fundamentals",
    name: "TypeScript Fundamentals",
    shortName: "TypeScript",
    description: "Master static typing, generics, and type-safe patterns used in modern production codebases.",
    level: "Intermediate",
    estimatedHours: 14,
    skills: ["TypeScript", "Static Typing", "Generics", "Type Safety", "Interfaces"],
    tags: ["frontend", "language"],
    color: "bg-blue-500",
    sessions: [
      {
        id: "ts-1", sessionNumber: 1, title: "Types, Interfaces & Enums", estimatedMinutes: 70,
        resources: [
          { title: "TypeScript Full Course for Beginners", url: "https://www.youtube.com/watch?v=30LWjhZzg50", type: "youtube", duration: "3h 10m" },
          { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html", type: "article", platform: "Official Docs" },
        ],
        sections: [
          { id: "ts-1-a", title: "Introduction to TypeScript", type: "video", durationMinutes: 20, videoUrl: "https://www.youtube.com/watch?v=30LWjhZzg50" },
          {
            id: "ts-1-b", title: "Types, Interfaces & Enums", type: "reading", durationMinutes: 20,
            content: `## Why TypeScript?

TypeScript adds **static types** to JavaScript, catching bugs at compile time.

\`\`\`typescript
let name: string = "Alice";
name = 42; // Error: Type 'number' is not assignable to type 'string'
\`\`\`

## Basic Types

\`\`\`typescript
let age: number = 25;
let username: string = "alice";
let isActive: boolean = true;
let scores: number[] = [90, 85, 92];
let point: [number, number] = [10, 20]; // Tuple
\`\`\`

## Interfaces

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;              // optional
  readonly createdAt: Date;  // read-only
}
\`\`\`

## Enums

\`\`\`typescript
enum Direction { Up = "UP", Down = "DOWN", Left = "LEFT", Right = "RIGHT" }
\`\`\`

> 💡 **Pro Tip:** Prefer string enums — clearer error messages and easier to debug.`,
          },
          {
            id: "ts-1-c", title: "Union Types & Type Aliases", type: "practice", durationMinutes: 20,
            content: `## Union Types

\`\`\`typescript
type ID = string | number;
function printId(id: ID) {
  if (typeof id === "string") console.log(id.toUpperCase());
  else console.log(id.toFixed(0));
}
\`\`\`

## Practice Tasks
1. Create a \`Vehicle\` interface with make, model, year, optional color
2. Create union type \`Status = "active" | "inactive" | "pending"\`
3. Write a function accepting Vehicle that returns a formatted string`,
          },
          {
            id: "ts-1-d", title: "Types & Interfaces Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What is the primary benefit of TypeScript over JavaScript?`, options: ["It runs faster", "It catches type errors at compile time", "It has more built-in functions", "It works only in Node.js"], correct: 1, explanation: `TypeScript's static type system catches type errors during development, before the code runs in production.` },
          { question: `Which syntax correctly declares an optional property in an interface?`, options: ["name: string?", "name?: string", "optional name: string", "name: string | undefined"], correct: 1, explanation: `The question mark after the property name (name?: string) marks it as optional.` },
          { question: `What does \`readonly\` mean on an interface property?`, options: ["Property can only be read from files", "Property cannot be changed after initialization", "Property is private", "Property only accepts strings"], correct: 1, explanation: `readonly prevents a property from being reassigned after the object is created.` },
          { question: `Which is a valid union type declaration?`, options: ["type T = string && number", "type T = string | number", "type T = string + number", "type T = string or number"], correct: 1, explanation: `The pipe character (|) creates a union type — the value can be either of the specified types.` },
            ],
          },
        ],
      },
      {
        id: "ts-2", sessionNumber: 2, title: "Generics & Constraints", estimatedMinutes: 80,
        resources: [
          { title: "No BS TS – Jack Herrington", url: "https://www.youtube.com/watch?v=j92fxPpFaL8", type: "youtube", duration: "1h 20m" },
          { title: "TypeScript Handbook – Generics", url: "https://www.typescriptlang.org/docs/handbook/2/generics.html", type: "article", platform: "Official Docs" },
        ],
        sections: [
          { id: "ts-2-a", title: "Generics Explained", type: "video", durationMinutes: 25, videoUrl: "https://www.youtube.com/watch?v=j92fxPpFaL8" },
          {
            id: "ts-2-b", title: "Generic Functions & Constraints", type: "reading", durationMinutes: 25,
            content: `## Generics

\`\`\`typescript
// Without generics — loses type info
function identity(arg: any): any { return arg; }

// With generics — preserves type info
function identity<T>(arg: T): T { return arg; }

const str = identity<string>("hello"); // type: string
const num = identity(42);             // type: number (inferred)
\`\`\`

## Generic Constraints

\`\`\`typescript
interface HasLength { length: number; }

function logLength<T extends HasLength>(arg: T): T {
  console.log(arg.length);
  return arg;
}

logLength("hello");    // ✅ string has .length
logLength([1, 2, 3]);  // ✅ array has .length
logLength(42);         // ❌ Error: number has no .length
\`\`\`

## Utility Types

\`\`\`typescript
type PartialUser  = Partial<User>;           // all optional
type ReadonlyUser = Readonly<User>;          // all read-only
type UserPreview  = Pick<User, "id"|"name">; // select props
type NoAge        = Omit<User, "age">;       // exclude props
\`\`\``,
          },
          {
            id: "ts-2-c", title: "Build a Generic Stack", type: "practice", durationMinutes: 20,
            content: `## Build a Generic Stack

\`\`\`typescript
class Stack<T> {
  private items: T[] = [];
  push(item: T): void    { this.items.push(item); }
  pop(): T | undefined   { return this.items.pop(); }
  peek(): T | undefined  { return this.items[this.items.length - 1]; }
  isEmpty(): boolean     { return this.items.length === 0; }
}

const nums = new Stack<number>();
nums.push(1); nums.push(2);
console.log(nums.pop()); // 2
\`\`\`

**Challenge:** Add \`toArray(): T[]\` and \`contains(item: T): boolean\` methods.`,
          },
          {
            id: "ts-2-d", title: "Generics Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What is the syntax for a generic function?`, options: ["function fn(T)(arg: T): T", "function fn<T>(arg: T): T", "function fn[T](arg: T): T", "function<T> fn(arg: T): T"], correct: 1, explanation: `Generic type parameters are declared with angle brackets <T> after the function name.` },
          { question: `What does \`<T extends HasLength>\` mean?`, options: ["T must inherit HasLength", "T must have all HasLength properties", "T must have at least the properties in HasLength", "T is limited to HasLength only"], correct: 2, explanation: `extends in generics creates a constraint — T must have at least the properties defined in HasLength.` },
          { question: `Which utility type makes all properties optional?`, options: ["Optional<T>", "Partial<T>", "Maybe<T>", "Nullable<T>"], correct: 1, explanation: `Partial<T> creates a type where all properties of T become optional.` },
          { question: `What does \`Pick<User, 'id' | 'name'>\` produce?`, options: ["All User props except id and name", "Only id and name from User", "Extends User with id and name", "An error"], correct: 1, explanation: `Pick<T, K> creates a new type with only the specified properties K from type T.` },
            ],
          },
        ],
      },
      {
        id: "ts-3", sessionNumber: 3, title: "Advanced Patterns", estimatedMinutes: 75,
        resources: [
          { title: "TypeScript Advanced Types Deep Dive", url: "https://www.youtube.com/watch?v=F3pnBL9HFQE", type: "youtube", duration: "45m" },
          { title: "TypeScript Handbook – Conditional Types", url: "https://www.typescriptlang.org/docs/handbook/2/conditional-types.html", type: "article", platform: "Official Docs" },
        ],
        sections: [
          { id: "ts-3-a", title: "Conditional & Mapped Types", type: "video", durationMinutes: 25, videoUrl: "https://www.youtube.com/watch?v=F3pnBL9HFQE" },
          {
            id: "ts-3-b", title: "Discriminated Unions & Mapped Types", type: "reading", durationMinutes: 25,
            content: `## Discriminated Unions

\`\`\`typescript
type Shape =
  | { kind: "circle";    radius: number }
  | { kind: "square";    side: number }
  | { kind: "rectangle"; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":    return Math.PI * shape.radius ** 2;
    case "square":    return shape.side ** 2;
    case "rectangle": return shape.width * shape.height;
  }
}
\`\`\`

## Conditional Types

\`\`\`typescript
type IsString<T> = T extends string ? "yes" : "no";
type A = IsString<string>; // "yes"
type B = IsString<number>; // "no"
\`\`\`

## Mapped Types

\`\`\`typescript
type Getters<T> = {
  [K in keyof T]: () => T[K];
};
// Transforms { name: string } → { name: () => string }
\`\`\``,
          },
          {
            id: "ts-3-c", title: "Type Guards Practice", type: "practice", durationMinutes: 15,
            content: `## Custom Type Guards

\`\`\`typescript
interface Fish { swim(): void; }
interface Bird { fly(): void; }

function isFish(pet: Fish | Bird): pet is Fish {
  return (pet as Fish).swim !== undefined;
}

function move(pet: Fish | Bird) {
  if (isFish(pet)) pet.swim();
  else pet.fly();
}
\`\`\`

**Practice:** Create type guards for an \`ApiResponse<T>\` type that can be \`Success<T>\` or \`ApiError\`.`,
          },
          {
            id: "ts-3-d", title: "Advanced Types Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What is a discriminated union?`, options: ["A union where all types differ", "A union where each member has a shared literal property for narrowing", "A union excluding null", "A union of primitives only"], correct: 1, explanation: `A discriminated union uses a shared literal property like 'kind' to safely narrow down which variant you are working with.` },
          { question: `What does \`T extends string ? A : B\` mean?`, options: ["T must extend String class", "If T is assignable to string use A; otherwise B", "T is a string with A or B", "T must be string A or B"], correct: 1, explanation: `This is a conditional type — evaluates to A if T can be assigned to string, and B otherwise.` },
          { question: `What does \`keyof T\` return?`, options: ["Values of all properties in T", "A union of all property names (keys) of T", "The first key of T", "The count of properties in T"], correct: 1, explanation: `keyof T produces a union type of all the property keys of type T as string literals.` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "react-advanced",
    name: "React — Advanced Patterns",
    shortName: "React",
    description: "Deep-dive into hooks, performance optimization, and scalable component architecture.",
    level: "Intermediate",
    estimatedHours: 18,
    skills: ["React", "Hooks", "Performance", "Component Architecture", "useMemo", "useCallback", "Context API"],
    tags: ["frontend", "framework"],
    color: "bg-cyan-500",
    sessions: [
      {
        id: "react-1", sessionNumber: 1, title: "Hooks Deep-Dive", estimatedMinutes: 90,
        resources: [
          { title: "React Hooks Complete Guide", url: "https://www.youtube.com/watch?v=TNhaISOUy6Q", type: "youtube", duration: "1h 30m" },
          { title: "React Docs – Hooks Reference", url: "https://react.dev/reference/react", type: "article", platform: "react.dev" },
        ],
        sections: [
          { id: "r1-a", title: "useState & useReducer Patterns", type: "video", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=TNhaISOUy6Q" },
          {
            id: "r1-b", title: "useEffect Best Practices", type: "reading", durationMinutes: 25,
            content: `## useState — Lazy Initialization

\`\`\`typescript
const [state, setState] = useState(() =>
  JSON.parse(localStorage.getItem("data") ?? "{}")
);
// Functional updates — safe with async
setState(prev => ({ ...prev, count: prev.count + 1 }));
\`\`\`

## useReducer

\`\`\`typescript
type Action = { type: "INCREMENT" } | { type: "RESET"; payload: number };
function reducer(state: number, action: Action): number {
  switch (action.type) {
    case "INCREMENT": return state + 1;
    case "RESET":     return action.payload;
  }
}
const [count, dispatch] = useReducer(reducer, 0);
\`\`\`

## useEffect Rules

\`\`\`typescript
// Cleanup example — cancel timer on unmount
useEffect(() => {
  const id = setInterval(() => setTime(Date.now()), 1000);
  return () => clearInterval(id);
}, []);
\`\`\`

> 💡 Every value from component scope that changes and is used inside the effect must be in the dependency array.`,
          },
          {
            id: "r1-c", title: "Build a Custom useFetch Hook", type: "practice", durationMinutes: 25,
            content: `## useFetch Custom Hook

\`\`\`typescript
function useFetch<T>(url: string) {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}
\`\`\`

**Practice:** Build a \`useLocalStorage<T>(key, initialValue)\` hook that reads/writes localStorage.`,
          },
          {
            id: "r1-d", title: "Hooks Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `When should you use useReducer over useState?`, options: ["When fetching data", "When state has complex transitions or multiple related values", "When performance is a concern", "When you have a single value"], correct: 1, explanation: `useReducer shines when state transitions are complex or multiple related values change together.` },
          { question: `What does an empty [] dependency array in useEffect mean?`, options: ["Runs every render", "Never runs", "Runs only once after mount", "Runs when any state changes"], correct: 2, explanation: `Empty array: no dependencies, effect only runs once after initial render.` },
          { question: `What should a useEffect cleanup function do?`, options: ["Return a boolean", "Nothing — it is automatic", "Cancel or clean up the side effects", "Return a Promise"], correct: 2, explanation: `Cleanup runs before unmount and before re-running. Cancel subscriptions, clear timers, abort fetches.` },
          { question: `What is the naming convention for custom hooks?`, options: ["Must start with 'use'", "Must end with 'Hook'", "Must start with 'custom'", "No convention"], correct: 0, explanation: `Custom hooks must start with 'use' so React's linter can enforce the Rules of Hooks.` },
            ],
          },
        ],
      },
      {
        id: "react-2", sessionNumber: 2, title: "Performance Optimization", estimatedMinutes: 85,
        resources: [
          { title: "React Performance Optimization", url: "https://www.youtube.com/watch?v=shehAKSWLog", type: "youtube", duration: "58m" },
          { title: "Before You memo() – Dan Abramov", url: "https://overreacted.io/before-you-memo/", type: "article", platform: "overreacted.io" },
        ],
        sections: [
          { id: "r2-a", title: "React Profiler & DevTools", type: "video", durationMinutes: 25, videoUrl: "https://www.youtube.com/watch?v=shehAKSWLog" },
          {
            id: "r2-b", title: "useMemo, useCallback & React.memo", type: "reading", durationMinutes: 30,
            content: `## React.memo — Skip Re-renders

\`\`\`typescript
const ExpensiveList = React.memo(({ items }: { items: string[] }) => (
  <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
));
\`\`\`

## useMemo — Expensive Calculations

\`\`\`typescript
const filtered = useMemo(
  () => products.filter(p => p.category === category),
  [products, category]
);
\`\`\`

## useCallback — Stable Function References

\`\`\`typescript
const handleClick = useCallback(() => {
  doSomething(count);
}, [count]); // same reference unless count changes
\`\`\`

> ⚠️ **Warning:** Profile first, optimize second. useMemo/useCallback add overhead — only use when you measure a real problem.`,
          },
          {
            id: "r2-c", title: "Code Splitting & Lazy Loading", type: "practice", durationMinutes: 20,
            content: `## Code Splitting with React.lazy

\`\`\`typescript
const Dashboard = lazy(() => import("./Dashboard"));
const Reports   = lazy(() => import("./Reports"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports"   element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
\`\`\`

**Practice:** Use React DevTools Profiler to find re-renders, wrap a heavy component with React.memo, and lazy-load all route components.`,
          },
          {
            id: "r2-d", title: "Performance Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What does React.memo do?`, options: ["Memoizes a computed value", "Prevents re-render if props have not changed", "Caches API responses", "Stores state between mounts"], correct: 1, explanation: `React.memo skips re-rendering if props are shallowly equal to the previous render.` },
          { question: `When should you use useMemo?`, options: ["For every computation", "When computation is expensive AND dependencies rarely change", "Only with arrays", "Whenever using useState"], correct: 1, explanation: `Only worth using when computation is genuinely expensive. Always profile first.` },
          { question: `Why is useCallback useful with React.memo?`, options: ["Makes functions faster", "Keeps stable function reference preventing unnecessary child re-renders", "Caches the return value", "Prevents memory leaks"], correct: 1, explanation: `Without useCallback, a new function is created every render. Passed to a memoized child it triggers re-render because the reference changed.` },
            ],
          },
        ],
      },
      {
        id: "react-3", sessionNumber: 3, title: "State Management at Scale", estimatedMinutes: 80,
        resources: [
          { title: "Zustand vs Context vs Redux", url: "https://www.youtube.com/watch?v=_ngCLZ5Iz-0", type: "youtube", duration: "25m" },
          { title: "Zustand Documentation", url: "https://zustand-demo.pmnd.rs/", type: "article", platform: "Zustand" },
        ],
        sections: [
          { id: "r3-a", title: "Context API vs External State Libraries", type: "video", durationMinutes: 20, videoUrl: "https://www.youtube.com/watch?v=_ngCLZ5Iz-0" },
          {
            id: "r3-b", title: "Zustand — Minimal Global State", type: "reading", durationMinutes: 30,
            content: `## Why Not Just Context?

Context re-renders **all consumers** whenever the value changes — even if a component uses only a small part.

## Zustand — Minimal Global State

\`\`\`typescript
import { create } from "zustand";

const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set(state => ({ items: [...state.items, item] })),
  clearCart: () => set({ items: [] }),
}));

// Selective subscription — only re-renders when items.length changes
function CartIcon() {
  const count = useCartStore(state => state.items.length);
  return <span>{count} items</span>;
}
\`\`\`

## Persist to localStorage

\`\`\`typescript
import { persist } from "zustand/middleware";
const useStore = create(persist(
  (set) => ({ count: 0, increment: () => set(s => ({ count: s.count + 1 })) }),
  { name: "my-store" }
));
\`\`\``,
          },
          {
            id: "r3-c", title: "Build a Todo Store with Zustand", type: "practice", durationMinutes: 20,
            content: `## Practice: Todo App with Zustand

Build \`useTodoStore\` with:
- \`todos: Todo[]\`
- \`addTodo(text: string)\`
- \`toggleTodo(id: string)\`
- \`deleteTodo(id: string)\`
- \`filter: "all" | "active" | "done"\`
- \`filteredTodos(): Todo[]\` (computed from filter)

Persist to localStorage using the \`persist\` middleware.`,
          },
          {
            id: "r3-d", title: "State Management Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Key limitation of React Context for state management?`, options: ["Cannot store objects", "All consumers re-render when any part of context changes", "Does not work with TypeScript", "Only usable at top level"], correct: 1, explanation: `Context re-renders every consumer on any change, causing unnecessary re-renders in large apps.` },
          { question: `How does Zustand prevent unnecessary re-renders?`, options: ["Batches all updates", "Components subscribe to specific slices via selector functions", "Uses virtual DOM", "Only updates on user interactions"], correct: 1, explanation: `Pass a selector — the component only re-renders when that specific slice of state changes.` },
          { question: `What does the \`persist\` middleware do in Zustand?`, options: ["Makes state immutable", "Automatically saves and restores state from localStorage", "Syncs state between browser tabs", "Makes all actions async"], correct: 1, explanation: `persist automatically saves the store to localStorage and rehydrates it on next load.` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "nodejs-backend",
    name: "Node.js Backend Development",
    shortName: "Node.js",
    description: "Build scalable REST APIs with Express, middleware patterns, authentication, and database integration.",
    level: "Intermediate",
    estimatedHours: 20,
    skills: ["Node.js", "Express", "REST API", "Middleware", "JWT", "Backend Development"],
    tags: ["backend", "javascript"],
    color: "bg-green-600",
    sessions: [
      {
        id: "node-1", sessionNumber: 1, title: "Express & Routing", estimatedMinutes: 80,
        resources: [
          { title: "Node.js & Express Full Course", url: "https://www.youtube.com/watch?v=Oe421EPjeBE", type: "youtube", duration: "8h 16m" },
          { title: "Express.js Documentation", url: "https://expressjs.com/en/guide/routing.html", type: "article", platform: "Express Docs" },
        ],
        sections: [
          { id: "n1-a", title: "Express Setup & Routing Basics", type: "video", durationMinutes: 25, videoUrl: "https://www.youtube.com/watch?v=Oe421EPjeBE" },
          {
            id: "n1-b", title: "REST API Design & Middleware", type: "reading", durationMinutes: 30,
            content: `## Setting Up Express

\`\`\`typescript
import express, { Request, Response, NextFunction } from "express";
const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.listen(3001, () => console.log("Server running on :3001"));
\`\`\`

## Router Pattern

\`\`\`typescript
const router = Router();
router.get("/",    getUsers);
router.get("/:id", getUserById);
router.post("/",   createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
app.use("/api/users", router);
\`\`\`

## Middleware Chain

\`\`\`typescript
// Logger middleware
const logger = (req: Request, res: Response, next: NextFunction) => {
  console.log(\`\${req.method} \${req.path}\`);
  next(); // must call next() or request hangs
};

// Error handler — must have exactly 4 params, placed last
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: err.message });
};
\`\`\`

## Input Validation with Zod

\`\`\`typescript
const createUserSchema = z.object({
  name:  z.string().min(2).max(100),
  email: z.string().email(),
  age:   z.number().int().min(18).optional(),
});
\`\`\``,
          },
          {
            id: "n1-c", title: "Build a CRUD Blog Post API", type: "practice", durationMinutes: 15,
            content: `## Practice: Blog Post CRUD API

Implement these endpoints with proper status codes and validation:

\`\`\`
GET    /api/posts          — list all (with pagination ?page=1&limit=10)
GET    /api/posts/:id      — single post (404 if not found)
POST   /api/posts          — create (201, validate with Zod)
PUT    /api/posts/:id      — update (400 for invalid, 404 if missing)
DELETE /api/posts/:id      — delete (204 No Content)
\`\`\`

Each endpoint returns: \`{ data?, error?, message? }\``,
          },
          {
            id: "n1-d", title: "Express & REST Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What HTTP status code should a successful POST (create) return?`, options: ["200 OK", "201 Created", "204 No Content", "202 Accepted"], correct: 1, explanation: `201 Created indicates the request succeeded and a new resource was created.` },
          { question: `Purpose of \`next()\` in Express middleware?`, options: ["Ends request-response cycle", "Passes control to next middleware", "Redirects to next URL", "Retries the request"], correct: 1, explanation: `Calling next() tells Express to move on to the next middleware in the stack.` },
          { question: `Where should error-handling middleware be placed?`, options: ["At the top before routes", "After all routes at the bottom", "Anywhere", "Inside each route handler"], correct: 1, explanation: `Error-handling middleware with 4 params must be defined last, after all routes.` },
          { question: `What makes middleware an error handler in Express?`, options: ["Having 'error' in its name", "Using try-catch", "Having exactly 4 parameters (err, req, res, next)", "Calling res.status(500)"], correct: 2, explanation: `Express identifies error-handling middleware by the 4-argument signature — you must declare all 4.` },
            ],
          },
        ],
      },
      {
        id: "node-2", sessionNumber: 2, title: "Authentication & Security", estimatedMinutes: 90,
        resources: [
          { title: "JWT Authentication in Node.js", url: "https://www.youtube.com/watch?v=mbsmsi7l3r4", type: "youtube", duration: "1h 5m" },
          { title: "OWASP Authentication Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html", type: "article", platform: "OWASP" },
        ],
        sections: [
          { id: "n2-a", title: "JWT Auth Flow Deep Dive", type: "video", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=mbsmsi7l3r4" },
          {
            id: "n2-b", title: "JWT, Bcrypt & Auth Middleware", type: "reading", durationMinutes: 35,
            content: `## Bcrypt Password Hashing

\`\`\`typescript
import bcrypt from "bcrypt";
const SALT_ROUNDS = 12;
async function hashPassword(p: string)              { return bcrypt.hash(p, SALT_ROUNDS); }
async function verifyPassword(p: string, h: string) { return bcrypt.compare(p, h); }
\`\`\`

## JWT Tokens

\`\`\`typescript
import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET!;
function signToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "7d" });
}
function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { sub: string };
}
\`\`\`

## Auth Middleware

\`\`\`typescript
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const payload = verifyToken(token);
    (req as any).userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
\`\`\``,
          },
          {
            id: "n2-c", title: "Build a Complete Auth System", type: "practice", durationMinutes: 15,
            content: `## Practice: Complete Auth System

\`\`\`
POST /api/auth/register  — hash password, save, return token
POST /api/auth/login     — verify password, return token
GET  /api/auth/me        — protected, return current user
\`\`\`

Security checklist:
- ✅ bcrypt with ≥12 salt rounds
- ✅ JWT secret = 32+ random bytes
- ✅ Token expiry set (7d)
- ✅ Validate email format & password strength
- ✅ Never return password hash in response`,
          },
          {
            id: "n2-d", title: "Auth & Security Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Why should you never store passwords in plain text?`, options: ["Too much storage", "A DB breach exposes all user passwords immediately", "Slower to compare", "Regulations"], correct: 1, explanation: `Plain text passwords mean a single breach exposes every user's password. Bcrypt makes each hash unique and expensive to reverse.` },
          { question: `What are the three parts of a JWT?`, options: ["Username, password, expiry", "Header, payload, signature", "ID, claims, hash", "Type, data, timestamp"], correct: 1, explanation: `JWT = base64-encoded Header (algorithm) + Payload (claims) + Signature (verifies integrity).` },
          { question: `Where should you store JWTs on the frontend?`, options: ["localStorage", "sessionStorage", "httpOnly cookie to prevent XSS", "URL query string"], correct: 2, explanation: `httpOnly cookies cannot be read by JavaScript, protecting against XSS. localStorage is vulnerable.` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "python-programming",
    name: "Python Programming",
    shortName: "Python",
    description: "From Python basics to OOP, functional programming, and real-world scripting for automation.",
    level: "Beginner",
    estimatedHours: 16,
    skills: ["Python", "OOP", "Data Structures", "Scripting", "Automation", "File I/O"],
    tags: ["language", "backend", "data"],
    color: "bg-yellow-500",
    sessions: [
      {
        id: "py-1", sessionNumber: 1, title: "Python Basics", estimatedMinutes: 75,
        resources: [
          { title: "Python for Beginners – Full Course", url: "https://www.youtube.com/watch?v=eWRfhZUzrAc", type: "youtube", duration: "4h 26m" },
          { title: "Python Official Tutorial", url: "https://docs.python.org/3/tutorial/", type: "article", platform: "python.org" },
        ],
        sections: [
          { id: "p1-a", title: "Variables, Types & Control Flow", type: "video", durationMinutes: 25, videoUrl: "https://www.youtube.com/watch?v=eWRfhZUzrAc" },
          {
            id: "p1-b", title: "Lists, Dicts & Comprehensions", type: "reading", durationMinutes: 25,
            content: `## Lists

\`\`\`python
fruits = ["apple", "banana", "cherry"]
fruits[-1]       # "cherry" — negative index
fruits[1:3]      # ["banana", "cherry"] — slice
fruits.append("date")
fruits.sort()
\`\`\`

## Dictionaries

\`\`\`python
user = {"name": "Alice", "age": 30}
user.get("phone", "N/A")       # default if key missing
for key, value in user.items():
    print(f"{key}: {value}")
\`\`\`

## Comprehensions

\`\`\`python
squares = [n**2 for n in range(10)]
evens   = [n for n in range(20) if n % 2 == 0]
lengths = {word: len(word) for word in ["hello", "world"]}
\`\`\`

## Sets & Tuples

\`\`\`python
unique = {1, 2, 3, 2, 1}   # {1, 2, 3} — unique values
point  = (10, 20)           # immutable
x, y   = point              # unpacking
\`\`\``,
          },
          {
            id: "p1-c", title: "Functions & Lambdas", type: "practice", durationMinutes: 15,
            content: `## Functions & Lambdas

\`\`\`python
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"

def sum_all(*numbers):    # *args
    return sum(numbers)

def create_user(**kwargs): # **kwargs
    return {k: v for k, v in kwargs.items()}

double = lambda x: x * 2
sorted_users = sorted(users, key=lambda u: u["age"])
\`\`\`

**Practice Tasks:**
1. Write \`flatten(nested)\` converting \`[[1,2],[3,[4,5]]]\` → \`[1,2,3,4,5]\`
2. Use \`map()\` and \`filter()\` on a list of numbers
3. Build word-count dict: \`"hello world hello"\` → \`{"hello": 2, "world": 1}\``,
          },
          {
            id: "p1-d", title: "Python Basics Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What does \`fruits[-1]\` return for \`['apple', 'banana', 'cherry']\`?`, options: ["apple", "None", "cherry", "IndexError"], correct: 2, explanation: `Negative indices count from the end. -1 refers to the last element.` },
          { question: `Correct list comprehension for squaring even numbers 0-9?`, options: ["[n^2 for n in range(10) if n%2]", "[n**2 for n in range(10) if n%2 == 0]", "[n*n for n in range(10) where n is even]", "[(n**2) for (n) in range(10) if even(n)]"], correct: 1, explanation: `Python uses ** for exponentiation. \`n % 2 == 0\` checks for even numbers.` },
          { question: `Difference between list and tuple?`, options: ["Tuples store more items", "Lists are immutable, tuples mutable", "Tuples are immutable, lists mutable", "No difference"], correct: 2, explanation: `Tuples (parentheses) are immutable. Lists (brackets) are mutable — you can add, remove, change elements.` },
            ],
          },
        ],
      },
      {
        id: "py-2", sessionNumber: 2, title: "OOP in Python", estimatedMinutes: 85,
        resources: [
          { title: "Python OOP Full Tutorial", url: "https://www.youtube.com/watch?v=JeznW_7DlB0", type: "youtube", duration: "1h 56m" },
          { title: "Python Docs — Classes", url: "https://docs.python.org/3/tutorial/classes.html", type: "article", platform: "python.org" },
        ],
        sections: [
          { id: "p2-a", title: "Classes, Inheritance & Dunder Methods", type: "video", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=JeznW_7DlB0" },
          {
            id: "p2-b", title: "Decorators & Generators", type: "reading", durationMinutes: 30,
            content: `## Classes & Inheritance

\`\`\`python
class Animal:
    def __init__(self, name: str, sound: str):
        self.name  = name
        self._sound = sound  # _ = convention for private

    def speak(self) -> str:
        return f"{self.name} says {self._sound}"

    def __repr__(self) -> str:
        return f"Animal(name={self.name!r})"

class Dog(Animal):
    def __init__(self, name: str):
        super().__init__(name, "Woof")

dog = Dog("Rex")
print(dog.speak())  # Rex says Woof
\`\`\`

## Decorators

\`\`\`python
import functools, time

def timer(func):
    @functools.wraps(func)   # preserves original __name__, __doc__
    def wrapper(*args, **kwargs):
        start  = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.perf_counter()-start:.4f}s")
        return result
    return wrapper
\`\`\`

## Generators

\`\`\`python
def fibonacci():
    a, b = 0, 1
    while True:
        yield a        # pause and return value
        a, b = b, a + b

gen = fibonacci()
print([next(gen) for _ in range(8)])  # [0,1,1,2,3,5,8,13]
\`\`\``,
          },
          {
            id: "p2-c", title: "Build a BankAccount Class", type: "practice", durationMinutes: 15,
            content: `## Practice: BankAccount Class

1. Create \`BankAccount(owner, initial_balance)\`
2. Add \`deposit(amount)\` and \`withdraw(amount)\` methods
3. Add \`@property\` for \`balance\` (no direct assignment)
4. Create decorator \`@validate_amount\` that raises \`ValueError\` for negative values
5. Implement \`__str__\` and \`__repr__\`

**Bonus:** Add transaction history with timestamps.`,
          },
          {
            id: "p2-d", title: "OOP & Decorators Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What does \`super().__init__()\` do in a child class?`, options: ["Creates a new parent instance", "Calls the parent class __init__", "Deletes the parent class", "Makes the child abstract"], correct: 1, explanation: `super().__init__() calls the parent constructor, allowing you to reuse initialization logic.` },
          { question: `What is a generator in Python?`, options: ["Generates random numbers", "Uses yield to produce values one at a time lazily", "Creates objects", "Generates code"], correct: 1, explanation: `Generators use yield to produce values lazily — memory-efficient for large or infinite sequences.` },
          { question: `What does \`@functools.wraps(func)\` do in a decorator?`, options: ["Speeds up the function", "Preserves the wrapped function's metadata (name, docstring)", "Makes it thread-safe", "Adds type checking"], correct: 1, explanation: `Without @wraps, the decorator replaces __name__ and __doc__ with the wrapper's. @wraps copies them from the original.` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "sql-databases",
    name: "SQL & Database Design",
    shortName: "SQL",
    description: "Relational databases, complex queries, indexing strategies, and normalization for production systems.",
    level: "Beginner",
    estimatedHours: 12,
    skills: ["SQL", "PostgreSQL", "Database Design", "Indexing", "Query Optimization", "Normalization"],
    tags: ["backend", "database"],
    color: "bg-orange-500",
    sessions: [
      {
        id: "sql-1", sessionNumber: 1, title: "SQL Fundamentals", estimatedMinutes: 70,
        resources: [
          { title: "SQL Tutorial Full Database Course", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY", type: "youtube", duration: "4h 20m" },
          { title: "PostgreSQL Documentation", url: "https://www.postgresql.org/docs/current/tutorial.html", type: "article", platform: "PostgreSQL" },
        ],
        sections: [
          { id: "s1-a", title: "SELECT, JOIN & Aggregations", type: "video", durationMinutes: 25, videoUrl: "https://www.youtube.com/watch?v=HXV3zeQKqGY" },
          {
            id: "s1-b", title: "JOINs, Subqueries & CTEs", type: "reading", durationMinutes: 25,
            content: `## SELECT Fundamentals

\`\`\`sql
SELECT name, email
FROM   users
WHERE  age >= 18
ORDER  BY name ASC
LIMIT  10 OFFSET 20;

-- Aggregations
SELECT department, COUNT(*) AS count, AVG(salary) AS avg_salary
FROM   employees
GROUP  BY department
HAVING COUNT(*) > 5;
\`\`\`

## JOINs

\`\`\`sql
-- INNER JOIN — only matching rows
SELECT u.name, o.total
FROM   users u
JOIN   orders o ON u.id = o.user_id;

-- LEFT JOIN — all users, even those with no orders
SELECT u.name, COUNT(o.id) AS order_count
FROM   users u
LEFT   JOIN orders o ON u.id = o.user_id
GROUP  BY u.id, u.name;
\`\`\`

## CTEs — Common Table Expressions

\`\`\`sql
WITH high_value AS (
  SELECT user_id, SUM(total) AS ltv
  FROM   orders
  GROUP  BY user_id
  HAVING SUM(total) > 1000
)
SELECT u.name, hv.ltv
FROM   users u
JOIN   high_value hv ON u.id = hv.user_id
ORDER  BY hv.ltv DESC;
\`\`\``,
          },
          {
            id: "s1-c", title: "Write Complex Queries", type: "practice", durationMinutes: 10,
            content: `## Practice Queries

Given tables: \`users\`, \`orders\`, \`products\`, \`order_items\`

1. Find top 5 best-selling products by total quantity sold
2. Find users who ordered in last 30 days but NOT in the 30 days before that
3. Calculate month-over-month revenue growth as a percentage
4. Find users whose average order value is above the overall average

Hint: Use CTEs to break complex queries into readable steps.`,
          },
          {
            id: "s1-d", title: "SQL Fundamentals Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Difference between WHERE and HAVING?`, options: ["Interchangeable", "WHERE filters rows before grouping; HAVING filters groups after GROUP BY", "HAVING is faster", "WHERE on columns, HAVING on tables"], correct: 1, explanation: `WHERE filters rows before GROUP BY. HAVING filters aggregated groups — you cannot filter on COUNT(*) with WHERE.` },
          { question: `What does a LEFT JOIN return?`, options: ["Only matching rows from both tables", "All left-table rows plus matching right-table rows (NULL if no match)", "All right-table rows", "Only the intersection"], correct: 1, explanation: `LEFT JOIN returns ALL rows from the left table. Non-matching right columns are NULL.` },
          { question: `What is a CTE (Common Table Expression)?`, options: ["A type of JOIN", "Temporary named result set defined with WITH", "A stored procedure", "An index type"], correct: 1, explanation: `CTEs (WITH clause) create temporary named result sets that exist for the duration of the query.` },
            ],
          },
        ],
      },
      {
        id: "sql-2", sessionNumber: 2, title: "Database Design & Optimization", estimatedMinutes: 80,
        resources: [
          { title: "Database Design Full Course", url: "https://www.youtube.com/watch?v=ztHopE5Wnpc", type: "youtube", duration: "8h" },
          { title: "Use The Index, Luke", url: "https://use-the-index-luke.com/", type: "article", platform: "use-the-index-luke.com" },
        ],
        sections: [
          { id: "s2-a", title: "Normalization & ER Diagrams", type: "video", durationMinutes: 25, videoUrl: "https://www.youtube.com/watch?v=ztHopE5Wnpc" },
          {
            id: "s2-b", title: "Indexing Strategies & N+1 Problem", type: "reading", durationMinutes: 30,
            content: `## Normalization

- **1NF:** Each column holds atomic values; no repeating groups
- **2NF:** Non-key columns depend on the ENTIRE primary key
- **3NF:** No transitive dependencies (non-key depends on non-key)

## Indexing

\`\`\`sql
-- Basic index
CREATE INDEX idx_users_email ON users(email);

-- Composite index — column order matters!
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Partial index — only index relevant subset
CREATE INDEX idx_active_users ON users(email) WHERE active = true;

-- Always verify with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com';
\`\`\`

✅ **Do index:** columns in WHERE, JOIN ON, ORDER BY with high cardinality
❌ **Don't index:** small tables, boolean columns, rarely-queried columns

## The N+1 Problem

\`\`\`sql
-- ❌ N+1: 1 query + N more queries
SELECT * FROM users;        -- 100 users
-- then for EACH user:
SELECT * FROM orders WHERE user_id = ?;  -- 100 extra queries!

-- ✅ Fix with a single JOIN
SELECT u.*, o.*
FROM   users u
LEFT   JOIN orders o ON u.id = o.user_id;
\`\`\``,
          },
          {
            id: "s2-c", title: "E-commerce Schema Design", type: "practice", durationMinutes: 15,
            content: `## Practice: E-commerce Schema Design

Design fully normalized tables for:

- **Users** — auth info, profile, addresses
- **Products** — catalog, variants (size/color), pricing history
- **Orders** — cart → checkout → fulfillment status
- **Reviews** — ratings, comments, helpful votes

Requirements:
1. Products can belong to multiple categories (many-to-many)
2. Track every order status change with timestamps
3. Support product variants without schema duplication
4. Ensure 3NF — no redundant data`,
          },
          {
            id: "s2-d", title: "Database Design Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What problem does normalization solve?`, options: ["Faster queries", "Eliminates data redundancy and update/insert/delete anomalies", "Reduces storage", "Enables full-text search"], correct: 1, explanation: `Normalization removes redundant data and anomalies — updating one fact in many rows simultaneously.` },
          { question: `When should you create a database index?`, options: ["On every column", "On columns frequently used in WHERE or JOINs with high cardinality", "Only on primary keys", "When table has 100+ rows"], correct: 1, explanation: `Indexes speed reads but slow writes. Use on frequently filtered/joined columns with many unique values.` },
          { question: `What is the N+1 query problem?`, options: ["Table with N+1 columns", "One query for N records then N extra queries for each record's related data", "Joining N+1 tables", "An index with N+1 entries"], correct: 1, explanation: `N+1: fetch N items then make N separate queries for related data. Fix with JOINs or eager loading.` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "docker-devops",
    name: "Docker & CI/CD",
    shortName: "Docker/CI",
    description: "Containerization, Docker Compose, GitHub Actions pipelines, and deployment automation.",
    level: "Intermediate",
    estimatedHours: 14,
    skills: ["Docker", "CI/CD", "GitHub Actions", "DevOps", "Containerization", "Deployment"],
    tags: ["devops", "infrastructure"],
    color: "bg-sky-500",
    sessions: [
      {
        id: "docker-1", sessionNumber: 1, title: "Docker Fundamentals", estimatedMinutes: 80,
        resources: [
          { title: "Docker Tutorial for Beginners", url: "https://www.youtube.com/watch?v=3c-iBn73dDE", type: "youtube", duration: "3h 6m" },
          { title: "Docker Official Get Started", url: "https://docs.docker.com/get-started/", type: "article", platform: "Docker Docs" },
        ],
        sections: [
          { id: "d1-a", title: "Images, Containers & Volumes", type: "video", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=3c-iBn73dDE" },
          {
            id: "d1-b", title: "Dockerfile Best Practices & Compose", type: "reading", durationMinutes: 25,
            content: `## Core Concepts

- **Image** — read-only template (like a class)
- **Container** — running instance of an image (like an object)
- **Volume** — persistent storage that survives restarts
- **Network** — how containers communicate

## Multi-Stage Dockerfile

\`\`\`dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                  # copy deps first → better layer caching
COPY . .
RUN npm run build

# Stage 2: Production (only what's needed)
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
RUN adduser -S appuser
USER appuser                # never run as root!
EXPOSE 3001
CMD ["node", "dist/server.js"]
\`\`\`

## Docker Compose

\`\`\`yaml
services:
  api:
    build: .
    ports: ["3001:3001"]
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      retries: 5

volumes:
  postgres_data:
\`\`\``,
          },
          {
            id: "d1-c", title: "Containerize a Full-Stack App", type: "practice", durationMinutes: 15,
            content: `## Practice: Containerize a Full-Stack App

Dockerize an app with 4 services:
1. \`api\` — Node.js Express app
2. \`db\` — PostgreSQL with health check
3. \`redis\` — session/cache store
4. \`nginx\` — reverse proxy to api on port 80

Goals:
- \`docker compose up\` starts everything in correct order
- API waits for DB to be healthy before starting
- Data persists in named volumes between restarts
- Multi-stage build keeps image under 200MB`,
          },
          {
            id: "d1-d", title: "Docker Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Difference between a Docker image and a container?`, options: ["They are the same", "Image is a read-only template; container is a running instance", "Container is template; image is running", "Images for dev; containers for prod"], correct: 1, explanation: `Image = class (static blueprint). Container = object (live running instance created from image).` },
          { question: `Why copy package.json before source code in a Dockerfile?`, options: ["Docker requirement", "Leverage layer caching — deps change less than source code", "Alphabetical order", "Downloads packages faster"], correct: 1, explanation: `Docker caches each layer. Copying package.json first and running npm install caches that layer until deps change.` },
          { question: `What does \`depends_on\` in Docker Compose do?`, options: ["Shares a network", "Ensures service starts after its dependencies", "Copies files between services", "Links env vars"], correct: 1, explanation: `depends_on controls startup order. With service_healthy it waits for the health check to pass.` },
            ],
          },
        ],
      },
      {
        id: "docker-2", sessionNumber: 2, title: "CI/CD with GitHub Actions", estimatedMinutes: 85,
        resources: [
          { title: "GitHub Actions Full Course", url: "https://www.youtube.com/watch?v=R8_veQiYBjI", type: "youtube", duration: "1h 40m" },
          { title: "GitHub Actions Documentation", url: "https://docs.github.com/en/actions", type: "article", platform: "GitHub Docs" },
        ],
        sections: [
          { id: "d2-a", title: "Workflows, Triggers & Jobs", type: "video", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=R8_veQiYBjI" },
          {
            id: "d2-b", title: "Build a Full Deploy Pipeline", type: "reading", durationMinutes: 30,
            content: `## GitHub Actions Core Concepts

- **Workflow** — automated process in \`.github/workflows/*.yml\`
- **Trigger** — event that starts it (push, PR, schedule, tag)
- **Job** — steps running on the same runner
- **Step** — single task (run command or use action)

## Full Deploy Pipeline

\`\`\`yaml
name: Test, Build & Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci && npm run lint && npm test

  build-push:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKERHUB_USERNAME }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: myorg/myapp:\${{ github.sha }}

  deploy:
    needs: build-push
    environment: production
    steps:
      - name: SSH deploy
        uses: appleboy/ssh-action@v1
        with:
          host: \${{ secrets.SERVER_HOST }}
          key:  \${{ secrets.SSH_KEY }}
          script: docker compose pull && docker compose up -d
\`\`\``,
          },
          {
            id: "d2-c", title: "Complete Pipeline with Environments", type: "practice", durationMinutes: 15,
            content: `## Practice: Complete CI/CD Pipeline

Build a workflow that:

1. **Every PR:** run lint + type-check + tests in parallel
2. **Merge to main:** build Docker image, push to registry, deploy to staging automatically
3. **Release tag \`v*\`:** deploy to production with manual approval gate

Optimizations to add:
- Cache npm dependencies between runs
- Use \`paths-ignore\` to skip deploy when only docs changed
- Matrix strategy to test on Node 18 and 20`,
          },
          {
            id: "d2-d", title: "CI/CD Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Purpose of \`needs\` in a GitHub Actions workflow?`, options: ["Specifies required packages", "Job will not run until its needed jobs succeed", "Sets environment variables", "Specifies runner OS"], correct: 1, explanation: `needs creates a dependency graph. deploy: needs: [test, build] means deploy only runs if both succeed.` },
          { question: `How should you store API keys in GitHub Actions?`, options: ["Directly in YAML", "In .env committed to repo", "As encrypted Secrets via ${{ secrets.KEY_NAME }}", "In code comments"], correct: 2, explanation: `GitHub Secrets are encrypted and never appear in logs. Never commit secrets to the repository.` },
          { question: `What does \`cache: 'npm'\` in actions/setup-node do?`, options: ["Installs from local server", "Caches node_modules between workflow runs", "Disables npm updates", "Uses npm vs yarn"], correct: 1, explanation: `Caching reduces build time from ~2 minutes to ~30 seconds by reusing previously downloaded packages.` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "testing-strategies",
    name: "Testing Strategies",
    shortName: "Testing",
    description: "Unit, integration and E2E testing with Vitest, React Testing Library, and Playwright.",
    level: "Intermediate",
    estimatedHours: 16,
    skills: ["Testing", "Unit Testing", "Vitest", "Jest", "React Testing Library", "Playwright", "E2E Testing", "TDD"],
    tags: ["quality", "frontend", "backend"],
    color: "bg-emerald-500",
    sessions: [
      {
        id: "test-1", sessionNumber: 1, title: "Unit Testing with Vitest", estimatedMinutes: 80,
        resources: [
          { title: "Vitest Crash Course", url: "https://www.youtube.com/watch?v=7f-71kYhK00", type: "youtube", duration: "1h" },
          { title: "Vitest Documentation", url: "https://vitest.dev/guide/", type: "article", platform: "Vitest" },
        ],
        sections: [
          { id: "t1-a", title: "test() and expect() Patterns", type: "video", durationMinutes: 25, videoUrl: "https://www.youtube.com/watch?v=7f-71kYhK00" },
          {
            id: "t1-b", title: "Mocking & Test-Driven Development", type: "reading", durationMinutes: 30,
            content: `## Your First Tests

\`\`\`typescript
import { describe, it, expect, vi } from "vitest";

describe("Math utilities", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("throws on division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
  });
});
\`\`\`

## Mocking with vi

\`\`\`typescript
vi.mock("../services/emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

const mockFetch = vi.spyOn(global, "fetch").mockResolvedValue(
  new Response(JSON.stringify({ id: 1, name: "Alice" }))
);

afterEach(() => vi.restoreAllMocks());
\`\`\`

## TDD — Red → Green → Refactor

\`\`\`typescript
// Step 1: RED — write failing test
it("formats USD currency", () => {
  expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
});

// Step 2: GREEN — minimal implementation
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

// Step 3: REFACTOR — add edge cases and clean up
\`\`\``,
          },
          {
            id: "t1-c", title: "TDD Shopping Cart Workshop", type: "practice", durationMinutes: 15,
            content: `## Practice: TDD a Shopping Cart

Write tests FIRST, then implement \`ShoppingCart\`:

\`\`\`typescript
const cart = new ShoppingCart();
cart.addItem({ id: "1", name: "Widget", price: 9.99, quantity: 2 });
expect(cart.total()).toBe(19.98);
expect(cart.itemCount()).toBe(2);

cart.removeItem("1");
expect(cart.isEmpty()).toBe(true);

cart.addItem({ id: "1", name: "Widget", price: 9.99, quantity: 1 });
cart.applyDiscount(10);        // 10% off
expect(cart.total()).toBe(8.99);
\`\`\`

Each behavior = its own \`it()\` test. No implementation before the test exists.`,
          },
          {
            id: "t1-d", title: "Unit Testing Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Purpose of \`beforeEach\` in a test suite?`, options: ["Runs once before all tests in the file", "Runs before each individual test to reset state", "Imports dependencies", "Marks tests as important"], correct: 1, explanation: `beforeEach runs before every it() test, useful for resetting mocks and creating fresh instances.` },
          { question: `What does \`vi.mock()\` do?`, options: ["Creates a real implementation", "Replaces a module with an automatically mocked version", "Validates function parameters", "Runs the function in isolation"], correct: 1, explanation: `vi.mock() intercepts imports and replaces the module with configurable mock functions.` },
          { question: `Correct TDD order?`, options: ["Green → Red → Refactor", "Refactor → Red → Green", "Red → Green → Refactor", "Green → Refactor → Red"], correct: 2, explanation: `Red (write failing test) → Green (minimal implementation to pass) → Refactor (improve without breaking).` },
            ],
          },
        ],
      },
      {
        id: "test-2", sessionNumber: 2, title: "React Testing Library", estimatedMinutes: 85,
        resources: [
          { title: "React Testing Library Tutorial", url: "https://www.youtube.com/watch?v=7dTTFW7yACQ", type: "youtube", duration: "1h 15m" },
          { title: "Testing Library Documentation", url: "https://testing-library.com/docs/", type: "article", platform: "testing-library.com" },
        ],
        sections: [
          { id: "t2-a", title: "Render, Query & Fire Events", type: "video", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=7dTTFW7yACQ" },
          {
            id: "t2-b", title: "Async Testing & User Events", type: "reading", durationMinutes: 30,
            content: `## RTL Philosophy

Test how **users interact** — not implementation details.

\`\`\`typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("submits login form", async () => {
  const onSubmit = vi.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: /email/i }),    "alice@example.com");
  await user.type(screen.getByLabelText(/password/i),                  "secret");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: "alice@example.com",
    password: "secret",
  });
});
\`\`\`

## Async Testing

\`\`\`typescript
it("loads user data", async () => {
  vi.mocked(fetchUser).mockResolvedValue({ name: "Alice", role: "admin" });
  render(<UserProfile id="123" />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  const name = await screen.findByText("Alice");  // findBy* waits automatically
  expect(name).toBeInTheDocument();
});
\`\`\`

## Query Priority (use in this order)

1. \`getByRole\` — button, textbox, heading (most accessible)
2. \`getByLabelText\` — form elements
3. \`getByPlaceholderText\`
4. \`getByText\`
5. \`getByTestId\` — last resort`,
          },
          {
            id: "t2-c", title: "Test a Search Component", type: "practice", durationMinutes: 15,
            content: `## Practice: Test a Search Component

\`SearchBar\` component behavior to test:
1. Renders input and search button
2. Shows results list as user types (debounced 300ms)
3. Displays "No results found" when API returns empty array
4. Shows loading spinner while fetching
5. Shows error message when API throws

Mock the API with \`vi.mock()\`.
Use \`findBy*\` for async states, \`getBy*\` for synchronous ones.`,
          },
          {
            id: "t2-d", title: "React Testing Library Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Recommended primary query method in RTL?`, options: ["getByTestId", "getByClassName", "getByRole", "querySelector"], correct: 2, explanation: `getByRole queries by ARIA role — reflects how screen readers interact, making tests more accessible.` },
          { question: `Difference between \`getBy*\` and \`findBy*\` queries?`, options: ["findBy* is faster", "getBy* throws immediately if not found; findBy* returns a Promise and waits", "getBy* for text only, findBy* for roles", "They are identical"], correct: 1, explanation: `getBy* is synchronous and throws immediately. findBy* returns a Promise and waits — essential for async UI.` },
          { question: `Why does RTL discourage testing implementation details?`, options: ["Implementation tests are too slow", "Tests break on refactor even if behavior is correct — fragile tests add no value", "Style preference only", "Extra setup needed"], correct: 1, explanation: `Tests checking internal state break when you refactor, even if user-facing behavior stays correct.` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "git-version-control",
    name: "Git & Version Control",
    shortName: "Git",
    description: "Git workflows, branching strategies, rebasing, conflict resolution, and team collaboration.",
    level: "Beginner",
    estimatedHours: 8,
    skills: ["Git", "Version Control", "Branching", "Rebasing", "GitHub", "Pull Requests", "Code Review"],
    tags: ["tooling", "collaboration"],
    color: "bg-red-500",
    sessions: [
      {
        id: "git-1", sessionNumber: 1, title: "Git Core Concepts", estimatedMinutes: 70,
        resources: [
          { title: "Git and GitHub for Beginners – Crash Course", url: "https://www.youtube.com/watch?v=RGOj5yH7evk", type: "youtube", duration: "1h" },
          { title: "Pro Git Book (free)", url: "https://git-scm.com/book/en/v2", type: "article", platform: "git-scm.com" },
        ],
        sections: [
          { id: "g1-a", title: "Commits, Branches & Merging", type: "video", durationMinutes: 25, videoUrl: "https://www.youtube.com/watch?v=RGOj5yH7evk" },
          {
            id: "g1-b", title: "Rebase vs Merge & Power Commands", type: "reading", durationMinutes: 25,
            content: `## Core Workflow

\`\`\`bash
git init
git add .
git commit -m "feat: add login form"
git log --oneline --graph     # visualize history
git status                    # check working tree
\`\`\`

## Branching

\`\`\`bash
git checkout -b feature/user-auth   # create + switch
git checkout main
git merge feature/user-auth         # merge back
git branch -d feature/user-auth     # clean up
\`\`\`

## Rebase vs Merge

\`\`\`bash
# Merge — preserves history, adds a merge commit
git merge feature/login
# History: o---o---M

# Rebase — linear history, rewrites commit SHAs
git rebase main
# History: o---o---o

# Interactive rebase — clean up commits before PR
git rebase -i HEAD~3
\`\`\`

## Essential Commands

\`\`\`bash
git stash                  # save WIP, get clean working dir
git stash pop              # restore saved WIP
git cherry-pick abc123     # apply one specific commit
git reset --soft HEAD~1    # undo commit, keep changes staged
git revert abc123          # new commit that undoes abc123 (safe for shared branches)
\`\`\``,
          },
          {
            id: "g1-c", title: "Conflict Resolution Workshop", type: "practice", durationMinutes: 10,
            content: `## Practice: Hands-On Git

1. Create a repo with two branches that both modify the same file
2. Merge them and resolve the conflict manually
3. Visualize the result: \`git log --oneline --graph --all\`
4. Use interactive rebase to squash your last 3 commits into one
5. Simulate finding a bug: use \`git bisect\` to find which commit broke a test`,
          },
          {
            id: "g1-d", title: "Git Core Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Difference between \`git merge\` and \`git rebase\`?`, options: ["Identical", "Merge preserves history with merge commit; rebase rewrites for linear history", "Rebase is safer than merge", "Merge only works on main branch"], correct: 1, explanation: `Merge creates a merge commit preserving branch history. Rebase replays commits for a cleaner linear history but rewrites SHA hashes.` },
          { question: `What does \`git stash\` do?`, options: ["Deletes unstaged changes", "Temporarily saves uncommitted changes to a stack so you can switch branches", "Commits with 'stash' message", "Creates a backup branch"], correct: 1, explanation: `git stash saves WIP changes to a temporary stack, giving you a clean working directory.` },
          { question: `What does \`git reset --soft HEAD~1\` do?`, options: ["Deletes last commit permanently", "Undoes last commit but keeps changes staged", "Moves HEAD back and discards all changes", "Resets to initial commit"], correct: 1, explanation: `--soft moves HEAD back one commit but leaves changes in the staging area — use to redo a commit.` },
            ],
          },
        ],
      },
      {
        id: "git-2", sessionNumber: 2, title: "Team Workflows & Code Review", estimatedMinutes: 65,
        resources: [
          { title: "GitHub Pull Request Tutorial", url: "https://www.youtube.com/watch?v=8lGpZkjnkt4", type: "youtube", duration: "45m" },
          { title: "GitHub Flow Guide", url: "https://guides.github.com/introduction/flow/", type: "article", platform: "GitHub" },
        ],
        sections: [
          { id: "g2-a", title: "GitHub Flow & PR Reviews", type: "video", durationMinutes: 20, videoUrl: "https://www.youtube.com/watch?v=8lGpZkjnkt4" },
          {
            id: "g2-b", title: "Conventional Commits & PR Best Practices", type: "reading", durationMinutes: 25,
            content: `## Conventional Commits

Structured messages that power changelogs and semantic versioning:

\`\`\`
feat(auth):     add Google OAuth login
fix(cart):      correct total calculation on discount
docs(api):      update endpoint documentation
refactor(user): extract validation to separate module
test(login):    add edge cases for password validation
chore(deps):    upgrade React to 18.3
perf(query):    add index to speed up user lookup
\`\`\`

Types: \`feat\`, \`fix\`, \`docs\`, \`style\`, \`refactor\`, \`test\`, \`chore\`, \`perf\`

## Branch Naming

\`\`\`bash
feature/user-authentication
fix/login-redirect-loop
hotfix/payment-null-pointer
release/v2.3.0
docs/update-api-reference
\`\`\`

## What Makes a Good PR

- **What** changed and **Why** (not just "fix bug")
- Screenshots for any UI changes
- Steps for reviewer to test locally
- Link to related issue/ticket

## Code Review Checklist

- ✅ Logic is correct and handles edge cases
- ✅ Tests cover the changes
- ✅ No security vulnerabilities (SQL injection, XSS, secrets in code)
- ✅ Performance implications considered
- ✅ Follows project conventions`,
          },
          {
            id: "g2-c", title: "Full PR Workflow Simulation", type: "practice", durationMinutes: 10,
            content: `## Practice: Full PR Workflow

1. Fork a public GitHub repository
2. Clone your fork locally
3. Create a feature branch: \`feature/your-improvement\`
4. Make at least 3 commits following Conventional Commits format
5. Push and open a Pull Request with a clear description
6. Review a classmate's PR — leave 2 constructive comments
7. Address the review comments on your own PR and push updates
8. Merge after approval with squash-merge for a clean history`,
          },
          {
            id: "g2-d", title: "Team Workflow Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Correct Conventional Commit format for a new feature?`, options: ["NEW: add profile page", "feature(profile): add profile", "feat(profile): add user profile page", "add: profile page"], correct: 2, explanation: `Use 'feat' (not 'feature'). Format: type(scope): description in lowercase.` },
          { question: `When should you open a Pull Request?`, options: ["Only when 100% complete", "Early as a Draft PR for feedback, then ready for review when complete", "Only after all tests pass", "After merging to main first"], correct: 1, explanation: `Draft PRs enable early async feedback. Convert to ready when the feature is done and tests pass.` },
          { question: `What should a good PR description include?`, options: ["Only a list of changed files", "What changed, why it changed, screenshots for UI, and testing steps", "The full git diff", "Only a link to the Jira ticket"], correct: 1, explanation: `Good PR descriptions help reviewers understand context — what problem, why this approach, how to verify.` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "aws-cloud",
    name: "AWS Cloud Fundamentals",
    shortName: "AWS",
    description: "Core AWS services: EC2, S3, Lambda, RDS, and infrastructure-as-code with CloudFormation.",
    level: "Intermediate",
    estimatedHours: 18,
    skills: ["AWS", "Cloud Computing", "EC2", "S3", "Lambda", "Serverless", "CloudFormation", "IAM"],
    tags: ["cloud", "infrastructure", "devops"],
    color: "bg-amber-500",
    sessions: [
      {
        id: "aws-1", sessionNumber: 1, title: "Core AWS Services", estimatedMinutes: 90,
        resources: [
          { title: "AWS Cloud Practitioner Essentials", url: "https://www.youtube.com/watch?v=SOTamWNgDKc", type: "youtube", duration: "14h" },
          { title: "AWS Documentation Hub", url: "https://docs.aws.amazon.com/", type: "article", platform: "AWS Docs" },
        ],
        sections: [
          { id: "a1-a", title: "IAM, EC2 & S3 Overview", type: "video", durationMinutes: 35, videoUrl: "https://www.youtube.com/watch?v=SOTamWNgDKc" },
          {
            id: "a1-b", title: "IAM Policies, EC2 Types & S3 Deep Dive", type: "reading", durationMinutes: 35,
            content: `## IAM — Identity & Access Management

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect":   "Allow",
    "Action":   ["s3:GetObject", "s3:ListBucket"],
    "Resource": ["arn:aws:s3:::my-bucket/*"]
  }]
}
\`\`\`

**Principle of Least Privilege** — only grant permissions actually needed.

## EC2 Instance Types

| Type | Use Case |
|---|---|
| \`t3.micro\` | Burstable, cheapest — dev/test |
| \`m5.large\` | General purpose — balanced CPU/RAM |
| \`c5.xlarge\` | Compute optimized — ML inference, video |
| \`r5.large\` | Memory optimized — databases, caches |

## S3

\`\`\`bash
# Upload
aws s3 cp local-file.zip s3://my-bucket/backups/

# Sync entire directory
aws s3 sync ./dist s3://my-bucket/ --delete

# Enable static website hosting
aws s3 website s3://my-bucket/ --index-document index.html
\`\`\`

Storage classes (most → least expensive): Standard → Standard-IA → Glacier`,
          },
          {
            id: "a1-c", title: "Deploy a Node.js App on EC2", type: "practice", durationMinutes: 10,
            content: `## Practice: Deploy Node.js on EC2

1. Launch t3.micro EC2 (Amazon Linux 2)
2. Configure Security Group: SSH port 22, HTTP port 80
3. SSH in and install Node.js 20 via NodeSource
4. Clone your app, install deps, start with PM2
5. Install Nginx and configure as reverse proxy to port 3001
6. Upload a static asset to S3 and serve it via CloudFront

Expected result: \`http://your-ec2-ip\` serves your app over Nginx.`,
          },
          {
            id: "a1-d", title: "AWS Core Services Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What does the Principle of Least Privilege mean in AWS IAM?`, options: ["Give all users admin for simplicity", "Grant only the minimum permissions necessary for a task", "Use the same policy for all users", "Avoid using IAM roles"], correct: 1, explanation: `Least privilege reduces blast radius if credentials are compromised — grant only what is needed.` },
          { question: `What is an S3 bucket?`, options: ["A virtual machine container", "A globally unique namespace for storing objects in AWS", "A relational database", "A serverless function container"], correct: 1, explanation: `S3 buckets store objects of any type. Globally unique names, configurable policies, virtually unlimited storage.` },
          { question: `Best EC2 instance type for CPU-intensive ML workload?`, options: ["t3.micro — burstable, cheapest", "r5.large — memory optimized", "c5.xlarge — compute optimized", "m5.large — general purpose"], correct: 2, explanation: `C-series instances have higher CPU-to-RAM ratios, ideal for compute-intensive ML inference and encoding.` },
            ],
          },
        ],
      },
      {
        id: "aws-2", sessionNumber: 2, title: "Serverless & Lambda", estimatedMinutes: 85,
        resources: [
          { title: "AWS Lambda & API Gateway Full Course", url: "https://www.youtube.com/watch?v=EBSdyoO3goc", type: "youtube", duration: "1h 30m" },
          { title: "Serverless Framework Documentation", url: "https://www.serverless.com/framework/docs/", type: "article", platform: "Serverless" },
        ],
        sections: [
          { id: "a2-a", title: "Lambda, API Gateway & DynamoDB", type: "video", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=EBSdyoO3goc" },
          {
            id: "a2-b", title: "Serverless API Architecture", type: "reading", durationMinutes: 30,
            content: `## Lambda Handler

\`\`\`typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { id } = event.pathParameters ?? {};
  if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Missing id" }) };

  const user = await getUserFromDB(id);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  };
};
\`\`\`

## Serverless Framework Config

\`\`\`yaml
service: my-api
provider: { name: aws, runtime: nodejs20.x, region: ap-southeast-1 }
functions:
  getUser:
    handler: src/users.handler
    events:
      - httpApi: { path: /users/{id}, method: GET }
\`\`\`

## Cold Start Optimization

\`\`\`typescript
// ✅ Initialize OUTSIDE handler — reused between warm invocations
const db = new DatabaseClient(process.env.DATABASE_URL);

export const handler = async (event: APIGatewayProxyEvent) => {
  // db is already connected — no reconnection overhead
  const result = await db.query("SELECT * FROM users");
  return { statusCode: 200, body: JSON.stringify(result) };
};
\`\`\``,
          },
          {
            id: "a2-c", title: "Build & Deploy a Serverless Notes API", type: "practice", durationMinutes: 15,
            content: `## Practice: Serverless Notes API

Build and deploy a complete serverless API:

\`\`\`
POST   /notes         — createNote
GET    /notes         — listNotes (with pagination)
GET    /notes/{id}    — getNote (404 if not found)
PUT    /notes/{id}    — updateNote
DELETE /notes/{id}    — deleteNote
\`\`\`

Stack: **Lambda** + **API Gateway** + **DynamoDB** + **Serverless Framework**

Deploy to AWS and test every endpoint with curl or Postman.`,
          },
          {
            id: "a2-d", title: "Serverless & Lambda Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What is a Lambda cold start?`, options: ["Lambda runs in a cold region", "Initialization delay when Lambda runs for the first time or after being idle", "Connecting to a cold database", "An untested Lambda function"], correct: 1, explanation: `Cold starts happen when Lambda initializes a new execution environment — downloading code and starting the runtime.` },
          { question: `Maximum Lambda execution timeout?`, options: ["30 seconds", "5 minutes", "15 minutes", "1 hour"], correct: 2, explanation: `Lambda has a 15-minute maximum timeout. Use Step Functions or ECS for longer-running tasks.` },
          { question: `Why initialize DB connections outside the Lambda handler?`, options: ["AWS security requirement", "Connections outside handler are reused between warm invocations reducing latency", "Connections inside handler are blocked", "Reduces memory usage"], correct: 1, explanation: `Lambda reuses execution environments. Code outside the handler runs only during cold starts — DB connections persist.` },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "system-design",
    name: "System Design",
    shortName: "System Design",
    description: "Design scalable distributed systems: load balancing, caching, message queues, and microservices.",
    level: "Advanced",
    estimatedHours: 20,
    skills: ["System Design", "Microservices", "Load Balancing", "Caching", "Message Queues", "Distributed Systems", "Scalability"],
    tags: ["architecture", "backend"],
    color: "bg-violet-500",
    sessions: [
      {
        id: "sd-1", sessionNumber: 1, title: "Scalability Fundamentals", estimatedMinutes: 90,
        resources: [
          { title: "System Design Interview – Step by Step Guide", url: "https://www.youtube.com/watch?v=i53Gi_K3o7I", type: "youtube", duration: "1h 10m" },
          { title: "System Design Primer on GitHub", url: "https://github.com/donnemartin/system-design-primer", type: "article", platform: "GitHub" },
        ],
        sections: [
          { id: "sd1-a", title: "Horizontal vs Vertical Scaling", type: "video", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=i53Gi_K3o7I" },
          {
            id: "sd1-b", title: "Load Balancing & CAP Theorem", type: "reading", durationMinutes: 35,
            content: `## Scaling Strategies

**Vertical (Scale Up):** More CPU/RAM on one machine
- ✅ Simple, no code changes
- ❌ Hardware limits, single point of failure

**Horizontal (Scale Out):** More machines
- ✅ Unlimited scale, built-in redundancy
- ❌ Requires distributed systems thinking

## Load Balancing Algorithms

| Algorithm | When to Use |
|---|---|
| Round Robin | Equal servers, stateless apps |
| Least Connections | Variable request durations |
| IP Hash | Session affinity required (WebSockets) |
| Weighted | Mixed server capacities |

## CAP Theorem

A distributed system can only guarantee **2 of 3**:

- **C**onsistency — all nodes see same data at same time
- **A**vailability — every request gets a response
- **P**artition Tolerance — works despite network failures

Since network partitions happen in practice, choose **CP or AP**:

| Database | Type | Trade-off |
|---|---|---|
| PostgreSQL | CP | Consistent, may be unavailable during partition |
| Cassandra | AP | Always available, eventually consistent |
| DynamoDB | AP | Always available, eventually consistent |`,
          },
          {
            id: "sd1-c", title: "Design a URL Shortener", type: "practice", durationMinutes: 15,
            content: `## Practice: Design a URL Shortener

System: 100M URLs stored, 10:1 read/write ratio, global users.

Answer these design questions:

1. **Code generation:** How to create unique 6-char codes? (hash vs counter vs random)
2. **Database:** SQL vs NoSQL — which and why?
3. **Caching:** Where to add Redis? What key-value to cache?
4. **Scale:** How to handle 10,000 redirects/second?
5. **Global:** How to reduce latency for users worldwide? (CDN?)

Draw the architecture diagram including: client, DNS, CDN, load balancer, API servers, Redis cache, primary DB, read replicas.`,
          },
          {
            id: "sd1-d", title: "Scalability Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `Main advantage of horizontal over vertical scaling?`, options: ["Always cheaper", "Eliminates single points of failure and scales without hardware limits", "Requires no code changes", "Faster to implement"], correct: 1, explanation: `Horizontal adds machines providing redundancy (no SPOF) and theoretically unlimited scale.` },
          { question: `What does Partition Tolerance mean in CAP?`, options: ["Can partition data across disks", "System works even if network communication between nodes fails", "Tolerates slow queries", "Data can be split across tables"], correct: 1, explanation: `P means the system functions during network partition. Since partitions happen in practice, P is usually given — choose C or A.` },
          { question: `Which load balancing algorithm keeps the same user on the same server?`, options: ["Round Robin", "Least Connections", "IP Hash (sticky sessions)", "Random"], correct: 2, explanation: `IP Hash maps client IP to a specific server consistently — useful for WebSockets and session-heavy apps.` },
            ],
          },
        ],
      },
      {
        id: "sd-2", sessionNumber: 2, title: "Caching & Message Queues", estimatedMinutes: 85,
        resources: [
          { title: "Redis Crash Course", url: "https://www.youtube.com/watch?v=jgpVdJB2sKQ", type: "youtube", duration: "1h" },
          { title: "Kafka in 100 Seconds", url: "https://www.youtube.com/watch?v=uvb00oaa3k8", type: "youtube", duration: "5m" },
        ],
        sections: [
          { id: "sd2-a", title: "Redis Caching Patterns Deep Dive", type: "video", durationMinutes: 30, videoUrl: "https://www.youtube.com/watch?v=jgpVdJB2sKQ" },
          {
            id: "sd2-b", title: "Cache Invalidation & Message Queue Design", type: "reading", durationMinutes: 30,
            content: `## Caching Patterns

### Cache-Aside (Lazy Loading)

\`\`\`typescript
async function getUser(id: string): Promise<User> {
  // 1. Check cache first
  const cached = await redis.get(\`user:\${id}\`);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss — fetch from DB
  const user = await db.users.findById(id);

  // 3. Store with TTL
  await redis.setex(\`user:\${id}\`, 3600, JSON.stringify(user));
  return user;
}

// Invalidate on update
async function updateUser(id: string, data: Partial<User>) {
  await db.users.update(id, data);
  await redis.del(\`user:\${id}\`);  // explicit invalidation
}
\`\`\`

## Message Queues

\`\`\`
User places order
      ↓
Order Service → Message Queue → Email Service (async)
                              → Inventory Service (async)
                              → Analytics Service (async)
\`\`\`

**Benefits:** decouple services, absorb traffic spikes, automatic retries.

## Kafka vs RabbitMQ

| | Kafka | RabbitMQ |
|---|---|---|
| Model | Log-based (replay from offset) | Queue-based (delete on ack) |
| Throughput | Millions/sec | Thousands/sec |
| Best for | Event streaming, audit logs | Task queues, RPC |
| Message retention | Days/weeks (configurable) | Until consumed |`,
          },
          {
            id: "sd2-c", title: "Design a Notification System", type: "practice", durationMinutes: 15,
            content: `## Practice: Design a Notification System

10M users. Send notifications via email, SMS, and push for events (order placed, payment failed, promo).

Design decisions:
1. **Message queue:** Kafka, RabbitMQ, or AWS SQS — which and why?
2. **Retry logic:** How to handle failed deliveries? (exponential backoff)
3. **Idempotency:** How to prevent sending duplicate notifications?
4. **Scale:** How to process 1M notifications/hour?
5. **User preferences:** Users can disable specific channels — where to store and check this?

Draw the full architecture diagram.`,
          },
          {
            id: "sd2-d", title: "Caching & Message Queues Quiz", type: "quiz", durationMinutes: 10,
            quiz: [
          { question: `What is the Cache-Aside pattern?`, options: ["Cache everything proactively on startup", "App checks cache first; on miss fetches from DB and populates cache", "Write to cache only, never DB", "Never invalidate the cache"], correct: 1, explanation: `Cache-Aside (lazy loading) only caches data when requested. The application manages the cache lifecycle.` },
          { question: `What problem do message queues solve?`, options: ["Make queries faster", "Decouple services, absorb traffic spikes, and enable async processing", "Replace databases", "Used only for notifications"], correct: 1, explanation: `Queues let producers publish without waiting for consumers. Decouples services, handles traffic bursts, enables retries.` },
          { question: `Why is cache invalidation considered hard?`, options: ["Clearing all caches is trivial", "Determining when data is stale in a distributed system with no single source of truth", "Just a cache algorithm type", "Preventing cache from being filled"], correct: 1, explanation: `'Two hard things: cache invalidation and naming things.' Distributed caches need changes to propagate consistently across multiple nodes.` },
            ],
          },
        ],
      },
    ],
  },
];

export const getCourseById = (id: string) => ALL_COURSES.find(c => c.id === id);

export const getCoursesForGaps = (gaps: string[]): Course[] => {
  const norm = gaps.map(g => g.toLowerCase());
  return ALL_COURSES.filter(course =>
    norm.some(gap =>
      course.skills.some(s => s.toLowerCase().includes(gap) || gap.includes(s.toLowerCase())) ||
      course.name.toLowerCase().includes(gap)
    )
  );
};

export const getCourseSummaryForAI = () =>
  ALL_COURSES.map(c => ({
    id: c.id, name: c.name, level: c.level, hours: c.estimatedHours, skills: c.skills,
    sessions: c.sessions.map(s => ({ id: s.id, title: s.title, mins: s.estimatedMinutes })),
  }));