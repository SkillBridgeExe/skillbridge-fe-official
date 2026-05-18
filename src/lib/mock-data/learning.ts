// ─── Learning Page Mock Data ────────────────────────────────────────────────

export interface LearningProgress {
  totalDays: number;
  remainingDays: number;
  totalStars: number;
  earnedStars: number;
  maxStarsPerUnit: number;
  completedUnits: number;
  plannedUnits: number;
  totalUnits: number;
  isOnTrack: boolean;
  currentStreak: number;
}

export interface LearningNudge {
  id: string;
  type: "encouragement" | "warning" | "tip";
  text: string;
}

export const MOCK_LEARNING_PROGRESS: LearningProgress = {
  totalDays: 42,
  remainingDays: 30,
  totalStars: 55,
  earnedStars: 17,
  maxStarsPerUnit: 5,
  completedUnits: 5,
  plannedUnits: 6,
  totalUnits: 11,
  isOnTrack: false,
  currentStreak: 4,
};

export const MOCK_LEARNING_NUDGES: LearningNudge[] = [
  {
    id: "n1",
    type: "encouragement",
    text: "Wow! You have a session to complete today. Keep it up! 💪",
  },
  {
    id: "n2",
    type: "warning",
    text: "You are falling behind the schedule. Try to catch up to reach your goal on time!",
  },
  {
    id: "n3",
    type: "tip",
    text: "Tip: Reviewing yesterday's lesson before starting a new one helps with long-term retention 🧠",
  },
];

// Skill color map for badges
export const SKILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TypeScript:         { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  React:              { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200" },
  "State Management": { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
  Testing:            { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
  DevOps:             { bg: "bg-slate-50",   text: "text-slate-700",   border: "border-slate-200" },
  "System Design":    { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
};
