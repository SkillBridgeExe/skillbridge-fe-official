// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeApiServer, type FakeApiServer } from "@/api/core/testing/fake-api-server";
import {
  buildImportBackupInvalid,
  buildImportBackupValid,
  canonicalDocA,
  canonicalDocB,
  cvDtoA,
  cvDtoB,
  versionSummaries,
} from "@/lib/resume-engine/fixtures/production";
import { getBuilderSnapshot } from "@/components/cv-builder/builder-snapshot";
import { mapStoreToCanonical, saveBuilderDraft } from "@/services/cv-builder.service";
import { useAutosaveStore } from "@/store/useAutosaveStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: unknown) =>
      typeof fallbackOrOptions === "string" ? fallbackOrOptions : key,
  }),
}));
// The real PDF module drags in the whole template/icon tree (jsdom can't run
// it); download-resume-pdf.ts itself stays real so the data/template contract
// is still exercised.
vi.mock("@resume-engine/pdf/browser", () => ({
  createResumePdfBlob: vi.fn(async () => new Blob(["pdf"], { type: "application/pdf" })),
}));

import { createResumePdfBlob } from "@resume-engine/pdf/browser";
import { resolveBuilderTemplate } from "../preview/TemplatePicker";
import { StudioTopBar } from "./StudioTopBar";

const CV_ID = cvDtoA.id;
const PUT_BUILDER = `PUT /api/cvs/${CV_ID}/builder`;
const POST_VERSIONS = `POST /api/cvs/${CV_ID}/versions`;

const pristineBuilder = JSON.parse(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(useCvBuilderStore.getState()).filter(([, value]) => typeof value !== "function"),
    ),
  ),
) as Partial<ReturnType<typeof useCvBuilderStore.getState>>;

let server: FakeApiServer;

/** Same wire behavior the Diagnosis autosave effect installs (PUT via the real service). */
function installTriggerSave() {
  useAutosaveStore.getState().triggerSaveRef.current = async () => {
    const state = useCvBuilderStore.getState();
    if (!state.draftId) return;
    await saveBuilderDraft(state.draftId, getBuilderSnapshot(state));
    useAutosaveStore.getState().setIsDirty(false);
    useAutosaveStore.getState().setSaveStatus("saved");
  };
}

function hydrateStore(doc = canonicalDocA, title = cvDtoA.title ?? "Untitled") {
  const builder = useCvBuilderStore.getState();
  builder.hydrateFromCanonical(doc, { cvId: CV_ID });
  builder.setDraftId(CV_ID);
  builder.setResumeTitle(title);
}

function renderTopBar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudioTopBar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const openMoreMenu = async () => {
  fireEvent.keyDown(screen.getByRole("button", { name: "builder.actions.more" }), { key: "Enter" });
  return screen.findByText("builder.actions.duplicateResume");
};

const openVersionDialog = async () => {
  await openMoreMenu();
  fireEvent.click(screen.getByText("Version History"));
  return screen.findByText("Save current version");
};

const importFile = (payload: unknown) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([JSON.stringify(payload)], "backup.skillbridge-resume.json", {
    type: "application/json",
  });
  fireEvent.change(input, { target: { files: [file] } });
};

/** Mutation-only wire sequence since a marker index (GET refetches are timing-dependent). */
const mutationsSince = (start: number) =>
  server
    .sequence()
    .slice(start)
    .filter((entry) => !entry.startsWith("GET"));

