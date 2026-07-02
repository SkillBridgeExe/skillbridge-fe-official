// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { useCompanionStore, bubbleVisible, visibleIssues, activeIssue } from "./useCompanionStore";
import type { ElementIssue } from "@/components/companion/skills/element-issues";

const reg = (id: string) => ({
  id,
  getTurn: () => ({ skill: "cv_builder" as const, props: { id } }),
});

const issue = (id: string, severity: number): ElementIssue => ({
  id,
  kind: "gap_item",
  anchorId: `anchor-${id}`,
  severity,
  whatKey: "k.what",
  why: null,
  whyKey: "k.why",
  ctaKind: null,
});

describe("useCompanionStore", () => {
  beforeEach(() => useCompanionStore.getState().resetCompanion());

  it("activating a fresh context auto-opens its bubble once", () => {
    const s = useCompanionStore.getState();
    s.registerContext(reg("f1"));
    s.activateContext("f1");
    expect(useCompanionStore.getState().activeId).toBe("f1");
    expect(useCompanionStore.getState().bubbleOpen).toBe(true);
  });

  it("after dismiss, re-activating the SAME context does NOT auto-open (quiet)", () => {
    const s = useCompanionStore.getState();
    s.registerContext(reg("f1"));
    s.activateContext("f1");
    s.dismissActive();
    expect(useCompanionStore.getState().bubbleOpen).toBe(false);
    s.activateContext("f1");
    expect(useCompanionStore.getState().activeId).toBe("f1");
    expect(useCompanionStore.getState().bubbleOpen).toBe(false); // dismissed → quiet
  });

  it("only one context is active; switching activates the new one", () => {
    const s = useCompanionStore.getState();
    s.registerContext(reg("f1"));
    s.registerContext(reg("f2"));
    s.activateContext("f1");
    s.activateContext("f2");
    expect(useCompanionStore.getState().activeId).toBe("f2");
  });

  it("dragging hides the bubble (bubbleVisible=false) but keeps it open", () => {
    const s = useCompanionStore.getState();
    s.registerContext(reg("f1"));
    s.activateContext("f1");
    s.setDragging(true);
    const st = useCompanionStore.getState();
    expect(st.bubbleOpen).toBe(true);
    expect(bubbleVisible(st)).toBe(false);
    s.setDragging(false);
    expect(bubbleVisible(useCompanionStore.getState())).toBe(true);
  });

  it("suspending the companion hides it during blocking diagnosis overlays without losing active context", () => {
    const s = useCompanionStore.getState();
    s.registerContext(reg("diagnosis"));
    s.activateContext("diagnosis");
    expect(bubbleVisible(useCompanionStore.getState())).toBe(true);

    s.setSuspended(true);
    expect(useCompanionStore.getState().activeId).toBe("diagnosis");
    expect(useCompanionStore.getState().bubbleOpen).toBe(true);
    expect(bubbleVisible(useCompanionStore.getState())).toBe(false);

    s.setSuspended(false);
    expect(bubbleVisible(useCompanionStore.getState())).toBe(true);
  });

  it("setPosition switches mode to manual", () => {
    const s = useCompanionStore.getState();
    s.setPosition(120, 240);
    const st = useCompanionStore.getState();
    expect(st.position).toEqual({ x: 120, y: 240 });
    expect(st.positionMode).toBe("manual");
  });

  it("resetPositionMode flips manual → auto (Fix A: re-enable anchoring on queue advance)", () => {
    const s = useCompanionStore.getState();
    s.setPosition(10, 20); // latches to manual (drag)
    expect(useCompanionStore.getState().positionMode).toBe("manual");
    s.resetPositionMode();
    expect(useCompanionStore.getState().positionMode).toBe("auto");
  });

  it("clearDismissed re-opens a dismissed context on re-activate (Fix F: new card = new advice)", () => {
    const s = useCompanionStore.getState();
    s.registerContext(reg("issue"));
    s.activateContext("issue");
    s.dismissActive();
    expect(useCompanionStore.getState().bubbleOpen).toBe(false);
    expect(useCompanionStore.getState().dismissed.issue).toBe(true);
    // Advancing to a genuinely NEW card clears the dismiss → re-activate auto-opens.
    s.clearDismissed("issue");
    expect(useCompanionStore.getState().dismissed.issue).toBeUndefined();
    s.activateContext("issue");
    expect(useCompanionStore.getState().bubbleOpen).toBe(true);
  });

  it("clearDismissed on a non-dismissed id is a no-op (preserves SAME-issue dismiss elsewhere)", () => {
    const s = useCompanionStore.getState();
    s.registerContext(reg("a"));
    s.registerContext(reg("b"));
    s.activateContext("a");
    s.dismissActive(); // dismiss "a"
    s.clearDismissed("b"); // unrelated id — must not touch "a"
    expect(useCompanionStore.getState().dismissed.a).toBe(true);
  });

  it("unregistering the active context clears activeId", () => {
    const s = useCompanionStore.getState();
    s.registerContext(reg("f1"));
    s.activateContext("f1");
    s.unregisterContext("f1");
    expect(useCompanionStore.getState().activeId).toBeNull();
    expect(useCompanionStore.getState().contexts).toEqual({});
  });
});

