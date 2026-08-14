const INTERVIEW_INTERNAL_MARKER =
  /Role-only practice|No CV or job description|question fingerprints|questionGoal|scoreCap|what_to_probe|seed_question|FOLLOW_UP|ADVANCE_TOPIC|LOWER_DIFFICULTY|DECLINE_COACHING|GIVE_HINT|GIVE_FEEDBACK/i;

export function containsInterviewInternalMarker(value: string): boolean {
  return INTERVIEW_INTERNAL_MARKER.test(value);
}
import type {
  InterviewDetailResponseDto,
  InterviewFeedback,
  FinalScoreDto,
  PlatformInterviewType,
  StartInterviewRequest,
  CommunicationSignalsDto,
} from "@/api/interview-api";
import {
  DEFAULT_INTERVIEW_SPEECH_SPEED,
  DEFAULT_INTERVIEW_VOICE,
  INTERVIEW_SPEECH_SPEED_OPTIONS,
  INTERVIEW_VOICE_OPTIONS,
  INTERVIEW_VOICE_STORAGE_KEY,
  type InterviewPhase,
  type InterviewSpeechSpeed,
  type InterviewType,
  type InterviewVoice,
} from "./types";

export interface InterviewResultQuestionViewModel {
  id: string;
  question: string;
  answer: string;
  score: number | null;
  phase: string | null;
  topicPhase: string | null;
  depthSignal: string | null;
  currentThread: string | null;
  skillCanonical: string | null;
  questionBankKey: string | null;
  isCuratedQuestion: boolean;
  confidenceEvidence: InterviewEvidenceMetricViewModel[];
  strengths: string[];
  improvements: string[];
  durationSeconds: number | null;
  signals: CommunicationSignalsDto | null;
  /** consistency-guard adjustments applied to this turn's score/depth (BE I-CONSIST). */
  guardAdjustments: InterviewGuardAdjustment[];
  /** P3 speech timing (voice mode) — null on text/legacy turns. */
  responseDelayMs: number | null;
  transcriptSegments: number | null;
  /** I-PACE: answer budget for this turn (seconds). null on legacy turns. */
  timeBudgetSeconds: number | null;
  /** ISO timestamp when the question was asked (server-owned). */
  askedAt: string;
  /** ISO timestamp when the answer was received (server-owned). null if unanswered. */
  answeredAt: string | null;
}

  /** the guard slugs the report explains — anything unknown is ignored (forward-compatible). */
export const INTERVIEW_GUARD_ADJUSTMENTS = [
  "score_capped_off_topic",
  "score_capped_evasive",
  "score_capped_shallow",
  "depth_downgraded_thin_answer",
] as const;

export type InterviewGuardAdjustment =
  (typeof INTERVIEW_GUARD_ADJUSTMENTS)[number];

/** extract known guard slugs from a persisted turn trace; defensive on shape (legacy turns). */
export function readGuardAdjustments(
  turnTrace: unknown,
): InterviewGuardAdjustment[] {
  if (!turnTrace || typeof turnTrace !== "object") return [];
  const reasons = (turnTrace as { reasons?: unknown }).reasons;
  if (!Array.isArray(reasons)) return [];
  return INTERVIEW_GUARD_ADJUSTMENTS.filter((slug) => reasons.includes(slug));
}

export interface InterviewEvidenceMetricViewModel {
  label: string;
  value: string;
}

export interface InterviewRubricDimensionViewModel {
  dimension: string;
  score: number;
  band: string;
  weight: number;
}

export interface InterviewCoachingPriorityViewModel {
  track: string;
  title: string;
  why: string;
}

export interface InterviewDevPlanItemViewModel {
  track: string;
  title: string;
  priority: number | null;
  rationale: string;
}

export interface InterviewScoreExplanationViewModel {
  dimension:
    | "technical_depth"
    | "problem_solving"
    | "communication"
    | "evidence_credibility"
    | "role_fit";
  score: number;
  band: "poor" | "borderline" | "solid" | "outstanding";
  weight: number;
  rubric_anchor: string;
  evidence_quote: string | null;
  linked_question_id: string | null;
  uncertainty: "low" | "medium" | "high";
  improvement_hint: string | null;
}

