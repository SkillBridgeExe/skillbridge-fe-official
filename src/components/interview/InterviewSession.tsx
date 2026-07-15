import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bot,
  Clock,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  RefreshCw,
  Send,
  StopCircle,
  Video,
  Volume2,
} from "lucide-react";
import { type ChatMessage, type InterviewMode } from "./types";
import {
  getInterviewModeLabelKey,
  getRealtimeMicStatusKey,
  type InterviewQuestionBankSourceKind,
} from "./interview-view-model";
import { AnswerPaceRing } from "./AnswerPaceRing";
import type { AnswerPaceState } from "@/hooks/use-answer-pace";

const PHASES = [
  { key: "SCREENING", labelVi: "Khởi động", labelEn: "Screening" },
  { key: "SKILL_PROBE", labelVi: "Kỹ năng & JD", labelEn: "Skill probe" },
  { key: "SCENARIO", labelVi: "Tình huống", labelEn: "Scenario" },
  { key: "BEHAVIORAL", labelVi: "Hành vi", labelEn: "Behavioral" },
  { key: "WRAP", labelVi: "Tổng kết", labelEn: "Wrap-up" }
];

interface CurrentQuestionMetadata {
  topicPhase: string | null;
  skillCanonical: string | null;
  currentThread: string | null;
  questionBankKey: string | null;
  sourceKind: InterviewQuestionBankSourceKind;
}

