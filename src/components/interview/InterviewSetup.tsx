import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Video,
  ChevronUp,
  ChevronDown,
  Circle,
  Mic,
  MessageSquare,
  Play,
  RefreshCw,
} from "lucide-react";
import {
  AVAILABLE_LANGUAGES,
  AVAILABLE_TOPICS,
  TIP_ICONS,
  type InterviewMode,
  type InterviewType,
} from "./types";
import { MOCK_INTERVIEW_TIPS } from "@/lib/mock-data/interview";

interface InterviewSetupProps {
  tipsExpanded: boolean;
  setTipsExpanded: (v: boolean) => void;
  onStart: () => void;
  selectedTopic: string;
  setSelectedTopic: (v: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (v: string) => void;
  isLoading: boolean;
  interviewMode: InterviewMode;
  setInterviewMode: (v: InterviewMode) => void;
  interviewType: InterviewType;
  setInterviewType: (v: InterviewType) => void;
}

export function InterviewSetup({
  tipsExpanded,
  setTipsExpanded,
  onStart,
  selectedTopic,
  setSelectedTopic,
  selectedLanguage,
  setSelectedLanguage,
  isLoading,
  interviewMode,
  setInterviewMode,
  interviewType,
  setInterviewType,
}: InterviewSetupProps) {
  const [setupStream, setSetupStream] = useState<MediaStream | null>(null);

  // Auto-start camera on mount
  useEffect(() => {
    let streamRef: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          streamRef = stream;
          setSetupStream(stream);
        })
        .catch(console.warn);
    }

    return () => {
      if (streamRef) {
        streamRef.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Interview Type Tabs — clean underline style */}
      <div className="flex items-center gap-6 border-b border-slate-200">
        <button
          onClick={() => setInterviewType("domain")}
          className={cn(
            "pb-2.5 text-sm font-semibold transition-all border-b-2 -mb-px",
            interviewType === "domain"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Domain Expert
        </button>
        <button
          onClick={() => {
            setInterviewType("screening");
            setInterviewMode("live");
          }}
          className={cn(
            "pb-2.5 text-sm font-semibold transition-all border-b-2 -mb-px",
            interviewType === "screening"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Screening
        </button>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-poppins font-bold text-slate-900">
            {interviewType === "screening"
              ? "Screening Interview"
              : "Domain Expert Interview"}
          </h1>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            {interviewType === "screening" ? "~10 min" : "~5 min"}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {interviewType === "screening"
            ? "Practice answering screening questions from partner companies"
            : "Choose a topic and test your knowledge with AI"}
        </p>
      </div>

      {/* Language + Topic (domain) or Screening Questions Preview */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setSelectedLanguage(lang.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold transition-all",
                selectedLanguage === lang.value
                  ? "bg-primary text-white"
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
        {interviewType === "domain" &&
          AVAILABLE_TOPICS.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedTopic(t.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                selectedTopic === t.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              {t.label}
            </button>
          ))}
      </div>

      {/* Camera + Tips Card side by side (Mercor layout) */}
      <div className="flex gap-6 items-start">
        {/* Camera preview */}
        <div className="flex-1 min-w-0">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
            <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-slate-400 space-y-5 relative overflow-hidden">
              {setupStream ? (
                <video
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-10"
                  ref={(el) => {
                    if (el && setupStream) el.srcObject = setupStream;
                  }}
                />
              ) : (
                <>
                  <div className="relative w-24 h-24 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                    <Video className="w-10 h-10 text-blue-400/80 animate-pulse" />
                    <div
                      className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping opacity-50"
                      style={{ animationDuration: "3s" }}
                    />
                    <div
                      className="absolute inset-[-15px] rounded-full border border-blue-500/10 animate-ping opacity-30"
                      style={{ animationDuration: "3s", animationDelay: "1s" }}
                    />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">
                    Camera preview will appear here
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Things to know card (right of camera) */}
        <div className="w-[280px] shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tips header */}
            <div className="p-4">
              <button
                onClick={() => setTipsExpanded(!tipsExpanded)}
                className="flex items-center justify-between w-full"
              >
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Things to know
                </h3>
                {tipsExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
              {tipsExpanded && (
                <div className="mt-4 space-y-3.5">
                  {MOCK_INTERVIEW_TIPS.map((tip, i) => {
                    const TipIcon = TIP_ICONS[tip.icon] || Circle;
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                          <TipIcon className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-tight">
                            {tip.title}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                            {tip.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mode Toggle — hidden when screening (always live) */}
            <div className="px-4 pb-2">
              {interviewType === "screening" ? (
                <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold">
                  <Mic className="w-3.5 h-3.5" /> Live Voice Only
                </div>
              ) : (
                <div className="flex rounded-lg bg-slate-100 p-1">
                  <button
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5",
                      interviewMode === "text"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                    onClick={() => setInterviewMode("text")}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Text
                  </button>
                  <button
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5",
                      interviewMode === "live"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                    onClick={() => setInterviewMode("live")}
                  >
                    <Mic className="w-3.5 h-3.5" /> Live Voice
                  </button>
                </div>
              )}
            </div>

            {/* Start Now Button */}
            <div className="px-4 pb-4">
              <Button
                size="lg"
                className={cn(
                  "w-full rounded-xl text-white font-bold text-sm h-11 transition-all duration-200 bg-primary hover:bg-primary/90 active:scale-[0.98]",
                  isLoading && "opacity-70 cursor-not-allowed"
                )}
                onClick={onStart}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Connecting...
                  </>
                ) : interviewMode === "live" ? (
                  <>
                    <Mic className="w-4 h-4 mr-2" /> Start Live Interview
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> Start Interview
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
