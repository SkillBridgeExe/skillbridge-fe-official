// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CareerTargetFromStory } from "./CareerTargetFromStory";
import { inferCareerTargetFromStory } from "@/services/cv-builder.service";
import type { CareerTargetFromStoryResponse } from "@shared/api";

// i18n: echo the key so we can assert which branch rendered.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The deterministic role-inference service — mocked per test.
vi.mock("@/services/cv-builder.service", () => ({
  inferCareerTargetFromStory: vi.fn(),
}));
const mockInfer = vi.mocked(inferCareerTargetFromStory);

const STORY = "Mình làm web bằng React, viết REST API Node.js và SQL"; // > MIN_STORY_LEN

const okResult: CareerTargetFromStoryResponse = {
  role_code: "frontend_developer",
  display_name: "Frontend Developer",
  confidence: 0.61,
  matched_skills: ["react", "javascript", "css"],
  candidates: [],
  needs_user_input: false,
  reason: "ok",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CareerTargetFromStory", () => {
  it("disables infer without a draft, and with a too-short story", () => {
    const { rerender } = render(<CareerTargetFromStory draftId={null} onApply={() => {}} />);
    expect(screen.getByText("builder.story.infer")).toBeDisabled();
    expect(screen.getByText("builder.story.needDraft")).toBeInTheDocument();
    // draft present but story still empty → infer stays disabled
    rerender(<CareerTargetFromStory draftId="cv1" onApply={() => {}} />);
    expect(screen.getByText("builder.story.infer")).toBeDisabled();
  });

  it("infers a role from the story and applies it", async () => {
    mockInfer.mockResolvedValueOnce(okResult);
    const onApply = vi.fn();
    render(<CareerTargetFromStory draftId="cv1" onApply={onApply} />);

    fireEvent.change(screen.getByPlaceholderText("builder.story.placeholder"), {
      target: { value: STORY },
    });
    fireEvent.click(screen.getByText("builder.story.infer"));

    expect(await screen.findByText(/Frontend Developer/)).toBeInTheDocument();
    expect(mockInfer).toHaveBeenCalledWith("cv1", { story: STORY });

    fireEvent.click(screen.getByText("builder.story.apply"));
    expect(onApply).toHaveBeenCalledWith("Frontend Developer");
  });

  it("shows a coaching prompt (no apply) when the engine abstains", async () => {
    mockInfer.mockResolvedValueOnce({
      ...okResult,
      role_code: null,
      display_name: null,
      confidence: 0.2,
      matched_skills: [],
      needs_user_input: true,
      reason: "too_weak",
    });
    render(<CareerTargetFromStory draftId="cv1" onApply={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText("builder.story.placeholder"), {
      target: { value: STORY },
    });
    fireEvent.click(screen.getByText("builder.story.infer"));

    expect(await screen.findByText("builder.story.needsInput")).toBeInTheDocument();
    expect(screen.queryByText("builder.story.apply")).not.toBeInTheDocument();
  });

  it("shows an error message when the call fails", async () => {
    mockInfer.mockRejectedValueOnce(new Error("boom"));
    render(<CareerTargetFromStory draftId="cv1" onApply={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText("builder.story.placeholder"), {
      target: { value: STORY },
    });
    fireEvent.click(screen.getByText("builder.story.infer"));

    expect(await screen.findByText("builder.story.error")).toBeInTheDocument();
  });
});
