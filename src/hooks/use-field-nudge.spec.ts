// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFieldNudge } from "./use-field-nudge";
import { assistantAnalyze } from "@/services/cv-builder.service";
import type { CvAssistantTurn } from "@/types/companion";

// Rule analyze — deterministic, 0 LLM, no quota. Mocked per test.
vi.mock("@/services/cv-builder.service", () => ({
  assistantAnalyze: vi.fn(),
}));
const mockAnalyze = vi.mocked(assistantAnalyze);

afterEach(() => {
  vi.clearAllMocks();
});

const baseArgs = {
  draftId: "draft-1",
  section: "summary" as const,
  fieldPath: "cvbuilder:summary",
  locale: "vi" as const,
};

function turnWith(questionCount: number): CvAssistantTurn {
  return {
    message: "",
    questions: Array.from({ length: questionCount }, (_, i) => ({
      gap: `gap-${i}`,
      prompt: `prompt-${i}`,
      options: [],
      allows_free_text: true,
    })),
    requires_user_confirmation: false,
    field_patch: null,
  };
}

describe("useFieldNudge", () => {
  it("sets count from the rule analyze on blur for a weak value", async () => {
    mockAnalyze.mockResolvedValueOnce(turnWith(3));
    const { result } = renderHook(() => useFieldNudge({ ...baseArgs, currentValue: "Did some work" }));

    act(() => result.current.handleBlur());

    await waitFor(() => expect(result.current.count).toBe(3));
    expect(mockAnalyze).toHaveBeenCalledWith("draft-1", {
      current_value: "Did some work",
      section: "summary",
      field_path: "cvbuilder:summary",
      locale: "vi",
    });
  });

  it("sets count 0 when analyze returns no questions (strong line)", async () => {
    mockAnalyze.mockResolvedValueOnce(turnWith(0));
    const { result } = renderHook(() => useFieldNudge({ ...baseArgs, currentValue: "Strong line with details" }));

    act(() => result.current.handleBlur());

    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
    expect(result.current.count).toBe(0);
  });

  it("does not call analyze for an empty value", () => {
    const { result } = renderHook(() => useFieldNudge({ ...baseArgs, currentValue: "   " }));

    act(() => result.current.handleBlur());

    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(result.current.count).toBe(0);
  });

  it("skips a redundant analyze call for the same value blurred twice", async () => {
    mockAnalyze.mockResolvedValue(turnWith(1));
    const { result, rerender } = renderHook(
      ({ currentValue }) => useFieldNudge({ ...baseArgs, currentValue }),
      { initialProps: { currentValue: "same text" } },
    );

    act(() => result.current.handleBlur());
    await waitFor(() => expect(result.current.count).toBe(1));

    rerender({ currentValue: "same text" });
    act(() => result.current.handleBlur());

    expect(mockAnalyze).toHaveBeenCalledTimes(1);
  });

  it("swallows analyze errors and sets count to 0 (never throws)", async () => {
    mockAnalyze.mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() => useFieldNudge({ ...baseArgs, currentValue: "some text here" }));

    expect(() => act(() => result.current.handleBlur())).not.toThrow();

    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
    expect(result.current.count).toBe(0);
  });

  it("does not call analyze without a draftId", () => {
    const { result } = renderHook(() => useFieldNudge({ ...baseArgs, draftId: null, currentValue: "some text" }));

    act(() => result.current.handleBlur());

    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(result.current.count).toBe(0);
  });
});
