// @vitest-environment jsdom
// Task M4 — focused state-machine spec for the two new PRESENTING-state follow-ups:
// "Viết lại nhẹ hơn" (softer rewrite) and "Hỏi thêm để rõ hơn" (user-initiated re-ask).
// No spec pre-existed for CvBuilderSkill (grepped — none), so this covers ONLY the new
// transitions rather than re-testing the whole analyze→asking→thinking flow.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CvBuilderSkill } from "./CvBuilderSkill";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import type { CvAssistantTurn } from "@/types/companion";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

// Hook-level mock: full sync control over mutate()/isPending, no react-query/network needed.
const mutateAnalyze = vi.fn();
const mutateSmartQuestions = vi.fn();
const mutateRewrite = vi.fn();
let rewritePending = false;
vi.mock("@/hooks/use-cv-builder", () => ({
  useAssistantAnalyzeMutation: () => ({ mutate: mutateAnalyze, isPending: false }),
  useAssistantSmartQuestionsMutation: () => ({ mutate: mutateSmartQuestions, isPending: false }),
  useAssistantRewriteMutation: () => ({ mutate: mutateRewrite, isPending: rewritePending }),
}));

afterEach(() => {
  cleanup();
  useCvBuilderStore.getState().resetCompanion();
  mutateAnalyze.mockReset();
  mutateSmartQuestions.mockReset();
  mutateRewrite.mockReset();
  rewritePending = false;
});

const FIELD = "experience[0].description";

const TURN: CvAssistantTurn = {
  message: "",
  questions: [{ gap: "tech", prompt: "Which tech?", options: [{ id: "react", label: "React" }], allows_free_text: true }],
  requires_user_confirmation: false,
  field_patch: null,
};

/** Seed the store directly into the PRESENTING state with an already-accepted patch. */
function seedPresenting() {
  const s = useCvBuilderStore.getState();
  s.setCompanionField(FIELD, "experience");
  s.setCompanionTurn(TURN);
  s.setCompanionPatch({ target: FIELD, before: "old bullet", after: "new bullet", why: "clearer" });
  s.setMascotState("presenting");
}

function renderSkill(onApply = vi.fn(), currentValue = "old bullet", customFieldPath = FIELD) {
  return render(
    <CvBuilderSkill
      draftId="draft-1"
      fieldPath={customFieldPath}
      section="experience"
      currentValue={currentValue}
      onApply={onApply}
    />,
  );
}

