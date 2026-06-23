// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ThinkingDots } from "./ThinkingDots";

// framer-motion's useReducedMotion drives the static-vs-animated branch.
// We control its return per-test via this mock.
const reducedMotion = vi.fn<() => boolean | null>(() => false);
vi.mock("framer-motion", () => ({
  useReducedMotion: () => reducedMotion(),
}));

afterEach(() => {
  cleanup();
  reducedMotion.mockReturnValue(false);
});

describe("ThinkingDots", () => {
  it("exposes the human label on a role=status aria-live=polite node", () => {
    render(<ThinkingDots label="Đang suy nghĩ…" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Đang suy nghĩ…");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });

  it("hides the decorative animated dots from assistive tech (aria-hidden)", () => {
    const { container } = render(<ThinkingDots label="Thinking…" />);
    const dots = container.querySelector('[data-testid="thinking-dots"]');
    expect(dots).not.toBeNull();
    expect(dots?.getAttribute("aria-hidden")).toBe("true");
    // status text must NOT live inside the aria-hidden dots node
    expect(dots?.textContent).not.toContain("Thinking…");
  });

  it("animates (looping class) when reduced motion is OFF", () => {
    reducedMotion.mockReturnValue(false);
    const { container } = render(<ThinkingDots label="Thinking…" />);
    const dots = container.querySelector('[data-testid="thinking-dots"]')!;
    expect(dots.getAttribute("data-static")).toBe("false");
    expect(dots.className).toContain("thinking-dots--loop");
  });

  it("renders a STATIC ellipsis (no loop) when reduced motion is ON", () => {
    reducedMotion.mockReturnValue(true);
    const { container } = render(<ThinkingDots label="Thinking…" />);
    const dots = container.querySelector('[data-testid="thinking-dots"]')!;
    expect(dots.getAttribute("data-static")).toBe("true");
    expect(dots.className).not.toContain("thinking-dots--loop");
    expect(dots.textContent).toContain("…");
    // the static branch still keeps the dots decorative + the label on status
    expect(dots.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("status")).toHaveTextContent("Thinking…");
  });

  it("renders nothing visible-as-status when label is omitted but still status-region present", () => {
    render(<ThinkingDots />);
    // status region always exists for aria-live consistency
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
