// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { LEARNING_CHAT_CONTEXT_ID, useLearningChatCompanion } from "./useLearningChatCompanion";
import { useCompanionStore } from "@/store/useCompanionStore";
import { sendLearningChatMessage, getLearningChatHistory } from "@/services/learning-roadmap.service";
import type { LearningChatResponse } from "@shared/api";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === "companion.learningChat.opener") return `opener:${(params as { session?: string })?.session ?? ""}`;
      if (key === "companion.learningChat.suggestions") return ["q1", "q2", "q3"];
      return key;
    },
    i18n: { language: "en" },
  }),
}));

vi.mock("@/services/learning-roadmap.service", () => ({
  sendLearningChatMessage: vi.fn(),
  getLearningChatHistory: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  useCompanionStore.getState().resetCompanion();
  localStorage.clear();
  vi.clearAllMocks();
});

function Harness({
  sessionId,
  sessionTitle = "React Basics",
  skillCanonical = "react",
}: {
  sessionId: string;
  sessionTitle?: string;
  skillCanonical?: string;
}) {
  useLearningChatCompanion(sessionId, sessionTitle, skillCanonical);
  return null;
}

describe("useLearningChatCompanion — register once + grounded opener", () => {
  it("registers the learning:chat context once on mount with a real-session opener + 3 static chips", () => {
    render(<Harness sessionId="s1" sessionTitle="React Basics" />);
    const reg = useCompanionStore.getState().contexts[LEARNING_CHAT_CONTEXT_ID];
    expect(reg).toBeDefined();
    const turn = reg?.getTurn();
    expect(turn?.skill).toBe("learning_chat");
    expect(typeof turn?.props.onSend).toBe("function");
    expect(typeof turn?.props.onRetry).toBe("function");
    expect(useCompanionStore.getState().chatOpener).toBe("opener:React Basics");
    expect(useCompanionStore.getState().chatSuggestions).toEqual(["q1", "q2", "q3"]);
  });

  it("clears the opener + chips + thread on unmount (leaving the session page)", () => {
    const { unmount } = render(<Harness sessionId="s1" />);
    expect(useCompanionStore.getState().chatOpener).not.toBeNull();
    unmount();
    expect(useCompanionStore.getState().chatOpener).toBeNull();
    expect(useCompanionStore.getState().chatSuggestions).toHaveLength(0);
    expect(useCompanionStore.getState().contexts[LEARNING_CHAT_CONTEXT_ID]).toBeUndefined();
  });

  it("repaints the opener when switching sessions without a remount, and clears the stale thread", () => {
    const { rerender } = render(<Harness sessionId="s1" sessionTitle="Session A" />);
    useCompanionStore.getState().appendChatMessage({ role: "user", text: "hi from session A" });
    expect(useCompanionStore.getState().chatMessages).toHaveLength(1);

    rerender(<Harness sessionId="s2" sessionTitle="Session B" />);

    expect(useCompanionStore.getState().chatOpener).toBe("opener:Session B");
    expect(useCompanionStore.getState().chatMessages).toHaveLength(0);
  });
});

describe("useLearningChatCompanion — send → service → resolve", () => {
  it("sends via sendLearningChatMessage and resolves the assistant row with the answer", async () => {
    vi.mocked(sendLearningChatMessage).mockResolvedValueOnce({
      conversationId: "conv-1",
      message: "Here's the explanation.",
    });
    let api: { sendQuestion: (q: string) => void } | undefined;
    function Capture() {
      api = useLearningChatCompanion("s1", "React Basics", "react");
      return null;
    }
    render(<Capture />);

    api?.sendQuestion("Explain this concept");

    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages).toEqual([
        { role: "user", text: "Explain this concept" },
        { role: "assistant", text: "Here's the explanation.", pending: false, error: false, question: "Explain this concept" },
      ]);
    });
    expect(sendLearningChatMessage).toHaveBeenCalledWith({
      message: "Explain this concept",
      conversationId: undefined,
      language: "en",
      session_id: "s1",
      skill_canonical: "react",
    });
    expect(localStorage.getItem("skillbridge_chat_conv_id_s1")).toBe("conv-1");
  });

  it("ignores a second send while the first is still in flight (double-send guard)", async () => {
    const d = deferred<LearningChatResponse>();
    vi.mocked(sendLearningChatMessage).mockReturnValueOnce(d.promise);
    let api: { sendQuestion: (q: string) => void } | undefined;
    function Capture() {
      api = useLearningChatCompanion("s1", "React Basics", "react");
      return null;
    }
    render(<Capture />);

    api?.sendQuestion("first question");
    api?.sendQuestion("second question");
    expect(sendLearningChatMessage).toHaveBeenCalledTimes(1);

    d.resolve({ conversationId: "conv-1", message: "answered" });
    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages.at(-1)).toMatchObject({ text: "answered" });
    });
  });
});

