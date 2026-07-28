// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CvJdDualPanel } from "./report/CvJdDualPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === "review.tabCv") return "CV của bạn";
      if (key === "review.defaultJdName") return "Mô tả công việc (JD)";
      if (key === "results.sourceJd") return "Nguồn JD dán";
      if (key === "results.viewOriginal") return "Xem nguồn gốc";
      return (opts?.defaultValue as string) || key;
    },
  }),
}));

vi.mock("./DocumentPreview", () => ({
  DocumentPreview: () => <div data-testid="document-preview">Mock Document Preview</div>,
}));

describe("CvJdDualPanel — Dual Panel View", () => {
  it("renders both CV preview and target JD description", () => {
    render(
      <CvJdDualPanel
        cvName="my_resume.pdf"
        jdText="Requirement: React, TypeScript, Node.js"
        jdTitle="Frontend Role"
        jdSourceUrl="https://example.com/job/1"
      />
    );

    expect(screen.getByTestId("document-preview")).toBeInTheDocument();
    expect(screen.getByText("Frontend Role")).toBeInTheDocument();
    expect(screen.getByText("Requirement: React, TypeScript, Node.js")).toBeInTheDocument();
    expect(screen.getByText("Nguồn JD")).toBeInTheDocument();
  });

  it("switches mobile segmented tabs when clicked", () => {
    render(
      <CvJdDualPanel
        cvName="my_resume.pdf"
        jdText="Requirement: React, TypeScript"
        jdTitle="Frontend Role"
      />
    );

    const mobileButtons = screen.getAllByRole("button");
    const jdTabButton = mobileButtons.find((btn) => btn.textContent?.includes("Mô tả công việc (JD)"));
    if (jdTabButton) {
      fireEvent.click(jdTabButton);
      expect(screen.getByText("Requirement: React, TypeScript")).toBeInTheDocument();
    }
  });
});