describe("useCompanionStore — issue queue", () => {
  beforeEach(() => {
    localStorage.removeItem("companion-dismissed");
    useCompanionStore.setState({ dismissedIssues: new Set() });
    useCompanionStore.getState().resetCompanion();
  });

  it("setIssues stores the queue, exposes the visible (non-dismissed) slice and the worst-first active issue", () => {
    const s = useCompanionStore.getState();
    s.setIssues([issue("a", 5), issue("b", 3)]);
    const st = useCompanionStore.getState();
    expect(st.issues).toHaveLength(2);
    expect(st.activeIssueIndex).toBe(0);
    expect(visibleIssues(st).map((i) => i.id)).toEqual(["a", "b"]);
    expect(activeIssue(st)?.id).toBe("a");
  });

  it("nextIssue advances; prevIssue goes back; both clamp at the ends", () => {
    const s = useCompanionStore.getState();
    s.setIssues([issue("a", 5), issue("b", 3), issue("c", 1)]);
    s.nextIssue();
    expect(activeIssue(useCompanionStore.getState())?.id).toBe("b");
    s.nextIssue();
    s.nextIssue(); // clamp — no 4th item
    expect(activeIssue(useCompanionStore.getState())?.id).toBe("c");
    s.prevIssue();
    expect(activeIssue(useCompanionStore.getState())?.id).toBe("b");
    s.prevIssue();
    s.prevIssue(); // clamp at 0
    expect(activeIssue(useCompanionStore.getState())?.id).toBe("a");
  });

  it("dismissIssue(snooze) removes it from the visible queue AND persists to localStorage", () => {
    const s = useCompanionStore.getState();
    s.setIssues([issue("a", 5), issue("b", 3)]);
    s.dismissIssue("a", "snooze");
    const st = useCompanionStore.getState();
    expect(visibleIssues(st).map((i) => i.id)).toEqual(["b"]);
    expect(activeIssue(st)?.id).toBe("b");
    // persisted cross-session
    expect(JSON.parse(localStorage.getItem("companion-dismissed") ?? "[]")).toContain("a");
  });

  it("dismissIssue(once) hides it this session but does NOT persist", () => {
    const s = useCompanionStore.getState();
    s.setIssues([issue("a", 5), issue("b", 3)]);
    s.dismissIssue("a", "once");
    expect(visibleIssues(useCompanionStore.getState()).map((i) => i.id)).toEqual(["b"]);
    expect(localStorage.getItem("companion-dismissed")).toBeNull();
  });

  it("a persisted-dismissed id stays dismissed after a re-setIssues (re-scan)", () => {
    const s = useCompanionStore.getState();
    s.setIssues([issue("a", 5), issue("b", 3)]);
    s.dismissIssue("a", "intentional");
    // simulate a fresh scan returning the same issues
    s.setIssues([issue("a", 5), issue("b", 3)]);
    expect(visibleIssues(useCompanionStore.getState()).map((i) => i.id)).toEqual(["b"]);
  });

  it("loads persisted dismissed ids on reset (cross-session continuity)", () => {
    localStorage.setItem("companion-dismissed", JSON.stringify(["x"]));
    useCompanionStore.getState().resetCompanion();
    const s = useCompanionStore.getState();
    s.setIssues([issue("x", 9), issue("y", 2)]);
    expect(visibleIssues(useCompanionStore.getState()).map((i) => i.id)).toEqual(["y"]);
  });
});

