// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CHAT_CONTEXT_ID, useDiagnosisChatCompanion } from "./useDiagnosisChatCompanion";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { askDiagnosisChat, deleteChatThread, loadMatchForChat } from "@/services/diagnosis.service";
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
    loadMatchForChat: vi.fn(),
  };
});

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

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

/**
 * CompanionShell lives at App.tsx:60 — a SIBLING rendered BEFORE <BrowserRouter> (:63), which owns
 * the hook host. So in any batch React renders the shell FIRST, and its getTurn() reads a propsRef
 * written during the host's PREVIOUS render. When a turn settles, the shell re-renders (it subscribes
 * to chatMessages) and captures the onSend closure from the still-in-flight render; the host's own
 * post-settle render refreshes propsRef but never re-renders the shell again. The shell is therefore
 * left holding an onSend whose captured `chatMutation.isPending` is permanently true — every later
 * send/chip-tap returns silently and the chat is dead. The composer LOOKS enabled because the shell
 * derives its disabled flag from the store, not from this closure — two sources of truth for "busy".
 *
 * These tests call onSend the way the shell does — through the registered context's getTurn() — which
 * the plain `Harness` tests never do (they use fresh closures and so cannot see this).
 */
describe("useDiagnosisChatCompanion — onSend must survive a stale capture (the dead-chat bug)", () => {
  const getTurnOnSend = (): ((q: string) => void) =>
    (
      useCompanionStore.getState().contexts[CHAT_CONTEXT_ID].getTurn().props as {
        onSend: (q: string) => void;
      }
    ).onSend;

  it("an onSend captured WHILE a turn is in flight still sends once that turn resolves", async () => {
    const qc = new QueryClient();
    let resolveFirst: ((v: { answer: string }) => void) | undefined;
    vi.mocked(askDiagnosisChat)
      .mockImplementationOnce(
        () => new Promise<{ answer: string }>((r) => { resolveFirst = r; }) as ReturnType<typeof askDiagnosisChat>,
      )
      .mockResolvedValue({ answer: "second" });

    render(
      <QueryClientProvider client={qc}>
        <Harness focus="cv_audit" data={reviewWithMatch} />
      </QueryClientProvider>,
    );

    getTurnOnSend()("q1");
    await waitFor(() => expect(askDiagnosisChat).toHaveBeenCalledTimes(1));

    // The shell re-renders during the in-flight window (a pending row was appended) and
    // captures THIS closure — the one whose chatMutation.isPending is true.
    const staleOnSend = getTurnOnSend();

    resolveFirst!({ answer: "first" });
    await waitFor(() =>
      expect(useCompanionStore.getState().chatMessages.some((m) => m.pending)).toBe(false),
    );

    // The shell got no further re-render, so it still holds staleOnSend. This is the tap.
    staleOnSend("q2");
    await waitFor(() => expect(askDiagnosisChat).toHaveBeenCalledTimes(2));
  });

  it("still refuses a genuine double-send while a turn IS in flight", async () => {
    const qc = new QueryClient();
    vi.mocked(askDiagnosisChat).mockImplementation(
      () => new Promise<{ answer: string }>(() => {}) as ReturnType<typeof askDiagnosisChat>,
    );

    render(
      <QueryClientProvider client={qc}>
        <Harness focus="cv_audit" data={reviewWithMatch} />
      </QueryClientProvider>,
    );

    getTurnOnSend()("q1");
    await waitFor(() => expect(askDiagnosisChat).toHaveBeenCalledTimes(1));

    getTurnOnSend()("q2"); // second tap while the first is still in flight → ignored
    await waitFor(() =>
      expect(useCompanionStore.getState().chatMessages.some((m) => m.pending)).toBe(true),
    );
    expect(askDiagnosisChat).toHaveBeenCalledTimes(1);
  });
});

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

  it("sends only the question — no thread payload (the BE grounds on its own persisted history)", async () => {
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
    const args = vi.mocked(askDiagnosisChat).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(args.question).toBe("next question");
    expect("thread" in args).toBe(false);
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
  
  it("dispatches prove-it action with successful anchor resolution", () => {
    // Setup a document that matches
    useCvBuilderStore.setState({
      experience: [{
        id: "exp-1", company: "A", position: "B", startDate: "", endDate: "",
        description: "Used React to build things", responsibilities: "", achievements: "", aiRewrite: ""
      }],
      draftId: "draft-1"
    });
    
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
    expect(useCvBuilderStore.getState().activeSection).toBe(4); // experience

    // The context should be registered and activated
    const ctx = useCompanionStore.getState().contexts["diagnosis_anchor_fix"];
    expect(ctx).toBeDefined();
    const anchorTurn = ctx?.getTurn();
    expect(anchorTurn?.skill).toBe("cv_builder");
    expect(anchorTurn?.props.fieldPath).toBe("/sections/experience/items/exp-1/description");
    expect(anchorTurn?.props.currentValue).toBe("Used React to build things");
    expect(useCompanionStore.getState().bubbleOpen).toBe(true);
    expect(useCompanionStore.getState().chatPendingAction).toBeNull();
  });
});

