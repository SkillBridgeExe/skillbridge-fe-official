// Mock data cho Dashboard
// ─────────────────────────────────────────

export interface DashboardUser {
  name: string;
  avatar?: string;
  careerGoal: string;
  cvMatchScore: number;
  skillMatchScore: number;
  memberSince: string;
}

export interface DashboardStat {
  label: string;
  value: string | number;
  icon: string; // lucide icon name
  color: string;
  trend?: { value: number; isUp: boolean };
}

export interface SkillCategory {
  name: string;
  score: number;
  fullMark: number;
}

export interface SkillProgress {
  name: string;
  category: string;
  level: number; // 0-100
  color: string;
}

export interface HeatmapDay {
  date: string;
  minutes: number;
}

export interface LearningHistoryEntry {
  id: string;
  date: string;
  type: "lesson" | "quiz" | "module_complete" | "cv_scan";
  title: string;
  subtitle: string;
  score?: number;
  stars?: number; // 1-3
}

export interface CourseProgress {
  id: string;
  title: string;
  progress: number; // 0-100
  totalUnits: number;
  completedUnits: number;
  status: "active" | "completed" | "not_started";
}

export interface ModuleProgress {
  notStarted: number;
  inProgress: number;
  completed: number;
  total: number;
}

// ─── User ────────────────────────────────
export const MOCK_USER: DashboardUser = {
  name: "Hoàng Long Anh",
  avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=HoangLongAnh&backgroundColor=b6e3f4",
  careerGoal: "Senior Frontend Engineer",
  cvMatchScore: 65,
  skillMatchScore: 72,
  memberSince: "2026-01-15",
};

// ─── Stats ───────────────────────────────
export const MOCK_STATS: DashboardStat[] = [
  { label: "Total Learning Hours", value: "48h", icon: "Clock", color: "primary", trend: { value: 12, isUp: true } },
  { label: "Mastered Skills", value: 8, icon: "Award", color: "emerald", trend: { value: 2, isUp: true } },
  { label: "Active Modules", value: 3, icon: "BookOpen", color: "amber", trend: { value: 1, isUp: true } },
  { label: "Practice Exercises", value: 12, icon: "FileCheck", color: "blue", trend: { value: 5, isUp: true } },
];

// ─── Radar Chart ─────────────────────────
export const MOCK_SKILL_CATEGORIES: SkillCategory[] = [
  { name: "Frontend", score: 85, fullMark: 100 },
  { name: "Backend", score: 45, fullMark: 100 },
  { name: "DevOps", score: 30, fullMark: 100 },
  { name: "Design", score: 60, fullMark: 100 },
  { name: "Soft Skills", score: 70, fullMark: 100 },
  { name: "Problem Solving", score: 75, fullMark: 100 },
];

// ─── Skill Bars ──────────────────────────
export const MOCK_SKILLS: SkillProgress[] = [
  { name: "React / Next.js", category: "Frontend", level: 92, color: "bg-emerald-500" },
  { name: "TypeScript", category: "Frontend", level: 85, color: "bg-primary" },
  { name: "Tailwind CSS", category: "Frontend", level: 88, color: "bg-cyan-500" },
  { name: "Node.js / Express", category: "Backend", level: 55, color: "bg-amber-500" },
  { name: "PostgreSQL", category: "Backend", level: 40, color: "bg-orange-500" },
  { name: "System Design", category: "Backend", level: 35, color: "bg-red-400" },
  { name: "Docker", category: "DevOps", level: 30, color: "bg-blue-500" },
  { name: "CI/CD", category: "DevOps", level: 25, color: "bg-violet-500" },
  { name: "UI/UX Principles", category: "Design", level: 65, color: "bg-pink-500" },
  { name: "Figma", category: "Design", level: 50, color: "bg-fuchsia-500" },
];

// ─── Skill Growth Over Time (weekly) ─────
export const MOCK_SKILL_GROWTH = [
  { week: "W1", frontend: 70, backend: 30, devops: 10 },
  { week: "W2", frontend: 75, backend: 32, devops: 12 },
  { week: "W3", frontend: 78, backend: 38, devops: 15 },
  { week: "W4", frontend: 82, backend: 42, devops: 20 },
  { week: "W5", frontend: 85, backend: 45, devops: 25 },
  { week: "W6", frontend: 88, backend: 48, devops: 30 },
];

