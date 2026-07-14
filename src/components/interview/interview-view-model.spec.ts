import { describe, expect, it, vi } from "vitest";
import type { InterviewDetailResponseDto } from "@/api/interview-api";
import {
  buildInterviewInitialMessages,
  buildInterviewNextMessages,
  canOpenInterviewHistory,
  canSwitchInterviewWorkspace,
  buildInterviewStartRequest,
  buildBufferedRealtimeTurnRequest,
  buildServerOwnedRealtimeTurnRequest,
  buildValidatedRealtimeTurnRequest,
  classifyRealtimeTranscriptIntent,
  createQuestionAudioRequestGuard,
  getLiveTranscriptWarnings,
  getInterviewEndIntent,
  getInterviewEndOutcome,
  getInterviewHistoryDetailState,
  getInterviewHistoryState,
  getInterviewModeLabel,
  getInterviewModeLabelKey,
  getInterviewQuestionBankSourceKind,
  getQuestionAudioErrorMessage,
  getRealtimeMicStatusKey,
  hasVisibleInterviewQuestionMetadata,
  getRealtimeTokenFallbackReason,
  shouldRequestLiveClosingSignal,
  shouldRequestQuestionAudio,
  speakOfficialRealtimeQuestion,
  getInterviewSessionStatusKey,
  getInterviewSessionStatusLabel,
  readInterviewVoicePreference,
  takeRecentInterviewSessions,
  devPlanTrackKind,
  gapSeverityLevel,
  secondsRemainingFromExpiry,
  toInterviewResultViewModel,
  writeInterviewVoicePreference,
} from "./interview-view-model";
import { DEFAULT_INTERVIEW_MODE } from "./types";

const detail: InterviewDetailResponseDto = {
  id: "session-1",
  cvId: null,
  cvMatchId: null,
  jobDescriptionId: null,
  targetRole: "frontend_developer",
  language: "vi",
  mode: "TEXT",
  interviewType: "TECHNICAL",
  voice: "marin",
  speechSpeed: 1.15,
  status: "COMPLETED",
  totalQuestionsPlanned: 7,
  maxDurationSeconds: 600,
  expiresAt: "2026-06-12T10:10:00.000Z",
  overallScore: 76.5,
  semanticScore: 80,
  llmScore: 75,
  communicationScore: 78,
  aiFeedback: {
    summary: "Strong technical foundation.",
    technical_delivery: {
      concept_accuracy: 82,
      problem_solving: 75,
      system_thinking: 70,
      code_quality: 78,
    },
    communication_flow: {
      articulation: 80,
      listening_response: 76,
      filler_words: 65,
      structured_answers: 82,
    },
    recommendations: "Practice system design.",
    suggested_modules: ["React Query"],
  },
  durationSeconds: 540,
  startedAt: "2026-06-12T10:00:00.000Z",
  endedAt: "2026-06-12T10:09:00.000Z",
  createdAt: "2026-06-12T10:00:00.000Z",
  updatedAt: null,
  turns: [
    {
      id: "turn-1",
      sessionId: "session-1",
      turnOrder: 1,
      phase: "INTRODUCTION",
      modality: "TEXT",
      aiRequestId: null,
      interviewerQuestion: "Tell me about your React project.",
      userAnswerText: "I built a dashboard.",
      userAnswerTranscript: null,
      perQuestionScore: 75,
      strengths: ["Clear example"],
      improvements: ["Add metrics"],
      askedAt: "2026-06-12T10:00:00.000Z",
      answeredAt: "2026-06-12T10:01:00.000Z",
      durationSeconds: 60,
    },
  ],
};

