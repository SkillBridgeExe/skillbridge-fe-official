import {
  Briefcase,
  Clock,
  FileText,
  HelpCircle,
  History,
  RefreshCw,
  Shield,
  Video,
  type LucideIcon,
} from "lucide-react";

export type InterviewPhase = "setup" | "interviewing" | "results";
export type InterviewMode = "guided" | "realtime";
export type InterviewType = "technical" | "hr" | "mixed";

export interface ChatMessage {
  id?: string;
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

export const AVAILABLE_TARGET_ROLES = [
  { value: "frontend_developer", label: "Frontend Developer" },
  { value: "backend_developer", label: "Backend Developer" },
  { value: "fullstack_developer", label: "Fullstack Developer" },
  { value: "mobile_developer", label: "Mobile Developer" },
  { value: "devops_engineer", label: "DevOps Engineer" },
  { value: "qa_tester", label: "QA Tester" },
  { value: "data_analyst", label: "Data Analyst" },
  { value: "ai_ml_engineer", label: "AI / ML Engineer" },
];

export const AVAILABLE_LANGUAGES = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
] as const;

export const STEP_ICONS: Record<string, LucideIcon> = {
  FileText,
  Briefcase,
  Video,
  History,
};

export const TIP_ICONS: Record<string, LucideIcon> = {
  Clock,
  HelpCircle,
  RefreshCw,
  Shield,
};