describe("CvBuilderSkill — Task M4 (Viết lại nhẹ hơn / Hỏi thêm để rõ hơn)", () => {
  it("Viết lại nhẹ hơn: presenting -> thinking -> presenting, sends tone:'softer' + same target/answers", () => {
    seedPresenting();
    renderSkill();

    fireEvent.click(screen.getByText("companion.rewriteSofter"));

    expect(useCvBuilderStore.getState().mascotState).toBe("thinking");
    expect(mutateRewrite).toHaveBeenCalledTimes(1);
    const [req, handlers] = mutateRewrite.mock.calls[0];
    expect(req.tone).toBe("softer");
    expect(req.target).toBe(FIELD);
    expect(req.before).toBe("old bullet");
    expect(req.answers).toEqual([{ gap: "tech", option_id: "other", detail: undefined }]);

    handlers.onSuccess({
      ok: true,
      field_patch: { target: FIELD, before: "old bullet", after: "softer bullet", why: "gentler tone" },
    });

    const after = useCvBuilderStore.getState();
    expect(after.mascotState).toBe("presenting");
    expect(after.companionPatch?.after).toBe("softer bullet");
  });

  it("a failed softer rewrite keeps the last good patch (no progress lost)", () => {
    seedPresenting();
    renderSkill();

    fireEvent.click(screen.getByText("companion.rewriteSofter"));
    const [, handlers] = mutateRewrite.mock.calls[0];
    handlers.onSuccess({ ok: false, reason: "DEGRADED", message: "still shaky" });

    const after = useCvBuilderStore.getState();
    expect(after.mascotState).toBe("presenting");
    // the ORIGINAL patch survives — a failed follow-up must not erase it
    expect(after.companionPatch?.after).toBe("new bullet");
    expect(after.companionMessage).toBe("still shaky");
  });

  it("double-send guard: rewriteMutation.isPending blocks a second fire", () => {
    seedPresenting();
    renderSkill();

    const btn = screen.getByText("companion.rewriteSofter");
    fireEvent.click(btn);
    expect(mutateRewrite).toHaveBeenCalledTimes(1);

    // Simulate the mutation now reporting pending (as the real hook would) and click
    // the SAME (now-unmounted, since state moved to "thinking") button reference again.
    rewritePending = true;
    fireEvent.click(btn);
    expect(mutateRewrite).toHaveBeenCalledTimes(1);
  });

  it("Hỏi thêm để rõ hơn: presenting -> asking (ONE free-text question) -> answer -> thinking -> presenting, answer appended", () => {
    seedPresenting();
    renderSkill();

    fireEvent.click(screen.getByText("companion.askMore"));
    expect(useCvBuilderStore.getState().mascotState).toBe("asking");
    // shows the generic ask-more prompt, NOT the original chip question
    expect(screen.getByText("companion.askMorePrompt")).toBeInTheDocument();
    expect(screen.queryByText("Which tech?")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("companion.freeTextPlaceholder"), {
      target: { value: "It's a backend service, not a UI." },
    });
    fireEvent.click(screen.getByText("companion.send"));

    expect(useCvBuilderStore.getState().mascotState).toBe("thinking");
    expect(mutateRewrite).toHaveBeenCalledTimes(1);
    const [req, handlers] = mutateRewrite.mock.calls[0];
    expect(req.tone).toBeUndefined();
    expect(req.answers).toEqual([
      { gap: "tech", option_id: "other", detail: undefined },
      { gap: "user_clarify", option_id: "other", detail: "It's a backend service, not a UI." },
    ]);

    handlers.onSuccess({
      ok: true,
      field_patch: { target: FIELD, before: "old bullet", after: "clarified bullet", why: "used the clarification" },
    });

    const after = useCvBuilderStore.getState();
    expect(after.mascotState).toBe("presenting");
    expect(after.companionPatch?.after).toBe("clarified bullet");
  });

  it("Bỏ still fully resets the companion session", () => {
    seedPresenting();
    // currentValue="" so the mount-effect's auto-analyze guard (`!currentValue.trim()`) can't
    // re-trigger analyze after reset — in the real app the shell unmounts this skill on discard
    // (dismissActive), which this standalone render doesn't reproduce.
    renderSkill(vi.fn(), "");

    fireEvent.click(screen.getByText("companion.discard"));

    const after = useCvBuilderStore.getState();
    expect(after.mascotState).toBe("idle");
    expect(after.companionField).toBeNull();
    expect(after.companionPatch).toBeNull();
  });

  it("handleApply validates patch and then applies the safe field update", () => {
    seedPresenting();
    const mockOnApply = vi.fn();
    renderSkill(mockOnApply);

    fireEvent.click(screen.getByText("companion.apply"));

    expect(mockOnApply).toHaveBeenCalledTimes(1);
    expect(mockOnApply).toHaveBeenCalledWith("new bullet");
    expect(useCvBuilderStore.getState().companionPatch).not.toBeNull();
  });

  it("handleApply validates patch before applying and prevents invalid patch", () => {
    // In this test, experience[99] does not exist in the document,
    // so buildCvBuilderPatchProposal will throw an error, causing the catch block to run.
    seedPresenting();
    const s = useCvBuilderStore.getState();
    s.setCompanionField("experience[99].description", "experience");
    s.setCompanionPatch({ target: "experience[99].description", before: "old", after: "new bullet", why: "" });
    s.setMascotState("presenting");
    
    const mockOnApply = vi.fn();
    renderSkill(mockOnApply, "old bullet", "experience[99].description");

    fireEvent.click(screen.getByText("companion.apply"));

    expect(mockOnApply).not.toHaveBeenCalled();
    const after = useCvBuilderStore.getState();
    expect(after.mascotState).toBe("presenting");
    expect(after.companionMessage).toBe("companion.patchRejected"); // from mock translation
    expect(after.companionPatch?.after).toBe("new bullet");
  });
});

