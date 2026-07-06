// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CvSectionNav } from "./CvSectionNav";
import { useAuthStore } from "@/store/useAuthStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

const USER = {
  id: "u1",
  name: "Student",
  email: "student@example.com",
  role: "user" as const,
};

afterEach(() => {
  cleanup();
  useCvBuilderStore.getState().reset();
  useAuthStore.getState().setAnonymous();
});

describe("CvSectionNav W55 stale score indicator", () => {
  it("shows the localized re-check badge for stale section scores", () => {
    useAuthStore.getState().setAuthenticated(USER, "api");
    const store = useCvBuilderStore.getState();
    store.reset();
    store.markSectionNeedsRecheck("summary", {
      source: "manual_edit",
      fieldPath: "/sections/summary/content",
    });

    render(<CvSectionNav variant="vertical" />);

    expect(screen.getByText("builder.review.recheckShort")).toBeInTheDocument();
  });
});
