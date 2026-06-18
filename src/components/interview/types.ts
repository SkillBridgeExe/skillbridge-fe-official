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

export type InterviewPhase = "setup" | "interviewing" | "results" | "history-detail";
export type InterviewWorkspaceTab = "practice" | "history";
export type InterviewMode = "guided" | "realtime";
export type InterviewType = "technical" | "hr" | "mixed";
export type InterviewVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "sage"
  | "shimmer"
  | "verse"
  | "marin"
  | "cedar";
export type InterviewSpeechSpeed = 0.9 | 1 | 1.15 | 1.3;

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

export const DEFAULT_INTERVIEW_VOICE: InterviewVoice = "marin";
export const DEFAULT_INTERVIEW_SPEECH_SPEED: InterviewSpeechSpeed = 1.15;
export const INTERVIEW_VOICE_STORAGE_KEY = "skillbridge.interview.voicePreference";

export const INTERVIEW_VOICE_OPTIONS = [
  { value: "alloy", i18nKey: "alloy" },
  { value: "ash", i18nKey: "ash" },
  { value: "ballad", i18nKey: "ballad" },
  { value: "marin", i18nKey: "marin" },
  { value: "cedar", i18nKey: "cedar" },
  { value: "coral", i18nKey: "coral" },
  { value: "echo", i18nKey: "echo" },
  { value: "sage", i18nKey: "sage" },
  { value: "shimmer", i18nKey: "shimmer" },
  { value: "verse", i18nKey: "verse" },
] as const satisfies readonly { value: InterviewVoice; i18nKey: string }[];

export const INTERVIEW_SPEECH_SPEED_OPTIONS = [
  { value: 0.9, i18nKey: "0_9" },
  { value: 1, i18nKey: "1_0" },
  { value: 1.15, i18nKey: "1_15" },
  { value: 1.3, i18nKey: "1_3" },
] as const satisfies readonly { value: InterviewSpeechSpeed; i18nKey: string }[];

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