export interface InterviewGapItemViewModel {
  /** null for skill-less gaps (communication_gap / behavioral_gap) — must still render. */
  skillCanonical: string | null;
  displayName: string;
  weaknessType: string;
  severity: number;
  recommendedAction: string;
}

  /** BE gap severity is 0..1 (clamp01) — NOT a 0..5 scale. */
export function gapSeverityLevel(severity: number): "critical" | "moderate" {
  return severity >= 0.7 ? "critical" : "moderate";
}

/** UnifiedTrack on the BE is 'learn' | 'cv_fix' | 'interview_practice'. */
export function devPlanTrackKind(
  track: string,
): "learn" | "practice" | "cv" | null {
  if (track === "learn" || track === "learning") return "learn";
  if (track === "interview_practice" || track === "practice") return "practice";
  if (track === "cv_fix" || track === "cv") return "cv";
  return null;
}

export interface InterviewResultViewModel {
  sessionId: string;
  targetRole: string;
  overallScore: number | null;
  semanticScore: number | null;
  llmScore: number | null;
  communicationScore: number | null;
  summary: string;
  recommendations: string[];
  modules: string[];
  technicalDelivery: Record<string, number>;
  communicationFlow: Record<string, number>;
  confidenceEvidence: InterviewEvidenceMetricViewModel[];
  rubricDimensions: InterviewRubricDimensionViewModel[];
  coachingSummary: string | null;
  coachingStrengths: string[];
  coachingPriorities: InterviewCoachingPriorityViewModel[];
  devPlanItems: InterviewDevPlanItemViewModel[];
  durationSeconds: number | null;
  questions: InterviewResultQuestionViewModel[];
  scoreExplanations: InterviewScoreExplanationViewModel[];
  gapItems: InterviewGapItemViewModel[];
  scoreBasis: FinalScoreDto["score_basis"] | null;
}

export type InterviewQuestionBankSourceKind = "curated" | "fallback";

export interface InterviewQuestionMetadataInput {
  topicPhase?: string | null;
  skillCanonical?: string | null;
  currentThread?: string | null;
  questionBankKey?: string | null;
}

const CURATED_QUESTION_BANK_ROLE_KEYS = new Set([
  "backend_developer",
  "frontend_developer",
  "fullstack_developer",
  "mobile_developer",
  "devops_engineer",
  "data_analyst",
  "qa_engineer",
  "qa_tester",
  "ai_ml_engineer",
]);

const CURATED_QUESTION_BANK_ROLE_TOKENS = new Set([
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "ios",
  "android",
  "flutter",
  "devops",
  "sre",
  "data",
  "analyst",
  "analytics",
  "bi",
  "qa",
  "tester",
  "sdet",
  "ai",
  "ml",
  "llm",
]);

export type InterviewHistoryState =
  | "signed-out"
  | "loading"
  | "error"
  | "empty"
  | "ready";
export type InterviewHistoryDetailState =
  | "idle"
  | "loading"
  | "error"
  | "not-scored"
  | "ready";
export type InterviewSessionStatusKey =
  | "completed"
  | "inProgress"
  | "cancelled"
  | "unknown";
export type InterviewEndIntent = "cancel" | "score";
export type InterviewEndOutcome = "cancelled" | "scored";
export type LiveTranscriptWarning = "cjk" | "promptLeak";

export function isInterviewAnalysisSettled(
  session: Pick<InterviewDetailResponseDto, "status" | "analysisStatus">,
): boolean {
  return session.analysisStatus === "READY" || session.analysisStatus === "NOT_REQUIRED";
}

export interface InterviewVoicePreference {
  voice: InterviewVoice;
  speechSpeed: InterviewSpeechSpeed;
}

export function getInterviewEndIntent(
  answeredCount: number,
): InterviewEndIntent {
  return answeredCount > 0 ? "score" : "cancel";
}

