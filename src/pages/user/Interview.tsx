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
  type RealtimeTurnDirectiveDto,
  type RealtimeAnswerSignal,
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
  useCommitRealtimeAssistantMessage,
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
  speakOfficialRealtimeQuestion,
  takeRecentInterviewSessions,
  writeInterviewVoicePreference,
  type InterviewVoicePreference,
} from "@/components/interview/interview-view-model";
import {
  OpenAIRealtimeSession,
  RealtimeResponseWatchdog,
  type RealtimeContinuationDirective,
  type RealtimeEvent,
} from "@/lib/openai-realtime";
import {
  acquireInterviewMedia,
  stopInterviewMedia,
} from "@/lib/interview-media";
import {
  interviewSessionReducer,
  initialInterviewSessionState,
} from "@/components/interview/interview-session-machine";
import {
  parseRealtimeTurnClassification,
  type RealtimeTurnClassification,
} from "@/components/interview/interview-turn-classification";

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

function classifyAnswerSignal(
  transcript: string,
  intent: RealtimeCandidateIntent,
): RealtimeAnswerSignal {
  if (intent === "NO_ANSWER") return "NO_ANSWER";
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  if (intent === "ANSWER" && words.length < 8) return "PARTIAL";
  return "COMPLETE";
}

function extractSpokenQuestion(transcript: string, fallback: string): string {
  const normalized = transcript.trim().normalize("NFC");
  if (!normalized) return fallback;
  const sentences = normalized.match(/[^.!?]*\?/g);
  return sentences?.at(-1)?.trim() || fallback || normalized;
}

function safeInterviewFallback(
  value: string,
  language: "vi" | "en",
  currentQuestion: string,
): string {
  const normalized = value.trim().normalize("NFC");
  if (normalized && !containsInterviewInternalMarker(normalized))
    return normalized;
  const current = currentQuestion.trim().normalize("NFC");
  if (current && !containsInterviewInternalMarker(current)) return current;
  return language === "vi"
    ? "Bạn có thể chia sẻ một ví dụ cụ thể về phần việc bạn trực tiếp thực hiện không?"
    : "Could you share a specific example of the work you personally completed?";
}

