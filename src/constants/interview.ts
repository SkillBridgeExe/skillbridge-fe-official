export interface InterviewStep {
  id: string;
  label: string;
  icon: string;
  status: "completed" | "active" | "pending" | "locked";
}

export const INTERVIEW_SETUP_STEPS: InterviewStep[] = [
  { id: "choose-cv", label: "Choose CV", icon: "FileText", status: "completed" },
  { id: "choose-context", label: "Match or Role", icon: "Briefcase", status: "completed" },
  { id: "interview", label: "Voice Interview", icon: "Video", status: "active" },
  { id: "result", label: "AI Feedback", icon: "History", status: "pending" },
];

export const INTERVIEW_SETUP_TIPS = [
  {
    id: "duration",
    icon: "Clock",
    title: "The interview has a time limit",
    desc: "When time runs out, the interview ends and moves to scoring.",
  },
  {
    id: "answer",
    icon: "HelpCircle",
    title: "Answer one question at a time",
    desc: "Short, structured answers with concrete examples produce better feedback.",
  },
  {
    id: "fallback",
    icon: "RefreshCw",
    title: "Voice has text fallback",
    desc: "If microphone or realtime is unavailable, continue with text in the same session.",
  },
  {
    id: "privacy",
    icon: "Shield",
    title: "Privacy first",
    desc: "Only the transcript is used for scoring; recordings are not stored.",
  },
];
