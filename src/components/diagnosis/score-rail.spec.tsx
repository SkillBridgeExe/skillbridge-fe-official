// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ScoreRail } from "./report/ScoreRail";
import type { CheckGroupData } from "@/lib/diagnosis-report";

// ── Mocks ──

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      // Return the key itself for most cases; for known keys return test-friendly labels
      if (key === "match.band.strong") return "Strong match";
      if (key === "match.band.moderate") return "Partial match";
      if (key === "match.band.low") return "Low match";
      if (key === "review.band.strong") return "Strong";
      if (key === "review.band.watch") return "Watch";
      if (key === "review.band.priority") return "Priority fix";
      if (key === "review.matchScoreTitle") return "CV–JD match score";
      if (key === "report.rail.matchScoreTitle") return "JD match score";
      if (key === "review.overallScore") return "Overall CV score";
      if (key === "report.rail.askCompanion") return "Ask your AI coach";
      if (key === "report.rail.downloadCv") return "Download original CV";
      if (key === "report.rail.matchCoverage") return "Required coverage";
      if (key === "results.matched") return "Matched";
      if (key === "results.partial") return "Partial";
      if (key === "results.missing") return "Missing";
      if (key === "report.rail.unnormalizedChip") {
        return `Scored ${opts?.scored}/${opts?.total} readable requirements — ${opts?.unscored} out-of-scope requirements could not be evaluated`;
      }
      if (opts?.defaultValue) return opts.defaultValue;
      return key;
    },
  }),
}));

// Stub the companion store
const mockActivateContext = vi.fn();
const mockOpenBubble = vi.fn();
vi.mock("@/store/useCompanionStore", () => ({
  useCompanionStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        activateContext: mockActivateContext,
        openBubble: mockOpenBubble,
      }),
    {
      getState: () => ({
        activeId: null,
        activateContext: mockActivateContext,
        openBubble: mockOpenBubble,
      }),
    },
  ),
}));

vi.mock("@/store/useDiagnosisStore", () => {
  const state = { lastCvId: null, step: "results" };
  return {
    useDiagnosisStore: (selector?: (s: Record<string, unknown>) => unknown) =>
      selector ? selector(state) : state,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/services/diagnosis.service", () => ({
  triggerCvDownload: vi.fn(),
}));

vi.mock("@/components/companion/skills/useDiagnosisChatCompanion", () => ({
  CHAT_CONTEXT_ID: "diagnosis:chat",
}));

// Stub FitBadge to avoid importing full dependency tree.
// NOTE: vi.mock resolves relative to THIS spec file — ScoreRail (in report/) imports
// "../FitBadge", which from here is "./FitBadge".
vi.mock("./FitBadge", () => ({
  FitBadge: ({ fit }: { fit: { verdict: string } }) => (
    <span data-testid="fit-badge">{fit.verdict}</span>
  ),
}));

// ── Helpers ──

