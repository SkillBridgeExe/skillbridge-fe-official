// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { useCvBuilderChatCompanion } from "./useCvBuilderChatCompanion";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { postBuilderChatApi } from "@/services/cv-builder-chat.service";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { returnObjects?: boolean }) =>
      opts?.returnObjects ? [] : key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/services/cv-builder-chat.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/cv-builder-chat.service")>();
  return {
    ...actual,
    postBuilderChatApi: vi.fn().mockResolvedValue({
      answer: "ok",
      answer_kind: "grounded",
      proposed_edit: null,
      grounded_facts: [],
      known_state: { target_role: null, active_field_path: null, answered_gaps: [] },
      suggested_next_step: null,
    }),
    getBuilderChatThreadApi: vi.fn().mockResolvedValue({ turns: [] }),
    deleteBuilderChatThreadApi: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  cleanup();
  useCompanionStore.getState().resetCompanion();
  useCvBuilderStore.getState().reset();
  useCvBuilderStore.setState({ diagnosisSourceCvId: null });
  vi.clearAllMocks();
});

function renderHook(cvId: string | null) {
  let api: { sendQuestion: (q: string) => void } | undefined;
  function Capture() {
    api = useCvBuilderChatCompanion(cvId);
    return null;
  }
  render(<Capture />);
  return () => api!;
}

describe("useCvBuilderChatCompanion — source_cv_id pointer (Phase B B5)", () => {
  it("sends the diagnosed source cv pointer from the store when the draft was seeded from a scan", async () => {
    useCvBuilderStore.setState({ diagnosisSourceCvId: "cv-parent-123" });
    const getApi = renderHook("cv-draft-1");

    getApi().sendQuestion("mình nên viết bullet này sao?");

    await waitFor(() => expect(postBuilderChatApi).toHaveBeenCalledTimes(1));
    const [cvId, body] = vi.mocked(postBuilderChatApi).mock.calls[0];
    expect(cvId).toBe("cv-draft-1");
    expect(body.source_cv_id).toBe("cv-parent-123");
  });

  it("omits source_cv_id (undefined) when the draft did not come from a diagnosis", async () => {
    useCvBuilderStore.setState({ diagnosisSourceCvId: null });
    const getApi = renderHook("cv-draft-1");

    getApi().sendQuestion("câu hỏi khác");

    await waitFor(() => expect(postBuilderChatApi).toHaveBeenCalledTimes(1));
    const [, body] = vi.mocked(postBuilderChatApi).mock.calls[0];
    expect(body.source_cv_id).toBeUndefined();
  });
});
