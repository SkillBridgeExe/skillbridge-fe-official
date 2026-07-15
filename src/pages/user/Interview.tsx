import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@posthog/react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEndInterviewOnExit } from "@/hooks/use-end-interview-on-exit";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { INTERVIEW_SETUP_STEPS } from "@/constants/interview";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getInterviewQuestionAudio,
  getInterviewDetail,
  type InterviewDetailResponseDto,
  type InterviewSessionDto,
  type InterviewTurnDto,
  type AnswerInterviewResponseDto,
} from "@/api/interview-api";
import {
  useCvListForInterview,
  useCvMatchesForInterview,
  useCreateCvMatchForInterview,
  useEndInterview,
  useInterviewDetail,
  useInterviewHistory,
  useRefreshRealtimeToken,
  useStartInterview,
  useSubmitInterviewTurn,
  useUploadCvForInterview,
} from "@/hooks/use-interview";
import { ResultsView } from "@/components/interview/ResultsView";
import { InterviewHistoryDetailView } from "@/components/interview/InterviewHistoryDetailView";
import { InterviewHistoryPanel } from "@/components/interview/InterviewHistoryPanel";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
import { InterviewSession } from "@/components/interview/InterviewSession";
import {
  AVAILABLE_TARGET_ROLES,
  DEFAULT_INTERVIEW_MODE,
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
  buildInterviewInitialMessages,
  buildInterviewNextMessages,
  buildInterviewStartRequest,
  buildBufferedRealtimeTurnRequest,
  classifyRealtimeTranscriptIntent,
  canOpenInterviewHistory,
  canSwitchInterviewWorkspace,
  createQuestionAudioRequestGuard,
  formatDuration,
  getInterviewEndIntent,
  getInterviewEndOutcome,
  getInterviewHistoryDetailState,
  getInterviewHistoryState,
  getInterviewQuestionBankSourceKind,
  getQuestionAudioErrorMessage,
  getRealtimeTokenFallbackReason,
  readInterviewVoicePreference,
  secondsRemainingFromExpiry,
  shouldRequestLiveClosingSignal,
  shouldRequestQuestionAudio,
  speakOfficialRealtimeQuestion,
  takeRecentInterviewSessions,
  writeInterviewVoicePreference,
  type InterviewQuestionBankSourceKind,
  type InterviewVoicePreference,
} from "@/components/interview/interview-view-model";
import { OpenAIRealtimeSession, type RealtimeEvent } from "@/lib/openai-realtime";
import { acquireInterviewMedia } from "@/lib/interview-media";
import { useAnswerPace } from "@/hooks/use-answer-pace";

type EndReason = "manual" | "timer" | "finished";
const REALTIME_MIC_REOPEN_DELAY_MS = 450;
const REALTIME_ANSWER_BUFFER_IDLE_MS = 1300;

interface CurrentQuestionMetadata {
  topicPhase: string | null;
  skillCanonical: string | null;
  currentThread: string | null;
  questionBankKey: string | null;
  sourceKind: InterviewQuestionBankSourceKind;
}

function questionMetadataFromTurn(
  turn: Pick<InterviewTurnDto, "topicPhase" | "skillCanonical" | "currentThread" | "questionBankKey"> | null,
  targetRole: string,
): CurrentQuestionMetadata {
  return {
    topicPhase: turn?.topicPhase ?? null,
    skillCanonical: turn?.skillCanonical ?? null,
    currentThread: turn?.currentThread ?? null,
    questionBankKey: turn?.questionBankKey ?? null,
    sourceKind: turn?.questionBankKey ? "curated" : getInterviewQuestionBankSourceKind(targetRole),
  };
}

