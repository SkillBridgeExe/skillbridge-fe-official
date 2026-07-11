// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApiServer, type FakeApiServer } from "@/api/core/testing/fake-api-server";
import { canonicalDocA, cvDtoA } from "@/lib/resume-engine/fixtures/production";
import { useAutosaveStore } from "@/store/useAutosaveStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: unknown) =>
      typeof fallbackOrOptions === "string" ? fallbackOrOptions : key,
  }),
}));
vi.mock("@posthog/react", () => ({ usePostHog: () => undefined }));
vi.mock("@/components/layout/Layout", () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/mascot/MascotSticker", () => ({ MascotSticker: () => null }));
vi.mock("@/components/diagnosis", () => ({
  DiagnosisStep1Upload: () => null,
  DiagnosisStep2Review: () => null,
  DiagnosisStep3Results: () => null,
}));
// The builder chrome is exercised in StudioTopBar.lifecycle.spec.tsx; here only
// the page-level bootstrap/autosave effects are under test. The PDF preview
// (pdf.js + @react-pdf) cannot run in jsdom at all.
vi.mock("@/components/cv-builder/CvFormPanel", () => ({ CvFormPanel: () => null }));
vi.mock("@/components/cv-builder/CvPreviewPanel", () => ({ CvPreviewPanel: () => null }));
vi.mock("@/components/cv-builder/CvSectionNav", () => ({ CvSectionNav: () => null }));
vi.mock("@/components/cv-builder/studio/StudioInspector", () => ({ StudioInspector: () => null }));
vi.mock("@/components/cv-builder/studio/StudioTopBar", () => ({ StudioTopBar: () => null }));

import Diagnosis from "./Diagnosis";

const BUILDER_CREATE = "POST /api/cvs/builder";
const pristineBuilder = JSON.parse(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(useCvBuilderStore.getState()).filter(([, value]) => typeof value !== "function"),
    ),
  ),
) as Partial<ReturnType<typeof useCvBuilderStore.getState>>;

let server: FakeApiServer;

