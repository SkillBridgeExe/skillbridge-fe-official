// ─── Extended Admin Mock Data for SkillBridge ───────────────────────────────

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  severity: "info" | "warning" | "critical";
  category: "cv_parse" | "user_spam" | "mentor_rating" | "funnel_drop" | "system";
}

export interface MentorDetail {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  expertise: string[];
  rating: number;
  totalSessions: number;
  revenue: number;
  status: "active" | "pending" | "suspended";
  joinDate: string;
  bio: string;
  bookingHistory: { date: string; student: string; topic: string; rating: number }[];
}

export interface BusinessDetail {
  id: string;
  name: string;
  email: string;
  company: string;
  logo?: string;
  industry: string;
  jobCount: number;
  candidatesMatched: number;
  hires: number;
  revenue: number;
  status: "active" | "pending" | "suspended";
  joinDate: string;
}

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: "user" | "mentor" | "business" | "admin";
  status: "active" | "pending" | "suspended";
  joinDate: string;
  avatar?: string;
  skills: string[];
  cvScore?: number;
  roadmapCompletion?: number;
  interviewCount?: number;
  activityLog: { action: string; timestamp: string; type: string }[];
}

export interface CommunityPost {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  likes: number;
  comments: number;
  reports: number;
  status: "active" | "hidden" | "removed";
  createdAt: string;
  tags: string[];
}

export interface SystemLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  ip: string;
  type: "auth" | "user" | "system" | "payment" | "report";
  severity: "info" | "warning" | "error";
}

export interface FunnelStage {
  stage: string;
  label: string;
  value: number;
  percent: number;
  dropRate: number;
  color: string;
}

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "CV Parse Error Spike",
    message: "47 CV parse failures in the last hour — error rate up 340%",
    time: "5 min ago",
    read: false,
    severity: "critical",
    category: "cv_parse",
  },
  {
    id: "n2",
    title: "Spam Detection Alert",
    message: "User #8821 triggered spam filter — 42 posts in 10 minutes",
    time: "12 min ago",
    read: false,
    severity: "critical",
    category: "user_spam",
  },
  {
    id: "n3",
    title: "Mentor Rating Drop",
    message: "Mentor 'Le Van Cuong' rating dropped to 3.1 after 5 new reviews",
    time: "1 hour ago",
    read: false,
    severity: "warning",
    category: "mentor_rating",
  },
  {
    id: "n4",
    title: "Funnel Drop Detected",
    message: "Roadmap step 2 drop rate up 40% — AI suggests content review",
    time: "2 hours ago",
    read: true,
    severity: "warning",
    category: "funnel_drop",
  },
  {
    id: "n5",
    title: "New Enterprise Client",
    message: "FPT Software signed Enterprise plan — ₫120M/year",
    time: "3 hours ago",
    read: true,
    severity: "info",
    category: "system",
  },
  {
    id: "n6",
    title: "System Backup Complete",
    message: "Daily backup completed successfully — 1.2TB stored",
    time: "5 hours ago",
    read: true,
    severity: "info",
    category: "system",
  },
];

export const SKILLBRIDGE_FUNNEL: FunnelStage[] = [
  { stage: "CV Upload", label: "CV Uploaded", value: 18720, percent: 100, dropRate: 0, color: "#00d4ff" },
  { stage: "Analysis", label: "AI Analyzed", value: 15876, percent: 84.8, dropRate: 15.2, color: "#06b6d4" },
  { stage: "Roadmap", label: "Roadmap Created", value: 11344, percent: 60.6, dropRate: 24.2, color: "#8b5cf6" },
  { stage: "Mentor", label: "Mentor Booked", value: 5672, percent: 30.3, dropRate: 30.3, color: "#a78bfa" },
  { stage: "Interview", label: "Interview Done", value: 2836, percent: 15.1, dropRate: 15.2, color: "#f59e0b" },
  { stage: "Job", label: "Job Matched", value: 991, percent: 5.3, dropRate: 9.8, color: "#10b981" },
];

export const USER_GROWTH_DATA = [
  { month: "Jan", users: 28400, mentors: 312, businesses: 84, newUsers: 1200 },
  { month: "Feb", users: 30100, mentors: 334, businesses: 91, newUsers: 1700 },
  { month: "Mar", users: 32800, mentors: 358, businesses: 98, newUsers: 2700 },
  { month: "Apr", users: 35200, mentors: 381, businesses: 108, newUsers: 2400 },
  { month: "May", users: 37900, mentors: 402, businesses: 118, newUsers: 2700 },
  { month: "Jun", users: 40100, mentors: 424, businesses: 127, newUsers: 2200 },
  { month: "Jul", users: 41800, mentors: 441, businesses: 133, newUsers: 1700 },
  { month: "Aug", users: 43200, mentors: 455, businesses: 139, newUsers: 1400 },
  { month: "Sep", users: 44800, mentors: 468, businesses: 145, newUsers: 1600 },
  { month: "Oct", users: 45900, mentors: 478, businesses: 150, newUsers: 1100 },
  { month: "Nov", users: 46700, mentors: 487, businesses: 155, newUsers: 800 },
  { month: "Dec", users: 47284, mentors: 493, businesses: 158, newUsers: 584 },
];

