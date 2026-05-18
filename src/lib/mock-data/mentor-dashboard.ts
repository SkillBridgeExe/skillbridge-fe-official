// ─── Mentor Dashboard Mock Data ────────────────────────────────────────────

export interface MentorProfile {
  id: string;
  name: string;
  avatar: string;
  headline: string;
  location: string;
  timezone: string;
  bio: string;
  skills: string[];
  socialLinks: { linkedin?: string; github?: string; portfolio?: string };
  isActive: boolean;
  rating: number;
  totalSessions: number;
  totalEarnings: number;
  workExperience: WorkExperience[];
  pricing: number;
  availableSlots: AvailabilitySlot[];
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  fromMonth: string;
  fromYear: string;
  toMonth: string;
  toYear: string;
  isCurrent: boolean;
}

export interface AvailabilitySlot {
  day: string;
  from: string;
  to: string;
}

export interface MenteeRequest {
  id: string;
  name: string;
  avatar: string;
  initials: string;
  skills: string[];
  goalRole: string;
  experience: string;
  cvSummary: string;
  roadmap: string[];
  paymentStatus: 'pending_10' | 'paid_10' | 'paid_100';
  sessionDate?: string;
  sessionTime?: string;
  requestedAt: string;
  status: 'new' | 'accepted' | 'declined' | 'waiting_payment';
  message: string;
}

export interface SessionHistory {
  id: string;
  menteeName: string;
  menteeAvatar: string;
  date: string;
  duration: string;
  topic: string;
  status: 'completed' | 'cancelled' | 'no_show';
  earnings: number;
  rating?: number;
  review?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'earning' | 'withdrawal';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending';
}

export interface ActiveMentee {
  id: string;
  name: string;
  avatar: string;
  initials: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  sessionDate?: string;
  paymentStatus: 'paid_10' | 'paid_100';
  online: boolean;
}

// ─── Data ──────────────────────────────────────────────────────────────────

export const MENTOR_PROFILE: MentorProfile = {
  id: "mentor-001",
  name: "Nguyen Duc Minh",
  avatar: "",
  headline: "Senior Frontend Engineer @ Shopee | 7 years React/TypeScript",
  location: "Ho Chi Minh City, Vietnam",
  timezone: "Asia/Ho_Chi_Minh",
  bio: "Chào mừng bạn! Tôi là kỹ sư Frontend với 7 năm kinh nghiệm, hiện đang làm tại Shopee. Tôi chuyên về React, TypeScript và System Design. Phong cách hướng dẫn của tôi tập trung vào việc giải quyết vấn đề thực tế và xây dựng tư duy kỹ thuật bền vững.\n\nNhững gì bạn nhận được khi làm việc với tôi:\n• Code review chi tiết với các best practices\n• Lộ trình học tập cá nhân hoá theo mục tiêu của bạn\n• Chuẩn bị phỏng vấn tại các công ty top tier",
  skills: ["React", "TypeScript", "Next.js", "System Design", "GraphQL", "Performance Optimization", "Career Coaching"],
  socialLinks: {
    linkedin: "https://linkedin.com/in/nguyenducminh",
    github: "https://github.com/nguyenducminh",
    portfolio: "https://nguyenducminh.dev"
  },
  isActive: true,
  rating: 4.8,
  totalSessions: 124,
  totalEarnings: 38500000,
  workExperience: [
    { id: "w1", company: "Shopee", position: "Senior Frontend Engineer", fromMonth: "03", fromYear: "2022", toMonth: "", toYear: "", isCurrent: true },
    { id: "w2", company: "VNG Corporation", position: "Frontend Developer", fromMonth: "06", fromYear: "2019", toMonth: "02", toYear: "2022", isCurrent: false },
    { id: "w3", company: "FPT Software", position: "Junior Developer", fromMonth: "01", fromYear: "2017", toMonth: "05", toYear: "2019", isCurrent: false },
  ],
  pricing: 500000,
  availableSlots: [
    { day: "Monday", from: "20:00", to: "22:00" },
    { day: "Wednesday", from: "20:00", to: "22:00" },
    { day: "Saturday", from: "09:00", to: "12:00" },
    { day: "Sunday", from: "09:00", to: "12:00" },
  ]
};

