// ─── Interview Mock Data ─────────────────────────────
export interface InterviewStep {
  id: string;
  label: string;
  icon: string; // lucide icon name
  status: "completed" | "active" | "pending" | "locked";
}

export const MOCK_INTERVIEW_STEPS: InterviewStep[] = [
  { id: "upload-cv", label: "Upload CV", icon: "FileText", status: "completed" },
  { id: "upload-jd", label: "Target Role (JD)", icon: "Briefcase", status: "completed" },
  { id: "domain-interview", label: "Domain Expert Interview", icon: "Video", status: "active" },
  { id: "screening-interview", label: "Screening Interview", icon: "Video", status: "pending" },
  { id: "history", label: "Interview History", icon: "History", status: "pending" },
];

// Mock screening questions from a partner company
export const MOCK_SCREENING_QUESTIONS = [
  "Tell me about yourself and why you're interested in this position at our company?",
  "Describe a recent project you worked on. What was your role, and what were the outcomes?",
  "How do you handle tight deadlines and pressure? Can you give a specific example?",
  "What is your experience with agile development methodologies?",
  "Where do you see yourself professionally in the next 2-3 years?",
];

export const MOCK_INTERVIEW_QUESTIONS = [
  "Tell me about a challenging project where you had to optimize a React component's performance. What steps did you take?",
  "How would you design a scalable frontend architecture for a large e-commerce platform?",
  "Explain the difference between Server-Side Rendering and Client-Side Rendering. When would you choose one over the other?",
  "Describe a situation where you had to debug a complex state management issue. What tools and techniques did you use?",
  "How do you approach writing testable and maintainable React components?",
];

export const MOCK_INTERVIEW_TIPS = [
  { icon: "Clock", title: "Expect to spend ~20 minutes", desc: "Very short interviews may not be considered complete. Please answer thoughtfully." },
  { icon: "HelpCircle", title: "Need assistance? Just ask", desc: "Tell the AI if you need a question repeated or more time." },
  { icon: "RefreshCw", title: "3 of 3 interview retakes remaining", desc: "Reserve retakes for technical issues. Keep in mind that hiring managers can see your retake count." },
  { icon: "Shield", title: "Your data is in your control", desc: "Your responses are used only to assess your candidacy and are never used to train AI models." },
];

export interface QuestionAnalysis {
  question: string;
  score: number;
  strengths: string[];
  improvements: string[];
  timeTaken: number; // seconds
}

export interface InterviewResult {
  overallScore: number;
  confidenceLevel: string;
  clarityScore: string;
  facialFeedback: string;
  technicalDelivery: {
    conceptAccuracy: number;
    problemSolvingLogic: number;
    systemThinking: number;
    codeQuality: number;
  };
  communicationFlow: {
    articulation: number;
    listeningResponse: number;
    fillerWordMinimalist: number;
    structuredAnswers: number;
  };
  bodyLanguage: {
    eyeContact: number;
    posture: number;
    gestures: number;
    facialExpressions: number;
  };
  timeManagement: {
    averageResponseTime: number; // seconds
    totalDuration: number; // seconds
    questionsAnswered: number;
    questionsSkipped: number;
  };
  strengths: string[];
  areasToImprove: string[];
  questionAnalysis: QuestionAnalysis[];
  aiFeedback: string;
  recommendedModules: string[];
}

export const MOCK_INTERVIEW_RESULT: InterviewResult = {
  overallScore: 84,
  confidenceLevel: "High",
  clarityScore: "7.5/10",
  facialFeedback: "Positive",
  technicalDelivery: {
    conceptAccuracy: 90,
    problemSolvingLogic: 75,
    systemThinking: 60,
    codeQuality: 82,
  },
  communicationFlow: {
    articulation: 85,
    listeningResponse: 95,
    fillerWordMinimalist: 40,
    structuredAnswers: 78,
  },
  bodyLanguage: {
    eyeContact: 72,
    posture: 88,
    gestures: 65,
    facialExpressions: 80,
  },
  timeManagement: {
    averageResponseTime: 95,
    totalDuration: 1140,
    questionsAnswered: 5,
    questionsSkipped: 0,
  },
  strengths: [
    "Excellent knowledge of React hooks and lifecycle",
    "Clear and concise explanations of technical concepts",
    "Good use of real-world examples from past projects",
    "Strong active listening skills",
  ],
  areasToImprove: [
    "System design answers lacked depth — consider studying scalability patterns",
    "High use of filler words ('um', 'like') — practice pausing instead",
    "Eye contact dropped during complex questions — try looking at camera more",
    "Could improve structure by using STAR method consistently",
  ],
  questionAnalysis: [
    {
      question: "React component performance optimization",
      score: 92,
      strengths: ["Mentioned React.memo, useMemo, useCallback", "Provided concrete metrics"],
      improvements: ["Could mention React Profiler tool"],
      timeTaken: 180,
    },
    {
      question: "Scalable frontend architecture for e-commerce",
      score: 68,
      strengths: ["Good understanding of micro-frontends"],
      improvements: ["Missed caching strategies", "No mention of CDN usage", "Lacked depth on state management at scale"],
      timeTaken: 240,
    },
    {
      question: "SSR vs CSR trade-offs",
      score: 88,
      strengths: ["Clear comparison with pros/cons", "Mentioned Next.js as example"],
      improvements: ["Could discuss ISR (Incremental Static Regeneration)"],
      timeTaken: 150,
    },
    {
      question: "Debugging complex state management",
      score: 85,
      strengths: ["Mentioned Redux DevTools and React Query", "Described systematic approach"],
      improvements: ["Could mention time-travel debugging"],
      timeTaken: 200,
    },
    {
      question: "Writing testable React components",
      score: 78,
      strengths: ["Good understanding of testing library"],
      improvements: ["Didn't mention integration testing", "Could discuss testing strategies more"],
      timeTaken: 170,
    },
  ],
  aiFeedback:
    "Your technical explanation of React hooks was excellent. However, your confidence dropped when discussing system architecture. We've added a new module on 'Scalable Frontend Architecture' to your roadmap to help you prepare better.",
  recommendedModules: [
    "Scalable Frontend Architecture",
    "System Design for Web Applications",
    "Effective Communication in Technical Interviews",
  ],
};

export const MOCK_INTERVIEW_HISTORY = [
  { id: 1, date: "2026-03-01", role: "Frontend Engineer", score: 78, status: "completed" },
  { id: 2, date: "2026-02-20", role: "Frontend Engineer", score: 72, status: "completed" },
  { id: 3, date: "2026-02-10", role: "React Developer", score: 65, status: "completed" },
];

export const MOCK_QUICK_STATS = {
  totalInterviews: 3,
  averageScore: 72,
  bestScore: 78,
  improvementRate: "+13%",
};
