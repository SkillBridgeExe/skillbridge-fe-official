// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock zustand store
vi.mock("@/store/useCvBuilderStore", () => ({
  useCvBuilderStore: vi.fn(),
}));

// Mock translations
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions: any) => {
      if (typeof fallbackOrOptions === "string") return fallbackOrOptions;
      return key;
    },
  }),
}));

import { StudioInspector } from "./StudioInspector";

const MockStudioInspector = () => (
  <TooltipProvider>
    <StudioInspector />
  </TooltipProvider>
);

describe("StudioInspector ATS Safe Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the ATS Safe Mode toggle and updates the store", () => {
    const setResumeAtsSafeModeMock = vi.fn();
    
    (useCvBuilderStore as any).mockReturnValue({
      template: "onyx",
      sectionOrder: [],
      sectionVisibility: {},
      sectionPlacement: {},
      cvLanguage: "en",
      resumeAtsSafeMode: false,
      resumePageMargin: "compact",
      resumeSectionSpacing: "compact",
      resumeSidebarPosition: "left",
      resumeSidebarWidth: "normal",
      resumeDividerStyle: "line",
      resumeFontFamily: "inter",
      resumeFontScale: "normal",
      resumeLineHeight: "normal",
      resumeAccentColor: "#000000",
      setResumeAtsSafeMode: setResumeAtsSafeModeMock,
    });

    render(<MockStudioInspector />);
    
    // Open the Layout accordion
    const layoutTab = screen.getAllByText("builder.tabLayout")[0];
    fireEvent.click(layoutTab);
    
    // Find ATS switch (since we use a label "ATS Safe Mode")
    const label = screen.getAllByText(/ATS Safe Mode/i)[0];
    expect(label).toBeDefined();
    
    const atsSwitch = screen.getByRole("switch", { name: /ATS Safe Mode/i });
    expect(atsSwitch).toBeDefined();
    expect(atsSwitch.getAttribute("aria-checked")).toBe("false");

    // Toggle ATS safe mode
    fireEvent.click(atsSwitch);
    expect(setResumeAtsSafeModeMock).toHaveBeenCalledWith(true);
  });
});
