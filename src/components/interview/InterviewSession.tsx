import { useState, type RefObject } from "react";
import {
  CircleHelp,
  Lightbulb,
  MessageSquareText,
  Mic,
  MicOff,
  RefreshCw,
  RotateCcw,
  Send,
  SkipForward,
  Sparkles,
  StopCircle,
  Video,
  Wifi,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { InterviewExperienceMode, RealtimeCandidateIntent } from "@/api/interview-api";
import type { ChatMessage } from "./types";
import { InterviewVoiceOrb, type InterviewerVoiceState } from "./InterviewVoiceOrb";

interface InterviewSessionProps {
  videoRef: RefObject<HTMLVideoElement>;
  webcamError: string | null;
  interviewerName?: string;
  timeRemainingLabel: string;
  isConnected: boolean;
  isVietnamese: boolean;
  voiceState: InterviewerVoiceState;
  voiceLabel: string;
  subtitle?: string;
  currentQuestion: string;
  chatHistory: ChatMessage[];
  experienceMode: InterviewExperienceMode;
  isMicActive: boolean;
  isReconnecting: boolean;
  isEnding: boolean;
  userAnswer: string;
  setUserAnswer: (value: string) => void;
  onSubmitText: () => void;
  onToggleMic: () => void;
  onSwitchToText: () => void;
  onIntent: (intent: RealtimeCandidateIntent) => void;
  onEnd: () => void;
  apiError: string | null;
}

export function InterviewSession({
  videoRef,
  webcamError,
  interviewerName = "Alex",
  timeRemainingLabel,
  isConnected,
  isVietnamese,
  voiceState,
  voiceLabel,
  subtitle,
  currentQuestion,
  chatHistory,
  experienceMode,
  isMicActive,
  isReconnecting,
  isEnding,
  userAnswer,
  setUserAnswer,
  onSubmitText,
  onToggleMic,
  onSwitchToText,
  onIntent,
  onEnd,
  apiError,
}: InterviewSessionProps) {
  const [showText, setShowText] = useState(false);

  const switchToText = () => {
    setShowText(true);
    onSwitchToText();
  };
  const copy = isVietnamese
    ? {
        interview: "Phỏng vấn",
        connected: "Đã kết nối",
        currentQuestion: "Câu hỏi hiện tại",
        you: "Bạn",
        textPlaceholder: "Nhập câu trả lời trong cùng phiên…",
        reconnecting: "Đang kết nối lại…",
        switchToText: "Chuyển sang text",
        repeat: "Nhắc lại",
        clarify: "Làm rõ",
        noAnswer: "Không biết",
        easier: "Câu dễ hơn",
        hint: "Gợi ý",
        feedback: "Nhận xét nhanh",
        end: "Kết thúc",
      }
    : {
        interview: "Interview",
        connected: "Connected",
        currentQuestion: "Current question",
        you: "You",
        textPlaceholder: "Type your answer in the same session…",
        reconnecting: "Reconnecting…",
        switchToText: "Switch to text",
        repeat: "Repeat",
        clarify: "Clarify",
        noAnswer: "I don't know",
        easier: "Easier question",
        hint: "Hint",
        feedback: "Quick feedback",
        end: "End",
      };

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-slate-50/60">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2 md:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {copy.interview} · {experienceMode === "MOCK" ? "Mock" : "Practice"}
          </p>
          <p className="text-xs text-slate-500">{interviewerName} · AI Interviewer</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600">
          <span
            className={cn(
              "hidden items-center gap-1.5 sm:flex",
              isConnected ? "text-emerald-700" : "text-amber-700",
            )}
          >
            <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
            {isConnected ? copy.connected : copy.reconnecting}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono tabular-nums">{timeRemainingLabel}</span>
          <Button size="sm" variant="destructive" onClick={onEnd} disabled={isEnding}>
            <StopCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {copy.end}
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-3 pb-28 md:p-6 md:pb-6">
        {apiError && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}
        {isReconnecting && (
          <Alert className="mb-3 border-amber-200 bg-amber-50 text-amber-900">
            <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{copy.reconnecting}</span>
              <Button size="sm" variant="outline" onClick={switchToText}>{copy.switchToText}</Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid min-h-[560px] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <section className="relative min-h-[320px] overflow-hidden rounded-2xl bg-slate-950 shadow-xl lg:min-h-[560px]">
            {webcamError ? (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-slate-300">
                <Video className="h-9 w-9 text-slate-500" />
                <p className="text-sm font-semibold">{webcamError}</p>
              </div>
            ) : (
              <video ref={videoRef} className="h-full w-full scale-x-[-1] object-cover" autoPlay muted playsInline />
            )}
            <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
              SELF CAMERA
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-1 flex-col items-center justify-center px-5 py-7">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {interviewerName} · AI Interviewer
              </p>
              <InterviewVoiceOrb state={voiceState} label={voiceLabel} subtitle={subtitle} />
              <div className="mt-7 w-full rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{copy.currentQuestion}</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800">{currentQuestion}</p>
              </div>
            </div>

            <details className="group border-t border-slate-100 max-lg:[&[open]]:fixed max-lg:[&[open]]:inset-x-3 max-lg:[&[open]]:bottom-16 max-lg:[&[open]]:z-50 max-lg:[&[open]]:rounded-2xl max-lg:[&[open]]:border max-lg:[&[open]]:bg-white max-lg:[&[open]]:shadow-2xl">
              <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-slate-700">
                Transcript <span className="text-xs font-normal text-slate-400">({chatHistory.length})</span>
              </summary>
              <div className="max-h-52 space-y-2 overflow-y-auto border-t border-slate-100 p-4">
                {chatHistory.map((message, index) => (
                  <div key={`${message.timestamp.getTime()}-${index}`} className={cn("text-sm", message.role === "user" ? "text-slate-800" : "text-slate-600")}>
                    <span className="mr-2 text-[10px] font-bold uppercase text-slate-400">{message.role === "user" ? copy.you : interviewerName}</span>
                    {message.content}
                  </div>
                ))}
              </div>
            </details>
          </aside>
        </div>

        {showText && (
          <div className="mx-auto mt-4 flex max-w-3xl gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <Textarea
              value={userAnswer}
              onChange={(event) => setUserAnswer(event.target.value)}
              placeholder={copy.textPlaceholder}
              className="min-h-20 resize-none border-0 bg-slate-50"
            />
            <Button size="icon" className="self-end" onClick={onSubmitText} disabled={!userAnswer.trim()} aria-label="Gửi câu trả lời">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-2 shadow-[0_-8px_30px_-20px_rgba(15,23,42,.5)] backdrop-blur md:sticky">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto">
          <Button size="sm" variant={isMicActive ? "default" : "outline"} onClick={onToggleMic} aria-label="Bật hoặc tắt microphone">
            {isMicActive ? <Mic className="mr-1.5 h-4 w-4" /> : <MicOff className="mr-1.5 h-4 w-4" />} Mic
          </Button>
          <Button size="sm" variant="outline" onClick={switchToText}><MessageSquareText className="mr-1.5 h-4 w-4" />Text</Button>
          <Button size="sm" variant="outline" onClick={() => onIntent("REPEAT")}><RotateCcw className="mr-1.5 h-4 w-4" />{copy.repeat}</Button>
          <Button size="sm" variant="outline" onClick={() => onIntent("CLARIFY")}><CircleHelp className="mr-1.5 h-4 w-4" />{copy.clarify}</Button>
          <Button size="sm" variant="outline" onClick={() => onIntent("NO_ANSWER")}>{copy.noAnswer}</Button>
          <Button size="sm" variant="outline" onClick={() => onIntent("SKIP")}><SkipForward className="mr-1.5 h-4 w-4" />Skip</Button>
          {experienceMode === "PRACTICE" && (
            <>
              <Button size="sm" variant="outline" onClick={() => onIntent("EASIER")}>{copy.easier}</Button>
              <Button size="sm" variant="outline" onClick={() => onIntent("HINT")}><Lightbulb className="mr-1.5 h-4 w-4" />{copy.hint}</Button>
              <Button size="sm" variant="outline" onClick={() => onIntent("FEEDBACK")}><Sparkles className="mr-1.5 h-4 w-4" />{copy.feedback}</Button>
            </>
          )}
          <Button size="sm" variant="destructive" className="ml-auto" onClick={onEnd} disabled={isEnding}>
            <StopCircle className="mr-1.5 h-4 w-4" />{copy.end}
          </Button>
        </div>
      </div>
    </main>
  );
}