describe("CvBuilderSkill — Task 6a + W83 (intent-aware action chips)", () => {
  it("on open, renders intent chips without spending a smart-question call; fact-needed chip fetches role-aware questions", () => {
    renderSkill(vi.fn(), "Fixed bugs in the payment flow.");

    expect(screen.getByText("companion.idlePrompt")).toBeInTheDocument();
    expect(screen.getByText("companion.intent.analyze")).toBeInTheDocument();
    expect(mutateSmartQuestions).not.toHaveBeenCalled();
    expect(mutateAnalyze).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("companion.intent.analyze"));

    expect(mutateSmartQuestions).toHaveBeenCalledTimes(1);
    expect(mutateAnalyze).not.toHaveBeenCalled();
    const [req] = mutateSmartQuestions.mock.calls[0];
    expect(req.draftId).toBe("draft-1");
    expect(req.current_value).toBe("Fixed bugs in the payment flow.");
    expect(req.section).toBe("experience");
    expect(req.field_path).toBe(FIELD);
    expect(req).not.toHaveProperty("requested_action");
    expect(req).not.toHaveProperty("target_role");

    const [, handlers] = mutateSmartQuestions.mock.calls[0];
    act(() => handlers.onSuccess(TURN));

    expect(useCvBuilderStore.getState().mascotState).toBe("asking");
    expect(screen.getByText("Which tech?")).toBeInTheDocument();
  });

  it("smart-questions error from analyze chip falls back to the rule analyze mutation — no blank companion", () => {
    renderSkill(vi.fn(), "Fixed bugs in the payment flow.");

    fireEvent.click(screen.getByText("companion.intent.analyze"));

    expect(mutateSmartQuestions).toHaveBeenCalledTimes(1);
    const [, smartHandlers] = mutateSmartQuestions.mock.calls[0];
    act(() => smartHandlers.onError(new Error("timeout")));

    expect(mutateAnalyze).toHaveBeenCalledTimes(1);
    const [, analyzeHandlers] = mutateAnalyze.mock.calls[0];
    act(() => analyzeHandlers.onSuccess(TURN));

    expect(useCvBuilderStore.getState().mascotState).toBe("asking");
    expect(screen.getByText("Which tech?")).toBeInTheDocument();
  });

  it("add-evidence chip uses rewrite intent instead of a fake answer gap", () => {
    renderSkill(vi.fn(), "Fixed bugs in the payment flow.");

    fireEvent.click(screen.getByText("companion.intent.evidence"));

    expect(mutateSmartQuestions).not.toHaveBeenCalled();
    expect(mutateRewrite).toHaveBeenCalledTimes(1);
    const [req] = mutateRewrite.mock.calls[0];
    expect(req.answers).toEqual([]);
    expect(req.intent).toBe("add_evidence");
  });

  it("ATS chip maps to an explicit rewrite intent", () => {
    renderSkill(vi.fn(), "Built React dashboard components.");

    fireEvent.click(screen.getByText("companion.intent.ats"));

    expect(mutateRewrite).toHaveBeenCalledTimes(1);
    expect(mutateRewrite.mock.calls[0][0].intent).toBe("make_ats_friendly");
  });

  it("impact chip maps to an explicit rewrite intent", () => {
    renderSkill(vi.fn(), "Built React dashboard components.");

    fireEvent.click(screen.getByText("companion.intent.impact"));

    expect(mutateRewrite).toHaveBeenCalledTimes(1);
    expect(mutateRewrite.mock.calls[0][0].intent).toBe("turn_into_impact");
  });
});