function renderDiagnosis(search: string) {
  window.history.replaceState({}, "", `/diagnosis${search}`);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Diagnosis />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe("resume lifecycle: builder bootstrap, autosave, navigation", () => {
  beforeEach(() => {
    server = installFakeApiServer({});
    useAuthStore
      .getState()
      .setAuthenticated({ id: "user-1", email: "qa@example.com", name: "QA User", role: "user" }, "api");
    useCvBuilderStore.setState(pristineBuilder);
    useAutosaveStore.setState({ saveStatus: "idle", lastSavedTime: null, isDirty: false });
    useAutosaveStore.getState().triggerSaveRef.current = null;
    useDiagnosisStore.getState().setStep("input");
    useDiagnosisStore.getState().clearBuilderState();
  });

  afterEach(() => {
    cleanup();
    server.uninstall();
    vi.useRealTimers();
    vi.restoreAllMocks();
    useAuthStore.getState().logout();
  });

  // ── Step 1: create ─────────────────────────────────────────────────────────

  it("creates exactly one server draft when entering the builder fresh", async () => {
    server.routes[BUILDER_CREATE] = () => ({
      data: { ...cvDtoA, id: "draft-new-1", parsedJson: null, title: "Untitled resume" },
    });

    const { rerender } = renderDiagnosis("?mode=builder");

    await waitFor(() => expect(useCvBuilderStore.getState().draftId).toBe("draft-new-1"));
    expect(server.of("POST", "/api/cvs/builder")).toHaveLength(1);
    // The working id lands in the URL so a reload recovers this same CV.
    expect(window.location.search).toContain("draftId=draft-new-1");
    expect(useAutosaveStore.getState().saveStatus).toBe("saved");

    // Re-renders must not mint another draft (draftAttemptRef).
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <BrowserRouter>
          <Diagnosis />
        </BrowserRouter>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.of("POST", "/api/cvs/builder")).toHaveLength(1);
  });

  // ── Step 3: refresh / deep-link recover ────────────────────────────────────

  it("recovers the CV by cvId on deep-link instead of minting a new draft (regression 72bfe98)", async () => {
    server.routes[`GET /api/cvs/${cvDtoA.id}`] = () => ({ data: cvDtoA });

    renderDiagnosis(`?mode=builder&cvId=${cvDtoA.id}`);

    await waitFor(() => expect(useCvBuilderStore.getState().draftId).toBe(cvDtoA.id));
    const builder = useCvBuilderStore.getState();
    expect(builder.resumeTitle).toBe(cvDtoA.title);
    expect(builder.fullName).toBe(canonicalDocA.contact.name);
    expect(useAutosaveStore.getState().saveStatus).toBe("saved");
    // The core churn regression: recovery must NOT create a new draft.
    expect(server.of("POST", "/api/cvs/builder")).toHaveLength(0);
    expect(server.of("GET", `/api/cvs/${cvDtoA.id}`)).toHaveLength(1);
  });

  it("gates the builder behind a recovery overlay while the server doc loads", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.routes[`GET /api/cvs/${cvDtoA.id}`] = async () => {
      await gate;
      return { data: cvDtoA };
    };

    renderDiagnosis(`?mode=builder&cvId=${cvDtoA.id}`);

    // Overlay blocks editing while the fetch is pending (cold-start clobber guard).
    expect(await screen.findByText("builder.recoveringDraft")).toBeInTheDocument();

    release();
    await waitFor(() => expect(useCvBuilderStore.getState().draftId).toBe(cvDtoA.id));
    expect(screen.queryByText("builder.recoveringDraft")).not.toBeInTheDocument();
  });

  it("falls back to local mode when recovery fails — and still mints no draft", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    server.routes[`GET /api/cvs/${cvDtoA.id}`] = () => ({ status: 404, message: "CV not found" });

    renderDiagnosis(`?mode=builder&cvId=${cvDtoA.id}`);

    await waitFor(() => expect(useAutosaveStore.getState().saveStatus).toBe("local"));
    expect(useCvBuilderStore.getState().draftId).toBeNull();
    expect(server.of("POST", "/api/cvs/builder")).toHaveLength(0);
  });

  // ── Step 2: edit + autosave ────────────────────────────────────────────────

  it("debounces autosave 1.5s, coalesces edits, and never sends the title", async () => {
    server.routes[`GET /api/cvs/${cvDtoA.id}`] = () => ({ data: cvDtoA });
    server.routes[`PUT /api/cvs/${cvDtoA.id}/builder`] = () => ({ data: cvDtoA });

    renderDiagnosis(`?mode=builder&cvId=${cvDtoA.id}`);
    await waitFor(() => expect(useCvBuilderStore.getState().draftId).toBe(cvDtoA.id));

    vi.useFakeTimers();
    act(() => {
      useCvBuilderStore.getState().setSummary("First edit");
      useCvBuilderStore.getState().setSummary("First edit, refined");
    });
    expect(useAutosaveStore.getState().isDirty).toBe(true);

    await vi.advanceTimersByTimeAsync(1400);
    expect(server.of("PUT", `/api/cvs/${cvDtoA.id}/builder`)).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(200);
    vi.useRealTimers();
    await waitFor(() => expect(server.of("PUT", `/api/cvs/${cvDtoA.id}/builder`)).toHaveLength(1));

    const put = server.of("PUT", `/api/cvs/${cvDtoA.id}/builder`)[0];
    const body = put.body as Record<string, unknown>;
    const parsedJson = body.parsedJson as { summary: string };
    expect(parsedJson.summary).toBe("First edit, refined");
    expect(body.language).toBe(cvDtoA.language);
    // W97: autosave must never write the title — rename owns it (lost-update fix).
    expect(body).not.toHaveProperty("title");

    await waitFor(() => expect(useAutosaveStore.getState().saveStatus).toBe("saved"));
    expect(useAutosaveStore.getState().isDirty).toBe(false);
  });

  it("marks the save state as error when the autosave PUT fails", async () => {
    server.routes[`GET /api/cvs/${cvDtoA.id}`] = () => ({ data: cvDtoA });
    server.routes[`PUT /api/cvs/${cvDtoA.id}/builder`] = () => ({ status: 500, message: "boom" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderDiagnosis(`?mode=builder&cvId=${cvDtoA.id}`);
    await waitFor(() => expect(useCvBuilderStore.getState().draftId).toBe(cvDtoA.id));

    act(() => {
      useCvBuilderStore.getState().setSummary("Edit that fails to save");
    });
    await waitFor(() => expect(server.of("PUT", `/api/cvs/${cvDtoA.id}/builder`).length).toBeGreaterThan(0), {
      timeout: 4000,
    });
    await waitFor(() => expect(useAutosaveStore.getState().saveStatus).toBe("error"));
  });

  // ── Step 4: navigation with dirty state ────────────────────────────────────

  it("flushes a pending debounced save on unmount (SPA navigation)", async () => {
    server.routes[`GET /api/cvs/${cvDtoA.id}`] = () => ({ data: cvDtoA });
    server.routes[`PUT /api/cvs/${cvDtoA.id}/builder`] = () => ({ data: cvDtoA });

    const { unmount } = renderDiagnosis(`?mode=builder&cvId=${cvDtoA.id}`);
    await waitFor(() => expect(useCvBuilderStore.getState().draftId).toBe(cvDtoA.id));

    act(() => {
      useCvBuilderStore.getState().setSummary("Typed just before navigating away");
    });
    expect(server.of("PUT", `/api/cvs/${cvDtoA.id}/builder`)).toHaveLength(0);

    unmount();

    await waitFor(() => expect(server.of("PUT", `/api/cvs/${cvDtoA.id}/builder`)).toHaveLength(1));
    const parsedJson = (server.of("PUT", `/api/cvs/${cvDtoA.id}/builder`)[0].body as { parsedJson: { summary: string } })
      .parsedJson;
    expect(parsedJson.summary).toBe("Typed just before navigating away");
  });

  it("arms the beforeunload guard only while dirty", async () => {
    server.routes[`GET /api/cvs/${cvDtoA.id}`] = () => ({ data: cvDtoA });
    server.routes[`PUT /api/cvs/${cvDtoA.id}/builder`] = () => ({ data: cvDtoA });

    renderDiagnosis(`?mode=builder&cvId=${cvDtoA.id}`);
    await waitFor(() => expect(useCvBuilderStore.getState().draftId).toBe(cvDtoA.id));

    act(() => {
      useAutosaveStore.getState().setIsDirty(true);
    });
    const dirtyEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);

    act(() => {
      useAutosaveStore.getState().setIsDirty(false);
    });
    const cleanEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);
  });
});