export const REVENUE_BREAKDOWN = [
  { month: "Jan", subscription: 820, mentor: 280, b2b: 100 },
  { month: "Feb", subscription: 950, mentor: 310, b2b: 120 },
  { month: "Mar", subscription: 1050, mentor: 340, b2b: 130 },
  { month: "Apr", subscription: 1150, mentor: 390, b2b: 140 },
  { month: "May", subscription: 1320, mentor: 440, b2b: 160 },
  { month: "Jun", subscription: 1480, mentor: 470, b2b: 150 },
  { month: "Jul", subscription: 1600, mentor: 510, b2b: 170 },
  { month: "Aug", subscription: 1500, mentor: 490, b2b: 160 },
  { month: "Sep", subscription: 1750, mentor: 560, b2b: 170 },
  { month: "Oct", subscription: 1850, mentor: 590, b2b: 180 },
  { month: "Nov", subscription: 1960, mentor: 610, b2b: 180 },
  { month: "Dec", subscription: 2020, mentor: 640, b2b: 180 },
];

export const REVENUE_SOURCE_DONUT = [
  { name: "Subscription", value: 71, color: "#00d4ff" },
  { name: "Mentor Fees", value: 22, color: "#8b5cf6" },
  { name: "B2B / Enterprise", value: 7, color: "#f59e0b" },
];

export const ALL_USERS: UserDetail[] = [
  {
    id: "u1", name: "Nguyen Van An", email: "an.nguyen@gmail.com", role: "user",
    status: "active", joinDate: "2025-11-15", skills: ["React", "TypeScript", "Node.js"],
    cvScore: 82, roadmapCompletion: 67, interviewCount: 3,
    activityLog: [
      { action: "Completed React module", timestamp: "2 hours ago", type: "learning" },
      { action: "Booked mentor session with Tuan", timestamp: "1 day ago", type: "mentor" },
      { action: "Uploaded CV v3", timestamp: "3 days ago", type: "cv" },
    ],
  },
  {
    id: "u2", name: "Tran Thi Mai", email: "mai.tran@techcorp.vn", role: "business",
    status: "active", joinDate: "2025-10-01", skills: [],
    activityLog: [
      { action: "Posted new job: Senior React Developer", timestamp: "1 hour ago", type: "job" },
      { action: "Matched 12 candidates", timestamp: "2 days ago", type: "match" },
    ],
  },
  {
    id: "u3", name: "Le Minh Tuan", email: "tuan.mentor@gmail.com", role: "mentor",
    status: "pending", joinDate: "2025-12-01", skills: ["System Design", "Backend", "AWS"],
    activityLog: [
      { action: "Submitted mentor application", timestamp: "1 hour ago", type: "system" },
      { action: "Uploaded mentor profile", timestamp: "2 hours ago", type: "profile" },
    ],
  },
  {
    id: "u4", name: "Pham Hoang Linh", email: "linh.ph@gmail.com", role: "user",
    status: "active", joinDate: "2025-09-20", skills: ["Python", "Machine Learning"],
    cvScore: 74, roadmapCompletion: 45, interviewCount: 1,
    activityLog: [
      { action: "Started Python ML roadmap", timestamp: "3 hours ago", type: "learning" },
      { action: "CV analyzed — 3 skill gaps found", timestamp: "1 week ago", type: "cv" },
    ],
  },
  {
    id: "u5", name: "Hoang Duc Nam", email: "nam.hoang@startup.vn", role: "business",
    status: "active", joinDate: "2025-11-05", skills: [],
    activityLog: [
      { action: "Upgraded to Enterprise plan", timestamp: "5 hours ago", type: "payment" },
    ],
  },
  {
    id: "u6", name: "Vu Thi Lan", email: "lan.vu@gmail.com", role: "user",
    status: "suspended", joinDate: "2025-08-12", skills: ["UX Design"],
    cvScore: 55, roadmapCompletion: 12, interviewCount: 0,
    activityLog: [
      { action: "Account suspended for ToS violation", timestamp: "1 day ago", type: "system" },
    ],
  },
  {
    id: "u7", name: "Do Thi Thanh", email: "thanh.do@gmail.com", role: "user",
    status: "active", joinDate: "2025-12-10", skills: ["Java", "Spring Boot"],
    cvScore: 88, roadmapCompletion: 78, interviewCount: 5,
    activityLog: [
      { action: "Passed mock interview — score 91%", timestamp: "30 min ago", type: "interview" },
    ],
  },
  {
    id: "u8", name: "Bui Van Khanh", email: "khanh.bui@fpt.edu.vn", role: "user",
    status: "active", joinDate: "2025-07-01", skills: ["DevOps", "Docker", "Kubernetes"],
    cvScore: 79, roadmapCompletion: 60, interviewCount: 2,
    activityLog: [
      { action: "Completed Docker module", timestamp: "4 hours ago", type: "learning" },
    ],
  },
];

