import { describe, expect, it, beforeEach } from "vitest";
import { useCompanionStore, bubbleVisible } from "./useCompanionStore";

const reg = (id: string) => ({
  id,
  getTurn: () => ({ skill: "cv_builder" as const, props: { id } }),
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

  it("setPosition switches mode to manual", () => {
    const s = useCompanionStore.getState();
    s.setPosition(120, 240);
    const st = useCompanionStore.getState();
    expect(st.position).toEqual({ x: 120, y: 240 });
    expect(st.positionMode).toBe("manual");
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
