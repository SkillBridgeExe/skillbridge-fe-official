import { useState, useRef, useEffect, useCallback } from "react";
import { GeminiLiveSession, type LiveEvent } from "@/lib/gemini-live";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Video, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Clock, RefreshCw, Mic, MicOff, Volume2, Play, StopCircle, BarChart3, ArrowRight, TrendingUp, Award, AlertCircle,
  PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, Bot, Send, MessageSquare,
  type LucideIcon,
} from "lucide-react";
import {
  MOCK_INTERVIEW_STEPS,
  MOCK_INTERVIEW_TIPS,
  MOCK_SCREENING_QUESTIONS,
} from "@/lib/mock-data/interview";
import {
  speakWithGeminiTTS,
  stopSpeaking,
} from "@/api/interview-api";
import {
  useEndInterview,
  useInterviewHistory,
  useSaveInterviewHistory,
  useStartInterview,
  useSubmitInterviewAnswer,
} from "@/hooks/use-interview";
import { getApiErrorMessage } from "@/lib/api-error";
import { ResultsView } from "@/components/interview/ResultsView";
import {
  AVAILABLE_TOPICS, AVAILABLE_LANGUAGES, STEP_ICONS, TIP_ICONS,
  type InterviewPhase, type InterviewMode, type InterviewType, type ChatMessage,
} from "@/components/interview/types";