export const ALL_MENTORS: MentorDetail[] = [
  {
    id: "m1", name: "Tran Minh Tuan", email: "tuan@skillbridge.vn",
    expertise: ["React", "Next.js", "TypeScript", "System Design"],
    rating: 4.9, totalSessions: 847, revenue: 42300000,
    status: "active", joinDate: "2024-06-15",
    bio: "10 years experience at Google & Grab. Specialized in Frontend Architecture and system design for scale.",
    bookingHistory: [
      { date: "2026-03-19", student: "Nguyen Van An", topic: "React Architecture", rating: 5 },
      { date: "2026-03-18", student: "Le Hoang Anh", topic: "TypeScript Best Practices", rating: 5 },
      { date: "2026-03-15", student: "Do Thi Thanh", topic: "Interview Prep", rating: 4 },
    ],
  },
  {
    id: "m2", name: "Nguyen Duc Minh", email: "minh@skillbridge.vn",
    expertise: ["Python", "Machine Learning", "LLM Engineering", "Data Science"],
    rating: 4.8, totalSessions: 623, revenue: 31100000,
    status: "active", joinDate: "2024-08-20",
    bio: "AI Researcher at VinAI. PhD in Computer Science. Passionate about making ML accessible.",
    bookingHistory: [
      { date: "2026-03-20", student: "Pham Hoang Linh", topic: "ML Fundamentals", rating: 5 },
      { date: "2026-03-17", student: "Bui Van Khanh", topic: "LLM Engineering", rating: 5 },
    ],
  },
  {
    id: "m3", name: "Le Van Cuong", email: "cuong@skillbridge.vn",
    expertise: ["Backend", "Node.js", "PostgreSQL", "Redis"],
    rating: 3.1, totalSessions: 124, revenue: 6200000,
    status: "active", joinDate: "2025-01-10",
    bio: "5 years backend experience. Building scalable APIs and microservices.",
    bookingHistory: [
      { date: "2026-03-19", student: "Hoang Van Duc", topic: "API Design", rating: 2 },
      { date: "2026-03-18", student: "Nguyen Thi Kim", topic: "Node.js basics", rating: 3 },
    ],
  },
];

export const ALL_BUSINESSES: BusinessDetail[] = [
  {
    id: "b1", name: "Tran Thi Mai", email: "mai.tran@techcorp.vn",
    company: "TechCorp Vietnam", industry: "Software Development",
    jobCount: 12, candidatesMatched: 84, hires: 7, revenue: 48000000,
    status: "active", joinDate: "2025-10-01",
  },
  {
    id: "b2", name: "Le Hoang Phuc", email: "phuc@fpt.com.vn",
    company: "FPT Software", industry: "IT Services",
    jobCount: 24, candidatesMatched: 156, hires: 18, revenue: 120000000,
    status: "active", joinDate: "2025-06-15",
  },
  {
    id: "b3", name: "Hoang Duc Nam", email: "nam.hoang@startup.vn",
    company: "VNG Corporation", industry: "Internet & Gaming",
    jobCount: 8, candidatesMatched: 42, hires: 4, revenue: 32000000,
    status: "active", joinDate: "2025-11-05",
  },
  {
    id: "b4", name: "Nguyen Thi Huong", email: "huong@momo.vn",
    company: "MoMo FinTech", industry: "Financial Technology",
    jobCount: 15, candidatesMatched: 67, hires: 9, revenue: 72000000,
    status: "pending", joinDate: "2026-02-20",
  },
];

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "p1", author: "Nguyen Van An", content: "Just landed my first job at TechCorp after completing the React roadmap! SkillBridge's AI analysis was spot on — it identified exactly the skills I needed to fill. Highly recommend to anyone in the job hunt! 🚀",
    likes: 124, comments: 38, reports: 0, status: "active", createdAt: "2 hours ago",
    tags: ["success", "react", "job"],
  },
  {
    id: "p2", author: "Spam User #4821", content: "CLICK HERE FOR FREE PREMIUM ACCOUNT!!! LIMITED TIME OFFER bit.ly/xyz123 FREE CERTIFICATES GET YOURS NOW!!!",
    likes: 2, comments: 1, reports: 47, status: "active", createdAt: "3 hours ago",
    tags: [],
  },
  {
    id: "p3", author: "Do Thi Thanh", content: "Tips for the mock interview feature: practice with harder settings first, then dial back. The AI feedback on body language and pacing is incredibly detailed. What questions do you all typically struggle with?",
    likes: 89, comments: 24, reports: 0, status: "active", createdAt: "5 hours ago",
    tags: ["interview", "tips"],
  },
  {
    id: "p4", author: "Hidden User #3301", content: "[Content removed for community guideline violation]",
    likes: 0, comments: 0, reports: 12, status: "hidden", createdAt: "8 hours ago",
    tags: [],
  },
  {
    id: "p5", author: "Bui Van Khanh", content: "Comparing SkillBridge's mentor system to Toptal and Codementor — the AI matching here is way more accurate for my specific tech stack. Mentor Tuan helped me get system design interviews in 3 weeks.",
    likes: 67, comments: 15, reports: 0, status: "active", createdAt: "1 day ago",
    tags: ["mentor", "system-design"],
  },
];

