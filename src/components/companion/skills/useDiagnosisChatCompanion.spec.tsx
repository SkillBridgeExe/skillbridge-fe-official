// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CHAT_CONTEXT_ID, useDiagnosisChatCompanion } from "./useDiagnosisChatCompanion";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { askDiagnosisChat, deleteChatThread } from "@/services/diagnosis.service";
import { OPEN_ROADMAP_WIZARD_EVENT, OPEN_TAILOR_REWRITE_EVENT } from "./chat-action-events";
import type { CvReviewData, ProgressReportDto, GapTransitionDto } from "@shared/api";
import type { DiagnosisChatFocus } from "@/types/companion";

// Echo the i18n key for openers (so we can assert which FOCUS opener was selected),
// and return a 3-item array for the focus-aware chip set.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key.includes("suggestionsByFocus")) return ["q1", "q2", "q3"];
      if (key === "companion.chat.continuity") return `continue:${params?.topic ?? ""}`;
      if (key === "companion.chat.proveitChip") return `prove:${params?.skill ?? ""}`;
      if (key === "companion.chat.proveitIntro") return `intro:${params?.skill ?? ""}`;
      return key;
    },
    i18n: { language: "en" },
  }),
}));

vi.mock("@/services/diagnosis.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/diagnosis.service")>();
  return {
    ...actual,
    askDiagnosisChat: vi.fn().mockResolvedValue({ answer: "ok" }),
    deleteChatThread: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
  useCompanionStore.getState().resetCompanion();
  useCvBuilderStore.getState().reset();
  useDiagnosisStore.getState().reset();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const reviewData = { overallScore: 80, dimensions: [] } as unknown as CvReviewData;
const reviewWithMatch = {
  overallScore: 80,
  dimensions: [],
  jdMatch: { matchId: "match-1" },
} as unknown as CvReviewData;

const proveIt = {
  skill_canonical: "react",
  display_name: "React",
} as unknown as import("@shared/api").EvidenceItem;

function mkTransition(kind: GapTransitionDto["kind"]): GapTransitionDto {
  return {
    canonical_name: "react",
    display_name: "React",
    prev_status: "missing",
    curr_status: "matched",
    kind,
    prev_severity: 3,
    curr_severity: 0,
  };
}

function mkProgress(overrides: Partial<ProgressReportDto>): ProgressReportDto {
  return {
    baseline: false,
    prev_count: 1,
    curr_count: 0,
    gaps_closed: [],
    gaps_worsened: [],
    avg_severity_delta: 0,
    prev_score: 60,
    curr_score: 80,
    transitions: [],
    dimension_changes: [],
    evidence_recognized: [],
    strengths_kept: [],
    required_coverage_delta: null,
    template_changed: false,
    ...overrides,
  };
}

function Harness({
  focus,
  progress,
  data = reviewData,
}: {
  focus: DiagnosisChatFocus;
  progress?: ProgressReportDto | null;
  data?: CvReviewData;
}) {
  useDiagnosisChatCompanion(data, focus, undefined, "cv-1", progress);
  return null;
}

describe("useDiagnosisChatCompanion — focus drives store-backed opener/chips", () => {
  it("pushes a cv_audit opener + 3 chips into the store on mount", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="cv_audit" />
      </QueryClientProvider>,
    );
    const s = useCompanionStore.getState();
    expect(s.chatOpener).toContain("cv_audit");
    expect(s.chatSuggestions).toHaveLength(3);
  });

  it("repaints opener + chips when focus changes (the tab-switch fix)", () => {
    const qc = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <Harness focus="cv_audit" />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatOpener).toContain("cv_audit");

    rerender(
      <QueryClientProvider client={qc}>
        <Harness focus="market_careers" />
      </QueryClientProvider>,
    );
    // Without the store push + shell subscription, this would still read "cv_audit".
    expect(useCompanionStore.getState().chatOpener).toContain("market_careers");
    expect(useCompanionStore.getState().chatSuggestions).toHaveLength(3);
  });

  it("clears the opener + chips on unmount (leaving the diagnosis tab)", () => {
    const qc = new QueryClient();
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatOpener).toContain("gap_results");
    unmount();
    expect(useCompanionStore.getState().chatOpener).toBeNull();
    expect(useCompanionStore.getState().chatSuggestions).toHaveLength(0);
  });
});

