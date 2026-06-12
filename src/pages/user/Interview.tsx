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
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import { InterviewSession } from "@/components/interview/InterviewSession";
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
      <div className="flex h-[calc(100dvh-80px)] overflow-hidden">
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
        {/* MAIN VIEWS */}
        {/* ═══════════════════════════════════════════════ */}
        {phase === "setup" && (
          <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-slate-50/30">
            <div className="px-6 md:px-10 py-6 md:py-8">
              <InterviewSetup
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
            </div>
          </main>
        )}

        {phase === "interviewing" && (
          <InterviewSession
            videoRef={videoRef}
            webcamError={webcamError}
            timer={timer}
            currentQuestion={currentQuestion}
            questionsLeft={questionsLeft}
            isEnding={isEnding}
            interviewMode={interviewMode}
            isLiveConnected={isLiveConnected}
            isAiSpeaking={isAiSpeaking}
            chatHistory={chatHistory}
            liveTranscripts={liveTranscripts}
            isLoading={isLoading}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            handleSubmitAnswer={handleSubmitAnswer}
            toggleLiveMic={toggleLiveMic}
            isMicActive={isMicActive}
            interviewFinished={interviewFinished}
            onStop={interviewMode === "live" ? stopLiveInterview : stopInterview}
            apiError={apiError}
            phase={phase}
          />
        )}

        {phase === "results" && (
          <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-slate-50/30">
            <div className="px-6 md:px-10 py-6 md:py-8">
              <div className="space-y-8 animate-in fade-in duration-500">
                <ResultsView
                  onRetry={() => {
                    setPhase("setup");
                    setCurrentQuestion(0);
                    void interviewHistoryQuery.refetch();
                  }}
                  duration={timer}
                />
              </div>
            </div>
          </main>
        )}
      </div>
    </Layout>
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