const reviewGroups: CheckGroupData[] = [
  { id: "ats", label: "ATS compatibility", issueCount: 2, items: [] },
  { id: "content", label: "Content optimization", issueCount: 0, items: [] },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Tests ──

describe("ScoreRail — review mode (no matchStats)", () => {
  it("uses the diagnosis scroll container without a second mobile top offset and keeps desktop actions scrollable", () => {
    render(<ScoreRail overallScore={75} groups={reviewGroups} />);

    expect(screen.getByTestId("score-rail-mobile")).toHaveClass("top-0");
    expect(screen.getByTestId("score-rail-desktop")).toHaveClass("overflow-y-auto", "min-h-0");
  });

  it("renders review band labels (70/50 thresholds)", () => {
    render(<ScoreRail overallScore={75} groups={reviewGroups} />);
    // 75 >= 70 → "Strong" in review mode
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("renders category rows with issue counts", () => {
    render(<ScoreRail overallScore={60} groups={reviewGroups} />);
    // Review mode shows group navigation in BOTH the mobile chip bar and the category rows
    expect(screen.getAllByText("ATS compatibility").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Content optimization").length).toBeGreaterThan(0);
  });

  it("renders review score title", () => {
    render(<ScoreRail overallScore={50} groups={reviewGroups} />);
    expect(screen.getByText("Overall CV score")).toBeInTheDocument();
  });

  it("does not render CV-JD-only numbers without matchStats", () => {
    render(<ScoreRail overallScore={50} groups={reviewGroups} />);
    expect(screen.queryByText("Matched")).toBeNull();
    expect(screen.queryByText("Partial")).toBeNull();
    expect(screen.queryByText("Missing")).toBeNull();
    expect(screen.queryByText("Required coverage")).toBeNull();
    expect(screen.queryByTestId("fit-badge")).toBeNull();
  });
});

describe("ScoreRail — match mode (with matchStats)", () => {
  const matchStats = {
    matched: 5,
    partial: 2,
    missing: 3,
    coveragePercent: 72,
    fitVerdict: { verdict: "stretch" as const, reasons: ["MID_SCORE" as const] },
  };

  it("renders match-mode band label (80/60 thresholds)", () => {
    // 72 >= 60 → "Partial match" in match mode
    render(<ScoreRail overallScore={72} groups={reviewGroups} matchStats={matchStats} />);
    expect(screen.getAllByText("Partial match").length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render review category rows", () => {
    render(<ScoreRail overallScore={72} groups={reviewGroups} matchStats={matchStats} />);
    expect(screen.queryByText("ATS compatibility")).toBeNull();
    expect(screen.queryByText("Content optimization")).toBeNull();
  });

  it("renders match stats (matched/partial/missing counts)", () => {
    render(<ScoreRail overallScore={72} groups={reviewGroups} matchStats={matchStats} />);
    expect(screen.getAllByText("5")[0]).toBeInTheDocument();
    expect(screen.getAllByText("2")[0]).toBeInTheDocument();
    expect(screen.getAllByText("3")[0]).toBeInTheDocument();
  });

  it("renders coverage percent", () => {
    render(<ScoreRail overallScore={72} groups={reviewGroups} matchStats={matchStats} />);
    expect(screen.getByText("72%")).toBeInTheDocument();
  });

  it("renders FitBadge when fitVerdict is provided", () => {
    render(<ScoreRail overallScore={72} groups={reviewGroups} matchStats={matchStats} />);
    expect(screen.getByTestId("fit-badge")).toBeInTheDocument();
  });

  it("renders match score title instead of review title", () => {
    render(<ScoreRail overallScore={72} groups={reviewGroups} matchStats={matchStats} />);
    expect(screen.getByText("CV–JD match score")).toBeInTheDocument();
    expect(screen.queryByText("Overall CV score")).toBeNull();
  });
});

describe("ScoreRail — unnormalized requirements chip", () => {
  it("shows unnormalized warning chip when requirements exist", () => {
    const stats = {
      matched: 3,
      partial: 1,
      missing: 2,
      unnormalizedRequirements: ["Docker", "Kubernetes", "Terraform"],
    };
    render(<ScoreRail overallScore={50} groups={reviewGroups} matchStats={stats} />);
    // Scored 6/9 readable requirements — 3 out-of-scope
    expect(
      screen.getByText(/6\/9 readable requirements.*3 out-of-scope/),
    ).toBeInTheDocument();
  });

  it("expands to show requirement names on click", () => {
    const stats = {
      matched: 3,
      partial: 1,
      missing: 2,
      unnormalizedRequirements: ["Docker", "Kubernetes"],
    };
    render(<ScoreRail overallScore={50} groups={reviewGroups} matchStats={stats} />);
    // Click the chip to expand
    const chip = screen.getByText(/6\/8 readable requirements/);
    fireEvent.click(chip);
    expect(screen.getByText("Docker")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
  });

  it("does NOT show chip when unnormalized array is empty", () => {
    const stats = {
      matched: 3,
      partial: 1,
      missing: 2,
      unnormalizedRequirements: [],
    };
    render(<ScoreRail overallScore={50} groups={reviewGroups} matchStats={stats} />);
    expect(screen.queryByText(/out-of-scope/)).toBeNull();
  });
});

describe("ScoreRail — handleAskCompanion targets diagnosis:chat", () => {
  it("calls activateContext with diagnosis:chat on button click", () => {
    render(<ScoreRail overallScore={75} groups={reviewGroups} />);
    const btn = screen.getByText("Ask your AI coach");
    fireEvent.click(btn);
    expect(mockActivateContext).toHaveBeenCalledWith("diagnosis:chat");
    expect(mockOpenBubble).toHaveBeenCalled();
  });
});