describe("useDiagnosisChatCompanion — progress-aware chip", () => {
  it("prepends the progress chip when a closed/improved transition exists since baseline", () => {
    const qc = new QueryClient();
    const progress = mkProgress({ transitions: [mkTransition("closed")] });
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" progress={progress} />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatSuggestions).toContain("companion.chat.progressChip");
  });

  it("does NOT add the chip on a baseline report", () => {
    const qc = new QueryClient();
    const progress = mkProgress({ baseline: true, transitions: [mkTransition("closed")] });
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" progress={progress} />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatSuggestions).not.toContain("companion.chat.progressChip");
  });

  it("does NOT add the chip when progress is null (no closed/improved transitions to report)", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" progress={null} />
      </QueryClientProvider>,
    );
    expect(useCompanionStore.getState().chatSuggestions).not.toContain("companion.chat.progressChip");
  });

  it("exposes sendQuestion so callers can prefill + send a question", () => {
    const qc = new QueryClient();
    let api: { sendQuestion: (q: string) => void } | undefined;
    function CaptureHarness() {
      api = useDiagnosisChatCompanion(reviewData, "gap_results", undefined, "cv-1");
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <CaptureHarness />
      </QueryClientProvider>,
    );
    expect(typeof api?.sendQuestion).toBe("function");
  });
});

describe("useDiagnosisChatCompanion — persisted thread memory", () => {
  it("seeds persisted turns when the local chat is empty and uses a continuity opener", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["chat-thread", "match-1"], {
      turns: [
        { role: "user", text: "Why is React weak?", ts: "2026-07-02T00:00:00.000Z" },
        { role: "assistant", text: "Because the evidence is thin.", ts: "2026-07-02T00:00:01.000Z" },
      ],
    });
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" data={reviewWithMatch} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages).toEqual([
        { role: "user", text: "Why is React weak?" },
        { role: "assistant", text: "Because the evidence is thin." },
      ]);
    });
    expect(useCompanionStore.getState().chatOpener).toBe("continue:Why is React weak?");
  });

  it("does not overwrite an active local chat with persisted turns", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["chat-thread", "match-1"], {
      turns: [{ role: "user", text: "old server q", ts: "2026-07-02T00:00:00.000Z" }],
    });
    useCompanionStore.getState().appendChatMessage({ role: "user", text: "live draft" });

    render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" data={reviewWithMatch} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages).toEqual([{ role: "user", text: "live draft" }]);
    });
  });

  it("excludes local-only messages from the thread sent to the diagnosis chat API", async () => {
    const qc = new QueryClient();
    let api: { sendQuestion: (q: string) => void } | undefined;
    function CaptureHarness() {
      api = useDiagnosisChatCompanion(reviewWithMatch, "gap_results", undefined, "cv-1");
      return null;
    }
    useCompanionStore.getState().seedChatMessages([
      { role: "assistant", text: "continue locally", local: true },
      { role: "user", text: "real previous question" },
    ]);

    render(
      <QueryClientProvider client={qc}>
        <CaptureHarness />
      </QueryClientProvider>,
    );

    api?.sendQuestion("next question");

    await waitFor(() => {
      expect(askDiagnosisChat).toHaveBeenCalled();
    });
    expect(vi.mocked(askDiagnosisChat).mock.calls[0]?.[0].thread).toEqual([
      { role: "user", text: "real previous question" },
    ]);
  });

  it("clears stale cached turns when deleting a persisted thread", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["chat-thread", "match-1"], {
      turns: [{ role: "user", text: "old server q", ts: "2026-07-02T00:00:00.000Z" }],
    });
    render(
      <QueryClientProvider client={qc}>
        <Harness focus="gap_results" data={reviewWithMatch} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages).toEqual([{ role: "user", text: "old server q" }]);
    });

    const turn = useCompanionStore.getState().contexts[CHAT_CONTEXT_ID]?.getTurn();
    const onDeleteThread = turn?.props.onDeleteThread as () => void;
    onDeleteThread();

    await waitFor(() => {
      expect(deleteChatThread).toHaveBeenCalledWith("match-1");
      expect(useCompanionStore.getState().chatMessages).toEqual([]);
    });
    expect(qc.getQueryData(["chat-thread", "match-1"])).toEqual({ turns: [] });
  });
});

