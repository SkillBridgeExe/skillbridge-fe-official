// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CompanionShell } from "./CompanionShell";

vi.mock("@/store/useCompanionStore", () => ({
  useCompanionStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        activeId: null,
        contexts: { test: { getTurn: () => null } },
        bubbleOpen: false,
        visible: false,
        isDragging: false,
        setDragging: vi.fn(),
        setPosition: vi.fn(),
        position: { x: 0, y: 0 },
        positionMode: "fallback",
        dismissActive: vi.fn(),
        closeBubble: vi.fn(),
        activateContext: vi.fn(),
        suspended: false,
        chatMessages: [],
        chatActionPending: false,
        chatOpener: null,
        chatSuggestions: [],
        chatPendingAction: null,
        chatKnownState: null,
        chatAnswerTone: null,
      }),
    {
      getState: () => ({
        activeId: null,
        visible: false,
        openBubble: vi.fn(),
        activateContext: vi.fn(),
      }),
    }
  ),
  bubbleVisible: () => false,
  isChatBusy: () => false,
}));

vi.mock("@/store/useCvBuilderStore", () => ({
  useCvBuilderStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      mascotState: "idle",
      draftId: null,
    }),
}));

afterEach(cleanup);

describe("CompanionShell — Mobile Sizing", () => {
  it("renders companion mascot button with aria-label", () => {
    render(<CompanionShell />);
    expect(screen.getByRole("button", { name: "Companion mascot" })).toBeInTheDocument();
  });
});
