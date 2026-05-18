// ─── Shared types and constants for Interview feature ─────
import { FileText, Briefcase, Video, History, Clock, HelpCircle, RefreshCw, Shield, type LucideIcon } from "lucide-react";

export type InterviewPhase = "setup" | "interviewing" | "results";
export type InterviewMode = "text" | "live";
export type InterviewType = "domain" | "screening";

export interface ChatMessage {
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

export const AVAILABLE_TOPICS = [
  // IT & Tech
  { value: "react", label: "React & Frontend" },
  { value: "javascript", label: "JavaScript" },
  { value: "nodejs", label: "Node.js & Backend" },
  { value: "database", label: "Database & SQL" },
  { value: "devops", label: "DevOps & CI/CD" },
  { value: "linux", label: "Linux & System Admin" },
  // Marketing & Business
  { value: "digital-marketing", label: "Digital Marketing" },
  { value: "content-seo", label: "Content & SEO" },
  { value: "social-media", label: "Social Media Marketing" },
  { value: "business-strategy", label: "Business Strategy" },
  { value: "ux-ui", label: "UX/UI Design" },
  { value: "data-analytics", label: "Data Analytics" },
];

export const AVAILABLE_LANGUAGES = [
  { value: "en", label: "EN" },
  { value: "vi", label: "VI" },
];

export const STEP_ICONS: Record<string, LucideIcon> = {
  FileText, Briefcase, Video, History,
};

export const TIP_ICONS: Record<string, LucideIcon> = {
  Clock, HelpCircle, RefreshCw, Shield,
};
