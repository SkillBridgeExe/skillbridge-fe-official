import { beforeEach, describe, expect, it } from "vitest";
import { useSidebarStore } from "./useSidebarStore";

describe("useSidebarStore focus mode", () => {
  beforeEach(() => {
    useSidebarStore.setState({ collapsed: false, forceCollapsed: false });
  });

  it("keeps the navigation collapsed while a focus screen owns it", () => {
    useSidebarStore.getState().setForceCollapsed(true);
    useSidebarStore.getState().toggleCollapsed();

    expect(useSidebarStore.getState()).toMatchObject({
      collapsed: true,
      forceCollapsed: true,
    });

    useSidebarStore.getState().setForceCollapsed(false);
    useSidebarStore.getState().setCollapsed(false);
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });
});