export default function Interview() {
  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [tipsExpanded, setTipsExpanded] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── AI Interview API state ──
  const [selectedTopic, setSelectedTopic] = useState(AVAILABLE_TOPICS[0].value);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState(3);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const interviewHistoryQuery = useInterviewHistory();
  const startInterviewMutation = useStartInterview();
  const submitAnswerMutation = useSubmitInterviewAnswer();
  const endInterviewMutation = useEndInterview();
  const saveHistoryMutation = useSaveInterviewHistory();
  const interviewHistory = interviewHistoryQuery.data ?? [];

  // ── Interview Type + Live Voice state ──
  const [interviewType, setInterviewType] = useState<InterviewType>("domain");
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("text");
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const [liveTranscripts, setLiveTranscripts] = useState<ChatMessage[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  /** Play TTS using Gemini TTS API and sync avatar animation */
  const speakText = useCallback((text: string) => {
    stopSpeaking();
    speakWithGeminiTTS(
      text,
      selectedLanguage,
      () => setIsAiSpeaking(true),
      () => setIsAiSpeaking(false),
    );
  }, [selectedLanguage]);

  const startInterview = async () => {
    setPhase("interviewing");
    setIsRecording(true);
    setSidebarOpen(false); // Clean interview mode — auto-collapse sidebar
    setWebcamError(null);
    setApiError(null);
    setChatHistory([]);
    setInterviewFinished(false);
    setQuestionsLeft(3);
    setCurrentQuestion(0);

    // Start webcam
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          setWebcamError(
            err.name === "NotFoundError"
              ? "Camera/Microphone not found. Demo mode active."
              : "Permissions denied. Demo mode active."
          );
        });
    } else {
      setWebcamError("Media devices not supported.");
    }

    // Call real API
    setIsLoading(true);
    try {
      const data = await startInterviewMutation.mutateAsync({
        topic: selectedTopic,
        language: selectedLanguage,
      });
      setSessionId(data.session_id);
      setQuestionsLeft(data.questions_left ?? 3);
      setChatHistory([{ role: "ai", content: data.message, timestamp: new Date() }]);
      setCurrentQuestion(1);
      // Auto TTS
      speakText(data.message);
    } catch (err) {
      setApiError(getApiErrorMessage(err, "Failed to start interview."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !sessionId || isLoading || isAiSpeaking) return;

    const answer = userAnswer.trim();
    setChatHistory((prev) => [...prev, { role: "user", content: answer, timestamp: new Date() }]);
    setUserAnswer("");
    setIsLoading(true);
    setApiError(null);

    try {
      const data = await submitAnswerMutation.mutateAsync({ sessionId, userAnswer: answer });
      setChatHistory((prev) => [...prev, { role: "ai", content: data.message, timestamp: new Date() }]);
      setQuestionsLeft(data.questions_left);
      setCurrentQuestion((prev) => prev + 1);

      // Auto TTS
      speakText(data.message);

      if (data.finished) {
        setInterviewFinished(true);
      }
    } catch (err) {
      setApiError(getApiErrorMessage(err, "Failed to submit answer."));
    } finally {
      setIsLoading(false);
    }
  };

  const stopInterview = async () => {
    setIsEnding(true);
    stopSpeaking();
    setIsAiSpeaking(false);

    // Request AI summary before ending
    let summary = "";
    let score = 70;
    if (sessionId) {
      try {
        const data = await endInterviewMutation.mutateAsync(sessionId);
        summary = data.summary;
        score = data.score;
        setChatHistory((prev) => [...prev, { role: "ai", content: summary, timestamp: new Date() }]);
      } catch (err) {
        console.warn("End interview API failed:", getApiErrorMessage(err));
      }
    }

    setIsRecording(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setPhase("results");
    setIsEnding(false);

    // Auto-save history
    try {
      await saveHistoryMutation.mutateAsync({
        topic: selectedTopic,
        score,
        duration: timer,
        summary: summary.slice(0, 500),
      });
    } catch (err) {
      console.warn("Failed to save history:", getApiErrorMessage(err));
    }
  };

  // ── Live Voice Interview Functions ──
  const startLiveInterview = async () => {
    setPhase("interviewing");
    setIsRecording(true);
    setSidebarOpen(false); // Clean interview mode — auto-collapse sidebar
    setIsLoading(true);
    setApiError(null);
    setLiveTranscripts([]);
    setIsAiSpeaking(false);
    setWebcamError(null);
    setChatHistory([]);
    setInterviewFinished(false);
    setCurrentQuestion(0);

    // Start webcam (same as text mode)
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          setWebcamError(
            err.name === "NotFoundError"
              ? "Camera not found. Interview will continue without video."
              : "Camera permission denied."
          );
        });
    }

    try {
      const session = new GeminiLiveSession();
      liveSessionRef.current = session;

      session.on((event: LiveEvent) => {
        switch (event.type) {
          case "connected":
            setIsLiveConnected(true);
            setIsLoading(false);
            // Auto-start mic after connection
            session.startMic().then(() => setIsMicActive(true));
            break;
          case "disconnected":
            setIsLiveConnected(false);
            setIsMicActive(false);
            break;
          case "ai_speaking":
            setIsAiSpeaking(true);
            break;
          case "ai_stopped":
            setIsAiSpeaking(false);
            break;
          case "user_transcript":
            if (event.data?.trim()) {
              setLiveTranscripts((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "user") {
                  return [...prev.slice(0, -1), { ...last, content: last.content + " " + event.data }];
                }
                return [...prev, { role: "user", content: event.data!, timestamp: new Date() }];
              });
            }
            break;
          case "ai_transcript":
            if (event.data?.trim()) {
              setLiveTranscripts((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "ai") {
                  return [...prev.slice(0, -1), { ...last, content: last.content + " " + event.data }];
                }
                return [...prev, { role: "ai", content: event.data!, timestamp: new Date() }];
              });
            }
            break;
          case "interrupted":
            setIsAiSpeaking(false);
            break;
          case "error":
            setApiError(event.data || "Live connection error");
            break;
        }
      });

      const screeningQs = interviewType === "screening" ? MOCK_SCREENING_QUESTIONS : undefined;
      await session.connect(selectedTopic, selectedLanguage, screeningQs);
    } catch (err) {
      setApiError(getApiErrorMessage(err, "Failed to start live interview."));
      setIsLoading(false);
      setIsRecording(false);
      setPhase("setup");
    }
  };

  const stopLiveInterview = async () => {
    setIsEnding(true);
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    setIsLiveConnected(false);
    setIsMicActive(false);
    setIsAiSpeaking(false);
    setIsRecording(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setPhase("results");
    setIsEnding(false);

    // Auto-save history (live mode doesn't have sessionId for end summary)
    try {
      await saveHistoryMutation.mutateAsync({
        topic: selectedTopic,
        score: 70,
        duration: timer,
        summary: "Live voice interview completed.",
      });
    } catch (err) {
      console.warn("Failed to save history:", getApiErrorMessage(err));
    }
  };

  const toggleLiveMic = async () => {
    const session = liveSessionRef.current;
    if (!session) return;
    if (isMicActive) {
      session.stopMic();
      setIsMicActive(false);
    } else {
      await session.startMic();
      setIsMicActive(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      liveSessionRef.current?.disconnect();
    };
  }, []);

  // Compute stats from real history
  const totalInterviews = interviewHistory.length;
  const averageScore = totalInterviews > 0 ? Math.round(interviewHistory.reduce((a, h) => a + h.score, 0) / totalInterviews) : 0;
  const bestScore = totalInterviews > 0 ? Math.max(...interviewHistory.map(h => h.score)) : 0;

  const completedSteps = MOCK_INTERVIEW_STEPS.filter(s => s.status === "completed").length;
  const progressPercent = (completedSteps / MOCK_INTERVIEW_STEPS.length) * 100;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* ═══════════════════════════════════════════════ */}
        {/* LEFT SIDEBAR (~20%) */}
        {/* ═══════════════════════════════════════════════ */}
        <aside
          className={cn(
            "h-full border-r border-slate-100 bg-white/70 backdrop-blur-sm flex flex-col transition-all duration-300 shrink-0",
            sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden border-r-0"
          )}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-poppins font-bold text-sm text-slate-900 leading-tight">
              Frontend Engineer
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">AI Mock Interview</p>
            <div className="mt-3 flex items-center gap-2">
              <Progress value={progressPercent} className="h-1.5 flex-1" />
              <span className="text-[10px] font-bold text-slate-500">
                {completedSteps}/{MOCK_INTERVIEW_STEPS.length}
              </span>
            </div>
          </div>

          {/* Steps */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {MOCK_INTERVIEW_STEPS.map((step) => {
              const Icon = STEP_ICONS[step.icon] || Circle;
              const isActive = step.status === "active";
              const isCompleted = step.status === "completed";
              return (
                <button
                  key={step.id}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm",
                    isActive && "bg-primary/10 text-primary font-bold border border-primary/20",
                    isCompleted && "text-slate-600 hover:bg-slate-50",
                    !isActive && !isCompleted && "text-slate-400 cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      isActive && "bg-primary text-white",
                      isCompleted && "bg-emerald-50 text-emerald-500",
                      !isActive && !isCompleted && "bg-slate-100 text-slate-300"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-xs font-semibold truncate">{step.label}</span>
                  {isCompleted && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Interview History + Stats */}
          <div className="border-t border-slate-100 p-4">
            {/* Quick Stats */}
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Your Stats
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCard label="Total" value={String(totalInterviews)} icon={Video} />
              <StatCard label="Avg Score" value={totalInterviews > 0 ? `${averageScore}%` : "—"} icon={BarChart3} />
              <StatCard label="Best" value={totalInterviews > 0 ? `${bestScore}%` : "—"} icon={Award} />
              <StatCard label="Sessions" value={totalInterviews > 0 ? `${totalInterviews}` : "0"} icon={TrendingUp} />
            </div>

            {/* Recent Sessions */}
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Recent Sessions
            </h4>
            <div className="space-y-2">
              {interviewHistory.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-3">No sessions yet</p>
              ) : interviewHistory.slice(0, 5).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">{h.topic}</p>
                    <p className="text-[10px] text-slate-400">{h.date}</p>
                  </div>
                  <span className="text-xs font-black text-primary">{h.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-full w-5 flex items-center justify-center hover:bg-slate-100/80 transition-colors shrink-0 z-10"
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <PanelLeftOpen className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {/* ═══════════════════════════════════════════════ */}
        {/* CENTER CONTENT */}
        {/* ═══════════════════════════════════════════════ */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-slate-50/30">
          <div className="px-6 md:px-10 py-6 md:py-8">
            {phase === "setup" && (
              <SetupView
                tipsExpanded={tipsExpanded}
                setTipsExpanded={setTipsExpanded}
                onStart={interviewType === "screening" || interviewMode === "live" ? startLiveInterview : startInterview}
                selectedTopic={selectedTopic}
                setSelectedTopic={setSelectedTopic}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                isLoading={isLoading}
                interviewMode={interviewMode}
                setInterviewMode={setInterviewMode}
                interviewType={interviewType}
                setInterviewType={setInterviewType}
              />
            )}

            {(phase === "interviewing" || phase === "results") && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {apiError && (
                  <Card className="border-red-200 bg-red-50/80">
                    <CardContent className="py-4 text-sm text-red-700 font-medium">{apiError}</CardContent>
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
                          {String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Duration</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-900">{currentQuestion}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Answered</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-primary">{questionsLeft}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Remaining</p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl px-4 font-bold h-9"
                        onClick={interviewMode === "live" ? stopLiveInterview : stopInterview}
                        disabled={isEnding}
                      >
                        {isEnding ? (
                          <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Ending...</>
                        ) : (
                          <><StopCircle className="w-3.5 h-3.5 mr-1.5" /> End Interview</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <InterviewingView
                  videoRef={videoRef}
                  webcamError={webcamError}
                  timer={timer}
                  currentQuestion={currentQuestion}
                  onStop={interviewMode === "live" ? stopLiveInterview : stopInterview}
                  phase={phase}
                  isAiSpeaking={isAiSpeaking}
                  chatHistory={chatHistory}
                  isLoading={isLoading}
                />
                {phase === "results" && (
                  <ResultsView
                    onRetry={() => {
                      setPhase("setup");
                      setCurrentQuestion(0);
                      void interviewHistoryQuery.refetch();
                    }}
                    duration={timer}
                  />
                )}
              </div>
            )}
          </div>
        </main>

        {/* ═══════════════════════════════════════════════ */}
        {/* RIGHT CHAT PANEL (during interview) */}
        {/* ═══════════════════════════════════════════════ */}
        {(phase === "interviewing") && !interviewFinished && (
          <aside className="w-[340px] shrink-0 border-l border-slate-100 bg-white/80 backdrop-blur-sm flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Interview Chat</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  {interviewMode === "live" ? (isLiveConnected ? "Live Voice Active" : "Connecting...") : (questionsLeft > 0 ? `${questionsLeft} questions left` : "Session complete")}
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
              {(interviewMode === "live" ? liveTranscripts : chatHistory).map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "ai" && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "ai"
                      ? "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-md"
                      : "bg-primary text-white rounded-tr-md"
                  )}>
                    {msg.content}
                    <p className={cn("text-[9px] mt-1.5 font-medium", msg.role === "ai" ? "text-slate-400" : "text-white/60")}>
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
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              {interviewMode === "live" && liveTranscripts.length === 0 && isLiveConnected && (
                <p className="text-center text-slate-400 text-sm py-6">AI will start speaking shortly...</p>
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
                    {!isLiveConnected ? "Connecting..." : isMicActive ? "Listening... speak your answer" : "Mic muted — click to unmute"}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-xl text-xs h-8 px-3"
                    onClick={stopLiveInterview}
                  >
                    <StopCircle className="w-3 h-3 mr-1" /> End
                  </Button>
                </div>
              ) : interviewFinished ? (
                <Button className="w-full rounded-xl font-bold" onClick={stopInterview}>
                  View Results <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitAnswer(); } }}
                    placeholder={isAiSpeaking ? "AI is speaking..." : isLoading ? "Waiting for AI..." : "Type your answer..."}
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

      </div>
    </Layout>
  );
}

// ─── Setup View ──────────────────────────────────────────────
type _DeviceStatus = "idle" | "testing" | "pass" | "fail";

function SetupView({
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
}: {
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
}) {
  const [setupStream, setSetupStream] = useState<MediaStream | null>(null);

  // Auto-start camera on mount
  useEffect(() => {
    let streamRef: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef = stream;
        setSetupStream(stream);
      })
      .catch(console.warn);
      
    return () => {
      if (streamRef) streamRef.getTracks().forEach(t => t.stop());
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
          onClick={() => { setInterviewType("screening"); setInterviewMode("live"); }}
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
            {interviewType === "screening" ? "Screening Interview" : "Domain Expert Interview"}
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
        {interviewType === "domain" && AVAILABLE_TOPICS.map((t) => (
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
                  ref={el => { if (el && setupStream) el.srcObject = setupStream }} 
                />
              ) : (
                <>
                  <div className="relative w-24 h-24 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                    <Video className="w-10 h-10 text-blue-400/80 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping opacity-50" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-[-15px] rounded-full border border-blue-500/10 animate-ping opacity-30" style={{ animationDuration: '3s', animationDelay: '1s' }} />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Camera preview will appear here</p>
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
                          <p className="text-xs font-bold text-slate-800 leading-tight">{tip.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{tip.desc}</p>
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
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
                ) : interviewMode === "live" ? (
                  <><Mic className="w-4 h-4 mr-2" /> Start Live Interview</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" /> Start Interview</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Interviewing View ───────────────────────────────
function InterviewingView({
  videoRef,
  webcamError,
  timer,
  currentQuestion,
  onStop,
  phase,
  isAiSpeaking,
  chatHistory,
  isLoading,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  webcamError: string | null;
  timer: number;
  currentQuestion: number;
  onStop: () => void;
  phase: string;
  isAiSpeaking: boolean;
  chatHistory: ChatMessage[];
  isLoading: boolean;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastAiMsg = chatHistory.filter(m => m.role === "ai").pop();

  return (
    <div className={cn(
      "space-y-6 animate-in fade-in duration-500",
      isFullscreen && "fixed inset-0 z-50 bg-black/95 p-4 md:p-8 flex flex-col justify-center"
    )}>
      {/* Video */}
      <div className={cn(
        "relative rounded-2xl overflow-hidden bg-slate-900 shadow-2xl transition-all duration-300",
        isFullscreen ? "w-full max-w-6xl mx-auto aspect-video" : "w-full aspect-video"
      )}>
        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="absolute top-5 right-5 p-2.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-xl text-white transition-colors z-30"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {/* AI PIP (Picture in Picture) — 3-State Indicator */}
        <div className={cn(
          "absolute bottom-5 right-5 w-32 md:w-48 aspect-[3/4] rounded-xl border-2 shadow-2xl overflow-hidden z-20 flex flex-col transition-all duration-500",
          isAiSpeaking
            ? "border-amber-400/60 bg-slate-800 shadow-[0_0_30px_rgba(251,191,36,0.3)]"
            : isLoading
            ? "border-blue-400/60 bg-slate-800 shadow-[0_0_20px_rgba(96,165,250,0.2)]"
            : "border-emerald-400/40 bg-slate-800 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
        )}>
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 relative overflow-hidden">
            {/* AI Bot Icon */}
            <div className="absolute inset-0 flex items-center justify-center z-0 bg-slate-900">
              <div className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-slate-800 border-2 flex items-center justify-center transition-all duration-500 shadow-xl relative overflow-hidden",
                isAiSpeaking ? "border-amber-400 text-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]" 
                : isLoading ? "border-blue-400 text-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.2)]" 
                : "border-emerald-400/50 text-emerald-400"
              )}>
                {/* Subtle gradient inside the bot container */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
                
                <Bot className={cn(
                  "w-8 h-8 md:w-10 md:h-10 transition-all duration-500 relative z-10",
                  isAiSpeaking ? "animate-bounce" : ""
                )} />
              </div>
            </div>

            {/* Speaking Pulse Overlay - Subtle radial gradient to make it "glow" from center */}
            {isAiSpeaking && (
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.15),transparent)] animate-pulse pointer-events-none z-10" />
            )}

            {/* Bottom Gradient for Text / Waveform contrast */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/95 to-transparent pointer-events-none z-10" />

            {/* Pulse ring when speaking (Subtle over image) */}
            {isAiSpeaking && (
              <>
                <div className="absolute inset-0 m-auto w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-amber-400/20 animate-ping z-10" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 m-auto w-24 h-24 md:w-32 md:h-32 rounded-full border border-amber-400/10 animate-ping z-10" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
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
                      animation: `pulse 0.5s ease-in-out ${i * 0.08}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Thinking — spinner dots */}
            {!isAiSpeaking && isLoading && (
              <div className="absolute bottom-6 inset-x-0 flex gap-2 items-center justify-center z-20">
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.6)]" style={{ animationDelay: '0s' }} />
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.6)]" style={{ animationDelay: '0.15s' }} />
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.6)]" style={{ animationDelay: '0.3s' }} />
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
          <div className={cn(
            "h-7 backdrop-blur-sm flex items-center justify-center px-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest border-t transition-all",
            isAiSpeaking
              ? "bg-amber-400/20 text-amber-400 border-amber-400/30"
              : isLoading
              ? "bg-blue-400/20 text-blue-400 border-blue-400/30"
              : "bg-emerald-400/20 text-emerald-400 border-emerald-400/30"
          )}>
            {isAiSpeaking ? (
              <><Volume2 className="w-3 h-3 mr-1.5 animate-pulse" /> Speaking</>
            ) : isLoading ? (
              <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Thinking...</>
            ) : (
              <><Mic className="w-3 h-3 mr-1.5" /> Listening</>
            )}
          </div>
        </div>
        {webcamError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-slate-400 space-y-5">
            <div className="relative w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <Video className="w-8 h-8 text-slate-500" />
              <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping opacity-50" style={{ animationDuration: '3s' }} />
            </div>
            <p className="text-sm font-medium text-slate-300">{webcamError}</p>
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
              REC {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
            </div>
            {/* Phase indicator */}
            {(() => {
              const phases = [
                { name: "Introduction", range: [0, 2], color: "bg-cyan-400/80" },
                { name: "Technical", range: [3, 5], color: "bg-violet-400/80" },
                { name: "Scenario", range: [6, 6], color: "bg-amber-400/80" },
                { name: "Behavioral", range: [7, 99], color: "bg-emerald-400/80" },
              ];
              const currentPhaseIdx = phases.findIndex(p => currentQuestion >= p.range[0] && currentQuestion <= p.range[1]);
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
              SESSION COMPLETED • {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
            </div>
          </div>
        )}

        {/* Subtitle overlay — AI speech as caption on video (Mercor-style) */}
        {lastAiMsg && (
          <div className="absolute bottom-0 inset-x-0 z-20 flex justify-center pb-5 px-5 pointer-events-none">
            <div className="max-w-[70%] bg-black/70 backdrop-blur-sm rounded-lg px-5 py-3 text-white text-center">
              <p className="text-sm md:text-base font-medium leading-relaxed">
                {lastAiMsg.content.slice(0, 250)}{lastAiMsg.content.length > 250 ? '...' : ''}
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
  );
}

// ─── Small Components (still used in SetupView) ────────────────────────────
function _DeviceCheck({
  icon: Icon,
  label,
  status,
  level,
  onTest,
}: {
  icon: LucideIcon;
  label: string;
  status: "idle" | "testing" | "pass" | "fail";
  level?: number;
  onTest: () => void;
}) {
  const statusConfig = {
    idle: { color: "text-slate-400", bg: "bg-slate-100", text: "Test", icon: null },
    testing: { color: "text-blue-500", bg: "bg-blue-50", text: "Testing...", icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    pass: { color: "text-emerald-600", bg: "bg-emerald-50", text: "Ready", icon: <CheckCircle2 className="w-3 h-3" /> },
    fail: { color: "text-red-500", bg: "bg-red-50", text: "Failed", icon: <AlertCircle className="w-3 h-3" /> },
  };
  const cfg = statusConfig[status];

  return (
    <div className="flex flex-col items-center gap-2 min-w-[100px]">
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
        cfg.bg,
        status === "testing" && "animate-pulse"
      )}>
        <Icon className={cn("w-5 h-5 transition-colors", cfg.color)} />
      </div>
      <span className="text-[11px] font-bold text-slate-700">{label}</span>
      
      {/* Mic level bar */}
      {level !== undefined && status === "testing" && (
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-100"
            style={{ width: `${Math.max(level * 100, 2)}%` }}
          />
        </div>
      )}
      
      {/* Status / Action button */}
      <button
        onClick={onTest}
        disabled={status === "testing"}
        className={cn(
          "flex items-center gap-1 text-[10px] font-semibold transition-all px-2.5 py-1 rounded-md",
          status === "idle" && "text-primary hover:bg-primary/10",
          status === "testing" && "text-blue-500 cursor-not-allowed",
          status === "pass" && "text-emerald-600 hover:bg-emerald-50",
          status === "fail" && "text-red-500 hover:bg-red-50"
        )}
      >
        {cfg.icon}
        {status === "pass" ? "✓ " : status === "fail" ? "✗ " : ""}
        {status === "pass" || status === "fail" ? cfg.text + " · Retest" : cfg.text}
      </button>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
      <Icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
      <p className="text-sm font-black text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-400 font-semibold">{label}</p>
    </div>
  );
}
