import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
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
import { QUERY_KEYS } from "@/constants/app";
import { getMyCredits, getMyEntitlements } from "@/services/billing.service";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getInterviewDetail,
  type InterviewDetailResponseDto,
  type InterviewSessionDto,
  type InterviewExperienceMode,
  type RealtimeCandidateIntent,
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
  useSubmitRealtimeInterviewTurn,
  useUploadCvForInterview,
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
  type InterviewPhase,
  type InterviewSpeechSpeed,
  type InterviewType,
  type InterviewVoice,
  type InterviewWorkspaceTab,
} from "@/components/interview/types";
import {
  buildInterviewInitialMessages,
  containsInterviewInternalMarker,
  buildInterviewStartRequest,
  canOpenInterviewHistory,
  canSwitchInterviewWorkspace,
  formatDuration,
  getInterviewEndIntent,
  getInterviewEndOutcome,
  getInterviewHistoryDetailState,
  getInterviewHistoryState,
  getRealtimeTokenFallbackReason,
  readInterviewVoicePreference,
  secondsRemainingFromExpiry,
  shouldRequestLiveClosingSignal,
  takeRecentInterviewSessions,
  writeInterviewVoicePreference,
  type InterviewVoicePreference,
} from "@/components/interview/interview-view-model";
import {
  assessCandidateCapture,
  CandidateTurnBuffer,
  OpenAIRealtimeSession,
  type RealtimeEvent,
  type CandidateTurn,
} from "@/lib/openai-realtime";
import {
  acquireInterviewMedia,
  stopInterviewMedia,
} from "@/lib/interview-media";
import {
  interviewSessionReducer,
  initialInterviewSessionState,
} from "@/components/interview/interview-session-machine";


type EndReason = "manual" | "timer" | "finished";

function normalizeIntentText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function classifyIntent(value: string): RealtimeCandidateIntent {
  const text = normalizeIntentText(value);
  if (/\b(khong biet|chua biet|i do not know|dont know)\b/.test(text))
    return "NO_ANSWER";
  if (/\b(nhac lai|repeat)\b/.test(text)) return "REPEAT";
  if (/\b(lam ro|giai thich cau hoi|clarify)\b/.test(text)) return "CLARIFY";
  if (/\b(de hon|easier)\b/.test(text)) return "EASIER";
  if (/\b(goi y|hint)\b/.test(text)) return "HINT";
  if (/\b(nhan xet|feedback)\b/.test(text)) return "FEEDBACK";
  if (/\b(bo qua|doi chu de|skip|next question)\b/.test(text)) return "SKIP";
  if (/\b(ket thuc phong van|end interview|stop interview)\b/.test(text))
    return "END";
  return "ANSWER";
}

function extractSpokenQuestion(transcript: string, fallback = ""): string {
  const normalized = transcript.trim().normalize("NFC");
  const questions = normalized.match(/[^.!?？]+[?？]/g);
  return questions?.at(-1)?.trim() || fallback;
}

function interviewerTurnText(message: string, question: string): string {
  return [message.trim(), question.trim()].filter(Boolean).join(" ");
}

const INTERVIEW_REALTIME_PROTOCOL_VERSION = "interview-realtime-v3";