interface InterviewSessionProps {
  videoRef: RefObject<HTMLVideoElement>;
  webcamError: string | null;
  timeRemainingLabel: string;
  secondsRemaining: number;
  maxDurationSeconds: number;
  currentQuestionNumber: number;
  totalQuestionsPlanned: number | null;
  answeredCount: number;
  isEnding: boolean;
  interviewMode: InterviewMode;
  isLiveConnected: boolean;
  isVoiceFallback: boolean;
  voiceFallbackReason: string | null;
  isMicActive: boolean;
  isAiSpeaking: boolean;
  isQuestionAudioPlaying: boolean;
  questionAudioError: string | null;
  currentQuestion: string;
  currentQuestionMeta: CurrentQuestionMetadata | null;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  userAnswer: string;
  setUserAnswer: (value: string) => void;
  handleSubmitAnswer: () => void;
  toggleLiveMic: () => void;
  interviewFinished: boolean;
  onStop: () => void;
  apiError: string | null;
  currentTurnTrace?: {
    action: 'ask' | 'drill' | 'move_on' | 'wrap';
    phase: string;
    topic_id?: string;
    reasons: string[];
    depth: number;
    remaining_turn_budget: number;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  /** I-PACE: answer pacing state for the current turn. */
  answerPace?: AnswerPaceState;
}

export function InterviewSession({
  videoRef,
  webcamError,
  timeRemainingLabel,
  secondsRemaining,
  maxDurationSeconds,
  currentQuestionNumber: _currentQuestionNumber,
  totalQuestionsPlanned: _totalQuestionsPlanned,
  answeredCount,
  isEnding,
  interviewMode,
  isLiveConnected,
  isVoiceFallback,
  voiceFallbackReason,
  isMicActive,
  isAiSpeaking,
  isQuestionAudioPlaying,
  questionAudioError,
  currentQuestion,
  currentQuestionMeta,
  chatHistory,
  isLoading,
  userAnswer,
  setUserAnswer,
  handleSubmitAnswer,
  toggleLiveMic,
  interviewFinished,
  onStop,
  apiError,
  currentTurnTrace,
  answerPace,
}: InterviewSessionProps) {
  const { t, i18n } = useTranslation("common");
  const isVi = i18n?.language?.startsWith("vi") ?? true;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isVoiceConnected = isLiveConnected && !isVoiceFallback;
  const isLiveRealtime = interviewMode === "realtime" && isVoiceConnected;
  const isInterviewerSpeaking = isAiSpeaking || isQuestionAudioPlaying;
  const realtimeMicStatusKey = getRealtimeMicStatusKey({
    isLiveRealtime,
    isLoading,
    isInterviewerSpeaking,
    isMicActive,
  });
  const modeLabelKey = getInterviewModeLabelKey({
    interviewMode,
    isLiveConnected: isVoiceConnected,
    isVoiceFallback,
    questionAudioError,
  });
  const modeLabel = t(`interview.session.mode.${modeLabelKey}`);
  const progress =
    maxDurationSeconds > 0
      ? Math.max(
          0,
          Math.min(100, (secondsRemaining / maxDurationSeconds) * 100),
        )
      : 0;
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  return (
    <>
      <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-slate-50/30">
        <div className="px-6 md:px-10 py-6 md:py-8">
          <div className="space-y-6 animate-in fade-in duration-500">
            {apiError && (
              <Alert variant="destructive" className="bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            {isVoiceFallback && voiceFallbackReason && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{voiceFallbackReason}</AlertDescription>
              </Alert>
            )}

            {questionAudioError && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{questionAudioError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-black tabular-nums text-slate-900">
                    {timeRemainingLabel}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t("interview.session.timeRemaining")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="rounded-full">
                  {t("interview.session.answered", { count: answeredCount })}
                </Badge>
                <Badge
                  variant={isVoiceConnected ? "default" : "outline"}
                  className="rounded-full"
                >
                  {modeLabel}
                </Badge>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-xl font-bold"
                  onClick={onStop}
                  disabled={isEnding}
                >
                  {isEnding ? (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      {t("interview.session.ending")}
                    </>
                  ) : (
                    <>
                      <StopCircle className="mr-1.5 h-3.5 w-3.5" />
                      {t("interview.session.end")}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {maxDurationSeconds > 0 && (
              <Progress value={progress} className="h-1.5" />
            )}

            {/* Live Phase Timeline */}
            <div className="flex items-center justify-between gap-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm text-xs select-none">
              {PHASES.map((p, idx) => {
                const currentPhase = currentQuestionMeta?.topicPhase || 'SCREENING';
                const isCurrent = currentPhase.toUpperCase() === p.key || 
                                  (p.key === "SKILL_PROBE" && (currentPhase.toUpperCase().includes("PROBE") || currentPhase.toUpperCase().includes("JD") || currentPhase.toUpperCase().includes("REQUIREMENT")));
                
                const activeIndex = PHASES.findIndex(x => x.key === (
                  currentPhase.toUpperCase().includes("PROBE") || currentPhase.toUpperCase().includes("JD") || currentPhase.toUpperCase().includes("REQUIREMENT")
                    ? "SKILL_PROBE"
                    : currentPhase.toUpperCase()
                ));
                const isPast = idx < activeIndex;

                return (
                  <div key={p.key} className="flex-1 flex items-center gap-1.5 last:flex-initial">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-bold shrink-0 transition-all duration-300",
                        isCurrent ? "bg-[#00AEEF] border-[#00AEEF] text-white scale-110 shadow-sm animate-pulse" :
                        isPast ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"
                      )}>
                        {isPast ? "✓" : idx + 1}
                      </div>
                      <span className={cn(
                        "font-bold truncate text-[10px] md:text-xs",
                        isCurrent ? "text-[#00AEEF]" : isPast ? "text-emerald-700" : "text-slate-400"
                      )}>
                        {isVi ? p.labelVi : p.labelEn}
                      </span>
                    </div>
                    {idx < PHASES.length - 1 && (
                      <div className="hidden sm:block flex-1 h-[1.5px] bg-slate-100 mx-1" />
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                "space-y-4",
                isFullscreen &&
                  "fixed inset-0 z-50 flex flex-col justify-center bg-black/95 p-4 md:p-8",
              )}
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl bg-slate-900 shadow-xl",
                  isFullscreen
                    ? "mx-auto aspect-video w-full max-w-6xl"
                    : "aspect-video w-full",
                )}
              >
                <button
                  onClick={() => setIsFullscreen((value) => !value)}
                  className="absolute right-5 top-5 z-30 rounded-xl bg-black/50 p-2.5 text-white backdrop-blur-md transition-colors hover:bg-black/70"
                  title={
                    isFullscreen
                      ? t("interview.session.exitFullscreen")
                      : t("interview.session.fullscreen")
                  }
                  type="button"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </button>

                <div
                  className={cn(
                    "absolute bottom-5 right-5 z-20 flex aspect-[3/4] w-32 flex-col overflow-hidden rounded-xl border-2 bg-slate-800 shadow-2xl transition-all md:w-44",
                    isInterviewerSpeaking
                      ? "border-amber-400/60"
                      : isLoading
                        ? "border-blue-400/60"
                        : "border-emerald-400/40",
                  )}
                >
                  <div className="relative flex flex-1 items-center justify-center bg-slate-900">
                    <div
                      className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-3xl border-2 bg-slate-800 text-slate-300 transition-all md:h-20 md:w-20",
                        isInterviewerSpeaking
                          ? "border-amber-400 text-amber-400"
                          : isLoading
                            ? "border-blue-400 text-blue-400"
                            : "border-emerald-400/50 text-emerald-400",
                      )}
                    >
                      <Bot
                        className={cn(
                          "h-8 w-8 md:h-10 md:w-10",
                          isInterviewerSpeaking && "animate-bounce",
                        )}
                      />
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex h-8 items-center justify-center border-t px-2 text-[10px] font-bold uppercase tracking-widest",
                      isInterviewerSpeaking
                        ? "border-amber-400/30 bg-amber-400/20 text-amber-400"
                        : isLoading
                          ? "border-blue-400/30 bg-blue-400/20 text-blue-400"
                          : "border-emerald-400/30 bg-emerald-400/20 text-emerald-400",
                    )}
                  >
                    {isInterviewerSpeaking ? (
                      <>
                        <Volume2 className="mr-1.5 h-3 w-3" />{" "}
                        {t("interview.session.speaking")}
                      </>
                    ) : isLoading ? (
                      <>
                        <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />{" "}
                        {t("interview.session.thinking")}
                      </>
                    ) : (
                      t("interview.session.ready")
                    )}
                  </div>
                </div>

                {webcamError ? (
                  <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-slate-950 text-center text-slate-300">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-slate-800/80">
                      <Video className="h-8 w-8 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{webcamError}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("interview.session.videoFallback")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    className="h-full w-full scale-x-[-1] object-cover"
                    autoPlay
                    muted
                  />
                )}

                <div className="absolute left-5 top-5 z-30 flex flex-col gap-2 items-start">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-red-500/80 px-3 py-1.5 text-[11px] font-bold tracking-widest text-white backdrop-blur-md animate-pulse">
                      {t("interview.session.live")}
                    </div>
                    <div className="rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                      {modeLabel}
                    </div>
                  </div>
                  {currentTurnTrace?.confidence === 'low' && currentTurnTrace?.reasons?.includes('fallback_seed_question') && (
                    <div className="rounded-full bg-slate-700/85 px-3 py-1 text-[10px] font-semibold text-slate-100 backdrop-blur-md transition-all duration-300">
                      {t("interview.session.fallbackQuestionBadge")}
                    </div>
                  )}
                </div>

                {currentQuestion && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-5 pb-5">
                    <div className="max-w-[76%] rounded-lg bg-black/70 px-5 py-3 text-center text-white backdrop-blur-sm">
                      <p className="text-sm font-medium leading-relaxed md:text-base">
                        {currentQuestion.slice(0, 260)}
                        {currentQuestion.length > 260 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t("interview.session.transcriptTitle")}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {isLiveRealtime
                  ? t("interview.session.liveTranscriptSubtitle")
                  : t("interview.session.transcriptSubtitle")}
              </p>
            </div>
            {(interviewMode === "guided" || interviewMode === "realtime") && (
              <Button
                size="icon"
                variant={isMicActive ? "default" : "outline"}
                className="h-9 w-9 rounded-full"
                onClick={toggleLiveMic}
                disabled={
                  isLoading || (!isLiveRealtime && isInterviewerSpeaking)
                }
                title={
                  isLiveConnected
                    ? t("interview.session.pauseResumeMicrophone")
                    : t("interview.session.reconnectVoice")
                }
              >
                {isMicActive ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
              </Button>
            )}
            {answerPace && (
              <AnswerPaceRing pace={answerPace} />
            )}
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {chatHistory.map((message, index) => (
            <div
              key={`${message.timestamp.getTime()}-${index}`}
              className={cn(
                "flex gap-2",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.role === "ai" && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[86%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  message.role === "ai"
                    ? "rounded-tl-md border border-slate-100 bg-slate-50 text-slate-800"
                    : "rounded-tr-md bg-primary text-white",
                )}
              >
                {message.content}
                <p
                  className={cn(
                    "mt-1.5 text-[9px] font-medium",
                    message.role === "ai" ? "text-slate-400" : "text-white/70",
                  )}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-3.5 w-3.5 animate-spin text-primary" />
              </div>
              <Card className="border-slate-100 bg-slate-50 shadow-none">
                <CardContent className="px-4 py-3 text-xs text-slate-500">
                  {t("interview.session.generatingNextQuestion")}
                </CardContent>
              </Card>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-slate-100 p-3">
          {interviewFinished ? (
            <Button
              className="w-full rounded-xl font-bold"
              onClick={onStop}
              disabled={isEnding}
            >
              {t("interview.session.viewResults")}
            </Button>
          ) : isLiveRealtime ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                {realtimeMicStatusKey === "listening" ? (
                  <Mic className="h-4 w-4 text-emerald-600" />
                ) : realtimeMicStatusKey === "interviewerSpeaking" ? (
                  <Volume2 className="h-4 w-4 text-amber-600" />
                ) : realtimeMicStatusKey === "submitting" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <MicOff className="h-4 w-4 text-slate-400" />
                )}
                <span>
                  {t(`interview.session.realtimeMic.${realtimeMicStatusKey}`)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={userAnswer}
                onChange={(event) => setUserAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmitAnswer();
                  }
                }}
                placeholder={
                  isVoiceConnected
                    ? t("interview.session.spokenPlaceholder")
                    : t("interview.session.textPlaceholder")
                }
                disabled={isLoading || isEnding}
                className="min-h-[110px] resize-none rounded-xl bg-slate-50"
              />
              <Button
                className="w-full rounded-xl font-bold"
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim() || isLoading || isEnding}
              >
                <Send className="mr-2 h-4 w-4" />
                {t("interview.session.submitAnswer")}
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