export function getInterviewEndOutcome(status: string): InterviewEndOutcome {
  return status.toUpperCase() === "CANCELLED" ? "cancelled" : "scored";
}

export function getInterviewQuestionBankSourceKind(
  targetRole: string,
): InterviewQuestionBankSourceKind {
  const normalized = targetRole
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (CURATED_QUESTION_BANK_ROLE_KEYS.has(normalized)) {
    return "curated";
  }

  const roleTokens = new Set(normalized.split("_").filter(Boolean));
  if (roleTokens.has("back") && roleTokens.has("end")) {
    return "curated";
  }
  if (roleTokens.has("front") && roleTokens.has("end")) {
    return "curated";
  }
  if (roleTokens.has("full") && roleTokens.has("stack")) {
    return "curated";
  }
  if (
    [...CURATED_QUESTION_BANK_ROLE_TOKENS].some((token) =>
      roleTokens.has(token),
    )
  ) {
    return "curated";
  }

  return "fallback";
}

export function hasVisibleInterviewQuestionMetadata(
  metadata: InterviewQuestionMetadataInput | null | undefined,
): boolean {
  return Boolean(
    metadata &&
    [
      metadata.topicPhase,
      metadata.skillCanonical,
      metadata.currentThread,
      metadata.questionBankKey,
    ].some((value) => typeof value === "string" && value.trim().length > 0),
  );
}

export function takeRecentInterviewSessions<T>(
  sessions: readonly T[],
  limit = 3,
): T[] {
  return sessions.slice(0, limit);
}

interface BuildInterviewStartRequestInput extends InterviewVoicePreference {
  selectedCvId: string | null;
  selectedMatchId: string | null;
  targetRole: string;
  selectedLanguage: "vi" | "en";
  interviewType: InterviewType;
}

export function buildInterviewStartRequest({
  selectedCvId,
  selectedMatchId,
  targetRole,
  selectedLanguage,
  interviewType,
  voice,
  speechSpeed,
}: BuildInterviewStartRequestInput): StartInterviewRequest {
  return {
    cvId: selectedCvId ?? undefined,
    cvMatchId: selectedMatchId ?? undefined,
    targetRole,
    language: selectedLanguage,
    mode: "VOICE",
    interviewType: toBackendInterviewType(interviewType),
    voice,
    speechSpeed,
  };
}

export function readInterviewVoicePreference(
  storage: Pick<Storage, "getItem"> | null | undefined,
): InterviewVoicePreference {
  if (!storage) {
    return {
      voice: DEFAULT_INTERVIEW_VOICE,
      speechSpeed: DEFAULT_INTERVIEW_SPEECH_SPEED,
    };
  }

  try {
    const raw = storage.getItem(INTERVIEW_VOICE_STORAGE_KEY);
    if (!raw) {
      return {
        voice: DEFAULT_INTERVIEW_VOICE,
        speechSpeed: DEFAULT_INTERVIEW_SPEECH_SPEED,
      };
    }
    const parsed = JSON.parse(raw) as Partial<InterviewVoicePreference>;
    return {
      voice: normalizeInterviewVoice(parsed.voice),
      speechSpeed: normalizeInterviewSpeechSpeed(parsed.speechSpeed),
    };
  } catch {
    return {
      voice: DEFAULT_INTERVIEW_VOICE,
      speechSpeed: DEFAULT_INTERVIEW_SPEECH_SPEED,
    };
  }
}

