import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Clock,
  RefreshCw,
  StopCircle,
  Bot,
  Send,
  Volume2,
  Mic,
  MicOff,
  ArrowRight,
  Video,
  Minimize2,
  Maximize2,
  MessageSquare,
} from "lucide-react";
import { type ChatMessage, type InterviewMode, type InterviewPhase } from "./types";

interface InterviewSessionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  webcamError: string | null;
  timer: number;
  currentQuestion: number;
  questionsLeft: number;
  isEnding: boolean;
  interviewMode: InterviewMode;
  isLiveConnected: boolean;
  isAiSpeaking: boolean;
  chatHistory: ChatMessage[];
  liveTranscripts: ChatMessage[];
  isLoading: boolean;
  userAnswer: string;
  setUserAnswer: (v: string) => void;
  handleSubmitAnswer: () => void;
  toggleLiveMic: () => void;
  isMicActive: boolean;
  interviewFinished: boolean;
  onStop: () => void;
  apiError: string | null;
  phase: InterviewPhase;
}

export function InterviewSession({
  videoRef,
  webcamError,
  timer,
  currentQuestion,
  questionsLeft,
  isEnding,
  interviewMode,
  isLiveConnected,
  isAiSpeaking,
  chatHistory,
  liveTranscripts,
  isLoading,
  userAnswer,
  setUserAnswer,
  handleSubmitAnswer,
  toggleLiveMic,
  isMicActive,
  interviewFinished,
  onStop,
  apiError,
  phase,
}: InterviewSessionProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  const currentTranscripts = interviewMode === "live" ? liveTranscripts : chatHistory;
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentTranscripts]);

  const lastAiMsg = chatHistory.filter((m) => m.role === "ai").pop();

  return (
    <>
      {/* CENTER CONTENT */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-slate-50/30">
        <div className="px-6 md:px-10 py-6 md:py-8">
          <div className="space-y-8 animate-in fade-in duration-500">
            {apiError && (
              <Card className="border-red-200 bg-red-50/80">
                <CardContent className="py-4 text-sm text-red-700 font-medium">
                  {apiError}
                </CardContent>
              </Card>
            )}

            {/* Timer Status Bar */}
            {phase === "interviewing" && (
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 tabular-nums">
                      {String(Math.floor(timer / 60)).padStart(2, "0")}:
                      {String(timer % 60).padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                      Duration
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900">
                      {currentQuestion}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                      Answered
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-primary">
                      {questionsLeft}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                      Remaining
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-xl px-4 font-bold h-9"
                    onClick={onStop}
                    disabled={isEnding}
                  >
                    {isEnding ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />{" "}
                        Ending...
                      </>
                    ) : (
                      <>
                        <StopCircle className="w-3.5 h-3.5 mr-1.5" /> End Interview
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Video View */}
            <div
              className={cn(
                "space-y-6 animate-in fade-in duration-500",
                isFullscreen &&
                  "fixed inset-0 z-50 bg-black/95 p-4 md:p-8 flex flex-col justify-center"
              )}
            >
              {/* Video container */}
              <div
                className={cn(
                  "relative rounded-2xl overflow-hidden bg-slate-900 shadow-2xl transition-all duration-300",
                  isFullscreen
                    ? "w-full max-w-6xl mx-auto aspect-video"
                    : "w-full aspect-video"
                )}
              >
                {/* Fullscreen Toggle */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="absolute top-5 right-5 p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-xl text-white transition-colors z-30"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>

                {/* AI PIP (Picture in Picture) — 3-State Indicator */}
                <div
                  className={cn(
                    "absolute bottom-5 right-5 w-32 md:w-48 aspect-[3/4] rounded-xl border-2 shadow-2xl overflow-hidden z-20 flex flex-col transition-all duration-500",
                    isAiSpeaking
                      ? "border-amber-400/60 bg-slate-800 shadow-[0_0_30px_rgba(251,191,36,0.3)]"
                      : isLoading
                      ? "border-blue-400/60 bg-slate-800 shadow-[0_0_20px_rgba(96,165,250,0.2)]"
                      : "border-emerald-400/40 bg-slate-800 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                  )}
                >
                  <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 relative overflow-hidden">
                    {/* AI Bot Icon */}
                    <div className="absolute inset-0 flex items-center justify-center z-0 bg-slate-900">
                      <div
                        className={cn(
                          "w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-slate-800 border-2 flex items-center justify-center transition-all duration-500 shadow-xl relative overflow-hidden",
                          isAiSpeaking
                            ? "border-amber-400 text-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]"
                            : isLoading
                            ? "border-blue-400 text-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.2)]"
                            : "border-emerald-400/50 text-emerald-400"
                        )}
                      >
                        {/* Subtle gradient inside the bot container */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />

                        <Bot
                          className={cn(
                            "w-8 h-8 md:w-10 md:h-10 transition-all duration-500 relative z-10",
                            isAiSpeaking ? "animate-bounce" : ""
                          )}
                        />
                      </div>
                    </div>

                    {/* Speaking Pulse Overlay */}
                    {isAiSpeaking && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.15),transparent)] animate-pulse pointer-events-none z-10" />
                    )}

                    {/* Bottom Gradient for Text / Waveform contrast */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/95 to-transparent pointer-events-none z-10" />

                    {/* Pulse ring when speaking */}
                    {isAiSpeaking && (
                      <>
                        <div
                          className="absolute inset-0 m-auto w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-amber-400/20 animate-ping z-10"
                          style={{ animationDuration: "2s" }}
                        />
                        <div
                          className="absolute inset-0 m-auto w-24 h-24 md:w-32 md:h-32 rounded-full border border-amber-400/10 animate-ping z-10"
                          style={{ animationDuration: "2s", animationDelay: "0.5s" }}
                        />
                      </>
                    )}

                    {/* Speaking — animated waveform */}
                    {isAiSpeaking && (
                      <div className="absolute bottom-4 inset-x-0 flex gap-1 items-end justify-center h-8 z-20">
                        {[12, 24, 16, 8, 20, 14, 18].map((h, i) => (
                          <div
                            key={i}
                            className="w-1 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                            style={{
                              height: `${h}px`,
                              animation: `pulse 0.5s ease-in-out ${
                                i * 0.08
                              }s infinite alternate`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Thinking — spinner dots */}
                    {!isAiSpeaking && isLoading && (
                      <div className="absolute bottom-6 inset-x-0 flex gap-2 items-center justify-center z-20">
                        <div
                          className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.6)]"
                          style={{ animationDelay: "0s" }}
                        />
                        <div
                          className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.6)]"
                          style={{ animationDelay: "0.15s" }}
                        />
                        <div
                          className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.6)]"
                          style={{ animationDelay: "0.3s" }}
                        />
                      </div>
                    )}

                    {/* Listening — mic icon with pulse */}
                    {!isAiSpeaking && !isLoading && phase === "interviewing" && (
                      <div className="absolute bottom-5 inset-x-0 flex flex-col items-center justify-center gap-1.5 z-20">
                        <div className="p-2 rounded-full bg-slate-900/80 border border-slate-700 backdrop-blur-sm shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                          <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "h-7 backdrop-blur-sm flex items-center justify-center px-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest border-t transition-all",
                      isAiSpeaking
                        ? "bg-amber-400/20 text-amber-400 border-amber-400/30"
                        : isLoading
                        ? "bg-blue-400/20 text-blue-400 border-blue-400/30"
                        : "bg-emerald-400/20 text-emerald-400 border-emerald-400/30"
                    )}
                  >
                    {isAiSpeaking ? (
                      <>
                        <Volume2 className="w-3 h-3 mr-1.5 animate-pulse" /> Speaking
                      </>
                    ) : isLoading ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Thinking...
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3 mr-1.5" /> Listening
                      </>
                    )}
                  </div>
                </div>

                {webcamError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-slate-400 space-y-5">
                    <div className="relative w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                      <Video className="w-8 h-8 text-slate-500" />
                      <div
                        className="absolute inset-0 rounded-full border border-red-500/20 animate-ping opacity-50"
                        style={{ animationDuration: "3s" }}
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-300">
                      {webcamError}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-primary font-bold bg-primary/10 px-3 py-1 rounded-full border border-primary/20 animate-pulse">
                      Demo Simulation Active
                    </p>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover scale-x-[-1]"
                    autoPlay
                    muted
                  />
                )}

                {/* REC badge + Phase Indicator */}
                {phase === "interviewing" ? (
                  <div className="absolute top-5 left-5 flex items-center gap-2 z-30">
                    <div className="px-3 py-1.5 bg-red-500/80 backdrop-blur-md rounded-full text-white text-[11px] font-bold flex items-center gap-2 tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      REC {Math.floor(timer / 60)}:
                      {(timer % 60).toString().padStart(2, "0")}
                    </div>
                    {/* Phase indicator */}
                    {(() => {
                      const phases = [
                        { name: "Introduction", range: [0, 2], color: "bg-cyan-400/80" },
                        { name: "Technical", range: [3, 5], color: "bg-violet-400/80" },
                        { name: "Scenario", range: [6, 6], color: "bg-amber-400/80" },
                        { name: "Behavioral", range: [7, 99], color: "bg-emerald-400/80" },
                      ];
                      const currentPhaseIdx = phases.findIndex(
                        (p) => currentQuestion >= p.range[0] && currentQuestion <= p.range[1]
                      );
                      const cp = phases[Math.max(0, currentPhaseIdx)];
                      return (
                        <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-white text-[10px] font-bold flex items-center gap-2">
                          <div className="flex gap-1">
                            {phases.map((p, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-4 h-1 rounded-full transition-all",
                                  i <= currentPhaseIdx ? p.color : "bg-white/20"
                                )}
                              />
                            ))}
                          </div>
                          <span className="tracking-wider uppercase">{cp.name}</span>
                          <span className="text-white/50">Q{currentQuestion}/7</span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="absolute top-5 left-5 flex items-center gap-3 z-30">
                    <div className="px-4 py-2 bg-slate-800/80 backdrop-blur-md rounded-full text-white text-[11px] font-bold flex items-center gap-2 tracking-widest">
                      SESSION COMPLETED • {Math.floor(timer / 60)}:
                      {(timer % 60).toString().padStart(2, "0")}
                    </div>
                  </div>
                )}

                {/* Subtitle overlay — AI speech as caption on video */}
                {lastAiMsg && (
                  <div className="absolute bottom-0 inset-x-0 z-20 flex justify-center pb-5 px-5 pointer-events-none">
                    <div className="max-w-[70%] bg-black/70 backdrop-blur-sm rounded-lg px-5 py-3 text-white text-center">
                      <p className="text-sm md:text-base font-medium leading-relaxed">
                        {lastAiMsg.content.slice(0, 250)}
                        {lastAiMsg.content.length > 250 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* End Button */}
              {phase === "interviewing" && (
                <div className={cn("flex justify-center", isFullscreen && "mt-6")}>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-xl px-12 shadow-lg font-bold"
                    onClick={onStop}
                  >
                    End Session <StopCircle className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT CHAT PANEL */}
      {!interviewFinished && (
        <aside className="w-[340px] shrink-0 border-l border-slate-100 bg-white/80 backdrop-blur-sm flex flex-col h-full animate-in slide-in-from-right duration-300">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Interview Chat</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                {interviewMode === "live"
                  ? isLiveConnected
                    ? "Live Voice Active"
                    : "Connecting..."
                  : questionsLeft > 0
                  ? `${questionsLeft} questions left`
                  : "Session complete"}
              </p>
            </div>
            {isAiSpeaking && (
              <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10">
                <Volume2 className="w-3 h-3 text-primary animate-pulse" />
                <span className="text-[9px] font-bold text-primary uppercase">Speaking</span>
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {currentTranscripts.map((msg, i) => (
              <div
                key={i}
                className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "ai"
                      ? "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-md"
                      : "bg-primary text-white rounded-tr-md"
                  )}
                >
                  {msg.content}
                  <p
                    className={cn(
                      "text-[9px] mt-1.5 font-medium",
                      msg.role === "ai" ? "text-slate-400" : "text-white/60"
                    )}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary animate-spin" />
                </div>
                <div className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3 border border-slate-100">
                  <div className="flex gap-1.5">
                    <div
                      className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            {interviewMode === "live" &&
              liveTranscripts.length === 0 &&
              isLiveConnected && (
                <p className="text-center text-slate-400 text-sm py-6">
                  AI will start speaking shortly...
                </p>
              )}
            <div ref={chatEndRef} />
          </div>

          {/* Answer Input */}
          <div className="border-t border-slate-100 p-3">
            {interviewMode === "live" ? (
              /* Live Voice Controls */
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant={isMicActive ? "default" : "outline"}
                  className={cn(
                    "rounded-full h-10 w-10 shrink-0 transition-all",
                    isMicActive && "bg-primary ring-2 ring-primary/30"
                  )}
                  onClick={toggleLiveMic}
                  disabled={!isLiveConnected}
                >
                  {isMicActive ? (
                    <Mic className="w-4 h-4 text-white" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                </Button>
                <div className="flex-1 text-xs text-slate-500">
                  {!isLiveConnected
                    ? "Connecting..."
                    : isMicActive
                    ? "Listening... speak your answer"
                    : "Mic muted — click to unmute"}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-xl text-xs h-8 px-3"
                  onClick={onStop}
                >
                  <StopCircle className="w-3 h-3 mr-1" /> End
                </Button>
              </div>
            ) : interviewFinished ? (
              <Button className="w-full rounded-xl font-bold" onClick={onStop}>
                View Results <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitAnswer();
                    }
                  }}
                  placeholder={
                    isAiSpeaking
                      ? "AI is speaking..."
                      : isLoading
                      ? "Waiting for AI..."
                      : "Type your answer..."
                  }
                  disabled={isLoading || isAiSpeaking}
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 min-h-[42px] max-h-[100px]"
                  rows={1}
                />
                <Button
                  size="icon"
                  className="rounded-xl h-[42px] w-[42px] shrink-0"
                  onClick={handleSubmitAnswer}
                  disabled={!userAnswer.trim() || isLoading || isAiSpeaking}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
