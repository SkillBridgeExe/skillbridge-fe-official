import { describe, it, expect } from "vitest";
import { isNavActive } from "./AppSidebar";

describe("isNavActive", () => {
  it("matches exact path", () => {
    expect(isNavActive("/dashboard", "/dashboard")).toBe(true);
  });

  it("matches nested path", () => {
    expect(isNavActive("/diagnosis/results", "/diagnosis")).toBe(true);
  });

  it("does not match partial prefix (e.g. /d vs /dashboard)", () => {
    expect(isNavActive("/dashboard", "/d")).toBe(false);
  });

  it("does not match sibling paths", () => {
    expect(isNavActive("/learning", "/diagnosis")).toBe(false);
  });

  it("root / only matches exact", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/dashboard", "/")).toBe(false);
  });

  it("matches child route with slash separator", () => {
    expect(isNavActive("/cv-studio/edit", "/cv-studio")).toBe(true);
  });

  it("does not match when item href is a longer string", () => {
    expect(isNavActive("/jobs", "/jobs/details")).toBe(false);
  });
});