// ─── Heatmap ─────────────────────────────
function generateHeatmapData(): HeatmapDay[] {
  const data: HeatmapDay[] = [];
  const now = new Date();
  for (let i = 182; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    // Simulate: more likely to study on weekdays
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const rand = Math.random();
    let minutes = 0;
    if (rand > 0.35) {
      minutes = isWeekday
        ? Math.floor(Math.random() * 120) + 15
        : Math.floor(Math.random() * 60);
    }
    data.push({
      date: d.toISOString().split("T")[0],
      minutes,
    });
  }
  return data;
}

export const MOCK_HEATMAP_DATA = generateHeatmapData();

// ─── Learning History ────────────────────
export const MOCK_LEARNING_HISTORY: LearningHistoryEntry[] = [
  { id: "1", date: "2026-03-05", type: "lesson", title: "React Performance Optimization", subtitle: "Advanced React Module", score: 92, stars: 3 },
  { id: "2", date: "2026-03-05", type: "quiz", title: "TypeScript Generics Quiz", subtitle: "Advanced TypeScript Module", score: 85, stars: 2 },
  { id: "3", date: "2026-03-04", type: "lesson", title: "useMemo & useCallback Deep Dive", subtitle: "React Performance Module", score: 78, stars: 2 },
  { id: "4", date: "2026-03-03", type: "module_complete", title: "Advanced TypeScript Patterns", subtitle: "Completed all 4 topics", stars: 3 },
  { id: "5", date: "2026-03-02", type: "cv_scan", title: "CV Analysis Completed", subtitle: "12 skills detected, 4 gaps identified" },
  { id: "6", date: "2026-03-01", type: "lesson", title: "Discriminated Unions", subtitle: "Advanced TypeScript Module", score: 95, stars: 3 },
  { id: "7", date: "2026-02-28", type: "quiz", title: "CSS Grid & Flexbox Quiz", subtitle: "Frontend Fundamentals", score: 70, stars: 2 },
  { id: "8", date: "2026-02-27", type: "lesson", title: "Utility Types in TypeScript", subtitle: "Advanced TypeScript Module", score: 88, stars: 3 },
];

// ─── Course Progress ─────────────────────
export const MOCK_COURSES: CourseProgress[] = [
  { id: "c1", title: "Advanced TypeScript", progress: 100, totalUnits: 12, completedUnits: 12, status: "completed" },
  { id: "c2", title: "React Performance", progress: 58, totalUnits: 10, completedUnits: 6, status: "active" },
  { id: "c3", title: "State Management", progress: 20, totalUnits: 8, completedUnits: 2, status: "active" },
  { id: "c4", title: "Testing with Vitest", progress: 0, totalUnits: 10, completedUnits: 0, status: "not_started" },
  { id: "c5", title: "System Design 101", progress: 0, totalUnits: 14, completedUnits: 0, status: "not_started" },
  { id: "c6", title: "Docker Fundamentals", progress: 0, totalUnits: 8, completedUnits: 0, status: "not_started" },
];

// ─── Module Progress Summary ─────────────
export const MOCK_MODULE_PROGRESS: ModuleProgress = {
  notStarted: 3,
  inProgress: 2,
  completed: 1,
  total: 6,
};

// ─── Roadmap Nodes ───────────────────────
export const MOCK_ROADMAP_NODES = [
  { status: "completed" as const, week: "Week 1", title: "Core JS Refresher" },
  { status: "completed" as const, week: "Week 2", title: "Advanced TypeScript" },
  { status: "in_progress" as const, week: "Week 3", title: "React Performance" },
  { status: "pending" as const, week: "Week 4", title: "State Management" },
  { status: "pending" as const, week: "Week 5", title: "Testing Strategies" },
  { status: "locked" as const, week: "Final", title: "System Design" },
];

// ─── Recommendations ─────────────────────
export const MOCK_RECOMMENDATIONS = [
  { title: "Improve Cloud Skills", description: "Learn AWS basics to increase match score by 12%", type: "critical" as const },
  { title: "Mock Interview Ready", description: "You qualify for advanced practice sessions.", type: "success" as const },
  { title: "New Resource Available", description: "System Design patterns — Martin Kleppmann", type: "info" as const },
];

// ─── Study Plan (Prep-style) ─────────────
export interface StudyPlan {
  name: string;
  level: string;
  isActive: boolean;
  totalCups: number;
  maxCups: number;
  cupThreshold: number; // units with >= this many cups
  unitsWith2Cups: number;
  totalUnits: number;
}

