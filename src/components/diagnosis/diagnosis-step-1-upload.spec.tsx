/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { DiagnosisStep1Upload } from "./DiagnosisStep1Upload";
import { useDiagnosisRolesQuery } from "@/hooks/use-diagnosis-roles";
import { useTranslation } from "react-i18next";
import { TooltipProvider } from "@radix-ui/react-tooltip";

// Mock the hook
vi.mock("@/hooks/use-diagnosis-roles", () => ({
  useDiagnosisRolesQuery: vi.fn(),
}));

// Mock translations
vi.mock("react-i18next", () => ({
  useTranslation: vi.fn(),
}));

vi.mock("@/hooks/use-diagnosis", () => ({
  useAnalyzeCvMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
  useAnalyzeCvWithJdMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
  useCvHistoryQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useLoadCvFromHistoryMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
}));

// Mock PostHog
vi.mock("@posthog/react", () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

// Mock Stores & Auth
vi.mock("@/store/useDiagnosisStore", () => ({
  useDiagnosisStore: () => ({
    targetRole: "",
    setTargetRole: vi.fn(),
  }),
}));
vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: () => false,
}));
vi.mock("@/hooks/use-api-session", () => ({
  useHasApiSession: () => true,
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { MemoryRouter } from "react-router-dom";

// Mock Select to just render its children for easier testing
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <div>{placeholder}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-testid="select-item" data-value={value}>{children}</div>,
}));

describe("DiagnosisStep1Upload - Target Role Picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading state", () => {
    vi.mocked(useDiagnosisRolesQuery).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useDiagnosisRolesQuery>);
    
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
      i18n: { language: "vi", resolvedLanguage: "vi" },
    } as unknown as ReturnType<typeof useTranslation>);

    render(
      <MemoryRouter>
        <TooltipProvider>
          <DiagnosisStep1Upload />
        </TooltipProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("upload.loadingRoles")).toBeInTheDocument();
  });

  it("renders error state", () => {
    vi.mocked(useDiagnosisRolesQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useDiagnosisRolesQuery>);
    
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
      i18n: { language: "vi", resolvedLanguage: "vi" },
    } as unknown as ReturnType<typeof useTranslation>);

    render(
      <MemoryRouter>
        <TooltipProvider>
          <DiagnosisStep1Upload />
        </TooltipProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("upload.errorRoles")).toBeInTheDocument();
  });

  it("renders Vietnamese labels when language is vi", () => {
    vi.mocked(useDiagnosisRolesQuery).mockReturnValue({
      data: [
        { code: "frontend", label_vi: "Lập trình viên Frontend", label_en: "Frontend Developer" }
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDiagnosisRolesQuery>);
    
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
      i18n: { language: "vi", resolvedLanguage: "vi" },
    } as unknown as ReturnType<typeof useTranslation>);

    render(
      <MemoryRouter>
        <TooltipProvider>
          <DiagnosisStep1Upload />
        </TooltipProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Lập trình viên Frontend")).toBeInTheDocument();
    expect(screen.queryByText("Frontend Developer")).not.toBeInTheDocument();
  });

  it("renders English labels when language is not vi", () => {
    vi.mocked(useDiagnosisRolesQuery).mockReturnValue({
      data: [
        { code: "frontend", label_vi: "Lập trình viên Frontend", label_en: "Frontend Developer" }
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDiagnosisRolesQuery>);
    
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
      i18n: { language: "en", resolvedLanguage: "en" },
    } as unknown as ReturnType<typeof useTranslation>);

    render(
      <MemoryRouter>
        <TooltipProvider>
          <DiagnosisStep1Upload />
        </TooltipProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Frontend Developer")).toBeInTheDocument();
    expect(screen.queryByText("Lập trình viên Frontend")).not.toBeInTheDocument();
  });

  it("renders Vietnamese labels when language starts with vi (e.g. vi-VN)", () => {
    vi.mocked(useDiagnosisRolesQuery).mockReturnValue({
      data: [
        { code: "frontend", label_vi: "Lập trình viên Frontend", label_en: "Frontend Developer" }
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useDiagnosisRolesQuery>);
    
    vi.mocked(useTranslation).mockReturnValue({
      t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
      i18n: { language: "vi-VN", resolvedLanguage: "vi-VN" },
    } as unknown as ReturnType<typeof useTranslation>);

    render(
      <MemoryRouter>
        <TooltipProvider>
          <DiagnosisStep1Upload />
        </TooltipProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Lập trình viên Frontend")).toBeInTheDocument();
    expect(screen.queryByText("Frontend Developer")).not.toBeInTheDocument();
  });
});
