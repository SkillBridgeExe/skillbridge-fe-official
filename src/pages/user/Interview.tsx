import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Circle,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Video,
  type LucideIcon,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { INTERVIEW_SETUP_STEPS } from "@/constants/interview";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getInterviewQuestionAudio,
  getInterviewDetail,
  type InterviewDetailResponseDto,
  type InterviewSessionDto,
} from "@/api/interview-api";
import {
  useCvListForInterview,
  useCvMatchesForInterview,
  useEndInterview,
  useInterviewDetail,
  useInterviewHistory,
  useRefreshRealtimeToken,
  useStartInterview,
  useSubmitInterviewTurn,
} from "@/hooks/use-interview";
import { ResultsView } from "@/components/interview/ResultsView";
import { InterviewHistoryDetailView } from "@/components/interview/InterviewHistoryDetailView";
import { InterviewHistoryPanel } from "@/components/interview/InterviewHistoryPanel";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import { InterviewSession } from "@/components/interview/InterviewSession";
import {
  AVAILABLE_TARGET_ROLES,
  STEP_ICONS,
  type ChatMessage,
  type InterviewMode,
  type InterviewPhase,
  type InterviewSpeechSpeed,
  type InterviewType,
  type InterviewVoice,
  type InterviewWorkspaceTab,
} from "@/components/interview/types";
import {
  buildInterviewStartRequest,
  canOpenInterviewHistory,
  canSwitchInterviewWorkspace,
  formatDuration,
  getInterviewHistoryDetailState,
  getInterviewHistoryState,
  getQuestionAudioErrorMessage,
  getRealtimeTokenFallbackReason,
  readInterviewVoicePreference,
  secondsRemainingFromExpiry,
  writeInterviewVoicePreference,
  type InterviewVoicePreference,
} from "@/components/interview/interview-view-model";
import { OpenAIRealtimeSession, type RealtimeEvent } from "@/lib/openai-realtime";

type EndReason = "manual" | "timer" | "finished";

