// @vitest-environment jsdom
import { createRef, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { InterviewSession } from "./InterviewSession";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "interview.session.answered") {
        return `Answered ${String(options?.count ?? 0)}`;
      }
      if (key === "interview.session.left") {
        return `${String(options?.count ?? 0)} left`;
      }
      if (key === "interview.session.mode.liveRealtime") {
        return "Live Realtime";
      }
      if (key === "interview.session.questionMeta.bankKey") {
        return `Bank key ${String(options?.key ?? "")}`;
      }
      return key;
    },
  }),
}));

Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderSession(
  overrides: Partial<ComponentProps<typeof InterviewSession>> = {},
) {
  return render(
    <InterviewSession
      videoRef={createRef<HTMLVideoElement>()}
      webcamError={null}
      timeRemainingLabel="05:00"
      secondsRemaining={300}
      maxDurationSeconds={600}
      currentQuestionNumber={5}
      totalQuestionsPlanned={6}
      answeredCount={5}
      isEnding={false}
      interviewMode="realtime"
      isLiveConnected
      isVoiceFallback={false}
      voiceFallbackReason={null}
      isMicActive
      isAiSpeaking={false}
      isQuestionAudioPlaying={false}
      questionAudioError={null}
      currentQuestion="How do you decide between local state and server state?"
      currentQuestionMeta={{
        topicPhase: "SKILL_PROBE",
        skillCanonical: "react",
        currentThread: "React state",
        questionBankKey: "frontend_developer.skill.01",
        sourceKind: "curated",
      }}
      chatHistory={[
        {
          role: "ai",
          content: "How do you manage state in React?",
          timestamp: new Date("2026-06-12T00:00:00.000Z"),
        },
      ]}
      isLoading={false}
      userAnswer=""
      setUserAnswer={vi.fn()}
      handleSubmitAnswer={vi.fn()}
      toggleLiveMic={vi.fn()}
      interviewFinished={false}
      onStop={vi.fn()}
      apiError={null}
      {...overrides}
    />,
  );
}

describe("InterviewSession", () => {
  it("shows answered count instead of planned question denominator in live interview", () => {
    renderSession();

    expect(screen.getByText("Answered 5")).toBeInTheDocument();
    expect(screen.queryByText("Q5/6")).not.toBeInTheDocument();
    expect(screen.queryByText("1 left")).not.toBeInTheDocument();
  });

  it("hides question bank metadata from the live interview surface", () => {
    renderSession();

    expect(
      screen.queryByText("interview.session.questionMeta.title"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("interview.session.questionMeta.curated"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Bank key frontend_developer.skill.01")).not.toBeInTheDocument();
  });

  it("keeps the self-camera primary and renders the compact V2 interviewer stage", () => {
    const { container } = renderSession({
      engineVersion: "V2",
      experienceMode: "MOCK",
      realtimeVoiceState: "LISTENING",
      realtimeSubtitle: "I am listening.",
    });

    expect(container.querySelector("video")).toBeInTheDocument();
    expect(screen.getAllByText("Alex · AI Interviewer").length).toBeGreaterThan(0);
    expect(screen.getByText("05:00")).toBeInTheDocument();
    expect(
      screen.getByText("How do you decide between local state and server state?"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gợi ý" })).not.toBeInTheDocument();
  });

  it("shows coaching controls only in Practice V2", () => {
    renderSession({
      engineVersion: "V2",
      experienceMode: "PRACTICE",
      realtimeVoiceState: "THINKING",
    });

    expect(screen.getByRole("button", { name: "Gợi ý" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nhận xét nhanh" })).toBeInTheDocument();
  });
});