export function writeInterviewVoicePreference(
  storage: Pick<Storage, "setItem"> | null | undefined,
  preference: InterviewVoicePreference,
): void {
  if (!storage) return;
  try {
    storage.setItem(INTERVIEW_VOICE_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Ignore storage quota/private-mode errors. The selected value still applies to the current session.
  }
}

export function normalizeInterviewVoice(value: unknown): InterviewVoice {
  return INTERVIEW_VOICE_OPTIONS.some((option) => option.value === value)
    ? (value as InterviewVoice)
    : DEFAULT_INTERVIEW_VOICE;
}

export function normalizeInterviewSpeechSpeed(
  value: unknown,
): InterviewSpeechSpeed {
  const numeric = Number(value);
  const match = INTERVIEW_SPEECH_SPEED_OPTIONS.find(
    (option) => option.value === numeric,
  );
  return match?.value ?? DEFAULT_INTERVIEW_SPEECH_SPEED;
}

export function toBackendInterviewType(
  type: InterviewType,
): PlatformInterviewType {
  if (type === "hr") return "HR";
  if (type === "mixed") return "MIXED";
  return "TECHNICAL";
}

interface InterviewHistoryStateOptions {
  canUseApi: boolean;
  isLoading: boolean;
  isError: boolean;
  itemCount: number;
}

export function getInterviewHistoryState({
  canUseApi,
  isLoading,
  isError,
  itemCount,
}: InterviewHistoryStateOptions): InterviewHistoryState {
  if (!canUseApi) return "signed-out";
  if (isLoading) return "loading";
  if (isError) return "error";
  return itemCount === 0 ? "empty" : "ready";
}

export function getInterviewSessionStatusKey(
  status: string,
): InterviewSessionStatusKey {
  if (status === "COMPLETED") return "completed";
  if (status === "IN_PROGRESS") return "inProgress";
  if (status === "CANCELLED") return "cancelled";
  return "unknown";
}

export function getInterviewSessionStatusLabel(status: string): string {
  const key = getInterviewSessionStatusKey(status);
  if (key === "completed") return "Completed";
  if (key === "inProgress") return "In progress";
  if (key === "cancelled") return "Cancelled";
  return "Unknown";
}

interface InterviewHistoryDetailStateOptions {
  selectedSessionId: string | null;
  isLoading: boolean;
  isError: boolean;
  result: Pick<InterviewDetailResponseDto, "status" | "overallScore"> | null;
}

export function canOpenInterviewHistory(phase: InterviewPhase): boolean {
  return phase !== "interviewing";
}

export function canSwitchInterviewWorkspace(phase: InterviewPhase): boolean {
  return phase !== "interviewing";
}

export function getInterviewHistoryDetailState({
  selectedSessionId,
  isLoading,
  isError,
  result,
}: InterviewHistoryDetailStateOptions): InterviewHistoryDetailState {
  if (!selectedSessionId) return "idle";
  if (isLoading) return "loading";
  if (isError) return "error";
  if (!result || result.status !== "COMPLETED" || result.overallScore == null)
    return "not-scored";
  return "ready";
}

export function secondsRemainingFromExpiry(
  expiresAt: string | null,
  now = new Date(),
): number {
  if (!expiresAt) return 0;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - now.getTime()) / 1000));
}

export function formatDuration(seconds: number | null | undefined): string {
  const safe = Math.max(0, seconds ?? 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface RealtimeTokenFallbackOptions {
  realtimeEnabled: boolean;
  clientSecret: string | null;
  reason?: string;
  fallbackMessage?: string;
}

export function getRealtimeTokenFallbackReason({
  realtimeEnabled,
  clientSecret,
  reason,
  fallbackMessage,
}: RealtimeTokenFallbackOptions): string | null {
  if (realtimeEnabled && clientSecret) return null;
  return (
    reason ||
    fallbackMessage ||
    "Realtime token is unavailable. Continue in text mode."
  );
}

interface LiveClosingSignalOptions {
  isVoiceFallback: boolean;
  isLiveConnected: boolean;
  secondsRemaining: number;
  alreadyRequested: boolean;
}

export function shouldRequestLiveClosingSignal({
  isVoiceFallback,
  isLiveConnected,
  secondsRemaining,
  alreadyRequested,
}: LiveClosingSignalOptions): boolean {
  return (
    !isVoiceFallback &&
    isLiveConnected &&
    !alreadyRequested &&
    secondsRemaining > 0 &&
    secondsRemaining <= 45
  );
}

export function coerceStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
  }
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  return [];
}

function score(value: number | null | undefined): number | null {
  return value == null || Number.isNaN(value) ? null : Math.round(value);
}

