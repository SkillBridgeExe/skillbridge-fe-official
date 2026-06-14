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
    icon: "Clock",
    title: "Backend timer is enforced",
    desc: "The timer comes from your plan limit and cannot be bypassed by refreshing.",
  },
  {
    icon: "HelpCircle",
    title: "Answer one question at a time",
    desc: "Short, structured answers with concrete examples produce better feedback.",
  },
  {
    icon: "RefreshCw",
    title: "Voice has text fallback",
    desc: "If microphone or realtime is unavailable, continue with text in the same session.",
  },
  {
    icon: "Shield",
    title: "Transcript first",
    desc: "SkillBridge stores interview text and scoring metadata, not raw audio.",
  },
];