describe("resume lifecycle: rename, duplicate, versions, import, download", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false) as never;
    Element.prototype.releasePointerCapture = vi.fn();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    URL.createObjectURL = vi.fn(() => "blob:fake");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});

    server = installFakeApiServer({
      [PUT_BUILDER]: () => ({ data: cvDtoA }),
      [`GET /api/cvs/${CV_ID}/versions`]: () => ({
        data: { items: versionSummaries, total: versionSummaries.length, page: 1, limit: 100 },
      }),
      [POST_VERSIONS]: () => ({ data: versionSummaries[0] }),
    });

    useAuthStore
      .getState()
      .setAuthenticated({ id: "user-1", email: "qa@example.com", name: "QA User", role: "user" }, "api");
    useCvBuilderStore.setState(pristineBuilder);
    hydrateStore();
    useAutosaveStore.setState({ saveStatus: "saved", lastSavedTime: "10:00", isDirty: false });
    installTriggerSave();
  });

  afterEach(() => {
    cleanup();
    server.uninstall();
    useAutosaveStore.getState().triggerSaveRef.current = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useAuthStore.getState().logout();
  });

  // ── Step 5: rename ─────────────────────────────────────────────────────────

  it("renames via PATCH with a title-only body", async () => {
    server.routes[`PATCH /api/cvs/${CV_ID}`] = (call) => ({
      data: { id: CV_ID, title: (call.body as { title: string }).title, updatedAt: "2026-07-11T00:00:00.000Z" },
    });
    renderTopBar();

    const input = screen.getByLabelText("builder.studio.resumeNameLabel");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Renamed CV" } });
    fireEvent.blur(input);

    await waitFor(() => expect(server.of("PATCH", `/api/cvs/${CV_ID}`)).toHaveLength(1));
    // Title-only body: rename must never carry document fields (lost-update contract).
    expect(server.of("PATCH", `/api/cvs/${CV_ID}`)[0].body).toEqual({ title: "Renamed CV" });
  });

  it("reverts the inline title when the rename PATCH fails", async () => {
    const originalTitle = cvDtoA.title as string;
    server.routes[`PATCH /api/cvs/${CV_ID}`] = () => ({ status: 400, message: "TITLE_REQUIRED" });
    renderTopBar();

    const input = screen.getByLabelText("builder.studio.resumeNameLabel");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Rejected title" } });
    fireEvent.blur(input);

    await waitFor(() => expect(useCvBuilderStore.getState().resumeTitle).toBe(originalTitle));
  });

  // ── Step 6: duplicate ──────────────────────────────────────────────────────

  it("duplicates by flushing first, then copying the full document to the new draft", async () => {
    server.routes["POST /api/cvs/builder"] = () => ({
      data: { ...cvDtoA, id: "cv-copy-1", parsedJson: null },
    });
    server.routes["PUT /api/cvs/cv-copy-1/builder"] = () => ({ data: { ...cvDtoA, id: "cv-copy-1" } });
    renderTopBar();

    const start = server.calls.length;
    const expectedDoc = mapStoreToCanonical(getBuilderSnapshot(useCvBuilderStore.getState()));

    await openMoreMenu();
    fireEvent.click(screen.getByText("builder.actions.duplicateResume"));

    await waitFor(() => expect(server.of("PUT", "/api/cvs/cv-copy-1/builder")).toHaveLength(1));
    expect(mutationsSince(start)).toEqual([
      PUT_BUILDER, // flush current draft first
      "POST /api/cvs/builder",
      "PUT /api/cvs/cv-copy-1/builder",
    ]);

    // The copy carries the entire active document, not a blank one.
    const copied = server.of("PUT", "/api/cvs/cv-copy-1/builder")[0].body as { parsedJson: unknown };
    expect(copied.parsedJson).toEqual(expectedDoc);
    expect(useCvBuilderStore.getState().draftId).toBe("cv-copy-1");
  });

  // ── Step 7: save version / restore ─────────────────────────────────────────

  it("saves a version only after the autosave flush succeeds (PUT before POST)", async () => {
    renderTopBar();
    await openVersionDialog();

    const start = server.calls.length;
    fireEvent.click(screen.getByText("Save current version"));

    await waitFor(() => expect(server.of("POST", `/api/cvs/${CV_ID}/versions`)).toHaveLength(1));
    expect(mutationsSince(start)).toEqual([PUT_BUILDER, POST_VERSIONS]);
  });

  it("does not snapshot a version when the flush fails", async () => {
    server.routes[PUT_BUILDER] = () => ({ status: 500, message: "flush failed" });
    renderTopBar();
    await openVersionDialog();

    fireEvent.click(screen.getByText("Save current version"));

    await waitFor(() => expect(server.of("PUT", `/api/cvs/${CV_ID}/builder`)).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.of("POST", `/api/cvs/${CV_ID}/versions`)).toHaveLength(0);
  });

  it("labels all three version origins in the history list", async () => {
    renderTopBar();
    await openVersionDialog();

    expect(await screen.findByText("Manual save")).toBeInTheDocument();
    expect(screen.getByText("Auto — before restore")).toBeInTheDocument();
    expect(screen.getByText("Auto — before import")).toBeInTheDocument();
  });

  it("restores a version: flush → restore → re-hydrate from the returned document", async () => {
    server.routes[`POST /api/cvs/${CV_ID}/versions/${versionSummaries[0].id}/restore`] = () => ({
      // Same CV id, content of fixture B — mirrors the BE overwriting parsed_json.
      data: { ...cvDtoB, id: CV_ID },
    });
    renderTopBar();
    await openVersionDialog();

    const restoreButtons = await screen.findAllByText("Restore");
    const start = server.calls.length;
    fireEvent.click(restoreButtons[0]);

    await waitFor(() =>
      expect(useCvBuilderStore.getState().fullName).toBe(canonicalDocB.contact.name),
    );
    expect(window.confirm).toHaveBeenCalled();
    expect(mutationsSince(start)).toEqual([
      PUT_BUILDER, // flush so AUTO_PRE_RESTORE captures the last keystrokes
      `POST /api/cvs/${CV_ID}/versions/${versionSummaries[0].id}/restore`,
    ]);
    expect(useCvBuilderStore.getState().draftId).toBe(CV_ID);
  });

  // ── Step 8: import JSON ────────────────────────────────────────────────────

  it("imports a backup: flush → AUTO_PRE_IMPORT snapshot → overwrite → save", async () => {
    hydrateStore(canonicalDocB, "Doc B before import"); // distinct content so the overwrite is observable
    renderTopBar();

    importFile(buildImportBackupValid());
    await screen.findByText("builder.import.confirmTitle");

    const start = server.calls.length;
    fireEvent.click(screen.getByText("builder.import.apply"));

    await waitFor(() =>
      expect(useCvBuilderStore.getState().fullName).toBe(canonicalDocA.contact.name),
    );
    const mutations = mutationsSince(start);
    expect(mutations[0]).toBe(PUT_BUILDER); // flush before the backup
    expect(mutations[1]).toBe(POST_VERSIONS); // AUTO_PRE_IMPORT snapshot before overwrite
    expect(mutations[2]).toBe(PUT_BUILDER); // persist the imported document
    const backupPost = server.of("POST", `/api/cvs/${CV_ID}/versions`)[0];
    expect((backupPost.body as { origin: string }).origin).toBe("AUTO_PRE_IMPORT");
    await waitFor(() => expect(screen.queryByText("builder.import.confirmTitle")).not.toBeInTheDocument());
  });

  it("cancels the import (dialog stays open, store untouched) when the backup snapshot fails", async () => {
    hydrateStore(canonicalDocB, "Doc B before import");
    server.routes[POST_VERSIONS] = () => ({ status: 500, message: "backup failed" });
    renderTopBar();

    importFile(buildImportBackupValid());
    await screen.findByText("builder.import.confirmTitle");
    fireEvent.click(screen.getByText("builder.import.apply"));

    await waitFor(() => expect(server.of("POST", `/api/cvs/${CV_ID}/versions`)).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Store must not be overwritten and the dialog must stay open for retry/cancel.
    expect(useCvBuilderStore.getState().fullName).toBe(canonicalDocB.contact.name);
    expect(screen.getByText("builder.import.confirmTitle")).toBeInTheDocument();
  });

  it("rejects an invalid backup file without touching the server or the store", async () => {
    hydrateStore(canonicalDocB, "Doc B before import");
    renderTopBar();

    const start = server.calls.length;
    importFile(buildImportBackupInvalid());

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByText("builder.import.confirmTitle")).not.toBeInTheDocument();
    expect(useCvBuilderStore.getState().fullName).toBe(canonicalDocB.contact.name);
    expect(server.calls.length).toBe(start);
  });

  // ── Step 9: download / export ──────────────────────────────────────────────

  it("downloads the PDF of the active document and template, after a flush", async () => {
    renderTopBar();

    const start = server.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "builder.downloadCv" }));

    await waitFor(() => expect(vi.mocked(createResumePdfBlob)).toHaveBeenCalledTimes(1));
    expect(mutationsSince(start)).toEqual([PUT_BUILDER]);

    const arg = vi.mocked(createResumePdfBlob).mock.calls[0][0] as {
      data: { basics: { name: string } };
      template: string;
    };
    // The rendered bytes must come from the CURRENT store document + template.
    expect(arg.data.basics.name).toBe(canonicalDocA.contact.name);
    expect(arg.template).toBe(resolveBuilderTemplate(useCvBuilderStore.getState().template));
  });

  it("exports the current document as a schema-tagged JSON backup without the draft id", async () => {
    renderTopBar();

    const captured: Blob[] = [];
    (URL.createObjectURL as ReturnType<typeof vi.fn>).mockImplementation((blob: Blob) => {
      captured.push(blob);
      return "blob:fake";
    });

    await openMoreMenu();
    fireEvent.click(screen.getByText("builder.actions.exportJson"));

    await waitFor(() => expect(captured).toHaveLength(1));
    // jsdom's Blob has no .text() — read it the way the app reads uploads.
    const exportedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(captured[0]);
    });
    const payload = JSON.parse(exportedText) as Record<string, unknown>;
    expect(payload.$schema).toBe("skillbridge-cv-v1");
    expect(payload).not.toHaveProperty("draftId");
    expect(payload.fullName).toBe(canonicalDocA.contact.name);
    expect(Array.isArray(payload.education)).toBe(true);
  });
});