describe("interview view model", () => {
  it("defaults new interviews to realtime hands-free mode", () => {
    expect(DEFAULT_INTERVIEW_MODE).toBe("realtime");
  });

  it.each([
    ["setup", true],
    ["results", true],
    ["history-detail", true],
    ["interviewing", false],
  ] as const)(
    "allows opening interview history only outside active interviews",
    (phase, expected) => {
      expect(canOpenInterviewHistory(phase)).toBe(expected);
    },
  );

  it.each([
    ["setup", true],
    ["results", true],
    ["history-detail", true],
    ["interviewing", false],
  ] as const)(
    "allows switching Practice/History only outside active interviews",
    (phase, expected) => {
      expect(canSwitchInterviewWorkspace(phase)).toBe(expected);
    },
  );

  it.each([
    [
      { canUseApi: false, isLoading: false, isError: false, itemCount: 0 },
      "signed-out",
    ],
    [
      { canUseApi: true, isLoading: true, isError: false, itemCount: 0 },
      "loading",
    ],
    [
      { canUseApi: true, isLoading: false, isError: true, itemCount: 0 },
      "error",
    ],
    [
      { canUseApi: true, isLoading: false, isError: false, itemCount: 0 },
      "empty",
    ],
    [
      { canUseApi: true, isLoading: false, isError: false, itemCount: 2 },
      "ready",
    ],
  ] as const)(
    "derives the interview history panel state",
    (input, expected) => {
      expect(getInterviewHistoryState(input)).toBe(expected);
    },
  );

  it.each([
    ["COMPLETED", "completed"],
    ["IN_PROGRESS", "inProgress"],
    ["CANCELLED", "cancelled"],
    ["UNKNOWN", "unknown"],
  ] as const)(
    "normalizes interview session status keys",
    (status, expected) => {
      expect(getInterviewSessionStatusKey(status)).toBe(expected);
    },
  );

  it.each([
    ["COMPLETED", "Completed"],
    ["IN_PROGRESS", "In progress"],
    ["CANCELLED", "Cancelled"],
    ["UNKNOWN", "Unknown"],
  ] as const)("formats interview session status labels", (status, expected) => {
    expect(getInterviewSessionStatusLabel(status)).toBe(expected);
  });

  it.each([
    [
      {
        selectedSessionId: null,
        isLoading: false,
        isError: false,
        result: null,
      },
      "idle",
    ],
    [
      {
        selectedSessionId: "session-1",
        isLoading: true,
        isError: false,
        result: null,
      },
      "loading",
    ],
    [
      {
        selectedSessionId: "session-1",
        isLoading: false,
        isError: true,
        result: null,
      },
      "error",
    ],
    [
      {
        selectedSessionId: "session-1",
        isLoading: false,
        isError: false,
        result: { status: "IN_PROGRESS", overallScore: null },
      },
      "not-scored",
    ],
    [
      {
        selectedSessionId: "session-1",
        isLoading: false,
        isError: false,
        result: { status: "COMPLETED", overallScore: null },
      },
      "not-scored",
    ],
    [
      {
        selectedSessionId: "session-1",
        isLoading: false,
        isError: false,
        result: { status: "COMPLETED", overallScore: 82 },
      },
      "ready",
    ],
  ] as const)(
    "derives the selected interview history detail state",
    (input, expected) => {
      expect(getInterviewHistoryDetailState(input)).toBe(expected);
    },
  );

  it("calculates countdown from backend expiresAt", () => {
    const now = new Date("2026-06-12T10:09:10.000Z");

    expect(secondsRemainingFromExpiry("2026-06-12T10:10:00.000Z", now)).toBe(
      50,
    );
    expect(secondsRemainingFromExpiry("2026-06-12T10:09:00.000Z", now)).toBe(0);
  });

  it("keeps communication/behavioral gaps whose skill_canonical is null and exposes weakness_type", () => {
    const result = toInterviewResultViewModel({
      ...detail,
      gapItems: [
        {
          skill_canonical: "react",
          display_name: "React",
          weakness_type: "knowledge_gap",
          severity: 0.8,
          recommended_action: "Strengthen React fundamentals.",
        },
        {
          skill_canonical: null,
          display_name: "Communication",
          weakness_type: "communication_gap",
          severity: 0.3,
          recommended_action: "Tighten the answer and cut filler.",
        },
        {
          skill_canonical: "react",
          display_name: "React",
          weakness_type: "evidence_gap",
          severity: 0.5,
          recommended_action: "Add a concrete example for React.",
        },
      ] as never,
    });

    expect(result.gapItems).toHaveLength(3);
    expect(result.gapItems[1]).toMatchObject({
      skillCanonical: null,
      displayName: "Communication",
      weaknessType: "communication_gap",
    });
    // two gaps on the same skill must stay distinguishable (React list keys)
    const keys = result.gapItems.map(
      (gap) => `${gap.weaknessType}-${gap.skillCanonical ?? gap.displayName}`,
    );
    expect(new Set(keys).size).toBe(3);
  });

  it("classifies gap severity on the backend 0..1 scale", () => {
    expect(gapSeverityLevel(1)).toBe("critical");
    expect(gapSeverityLevel(0.7)).toBe("critical");
    expect(gapSeverityLevel(0.69)).toBe("moderate");
    expect(gapSeverityLevel(0.3)).toBe("moderate");
  });

  it("maps unified dev-plan tracks to action kinds (BE uses interview_practice)", () => {
    expect(devPlanTrackKind("learn")).toBe("learn");
    expect(devPlanTrackKind("interview_practice")).toBe("practice");
    expect(devPlanTrackKind("cv_fix")).toBe("cv");
    expect(devPlanTrackKind("unknown_track")).toBeNull();
  });

  it("maps backend result without inventing body-language metrics", () => {
    const result = toInterviewResultViewModel(detail);

    expect(result.overallScore).toBe(77);
    expect(result.summary).toBe("Strong technical foundation.");
    expect(result.confidenceEvidence).toEqual([]);
    expect(result.rubricDimensions).toEqual([]);
    expect(result.recommendations).toEqual(["Practice system design."]);
    expect(result.modules).toEqual(["React Query"]);
    expect(result.questions[0]).toMatchObject({
      question: "Tell me about your React project.",
      answer: "I built a dashboard.",
      score: 75,
      topicPhase: null,
      skillCanonical: null,
      questionBankKey: null,
      isCuratedQuestion: false,
      strengths: ["Clear example"],
      improvements: ["Add metrics"],
    });
  });

  it("maps curated question metadata, rubric dimensions, coaching, and confidence evidence", () => {
    const richDetail: InterviewDetailResponseDto = {
      ...detail,
      finalScore: {
        overall: 82,
        overall_band: "outstanding",
        role_family: "ic_eng",
        scored_answers: 3,
        dimensions: [
          {
            dimension: "technical_depth",
            score: 84.2,
            band: "outstanding",
            weight: 40,
          },
          {
            dimension: "evidence_credibility",
            score: 76.4,
            band: "solid",
            weight: 15,
          },
        ],
      },
      coaching: {
        summary: "Strong evidence, but add more trade-off detail.",
        strengths: ["technical_depth: outstanding"],
        priorities: [
          {
            track: "interview_practice",
            title: "Practice concise trade-off answers",
            why: "The answer had evidence but needs clearer decision framing.",
          },
        ],
      },
      devPlan: {
        learn_items: [
          {
            track: "learn",
            display_name: "React Query cache invalidation",
            priority: 0.9,
            rationale: "Review stale time and invalidation trade-offs.",
          },
        ],
        cv_fix_items: [],
        interview_practice_items: [
          {
            track: "interview_practice",
            display_name: "STAR answer drill",
            priority: 0.8,
            rationale: "Add result evidence to behavioral answers.",
          },
        ],
      },
      turns: [
        {
          ...detail.turns[0],
          topicPhase: "SKILL_PROBE",
          depthSignal: "deep",
          currentThread: "React Query cache invalidation",
          skillCanonical: "react_query",
          questionBankKey: "frontend-skill-react-query-01",
          insight: {
            talking_point: "project",
            relevance: 88,
            clarity: "clear",
            off_topic: false,
            confidence_tone: "calibrated",
            evidence_quality: "strong",
            note: "Specific project evidence with a concrete trade-off.",
            has_specific_example: true,
            star_present: {
              situation: true,
              task: true,
              action: true,
              result: false,
            },
          },
          signals: {
            is_quantified: true,
            filler: { count: 1 },
            flags: { rambling_risk: false },
          },
        },
      ],
    };

    const result = toInterviewResultViewModel(richDetail);

    expect(result.overallScore).toBe(82);
    expect(result.rubricDimensions).toEqual([
      {
        dimension: "technical_depth",
        score: 84,
        band: "outstanding",
        weight: 40,
      },
      {
        dimension: "evidence_credibility",
        score: 76,
        band: "solid",
        weight: 15,
      },
    ]);
    expect(result.coachingSummary).toBe(
      "Strong evidence, but add more trade-off detail.",
    );
    expect(result.coachingPriorities).toEqual([
      {
        track: "interview_practice",
        title: "Practice concise trade-off answers",
        why: "The answer had evidence but needs clearer decision framing.",
      },
    ]);
    expect(result.devPlanItems).toEqual([
      {
        track: "learn",
        title: "React Query cache invalidation",
        priority: 0.9,
        rationale: "Review stale time and invalidation trade-offs.",
      },
      {
        track: "interview_practice",
        title: "STAR answer drill",
        priority: 0.8,
        rationale: "Add result evidence to behavioral answers.",
      },
    ]);
    expect(result.confidenceEvidence).toEqual([
      { label: "Confidence tone", value: "calibrated" },
      { label: "Evidence quality", value: "strong" },
      { label: "Clarity", value: "clear" },
      { label: "Off topic", value: "No" },
      { label: "Specific example", value: "Yes" },
      { label: "STAR coverage", value: "Situation, Task, Action" },
    ]);
    expect(result.questions[0]).toMatchObject({
      topicPhase: "SKILL_PROBE",
      depthSignal: "deep",
      currentThread: "React Query cache invalidation",
      skillCanonical: "react_query",
      questionBankKey: "frontend-skill-react-query-01",
      isCuratedQuestion: true,
      confidenceEvidence: [
        { label: "Confidence tone", value: "calibrated" },
        { label: "Evidence quality", value: "strong" },
        { label: "Clarity", value: "clear" },
        { label: "Off topic", value: "No" },
        { label: "Specific example", value: "Yes" },
        { label: "STAR coverage", value: "Situation, Task, Action" },
      ],
    });
  });

  it("marks the seeded UI role families as curated question-bank roles", () => {
    expect(getInterviewQuestionBankSourceKind("backend_developer")).toBe(
      "curated",
    );
    expect(getInterviewQuestionBankSourceKind("frontend_developer")).toBe(
      "curated",
    );
    expect(getInterviewQuestionBankSourceKind("fullstack_developer")).toBe(
      "curated",
    );
    expect(getInterviewQuestionBankSourceKind("mobile_developer")).toBe(
      "curated",
    );
    expect(getInterviewQuestionBankSourceKind("devops_engineer")).toBe(
      "curated",
    );
    expect(getInterviewQuestionBankSourceKind("qa_tester")).toBe("curated");
    expect(getInterviewQuestionBankSourceKind("data_analyst")).toBe("curated");
    expect(getInterviewQuestionBankSourceKind("ai_ml_engineer")).toBe(
      "curated",
    );
  });

  it("keeps prefixed and specialized IT roles on the curated question-bank path", () => {
    expect(getInterviewQuestionBankSourceKind("senior_backend_developer")).toBe(
      "curated",
    );
    expect(getInterviewQuestionBankSourceKind("java_backend_engineer")).toBe(
      "curated",
    );
    expect(getInterviewQuestionBankSourceKind("react_frontend")).toBe(
      "curated",
    );
    expect(getInterviewQuestionBankSourceKind("platform_sre")).toBe("curated");
    expect(getInterviewQuestionBankSourceKind("automation_sdet")).toBe(
      "curated",
    );
  });

  it("shows question metadata when only the question bank key is available", () => {
    expect(
      hasVisibleInterviewQuestionMetadata({
        topicPhase: null,
        skillCanonical: null,
        currentThread: null,
        questionBankKey: "backend-skill-rest-api-01",
      }),
    ).toBe(true);
    expect(
      hasVisibleInterviewQuestionMetadata({
        topicPhase: null,
        skillCanonical: null,
        currentThread: null,
        questionBankKey: null,
      }),
    ).toBe(false);
  });

  it("keeps guided mode labeled as voice when realtime transcription is not connected", () => {
    expect(
      getInterviewModeLabelKey({
        interviewMode: "guided",
        isLiveConnected: false,
        isVoiceFallback: false,
        questionAudioError: null,
      }),
    ).toBe("guidedVoice");
    expect(
      getInterviewModeLabel({
        interviewMode: "guided",
        isLiveConnected: false,
        isVoiceFallback: false,
        questionAudioError: null,
      }),
    ).toBe("Guided Voice");
  });

  it.each([
    [0, "cancel"],
    [1, "score"],
    [3, "score"],
  ] as const)(
    "uses %i answered turns to choose the %s end flow",
    (answeredCount, expected) => {
      expect(getInterviewEndIntent(answeredCount)).toBe(expected);
    },
  );

  it("combines the opening message and first question into one interviewer bubble", () => {
    expect(
      buildInterviewInitialMessages("Welcome.", "Tell me about your project."),
    ).toEqual(["Welcome.\n\nTell me about your project."]);
  });

  it("combines the interviewer bridge and official next question after an answered turn", () => {
    expect(
      buildInterviewNextMessages(
        "Thanks, I want to go one level deeper.",
        "What trade-off did you make?",
      ),
    ).toEqual([
      "Thanks, I want to go one level deeper.\n\nWhat trade-off did you make?",
    ]);
    expect(buildInterviewNextMessages("", "What trade-off did you make?")).toEqual([
      "What trade-off did you make?",
    ]);
    expect(buildInterviewNextMessages(null, null)).toEqual([]);
  });

  it.each([
    ["CANCELLED", "cancelled"],
    ["COMPLETED", "scored"],
  ] as const)(
    "maps a %s end response to the %s UI outcome",
    (status, expected) => {
      expect(getInterviewEndOutcome(status)).toBe(expected);
    },
  );

  it.each([
    [[], []],
    [
      ["session-3", "session-2", "session-1"],
      ["session-3", "session-2", "session-1"],
    ],
    [
      ["session-4", "session-3", "session-2", "session-1"],
      ["session-4", "session-3", "session-2"],
    ],
  ] as const)(
    "keeps at most three recent sessions without mutating the source",
    (ids, expected) => {
      const sessions = ids.map((id) => ({ id }));

      expect(
        takeRecentInterviewSessions(sessions).map((session) => session.id),
      ).toEqual(expected);
      expect(sessions.map((session) => session.id)).toEqual(ids);
    },
  );

  it("shows text fallback when guided question audio fails", () => {
    expect(
      getInterviewModeLabelKey({
        interviewMode: "guided",
        isLiveConnected: false,
        isVoiceFallback: false,
        questionAudioError: "Could not play audio.",
      }),
    ).toBe("textFallback");
    expect(
      getInterviewModeLabel({
        interviewMode: "guided",
        isLiveConnected: false,
        isVoiceFallback: false,
        questionAudioError: "Could not play audio.",
      }),
    ).toBe("Text fallback");
  });

  it("does not treat missing realtime token as guided voice fallback", () => {
    expect(
      getRealtimeTokenFallbackReason({
        interviewMode: "guided",
        realtimeEnabled: false,
        clientSecret: null,
        reason: "OPENAI_API_KEY is not set",
      }),
    ).toBeNull();
  });

  it("treats missing realtime token as live realtime fallback", () => {
    expect(
      getRealtimeTokenFallbackReason({
        interviewMode: "realtime",
        realtimeEnabled: false,
        clientSecret: null,
        reason: "OPENAI_API_KEY is not set",
      }),
    ).toBe("OPENAI_API_KEY is not set");
  });

  it("replaces raw audio request timeout errors with a user-facing fallback message", () => {
    expect(
      getQuestionAudioErrorMessage(
        { code: "ECONNABORTED", message: "timeout of 15000ms exceeded" },
        "Could not play the interviewer voice.",
      ),
    ).toBe(
      "The interviewer voice took too long to load. Continue with the visible question.",
    );
  });

  it("does not request guided question audio for live realtime mode", () => {
    expect(shouldRequestQuestionAudio("realtime")).toBe(false);
    expect(shouldRequestQuestionAudio("guided")).toBe(true);
  });

  it("speaks the backend interviewer bridge and official question when realtime starts", () => {
    const session = { speakOfficialQuestion: vi.fn() };

    expect(
      speakOfficialRealtimeQuestion(
        session,
        "  Describe a backend API you built.  ",
        "en",
        "Thanks, let's go deeper.",
      ),
    ).toBe(true);

    expect(session.speakOfficialQuestion).toHaveBeenCalledWith(
      "Thanks, let's go deeper.\n\nDescribe a backend API you built.",
      "en",
    );
  });

  it("ignores empty realtime official questions", () => {
    const session = { speakOfficialQuestion: vi.fn() };

    expect(speakOfficialRealtimeQuestion(session, "   ", "vi")).toBe(false);

    expect(session.speakOfficialQuestion).not.toHaveBeenCalled();
  });

  it("builds a server-owned realtime /turn payload from transcript audio", () => {
    expect(
      buildServerOwnedRealtimeTurnRequest({
        sessionId: "session-1",
        transcript: "  I used Postgres transactions.  ",
        durationSeconds: 42,
      }),
    ).toEqual({
      sessionId: "session-1",
      userAnswer: "I used Postgres transactions.",
      userTranscript: "I used Postgres transactions.",
      modality: "AUDIO",
      durationSeconds: 42,
    });
  });

  it("does not auto-submit noisy realtime transcripts", () => {
    const base = {
      sessionId: "session-1",
      currentQuestion: "Describe a REST API you built.",
    };

    expect(
      buildValidatedRealtimeTurnRequest({
        ...base,
        transcript: "test",
      }),
    ).toBeNull();
    expect(
      buildValidatedRealtimeTurnRequest({
        ...base,
        transcript: "Describe a REST API you built.",
      }),
    ).toBeNull();
    expect(
      buildValidatedRealtimeTurnRequest({
        ...base,
        transcript:
          "Cuá»™c phá»ng váº¥n báº±ng tiáº¿ng Viá»‡t. English interview. Preserve technical terms.",
      }),
    ).toBeNull();
  });

  it("auto-submits meaningful realtime transcripts", () => {
    expect(
      buildValidatedRealtimeTurnRequest({
        sessionId: "session-1",
        currentQuestion: "Describe a REST API you built.",
        transcript:
          "I built a REST API with validation, authentication, and Postgres transactions.",
        durationSeconds: 37,
      }),
    ).toEqual({
      sessionId: "session-1",
      userAnswer:
        "I built a REST API with validation, authentication, and Postgres transactions.",
      userTranscript:
        "I built a REST API with validation, authentication, and Postgres transactions.",
      modality: "AUDIO",
      durationSeconds: 37,
    });
  });

  it("builds one realtime /turn payload from multiple buffered STT final transcripts", () => {
    expect(
      buildBufferedRealtimeTurnRequest({
        sessionId: "session-1",
        currentQuestion: "Describe a REST API you built.",
        transcripts: [
          "I built a REST API with authentication",
          "and added Postgres transactions plus validation.",
        ],
        durationSeconds: 52,
      }),
    ).toEqual({
      sessionId: "session-1",
      userAnswer:
        "I built a REST API with authentication and added Postgres transactions plus validation.",
      userTranscript:
        "I built a REST API with authentication and added Postgres transactions plus validation.",
      modality: "AUDIO",
      durationSeconds: 52,
    });
  });

  it("classifies realtime command transcripts before deciding whether to submit /turn", () => {
    expect(classifyRealtimeTranscriptIntent("nhắc lại câu hỏi giúp em")).toBe(
      "repeat_question",
    );
    expect(classifyRealtimeTranscriptIntent("ý câu này là sao vậy")).toBe(
      "clarify_question",
    );
    expect(classifyRealtimeTranscriptIntent("skip câu này")).toBe(
      "skip_question",
    );
    expect(classifyRealtimeTranscriptIntent("tạm dừng chút")).toBe("pause");
    expect(classifyRealtimeTranscriptIntent("kết thúc phỏng vấn")).toBe(
      "end_interview",
    );
    expect(
      classifyRealtimeTranscriptIntent(
        "I built a REST API with authentication and validation.",
      ),
    ).toBe("answer");
  });

  it.each([
    [
      {
        isLiveRealtime: true,
        isLoading: false,
        isInterviewerSpeaking: false,
        isMicActive: true,
      },
      "listening",
    ],
    [
      {
        isLiveRealtime: true,
        isLoading: false,
        isInterviewerSpeaking: false,
        isMicActive: false,
      },
      "paused",
    ],
    [
      {
        isLiveRealtime: true,
        isLoading: true,
        isInterviewerSpeaking: false,
        isMicActive: false,
      },
      "submitting",
    ],
    [
      {
        isLiveRealtime: true,
        isLoading: false,
        isInterviewerSpeaking: true,
        isMicActive: false,
      },
      "interviewerSpeaking",
    ],
    [
      {
        isLiveRealtime: false,
        isLoading: false,
        isInterviewerSpeaking: false,
        isMicActive: false,
      },
      "manual",
    ],
  ] as const)("derives realtime mic status %s", (input, expected) => {
    expect(getRealtimeMicStatusKey(input)).toBe(expected);
  });

  it("does not submit blank realtime transcripts", () => {
    expect(
      buildServerOwnedRealtimeTurnRequest({
        sessionId: "session-1",
        transcript: "   ",
      }),
    ).toBeNull();
  });

  it("invalidates stale question audio requests", () => {
    const guard = createQuestionAudioRequestGuard();
    const first = guard.next();
    const second = guard.next();

    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);

    guard.invalidate();
    expect(guard.isCurrent(second)).toBe(false);
  });

  it("requests live closing once when realtime is near the time limit", () => {
    expect(
      shouldRequestLiveClosingSignal({
        interviewMode: "realtime",
        isVoiceFallback: false,
        isLiveConnected: true,
        secondsRemaining: 45,
        alreadyRequested: false,
      }),
    ).toBe(true);
    expect(
      shouldRequestLiveClosingSignal({
        interviewMode: "realtime",
        isVoiceFallback: false,
        isLiveConnected: true,
        secondsRemaining: 44,
        alreadyRequested: true,
      }),
    ).toBe(false);
    expect(
      shouldRequestLiveClosingSignal({
        interviewMode: "guided",
        isVoiceFallback: false,
        isLiveConnected: true,
        secondsRemaining: 45,
        alreadyRequested: false,
      }),
    ).toBe(false);
  });

  it("flags CJK and leaked transcription prompt fragments in live transcripts", () => {
    expect(
      getLiveTranscriptWarnings(
        "第一张原有很不流动来的求接下午. Em có làm API backend.",
      ),
    ).toContain("cjk");
    expect(
      getLiveTranscriptWarnings(
        "Cuộc phỏng vấn bằng tiếng Việt. Giữ nguyên dấu tiếng Việt và các thuật ngữ kỹ thuật tiếng Anh như React, TypeScript và API.",
      ),
    ).toContain("promptLeak");
    expect(
      getLiveTranscriptWarnings("Em dùng React, TypeScript và API Gateway."),
    ).toEqual([]);
  });

  it("builds the start interview request with voice and speed settings", () => {
    expect(
      buildInterviewStartRequest({
        selectedCvId: null,
        selectedMatchId: "match-1",
        targetRole: "frontend_developer",
        selectedLanguage: "vi",
        interviewMode: "realtime",
        interviewType: "mixed",
        voice: "coral",
        speechSpeed: 1.3,
      }),
    ).toMatchObject({
      cvId: undefined,
      cvMatchId: "match-1",
      targetRole: "frontend_developer",
      language: "vi",
      mode: "VOICE",
      interviewType: "MIXED",
      voice: "coral",
      speechSpeed: 1.3,
    });
  });

  it("reads and writes interview voice preferences safely", () => {
    const storage = new MemoryStorage();

    expect(readInterviewVoicePreference(storage)).toEqual({
      voice: "marin",
      speechSpeed: 1.15,
    });

    writeInterviewVoicePreference(storage, { voice: "sage", speechSpeed: 1.3 });

    expect(readInterviewVoicePreference(storage)).toEqual({
      voice: "sage",
      speechSpeed: 1.3,
    });
  });
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