function controlText(intent: RealtimeCandidateIntent, language: "vi" | "en"): string {
  const values: Record<RealtimeCandidateIntent, { vi: string; en: string }> = {
    ANSWER: { vi: "Câu trả lời", en: "Answer" },
    NO_ANSWER: { vi: "Tôi chưa biết câu này.", en: "I do not know this one." },
    REPEAT: { vi: "Hãy nhắc lại câu hỏi.", en: "Please repeat the question." },
    CLARIFY: { vi: "Hãy làm rõ câu hỏi.", en: "Please clarify the question." },
    EASIER: { vi: "Cho tôi một câu dễ hơn.", en: "Please ask an easier question." },
    HINT: { vi: "Cho tôi một gợi ý.", en: "Please give me a hint." },
    FEEDBACK: { vi: "Cho tôi nhận xét nhanh.", en: "Please give me quick feedback." },
    SKIP: { vi: "Bỏ qua và đổi chủ đề.", en: "Skip this and change topic." },
    END: { vi: "Kết thúc phỏng vấn.", en: "End the interview." },
  };
  return values[intent][language];
}
export default function Interview() {
  const { t, i18n } = useTranslation("common");
  const { toast } = useToast();
  const posthog = usePostHog();
  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [workspaceTab, setWorkspaceTab] =
    useState<InterviewWorkspaceTab>("practice");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState(AVAILABLE_TARGET_ROLES[0].value);
  const [selectedLanguage, setSelectedLanguage] = useState<"vi" | "en">("vi");
  const [experienceMode, setExperienceMode] =
    useState<InterviewExperienceMode>("MOCK");
  const [realtimeState, dispatchRealtime] = useReducer(
    interviewSessionReducer,
    initialInterviewSessionState,
  );
  const isMicActive =
    realtimeState.mic.trackAvailable && !realtimeState.mic.userMuted;
  const [interviewType, setInterviewType] =
    useState<InterviewType>("technical");
  const [voicePreference, setVoicePreference] =
    useState<InterviewVoicePreference>(() =>
      readInterviewVoicePreference(
        typeof window === "undefined" ? null : window.localStorage,
      ),
    );
  const [activeSession, setActiveSession] =
    useState<InterviewSessionDto | null>(null);
  const [resultDetail, setResultDetail] =
    useState<InterviewDetailResponseDto | null>(null);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<
    string | null
  >(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isVoiceFallback, setIsVoiceFallback] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const liveSessionRef = useRef<OpenAIRealtimeSession | null>(null);
  const activeSessionRef = useRef<InterviewSessionDto | null>(null);
  const currentQuestionRef = useRef("");
  const currentInterviewerMessageRef = useRef("");
  const questionStartedAtRef = useRef<Date | null>(null);
  /** P3 speech timing: when the mic actually opened for this turn / delay to first speech. */
  const micOpenedAtRef = useRef<number | null>(null);
  const firstSpeechDelayMsRef = useRef<number | null>(null);
  const candidateTurnBufferRef = useRef<CandidateTurnBuffer | null>(null);
  const candidateTurnsByIdRef = useRef(new Map<string, CandidateTurn>());
  const candidateIntentByTurnRef = useRef(
    new Map<string, RealtimeCandidateIntent>(),
  );
  const captureRetryTurnIdsRef = useRef(new Set<string>());
  const assistantTranscriptByResponseRef = useRef(new Map<string, string>());
  const firstAudioAtByResponseRef = useRef(new Map<string, string>());
  const interruptedResponseIdsRef = useRef(new Set<string>());
  const committedResponseIdsRef = useRef(new Set<string>());
  const responseClientTurnIdRef = useRef(new Map<string, string>());
  const currentTurnIdRef = useRef<string | null>(null);
  const lastAssistantTranscriptRef = useRef("");
  const captureFailureCountRef = useRef(0);
  const commitQueueRef = useRef<Promise<void>>(Promise.resolve());
  const userMutedRef = useRef(false);
  const endingRef = useRef(false);
  const autoEndRef = useRef(false);
  const finishInterviewRef = useRef<(reason: EndReason) => Promise<void>>(
    async () => undefined,
  );
  const liveClosingRequestedRef = useRef(false);

  const canUseApi = useAuthStore(
    (state) =>
      state.authStatus === "authenticated" &&
      state.isAuthenticated &&
      state.authSource === "api",
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
  const cvMatchesQuery = useCvMatchesForInterview(
    selectedCvId,
    canUseApi && Boolean(selectedCvId),
  );
  const startInterviewMutation = useStartInterview();
  const uploadCvForInterviewMutation = useUploadCvForInterview();
  const createCvMatchForInterviewMutation = useCreateCvMatchForInterview();
  const submitRealtimeTurnMutation = useSubmitRealtimeInterviewTurn();
  const endInterviewMutation = useEndInterview();
  const refreshRealtimeTokenMutation = useRefreshRealtimeToken();
  const interviewEntitlementsQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_ENTITLEMENTS,
    queryFn: getMyEntitlements,
    enabled: canUseApi,
    staleTime: 60_000,
  });
  const interviewCreditsQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_CREDITS,
    queryFn: getMyCredits,
    enabled: canUseApi,
    staleTime: 60_000,
  });
  const interviewQuota = interviewEntitlementsQuery.data?.find(
    (feature) => feature.feature === "interview_session",
  );
  const purchasedInterviewCredits =
    interviewCreditsQuery.data?.find(
      (credit) => credit.creditType === "INTERVIEW_SESSION",
    )?.balance ?? 0;

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
  const answeredCount = chatHistory.filter(
    (message) => message.role === "user",
  ).length;
  const endIntent = getInterviewEndIntent(answeredCount);
  const recentInterviewSessions = takeRecentInterviewSessions(interviewHistory);
  const maxDurationSeconds = activeSession?.maxDurationSeconds ?? 0;
  const timeRemainingLabel = activeSession?.expiresAt
    ? formatDuration(secondsRemaining)
    : formatDuration(maxDurationSeconds);

  const steps = useMemo(
    () =>
      INTERVIEW_SETUP_STEPS.map((step) => {
        if (step.id === "choose-cv") {
          return {
            ...step,
            status: selectedCvId
              ? "completed"
              : phase === "setup"
                ? "active"
                : "completed",
          };
        }
        if (step.id === "choose-context") {
          return { ...step, status: targetRole ? "completed" : "pending" };
        }
        if (step.id === "interview") {
          return {
            ...step,
            status:
              phase === "results"
                ? "completed"
                : phase === "interviewing"
                  ? "active"
                  : "pending",
          };
        }
        if (step.id === "result") {
          return {
            ...step,
            status:
              phase === "results" || phase === "history-detail"
                ? "active"
                : "pending",
          };
        }
        return step;
      }),
    [phase, selectedCvId, targetRole],
  );

  const completedSteps = steps.filter(
    (step) => step.status === "completed",
  ).length;
  const progressPercent = (completedSteps / steps.length) * 100;
  const scoredHistory = interviewHistory.filter(
    (session) => session.overallScore != null,
  );
  const averageScore =
    scoredHistory.length > 0
      ? Math.round(
          scoredHistory.reduce(
            (sum, session) => sum + Number(session.overallScore),
            0,
          ) / scoredHistory.length,
        )
      : 0;
  const bestScore =
    scoredHistory.length > 0
      ? Math.max(
          ...scoredHistory.map((session) =>
            Math.round(Number(session.overallScore)),
          ),
        )
      : 0;

  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const roleLabel = useCallback(
    (value: string): string =>
      t(`interview.roles.${value}`, {
        defaultValue:
          AVAILABLE_TARGET_ROLES.find((role) => role.value === value)?.label ??
          value.replace(/_/g, " "),
      }),
    [t],
  );
  const formatSessionDate = useCallback(
    (value: string): string => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime()))
        return t("interview.history.unknownDate");
      return new Intl.DateTimeFormat(dateLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    },
    [dateLocale, t],
  );

  const stopMedia = useCallback(() => {
    stopInterviewMedia(mediaStreamRef.current, videoRef.current);
    mediaStreamRef.current = null;
  }, []);

  const setSelectedVoice = useCallback((voice: InterviewVoice) => {
    setVoicePreference((current) => ({ ...current, voice }));
  }, []);

  const setSpeechSpeed = useCallback((speechSpeed: InterviewSpeechSpeed) => {
    setVoicePreference((current) => ({ ...current, speechSpeed }));
  }, []);

  const disconnectRealtime = useCallback(() => {
    candidateTurnBufferRef.current?.clear();
    candidateTurnBufferRef.current = null;
    assistantTranscriptByResponseRef.current.clear();
    firstAudioAtByResponseRef.current.clear();
    interruptedResponseIdsRef.current.clear();
    committedResponseIdsRef.current.clear();
    responseClientTurnIdRef.current.clear();
    candidateTurnsByIdRef.current.clear();
    candidateIntentByTurnRef.current.clear();
    captureRetryTurnIdsRef.current.clear();
    commitQueueRef.current = Promise.resolve();
    liveSessionRef.current?.destroy();
    liveSessionRef.current = null;
    setIsLiveConnected(false);
    dispatchRealtime({ type: "SET_TRACK_AVAILABLE", available: false });
  }, []);

  const setVoiceFallback = useCallback(
    (reason: string) => {
      disconnectRealtime();
      setIsVoiceFallback(true);
      setApiError(reason);
      dispatchRealtime({ type: "SWITCH_TO_TEXT" });
    },
    [disconnectRealtime],
  );
  const requestSessionMedia =
    useCallback(async (): Promise<MediaStream | null> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setWebcamError(t("interview.errors.mediaUnsupported"));
        return null;
      }

      const { stream, microphoneError, cameraError } =
        await acquireInterviewMedia(navigator.mediaDevices);

      if (!stream || microphoneError) {
        const name =
          microphoneError instanceof DOMException ? microphoneError.name : "";
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
        const name =
          cameraError instanceof DOMException ? cameraError.name : "";
        setWebcamError(
          name === "NotFoundError"
            ? t("interview.errors.mediaNotFound")
            : t("interview.errors.mediaDenied"),
        );
      } else {
        setWebcamError(null);
      }
      return stream;
    }, [stopMedia, t]);

  const commitRealtimeExchange = useCallback(
    (responseId: string, interrupted: boolean) => {
      if (committedResponseIdsRef.current.has(responseId)) return;
      const session = activeSessionRef.current;
      const clientTurnId = responseClientTurnIdRef.current.get(responseId);
      const candidateTurn = clientTurnId
        ? candidateTurnsByIdRef.current.get(clientTurnId)
        : undefined;
      const transcript = assistantTranscriptByResponseRef.current
        .get(responseId)
        ?.trim()
        .normalize("NFC");
      if (!session || !clientTurnId || !candidateTurn || !transcript) return;
      if (containsInterviewInternalMarker(transcript)) {
        setApiError(
          t("interview.errors.internalResponseBlocked", {
            defaultValue: "Phản hồi không an toàn đã bị chặn. Bạn có thể tiếp tục bằng văn bản.",
          }),
        );
        return;
      }

      committedResponseIdsRef.current.add(responseId);
      const intent = candidateIntentByTurnRef.current.get(clientTurnId) ?? "ANSWER";
      const captureRetry = captureRetryTurnIdsRef.current.has(clientTurnId);
      const firstAudioAt = firstAudioAtByResponseRef.current.get(responseId);
      const payload = {
        kind: "REALTIME_EXCHANGE" as const,
        clientTurnId,
        questionTurnId: currentTurnIdRef.current,
        input: {
          type: captureRetry
            ? ("CAPTURE_RETRY" as const)
            : intent === "ANSWER"
              ? ("ANSWER" as const)
              : ("CONTROL" as const),
          modality: candidateTurn.itemIds.length ? ("AUDIO" as const) : ("TEXT" as const),
          ...(captureRetry || !candidateTurn.transcript
            ? {}
            : { transcript: candidateTurn.transcript }),
          intent,
          intentSource: candidateTurn.itemIds.length
            ? ("VOICE_LEXICAL" as const)
            : ("BUTTON" as const),
          itemIds: candidateTurn.itemIds,
          speechStartedAt: new Date(candidateTurn.startedAtMs).toISOString(),
          speechEndedAt: new Date(candidateTurn.endedAtMs).toISOString(),
          segmentCount: Math.max(1, candidateTurn.transcriptSegments),
          ...(candidateTurn.meanLogprob === undefined
            ? {}
            : { meanLogprob: candidateTurn.meanLogprob }),
        },
        assistant: {
          responseId,
          transcript,
          ...(firstAudioAt ? { firstAudioAt } : {}),
          interrupted,
        },
      };

      commitQueueRef.current = commitQueueRef.current
        .then(async () => {
          const result = await submitRealtimeTurnMutation.mutateAsync({
            sessionId: session.id,
            payload,
          });
          currentTurnIdRef.current = result.currentTurnId;
          if (result.disposition !== "DUPLICATE" && result.assistant?.transcript) {
            lastAssistantTranscriptRef.current = result.assistant.transcript;
            setChatHistory((current) => [
              ...current,
              {
                id: `ai-${responseId}`,
                role: "ai",
                content: result.assistant!.transcript,
                timestamp: new Date(),
              },
            ]);
          }
          const question =
            result.assistant?.question ??
            extractSpokenQuestion(result.assistant?.transcript ?? "", currentQuestionRef.current);
          if (question) {
            currentQuestionRef.current = question;
            setCurrentQuestion(question);
          }
          if (result.finished) await finishInterviewRef.current("finished");
        })
        .catch((error: unknown) => {
          committedResponseIdsRef.current.delete(responseId);
          setApiError(getApiErrorMessage(error, t("interview.errors.turnFailed")));
        })
        .finally(() => {
          candidateTurnsByIdRef.current.delete(clientTurnId);
          candidateIntentByTurnRef.current.delete(clientTurnId);
          captureRetryTurnIdsRef.current.delete(clientTurnId);
          responseClientTurnIdRef.current.delete(responseId);
          assistantTranscriptByResponseRef.current.delete(responseId);
          firstAudioAtByResponseRef.current.delete(responseId);
          interruptedResponseIdsRef.current.delete(responseId);
        });
    },
    [submitRealtimeTurnMutation, t],
  );

  const handleCompletedCandidateTurn = useCallback(
    (turn: CandidateTurn) => {
      const session = activeSessionRef.current;
      const realtime = liveSessionRef.current;
      if (!session || !realtime || endingRef.current) return;
      const language = session.language === "en" ? "en" : "vi";
      const capture = assessCandidateCapture({
        transcript: turn.transcript,
        language,
        currentQuestion: currentQuestionRef.current,
        lastAssistantTranscript: lastAssistantTranscriptRef.current,
        meanLogprob: turn.meanLogprob,
      });
      candidateTurnsByIdRef.current.set(turn.clientTurnId, turn);
      dispatchRealtime({ type: "CANDIDATE_TURN_ENDED" });

      if (!capture.accepted) {
        captureFailureCountRef.current += 1;
        captureRetryTurnIdsRef.current.add(turn.clientTurnId);
        candidateIntentByTurnRef.current.set(turn.clientTurnId, "ANSWER");
        realtime.requestCaptureRetry(turn.clientTurnId, language, currentQuestionRef.current);
        if (captureFailureCountRef.current >= 2) {
          setApiError(
            t("interview.errors.captureRetryText", {
              defaultValue: "Mic chưa nhận rõ hai lần. Bạn có thể chuyển sang nhập văn bản trong cùng buổi phỏng vấn.",
            }),
          );
        }
        return;
      }

      captureFailureCountRef.current = 0;
      const intent = classifyIntent(turn.transcript);
      candidateIntentByTurnRef.current.set(turn.clientTurnId, intent);
      if (intent === "END") {
        candidateTurnsByIdRef.current.delete(turn.clientTurnId);
        candidateIntentByTurnRef.current.delete(turn.clientTurnId);
        setIsEndDialogOpen(true);
        dispatchRealtime({ type: "ASSISTANT_AUDIO_ENDED" });
        return;
      }
      if (intent === "ANSWER" || intent === "NO_ANSWER") {
        setChatHistory((current) => [
          ...current,
          {
            id: `candidate-${turn.clientTurnId}`,
            role: "user",
            content: turn.transcript,
            timestamp: new Date(),
          },
        ]);
      }
      if (intent === "ANSWER") realtime.requestCandidateResponse(turn);
      else {
        realtime.requestControl({
          clientTurnId: turn.clientTurnId,
          intent,
          language,
          currentQuestion: currentQuestionRef.current,
        });
      }
    },
    [t],
  );

  const connectRealtime = useCallback(
    async (clientSecret: string, stream: MediaStream) => {
      disconnectRealtime();
      const realtimeSession = new OpenAIRealtimeSession();
      liveSessionRef.current = realtimeSession;
      const language = activeSessionRef.current?.language === "en" ? "en" : "vi";
      candidateTurnBufferRef.current = new CandidateTurnBuffer(
        language === "vi" ? 1_100 : 700,
        handleCompletedCandidateTurn,
        400,
      );

      realtimeSession.on((event: RealtimeEvent) => {
        switch (event.type) {
          case "connected":
            setIsLiveConnected(true);
            setApiError(null);
            dispatchRealtime({ type: "CONNECTED" });
            dispatchRealtime({ type: "SET_TRACK_AVAILABLE", available: true });
            break;
          case "disconnected":
            setIsLiveConnected(false);
            if (!endingRef.current) dispatchRealtime({ type: "CONNECTION_LOST", attempt: 1 });
            break;
          case "transport_error":
            setApiError(event.data ?? t("interview.errors.realtimeVoiceFailed"));
            break;
          case "server_error":
            setApiError(event.data ?? t("interview.errors.realtimeVoiceFailed"));
            break;
          case "response_slow":
            setApiError(
              t("interview.errors.slowResponse", {
                defaultValue: "Alex đang phản hồi chậm hơn bình thường…",
              }),
            );
            break;
          case "speech_started": {
            const itemId = event.itemId ?? `speech-${crypto.randomUUID()}`;
            candidateTurnBufferRef.current?.speechStarted(itemId, Date.now());
            if (firstSpeechDelayMsRef.current === null && micOpenedAtRef.current !== null) {
              firstSpeechDelayMsRef.current = Math.max(0, Date.now() - micOpenedAtRef.current);
            }
            break;
          }
          case "user_transcript":
            if (event.data) {
              candidateTurnBufferRef.current?.addTranscript(
                event.data,
                event.itemId ?? `transcript-${crypto.randomUUID()}`,
                event.transcriptLogprobs,
              );
            }
            break;
          case "speech_stopped":
            candidateTurnBufferRef.current?.speechStopped(
              event.itemId ?? `speech-${crypto.randomUUID()}`,
              Date.now(),
            );
            break;
          case "response_created":
            if (event.responseId && event.clientTurnId) {
              responseClientTurnIdRef.current.set(event.responseId, event.clientTurnId);
            }
            break;
          case "ai_speaking":
            if (event.responseId) {
              firstAudioAtByResponseRef.current.set(event.responseId, new Date().toISOString());
            }
            setApiError(null);
            dispatchRealtime({ type: "ASSISTANT_AUDIO_STARTED" });
            break;
          case "ai_transcript":
            if (event.responseId && event.data) {
              const current = assistantTranscriptByResponseRef.current.get(event.responseId) ?? "";
              assistantTranscriptByResponseRef.current.set(event.responseId, current + event.data);
              dispatchRealtime({ type: "ASSISTANT_SUBTITLE", subtitle: event.data });
            }
            break;
          case "ai_transcript_done":
            if (event.responseId && event.data) {
              assistantTranscriptByResponseRef.current.set(
                event.responseId,
                event.data.trim().normalize("NFC"),
              );
            }
            break;
          case "ai_interrupted":
            if (event.responseId) {
              interruptedResponseIdsRef.current.add(event.responseId);
              commitRealtimeExchange(event.responseId, true);
            }
            dispatchRealtime({ type: "CANDIDATE_INTERRUPTED" });
            break;
          case "ai_stopped":
            if (event.responseId && event.purpose !== "opening" && event.purpose !== "closing") {
              commitRealtimeExchange(event.responseId, false);
            }
            dispatchRealtime({ type: "ASSISTANT_AUDIO_ENDED" });
            realtimeSession.setMicEnabled(!userMutedRef.current);
            micOpenedAtRef.current = Date.now();
            break;
          case "transcript_failed":
            setApiError(
              t("interview.errors.transcriptionFailed", {
                defaultValue: "Chưa nhận rõ giọng nói. Bạn hãy thử lại hoặc chuyển sang nhập văn bản.",
              }),
            );
            break;
          case "response_done":
            if (
              event.responseStatus === "failed" ||
              event.responseStatus === "incomplete"
            ) {
              setApiError(t("interview.errors.realtimeVoiceFailed"));
            }
            break;
        }
      });

      await realtimeSession.connect({
        clientSecret,
        stream,
        initialMicEnabled: !userMutedRef.current,
      });
      realtimeSession.setMicEnabled(!userMutedRef.current);
      micOpenedAtRef.current = Date.now();
    },
    [commitRealtimeExchange, disconnectRealtime, handleCompletedCandidateTurn, t],
  );
  const resetInterviewState = useCallback(() => {
    disconnectRealtime();
    stopMedia();
    activeSessionRef.current = null;
    currentQuestionRef.current = "";
    currentInterviewerMessageRef.current = "";
    setActiveSession(null);
    setResultDetail(null);
    setSelectedHistorySessionId(null);
    setChatHistory([]);
    setCurrentQuestion("");
    setUserAnswer("");
    setApiError(null);
    setWebcamError(null);
    setSecondsRemaining(0);
    setIsVoiceFallback(false);
    setIsLoading(false);
    setIsEnding(false);
    setIsEndDialogOpen(false);
    endingRef.current = false;
    autoEndRef.current = false;
    liveClosingRequestedRef.current = false;
    committedResponseIdsRef.current.clear();
    currentTurnIdRef.current = null;
    lastAssistantTranscriptRef.current = "";
    captureFailureCountRef.current = 0;
    userMutedRef.current = false;
    dispatchRealtime({ type: "SET_USER_MUTED", muted: false });
    questionStartedAtRef.current = null;
    firstSpeechDelayMsRef.current = null;
    dispatchRealtime({ type: "CONNECTING" });
  }, [disconnectRealtime, stopMedia]);

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
        const match =
          await createCvMatchForInterviewMutation.mutateAsync(input);
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
          interviewType,
          voice: voicePreference.voice,
          speechSpeed: voicePreference.speechSpeed,
        }),
        experienceMode,
      });

      const initialMessages = buildInterviewInitialMessages(
        started.firstMessage,
        started.firstQuestion,
      ).map((content) => ({
        role: "ai" as const,
        content,
        timestamp: new Date(),
      }));

      activeSessionRef.current = started;
      currentQuestionRef.current = started.firstQuestion;
      currentInterviewerMessageRef.current = started.firstMessage ?? "";
      setActiveSession(started);
      setCurrentQuestion(started.firstQuestion);
      setSecondsRemaining(
        secondsRemainingFromExpiry(started.expiresAt) ||
          started.maxDurationSeconds,
      );
      setChatHistory(initialMessages);
      setPhase("interviewing");
      setSidebarOpen(false);
      posthog?.capture("interview_started", {
        mode: "realtime",
        experience_mode: experienceMode,
        type: interviewType,
        target_role: targetRole,
      });
      questionStartedAtRef.current = null;

      const stream = await requestSessionMedia();
      if (!stream || stream.getAudioTracks().length === 0) {
        setVoiceFallback(
          t("interview.errors.microphoneUnavailableSameSession"),
        );
        return;
      }

      const tokenFallbackReason = getRealtimeTokenFallbackReason({
        realtimeEnabled: started.realtime.enabled,
        clientSecret: started.realtime.clientSecret,
        reason: started.realtime.reason,
        fallbackMessage: t("interview.errors.realtimeTokenUnavailable"),
      });
      if (tokenFallbackReason) {
        setVoiceFallback(tokenFallbackReason);
        return;
      }

      try {
        if (started.realtime.protocolVersion !== INTERVIEW_REALTIME_PROTOCOL_VERSION) {
          throw new Error(
            `Realtime protocol mismatch: expected ${INTERVIEW_REALTIME_PROTOCOL_VERSION}, received ${started.realtime.protocolVersion}. Restart both dev servers.`,
          );
        }
        currentTurnIdRef.current = started.currentTurnId;
        await connectRealtime(started.realtime.clientSecret!, stream);
        liveSessionRef.current?.requestOpening(
          interviewerTurnText(started.firstMessage, started.firstQuestion),
          selectedLanguage,
        );
      } catch (error) {
        setVoiceFallback(
          getApiErrorMessage(error, t("interview.errors.realtimeVoiceFailed")),
        );
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
      setPhase("results");
      setSidebarOpen(true);
      posthog?.capture("interview_completed", {
        session_id: detail.id,
        score: detail.overallScore,
      });
    },
    [posthog, resetInterviewState, t, toast],
  );

  const finishInterview = useCallback(
    async (_reason: EndReason = "manual") => {
      const sessionId = activeSession?.id;
      if (!sessionId || endingRef.current) return;

      endingRef.current = true;
      setIsEnding(true);
      setIsLoading(false);
      setApiError(null);
      disconnectRealtime();
      stopMedia();
      const waitForAnalysis = async (
        initial?: InterviewDetailResponseDto,
      ): Promise<InterviewDetailResponseDto | null> => {
        let detail = initial;
        for (let attempt = 0; attempt < 45; attempt += 1) {
          if (detail) {
            const settled =
              detail.analysisStatus === "READY" ||
              detail.analysisStatus === "NOT_REQUIRED" ||
              detail.status === "COMPLETED" ||
              detail.status === "CANCELLED";
            if (settled) return detail;
            if (detail.analysisStatus === "FAILED") {
              throw new Error("Interview analysis failed.");
            }
          }
          if (attempt === 44) break;
          await new Promise<void>((resolve) => window.setTimeout(resolve, 2_000));
          try {
            detail = await getInterviewDetail(sessionId);
          } catch {
            detail = undefined;
          }
        }
        return null;
      };



      try {
        const received = await endInterviewMutation.mutateAsync({ sessionId });
        markExitEndHandled();
        const detail = await waitForAnalysis(received);
        if (!detail) throw new Error("Interview analysis timed out.");
        applyEndedInterview(detail);
      } catch (error) {
        try {
          const detail = await waitForAnalysis();
          if (detail) {
            markExitEndHandled();
            applyEndedInterview(detail);
            return;
          }
        } catch (pollError) {
          setApiError(getApiErrorMessage(pollError, t("interview.errors.endFailed")));
          return;
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
      t,
    ],
  );

  finishInterviewRef.current = finishInterview;

  const handleSubmitAnswer = async () => {
    const answer = userAnswer.trim();
    const session = activeSessionRef.current;
    if (!answer || !session?.id || isLoading || isEnding) return;
    const clientTurnId = `text-${crypto.randomUUID()}`;
    setChatHistory((current) => [
      ...current,
      { id: `candidate-${clientTurnId}`, role: "user", content: answer, timestamp: new Date() },
    ]);
    setUserAnswer("");
    setIsLoading(true);
    try {
      const result = await submitRealtimeTurnMutation.mutateAsync({
        sessionId: session.id,
        payload: {
          kind: "TEXT_FALLBACK",
          clientTurnId,
          questionTurnId: currentTurnIdRef.current,
          text: answer,
          intent: classifyIntent(answer),
        },
      });
      currentTurnIdRef.current = result.currentTurnId;
      if (result.assistant?.transcript && result.disposition !== "DUPLICATE") {
        lastAssistantTranscriptRef.current = result.assistant.transcript;
        setChatHistory((current) => [
          ...current,
          { id: `ai-${clientTurnId}`, role: "ai", content: result.assistant!.transcript, timestamp: new Date() },
        ]);
      }
      const question = result.assistant?.question;
      if (question) {
        currentQuestionRef.current = question;
        setCurrentQuestion(question);
      }
      if (result.finished) await finishInterviewRef.current("finished");
    } catch (error) {
      setApiError(getApiErrorMessage(error, t("interview.errors.turnFailed")));
    } finally {
      setIsLoading(false);
    }
  };

  const reconnectRealtime = useCallback(async (): Promise<boolean> => {
    if (!activeSession?.id || !canUseApi) return false;

    setIsLoading(true);
    try {
      let stream = mediaStreamRef.current;
      if (!stream || stream.getAudioTracks().length === 0) {
        stream = await requestSessionMedia();
      }
      if (!stream || stream.getAudioTracks().length === 0) return false;

      const realtime = await refreshRealtimeTokenMutation.mutateAsync(
        activeSession.id,
      );
      if (!realtime.enabled || !realtime.clientSecret) return false;
      if (realtime.protocolVersion !== INTERVIEW_REALTIME_PROTOCOL_VERSION) {
        throw new Error(
          `Realtime protocol mismatch: expected ${INTERVIEW_REALTIME_PROTOCOL_VERSION}, received ${realtime.protocolVersion}. Restart both dev servers.`,
        );
      }

      await connectRealtime(realtime.clientSecret, stream);
      return true;
    } catch (error) {
      setApiError(
        getApiErrorMessage(error, t('interview.errors.realtimeVoiceFailed')),
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [
    activeSession?.id,
    canUseApi,
    connectRealtime,
    refreshRealtimeTokenMutation,
    requestSessionMedia,
    t,
  ]);

  const handleRealtimeIntent = (intent: RealtimeCandidateIntent) => {
    if (intent === "END") {
      setIsEndDialogOpen(true);
      return;
    }
    if (intent === "ANSWER") return;
    const session = activeSessionRef.current;
    if (!session || isLoading || isEnding) return;
    if (isVoiceFallback || !liveSessionRef.current?.isConnected) {
      const text = controlText(intent, selectedLanguage);
      setUserAnswer(text);
      return;
    }
    const clientTurnId = `control-${crypto.randomUUID()}`;
    const now = Date.now();
    candidateTurnsByIdRef.current.set(clientTurnId, {
      clientTurnId,
      transcript: "",
      itemIds: [],
      startedAtMs: now,
      endedAtMs: now,
      durationSeconds: 0,
      transcriptSegments: 0,
    });
    candidateIntentByTurnRef.current.set(clientTurnId, intent);
    dispatchRealtime({ type: "CANDIDATE_TURN_ENDED" });
    liveSessionRef.current.requestControl({
      clientTurnId,
      intent,
      language: selectedLanguage,
      currentQuestion: currentQuestionRef.current,
    });
  };
  useEffect(() => {
    if (realtimeState.transport.status !== "RECONNECTING") return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setVoiceFallback(
        t("interview.errors.reconnectFailed", {
          defaultValue:
            "Could not restore voice within 8 seconds. Continuing in text mode.",
        }),
      );
    }, 8_000);

    void (async () => {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        dispatchRealtime({ type: "CONNECTION_LOST", attempt });
        const connected = await reconnectRealtime();
        if (cancelled) {
          if (connected) disconnectRealtime();
          return;
        }
        if (connected) {
          window.clearTimeout(timeout);
          return;
        }
      }
      if (!cancelled) {
        window.clearTimeout(timeout);
        setVoiceFallback(
          t("interview.errors.reconnectFailed", {
            defaultValue: "Could not restore voice. Continuing in text mode.",
          }),
        );
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    disconnectRealtime,
    realtimeState.transport.status,
    reconnectRealtime,
    setVoiceFallback,
    t,
  ]);

  const toggleLiveMic = async () => {
    if (isLoading) return;

    if (!liveSessionRef.current?.isConnected) {
      const reconnected = await reconnectRealtime();
      if (!reconnected || !liveSessionRef.current?.isConnected) return;
    }

    const muted = !userMutedRef.current;
    userMutedRef.current = muted;
    dispatchRealtime({ type: "SET_USER_MUTED", muted });
    liveSessionRef.current?.setMicEnabled(!muted);
  };
  useEffect(() => {
    if (phase !== "interviewing" || !activeSession?.expiresAt) return;

    const tick = () => {
      const remaining = secondsRemainingFromExpiry(activeSession.expiresAt);
      setSecondsRemaining(remaining);
      if (
        shouldRequestLiveClosingSignal({
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
    isLiveConnected,
    isVoiceFallback,
    phase,
    selectedLanguage,
  ]);

  useEffect(() => {
    writeInterviewVoicePreference(
      typeof window === "undefined" ? null : window.localStorage,
      voicePreference,
    );
  }, [voicePreference]);

  useEffect(() => {
    if (
      phase !== "interviewing" ||
      !videoRef.current ||
      !mediaStreamRef.current
    )
      return;
    if (videoRef.current.srcObject !== mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      void videoRef.current.play();
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      disconnectRealtime();
      stopMedia();
    };
  }, [disconnectRealtime, stopMedia]);

  return (
    <Layout>
      <div
        className={cn(
          "flex overflow-hidden",
          sidebarMode ? "h-dvh" : "h-[calc(100dvh-80px)]",
        )}
      >
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
            <p className="mt-0.5 text-[11px] text-slate-400">
              {t("interview.title")}
            </p>
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
                      isActive &&
                        "border border-primary/20 bg-primary/10 font-bold text-primary",
                      isCompleted && "text-slate-600 hover:bg-slate-50",
                      !isActive &&
                        !isCompleted &&
                        "cursor-default text-slate-400",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        isActive && "bg-primary text-white",
                        isCompleted && "bg-emerald-50 text-emerald-500",
                        !isActive &&
                          !isCompleted &&
                          "bg-slate-100 text-slate-300",
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="truncate text-xs font-semibold">
                      {t(`interview.steps.${step.id}`, {
                        defaultValue: step.label,
                      })}
                    </span>
                    {isCompleted && (
                      <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 p-4">
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {t("interview.stats.yourStats")}
              </h4>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <StatCard
                  label={t("interview.stats.total")}
                  value={String(interviewHistory.length)}
                  icon={Video}
                />
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
                <StatCard
                  label={t("interview.stats.completed")}
                  value={String(scoredHistory.length)}
                  icon={TrendingUp}
                />
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
                    <p className="text-[11px] text-rose-500">
                      {t("interview.sidebar.historyError")}
                    </p>
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
                          !canSelectHistory &&
                            "cursor-not-allowed opacity-60 hover:bg-slate-50",
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
                            {session.overallScore == null
                              ? "N/A"
                              : `${Math.round(session.overallScore)}%`}
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
          title={
            sidebarOpen
              ? t("interview.sidebar.hide")
              : t("interview.sidebar.show")
          }
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
              {canUseApi &&
              (interviewQuota || purchasedInterviewCredits > 0) ? (
                <div className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-end gap-2 text-xs font-bold text-slate-600">
                  {interviewQuota ? (
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 tabular-nums shadow-sm">
                      {interviewQuota.unlimited
                        ? t("interview.setup.quotaUnlimited")
                        : t("interview.setup.monthlyQuota", {
                            remaining: interviewQuota.remaining ?? 0,
                            limit: interviewQuota.limit,
                          })}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 tabular-nums text-sky-700">
                    {t("interview.setup.purchasedCredits", {
                      count: purchasedInterviewCredits,
                    })}
                  </span>
                </div>
              ) : null}
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
                experienceMode={experienceMode}
                setExperienceMode={setExperienceMode}
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
            isConnected={isLiveConnected && !isVoiceFallback}
            isVietnamese={selectedLanguage === "vi"}
            voiceState={
              realtimeState.turn.status === "SPEAKING"
                ? "SPEAKING"
                : realtimeState.turn.status === "THINKING"
                  ? "THINKING"
                  : "LISTENING"
            }
            voiceLabel={
              realtimeState.turn.status === "SPEAKING"
                ? t("interview.session.voiceState.speaking")
                : realtimeState.turn.status === "THINKING"
                  ? t("interview.session.voiceState.thinking")
                  : t("interview.session.voiceState.listening")
            }
            subtitle={
              realtimeState.turn.status === "SPEAKING"
                ? realtimeState.turn.subtitle
                : undefined
            }
            currentQuestion={currentQuestion}
            chatHistory={chatHistory}
            experienceMode={activeSession?.experienceMode ?? experienceMode}
            isMicActive={isMicActive}
            isReconnecting={realtimeState.transport.status === "RECONNECTING"}
            isEnding={isEnding}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            onSubmitText={handleSubmitAnswer}
            onToggleMic={toggleLiveMic}
            onSwitchToText={() => dispatchRealtime({ type: "SWITCH_TO_TEXT" })}
            onIntent={handleRealtimeIntent}
            onEnd={() => setIsEndDialogOpen(true)}
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-slate-400" />
      <p className="text-sm font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-semibold text-slate-400">{label}</p>
    </div>
  );
}