export const MOCK_STUDY_PLAN: StudyPlan = {
  name: "Frontend Career Path",
  level: "Intermediate",
  isActive: true,
  totalCups: 218,
  maxCups: 714,
  cupThreshold: 2,
  unitsWith2Cups: 81,
  totalUnits: 81,
};

// ─── Weekly Avg Scores (like Prep IELTS cards) ──
export interface WeeklySkillScore {
  name: string;
  icon: string; // Lucide icon name
  score: number | null;
  testsCompleted: number;
  trend?: { value: number; isUp: boolean };
}

export const MOCK_WEEKLY_SCORES: WeeklySkillScore[] = [
  { name: "Frontend", icon: "Monitor", score: 77, testsCompleted: 4, trend: { value: 5, isUp: true } },
  { name: "Backend", icon: "Database", score: 62, testsCompleted: 3, trend: { value: 2, isUp: true } },
  { name: "System Design", icon: "ServerCog", score: null, testsCompleted: 0 },
  { name: "Soft Skills", icon: "Users", score: 44, testsCompleted: 1, trend: { value: 1, isUp: false } },
];

// ─── Score Tracking (line chart data for tests) ──
export const MOCK_SCORE_TRACKING = [
  { test: "#1", frontend: 65, backend: 50, softSkills: 40 },
  { test: "#2", frontend: 72, backend: 55, softSkills: 42 },
  { test: "#3", frontend: 68, backend: 58, softSkills: 38 },
  { test: "#4", frontend: 77, backend: 62, softSkills: 44 },
  { test: "#5", frontend: 80, backend: null, softSkills: null },
  { test: "#6", frontend: null, backend: null, softSkills: null },
];

// ─── AI Insights (like Prep "Review") ──────────
export interface AIInsight {
  skill: string;
  feedback: string;
  sentiment: "positive" | "warning" | "neutral";
}

export const MOCK_AI_INSIGHTS: AIInsight[] = [
  {
    skill: "Frontend",
    feedback: "Excellent! Your Frontend score is trending upward consistently. However, there's notable variance between tests. Focus on improving consistency to achieve the best results possible.",
    sentiment: "positive",
  },
  {
    skill: "Soft Skills",
    feedback: "Your Soft Skills score shows signs of improvement but isn't clearly consistent yet. Consider revisiting your study approach to improve score stability.",
    sentiment: "warning",
  },
];

// ─── Trophy / Achievement Stats ──────────────────
export interface TrophyStats {
  totalEarned: number;
  totalPossible: number;
  lessonsCompleted: number;
  testsCompleted: number;
  unfinishedLessons: number;
}

export const MOCK_TROPHY_STATS: TrophyStats = {
  totalEarned: 218,
  totalPossible: 714,
  lessonsCompleted: 64,
  testsCompleted: 17,
  unfinishedLessons: 0,
};

// ─── Mock Interview Data ─────────────────────────
export const MOCK_INTERVIEW_STATS = {
  totalInterviews: 12,
  averageScore: 78,
  topSkill: "Problem Solving",
  areaToImprove: "Communication",
};

export const MOCK_INTERVIEW_HISTORY = [
  { id: "iv1", date: "2026-03-01", role: "Frontend Engineer", score: 82, status: "completed" },
  { id: "iv2", date: "2026-02-15", role: "React Developer", score: 75, status: "completed" },
  { id: "iv3", date: "2026-01-20", role: "UI/UX Engineer", score: 68, status: "completed" },
  { id: "iv4", date: "2026-03-10", role: "Senior Frontend Engineer", score: null, status: "upcoming" },
];

export const MOCK_INTERVIEW_CRITERIA = [
  { subject: "Communication", A: 70, fullMark: 100 },
  { subject: "Problem Solving", A: 85, fullMark: 100 },
  { subject: "Technical Skills", A: 80, fullMark: 100 },
  { subject: "Culture Fit", A: 75, fullMark: 100 },
  { subject: "System Design", A: 60, fullMark: 100 },
];

export const MOCK_VOCAL_ANALYTICS = {
  pacing: 145, // Words per minute
  pacingStatus: "Optimal",
  fillerWords: 12,
  fillerStatus: "Needs Improvement",
  confidenceScore: 88,
  confidenceStatus: "Excellent"
};

