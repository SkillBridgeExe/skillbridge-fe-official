// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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

const mockBuilderStore = useCvBuilderStore as unknown as {
  mockReturnValue: (value: unknown) => void;
};

describe("StudioInspector ATS Safe Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the ATS Safe Mode toggle and updates the store", () => {
    const setResumeAtsSafeModeMock = vi.fn();
    
    mockBuilderStore.mockReturnValue({
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
    fireEvent.click(screen.getByRole("button", { name: /builder.tabLayout/i }));
    
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

  it("hides the avatar preview in ATS safe mode (avatar is upload-only)", () => {
    const setBasicInfoMock = vi.fn();
    const setResumeAtsSafeModeMock = vi.fn();

    mockBuilderStore.mockReturnValue({
      template: "azurill",
      sectionOrder: [],
      sectionVisibility: {},
      sectionPlacement: {},
      cvLanguage: "en",
      photoUrl: "https://example.com/old-avatar.png",
      resumeAtsSafeMode: true,
      resumePageMargin: "normal",
      resumeSectionSpacing: "normal",
      resumeSidebarPosition: "left",
      resumeSidebarWidth: "normal",
      resumeDividerStyle: "line",
      resumeFontFamily: "inter",
      resumeFontScale: "normal",
      resumeLineHeight: "normal",
      resumeAccentColor: "#000000",
      resumeHideSectionIcons: false,
      resumePictureVisible: true,
      resumePictureShape: "circle",
      resumePictureSize: 64,
      resumePictureBorderWidth: 0,
      resumePictureBorderColor: "rgba(0,0,0,0)",
      setBasicInfo: setBasicInfoMock,
      setResumeAtsSafeMode: setResumeAtsSafeModeMock,
      setResumePictureVisible: vi.fn(),
      setResumePictureShape: vi.fn(),
      setResumePictureSize: vi.fn(),
      setResumePictureBorderWidth: vi.fn(),
      setResumePictureBorderColor: vi.fn(),

    });

    render(<MockStudioInspector />);

    fireEvent.click(screen.getByRole("button", { name: /builder.inspector.pictureAvatar/i }));

    // ATS safe mode hides the avatar preview → the "hidden" hint is shown. The raw URL input was
    // removed in W96 in favour of file-upload + crop, so we no longer assert URL editing here.
    expect(screen.getAllByText("builder.inspector.atsHiddenAvatarDesc").length).toBeGreaterThan(0);
  });
});
