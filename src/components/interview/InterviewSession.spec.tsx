// @vitest-environment jsdom
import { createRef, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { InterviewSession } from "./InterviewSession";

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
      isConnected
      isVietnamese={false}
      voiceState="LISTENING"
      voiceLabel="Listening"
      subtitle="I am listening."
      currentQuestion="How do you decide between local state and server state?"
      chatHistory={[
        {
          role: "ai",
          content: "How do you manage state in React?",
          timestamp: new Date("2026-06-12T00:00:00.000Z"),
        },
      ]}
      experienceMode="MOCK"
      isMicActive
      isReconnecting={false}
      isEnding={false}
      forceTextMode={false}
      userAnswer=""
      setUserAnswer={vi.fn()}
      onSubmitText={vi.fn()}
      onToggleMic={vi.fn()}
      onSwitchToText={vi.fn()}
      onIntent={vi.fn()}
      onEnd={vi.fn()}
      apiError={null}
      {...overrides}
    />,
  );
}

describe("InterviewSession", () => {
  it("keeps the self-camera primary and renders the realtime interviewer", () => {
    renderSession();

    const camera = screen.getByRole("region", { name: "Self camera" });
    const interviewer = screen.getByRole("group", {
      name: "Alex AI interviewer",
    });

    expect(camera.querySelector("video")).toBeInTheDocument();
    expect(camera).toContainElement(interviewer);
    expect(screen.getAllByText(/Alex/).length).toBeGreaterThan(0);
    expect(screen.getByText("05:00")).toBeInTheDocument();
    expect(
      screen.getByText("How do you decide between local state and server state?"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hint" })).not.toBeInTheDocument();
  });

  it("hides the current-question card until a question is ready", () => {
    renderSession({ currentQuestion: "" });

    expect(screen.queryByText("Current question")).not.toBeInTheDocument();
  });


  it("renders one End action in the header", () => {
    renderSession();

    expect(screen.getAllByRole("button", { name: "End" })).toHaveLength(1);
  });
  it("shows coaching controls only in Practice", () => {
    renderSession({ experienceMode: "PRACTICE", voiceState: "THINKING" });

    expect(screen.getByRole("button", { name: "Hint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quick feedback" })).toBeInTheDocument();
  });

  it("offers text fallback while reconnecting in the same session", () => {
    renderSession({ isConnected: false, isReconnecting: true });

    expect(screen.getAllByText(/Reconnecting/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Switch to text" })).toBeInTheDocument();
  });

  it("opens the text input automatically after transport falls back", () => {
    renderSession({ isConnected: false, forceTextMode: true });

    expect(screen.getByPlaceholderText(/Type your answer/)).toBeInTheDocument();
  });
});