describe("useCompanionStore chat slice (corner advisor)", () => {
  beforeEach(() => useCompanionStore.getState().resetCompanion());

  it("starts empty and resets to empty", () => {
    expect(useCompanionStore.getState().chatMessages).toEqual([]);
  });

  it("appendChatMessage + setChatPending build a user→pending-assistant pair (question stored)", () => {
    const s = useCompanionStore.getState();
    s.appendChatMessage({ role: "user", text: "why?" });
    s.setChatPending("why?");
    const msgs = useCompanionStore.getState().chatMessages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ role: "user", text: "why?" });
    expect(msgs[1]).toMatchObject({ role: "assistant", pending: true, question: "why?" });
  });

  it("seedChatMessages replaces the thread with restored server turns", () => {
    const s = useCompanionStore.getState();
    s.seedChatMessages([
      { role: "user", text: "old q" },
      { role: "assistant", text: "old a" },
    ]);
    expect(useCompanionStore.getState().chatMessages).toEqual([
      { role: "user", text: "old q" },
      { role: "assistant", text: "old a" },
    ]);
  });

  it("resolveLastAssistant fills the pending placeholder with the answer", () => {
    const s = useCompanionStore.getState();
    s.appendChatMessage({ role: "user", text: "q" });
    s.setChatPending("q");
    s.resolveLastAssistant("here is the answer");
    const after = useCompanionStore.getState().chatMessages;
    const last = after[after.length - 1];
    expect(last).toMatchObject({ role: "assistant", text: "here is the answer", pending: false, error: false });
  });

  it("failLastAssistant flips the pending placeholder to a retryable error row (default)", () => {
    const s = useCompanionStore.getState();
    s.appendChatMessage({ role: "user", text: "q" });
    s.setChatPending("q");
    s.failLastAssistant();
    const after = useCompanionStore.getState().chatMessages;
    const last = after[after.length - 1];
    expect(last).toMatchObject({ role: "assistant", error: true, pending: false, errorKind: "retry", question: "q" });
  });

  it("failLastAssistant('limit') marks a distinct no-retry limit row", () => {
    const s = useCompanionStore.getState();
    s.appendChatMessage({ role: "user", text: "q" });
    s.setChatPending("q");
    s.failLastAssistant("limit");
    const msgs = useCompanionStore.getState().chatMessages;
    const last = msgs[msgs.length - 1];
    expect(last).toMatchObject({ role: "assistant", error: true, errorKind: "limit" });
  });

  it("retryAssistantAt heals a SPECIFIC failed row in place + returns its question (no new bubble)", () => {
    const s = useCompanionStore.getState();
    // First exchange fails…
    s.appendChatMessage({ role: "user", text: "q1" });
    s.setChatPending("q1");
    s.failLastAssistant();
    // …second exchange succeeds.
    s.appendChatMessage({ role: "user", text: "q2" });
    s.setChatPending("q2");
    s.resolveLastAssistant("a2");
    const failedIndex = 1; // the q1 assistant row
    const question = useCompanionStore.getState().retryAssistantAt(failedIndex);
    expect(question).toBe("q1");
    const msgs = useCompanionStore.getState().chatMessages;
    expect(msgs).toHaveLength(4); // no duplicate user bubble appended
    expect(msgs[failedIndex]).toMatchObject({ role: "assistant", pending: true, error: false, question: "q1" });
    expect(msgs[3]).toMatchObject({ role: "assistant", text: "a2" }); // untouched
  });

  it("resolveAssistantAt / failAssistantAt target a row by index (concurrent-send safe)", () => {
    const s = useCompanionStore.getState();
    s.appendChatMessage({ role: "user", text: "q1" });
    s.setChatPending("q1"); // index 1
    s.appendChatMessage({ role: "user", text: "q2" });
    s.setChatPending("q2"); // index 3
    // Resolve the SECOND (index 3) first, then the first (index 1) — order independent.
    s.resolveAssistantAt(3, "a2");
    s.failAssistantAt(1, "retry");
    const msgs = useCompanionStore.getState().chatMessages;
    expect(msgs[1]).toMatchObject({ role: "assistant", error: true, errorKind: "retry" });
    expect(msgs[3]).toMatchObject({ role: "assistant", text: "a2", error: false });
  });

  it("resolveAssistantAt keeps the optional actions chips (F4 deep-link chips)", () => {
    const s = useCompanionStore.getState();
    s.appendChatMessage({ role: "user", text: "q1" });
    s.setChatPending("q1");
    const actions = [{ labelKey: "companion.chat.chipViewGap", anchorId: "gap-req-1" }];
    s.resolveAssistantAt(1, "a1", actions);
    expect(useCompanionStore.getState().chatMessages[1]).toMatchObject({ role: "assistant", text: "a1", actions });
    // Omitting the 3rd arg (existing call sites) still resolves — no actions on the row.
    s.appendChatMessage({ role: "user", text: "q2" });
    s.setChatPending("q2");
    s.resolveAssistantAt(3, "a2");
    expect(useCompanionStore.getState().chatMessages[3].actions).toBeUndefined();
  });

  it("clearChat empties the thread", () => {
    const s = useCompanionStore.getState();
    s.appendChatMessage({ role: "user", text: "q" });
    s.clearChat();
    expect(useCompanionStore.getState().chatMessages).toEqual([]);
  });

  it("resolve/fail are no-ops when there is no assistant message", () => {
    const s = useCompanionStore.getState();
    s.appendChatMessage({ role: "user", text: "q" });
    s.resolveLastAssistant("x");
    s.failLastAssistant();
    // The lone user message is untouched (no assistant slot to resolve).
    expect(useCompanionStore.getState().chatMessages).toEqual([{ role: "user", text: "q" }]);
  });
});