export const MOCK_PERSONALITY_TRAITS = [
  { trait: "Confident", score: 85 },
  { trait: "Analytical", score: 92 },
  { trait: "Empathetic", score: 75 },
  { trait: "Adaptable", score: 80 },
];

export const MOCK_SCREENING_QUESTIONS = [
  {
    id: "q1",
    question: "Tell me about a time you had to learn a new technology quickly.",
    yourAnswer: "I used the STAR method to explain how I learned Next.js over a weekend for an urgent client project...",
    aiFeedback: "Strong answer. You clearly articulated the 'Action' and 'Result' phases. Next time, quantify the impact of the client project.",
    score: 85
  },
  {
    id: "q2",
    question: "How do you handle disagreements with a senior engineer?",
    yourAnswer: "I usually just agree with them to avoid conflict, but try to subtly suggest my way later.",
    aiFeedback: "This answer lacks assertiveness. Hiring managers look for constructive conflict resolution. Try focusing on 'data-driven discussions' rather than avoiding conflict.",
    score: 60
  }
];

// ─── Mock Career / Job Matches ───────────────────
export const MOCK_JOB_MATCHES = [
  {
    id: "job1",
    role: "Senior React Developer",
    company: "TechCorp Inc.",
    logo: "https://i.pravatar.cc/150?u=techcorp",
    matchScore: 92,
    salary: "$120k - $150k",
    location: "Remote",
    missingSkills: ["GraphQL"],
    tags: ["React", "TypeScript", "Next.js"]
  },
  {
    id: "job2",
    role: "Frontend Engineer (Vue/React)",
    company: "InnovateStudio",
    logo: "https://i.pravatar.cc/150?u=innovate",
    matchScore: 85,
    salary: "$90k - $120k",
    location: "New York, NY",
    missingSkills: ["Vue.js", "Docker"],
    tags: ["Frontend", "UX/UI", "Tailwind"]
  },
  {
    id: "job3",
    role: "Fullstack JS Developer",
    company: "Global Solutions",
    logo: "https://i.pravatar.cc/150?u=global",
    matchScore: 65,
    salary: "$110k - $140k",
    location: "Hybrid (London)",
    missingSkills: ["Node.js", "AWS", "System Design"],
    tags: ["MERN", "AWS", "Scalability"]
  }
];

export const MOCK_APPLICATIONS = [
  { id: "app1", company: "DataStack", role: "Frontend Developer", status: "interview", date: "2026-03-02" },
  { id: "app2", company: "CloudNet", role: "UI Engineer", status: "applied", date: "2026-03-05" },
  { id: "app3", company: "FinServe", role: "React Engineer", status: "rejected", date: "2026-02-20" },
];

// ─── AI Daily Briefing ────────────────────────────
export interface AIDailyBriefingItem {
  id: string;
  icon: string; // lucide icon name
  text: string;
  type: "trend" | "warning" | "suggestion" | "reminder";
  action?: { label: string; href: string };
}

export const MOCK_AI_DAILY_BRIEFING: AIDailyBriefingItem[] = [
  {
    id: "b1",
    icon: "TrendingUp",
    text: "Your activity is up 23% compared to last week. Keep it up!",
    type: "trend",
    action: { label: "View Full Stats", href: "/learning" },
  },
  {
    id: "b2",
    icon: "AlertTriangle",
    text: "Skill gap detected: <strong>System Design</strong> is your weakest area <strong>(35%)</strong>. 3 courses available.",
    type: "warning",
    action: { label: "Browse Courses", href: "/learning" },
  },
  {
    id: "b3",
    icon: "Lightbulb",
    text: "Complete the React Performance module today to stay on track with your roadmap.",
    type: "suggestion",
    action: { label: "Continue Learning", href: "/learning" },
  },
  {
    id: "b4",
    icon: "Calendar",
    text: "You have a Mock Interview scheduled for March 10. Prepare with practice questions.",
    type: "reminder",
    action: { label: "Prepare Now", href: "/practice" },
  },
  {
    id: "b5",
    icon: "FileSearch",
    text: "Your CV match is 65%. Upload an updated CV to improve your score.",
    type: "suggestion",
    action: { label: "Scan Updated CV", href: "/diagnosis" },
  },
];

// ─── AI Chat Messages ─────────────────────────────
export interface AIChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  quickActions?: { label: string; href: string }[];
}

