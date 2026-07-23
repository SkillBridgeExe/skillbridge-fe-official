// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LearningRoadmapWizard } from "./LearningRoadmapWizard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("LearningRoadmapWizard accessibility", () => {
  afterEach(cleanup);

  it("exposes a modal dialog with a labeled close button and supports Escape", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <LearningRoadmapWizard onClose={onClose} onGenerated={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByRole("button", { name: "learning.wizard.close" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