function toRealtimeContinuation(
  directive: RealtimeTurnDirectiveDto,
  language: "vi" | "en",
): RealtimeContinuationDirective {
  return {
    directiveId: directive.directiveId,
    action: directive.action,
    fallbackQuestion: safeInterviewFallback(
      directive.fallbackQuestion,
      language,
      "",
    ),
    language,
  };
}
function intentPrompt(
  intent: RealtimeCandidateIntent,
  language: "vi" | "en",
): string {
  const prompts: Record<RealtimeCandidateIntent, [string, string]> = {
    ANSWER: ["Đây là câu trả lời của tôi.", "This is my answer."],
    NO_ANSWER: ["Tôi không biết câu này.", "I do not know this one."],
    REPEAT: ["Hãy nhắc lại câu hỏi.", "Please repeat the question."],
    CLARIFY: ["Hãy làm rõ câu hỏi.", "Please clarify the question."],
    EASIER: ["Cho tôi một câu dễ hơn.", "Please ask an easier question."],
    HINT: ["Cho tôi một gợi ý.", "Please give me a hint."],
    FEEDBACK: ["Cho tôi nhận xét nhanh.", "Please give me quick feedback."],
    SKIP: ["Bỏ qua và đổi chủ đề.", "Skip this and change topic."],
    END: ["Kết thúc phỏng vấn.", "End the interview."],
  };
  return prompts[intent][language === "vi" ? 0 : 1];
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
  const candidateTranscriptRef = useRef("");
  const directivesByIdRef = useRef(new Map<string, RealtimeTurnDirectiveDto>());
  const directiveIdByResponseRef = useRef(new Map<string, string>());
  const assistantTranscriptByResponseRef = useRef(new Map<string, string>());
  const firstAudioAtByResponseRef = useRef(new Map<string, string>());
  const interruptedResponseIdsRef = useRef(new Set<string>());
  const committingResponseIdsRef = useRef(new Set<string>());
  const activeResponseIdRef = useRef<string | null>(null);
  const resolvingToolCallRef = useRef(false);
  const responseWatchdogRef = useRef(new RealtimeResponseWatchdog(4_000));
  const committedDirectiveIdsRef = useRef(new Set<string>());
  const activeResponseByDirectiveRef = useRef(new Map<string, string>());
  const userMutedRef = useRef(false);
  const bargeInArmedRef = useRef(false);
  const bargeInArmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const commitRealtimeAssistantMutation = useCommitRealtimeAssistantMessage();
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
    responseWatchdogRef.current.clearAll();
    directivesByIdRef.current.clear();
    directiveIdByResponseRef.current.clear();
    activeResponseByDirectiveRef.current.clear();
    assistantTranscriptByResponseRef.current.clear();
    firstAudioAtByResponseRef.current.clear();
    interruptedResponseIdsRef.current.clear();
    committingResponseIdsRef.current.clear();
    activeResponseIdRef.current = null;
    resolvingToolCallRef.current = false;
    bargeInArmedRef.current = false;
    if (bargeInArmTimerRef.current !== null) {
      clearTimeout(bargeInArmTimerRef.current);
      bargeInArmTimerRef.current = null;
    }
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

  const commitDirectiveAsText = useCallback(
    async (
      directive: RealtimeTurnDirectiveDto,
      switchToText = true,
      responseId = `text-${crypto.randomUUID()}`,
      interrupted = false,
    ) => {
      const session = activeSessionRef.current;
      if (
        !session ||
        committedDirectiveIdsRef.current.has(directive.directiveId)
      ) {
        return;
      }
      committedDirectiveIdsRef.current.add(directive.directiveId);
      const fallbackQuestion = safeInterviewFallback(
        directive.fallbackQuestion,
        session.language === "en" ? "en" : "vi",
        currentQuestionRef.current,
      );
      responseWatchdogRef.current.clear(directive.directiveId);
      directivesByIdRef.current.delete(directive.directiveId);
      currentQuestionRef.current = fallbackQuestion;
      currentInterviewerMessageRef.current = "";
      setCurrentQuestion(fallbackQuestion);
      setChatHistory((current) => [
        ...current,
        {
          id: `ai-text-${crypto.randomUUID()}`,
          role: "ai",
          content: fallbackQuestion,
          timestamp: new Date(),
        },
      ]);
      try {
        await commitRealtimeAssistantMutation.mutateAsync({
          sessionId: session.id,
          directiveId: directive.directiveId,
          payload: {
            responseId,
            interviewerQuestion: fallbackQuestion,
            interrupted,
          },
        });
        if (directive.finished) await finishInterviewRef.current("finished");
      } catch (error) {
        setApiError(
          getApiErrorMessage(error, t("interview.errors.submitFailed")),
        );
      } finally {
        resolvingToolCallRef.current = false;
        setIsLoading(false);
        if (switchToText) dispatchRealtime({ type: "SWITCH_TO_TEXT" });
      }
    },
    [commitRealtimeAssistantMutation, t],
  );
  const commitAssistantTranscript = useCallback(
    async (event: RealtimeEvent) => {
      const session = activeSessionRef.current;
      const responseId = event.responseId;
      if (
        !session ||
        !responseId ||
        committingResponseIdsRef.current.has(responseId)
      )
        return;
      const directiveId = directiveIdByResponseRef.current.get(responseId);
      const directive = directiveId
        ? directivesByIdRef.current.get(directiveId)
        : undefined;
      const transcript = (
        event.data ||
        assistantTranscriptByResponseRef.current.get(responseId) ||
        ""
      )
        .trim()
        .normalize("NFC");
      if (
        !directive ||
        !transcript ||
        committedDirectiveIdsRef.current.has(directive.directiveId)
      ) {
        return;
      }
      if (containsInterviewInternalMarker(transcript)) {
        committingResponseIdsRef.current.add(responseId);
        liveSessionRef.current?.cancelResponse();
        responseWatchdogRef.current.clear(directive.directiveId);
        directiveIdByResponseRef.current.delete(responseId);
        assistantTranscriptByResponseRef.current.delete(responseId);
        setVoiceFallback(
          t("interview.errors.internalResponseBlocked", {
            defaultValue:
              "The voice response was blocked and moved to text safely.",
          }),
        );
        await commitDirectiveAsText(directive);
        committingResponseIdsRef.current.delete(responseId);
        return;
      }

      committedDirectiveIdsRef.current.add(directive.directiveId);
      committingResponseIdsRef.current.add(responseId);
      const question = extractSpokenQuestion(
        transcript,
        safeInterviewFallback(
          directive.fallbackQuestion,
          session.language === "en" ? "en" : "vi",
          currentQuestionRef.current,
        ),
      );
      const firstAudioAt = firstAudioAtByResponseRef.current.get(responseId);
      const interrupted = interruptedResponseIdsRef.current.has(responseId);
      currentQuestionRef.current = question;
      currentInterviewerMessageRef.current =
        transcript === question ? "" : transcript;
      setCurrentQuestion(question);
      setChatHistory((current) => [
        ...current,
        {
          id: `ai-${responseId}`,
          role: "ai",
          content: transcript,
          timestamp: new Date(),
        },
      ]);
      try {
        await commitRealtimeAssistantMutation.mutateAsync({
          sessionId: session.id,
          directiveId: directive.directiveId,
          payload: {
            responseId,
            interviewerMessage:
              transcript === question ? undefined : transcript,
            interviewerQuestion: question,
            firstAudioAt,
            interrupted,
          },
        });
        if (directive.finished) await finishInterviewRef.current("finished");
      } catch (error) {
        setApiError(
          getApiErrorMessage(error, t("interview.errors.submitFailed")),
        );
      } finally {
        responseWatchdogRef.current.clear(directive.directiveId);
        directivesByIdRef.current.delete(directive.directiveId);
        activeResponseByDirectiveRef.current.delete(directive.directiveId);
        directiveIdByResponseRef.current.delete(responseId);
        assistantTranscriptByResponseRef.current.delete(responseId);
        firstAudioAtByResponseRef.current.delete(responseId);
        interruptedResponseIdsRef.current.delete(responseId);
        committingResponseIdsRef.current.delete(responseId);
        if (activeResponseIdRef.current === responseId)
          activeResponseIdRef.current = null;
        resolvingToolCallRef.current = false;
        setIsLoading(false);
      }
    },
    [
      commitDirectiveAsText,
      commitRealtimeAssistantMutation,
      setVoiceFallback,
      t,
    ],
  );

  const resolveRealtimeTurn = useCallback(
    async (
      clientTurnId: string,
      transcript: string,
      modality: "TEXT" | "AUDIO",
      classification?: RealtimeTurnClassification | null,
    ) => {
      const session = activeSessionRef.current;
      const normalized = transcript.trim().normalize("NFC");
      const isToolCall = clientTurnId.startsWith("call_");
      if (
        !session ||
        !normalized ||
        (isToolCall && resolvingToolCallRef.current)
      )
        return;
      if (isToolCall) {
        resolvingToolCallRef.current = true;
        liveSessionRef.current?.setMicEnabled(false);
      }
      const intent = classification?.intent ?? classifyIntent(normalized);
      dispatchRealtime({ type: "CANDIDATE_TURN_ENDED" });
      setIsLoading(true);
      setApiError(null);
      let awaitingAudio = false;
      try {
        const directive = await submitRealtimeTurnMutation.mutateAsync({
          sessionId: session.id,
          payload: {
            clientTurnId,
            transcript: normalized,
            modality,
            intent,
            answerSignal:
              classification?.answerSignal ??
              classifyAnswerSignal(normalized, intent),
            speechEndedAt: new Date().toISOString(),
            responseDelayMs: firstSpeechDelayMsRef.current ?? undefined,
          },
        });
        directivesByIdRef.current.set(directive.directiveId, directive);
        if (isToolCall && liveSessionRef.current?.isConnected) {
          const continuation = toRealtimeContinuation(
            directive,
            session.language === "en" ? "en" : "vi",
          );
          liveSessionRef.current.submitToolOutput(clientTurnId, continuation);
          responseWatchdogRef.current.start(directive.directiveId, {
            slow: () => {
              setApiError(
                t("interview.errors.realtimeResponseSlow", {
                  defaultValue: "Alex is taking a little longer to respond?",
                }),
              );
            },
            retry: () => {
              liveSessionRef.current?.retryDirectiveResponse(continuation);
            },
            fallback: () => {
              liveSessionRef.current?.cancelResponse();
              setVoiceFallback(
                t("interview.errors.firstAudioTimeout", {
                  defaultValue:
                    "Voice did not respond in time. Continuing in text mode.",
                }),
              );
              void commitDirectiveAsText(directive);
            },
          });
          awaitingAudio = true;
          return;
        }

        await commitDirectiveAsText(directive);
      } catch (error) {
        setApiError(
          getApiErrorMessage(error, t("interview.errors.submitFailed")),
        );
        if (liveSessionRef.current?.isConnected) {
          liveSessionRef.current.setMicEnabled(!userMutedRef.current);
        }
      } finally {
        if (!awaitingAudio) {
          resolvingToolCallRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [commitDirectiveAsText, setVoiceFallback, submitRealtimeTurnMutation, t],
  );
  const connectRealtime = useCallback(
    async (clientSecret: string, stream: MediaStream) => {
      if (stream.getAudioTracks().length === 0) {
        throw new Error(t("interview.errors.noMicrophoneTrack"));
      }

      disconnectRealtime();
      const realtimeSession = new OpenAIRealtimeSession();
      liveSessionRef.current = realtimeSession;

      realtimeSession.on((event: RealtimeEvent) => {
        switch (event.type) {
          case "connected":
            setIsLiveConnected(true);
            setIsVoiceFallback(false);
            setApiError(null);
            realtimeSession.setMicEnabled(!userMutedRef.current);
            micOpenedAtRef.current = Date.now();
            dispatchRealtime({
              type: "SET_TRACK_AVAILABLE",
              available: true,
            });
            dispatchRealtime({ type: "CONNECTED" });
            break;
          case "disconnected":
            setIsLiveConnected(false);
            dispatchRealtime({
              type: "SET_TRACK_AVAILABLE",
              available: false,
            });
            if (!endingRef.current) {
              dispatchRealtime({ type: "CONNECTION_LOST", attempt: 1 });
            }
            break;
          case "speech_started": {
            if (micOpenedAtRef.current !== null) {
              firstSpeechDelayMsRef.current = Math.max(
                0,
                Date.now() - micOpenedAtRef.current,
              );
            }
            const responseId = activeResponseIdRef.current;
            if (
              responseId &&
              bargeInArmedRef.current &&
              firstAudioAtByResponseRef.current.has(responseId)
            ) {
              bargeInArmedRef.current = false;
              interruptedResponseIdsRef.current.add(responseId);
              realtimeSession.cancelResponse();
              dispatchRealtime({ type: "CANDIDATE_INTERRUPTED" });
            }
            break;
          }
          case "speech_stopped":
            dispatchRealtime({ type: "CANDIDATE_TURN_ENDED" });
            break;
          case "user_transcript": {
            const transcript = event.data?.trim();
            if (!transcript || resolvingToolCallRef.current) break;
            candidateTranscriptRef.current = transcript;
            setChatHistory((current) => [
              ...current,
              {
                id: "candidate-" + Date.now(),
                role: "user",
                content: transcript,
                timestamp: new Date(),
              },
            ]);
            break;
          }
          case "tool_call":
            if (
              event.toolCall?.name === "decide_interview_turn" &&
              !resolvingToolCallRef.current
            ) {
              const classification = parseRealtimeTurnClassification(
                event.toolCall.arguments,
              );
              const transcript =
                candidateTranscriptRef.current ||
                classification?.transcript ||
                "";
              candidateTranscriptRef.current = "";
              if (transcript) {
                void resolveRealtimeTurn(
                  event.toolCall.callId,
                  transcript,
                  "AUDIO",
                  classification,
                );
              }
            }
            break;
          case "response_created":
            if (event.responseId && event.directiveId) {
              const previousResponse = activeResponseByDirectiveRef.current.get(
                event.directiveId,
              );
              if (previousResponse && previousResponse !== event.responseId) {
                break;
              }
              activeResponseByDirectiveRef.current.set(
                event.directiveId,
                event.responseId,
              );
              directiveIdByResponseRef.current.set(
                event.responseId,
                event.directiveId,
              );
              assistantTranscriptByResponseRef.current.set(
                event.responseId,
                "",
              );
              responseWatchdogRef.current.markResponseCreated(
                event.directiveId,
              );
            }
            break;
          case "ai_speaking": {
            const responseId = event.responseId;
            const directiveId = responseId
              ? directiveIdByResponseRef.current.get(responseId)
              : undefined;
            if (responseId) {
              activeResponseIdRef.current = responseId;
              firstAudioAtByResponseRef.current.set(
                responseId,
                firstAudioAtByResponseRef.current.get(responseId) ??
                  new Date().toISOString(),
              );
            }
            if (directiveId) {
              responseWatchdogRef.current.markAudioStarted(directiveId);
            }
            resolvingToolCallRef.current = false;
            setIsLoading(false);
            setApiError(null);
            realtimeSession.setMicEnabled(!userMutedRef.current);
            bargeInArmedRef.current = false;
            if (bargeInArmTimerRef.current !== null) {
              clearTimeout(bargeInArmTimerRef.current);
            }
            bargeInArmTimerRef.current = setTimeout(() => {
              bargeInArmedRef.current = true;
              bargeInArmTimerRef.current = null;
            }, 350);
            dispatchRealtime({
              type: "ASSISTANT_AUDIO_STARTED",
              subtitle: responseId
                ? (assistantTranscriptByResponseRef.current.get(responseId) ??
                  "")
                : "",
            });
            break;
          }
          case "ai_stopped": {
            if (bargeInArmTimerRef.current !== null) {
              clearTimeout(bargeInArmTimerRef.current);
              bargeInArmTimerRef.current = null;
            }
            bargeInArmedRef.current = false;
            const responseId = event.responseId;
            if (responseId) {
              const transcript =
                assistantTranscriptByResponseRef.current
                  .get(responseId)
                  ?.trim() ?? "";
              if (transcript) {
                void commitAssistantTranscript({
                  ...event,
                  type: "ai_transcript_done",
                  data: transcript,
                });
              } else {
                const directiveId =
                  directiveIdByResponseRef.current.get(responseId);
                const directive = directiveId
                  ? directivesByIdRef.current.get(directiveId)
                  : undefined;
                if (directive) {
                  void commitDirectiveAsText(directive, false, responseId);
                } else {
                  assistantTranscriptByResponseRef.current.delete(responseId);
                  firstAudioAtByResponseRef.current.delete(responseId);
                  if (activeResponseIdRef.current === responseId) {
                    activeResponseIdRef.current = null;
                  }
                }
              }
            }
            questionStartedAtRef.current = new Date();
            micOpenedAtRef.current = Date.now();
            realtimeSession.setMicEnabled(!userMutedRef.current);
            dispatchRealtime({ type: "ASSISTANT_AUDIO_ENDED" });
            break;
          }
          case "ai_interrupted": {
            if (bargeInArmTimerRef.current !== null) {
              clearTimeout(bargeInArmTimerRef.current);
              bargeInArmTimerRef.current = null;
            }
            bargeInArmedRef.current = false;
            const responseId = event.responseId;
            if (responseId) {
              interruptedResponseIdsRef.current.add(responseId);
              const transcript =
                assistantTranscriptByResponseRef.current
                  .get(responseId)
                  ?.trim() ?? "";
              if (transcript) {
                void commitAssistantTranscript({
                  ...event,
                  type: "ai_transcript_done",
                  data: transcript,
                });
              } else {
                const directiveId =
                  directiveIdByResponseRef.current.get(responseId);
                const directive = directiveId
                  ? directivesByIdRef.current.get(directiveId)
                  : undefined;
                if (directive) {
                  void commitDirectiveAsText(
                    directive,
                    false,
                    responseId,
                    true,
                  );
                } else {
                  assistantTranscriptByResponseRef.current.delete(responseId);
                  firstAudioAtByResponseRef.current.delete(responseId);
                  interruptedResponseIdsRef.current.delete(responseId);
                  if (activeResponseIdRef.current === responseId) {
                    activeResponseIdRef.current = null;
                  }
                }
              }
            }
            resolvingToolCallRef.current = false;
            setIsLoading(false);
            realtimeSession.setMicEnabled(!userMutedRef.current);
            dispatchRealtime({ type: "CANDIDATE_INTERRUPTED" });
            break;
          }
          case "transcript_failed":
            toast({
              title: t("interview.errors.transcriptionFailedTitle", {
                defaultValue: "A speech segment was unclear",
              }),
              description: t("interview.errors.transcriptionFailedDesc", {
                defaultValue:
                  "The captured answer is preserved. You can continue speaking.",
              }),
            });
            break;
          case "server_error":
            setApiError(
              event.data ||
                t("interview.errors.realtimeResponseFailed", {
                  defaultValue:
                    "Alex could not finish that response. Your session is still connected.",
                }),
            );
            break;
          case "transport_error":
            setApiError(
              event.data ||
                t("interview.errors.realtimeTransportIssue", {
                  defaultValue:
                    "There is a temporary audio transport issue. Reconnecting only if the connection closes.",
                }),
            );
            break;
          case "ai_transcript": {
            const responseId = event.responseId;
            if (!responseId || !event.data) break;
            const transcript =
              (assistantTranscriptByResponseRef.current.get(responseId) ?? "") +
              event.data;
            if (containsInterviewInternalMarker(transcript)) {
              const directiveId =
                directiveIdByResponseRef.current.get(responseId);
              const directive = directiveId
                ? directivesByIdRef.current.get(directiveId)
                : undefined;
              realtimeSession.cancelResponse();
              if (
                directive &&
                !committingResponseIdsRef.current.has(responseId)
              ) {
                committingResponseIdsRef.current.add(responseId);
                setVoiceFallback(
                  t("interview.errors.internalResponseBlocked", {
                    defaultValue:
                      "The voice response was blocked and moved to text safely.",
                  }),
                );
                void commitDirectiveAsText(directive).finally(() => {
                  committingResponseIdsRef.current.delete(responseId);
                });
              }
              break;
            }
            assistantTranscriptByResponseRef.current.set(
              responseId,
              transcript,
            );
            dispatchRealtime({
              type: "ASSISTANT_SUBTITLE",
              subtitle: event.data,
            });
            break;
          }
          case "ai_transcript_done":
            if (event.responseId && event.data) {
              assistantTranscriptByResponseRef.current.set(
                event.responseId,
                event.data.trim().normalize("NFC"),
              );
            }
            break;
          case "response_done": {
            const responseId = event.responseId;
            const status = event.responseStatus;
            if (!responseId || !status || status === "in_progress") break;
            const hadAudio = firstAudioAtByResponseRef.current.has(responseId);
            const directiveId =
              event.directiveId ??
              directiveIdByResponseRef.current.get(responseId);
            if (directiveId) {
              responseWatchdogRef.current.markResponseTerminal(
                directiveId,
                status,
              );
            }
            if (
              status === "failed" ||
              status === "incomplete" ||
              (status === "cancelled" && !hadAudio)
            ) {
              directiveIdByResponseRef.current.delete(responseId);
              assistantTranscriptByResponseRef.current.delete(responseId);
              firstAudioAtByResponseRef.current.delete(responseId);
              interruptedResponseIdsRef.current.delete(responseId);
              if (
                directiveId &&
                activeResponseByDirectiveRef.current.get(directiveId) ===
                  responseId
              ) {
                activeResponseByDirectiveRef.current.delete(directiveId);
              }
              if (activeResponseIdRef.current === responseId) {
                activeResponseIdRef.current = null;
              }
            }
            if (status === "cancelled") {
              const directive = directiveId
                ? directivesByIdRef.current.get(directiveId)
                : undefined;
              if (
                directive &&
                !hadAudio &&
                !committedDirectiveIdsRef.current.has(directive.directiveId)
              ) {
                void commitDirectiveAsText(directive, false, responseId, true);
              }
              resolvingToolCallRef.current = false;
              setIsLoading(false);
              realtimeSession.setMicEnabled(!userMutedRef.current);
            }
            break;
          }
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
    [
      commitAssistantTranscript,
      commitDirectiveAsText,
      disconnectRealtime,
      resolveRealtimeTurn,
      setVoiceFallback,
      t,
      toast,
    ],
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
    committedDirectiveIdsRef.current.clear();
    userMutedRef.current = false;
    dispatchRealtime({ type: "SET_USER_MUTED", muted: false });
    questionStartedAtRef.current = null;
    candidateTranscriptRef.current = "";
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
        await connectRealtime(started.realtime.clientSecret!, stream);
        liveSessionRef.current?.setMicEnabled(false);
        speakOfficialRealtimeQuestion(
          liveSessionRef.current,
          started.firstQuestion,
          selectedLanguage,
          started.firstMessage,
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
      t,
    ],
  );

  finishInterviewRef.current = finishInterview;

  const handleSubmitAnswer = async () => {
    const answer = userAnswer.trim();
    if (!answer || !activeSession?.id || isLoading || isEnding) return;

    setChatHistory((current) => [
      ...current,
      {
        id: `candidate-text-${Date.now()}`,
        role: "user",
        content: answer,
        timestamp: new Date(),
      },
    ]);
    setUserAnswer("");
    await resolveRealtimeTurn(`text-${crypto.randomUUID()}`, answer, "TEXT");
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

      await connectRealtime(realtime.clientSecret, stream);
      return true;
    } catch {
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
  ]);
  const handleRealtimeIntent = (intent: RealtimeCandidateIntent) => {
    if (intent === "END") {
      setIsEndDialogOpen(true);
      return;
    }
    const session = activeSessionRef.current;
    if (!session || isLoading || resolvingToolCallRef.current) return;
    const prompt = intentPrompt(intent, selectedLanguage);
    setChatHistory((current) => [
      ...current,
      {
        id: `command-${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: new Date(),
      },
    ]);
    if (liveSessionRef.current?.isConnected) {
      setIsLoading(true);
      liveSessionRef.current.setMicEnabled(false);
      candidateTranscriptRef.current = prompt;
      liveSessionRef.current.sendText(prompt);
      return;
    }
    void resolveRealtimeTurn(`command-${crypto.randomUUID()}`, prompt, "TEXT");
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
                ? selectedLanguage === "vi"
                  ? "Đang nói"
                  : "Speaking"
                : realtimeState.turn.status === "THINKING"
                  ? selectedLanguage === "vi"
                    ? "Đang suy nghĩ"
                    : "Thinking"
                  : selectedLanguage === "vi"
                    ? "Đang nghe"
                    : "Listening"
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
