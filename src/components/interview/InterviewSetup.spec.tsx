// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
      tipsExpanded={false}
      setTipsExpanded={vi.fn()}
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
  it("shows an inline CV upload CTA while role-only interview remains available", () => {
    renderSetup();

    expect(
      screen.getByRole("button", { name: "interview.setup.uploadCvCta" }),
    ).toBeInTheDocument();
    expect(screen.getByText("interview.setup.roleOnlyStillAvailable")).toBeInTheDocument();
  });

  it("locks JD upload until a CV is selected", () => {
    renderSetup();

    expect(screen.getByText("interview.setup.jdRequiresCv")).toBeInTheDocument();
  });

  it("shows Add JD context when a selected CV has no saved matches", () => {
    renderSetup({
      cvItems: [
        {
          id: "cv-1",
          title: "Frontend CV",
          originalFileName: "frontend.pdf",
          targetRole: "frontend_developer",
          createdAt: "2026-06-12T10:00:00.000Z",
        } as never,
      ],
      selectedCvId: "cv-1",
    });

    expect(
      screen.getByRole("button", { name: "interview.setup.addJdContext" }),
    ).toBeInTheDocument();
  });
});