export const MENTEE_REQUESTS: MenteeRequest[] = [
  {
    id: "req-001",
    name: "Tran Thi Lan",
    avatar: "",
    initials: "TL",
    skills: ["HTML", "CSS", "JavaScript"],
    goalRole: "Frontend Developer",
    experience: "1 year",
    cvSummary: "Fresher với kinh nghiệm làm dự án freelance. Biết cơ bản HTML/CSS/JS, muốn nâng cao lên React.",
    roadmap: ["HTML/CSS fundamentals", "JavaScript ES6+", "React basics", "TypeScript", "Next.js"],
    paymentStatus: "paid_10",
    requestedAt: "2026-03-20 09:30",
    status: "new",
    message: "Chào anh Minh, em muốn được anh hướng dẫn về React và TypeScript để chuyển sang làm Frontend full-time. Em đang tự học nhưng cần định hướng rõ ràng hơn."
  },
  {
    id: "req-002",
    name: "Le Van Phuc",
    avatar: "",
    initials: "LP",
    skills: ["React", "Redux", "Node.js"],
    goalRole: "Senior Frontend Engineer",
    experience: "3 years",
    cvSummary: "Mid-level developer tại startup. Đã làm React 2 năm, muốn nâng level lên Senior tại big tech.",
    roadmap: ["System Design", "Performance optimization", "Architecture patterns", "Technical interview prep"],
    paymentStatus: "paid_10",
    requestedAt: "2026-03-20 14:15",
    status: "new",
    message: "Hi anh, em đang ở level mid và muốn target Senior trong 6 tháng tới. Cần anh review code và guide system design."
  },
  {
    id: "req-003",
    name: "Pham Nguyen Khanh",
    avatar: "",
    initials: "PK",
    skills: ["Vue.js", "Python"],
    goalRole: "Full-stack Developer",
    experience: "2 years",
    cvSummary: "Backend Python developer muốn chuyển sang full-stack với React frontend.",
    roadmap: ["JavaScript/TypeScript", "React ecosystem", "REST API design", "Deployment & DevOps basics"],
    paymentStatus: "paid_10",
    requestedAt: "2026-03-19 16:00",
    status: "new",
    message: "Anh ơi, em đang làm backend Python nhưng muốn học thêm React để trở thành full-stack. Công ty em đang dùng Vue nhưng em muốn học React vì nhiều cơ hội hơn."
  }
];

export const WAITING_PAYMENT_REQUESTS: MenteeRequest[] = [
  {
    id: "req-004",
    name: "Nguyen Minh Hoang",
    avatar: "",
    initials: "NH",
    skills: ["React", "TypeScript"],
    goalRole: "Staff Engineer",
    experience: "5 years",
    cvSummary: "Senior tại VNG, target Staff Engineer ở big tech nước ngoài.",
    roadmap: ["System design advanced", "Leadership skills", "FAANG interview"],
    paymentStatus: "paid_10",
    sessionDate: "2026-03-25",
    sessionTime: "20:00 - 21:30",
    requestedAt: "2026-03-18 10:00",
    status: "accepted",
    message: ""
  }
];