describe("useDiagnosisChatCompanion — tool citation metadata", () => {
  it("stores cited_tool from the BE answer so the chat bubble can show a verification chip", async () => {
    const qc = new QueryClient();
    vi.mocked(askDiagnosisChat).mockResolvedValueOnce({
      answer: "Mình đã kiểm tra GitHub public repos cho bạn.",
      cited_tool: "github.enrich",
    });
    let api: { sendQuestion: (q: string) => void } | undefined;
    function CaptureHarness() {
      api = useDiagnosisChatCompanion(reviewWithMatch, "gap_results", undefined, "cv-1");
      return null;
    }

    render(
      <QueryClientProvider client={qc}>
        <CaptureHarness />
      </QueryClientProvider>,
    );

    api?.sendQuestion("github tôi có gì?");

    await waitFor(() => {
      const messages = useCompanionStore.getState().chatMessages;
      expect(messages[messages.length - 1]).toMatchObject({
        role: "assistant",
        text: "Mình đã kiểm tra GitHub public repos cho bạn.",
        citedTool: "github.enrich",
      });
    });
  });
});

describe("useDiagnosisChatCompanion — chat action dispatch", () => {
  it("jumps immediately for jump chips and stores rewrite/roadmap chips for confirmation", () => {
    const qc = new QueryClient();
    const reveal = vi.fn();
    function ActionHarness() {
      useDiagnosisChatCompanion(reviewWithMatch, "gap_results", reveal, "cv-1");
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <ActionHarness />
      </QueryClientProvider>,
    );

    const turn = useCompanionStore.getState().contexts[CHAT_CONTEXT_ID]?.getTurn();
    const onAction = turn?.props.onAction as (chip: {
      kind: "jump" | "rewrite" | "roadmap";
      labelKey: string;
      anchorId?: string;
      rewrite?: { action: { before: string } };
    }) => void;

    onAction({ kind: "jump", labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" });
    expect(reveal).toHaveBeenCalledWith("gap-req-1");
    expect(useCompanionStore.getState().chatPendingAction).toBeNull();

    const rewriteChip = {
      kind: "rewrite" as const,
      labelKey: "companion.chat.chipRewriteHere",
      rewrite: { action: { before: "old bullet" } },
    };
    onAction(rewriteChip);
    expect(useCompanionStore.getState().chatPendingAction).toEqual(rewriteChip);

    const onCancelAction = turn?.props.onCancelAction as () => void;
    onCancelAction();
    expect(useCompanionStore.getState().chatPendingAction).toBeNull();
  });

  it("switches to results before confirming rewrite and roadmap page-level events", () => {
    vi.useFakeTimers();
    const qc = new QueryClient();
    const reveal = vi.fn();
    const tailorHandler = vi.fn();
    const roadmapHandler = vi.fn();
    window.addEventListener(OPEN_TAILOR_REWRITE_EVENT, tailorHandler);
    window.addEventListener(OPEN_ROADMAP_WIZARD_EVENT, roadmapHandler);

    function ActionHarness() {
      useDiagnosisChatCompanion(reviewWithMatch, "gap_results", reveal, "cv-1");
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <ActionHarness />
      </QueryClientProvider>,
    );

    const turn = useCompanionStore.getState().contexts[CHAT_CONTEXT_ID]?.getTurn();
    const onAction = turn?.props.onAction as (chip: {
      kind: "rewrite" | "roadmap";
      labelKey: string;
      rewrite?: { action: { action_id: string } };
    }) => void;
    const onConfirmAction = turn?.props.onConfirmAction as () => void;

    onAction({
      kind: "rewrite",
      labelKey: "companion.chat.chipRewriteHere",
      rewrite: { action: { action_id: "deepen:react" } },
    });
    onConfirmAction();
    expect(useDiagnosisStore.getState().step).toBe("results");
    expect(tailorHandler).not.toHaveBeenCalled();
    vi.runOnlyPendingTimers();
    expect(reveal).toHaveBeenCalledWith("tailor-deepen:react");
    expect(tailorHandler).toHaveBeenCalledTimes(1);
    expect((tailorHandler.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ actionId: "deepen:react" });
    expect(useCompanionStore.getState().chatPendingAction).toBeNull();

    onAction({ kind: "roadmap", labelKey: "companion.chat.chipRoadmap" });
    onConfirmAction();
    vi.runOnlyPendingTimers();
    expect(reveal).toHaveBeenCalledWith("roadmap-anchor");
    expect(roadmapHandler).toHaveBeenCalledTimes(1);

    window.removeEventListener(OPEN_TAILOR_REWRITE_EVENT, tailorHandler);
    window.removeEventListener(OPEN_ROADMAP_WIZARD_EVENT, roadmapHandler);
    vi.useRealTimers();
  });

  it("turns the prove-it suggestion into local coach messages without calling the chat API", () => {
    const qc = new QueryClient();
    function ProveItHarness() {
      useDiagnosisChatCompanion(reviewWithMatch, "gap_results", undefined, "cv-1", null, proveIt);
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <ProveItHarness />
      </QueryClientProvider>,
    );

    expect(useCompanionStore.getState().chatSuggestions).toContain("prove:React");
    const turn = useCompanionStore.getState().contexts[CHAT_CONTEXT_ID]?.getTurn();
    const onSuggestionTap = turn?.props.onSuggestionTap as (q: string) => void;
    onSuggestionTap("prove:React");

    expect(askDiagnosisChat).not.toHaveBeenCalled();
    expect(useCompanionStore.getState().chatMessages).toEqual([
      { role: "user", text: "prove:React", local: true },
      {
        role: "assistant",
        text: "intro:React",
        local: true,
        actions: [
          {
            kind: "prove_it",
            labelKey: "companion.chat.proveitCta",
            proveIt: { canonical: "react", displayName: "React" },
          },
        ],
      },
    ]);
  });

  it("dispatches prove-it action to the CV Builder pending target", () => {
    const qc = new QueryClient();
    function ProveItHarness() {
      useDiagnosisChatCompanion(reviewWithMatch, "gap_results", undefined, "cv-1", null, proveIt);
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <ProveItHarness />
      </QueryClientProvider>,
    );

    const turn = useCompanionStore.getState().contexts[CHAT_CONTEXT_ID]?.getTurn();
    const onAction = turn?.props.onAction as (chip: {
      kind: "prove_it";
      labelKey: string;
      proveIt: { canonical: string; displayName: string };
    }) => void;

    onAction({
      kind: "prove_it",
      labelKey: "companion.chat.proveitCta",
      proveIt: { canonical: "react", displayName: "React" },
    });

    expect(useDiagnosisStore.getState().step).toBe("builder");
    expect(useCvBuilderStore.getState().activeSection).toBe(4);
    expect(useCvBuilderStore.getState().pendingProveIt).toEqual({ canonical: "react", displayName: "React" });
    expect(useCompanionStore.getState().chatPendingAction).toBeNull();
  });
});