export default function Interview() {
  const { t, i18n } = useTranslation("common");
  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [workspaceTab, setWorkspaceTab] = useState<InterviewWorkspaceTab>("practice");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tipsExpanded, setTipsExpanded] = useState(true);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState(AVAILABLE_TARGET_ROLES[0].value);
  const [selectedLanguage, setSelectedLanguage] = useState<"vi" | "en">("vi");
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("guided");
  const [interviewType, setInterviewType] = useState<InterviewType>("technical");
  const [voicePreference, setVoicePreference] = useState<InterviewVoicePreference>(() =>
    readInterviewVoicePreference(typeof window === "undefined" ? null : window.localStorage),
  );
  const [activeSession, setActiveSession] = useState<InterviewSessionDto | null>(null);
  const [resultDetail, setResultDetail] = useState<InterviewDetailResponseDto | null>(null);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isVoiceFallback, setIsVoiceFallback] = useState(false);
  const [voiceFallbackReason, setVoiceFallbackReason] = useState<string | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isQuestionAudioPlaying, setIsQuestionAudioPlaying] = useState(false);
  const [questionAudioError, setQuestionAudioError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const liveSessionRef = useRef<OpenAIRealtimeSession | null>(null);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionAudioUrlRef = useRef<string | null>(null);
  const streamingAiMessageIdRef = useRef<string | null>(null);
  const questionStartedAtRef = useRef<Date | null>(null);
  const endingRef = useRef(false);
  const autoEndRef = useRef(false);

  const canUseApi = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.isAuthenticated && state.authSource === "api",
  );

  const interviewHistoryQuery = useInterviewHistory(canUseApi);
  const historyDetailQuery = useInterviewDetail(
    selectedHistorySessionId,
    canUseApi && phase === "history-detail",
  );
  const cvListQuery = useCvListForInterview(canUseApi);
  const cvMatchesQuery = useCvMatchesForInterview(selectedCvId, canUseApi && Boolean(selectedCvId));
  const startInterviewMutation = useStartInterview();
  const submitTurnMutation = useSubmitInterviewTurn();
  const endInterviewMutation = useEndInterview();
  const refreshRealtimeTokenMutation = useRefreshRealtimeToken();

  const cvItems = cvListQuery.data?.items ?? [];
  const matchItems = cvMatchesQuery.data?.items ?? [];
  const interviewHistory = interviewHistoryQuery.data?.items ?? [];
  const canSelectHistory = canOpenInterviewHistory(phase);
  const canSwitchWorkspace = canSwitchInterviewWorkspace(phase);
  const interviewHistoryState = getInterviewHistoryState({
    canUseApi,
    isLoading: interviewHistoryQuery.isLoading,
    isError: interviewHistoryQuery.isError,
    itemCount: interviewHistory.length,
  });
  const historyDetailState = getInterviewHistoryDetailState({
    selectedSessionId: selectedHistorySessionId,
    isLoading: historyDetailQuery.isLoading,
    isError: historyDetailQuery.isError,
    result: historyDetailQuery.data
      ? {
          status: historyDetailQuery.data.status,
          overallScore: historyDetailQuery.data.overallScore,
        }
      : null,
  });
  const showPracticeSetup = phase === "setup" && workspaceTab === "practice";
  const showHistoryList = phase === "setup" && workspaceTab === "history";
  const answeredCount = chatHistory.filter((message) => message.role === "user").length;
  const totalQuestionsPlanned = activeSession?.totalQuestionsPlanned ?? null;
  const currentQuestionNumber = totalQuestionsPlanned
    ? Math.min(answeredCount + 1, totalQuestionsPlanned)
    : answeredCount + 1;
  const maxDurationSeconds = activeSession?.maxDurationSeconds ?? 0;
  const timeRemainingLabel = activeSession?.expiresAt
    ? formatDuration(secondsRemaining)
    : formatDuration(maxDurationSeconds);

  const steps = useMemo(
    () =>
      INTERVIEW_SETUP_STEPS.map((step) => {
        if (step.id === "choose-cv") {
          return { ...step, status: selectedCvId ? "completed" : phase === "setup" ? "active" : "completed" };
        }
        if (step.id === "choose-context") {
          return { ...step, status: targetRole ? "completed" : "pending" };
        }
        if (step.id === "interview") {
          return {
            ...step,
            status: phase === "results" ? "completed" : phase === "interviewing" ? "active" : "pending",
          };
        }
        if (step.id === "result") {
          return { ...step, status: phase === "results" || phase === "history-detail" ? "active" : "pending" };
        }
        return step;
      }),
    [phase, selectedCvId, targetRole],
  );

  const completedSteps = steps.filter((step) => step.status === "completed").length;
  const progressPercent = (completedSteps / steps.length) * 100;
  const scoredHistory = interviewHistory.filter((session) => session.overallScore != null);
  const averageScore =
    scoredHistory.length > 0
      ? Math.round(scoredHistory.reduce((sum, session) => sum + Number(session.overallScore), 0) / scoredHistory.length)
      : 0;
  const bestScore =
    scoredHistory.length > 0
      ? Math.max(...scoredHistory.map((session) => Math.round(Number(session.overallScore))))
      : 0;
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const roleLabel = useCallback(
    (value: string): string =>
      t(`interview.roles.${value}`, {
        defaultValue: AVAILABLE_TARGET_ROLES.find((role) => role.value === value)?.label ?? value.replace(/_/g, " "),
      }),
    [t],
  );
  const formatSessionDate = useCallback(
    (value: string): string => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("interview.history.unknownDate");
      return new Intl.DateTimeFormat(dateLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    },
    [dateLocale, t],
  );

  const stopMedia = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const setSelectedVoice = useCallback((voice: InterviewVoice) => {
    setVoicePreference((current) => ({ ...current, voice }));
  }, []);

  const setSpeechSpeed = useCallback((speechSpeed: InterviewSpeechSpeed) => {
    setVoicePreference((current) => ({ ...current, speechSpeed }));
  }, []);

  const stopQuestionAudio = useCallback(() => {
    if (questionAudioRef.current) {
      questionAudioRef.current.pause();
      questionAudioRef.current.src = "";
      questionAudioRef.current = null;
    }
    if (questionAudioUrlRef.current) {
      URL.revokeObjectURL(questionAudioUrlRef.current);
      questionAudioUrlRef.current = null;
    }
    setIsQuestionAudioPlaying(false);
  }, []);

  const disconnectRealtime = useCallback(() => {
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    setIsLiveConnected(false);
    setIsMicActive(false);
    setIsAiSpeaking(false);
    streamingAiMessageIdRef.current = null;
  }, []);

  const setVoiceFallback = useCallback((reason: string) => {
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    setIsLiveConnected(false);
    setIsMicActive(false);
    setIsAiSpeaking(false);
    setIsVoiceFallback(true);
    setVoiceFallbackReason(reason);
  }, []);

  const requestSessionMedia = useCallback(
    async (needsAudio: boolean): Promise<MediaStream | null> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setWebcamError(t("interview.errors.mediaUnsupported"));
        return null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: needsAudio
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : false,
        });
        stopMedia();
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        setWebcamError(null);
        return stream;
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setWebcamError(
          name === "NotFoundError"
            ? t("interview.errors.mediaNotFound")
            : t("interview.errors.mediaDenied"),
        );
        return null;
      }
    },
    [stopMedia, t],
  );

  const connectRealtime = useCallback(
    async (clientSecret: string, stream: MediaStream) => {
      if (stream.getAudioTracks().length === 0) {
        throw new Error(t("interview.errors.noMicrophoneTrack"));
      }

      const realtimeSession = new OpenAIRealtimeSession();
      liveSessionRef.current = realtimeSession;

      realtimeSession.on((event: RealtimeEvent) => {
        switch (event.type) {
          case "connected":
            setIsLiveConnected(true);
            setIsMicActive(true);
            setIsVoiceFallback(false);
            setVoiceFallbackReason(null);
            break;
          case "disconnected":
            setIsLiveConnected(false);
            setIsMicActive(false);
            break;
          case "user_transcript": {
            const transcript = event.data?.trim();
            if (!transcript) break;
            setUserAnswer((current) => (current.trim() ? `${current.trim()}\n${transcript}` : transcript));
            break;
          }
          case "ai_speaking":
            setIsAiSpeaking(true);
            break;
          case "ai_stopped":
            setIsAiSpeaking(false);
            streamingAiMessageIdRef.current = null;
            break;
          case "error":
            setVoiceFallback(event.data || t("interview.errors.realtimeVoiceFailed"));
            break;
          case "ai_transcript": {
            const delta = event.data ?? "";
            if (!delta) break;
            const existingId = streamingAiMessageIdRef.current;
            if (!existingId) {
              const id = `rt-ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
              streamingAiMessageIdRef.current = id;
              setChatHistory((current) => [
                ...current,
                { id, role: "ai", content: delta, timestamp: new Date() },
              ]);
              break;
            }
            setChatHistory((current) =>
              current.map((message) =>
                message.id === existingId
                  ? { ...message, content: `${message.content}${delta}` }
                  : message,
              ),
            );
            break;
          }
        }
      });

      await realtimeSession.connect({ clientSecret, stream });
      realtimeSession.setMicEnabled(true);
    },
    [setVoiceFallback, t],
  );

  const playQuestionAudio = useCallback(
    async (sessionId: string) => {
      stopQuestionAudio();
      setQuestionAudioError(null);
      setIsQuestionAudioPlaying(true);

      try {
        const blob = await getInterviewQuestionAudio(sessionId);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        questionAudioUrlRef.current = url;
        questionAudioRef.current = audio;
        audio.onended = () => {
          setIsQuestionAudioPlaying(false);
        };
        audio.onerror = () => {
          setIsQuestionAudioPlaying(false);
          setQuestionAudioError(t("interview.errors.questionAudioPlayFailed"));
        };
        await audio.play();
      } catch (error) {
        setIsQuestionAudioPlaying(false);
        const fallback = t("interview.errors.questionAudioPlayFailed");
        setQuestionAudioError(
          getQuestionAudioErrorMessage(
            error,
            getApiErrorMessage(error, fallback),
            t("interview.errors.questionAudioTimeout"),
          ),
        );
      }
    },
    [stopQuestionAudio, t],
  );

  const resetInterviewState = useCallback(() => {
    disconnectRealtime();
    stopMedia();
    stopQuestionAudio();
    setActiveSession(null);
    setResultDetail(null);
    setSelectedHistorySessionId(null);
    setChatHistory([]);
    setCurrentQuestion("");
    setUserAnswer("");
    setInterviewFinished(false);
    setApiError(null);
    setWebcamError(null);
    setSecondsRemaining(0);
    setIsVoiceFallback(false);
    setVoiceFallbackReason(null);
    setQuestionAudioError(null);
    setIsLoading(false);
    setIsEnding(false);
    endingRef.current = false;
    autoEndRef.current = false;
    questionStartedAtRef.current = null;
  }, [disconnectRealtime, stopMedia, stopQuestionAudio]);

  const openHistoryDetail = useCallback(
    (sessionId: string) => {
      if (!canOpenInterviewHistory(phase)) return;
      setSelectedHistorySessionId(sessionId);
      setWorkspaceTab("history");
      setApiError(null);
      setPhase("history-detail");
      setSidebarOpen(true);
    },
    [phase],
  );

  const switchToPractice = useCallback(() => {
    if (!canSwitchInterviewWorkspace(phase)) return;
    setWorkspaceTab("practice");
    setSelectedHistorySessionId(null);
    setApiError(null);
    setPhase("setup");
    setSidebarOpen(true);
  }, [phase]);

  const switchToHistory = useCallback(() => {
    if (!canSwitchInterviewWorkspace(phase)) return;
    setWorkspaceTab("history");
    setSelectedHistorySessionId(null);
    setApiError(null);
    setPhase("setup");
    setSidebarOpen(true);
  }, [phase]);

  const startNewInterviewFromHistory = useCallback(() => {
    resetInterviewState();
    setWorkspaceTab("practice");
    setPhase("setup");
    setSidebarOpen(true);
  }, [resetInterviewState]);

  const startInterview = async () => {
    if (!canUseApi) {
      setApiError(t("interview.errors.signInRequired"));
      return;
    }

    resetInterviewState();
    setWorkspaceTab("practice");
    setIsLoading(true);

    try {
      const started = await startInterviewMutation.mutateAsync({
        ...buildInterviewStartRequest({
          selectedCvId,
          selectedMatchId,
          targetRole,
          selectedLanguage,
          interviewMode,
          interviewType,
          voice: voicePreference.voice,
          speechSpeed: voicePreference.speechSpeed,
        }),
      });

      const initialMessages = uniqueMessages([
        started.firstMessage,
        interviewMode === "guided" ? started.firstQuestion : "",
      ]).map(
        (content) => ({ role: "ai" as const, content, timestamp: new Date() }),
      );

      setActiveSession(started);
      setCurrentQuestion(started.firstQuestion);
      setSecondsRemaining(secondsRemainingFromExpiry(started.expiresAt) || started.maxDurationSeconds);
      setChatHistory(initialMessages);
      setPhase("interviewing");
      setSidebarOpen(false);
      questionStartedAtRef.current = new Date();

      const stream = await requestSessionMedia(true);
      let realtimeConnected = false;

      if (!stream || stream.getAudioTracks().length === 0) {
        if (interviewMode === "realtime") {
          setVoiceFallback(t("interview.errors.microphoneUnavailableSameSession"));
        }
      } else {
        const tokenFallbackReason = getRealtimeTokenFallbackReason({
          interviewMode,
          realtimeEnabled: started.realtime.enabled,
          clientSecret: started.realtime.clientSecret,
          reason: started.realtime.reason,
          fallbackMessage: t("interview.errors.realtimeTokenUnavailable"),
        });

        if (tokenFallbackReason) {
          setVoiceFallback(tokenFallbackReason);
        } else if (started.realtime.enabled && started.realtime.clientSecret) {
          try {
            await connectRealtime(started.realtime.clientSecret, stream);
            realtimeConnected = true;
          } catch (error) {
            if (interviewMode === "realtime") {
              setVoiceFallback(getApiErrorMessage(error, t("interview.errors.realtimeVoiceFailed")));
            }
          }
        }
      }

      if (interviewMode === "realtime" && realtimeConnected) {
        liveSessionRef.current?.speakOfficialQuestion(started.firstQuestion, selectedLanguage);
      } else {
        void playQuestionAudio(started.id);
      }
    } catch (error) {
      setApiError(getApiErrorMessage(error, t("interview.errors.startFailed")));
      setPhase("setup");
      stopMedia();
      disconnectRealtime();
    } finally {
      setIsLoading(false);
    }
  };

  const finishInterview = useCallback(
    async (reason: EndReason = "manual") => {
      const sessionId = activeSession?.id;
      if (!sessionId || endingRef.current) return;

      endingRef.current = true;
      setIsEnding(true);
      setIsLoading(false);
      setApiError(null);
      disconnectRealtime();
      stopMedia();
      stopQuestionAudio();

      try {
        const detail = await endInterviewMutation.mutateAsync(sessionId);
        setResultDetail(detail);
        setActiveSession(detail);
        setInterviewFinished(true);
        setPhase("results");
        setSidebarOpen(true);
      } catch (error) {
        if (reason === "timer" || reason === "finished") {
          try {
            const detail = await getInterviewDetail(sessionId);
            setResultDetail(detail);
            setActiveSession(detail);
            setInterviewFinished(true);
            setPhase("results");
            setSidebarOpen(true);
            return;
          } catch {
            // Keep the original end error below.
          }
        }
        setApiError(getApiErrorMessage(error, t("interview.errors.endFailed")));
      } finally {
        setIsEnding(false);
        endingRef.current = false;
      }
    },
    [activeSession?.id, disconnectRealtime, endInterviewMutation, stopMedia, stopQuestionAudio, t],
  );

  const handleSubmitAnswer = async () => {
    const answer = userAnswer.trim();
    if (!answer || !activeSession?.id || isLoading || isEnding) return;

    const now = new Date();
    const durationSeconds = questionStartedAtRef.current
      ? Math.max(0, Math.round((now.getTime() - questionStartedAtRef.current.getTime()) / 1000))
      : undefined;

    setChatHistory((current) => [
      ...current,
      { role: "user", content: answer, timestamp: now },
    ]);
    setUserAnswer("");
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await submitTurnMutation.mutateAsync({
        sessionId: activeSession.id,
        userAnswer: answer,
        userTranscript: isLiveConnected ? answer : undefined,
        modality: isLiveConnected ? "AUDIO" : "TEXT",
        durationSeconds,
      });

      setActiveSession(response.session);
      const nextQuestion = response.nextQuestion ?? response.nextTurn?.interviewerQuestion ?? "";
      if (nextQuestion) setCurrentQuestion(nextQuestion);

      const nextMessages = uniqueMessages([
        response.aiMessage,
        interviewMode === "guided" ? nextQuestion : "",
      ]).map((content) => ({ role: "ai" as const, content, timestamp: new Date() }));

      if (nextMessages.length > 0) {
        setChatHistory((current) => [...current, ...nextMessages]);
      }

      if (response.finished) {
        setInterviewFinished(true);
        await finishInterview("finished");
      } else {
        questionStartedAtRef.current = new Date();
        if (nextQuestion) {
          if (interviewMode === "realtime" && liveSessionRef.current?.isConnected) {
            liveSessionRef.current.speakOfficialQuestion(nextQuestion, selectedLanguage);
          } else {
            void playQuestionAudio(response.session.id);
          }
        }
      }
    } catch (error) {
      setApiError(getApiErrorMessage(error, t("interview.errors.submitFailed")));
    } finally {
      setIsLoading(false);
    }
  };

  const reconnectRealtime = useCallback(async () => {
    if (!activeSession?.id || !canUseApi) return;

    setIsLoading(true);
    setApiError(null);

    try {
      let stream = mediaStreamRef.current;
      if (!stream || stream.getAudioTracks().length === 0) {
        stream = await requestSessionMedia(true);
      }

      if (!stream || stream.getAudioTracks().length === 0) {
        setVoiceFallback(t("interview.errors.microphoneUnavailable"));
        return;
      }

      const realtime = await refreshRealtimeTokenMutation.mutateAsync(activeSession.id);
      if (!realtime.enabled || !realtime.clientSecret) {
        setVoiceFallback(realtime.reason || t("interview.errors.realtimeTokenUnavailable"));
        return;
      }

      await connectRealtime(realtime.clientSecret, stream);
    } catch (error) {
      setVoiceFallback(getApiErrorMessage(error, t("interview.errors.reconnectFailed")));
    } finally {
      setIsLoading(false);
    }
  }, [
    activeSession?.id,
    canUseApi,
    connectRealtime,
    refreshRealtimeTokenMutation,
    requestSessionMedia,
    setVoiceFallback,
    t,
  ]);

  const toggleLiveMic = async () => {
    if (!liveSessionRef.current?.isConnected) {
      await reconnectRealtime();
      return;
    }

    const next = !isMicActive;
    liveSessionRef.current.setMicEnabled(next);
    setIsMicActive(next);
  };

  useEffect(() => {
    if (phase !== "interviewing" || !activeSession?.expiresAt) return;

    const tick = () => {
      const remaining = secondsRemainingFromExpiry(activeSession.expiresAt);
      setSecondsRemaining(remaining);
      if (remaining === 0 && !autoEndRef.current) {
        autoEndRef.current = true;
        void finishInterview("timer");
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [activeSession?.expiresAt, finishInterview, phase]);

  useEffect(() => {
    writeInterviewVoicePreference(
      typeof window === "undefined" ? null : window.localStorage,
      voicePreference,
    );
  }, [voicePreference]);

  useEffect(() => {
    if (phase !== "interviewing" || !videoRef.current || !mediaStreamRef.current) return;
    if (videoRef.current.srcObject !== mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      void videoRef.current.play();
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      disconnectRealtime();
      stopMedia();
      stopQuestionAudio();
    };
  }, [disconnectRealtime, stopMedia, stopQuestionAudio]);

  return (
    <Layout>
      <div className="flex h-[calc(100dvh-80px)] overflow-hidden">
        <aside
          className={cn(
            "h-full shrink-0 border-r border-slate-100 bg-white/80 backdrop-blur-sm flex flex-col transition-all duration-300",
            sidebarOpen ? "w-[260px]" : "w-0 overflow-hidden border-r-0",
          )}
        >
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-poppins text-sm font-bold leading-tight text-slate-900">
              {roleLabel(targetRole)}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">{t("interview.title")}</p>
            <div className="mt-3 flex items-center gap-2">
              <Progress value={progressPercent} className="h-1.5 flex-1" />
              <span className="text-[10px] font-bold text-slate-500">
                {completedSteps}/{steps.length}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <Button
                type="button"
                size="sm"
                variant={workspaceTab === "practice" ? "default" : "ghost"}
                className="h-8 rounded-lg text-xs font-bold"
                onClick={switchToPractice}
                disabled={!canSwitchWorkspace}
              >
                {t("interview.workspace.practice")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={workspaceTab === "history" ? "default" : "ghost"}
                className="h-8 rounded-lg text-xs font-bold"
                onClick={switchToHistory}
                disabled={!canSwitchWorkspace}
              >
                {t("interview.workspace.history")}
              </Button>
            </div>
          </div>

          <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
            {steps.map((step) => {
              const Icon = STEP_ICONS[step.icon] || Circle;
              const isActive = step.status === "active";
              const isCompleted = step.status === "completed";
              return (
                <button
                  key={step.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                    isActive && "border border-primary/20 bg-primary/10 font-bold text-primary",
                    isCompleted && "text-slate-600 hover:bg-slate-50",
                    !isActive && !isCompleted && "cursor-default text-slate-400",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      isActive && "bg-primary text-white",
                      isCompleted && "bg-emerald-50 text-emerald-500",
                      !isActive && !isCompleted && "bg-slate-100 text-slate-300",
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className="truncate text-xs font-semibold">
                    {t(`interview.steps.${step.id}`, { defaultValue: step.label })}
                  </span>
                  {isCompleted && <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t("interview.stats.yourStats")}
            </h4>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatCard label={t("interview.stats.total")} value={String(interviewHistory.length)} icon={Video} />
              <StatCard
                label={t("interview.stats.avgScore")}
                value={scoredHistory.length ? `${averageScore}%` : "N/A"}
                icon={BarChart3}
              />
              <StatCard
                label={t("interview.stats.best")}
                value={scoredHistory.length ? `${bestScore}%` : "N/A"}
                icon={Award}
              />
              <StatCard label={t("interview.stats.completed")} value={String(scoredHistory.length)} icon={TrendingUp} />
            </div>

            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t("interview.sidebar.recentSessions")}
            </h4>
            <div className="space-y-2">
              {interviewHistoryState === "signed-out" ? (
                <p className="py-3 text-center text-[11px] text-slate-400">
                  {t("interview.sidebar.signedOut")}
                </p>
              ) : interviewHistoryState === "loading" ? (
                <p className="py-3 text-center text-[11px] text-slate-400">
                  {t("interview.sidebar.loadingHistory")}
                </p>
              ) : interviewHistoryState === "error" ? (
                <div className="space-y-2 py-3 text-center">
                  <p className="text-[11px] text-rose-500">{t("interview.sidebar.historyError")}</p>
                  <button
                    type="button"
                    className="text-[11px] font-bold text-primary hover:underline"
                    onClick={() => void interviewHistoryQuery.refetch()}
                    disabled={interviewHistoryQuery.isFetching}
                  >
                    {interviewHistoryQuery.isFetching
                      ? t("interview.sidebar.retrying")
                      : t("interview.sidebar.tryAgain")}
                  </button>
                </div>
              ) : interviewHistoryState === "empty" ? (
                <p className="py-3 text-center text-[11px] text-slate-400">
                  {t("interview.sidebar.emptyHistory")}
                </p>
              ) : (
                interviewHistory.slice(0, 10).map((session) => {
                  const selected = session.id === selectedHistorySessionId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => openHistoryDetail(session.id)}
                      disabled={!canSelectHistory}
                      className={cn(
                        "w-full rounded-lg p-2 text-left transition-colors",
                        selected
                          ? "border border-primary/20 bg-primary/10"
                          : "bg-slate-50 hover:bg-slate-100",
                        !canSelectHistory && "cursor-not-allowed opacity-60 hover:bg-slate-50",
                      )}
                      title={
                        canSelectHistory
                          ? t("interview.sidebar.viewResult")
                          : t("interview.sidebar.historyDisabled")
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] font-bold text-slate-700">
                          {roleLabel(session.targetRole)}
                        </p>
                        <span className="text-xs font-black text-primary">
                          {session.overallScore == null ? "N/A" : `${Math.round(session.overallScore)}%`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {formatSessionDate(session.createdAt)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <button
          onClick={() => setSidebarOpen((value) => !value)}
          className="z-10 flex h-full w-5 shrink-0 items-center justify-center transition-colors hover:bg-slate-100/80"
          title={sidebarOpen ? t("interview.sidebar.hide") : t("interview.sidebar.show")}
          type="button"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <PanelLeftOpen className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {showPracticeSetup && (
          <main className="custom-scrollbar relative flex-1 overflow-y-auto bg-slate-50/30">
            <div className="px-6 py-6 md:px-10 md:py-8">
              <InterviewSetup
                tipsExpanded={tipsExpanded}
                setTipsExpanded={setTipsExpanded}
                onStart={startInterview}
                isLoading={isLoading}
                cvItems={cvItems}
                selectedCvId={selectedCvId}
                setSelectedCvId={setSelectedCvId}
                isCvLoading={cvListQuery.isLoading}
                matchItems={matchItems}
                selectedMatchId={selectedMatchId}
                setSelectedMatchId={setSelectedMatchId}
                isMatchesLoading={cvMatchesQuery.isLoading}
                targetRole={targetRole}
                setTargetRole={setTargetRole}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                interviewMode={interviewMode}
                setInterviewMode={setInterviewMode}
                interviewType={interviewType}
                setInterviewType={setInterviewType}
                selectedVoice={voicePreference.voice}
                setSelectedVoice={setSelectedVoice}
                speechSpeed={voicePreference.speechSpeed}
                setSpeechSpeed={setSpeechSpeed}
              />
              {apiError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {apiError}
                </div>
              )}
            </div>
          </main>
        )}

        {phase === "interviewing" && (
          <InterviewSession
            videoRef={videoRef}
            webcamError={webcamError}
            timeRemainingLabel={timeRemainingLabel}
            secondsRemaining={secondsRemaining}
            maxDurationSeconds={maxDurationSeconds}
            currentQuestionNumber={currentQuestionNumber}
            totalQuestionsPlanned={totalQuestionsPlanned}
            answeredCount={answeredCount}
            isEnding={isEnding}
            interviewMode={interviewMode}
            isLiveConnected={isLiveConnected}
            isVoiceFallback={isVoiceFallback}
            voiceFallbackReason={voiceFallbackReason}
            isMicActive={isMicActive}
            isAiSpeaking={isAiSpeaking}
            isQuestionAudioPlaying={isQuestionAudioPlaying}
            questionAudioError={questionAudioError}
            currentQuestion={currentQuestion}
            chatHistory={chatHistory}
            isLoading={isLoading}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            handleSubmitAnswer={handleSubmitAnswer}
            toggleLiveMic={toggleLiveMic}
            interviewFinished={interviewFinished}
            onStop={() => void finishInterview("manual")}
            apiError={apiError}
          />
        )}

        {phase === "results" && (
          <main className="custom-scrollbar relative flex-1 overflow-y-auto bg-slate-50/30">
            <div className="px-6 py-6 md:px-10 md:py-8">
              <ResultsView
                result={resultDetail}
                duration={resultDetail?.durationSeconds}
                onRetry={startNewInterviewFromHistory}
              />
            </div>
          </main>
        )}

        {showHistoryList && (
          <InterviewHistoryPanel
            state={interviewHistoryState}
            sessions={interviewHistory}
            selectedSessionId={selectedHistorySessionId}
            isFetching={interviewHistoryQuery.isFetching}
            canSelectHistory={canSelectHistory}
            onRetry={() => void interviewHistoryQuery.refetch()}
            onSelectSession={openHistoryDetail}
            onStartNew={startNewInterviewFromHistory}
          />
        )}

        {phase === "history-detail" && (
          <InterviewHistoryDetailView
            state={historyDetailState}
            result={historyDetailQuery.data ?? null}
            isFetching={historyDetailQuery.isFetching}
            onRetry={() => void historyDetailQuery.refetch()}
            onBackToHistory={switchToHistory}
            onStartNew={startNewInterviewFromHistory}
          />
        )}
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-slate-400" />
      <p className="text-sm font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-semibold text-slate-400">{label}</p>
    </div>
  );
}

function uniqueMessages(messages: string[]): string[] {
  return Array.from(new Set(messages.map((message) => message.trim()).filter(Boolean)));
}
