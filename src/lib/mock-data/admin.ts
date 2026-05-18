// ─── Admin Dashboard Mock Data ─────────────────────────────────────────────

export interface AdminKPI {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  isUp: boolean;
  icon: string;
  color: "blue" | "emerald" | "violet" | "amber" | "red";
  sparkline: number[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "mentor" | "business" | "admin";
  status: "active" | "pending" | "suspended";
  joinDate: string;
  avatar?: string;
  coursesEnrolled?: number;
  revenue?: number;
}

export interface CourseMetric {
  id: string;
  title: string;
  category: string;
  enrollments: number;
  completionRate: number;
  rating: number;
  revenue: number;
  trend: number;
  status: "active" | "draft" | "archived";
}

export interface RevenueData {
  month: string;
  revenue: number;
  target: number;
  subscriptions: number;
  oneTime: number;
}

export interface AIDecision {
  id: string;
  type: "churn_alert" | "upsell" | "content_gap" | "pricing" | "growth";
  title: string;
  insight: string;
  impact: "high" | "medium" | "low";
  confidence: number;
  estimatedRevenue?: number;
  action: string;
  urgency: "immediate" | "this_week" | "this_month";
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  type: "user" | "course" | "payment" | "system" | "report";
}

export interface AdminLearningMetric {
  month: string;
  certificationsTrend: number;
  freeCourses: number;
  paidCourses: number;
  enrolledCourses: number;
  completedCourses: number;
  certificatesEarned: number;
  learningHours: number;
  enrollmentGoal: number;
  completionGoal: number;
  certificatesGoal: number;
  learningHoursGoal: number;
}

export const ADMIN_KPIS: AdminKPI[] = [
  {
    label: "Total Users",
    value: "47,284",
    change: 12.4,
    changeLabel: "+489 this week",
    isUp: true,
    icon: "Users",
    color: "blue",
    sparkline: [32, 38, 35, 42, 44, 40, 47],
  },
  {
    label: "Monthly Revenue",
    value: "₫2.84B",
    change: 23.1,
    changeLabel: "+₫534M vs last month",
    isUp: true,
    icon: "TrendingUp",
    color: "emerald",
    sparkline: [180, 195, 210, 225, 240, 260, 284],
  },
  {
    label: "Active Courses",
    value: "234",
    change: 8.6,
    changeLabel: "+18 new courses",
    isUp: true,
    icon: "BookOpen",
    color: "violet",
    sparkline: [195, 200, 210, 215, 220, 228, 234],
  },
  {
    label: "Completion Rate",
    value: "68.4%",
    change: 4.2,
    changeLabel: "+2.7pp vs last month",
    isUp: true,
    icon: "Award",
    color: "amber",
    sparkline: [60, 62, 64, 63, 66, 67, 68],
  },
  {
    label: "Churn Rate",
    value: "3.2%",
    change: -0.8,
    changeLabel: "-0.8pp improvement",
    isUp: false,
    icon: "AlertTriangle",
    color: "red",
    sparkline: [5.2, 4.8, 4.5, 4.2, 3.9, 3.5, 3.2],
  },
];

export const REVENUE_DATA: RevenueData[] = [
  { month: "Jan", revenue: 1200, target: 1100, subscriptions: 820, oneTime: 380 },
  { month: "Feb", revenue: 1380, target: 1250, subscriptions: 950, oneTime: 430 },
  { month: "Mar", revenue: 1520, target: 1400, subscriptions: 1050, oneTime: 470 },
  { month: "Apr", revenue: 1680, target: 1600, subscriptions: 1150, oneTime: 530 },
  { month: "May", revenue: 1920, target: 1800, subscriptions: 1320, oneTime: 600 },
  { month: "Jun", revenue: 2100, target: 2000, subscriptions: 1480, oneTime: 620 },
  { month: "Jul", revenue: 2280, target: 2200, subscriptions: 1600, oneTime: 680 },
  { month: "Aug", revenue: 2150, target: 2400, subscriptions: 1500, oneTime: 650 },
  { month: "Sep", revenue: 2480, target: 2500, subscriptions: 1750, oneTime: 730 },
  { month: "Oct", revenue: 2620, target: 2600, subscriptions: 1850, oneTime: 770 },
  { month: "Nov", revenue: 2750, target: 2700, subscriptions: 1960, oneTime: 790 },
  { month: "Dec", revenue: 2840, target: 2800, subscriptions: 2020, oneTime: 820 },
];

export const ROLE_DISTRIBUTION = [
  { name: "Students", value: 78, color: "#00d4ff" },
  { name: "Mentor", value: 14, color: "#8b5cf6" },
  { name: "Business", value: 7, color: "#f59e0b" },
  { name: "Admin", value: 1, color: "#ef4444" },
];

export const TOP_COURSES: CourseMetric[] = [
  {
    id: "c1", title: "React & Next.js Professional", category: "Frontend",
    enrollments: 2847, completionRate: 74, rating: 4.9, revenue: 284700000, trend: 12, status: "active",
  },
  {
    id: "c2", title: "Python AI/Machine Learning", category: "AI/ML",
    enrollments: 2124, completionRate: 68, rating: 4.8, revenue: 212400000, trend: 18, status: "active",
  },
  {
    id: "c3", title: "System Design Mastery", category: "Backend",
    enrollments: 1893, completionRate: 71, rating: 4.8, revenue: 189300000, trend: 5, status: "active",
  },
  {
    id: "c4", title: "AWS & Cloud Architecture", category: "DevOps",
    enrollments: 1456, completionRate: 65, rating: 4.7, revenue: 145600000, trend: -2, status: "active",
  },
  {
    id: "c5", title: "TypeScript Advanced Patterns", category: "Frontend",
    enrollments: 1320, completionRate: 79, rating: 4.9, revenue: 132000000, trend: 24, status: "active",
  },
];

export const generateUsers = (count: number, role: "user" | "mentor" | "business" | "admin", statuses: ("active" | "pending" | "suspended")[]): AdminUser[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${role}-${i + 1}`,
    name: `${role === 'user' ? 'Học viên' : role === 'mentor' ? 'Mentor' : role === 'business' ? 'Company' : 'Admin'} ${i + 1}`,
    email: `${role}${i + 1}@skillbridge.vn`,
    role: role,
    status: statuses[i % statuses.length],
    joinDate: `${Math.floor(Math.random() * 30) + 1} days ago`,
    coursesEnrolled: role === 'user' ? Math.floor(Math.random() * 5) + 1 : undefined,
    revenue: role === 'mentor' || role === 'business' ? Math.floor(Math.random() * 50000) : undefined,
  }));
};

export const RECENT_USERS: AdminUser[] = [
  ...generateUsers(20, 'user', ['active', 'pending', 'active', 'suspended', 'active']),
  ...generateUsers(5, 'mentor', ['active', 'active', 'pending']),
  ...generateUsers(10, 'business', ['active', 'active', 'pending', 'active']),
  ...generateUsers(3, 'admin', ['active', 'active']),
];

export const AI_DECISIONS: AIDecision[] = [
  {
    id: "ai1",
    type: "churn_alert",
    title: "342 students are at high churn risk",
    insight: "AI detected 342 premium users inactive for more than 14 days with behavior matching 89% of previous churn cases. Average LTV per user is ₫2.4M.",
    impact: "high",
    confidence: 89,
    estimatedRevenue: 820800000,
    action: "Launch a re-engagement campaign: send a 5-day email sequence and offer a 30% discount for new course bundles. Expected ROI: 8.2x.",
    urgency: "immediate",
  },
  {
    id: "ai2",
    type: "upsell",
    title: "Upsell opportunity: Frontend learners -> Business plan",
    insight: "Users learning React/TypeScript are 2.4x more likely to upgrade to the Business plan than average. There are currently 1,247 users in this segment.",
    impact: "high",
    confidence: 76,
    estimatedRevenue: 1496400000,
    action: "Create a targeted campaign: showcase the Business plan ROI with concrete case studies from TechCorp VN. A/B test two landing pages.",
    urgency: "this_week",
  },
  {
    id: "ai3",
    type: "content_gap",
    title: "Content gap: AI/LLM Engineering is trending",
    insight: "Search volume for 'LLM Engineering', 'Prompt Engineering', and 'RAG' increased 340% QoQ. There are no courses currently. Three competitors already launched offerings.",
    impact: "medium",
    confidence: 92,
    estimatedRevenue: 950000000,
    action: "Prioritize developing an LLM Engineering course within 6 weeks. Suggested lead mentor: Minh Tri (4.9 star, 2,100 students).",
    urgency: "this_week",
  },
  {
    id: "ai4",
    type: "pricing",
    title: "Pricing optimization: Premium package can increase by 15%",
    insight: "Price elasticity analysis shows conversion rate should not drop significantly when increasing Premium from ₫299K to ₫349K/month (projected -2.1%).",
    impact: "medium",
    confidence: 71,
    estimatedRevenue: 620000000,
    action: "Run an A/B pricing test with 20% of the user base for two weeks. Monitor conversion, churn, and NPS closely before rollout.",
    urgency: "this_month",
  },
];

export const ACTIVITY_LOGS: ActivityLog[] = [
  { id: "l1", user: "Mentor Tuan Anh", action: "Published new course: 'Advanced React Patterns v2'", timestamp: "2 minutes ago", type: "course" },
  { id: "l2", user: "TechCorp Vietnam", action: "Upgraded to Enterprise plan - ₫48M/year", timestamp: "15 minutes ago", type: "payment" },
  { id: "l3", user: "AI System", action: "Detected 342 users at high churn risk - requires review", timestamp: "1 hour ago", type: "system" },
  { id: "l4", user: "Nguyen Van An", action: "Completed React course - scored 98% and earned certificate", timestamp: "2 hours ago", type: "course" },
  { id: "l5", user: "User #4821", action: "Reported policy-violating content in course ID: C-142", timestamp: "3 hours ago", type: "report" },
  { id: "l6", user: "System Auto", action: "Database backup completed - 847GB, no errors", timestamp: "5 hours ago", type: "system" },
  { id: "l7", user: "Le Thi Hoa", action: "Registered as Mentor - awaiting profile review", timestamp: "6 hours ago", type: "user" },
];

export const MENTOR_STATS = [
  { name: "Tran Minh Tuan", rating: 4.9, students: 847, revenue: 42300000, specialty: "Frontend" },
  { name: "Nguyen Duc Minh", rating: 4.8, students: 623, revenue: 31100000, specialty: "AI/ML" },
  { name: "Pham Thanh Hung", rating: 4.8, students: 512, revenue: 25600000, specialty: "DevOps" },
  { name: "Le Thi Phuong", rating: 4.7, students: 445, revenue: 22200000, specialty: "UX/UI" },
];

export const FUNNEL_DATA = [
  { stage: "Visitors", value: 124800, percent: 100 },
  { stage: "Signups", value: 18720, percent: 15 },
  { stage: "Free Users", value: 12480, percent: 10 },
  { stage: "Trial", value: 6240, percent: 5 },
  { stage: "Paid", value: 3744, percent: 3 },
];

export const ADMIN_LEARNING_METRICS: AdminLearningMetric[] = [
  {
    month: "Jan",
    certificationsTrend: 70,
    freeCourses: 60,
    paidCourses: 50,
    enrolledCourses: 18,
    completedCourses: 26,
    certificatesEarned: 5,
    learningHours: 72,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Feb",
    certificationsTrend: 80,
    freeCourses: 70,
    paidCourses: 60,
    enrolledCourses: 20,
    completedCourses: 28,
    certificatesEarned: 6,
    learningHours: 78,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Mar",
    certificationsTrend: 90,
    freeCourses: 80,
    paidCourses: 70,
    enrolledCourses: 22,
    completedCourses: 31,
    certificatesEarned: 7,
    learningHours: 84,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Apr",
    certificationsTrend: 80,
    freeCourses: 70,
    paidCourses: 60,
    enrolledCourses: 19,
    completedCourses: 29,
    certificatesEarned: 6,
    learningHours: 79,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "May",
    certificationsTrend: 90,
    freeCourses: 80,
    paidCourses: 70,
    enrolledCourses: 21,
    completedCourses: 30,
    certificatesEarned: 7,
    learningHours: 82,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Jun",
    certificationsTrend: 80,
    freeCourses: 70,
    paidCourses: 60,
    enrolledCourses: 17,
    completedCourses: 27,
    certificatesEarned: 6,
    learningHours: 77,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Jul",
    certificationsTrend: 90,
    freeCourses: 80,
    paidCourses: 70,
    enrolledCourses: 24,
    completedCourses: 32,
    certificatesEarned: 7,
    learningHours: 86,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Aug",
    certificationsTrend: 80,
    freeCourses: 70,
    paidCourses: 60,
    enrolledCourses: 20,
    completedCourses: 29,
    certificatesEarned: 6,
    learningHours: 81,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Sep",
    certificationsTrend: 90,
    freeCourses: 80,
    paidCourses: 70,
    enrolledCourses: 22,
    completedCourses: 31,
    certificatesEarned: 7,
    learningHours: 85,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Oct",
    certificationsTrend: 80,
    freeCourses: 70,
    paidCourses: 60,
    enrolledCourses: 19,
    completedCourses: 28,
    certificatesEarned: 6,
    learningHours: 79,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Nov",
    certificationsTrend: 90,
    freeCourses: 80,
    paidCourses: 70,
    enrolledCourses: 23,
    completedCourses: 34,
    certificatesEarned: 7,
    learningHours: 89,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
  {
    month: "Dec",
    certificationsTrend: 80,
    freeCourses: 70,
    paidCourses: 60,
    enrolledCourses: 21,
    completedCourses: 30,
    certificatesEarned: 6,
    learningHours: 84,
    enrollmentGoal: 30,
    completionGoal: 40,
    certificatesGoal: 8,
    learningHoursGoal: 110,
  },
];