describe("useLearningChatCompanion — error/limit rows (mirrors diagnosis pattern)", () => {
  it("flips a failed send to a retryable error row on a transient failure", async () => {
    vi.mocked(sendLearningChatMessage).mockRejectedValueOnce(new Error("network down"));
    let api: { sendQuestion: (q: string) => void } | undefined;
    function Capture() {
      api = useLearningChatCompanion("s1", "React Basics", "react");
      return null;
    }
    render(<Capture />);

    api?.sendQuestion("hello");

    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages.at(-1)).toMatchObject({
        error: true,
        errorKind: "retry",
      });
    });
  });

  it("shows the no-retry limit row on a 429 daily-cap error", async () => {
    vi.mocked(sendLearningChatMessage).mockRejectedValueOnce({ status: 429 });
    let api: { sendQuestion: (q: string) => void } | undefined;
    function Capture() {
      api = useLearningChatCompanion("s1", "React Basics", "react");
      return null;
    }
    render(<Capture />);

    api?.sendQuestion("hello");

    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages.at(-1)).toMatchObject({
        error: true,
        errorKind: "limit",
      });
    });
  });

  it("heals a failed row in place on retry, re-sending the SAME question", async () => {
    vi.mocked(sendLearningChatMessage).mockRejectedValueOnce(new Error("network down"));
    let api: { sendQuestion: (q: string) => void } | undefined;
    function Capture() {
      api = useLearningChatCompanion("s1", "React Basics", "react");
      return null;
    }
    render(<Capture />);
    api?.sendQuestion("retry me");
    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages.at(-1)).toMatchObject({ error: true });
    });

    vi.mocked(sendLearningChatMessage).mockResolvedValueOnce({ conversationId: "conv-1", message: "ok now" });
    const turn = useCompanionStore.getState().contexts[LEARNING_CHAT_CONTEXT_ID]?.getTurn();
    const onRetry = turn?.props.onRetry as (index: number) => void;
    onRetry(1);

    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages.at(-1)).toMatchObject({ text: "ok now" });
    });
    expect(vi.mocked(sendLearningChatMessage).mock.calls[1][0]).toMatchObject({ message: "retry me" });
  });
});

describe("useLearningChatCompanion — continuity via the shared conversationId (AIChatPanel scheme)", () => {
  it("restores persisted history for a saved conversationId on mount", async () => {
    localStorage.setItem("skillbridge_chat_conv_id_sess-1", "conv-old");
    vi.mocked(getLearningChatHistory).mockResolvedValueOnce({
      conversationId: "conv-old",
      message: "",
      history: [
        { role: "user", text: "old question" },
        { role: "assistant", text: "old answer" },
      ],
    });

    render(<Harness sessionId="sess-1" />);

    await waitFor(() => {
      expect(useCompanionStore.getState().chatMessages).toEqual([
        { role: "user", text: "old question" },
        { role: "assistant", text: "old answer" },
      ]);
    });
    expect(getLearningChatHistory).toHaveBeenCalledWith("conv-old");
  });

  it("does not overwrite an active local draft with persisted history", async () => {
    localStorage.setItem("skillbridge_chat_conv_id_sess-1", "conv-old");
    vi.mocked(getLearningChatHistory).mockResolvedValueOnce({
      conversationId: "conv-old",
      message: "",
      history: [{ role: "user", text: "old question" }],
    });
    useCompanionStore.getState().appendChatMessage({ role: "user", text: "live draft" });

    render(<Harness sessionId="sess-1" />);

    await waitFor(() => {
      expect(getLearningChatHistory).toHaveBeenCalled();
    });
    expect(useCompanionStore.getState().chatMessages).toEqual([{ role: "user", text: "live draft" }]);
  });

  it("sends with the restored conversationId and persists the NEW id the BE returns", async () => {
    localStorage.setItem("skillbridge_chat_conv_id_sess-2", "conv-old");
    vi.mocked(getLearningChatHistory).mockResolvedValueOnce({ conversationId: "conv-old", message: "", history: [] });
    vi.mocked(sendLearningChatMessage).mockResolvedValueOnce({ conversationId: "conv-new", message: "answer" });
    let api: { sendQuestion: (q: string) => void } | undefined;
    function Capture() {
      api = useLearningChatCompanion("sess-2", "React Basics", "react");
      return null;
    }
    render(<Capture />);
    await waitFor(() => expect(getLearningChatHistory).toHaveBeenCalled());

    api?.sendQuestion("hi");

    await waitFor(() => {
      expect(sendLearningChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: "conv-old", session_id: "sess-2" }),
      );
    });
    await waitFor(() => {
      expect(localStorage.getItem("skillbridge_chat_conv_id_sess-2")).toBe("conv-new");
    });
  });
});