function feedbackRecord(
  feedback: InterviewFeedback | null,
  key: "technical_delivery" | "communication_flow",
): Record<string, number> | null {
  const value = feedback?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
      .map(([k, v]) => [k, Math.round(v as number)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readBooleanLabel(value: unknown): string | null {
  if (typeof value !== "boolean") return null;
  return value ? "Yes" : "No";
}

function readFinalScoreOverall(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return score(readNumber(value.overall));
}

function readScoreBasis(value: unknown): FinalScoreDto["score_basis"] | null {
  if (!isRecord(value)) return null;
  return value.score_basis === "criterion_rubric" ||
    value.score_basis === "legacy_fallback" ||
    value.score_basis === "mixed" ||
    value.score_basis === "unscored"
    ? value.score_basis
    : null;
}

function readRubricDimensions(
  value: unknown,
): InterviewRubricDimensionViewModel[] {
  if (!isRecord(value) || !Array.isArray(value.dimensions)) return [];

  return value.dimensions
    .map((dimension): InterviewRubricDimensionViewModel | null => {
      if (!isRecord(dimension)) return null;
      const name = readString(dimension.dimension);
      const dimensionScore = score(readNumber(dimension.score));
      const band = readString(dimension.band);
      const weight = readNumber(dimension.weight);
      if (!name || dimensionScore == null || !band || weight == null)
        return null;
      return {
        dimension: name,
        score: dimensionScore,
        band,
        weight,
      };
    })
    .filter(
      (dimension): dimension is InterviewRubricDimensionViewModel =>
        dimension !== null,
    );
}

function readCoachingSummary(value: unknown): string | null {
  return isRecord(value) ? readString(value.summary) : null;
}

function readCoachingStrengths(value: unknown): string[] {
  return isRecord(value) ? coerceStringList(value.strengths) : [];
}

function readCoachingPriorities(
  value: unknown,
): InterviewCoachingPriorityViewModel[] {
  if (!isRecord(value) || !Array.isArray(value.priorities)) return [];

  return value.priorities
    .map((priority): InterviewCoachingPriorityViewModel | null => {
      if (!isRecord(priority)) return null;
      const track = readString(priority.track);
      const title = readString(priority.title);
      const why = readString(priority.why);
      if (!track || !title || !why) return null;
      return { track, title, why };
    })
    .filter(
      (priority): priority is InterviewCoachingPriorityViewModel =>
        priority !== null,
    );
}

function readDevPlanItems(value: unknown): InterviewDevPlanItemViewModel[] {
  if (!isRecord(value)) return [];
  return ["learn_items", "cv_fix_items", "interview_practice_items"].flatMap(
    (key) => {
      const bucket = value[key];
      if (!Array.isArray(bucket)) return [];
      return bucket
        .map((item): InterviewDevPlanItemViewModel | null => {
          if (!isRecord(item)) return null;
          const track = readString(item.track);
          const title = readString(item.display_name);
          if (!track || !title) return null;
          return {
            track,
            title,
            priority: readNumber(item.priority),
            rationale: readString(item.rationale) ?? "",
          };
        })
        .filter((item): item is InterviewDevPlanItemViewModel => item !== null);
    },
  );
}

function readConfidenceEvidence(
  value: unknown,
): InterviewEvidenceMetricViewModel[] {
  if (!isRecord(value)) return [];

  const starPresent = isRecord(value.star_present) ? value.star_present : null;
  const starCoverage = starPresent
    ? [
        ["situation", "Situation"],
        ["task", "Task"],
        ["action", "Action"],
        ["result", "Result"],
      ]
        .filter(([key]) => starPresent[key] === true)
        .map(([, label]) => label)
        .join(", ")
    : "";

  return [
    metric("Confidence tone", readString(value.confidence_tone)),
    metric("Evidence quality", readString(value.evidence_quality)),
    metric("Clarity", readString(value.clarity)),
    metric("Off topic", readBooleanLabel(value.off_topic)),
    metric("Specific example", readBooleanLabel(value.has_specific_example)),
    metric("STAR coverage", starCoverage || null),
  ].filter((item): item is InterviewEvidenceMetricViewModel => item !== null);
}

function metric(
  label: string,
  value: string | null,
): InterviewEvidenceMetricViewModel | null {
  return value ? { label, value } : null;
}

function readScoreExplanations(
  value: unknown,
): InterviewScoreExplanationViewModel[] {
  if (!isRecord(value) || !Array.isArray(value.score_explanations)) return [];
  return value.score_explanations
    .map((item): InterviewScoreExplanationViewModel | null => {
      if (!isRecord(item)) return null;
      const rub = readString(item.rubric_anchor);
      const dimension = readString(item.dimension);
      const band = readString(item.band);
      const uncertainty = readString(item.uncertainty);
      if (
        !rub ||
        !dimension ||
        !["technical_depth", "problem_solving", "communication", "evidence_credibility", "role_fit"].includes(dimension) ||
        !band ||
        !["poor", "borderline", "solid", "outstanding"].includes(band) ||
        !uncertainty ||
        !["low", "medium", "high"].includes(uncertainty)
      ) return null;
      return {
        dimension: dimension as InterviewScoreExplanationViewModel["dimension"],
        score: readNumber(item.score) ?? 0,
        band: band as InterviewScoreExplanationViewModel["band"],
        weight: readNumber(item.weight) ?? 0,
        rubric_anchor: rub,
        evidence_quote: readString(item.evidence_quote),
        linked_question_id: readString(item.linked_question_id),
        uncertainty: uncertainty as InterviewScoreExplanationViewModel["uncertainty"],
        improvement_hint: readString(item.improvement_hint),
      };
    })
    .filter(
      (item): item is InterviewScoreExplanationViewModel => item !== null,
    );
}

function readGapItems(value: unknown): InterviewGapItemViewModel[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): InterviewGapItemViewModel | null => {
      if (!isRecord(item)) return null;
      const display = readString(item.display_name);
      const severity = readNumber(item.severity) ?? 0;
      const action =
        readString(item.recommended_action) ||
        readString(item.recommended_next_action) ||
        "";
    // skill_canonical is null for communication/behavioral gaps — keep those items.
      if (!display) return null;
      return {
        skillCanonical: readString(item.skill_canonical),
        displayName: display,
        weaknessType: readString(item.weakness_type) ?? "gap",
        severity,
        recommendedAction: action,
      };
    })
    .filter((item): item is InterviewGapItemViewModel => item !== null);
}

export function toInterviewResultViewModel(
  detail: InterviewDetailResponseDto,
  fallbacks: { summary?: string } = {},
): InterviewResultViewModel {
  const feedback = detail.aiFeedback;
  const finalScoreOverall = readFinalScoreOverall(detail.finalScore);
  const questions = detail.turns
    .filter((turn) => turn.userAnswerText || turn.userAnswerTranscript)
    .map((turn) => {
      const questionBankKey = readString(turn.questionBankKey);
      return {
        id: turn.id,
        question: turn.interviewerQuestion,
        answer: turn.userAnswerText ?? turn.userAnswerTranscript ?? "",
        score: score(turn.perQuestionScore),
        phase: turn.phase ?? null,
        topicPhase: turn.topicPhase ?? null,
        depthSignal: turn.depthSignal ?? null,
        currentThread: turn.currentThread ?? null,
        skillCanonical: turn.skillCanonical ?? null,
        questionBankKey,
        isCuratedQuestion: Boolean(questionBankKey),
        confidenceEvidence: readConfidenceEvidence(turn.insight),
        strengths: coerceStringList(turn.strengths),
        improvements: coerceStringList(turn.improvements),
        durationSeconds: turn.durationSeconds,
        signals: turn.signals ?? null,
        guardAdjustments: readGuardAdjustments(turn.turnTrace),
        responseDelayMs: turn.responseDelayMs ?? null,
        transcriptSegments: turn.transcriptSegments ?? null,
        timeBudgetSeconds: turn.timeBudgetSeconds ?? null,
        askedAt: turn.askedAt,
        answeredAt: turn.answeredAt ?? null,
      };
    });

  return {
    sessionId: detail.id,
    targetRole: detail.targetRole,
    overallScore: finalScoreOverall ?? score(detail.overallScore),
    semanticScore: score(detail.semanticScore),
    llmScore: score(detail.llmScore),
    communicationScore: score(detail.communicationScore),
    summary:
      typeof feedback?.summary === "string"
        ? feedback.summary
        : fallbacks.summary || "No summary is available yet.",
    recommendations: coerceStringList(feedback?.recommendations),
    modules: coerceStringList(feedback?.suggested_modules),
    technicalDelivery: feedbackRecord(feedback, "technical_delivery") ?? {},
    communicationFlow: feedbackRecord(feedback, "communication_flow") ?? {},
    confidenceEvidence:
      questions.find((question) => question.confidenceEvidence.length > 0)
        ?.confidenceEvidence ?? [],
    rubricDimensions: readRubricDimensions(detail.finalScore),
    coachingSummary: readCoachingSummary(detail.coaching),
    coachingStrengths: readCoachingStrengths(detail.coaching),
    coachingPriorities: readCoachingPriorities(detail.coaching),
    devPlanItems: readDevPlanItems(detail.devPlan),
    durationSeconds: detail.durationSeconds,
    questions,
    scoreExplanations: readScoreExplanations(detail.finalScore),
    gapItems: readGapItems(detail.gapItems),
    scoreBasis: readScoreBasis(detail.finalScore),
  };
}

// ─── I-PACE answer-pacing helpers ───────────────────────────────────

/**
 * Hard ceiling in milliseconds for the auto-flush timer.
 * Returns `null` when `timeBudgetSeconds` is absent (degrade: no ceiling).
 * Ceiling = 2 × timeBudgetSeconds (spec W120).
 */
export function computeAnswerCeilingMs(
  timeBudgetSeconds: number | null | undefined,
): number | null {
  if (timeBudgetSeconds == null || timeBudgetSeconds <= 0) return null;
  return timeBudgetSeconds * 2 * 1000;
}

/**
 * For the report overtime badge. Returns `null` unless the answer provably ran past its budget.
 *
 * The measurement is `durationSeconds`, BOUNDED by the server's `askedAt`→`answeredAt` window.
 *
 * Why not the server window alone: `askedAt` is stamped when the question row is created — before
 * the AI reads it aloud. That window therefore also contains ~10-20s of the interviewer talking,
 * plus the mic-open delay and the idle tail, none of which is the candidate answering. Comparing it
 * against a budget that means "time to answer" flags people who came in under it. A badge that says
 * you ran long when you did not is worse than no badge.
 *
 * `durationSeconds` measures the right window (voice: AI stopped speaking → submit), but the client
 * reports it. So the server window is used as the ceiling it cannot exceed: a client can only ever
 * shrink its own number, which hides a badge rather than inventing one.
 */
export function computeAnswerOvertimeDisplay(
  askedAt: string | null | undefined,
  answeredAt: string | null | undefined,
  timeBudgetSeconds: number | null | undefined,
  durationSeconds: number | null | undefined,
): { elapsedSeconds: number; budgetSeconds: number } | null {
  if (
    !askedAt ||
    !answeredAt ||
    timeBudgetSeconds == null ||
    timeBudgetSeconds <= 0
  )
    return null;
  if (
    durationSeconds == null ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return null;
  }
  const asked = new Date(askedAt).getTime();
  const answered = new Date(answeredAt).getTime();
  if (Number.isNaN(asked) || Number.isNaN(answered)) return null;
  const serverWindowSeconds = Math.round((answered - asked) / 1000);
  if (serverWindowSeconds <= 0) return null;
  // an answer cannot have lasted longer than the question was open — drop an implausible claim
  // rather than rendering it.
  if (durationSeconds > serverWindowSeconds) return null;
  const elapsedSeconds = Math.round(durationSeconds);
  if (elapsedSeconds <= timeBudgetSeconds) return null;
  return { elapsedSeconds, budgetSeconds: timeBudgetSeconds };
}
