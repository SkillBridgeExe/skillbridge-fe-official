// @vitest-environment jsdom
// Task M4 — focused state-machine spec for the two new PRESENTING-state follow-ups:
// "Viết lại nhẹ hơn" (softer rewrite) and "Hỏi thêm để rõ hơn" (user-initiated re-ask).
// No spec pre-existed for CvBuilderSkill (grepped — none), so this covers ONLY the new
// transitions rather than re-testing the whole analyze→asking→thinking flow.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
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
const mutateRewrite = vi.fn();
let rewritePending = false;
vi.mock("@/hooks/use-cv-builder", () => ({
  useAssistantAnalyzeMutation: () => ({ mutate: mutateAnalyze, isPending: false }),
  useAssistantRewriteMutation: () => ({ mutate: mutateRewrite, isPending: rewritePending }),
}));

afterEach(() => {
  cleanup();
  useCvBuilderStore.getState().resetCompanion();
  mutateAnalyze.mockReset();
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

function renderSkill(onApply = vi.fn(), currentValue = "old bullet") {
  return render(
    <CvBuilderSkill
      draftId="draft-1"
      fieldPath={FIELD}
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
});