describe("useDiagnosisChatCompanion — suggested next-step", () => {
  it("stores suggested_next_step from the BE answer so the bubble can render a follow-up chip", async () => {
    const qc = new QueryClient();
    vi.mocked(askDiagnosisChat).mockResolvedValueOnce({
      answer: "Kỹ năng React của bạn khá tốt.",
      suggested_next_step: "Còn kinh nghiệm thì sao?",
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

    api?.sendQuestion("kỹ năng react của tôi sao rồi?");

    await waitFor(() => {
      const messages = useCompanionStore.getState().chatMessages;
      expect(messages[messages.length - 1]).toMatchObject({
        role: "assistant",
        text: "Kỹ năng React của bạn khá tốt.",
        suggestedNextStep: "Còn kinh nghiệm thì sao?",
      });
    });
  });

  it("leaves suggestedNextStep undefined when the BE answer has none (honest-empty)", async () => {
    const qc = new QueryClient();
    vi.mocked(askDiagnosisChat).mockResolvedValueOnce({ answer: "ok, no follow-up" });
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

    api?.sendQuestion("một câu hỏi khác");

    await waitFor(() => {
      const messages = useCompanionStore.getState().chatMessages;
      expect(messages[messages.length - 1]).toMatchObject({ role: "assistant", text: "ok, no follow-up" });
      expect(messages[messages.length - 1].suggestedNextStep).toBeUndefined();
    });
  });
});

describe("useDiagnosisChatCompanion — cross-JD view_match chip", () => {
  it("stores a view_match chip for confirmation, then loads the cited match in place on confirm", async () => {
    const qc = new QueryClient();
    vi.mocked(loadMatchForChat).mockResolvedValueOnce({
      cvId: "cv-2",
      review: { overallScore: 70, dimensions: [], jdMatch: { matchId: "match-2" } } as unknown as CvReviewData,
    });
    function ActionHarness() {
      useDiagnosisChatCompanion(reviewWithMatch, "gap_results", undefined, "cv-1");
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <ActionHarness />
      </QueryClientProvider>,
    );

    const turn = useCompanionStore.getState().contexts[CHAT_CONTEXT_ID]?.getTurn();
    const onAction = turn?.props.onAction as (chip: {
      kind: "view_match";
      labelKey: string;
      viewMatch: { cvId: string; matchId: string; jdTitle: string | null };
    }) => void;
    const onConfirmAction = turn?.props.onConfirmAction as () => void;

    const chip = {
      kind: "view_match" as const,
      labelKey: "companion.chat.chipViewMatch",
      viewMatch: { cvId: "cv-2", matchId: "match-2", jdTitle: "Backend Engineer" },
    };
    onAction(chip);
    expect(useCompanionStore.getState().chatPendingAction).toEqual(chip);

    onConfirmAction();
    expect(useCompanionStore.getState().chatPendingAction).toBeNull();

    await waitFor(() => {
      expect(loadMatchForChat).toHaveBeenCalledWith({ cvId: "cv-2", matchId: "match-2" });
      expect(useDiagnosisStore.getState().lastCvId).toBe("cv-2");
      expect(useDiagnosisStore.getState().step).toBe("results");
    });
    expect(useDiagnosisStore.getState().reviewData?.jdMatch?.matchId).toBe("match-2");
  });

  it("leaves the current view untouched and toasts a destructive error when loading the cited match fails (não nuốt lỗi)", async () => {
    const qc = new QueryClient();
    vi.mocked(loadMatchForChat).mockRejectedValueOnce(new Error("network"));
    function ActionHarness() {
      useDiagnosisChatCompanion(reviewWithMatch, "gap_results", undefined, "cv-1");
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <ActionHarness />
      </QueryClientProvider>,
    );

    const turn = useCompanionStore.getState().contexts[CHAT_CONTEXT_ID]?.getTurn();
    const onAction = turn?.props.onAction as (chip: {
      kind: "view_match";
      labelKey: string;
      viewMatch: { cvId: string; matchId: string; jdTitle: string | null };
    }) => void;
    const onConfirmAction = turn?.props.onConfirmAction as () => void;

    onAction({
      kind: "view_match",
      labelKey: "companion.chat.chipViewMatch",
      viewMatch: { cvId: "cv-2", matchId: "match-2", jdTitle: null },
    });
    onConfirmAction();

    await waitFor(() => {
      expect(loadMatchForChat).toHaveBeenCalled();
    });
    // No store mutation on a rejected load — the current view stays intact.
    expect(useDiagnosisStore.getState().step).toBe("input");
    expect(useDiagnosisStore.getState().lastCvId).toBeNull();
    // The failure is surfaced, never swallowed (PR#49 "không nuốt lỗi").
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "companion.chat.viewMatchError",
        variant: "destructive",
      });
    });
    // The in-flight flag clears on the reject path too.
    expect(useCompanionStore.getState().chatActionPending).toBe(false);
  });

  it("sets chatActionPending while the view_match load is in flight and clears it on resolve", async () => {
    const qc = new QueryClient();
    let resolveLoad!: (v: { cvId: string; review: CvReviewData }) => void;
    const loadPromise = new Promise<{ cvId: string; review: CvReviewData }>((res) => {
      resolveLoad = res;
    });
    vi.mocked(loadMatchForChat).mockReturnValueOnce(loadPromise);
    function ActionHarness() {
      useDiagnosisChatCompanion(reviewWithMatch, "gap_results", undefined, "cv-1");
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <ActionHarness />
      </QueryClientProvider>,
    );

    const turn = useCompanionStore.getState().contexts[CHAT_CONTEXT_ID]?.getTurn();
    const onAction = turn?.props.onAction as (chip: {
      kind: "view_match";
      labelKey: string;
      viewMatch: { cvId: string; matchId: string; jdTitle: string | null };
    }) => void;
    const onConfirmAction = turn?.props.onConfirmAction as () => void;

    expect(useCompanionStore.getState().chatActionPending).toBe(false);

    onAction({
      kind: "view_match",
      labelKey: "companion.chat.chipViewMatch",
      viewMatch: { cvId: "cv-2", matchId: "match-2", jdTitle: null },
    });
    onConfirmAction();

    // Visible pending feedback: the flag flips true WHILE the fetch is unresolved.
    expect(useCompanionStore.getState().chatActionPending).toBe(true);

    resolveLoad({
      cvId: "cv-2",
      review: { overallScore: 70, dimensions: [], jdMatch: { matchId: "match-2" } } as unknown as CvReviewData,
    });

    await waitFor(() => {
      expect(useCompanionStore.getState().chatActionPending).toBe(false);
    });
  });

  it("guards a duplicate confirm while a view_match load is still in flight", async () => {
    const qc = new QueryClient();
    let resolveLoad!: (v: { cvId: string; review: CvReviewData }) => void;
    const loadPromise = new Promise<{ cvId: string; review: CvReviewData }>((res) => {
      resolveLoad = res;
    });
    vi.mocked(loadMatchForChat).mockReturnValueOnce(loadPromise);
    function ActionHarness() {
      useDiagnosisChatCompanion(reviewWithMatch, "gap_results", undefined, "cv-1");
      return null;
    }
    render(
      <QueryClientProvider client={qc}>
        <ActionHarness />
      </QueryClientProvider>,
    );

    const turn = useCompanionStore.getState().contexts[CHAT_CONTEXT_ID]?.getTurn();
    const onAction = turn?.props.onAction as (chip: {
      kind: "view_match";
      labelKey: string;
      viewMatch: { cvId: string; matchId: string; jdTitle: string | null };
    }) => void;
    const onConfirmAction = turn?.props.onConfirmAction as () => void;

    const chip = {
      kind: "view_match" as const,
      labelKey: "companion.chat.chipViewMatch",
      viewMatch: { cvId: "cv-2", matchId: "match-2", jdTitle: null },
    };

    onAction(chip);
    onConfirmAction();
    expect(loadMatchForChat).toHaveBeenCalledTimes(1);

    // Re-arm the same chip (e.g. user clicks the chip again) and confirm again
    // while the first load is still unresolved — must NOT fire a second call.
    onAction(chip);
    onConfirmAction();
    expect(loadMatchForChat).toHaveBeenCalledTimes(1);
    expect(useCompanionStore.getState().chatPendingAction).toEqual(chip);

    resolveLoad({
      cvId: "cv-2",
      review: { overallScore: 70, dimensions: [], jdMatch: { matchId: "match-2" } } as unknown as CvReviewData,
    });

    await waitFor(() => {
      expect(useCompanionStore.getState().chatActionPending).toBe(false);
    });
  });
});