export default function Interview() {
  const { t, i18n } = useTranslation("common");
  const { toast } = useToast();
  const posthog = usePostHog();
  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [workspaceTab, setWorkspaceTab] = useState<InterviewWorkspaceTab>("practice");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState(AVAILABLE_TARGET_ROLES[0].value);
  const [selectedLanguage, setSelectedLanguage] = useState<"vi" | "en">("vi");
  const [interviewMode, setInterviewMode] = useState<InterviewMode>(DEFAULT_INTERVIEW_MODE);
  const [interviewType, setInterviewType] = useState<InterviewType>("technical");
  const [voicePreference, setVoicePreference] = useState<InterviewVoicePreference>(() =>
    readInterviewVoicePreference(typeof window === "undefined" ? null : window.localStorage),
  );
  const [activeSession, setActiveSession] = useState<InterviewSessionDto | null>(null);
  const [resultDetail, setResultDetail] = useState<InterviewDetailResponseDto | null>(null);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentQuestionMeta, setCurrentQuestionMeta] = useState<CurrentQuestionMetadata | null>(null);
  const [currentTurnTrace, setCurrentTurnTrace] = useState<AnswerInterviewResponseDto["turnTrace"] | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
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
  const activeSessionRef = useRef<InterviewSessionDto | null>(null);
  const currentQuestionRef = useRef("");
  const currentInterviewerMessageRef = useRef("");
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionAudioUrlRef = useRef<string | null>(null);
  const questionAudioGuardRef = useRef(createQuestionAudioRequestGuard());
  const acceptsUserSpeechRef = useRef(false);
  const questionStartedAtRef = useRef<Date | null>(null);
  const liveAiMessageIdRef = useRef<string | null>(null);
  const liveQuestionBufferRef = useRef("");
  const liveLastQuestionRef = useRef("");
  const isRealtimeTurnSubmittingRef = useRef(false);
  /** P3 speech timing: when the mic actually opened for this turn / delay to first speech. */
  const micOpenedAtRef = useRef<number | null>(null);
  const firstSpeechDelayMsRef = useRef<number | null>(null);
  const submitRealtimeTranscriptRef = useRef<(transcript: string) => void>(() => undefined);
  const micReopenTimerRef = useRef<number | null>(null);
  const realtimeAnswerBufferRef = useRef<string[]>([]);
  const realtimeAnswerFlushTimerRef = useRef<number | null>(null);
  const submittedRealtimeQuestionRef = useRef<string | null>(null);
  const endingRef = useRef(false);
  const autoEndRef = useRef(false);
  const liveClosingRequestedRef = useRef(false);
  /** I-PACE: answer budget (seconds) for the CURRENT turn. null → degrade (no pace UI). */
  const currentTimeBudgetRef = useRef<number | null>(null);
  const [currentTimeBudget, setCurrentTimeBudget] = useState<number | null>(null);

  const canUseApi = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.isAuthenticated && state.authSource === "api",
  );

  const sidebarMode = useAuthStore(
    (state) => state.isAuthenticated && state.currentUser?.role === "user",
  );

  const interviewHistoryQuery = useInterviewHistory(canUseApi);
  const historyDetailQuery = useInterviewDetail(
    selectedHistorySessionId,
    canUseApi && phase === "history-detail",
  );
  const cvListQuery = useCvListForInterview(canUseApi);
  const cvMatchesQuery = useCvMatchesForInterview(selectedCvId, canUseApi && Boolean(selectedCvId));
  const startInterviewMutation = useStartInterview();
  const uploadCvForInterviewMutation = useUploadCvForInterview();
  const createCvMatchForInterviewMutation = useCreateCvMatchForInterview();
  const submitTurnMutation = useSubmitInterviewTurn();
  const endInterviewMutation = useEndInterview();
  const refreshRealtimeTokenMutation = useRefreshRealtimeToken();

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Best-effort /interview/end when the user abandons mid-interview (tab close,
  // navigation away) so the answered turns still get scored instead of leaking
  // the paid session. markEnded() below keeps explicit ends from double-firing.
  const { markEnded: markExitEndHandled } = useEndInterviewOnExit({
    interviewing: phase === "interviewing",
    sessionId: activeSession?.id ?? null,
  });

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

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
  const endIntent = getInterviewEndIntent(answeredCount);
  const recentInterviewSessions = takeRecentInterviewSessions(interviewHistory);
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

  const appendLiveAssistantTranscript = useCallback((delta: string) => {
    const normalized = delta.normalize("NFC");
    if (!normalized.trim()) return;

    let messageId = liveAiMessageIdRef.current;
    liveQuestionBufferRef.current = `${liveQuestionBufferRef.current}${normalized}`.normalize("NFC");
    liveLastQuestionRef.current = liveQuestionBufferRef.current.trim() || liveLastQuestionRef.current;
    setCurrentQuestion(liveLastQuestionRef.current);

    setChatHistory((current) => {
      if (!messageId) {
        messageId = `live-ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        liveAiMessageIdRef.current = messageId;
        return [
          ...current,
          {
            id: messageId,
            role: "ai",
            content: normalized.trimStart(),
            timestamp: new Date(),
          },
        ];
      }

      return current.map((message) =>
        message.id === messageId
          ? { ...message, content: `${message.content}${normalized}`.normalize("NFC") }
          : message,
      );
    });
  }, []);

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
    questionAudioGuardRef.current.invalidate();
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

  const clearMicReopenTimer = useCallback(() => {
    if (micReopenTimerRef.current === null) return;
    window.clearTimeout(micReopenTimerRef.current);
    micReopenTimerRef.current = null;
  }, []);

  const clearRealtimeAnswerFlushTimer = useCallback(() => {
    if (realtimeAnswerFlushTimerRef.current === null) return;
    window.clearTimeout(realtimeAnswerFlushTimerRef.current);
    realtimeAnswerFlushTimerRef.current = null;
  }, []);

  const resetRealtimeAnswerBuffer = useCallback(() => {
    clearRealtimeAnswerFlushTimer();
    realtimeAnswerBufferRef.current = [];
    firstSpeechDelayMsRef.current = null;
  }, [clearRealtimeAnswerFlushTimer]);

  const disconnectRealtime = useCallback(() => {
    clearMicReopenTimer();
    resetRealtimeAnswerBuffer();
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    setIsLiveConnected(false);
    setIsMicActive(false);
    setIsAiSpeaking(false);
    acceptsUserSpeechRef.current = false;
    liveAiMessageIdRef.current = null;
    liveQuestionBufferRef.current = "";
  }, [clearMicReopenTimer, resetRealtimeAnswerBuffer]);

  const setVoiceFallback = useCallback((reason: string) => {
    clearMicReopenTimer();
    resetRealtimeAnswerBuffer();
    liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    setIsLiveConnected(false);
    setIsMicActive(false);
    setIsAiSpeaking(false);
    acceptsUserSpeechRef.current = false;
    liveAiMessageIdRef.current = null;
    liveQuestionBufferRef.current = "";
    setIsVoiceFallback(true);
    setVoiceFallbackReason(reason);
  }, [clearMicReopenTimer, resetRealtimeAnswerBuffer]);

  const requestSessionMedia = useCallback(
    async (): Promise<MediaStream | null> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setWebcamError(t("interview.errors.mediaUnsupported"));
        return null;
      }

      const { stream, microphoneError, cameraError } = await acquireInterviewMedia(
        navigator.mediaDevices,
      );

      if (!stream || microphoneError) {
        const name = microphoneError instanceof DOMException ? microphoneError.name : "";
        setWebcamError(
          name === "NotFoundError"
            ? t("interview.errors.mediaNotFound")
            : t("interview.errors.mediaDenied"),
        );
        return null;
      }

      stopMedia();
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      }

      if (cameraError) {
        const name = cameraError instanceof DOMException ? cameraError.name : "";
        setWebcamError(
          name === "NotFoundError"
            ? t("interview.errors.mediaNotFound")
            : t("interview.errors.mediaDenied"),
        );
      } else {
        setWebcamError(null);
      }
      return stream;
    },
    [stopMedia, t],
  );

  const connectRealtime = useCallback(
    async (clientSecret: string, stream: MediaStream, liveConversation = false) => {
      if (stream.getAudioTracks().length === 0) {
        throw new Error(t("interview.errors.noMicrophoneTrack"));
      }

      const realtimeSession = new OpenAIRealtimeSession();
      liveSessionRef.current = realtimeSession;

      realtimeSession.on((event: RealtimeEvent) => {
        switch (event.type) {
          case "connected":
            setIsLiveConnected(true);
            setIsMicActive(false);
            setIsVoiceFallback(false);
            setVoiceFallbackReason(null);
            acceptsUserSpeechRef.current = false;
            break;
          case "disconnected":
            clearMicReopenTimer();
            resetRealtimeAnswerBuffer();
            setIsLiveConnected(false);
            setIsMicActive(false);
            break;
          case "user_transcript": {
            const transcript = event.data?.trim();
            if (!transcript) break;
            if (liveConversation) {
              if (acceptsUserSpeechRef.current) {
                submitRealtimeTranscriptRef.current(transcript);
              }
            } else if (acceptsUserSpeechRef.current) {
              setUserAnswer((current) => (current.trim() ? `${current.trim()}\n${transcript}` : transcript));
            }
            break;
          }
          case "ai_speaking":
            clearMicReopenTimer();
            clearRealtimeAnswerFlushTimer();
            acceptsUserSpeechRef.current = false;
            liveSessionRef.current?.setMicEnabled(false);
            setIsMicActive(false);
            setIsAiSpeaking(true);
            break;
          case "ai_stopped":
            setIsAiSpeaking(false);
            if (liveConversation) {
              questionStartedAtRef.current = new Date();
              clearMicReopenTimer();
              micReopenTimerRef.current = window.setTimeout(() => {
                micReopenTimerRef.current = null;
                if (
                  !liveSessionRef.current?.isConnected ||
                  isRealtimeTurnSubmittingRef.current ||
                  endingRef.current
                ) {
                  return;
                }
                acceptsUserSpeechRef.current = true;
                liveSessionRef.current.setMicEnabled(true);
                setIsMicActive(true);
                micOpenedAtRef.current = Date.now();
              }, REALTIME_MIC_REOPEN_DELAY_MS);
            }
            break;
          case "error":
            setVoiceFallback(event.data || t("interview.errors.realtimeVoiceFailed"));
            break;
          case "ai_transcript": {
            if (!liveConversation && event.data) appendLiveAssistantTranscript(event.data);
            break;
          }
        }
      });

      await realtimeSession.connect({ clientSecret, stream, initialMicEnabled: false });
      realtimeSession.setMicEnabled(false);
      acceptsUserSpeechRef.current = false;
      setIsMicActive(false);
    },
    [
      appendLiveAssistantTranscript,
      clearMicReopenTimer,
      clearRealtimeAnswerFlushTimer,
      resetRealtimeAnswerBuffer,
      setVoiceFallback,
      t,
    ],
  );

  const playQuestionAudio = useCallback(
    async (sessionId: string) => {
      stopQuestionAudio();
      const requestId = questionAudioGuardRef.current.next();
      setQuestionAudioError(null);
      setIsQuestionAudioPlaying(true);

      try {
        const blob = await getInterviewQuestionAudio(sessionId);
        if (!questionAudioGuardRef.current.isCurrent(requestId)) return;
        const url = URL.createObjectURL(blob);
        if (!questionAudioGuardRef.current.isCurrent(requestId)) {
          URL.revokeObjectURL(url);
          return;
        }
        const audio = new Audio(url);
        questionAudioUrlRef.current = url;
        questionAudioRef.current = audio;
        audio.onended = () => {
          if (!questionAudioGuardRef.current.isCurrent(requestId)) return;
          setIsQuestionAudioPlaying(false);
        };
        audio.onerror = () => {
          if (!questionAudioGuardRef.current.isCurrent(requestId)) return;
          setIsQuestionAudioPlaying(false);
          setQuestionAudioError(t("interview.errors.questionAudioPlayFailed"));
        };
        await audio.play();
      } catch (error) {
        if (!questionAudioGuardRef.current.isCurrent(requestId)) return;
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
    activeSessionRef.current = null;
    currentQuestionRef.current = "";
    currentInterviewerMessageRef.current = "";
    isRealtimeTurnSubmittingRef.current = false;
    setActiveSession(null);
    setResultDetail(null);
    setSelectedHistorySessionId(null);
    setChatHistory([]);
    setCurrentQuestion("");
    setCurrentQuestionMeta(null);
    setCurrentTurnTrace(null);
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
    setIsEndDialogOpen(false);
    endingRef.current = false;
    autoEndRef.current = false;
    liveClosingRequestedRef.current = false;
    acceptsUserSpeechRef.current = false;
    questionStartedAtRef.current = null;
    liveAiMessageIdRef.current = null;
    liveQuestionBufferRef.current = "";
    liveLastQuestionRef.current = "";
    submittedRealtimeQuestionRef.current = null;
    currentTimeBudgetRef.current = null;
    setCurrentTimeBudget(null);
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

  const uploadCvForInterview = useCallback(
    async (input: {
      file: File;
      targetRole?: string;
      title?: string;
      consentAccepted: boolean;
    }) => {
      if (!canUseApi) {
        setApiError(t("interview.errors.signInRequired"));
        return;
      }

      try {
        setApiError(null);
        const cv = await uploadCvForInterviewMutation.mutateAsync(input);
        setSelectedCvId(cv.id);
        setSelectedMatchId(null);
        await cvListQuery.refetch();
        toast({
          title: t("interview.setup.uploadCvSuccessTitle"),
          description: t("interview.setup.uploadCvSuccessDescription"),
        });
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          t("interview.setup.uploadCvFailed"),
        );
        setApiError(message);
        toast({
          title: t("interview.setup.uploadCvFailedTitle"),
          description: message,
          variant: "destructive",
        });
      }
    },
    [canUseApi, cvListQuery, t, toast, uploadCvForInterviewMutation],
  );

  const createCvMatchForInterview = useCallback(
    async (
      input:
        | {
            kind: "paste";
            cvId: string;
            jdText: string;
            title?: string;
            targetRole?: string;
          }
        | {
            kind: "file";
            cvId: string;
            file: File;
            title?: string;
            targetRole?: string;
          },
    ) => {
      if (!canUseApi) {
        setApiError(t("interview.errors.signInRequired"));
        return;
      }

      try {
        setApiError(null);
        const match = await createCvMatchForInterviewMutation.mutateAsync(input);
        setSelectedMatchId(match.id);
        await cvMatchesQuery.refetch();
        toast({
          title: t("interview.setup.createJdMatchSuccessTitle"),
          description: t("interview.setup.createJdMatchSuccessDescription"),
        });
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          t("interview.setup.createJdMatchFailed"),
        );
        setApiError(message);
        toast({
          title: t("interview.setup.createJdMatchFailedTitle"),
          description: message,
          variant: "destructive",
        });
      }
    },
    [canUseApi, createCvMatchForInterviewMutation, cvMatchesQuery, t, toast],
  );

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

      const initialMessages = buildInterviewInitialMessages(started.firstMessage, started.firstQuestion).map(
        (content) => ({ role: "ai" as const, content, timestamp: new Date() }),
      );

      activeSessionRef.current = started;
      currentQuestionRef.current = started.firstQuestion;
      currentInterviewerMessageRef.current = started.firstMessage ?? "";
      setActiveSession(started);
      setCurrentQuestion(started.firstQuestion);
      setCurrentQuestionMeta(
        questionMetadataFromTurn(
          { topicPhase: started.phase, skillCanonical: null, currentThread: null, questionBankKey: null },
          started.targetRole,
        ),
      );
      setSecondsRemaining(secondsRemainingFromExpiry(started.expiresAt) || started.maxDurationSeconds);
      setChatHistory(initialMessages);
      setPhase("interviewing");
      setSidebarOpen(false);
      posthog?.capture("interview_started", { mode: interviewMode, type: interviewType, target_role: targetRole });
      questionStartedAtRef.current = interviewMode === "realtime" ? null : new Date();
      // I-PACE: set initial answer budget from start response.
      const initialBudget = (started as { answerBudgetSeconds?: number }).answerBudgetSeconds ?? null;
      currentTimeBudgetRef.current = initialBudget;
      setCurrentTimeBudget(initialBudget);

      const stream = await requestSessionMedia();
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
            await connectRealtime(started.realtime.clientSecret, stream, interviewMode === "realtime");
            realtimeConnected = true;
          } catch (error) {
            if (interviewMode === "realtime") {
              setVoiceFallback(getApiErrorMessage(error, t("interview.errors.realtimeVoiceFailed")));
            }
          }
        }
      }

      if (interviewMode === "realtime" && realtimeConnected) {
        acceptsUserSpeechRef.current = false;
        liveSessionRef.current?.setMicEnabled(false);
        setIsMicActive(false);
        speakOfficialRealtimeQuestion(
          liveSessionRef.current,
          started.firstQuestion,
          selectedLanguage,
          started.firstMessage,
        );
      } else if (shouldRequestQuestionAudio(interviewMode)) {
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

  const applyEndedInterview = useCallback(
    (detail: InterviewDetailResponseDto) => {
      if (getInterviewEndOutcome(detail.status) === "cancelled") {
        resetInterviewState();
        setWorkspaceTab("practice");
        setPhase("setup");
        setSidebarOpen(true);
        toast({
          title: t("interview.cancelledToast.title"),
          description: t("interview.cancelledToast.description"),
        });
        return;
      }

      setResultDetail(detail);
      setActiveSession(detail);
      setInterviewFinished(true);
      setPhase("results");
      setSidebarOpen(true);
      posthog?.capture("interview_completed", { session_id: detail.id, score: detail.overallScore });
    },
    [posthog, resetInterviewState, t, toast],
  );

  const finishInterview = useCallback(
    async (reason: EndReason = "manual") => {
      const sessionId = activeSession?.id;
      if (!sessionId || endingRef.current) return;

      endingRef.current = true;
      markExitEndHandled();
      setIsEnding(true);
      setIsLoading(false);
      setApiError(null);
      disconnectRealtime();
      stopMedia();
      stopQuestionAudio();

      try {
        const detail = await endInterviewMutation.mutateAsync({ sessionId });
        applyEndedInterview(detail);
      } catch (error) {
        if (reason === "timer" || reason === "finished") {
          try {
            const detail = await getInterviewDetail(sessionId);
            applyEndedInterview(detail);
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
    [
      activeSession?.id,
      applyEndedInterview,
      disconnectRealtime,
      endInterviewMutation,
      markExitEndHandled,
      stopMedia,
      stopQuestionAudio,
      t,
    ],
  );

  const flushRealtimeAnswerBuffer = useCallback(
    async () => {
      clearRealtimeAnswerFlushTimer();
      if (isRealtimeTurnSubmittingRef.current || endingRef.current) return;

      const session = activeSessionRef.current;
      const currentQuestionKey = currentQuestionRef.current.trim().normalize("NFC");
      if (!session || !currentQuestionKey || submittedRealtimeQuestionRef.current === currentQuestionKey) {
        resetRealtimeAnswerBuffer();
        return;
      }
      const now = new Date();
      const durationSeconds = questionStartedAtRef.current
        ? Math.max(0, Math.round((now.getTime() - questionStartedAtRef.current.getTime()) / 1000))
        : undefined;
      const payload = buildBufferedRealtimeTurnRequest({
        sessionId: session.id,
        currentQuestion: currentQuestionKey,
        transcripts: realtimeAnswerBufferRef.current,
        durationSeconds,
        responseDelayMs: firstSpeechDelayMsRef.current ?? undefined,
      });
      if (!payload) {
        resetRealtimeAnswerBuffer();
        if (liveSessionRef.current?.isConnected && !endingRef.current) {
          acceptsUserSpeechRef.current = true;
          liveSessionRef.current.setMicEnabled(true);
          setIsMicActive(true);
        }
        return;
      }

      isRealtimeTurnSubmittingRef.current = true;
      submittedRealtimeQuestionRef.current = currentQuestionKey;
      resetRealtimeAnswerBuffer();
      clearMicReopenTimer();
      stopQuestionAudio();
      acceptsUserSpeechRef.current = false;
      liveSessionRef.current?.setMicEnabled(false);
      setIsMicActive(false);
      setChatHistory((current) => [
        ...current,
        { id: `live-user-${Date.now()}`, role: "user", content: payload.userAnswer, timestamp: now },
      ]);
      setIsLoading(true);
      setApiError(null);

      try {
        const response = await submitTurnMutation.mutateAsync(payload);
        activeSessionRef.current = response.session;
        setActiveSession(response.session);

        const nextQuestion = response.nextQuestion ?? response.nextTurn?.interviewerQuestion ?? "";
        const nextAiMessage = response.aiMessage || response.nextTurn?.interviewerMessage || "";
        currentQuestionRef.current = nextQuestion;
        currentInterviewerMessageRef.current = nextQuestion ? nextAiMessage : "";
        submittedRealtimeQuestionRef.current = null;
        setCurrentTurnTrace(response.turnTrace ?? null);
        // I-PACE: update budget for next turn.
        const nextBudget = response.nextTurn?.timeBudgetSeconds ?? null;
        currentTimeBudgetRef.current = nextBudget;
        setCurrentTimeBudget(nextBudget);
        if (nextQuestion) {
          setCurrentQuestion(nextQuestion);
          setCurrentQuestionMeta(
            response.nextTurn
              ? questionMetadataFromTurn(response.nextTurn, response.session.targetRole)
              : questionMetadataFromTurn(null, response.session.targetRole),
          );
        } else {
          setCurrentQuestionMeta(null);
        }

        const nextMessages = buildInterviewNextMessages(nextAiMessage, nextQuestion).map((content) => ({
          role: "ai" as const,
          content,
          timestamp: new Date(),
        }));
        if (nextMessages.length > 0) {
          setChatHistory((current) => [...current, ...nextMessages]);
        }

        if (response.finished) {
          setInterviewFinished(true);
          await finishInterview("finished");
          return;
        }

        questionStartedAtRef.current = null;
        acceptsUserSpeechRef.current = false;
        liveSessionRef.current?.setMicEnabled(false);
        setIsMicActive(false);
        speakOfficialRealtimeQuestion(liveSessionRef.current, nextQuestion, selectedLanguage, nextAiMessage);
      } catch (error) {
        submittedRealtimeQuestionRef.current = null;
        setApiError(getApiErrorMessage(error, t("interview.errors.submitFailed")));
        acceptsUserSpeechRef.current = true;
        liveSessionRef.current?.setMicEnabled(true);
        setIsMicActive(true);
      } finally {
        setIsLoading(false);
        isRealtimeTurnSubmittingRef.current = false;
      }
    },
    [
      clearMicReopenTimer,
      clearRealtimeAnswerFlushTimer,
      finishInterview,
      resetRealtimeAnswerBuffer,
      selectedLanguage,
      stopQuestionAudio,
      submitTurnMutation,
      t,
    ],
  );

  const scheduleRealtimeAnswerFlush = useCallback(() => {
    clearRealtimeAnswerFlushTimer();
    realtimeAnswerFlushTimerRef.current = window.setTimeout(() => {
      realtimeAnswerFlushTimerRef.current = null;
      void flushRealtimeAnswerBuffer();
    }, REALTIME_ANSWER_BUFFER_IDLE_MS);
  }, [clearRealtimeAnswerFlushTimer, flushRealtimeAnswerBuffer]);

  const handleRealtimeTranscript = useCallback(
    (transcript: string) => {
      if (isRealtimeTurnSubmittingRef.current || endingRef.current) return;
      const intent = classifyRealtimeTranscriptIntent(transcript);
      if (intent !== "answer") {
        resetRealtimeAnswerBuffer();
      }

      if (intent === "repeat_question") {
        acceptsUserSpeechRef.current = false;
        liveSessionRef.current?.setMicEnabled(false);
        setIsMicActive(false);
        speakOfficialRealtimeQuestion(
          liveSessionRef.current,
          currentQuestionRef.current,
          selectedLanguage,
          currentInterviewerMessageRef.current,
        );
        return;
      }

      if (intent === "clarify_question") {
        acceptsUserSpeechRef.current = false;
        liveSessionRef.current?.setMicEnabled(false);
        setIsMicActive(false);
        liveSessionRef.current?.explainOfficialQuestion(currentQuestionRef.current, selectedLanguage);
        return;
      }

      if (intent === "pause") {
        clearRealtimeAnswerFlushTimer();
        acceptsUserSpeechRef.current = false;
        liveSessionRef.current?.setMicEnabled(false);
        setIsMicActive(false);
        return;
      }

      if (intent === "end_interview") {
        void finishInterview("manual");
        return;
      }

      if (intent === "skip_question" || intent === "off_topic") {
        if (liveSessionRef.current?.isConnected && !endingRef.current) {
          acceptsUserSpeechRef.current = true;
          liveSessionRef.current.setMicEnabled(true);
          setIsMicActive(true);
        }
        return;
      }

      const questionKey = currentQuestionRef.current.trim().normalize("NFC");
      if (!questionKey || submittedRealtimeQuestionRef.current === questionKey) return;
      if (realtimeAnswerBufferRef.current.length === 0 && micOpenedAtRef.current !== null) {
        // first speech of this turn — measure thinking time from actual mic-open.
        firstSpeechDelayMsRef.current = Math.max(0, Date.now() - micOpenedAtRef.current);
      }
      realtimeAnswerBufferRef.current = [...realtimeAnswerBufferRef.current, transcript];
      scheduleRealtimeAnswerFlush();
    },
    [
      clearRealtimeAnswerFlushTimer,
      finishInterview,
      resetRealtimeAnswerBuffer,
      scheduleRealtimeAnswerFlush,
      selectedLanguage,
    ],
  );
  submitRealtimeTranscriptRef.current = handleRealtimeTranscript;

  const handleSubmitAnswer = async () => {
    if (interviewMode === "realtime" && isLiveConnected && !isVoiceFallback) return;
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
    stopQuestionAudio();
    acceptsUserSpeechRef.current = false;
    liveSessionRef.current?.setMicEnabled(false);
    setIsMicActive(false);
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

      activeSessionRef.current = response.session;
      setActiveSession(response.session);
      const nextQuestion = response.nextQuestion ?? response.nextTurn?.interviewerQuestion ?? "";
      const nextAiMessage = response.aiMessage || response.nextTurn?.interviewerMessage || "";
      currentQuestionRef.current = nextQuestion;
      currentInterviewerMessageRef.current = nextQuestion ? nextAiMessage : "";
      setCurrentTurnTrace(response.turnTrace ?? null);
      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
        setCurrentQuestionMeta(
          response.nextTurn
            ? questionMetadataFromTurn(response.nextTurn, response.session.targetRole)
            : questionMetadataFromTurn(null, response.session.targetRole),
        );
      } else {
        setCurrentQuestionMeta(null);
      }

      const nextMessages = buildInterviewNextMessages(nextAiMessage, nextQuestion).map((content) => ({
        role: "ai" as const,
        content,
        timestamp: new Date(),
      }));

      if (nextMessages.length > 0) {
        setChatHistory((current) => [...current, ...nextMessages]);
      }

      if (response.finished) {
        setInterviewFinished(true);
        await finishInterview("finished");
      } else {
        questionStartedAtRef.current = new Date();
        if (nextQuestion && shouldRequestQuestionAudio(interviewMode)) {
          void playQuestionAudio(response.session.id);
        }
      }
    } catch (error) {
      setApiError(getApiErrorMessage(error, t("interview.errors.submitFailed")));
    } finally {
      setIsLoading(false);
    }
  };

  const reconnectRealtime = useCallback(async (): Promise<boolean> => {
    if (!activeSession?.id || !canUseApi) return false;

    setIsLoading(true);
    setApiError(null);

    try {
      let stream = mediaStreamRef.current;
      if (!stream || stream.getAudioTracks().length === 0) {
        stream = await requestSessionMedia();
      }

      if (!stream || stream.getAudioTracks().length === 0) {
        setVoiceFallback(t("interview.errors.microphoneUnavailable"));
        return false;
      }

      const realtime = await refreshRealtimeTokenMutation.mutateAsync(activeSession.id);
      if (!realtime.enabled || !realtime.clientSecret) {
        setVoiceFallback(realtime.reason || t("interview.errors.realtimeTokenUnavailable"));
        return false;
      }

      await connectRealtime(realtime.clientSecret, stream, interviewMode === "realtime");
      return true;
    } catch (error) {
      setVoiceFallback(getApiErrorMessage(error, t("interview.errors.reconnectFailed")));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [
    activeSession?.id,
    canUseApi,
    connectRealtime,
    interviewMode,
    refreshRealtimeTokenMutation,
    requestSessionMedia,
    setVoiceFallback,
    t,
  ]);

  const toggleLiveMic = async () => {
    if (isAiSpeaking || isQuestionAudioPlaying || isLoading) {
      return;
    }

    if (!liveSessionRef.current?.isConnected) {
      const reconnected = await reconnectRealtime();
      if (!reconnected || !liveSessionRef.current?.isConnected) return;
      acceptsUserSpeechRef.current = true;
      liveSessionRef.current.setMicEnabled(true);
      setIsMicActive(true);
      return;
    }

    const next = !isMicActive;
    liveSessionRef.current.setMicEnabled(next);
    acceptsUserSpeechRef.current = next;
    setIsMicActive(next);
  };

  useEffect(() => {
    if (phase !== "interviewing" || !activeSession?.expiresAt) return;

    const tick = () => {
      const remaining = secondsRemainingFromExpiry(activeSession.expiresAt);
      setSecondsRemaining(remaining);
      if (
        shouldRequestLiveClosingSignal({
          interviewMode,
          isVoiceFallback,
          isLiveConnected,
          secondsRemaining: remaining,
          alreadyRequested: liveClosingRequestedRef.current,
        })
      ) {
        liveClosingRequestedRef.current = true;
        liveSessionRef.current?.requestLiveInterviewClosing(selectedLanguage);
      }
      if (remaining === 0 && !autoEndRef.current) {
        autoEndRef.current = true;
        void finishInterview("timer");
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [
    activeSession?.expiresAt,
    finishInterview,
    interviewMode,
    isLiveConnected,
    isVoiceFallback,
    phase,
    selectedLanguage,
  ]);

  // I-PACE: per-turn answer pacing (hard ceiling + soft nudge).
  const answerPace = useAnswerPace({
    timeBudgetSeconds: currentTimeBudget,
    isMicOpen: isMicActive && isLiveConnected && !isVoiceFallback,
    isEnding: endingRef.current || isEnding,
    isAiSpeaking,
    onCeilingReached: flushRealtimeAnswerBuffer,
    onNudge: () => {
      // NOT requestLiveInterviewClosing — that announces the whole session is ending, which at a
      // per-question budget would land 90s into question one.
      if (liveSessionRef.current?.isConnected && !endingRef.current) {
        liveSessionRef.current.requestAnswerPaceNudge(selectedLanguage);
      }
    },
  });

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
      <div className={cn("flex overflow-hidden", sidebarMode ? "h-dvh" : "h-[calc(100dvh-80px)]")}>
        <aside
          className={cn(
            "h-full shrink-0 overflow-hidden border-r border-slate-100 bg-white/80 backdrop-blur-sm flex flex-col transition-all duration-300",
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

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          <nav className="space-y-1 p-3">
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

            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {t("interview.sidebar.recentSessions")}
              </h4>
              <button
                type="button"
                className="text-[10px] font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                onClick={switchToHistory}
                disabled={!canSwitchWorkspace}
              >
                {t("interview.sidebar.viewAll")}
              </button>
            </div>
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
                recentInterviewSessions.map((session) => {
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
          <main className="custom-scrollbar relative flex-1 overflow-y-auto md:overflow-hidden bg-slate-50/30">
            <div className="px-6 py-6 md:px-10 md:py-8">
              <InterviewSetup
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
                onUploadCvForInterview={(input) => {
                  void uploadCvForInterview(input);
                }}
                isUploadingCv={uploadCvForInterviewMutation.isPending}
                onCreateCvMatchForInterview={(input) => {
                  void createCvMatchForInterview(input);
                }}
                isCreatingCvMatch={createCvMatchForInterviewMutation.isPending}
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
            currentQuestionMeta={currentQuestionMeta}
            chatHistory={chatHistory}
            isLoading={isLoading}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            handleSubmitAnswer={handleSubmitAnswer}
            toggleLiveMic={toggleLiveMic}
            interviewFinished={interviewFinished}
            onStop={() => setIsEndDialogOpen(true)}
            apiError={apiError}
            currentTurnTrace={currentTurnTrace}
            answerPace={answerPace}
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

      <AlertDialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                endIntent === "cancel"
                  ? "interview.endConfirmation.cancelTitle"
                  : "interview.endConfirmation.scoreTitle",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                endIntent === "cancel"
                  ? "interview.endConfirmation.cancelDescription"
                  : "interview.endConfirmation.scoreDescription",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEnding}>
              {t("interview.endConfirmation.keepInterviewing")}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                endIntent === "cancel" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              disabled={isEnding}
              onClick={() => {
                setIsEndDialogOpen(false);
                void finishInterview("manual");
              }}
            >
              {t(
                endIntent === "cancel"
                  ? "interview.endConfirmation.confirmCancel"
                  : "interview.endConfirmation.confirmScore",
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