export const SESSION_HISTORY: SessionHistory[] = [
  { id: "s001", menteeName: "Hoang Van Nam", menteeAvatar: "", date: "2026-03-15", duration: "90 min", topic: "React Performance & Code Review", status: "completed", earnings: 450000, rating: 5, review: "Anh Minh dạy rất chi tiết, giúp em hiểu rõ về React memo và useMemo. Recommend 100%!" },
  { id: "s002", menteeName: "Tran Bich Ngoc", menteeAvatar: "", date: "2026-03-12", duration: "60 min", topic: "Career Roadmap Planning", status: "completed", earnings: 450000, rating: 5, review: "Session rất hiệu quả, anh đã giúp em có lộ trình rõ ràng để target vị trí Frontend tại Grab." },
  { id: "s003", menteeName: "Do Thanh Long", menteeAvatar: "", date: "2026-03-10", duration: "90 min", topic: "System Design: E-commerce Platform", status: "completed", earnings: 450000, rating: 4, review: "Kiến thức solid, nhưng session hơi nhiều lý thuyết. Mong được làm thực hành nhiều hơn." },
  { id: "s004", menteeName: "Vu Thu Ha", menteeAvatar: "", date: "2026-03-07", duration: "60 min", topic: "TypeScript Advanced Patterns", status: "completed", earnings: 450000, rating: 5, review: "Tuyệt vời! Anh giải thích generic types và conditional types rất dễ hiểu." },
  { id: "s005", menteeName: "Bui Duc Cuong", menteeAvatar: "", date: "2026-03-04", duration: "60 min", topic: "Interview Preparation", status: "cancelled", earnings: 0 },
  { id: "s006", menteeName: "Nguyen Lan Anh", menteeAvatar: "", date: "2026-03-01", duration: "90 min", topic: "Next.js & SSR Deep Dive", status: "completed", earnings: 450000, rating: 5, review: "Anh rất patient và explain rõ ràng từng concept. Bonus: anh còn cho thêm resources để đọc thêm!" },
];

export const WALLET_TRANSACTIONS: WalletTransaction[] = [
  { id: "tx001", type: "earning", amount: 450000, description: "Session với Hoang Van Nam", date: "2026-03-15", status: "completed" },
  { id: "tx002", type: "earning", amount: 450000, description: "Session với Tran Bich Ngoc", date: "2026-03-12", status: "completed" },
  { id: "tx003", type: "withdrawal", amount: 2000000, description: "Rút tiền về Vietcombank ****1234", date: "2026-03-11", status: "completed" },
  { id: "tx004", type: "earning", amount: 450000, description: "Session với Do Thanh Long", date: "2026-03-10", status: "completed" },
  { id: "tx005", type: "earning", amount: 450000, description: "Session với Vu Thu Ha", date: "2026-03-07", status: "completed" },
  { id: "tx006", type: "withdrawal", amount: 1500000, description: "Rút tiền về MB Bank ****5678", date: "2026-03-05", status: "completed" },
  { id: "tx007", type: "earning", amount: 450000, description: "Session với Nguyen Lan Anh", date: "2026-03-01", status: "completed" },
];

export const ACTIVE_MENTEES: ActiveMentee[] = [
  { id: "m001", name: "Hoang Van Nam", avatar: "", initials: "HN", lastMessage: "Anh ơi, em đã fix bug rồi, anh xem lại giúp em nhé!", lastMessageTime: "10:32", unread: 2, sessionDate: "2026-03-25 20:00", paymentStatus: "paid_100", online: true },
  { id: "m002", name: "Tran Bich Ngoc", avatar: "", initials: "TN", lastMessage: "Em hiểu rồi ạ, cảm ơn anh nhiều!", lastMessageTime: "Hôm qua", unread: 0, paymentStatus: "paid_10", online: false },
  { id: "m003", name: "Do Thanh Long", avatar: "", initials: "DL", lastMessage: "Anh có thể review PR này không ạ?", lastMessageTime: "Hôm qua", unread: 1, sessionDate: "2026-03-28 20:00", paymentStatus: "paid_100", online: true },
  { id: "m004", name: "Nguyen Lan Anh", avatar: "", initials: "NA", lastMessage: "Cho em hỏi về useCallback ạ", lastMessageTime: "2 ngày trước", unread: 0, paymentStatus: "paid_10", online: false },
];

export const TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
export const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const YEARS = ["2018","2019","2020","2021","2022","2023","2024","2025","2026"];