export const SYSTEM_LOGS: SystemLog[] = [
  { id: "sl1", user: "admin@skillbridge.vn", action: "Modified feature flag: cv_ai_v3 → enabled", timestamp: "10 min ago", ip: "192.168.1.1", type: "system", severity: "info" },
  { id: "sl2", user: "System", action: "CV parse service returned 47 errors — circuit breaker triggered", timestamp: "25 min ago", ip: "10.0.0.5", type: "system", severity: "error" },
  { id: "sl3", user: "User #8821", action: "Spam filter triggered — posting blocked for 24h", timestamp: "1 hour ago", ip: "113.20.44.21", type: "user", severity: "warning" },
  { id: "sl4", user: "payment-service", action: "FPT Software Enterprise payment confirmed — ₫120M", timestamp: "2 hours ago", ip: "10.0.0.12", type: "payment", severity: "info" },
  { id: "sl5", user: "nguyen.admin@sb.vn", action: "User #6 suspended: ToS violation (3rd offense)", timestamp: "3 hours ago", ip: "192.168.1.2", type: "user", severity: "warning" },
  { id: "sl6", user: "System", action: "Daily ML model retraining completed — accuracy 94.2%", timestamp: "6 hours ago", ip: "10.0.0.8", type: "system", severity: "info" },
  { id: "sl7", user: "le.admin@sb.vn", action: "Bulk email sent to 342 at-risk users — re-engagement campaign", timestamp: "8 hours ago", ip: "192.168.1.3", type: "user", severity: "info" },
  { id: "sl8", user: "System", action: "Unusual login pattern detected: User #2301 — 12 countries in 1h", timestamp: "10 hours ago", ip: "various", type: "auth", severity: "warning" },
];

export const HIRING_FUNNEL = [
  { stage: "Applied", value: 1842, color: "#00d4ff" },
  { stage: "Screened", value: 924, color: "#06b6d4" },
  { stage: "Interviewed", value: 312, color: "#8b5cf6" },
  { stage: "Offer", value: 58, color: "#f59e0b" },
  { stage: "Hired", value: 38, color: "#10b981" },
];

export const AI_CHAT_SUGGESTIONS = [
  "Which users are at risk of churning this week?",
  "Why did revenue drop in August?",
  "Who are the top 5 mentors by revenue?",
  "What's the funnel drop rate at Roadmap step 2?",
  "Compare Q3 vs Q4 user growth",
  "Show users with low skill scores in Frontend",
];

export const FEATURE_FLAGS = [
  { key: "cv_ai_v3", label: "CV AI Parser v3", enabled: true, description: "Next-gen CV parsing with GPT-4V", rollout: 100 },
  { key: "mentor_video_hd", label: "HD Video Sessions", enabled: true, description: "1080p mentor video calls", rollout: 80 },
  { key: "ai_interview_coach", label: "AI Interview Coach", enabled: false, description: "Real-time coaching during mock interviews", rollout: 0 },
  { key: "b2b_analytics", label: "B2B Analytics Dashboard", enabled: true, description: "Advanced analytics for business clients", rollout: 100 },
  { key: "gamification_v2", label: "Gamification v2", enabled: false, description: "XP system, badges, leaderboards", rollout: 10 },
  { key: "llm_roadmap", label: "LLM-Powered Roadmap", enabled: false, description: "Dynamic roadmap generation with Claude", rollout: 5 },
];
