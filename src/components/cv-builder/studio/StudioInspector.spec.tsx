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
    t: (key: string, fallbackOrOptions?: unknown) => {
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

  it("keeps the avatar URL editable while ATS mode hides the avatar preview", () => {
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

    expect(screen.getAllByText("builder.inspector.atsHiddenAvatarDesc").length).toBeGreaterThan(0);

    // Avatar keeps a URL input (restored in W97) alongside file-upload; it stays editable in ATS mode.
    const photoInput = screen.getByRole("textbox", { name: /builder.inspector.imageUrl/i });
    fireEvent.change(photoInput, { target: { value: "https://example.com/avatar.png" } });
    fireEvent.blur(photoInput);

    expect(setBasicInfoMock).toHaveBeenCalledWith("photoUrl", "https://example.com/avatar.png");
  });
});

describe("StudioInspector P4 pages panel", () => {
  const basePagesStore = (overrides: Record<string, unknown> = {}) => ({
    template: "gengar",
    sectionOrder: ["summary", "experience", "education", "projects", "certifications", "skills"],
    sectionVisibility: {},
    sectionPlacement: {},
    layoutPages: [{ id: "page_1" }],
    sectionPage: {},
    customSections: [],
    cvLanguage: "en",
    resumeAtsSafeMode: false,
    resumePageMargin: "normal",
    resumeSectionSpacing: "normal",
    resumeSidebarPosition: "left",
    resumeSidebarWidth: "normal",
    resumeDividerStyle: "line",
    resumeFontFamily: "inter",
    resumeFontScale: "normal",
    resumeLineHeight: "normal",
    resumeAccentColor: "#000000",
    addLayoutPage: vi.fn(),
    removeLayoutPage: vi.fn(),
    renameLayoutPage: vi.fn(),
    moveLayoutPage: vi.fn(),
    setLayoutPageFullWidth: vi.fn(),
    assignSectionToPage: vi.fn(),
    addCustomSection: vi.fn(),
    updateCustomSection: vi.fn(),
    removeCustomSection: vi.fn(),
    moveCustomSection: vi.fn(),
    setSectionVisibility: vi.fn(),
    setSectionPlacement: vi.fn(),
    moveSectionWithinGroup: vi.fn(),
    reorderSection: vi.fn(),
    resetSectionOrder: vi.fn(),
    ...overrides,
  });

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("adds a page and renames an existing one", () => {
    const store = basePagesStore();
    mockBuilderStore.mockReturnValue(store);

    render(<MockStudioInspector />);
    fireEvent.click(screen.getByRole("button", { name: /builder.inspector.structure/i }));

    fireEvent.click(screen.getByRole("button", { name: /builder.inspector.addPage/i }));
    expect(store.addLayoutPage).toHaveBeenCalled();

    const renameInput = screen.getByRole("textbox", { name: /builder.inspector.renamePage/i });
    fireEvent.change(renameInput, { target: { value: "Trang phụ" } });
    expect(store.renameLayoutPage).toHaveBeenCalledWith("page_1", "Trang phụ");
  });

  it("shows per-section page assignment only with 2+ pages", () => {
    mockBuilderStore.mockReturnValue(basePagesStore());
    const { unmount } = render(<MockStudioInspector />);
    fireEvent.click(screen.getByRole("button", { name: /builder.inspector.structure/i }));
    expect(screen.queryByText("builder.inspector.assignSections")).toBeNull();
    unmount();

    mockBuilderStore.mockReturnValue(
      basePagesStore({ layoutPages: [{ id: "page_1" }, { id: "page_2", name: "Extras" }] }),
    );
    render(<MockStudioInspector />);
    fireEvent.click(screen.getByRole("button", { name: /builder.inspector.structure/i }));
    expect(screen.getAllByText("builder.inspector.assignSections").length).toBeGreaterThan(0);
    // One page selector per assignable section.
    expect(screen.getAllByRole("combobox", { name: /builder.inspector.assignSectionToPage/i })).toHaveLength(6);
  });

  it("groups sections with the same default split the PDF adapter uses (summary defaults to sidebar)", () => {
    mockBuilderStore.mockReturnValue(basePagesStore());
    render(<MockStudioInspector />);
    fireEvent.click(screen.getByRole("button", { name: /builder.inspector.structure/i }));

    const mainHeader = screen.getByText("builder.inspector.mainColumn");
    const sidebarHeader = screen.getByText("builder.inspector.sidebar");
    const summaryLabel = screen.getByText("builder.tabSummary");
    const experienceLabel = screen.getByText("builder.tabExperience");

    // Main group renders before the sidebar header; summary (default sidebar
    // in the PDF adapter) must appear AFTER the sidebar header, experience before it.
    expect(sidebarHeader.compareDocumentPosition(summaryLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(experienceLabel.compareDocumentPosition(sidebarHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mainHeader).toBeDefined();
  });
});