export const MOCK_AI_CHAT_INITIAL: AIChatMessage[] = [
  {
    id: "m1",
    sender: "ai",
    text: "Hey! 👋 Welcome back. You haven't studied in 2 days. Ready to continue your React Performance module?",
    timestamp: "Just now",
    quickActions: [
      { label: "Continue Learning", href: "/learning" },
      { label: "Book Interview", href: "/practice" },
      { label: "Upload CV", href: "/diagnosis" },
    ],
  },
];

// Pre-defined AI responses for mock simulation
export const MOCK_AI_RESPONSES: Record<string, string> = {
  default: "That's a great question! Based on your learning data, I'd recommend focusing on System Design and Backend skills to improve your CV match score. Would you like me to suggest specific courses?",
  learn: "Based on your current progress, I recommend completing the React Performance module first (you're at 58%). After that, tackle State Management — it's critical for your target role as Senior Frontend Engineer.",
  cv: "Your CV currently matches 65% of your target role requirements. The main gaps are: System Design, Cloud AWS, and Docker. Upload an updated CV after completing these modules to see improvement!",
  interview: "You have a mock interview scheduled for March 10 for 'Senior Frontend Engineer'. Your strongest areas are Problem Solving (85%) and Technical Skills (80%). I'd suggest practicing Communication — it scored lowest at 70%.",
  skill: "Your Frontend skills are excellent (85+)! But your Backend score is only 45% and DevOps is 30%. For your target role, I recommend focusing 60% of study time on Backend (Node.js, PostgreSQL) and 20% on DevOps basics.",
  help: "I can help you with:\n• 📊 Analyzing your skill gaps\n• 📝 CV improvement suggestions\n• 🎯 Learning path recommendations\n• 🎤 Interview preparation tips\n\nJust ask me anything!",
};

// ─── AI Sidebar Insights (Scroll-aware) ────────────
export interface AISidebarInsight {
  id: string;
  title: string;
  description: string;
  type: "positive" | "warning" | "info" | "tip";
  icon: string;
}

export interface AISidebarSection {
  sectionId: string;
  label: string;
  insights: AISidebarInsight[];
}

export const MOCK_AI_SIDEBAR_SECTIONS: AISidebarSection[] = [
  {
    sectionId: "hero",
    label: "Welcome",
    insights: [
      { id: "s1", title: "Weekly Progress", description: "You're 23% more active this week vs last week. Consistency is key!", type: "positive", icon: "TrendingUp" },
      { id: "s2", title: "Streak", description: "4-day learning streak! Don't break it 🔥", type: "tip", icon: "Flame" },
    ],
  },
  {
    sectionId: "stats",
    label: "Statistics",
    insights: [
      { id: "s3", title: "Learning Pace", description: "At your current pace, you'll finish the Frontend Path in ~6 weeks.", type: "info", icon: "Timer" },
      { id: "s4", title: "Skill Velocity", description: "You mastered 2 new skills this month — above average!", type: "positive", icon: "Zap" },
    ],
  },
  {
    sectionId: "overview",
    label: "Overview",
    insights: [
      { id: "s5", title: "Focus Area", description: "System Design is your weakest skill. Prioritize it to unlock Senior roles.", type: "warning", icon: "Target" },
      { id: "s6", title: "Quick Win", description: "Complete 1 more React lesson to finish the module this week.", type: "tip", icon: "Lightbulb" },
    ],
  },
  {
    sectionId: "skills",
    label: "Skill Diagnosis",
    insights: [
      { id: "s7", title: "Skill Gap", description: "Your AWS skills are below average. Consider brushing up.", type: "warning", icon: "AlertTriangle" },
      { id: "s8", title: "Strong Area", description: "Your React skills are in the top 10% of users.", type: "positive", icon: "Award" },
    ],
  },
  {
    sectionId: "learning",
    label: "Learning Path",
    insights: [
      { id: "s9", title: "On Track", description: "You are on track to finish the Frontend Path by next month.", type: "positive", icon: "Timer" },
    ],
  },
  {
    sectionId: "interview",
    label: "Mock Interviews",
    insights: [
      { id: "s10", title: "Upcoming", description: "Focus on behavioral questions for your next mock interview.", type: "tip", icon: "Lightbulb" },
    ],
  },
  {
    sectionId: "career",
    label: "Career & Jobs",
    insights: [
      { id: "s11", title: "New Match", description: "A new Senior role at DataStack matches 85% of your profile.", type: "positive", icon: "Zap" },
    ],
  },
];
