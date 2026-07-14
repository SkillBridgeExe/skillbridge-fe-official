// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: unknown) => {
      if (typeof fallbackOrOptions === "string") return fallbackOrOptions;
      return key;
    },
  }),
}));

import { CustomSectionEditor } from "./CustomSectionEditor";

const resetStore = () =>
  useCvBuilderStore.setState({
    customSections: [],
    sectionPage: {},
    layoutPages: [{ id: "page_1" }],
  });

describe("CustomSectionEditor", () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it("adds, hides and deletes a custom section through the store", () => {
    render(<CustomSectionEditor supportsCustomSections supportsSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "builder.inspector.addCustomSection" }));
    let sections = useCvBuilderStore.getState().customSections;
    expect(sections).toHaveLength(1);
    expect(sections[0].visible).toBe(true);
    expect(sections[0].placement).toBe("main");

    fireEvent.click(screen.getByRole("button", { name: "builder.inspector.hideSection" }));
    sections = useCvBuilderStore.getState().customSections;
    expect(sections[0].visible).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "builder.inspector.deleteCustomSection" }));
    expect(useCvBuilderStore.getState().customSections).toHaveLength(0);
  });

  it("toggles placement between main and sidebar", () => {
    useCvBuilderStore.getState().addCustomSection("Hoạt động");
    render(<CustomSectionEditor supportsCustomSections supportsSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "builder.inspector.moveToSidebar" }));
    expect(useCvBuilderStore.getState().customSections[0].placement).toBe("sidebar");
  });

  it("edits title and items in the dialog", () => {
    useCvBuilderStore.getState().addCustomSection("Hoạt động");
    render(<CustomSectionEditor supportsCustomSections supportsSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "builder.inspector.editCustomSection" }));

    const titleInput = screen.getByLabelText("builder.inspector.customSectionTitleLabel");
    fireEvent.change(titleInput, { target: { value: "Giải thưởng" } });
    expect(useCvBuilderStore.getState().customSections[0].title).toBe("Giải thưởng");

    fireEvent.click(screen.getByRole("button", { name: "builder.inspector.addCustomItem" }));
    const state = useCvBuilderStore.getState().customSections[0];
    expect(state.items).toHaveLength(1);

    const bodyInput = screen.getByPlaceholderText("builder.inspector.customItemBody");
    fireEvent.change(bodyInput, { target: { value: "Học bổng kỳ 1" } });
    expect(useCvBuilderStore.getState().customSections[0].items[0].body).toBe("Học bổng kỳ 1");
  });

  it("renders an honest unsupported state instead of dead controls", () => {
    render(<CustomSectionEditor supportsCustomSections={false} supportsSidebar />);

    expect(screen.getByText("builder.inspector.customSectionsUnsupported")).toBeDefined();
    expect(screen.queryByRole("button", { name: "builder.inspector.addCustomSection" })).toBeNull();
  });
});
