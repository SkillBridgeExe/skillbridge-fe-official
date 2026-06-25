// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { InterviewSetup } from "./InterviewSetup";
import { DEFAULT_INTERVIEW_VOICE } from "./types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderSetup(
  overrides: Partial<React.ComponentProps<typeof InterviewSetup>> = {},
) {
  return render(
    <InterviewSetup
      onStart={vi.fn()}
      isLoading={false}
      cvItems={[]}
      selectedCvId={null}
      setSelectedCvId={vi.fn()}
      isCvLoading={false}
      matchItems={[]}
      selectedMatchId={null}
      setSelectedMatchId={vi.fn()}
      isMatchesLoading={false}
      targetRole="frontend_developer"
      setTargetRole={vi.fn()}
      selectedLanguage="vi"
      setSelectedLanguage={vi.fn()}
      interviewMode="realtime"
      setInterviewMode={vi.fn()}
      interviewType="technical"
      setInterviewType={vi.fn()}
      selectedVoice={DEFAULT_INTERVIEW_VOICE}
      setSelectedVoice={vi.fn()}
      speechSpeed={1.15}
      setSpeechSpeed={vi.fn()}
      onUploadCvForInterview={vi.fn()}
      isUploadingCv={false}
      onCreateCvMatchForInterview={vi.fn()}
      isCreatingCvMatch={false}
      {...overrides}
    />,
  );
}

describe("InterviewSetup", () => {
  it("renders progressive context choice cards with three options", () => {
    renderSetup();

    // All three progressive context cards should be visible
    expect(
      screen.getByText("interview.setup.progressive.roleOnly.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("interview.setup.progressive.cv.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("interview.setup.progressive.match.title"),
    ).toBeInTheDocument();
  });

  it("shows CV selection UI when the CV context card is clicked", () => {
    renderSetup();

    // Default is role-only — CV form should not be visible
    expect(
      screen.queryByText("interview.setup.progressive.uploadNewCv"),
    ).not.toBeInTheDocument();

    // Click the CV card to switch context
    fireEvent.click(
      screen.getByText("interview.setup.progressive.cv.title"),
    );

    // Now the CV upload area should appear
    expect(
      screen.getByText("interview.setup.progressive.uploadNewCv"),
    ).toBeInTheDocument();
  });

  it("shows start button and opens tips dialog on click", () => {
    renderSetup();

    const startBtn = screen.getByRole("button", {
      name: "interview.setup.startLiveRealtime",
    });
    expect(startBtn).toBeInTheDocument();

    // Click should open the tips confirmation dialog
    fireEvent.click(startBtn);
    expect(
      screen.getByText("interview.setup.tips.dialogConfirm"),
    ).toBeInTheDocument();
  });
});
