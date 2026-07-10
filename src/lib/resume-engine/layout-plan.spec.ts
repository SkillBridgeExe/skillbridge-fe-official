import { describe, expect, it } from "vitest";
import { applyLayoutCapabilities, normalizeLayoutPlan, sanitizeCustomSections } from "./layout-plan";
import { getTemplateCapabilities } from "./template-meta";

const BUILTIN = ["summary", "experience", "education", "projects", "skills", "certifications"];

describe("normalizeLayoutPlan", () => {
  it("builds a single default page with the historical main/sidebar split when the doc has no layout", () => {
    const plan = normalizeLayoutPlan(undefined, {
      knownSectionIds: BUILTIN,
      fallbackOrder: ["summary", "projects", "experience", "education", "skills", "certifications"],
    });

    expect(plan.pages).toHaveLength(1);
    expect(plan.pages[0].main).toEqual(["projects", "experience", "education"]);
    expect(plan.pages[0].sidebar).toEqual(["summary", "skills", "certifications"]);
  });

  it("dedupes section ids across pages, first occurrence wins", () => {
    const plan = normalizeLayoutPlan(
      {
        pages: [
          { id: "p1", main: ["summary", "experience"], sidebar: ["skills"] },
          { id: "p2", main: ["experience", "skills", "education"], sidebar: [] },
        ],
      },
      { knownSectionIds: BUILTIN, fallbackOrder: BUILTIN },
    );

    expect(plan.pages[0].main).toEqual(["summary", "experience"]);
    expect(plan.pages[0].sidebar).toEqual(["skills"]);
    // Missing sections land on the last page by their default placement.
    expect(plan.pages[1].main).toEqual(["education", "projects"]);
    expect(plan.pages[1].sidebar).toEqual(["certifications"]);
  });

  it("drops unknown ids and appends missing known sections by default placement", () => {
    const plan = normalizeLayoutPlan(
      { pages: [{ id: "p1", main: ["summary", "ghost_section"], sidebar: [] }] },
      { knownSectionIds: BUILTIN, fallbackOrder: BUILTIN },
    );

    expect(plan.pages[0].main).toEqual(["summary", "experience", "education", "projects"]);
    expect(plan.pages[0].sidebar).toEqual(["skills", "certifications"]);
  });

  it("appends missing custom sections to their preferred placement", () => {
    const plan = normalizeLayoutPlan(
      { pages: [{ id: "p1", main: BUILTIN, sidebar: [] }] },
      {
        knownSectionIds: [...BUILTIN, "custom_abc"],
        fallbackOrder: BUILTIN,
        preferredPlacement: { custom_abc: "sidebar" },
      },
    );

    expect(plan.pages[0].sidebar).toEqual(["custom_abc"]);
  });

  it("repairs missing and duplicate page ids deterministically", () => {
    const plan = normalizeLayoutPlan(
      {
        pages: [
          { id: "", main: ["summary"], sidebar: [] },
          { id: "page_1", main: ["experience"], sidebar: [] },
          { id: "page_1", main: ["education"], sidebar: [] },
        ],
      },
      { knownSectionIds: BUILTIN, fallbackOrder: BUILTIN },
    );

    const ids = plan.pages.map((page) => page.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe("page_1");

    const again = normalizeLayoutPlan(
      {
        pages: [
          { id: "", main: ["summary"], sidebar: [] },
          { id: "page_1", main: ["experience"], sidebar: [] },
          { id: "page_1", main: ["education"], sidebar: [] },
        ],
      },
      { knownSectionIds: BUILTIN, fallbackOrder: BUILTIN },
    );
    expect(again.pages.map((page) => page.id)).toEqual(ids);
  });

  it("keeps page names and fullWidth flags, discarding junk values", () => {
    const plan = normalizeLayoutPlan(
      {
        pages: [
          { id: "p1", name: "  Trang chính  ", fullWidth: true, main: BUILTIN, sidebar: [] },
          { id: "p2", name: "", fullWidth: "yes" as unknown as boolean, main: [], sidebar: [] },
        ],
      },
      { knownSectionIds: BUILTIN, fallbackOrder: BUILTIN },
    );

    expect(plan.pages[0].name).toBe("Trang chính");
    expect(plan.pages[0].fullWidth).toBe(true);
    expect(plan.pages[1].name).toBeUndefined();
    expect(plan.pages[1].fullWidth).toBeUndefined();
  });
});

describe("applyLayoutCapabilities", () => {
  it("merges sidebar into main for templates without sidebar sections", () => {
    const plan = {
      pages: [{ id: "p1", main: ["experience"], sidebar: ["skills", "summary"] }],
    };

    // Every registered template currently has usesSidebarSections=true; this
    // guards the contract for a future template that does not.
    const caps = { ...getTemplateCapabilities("onyx"), usesSidebarSections: false };
    const normalized = applyLayoutCapabilities(plan, caps);
    expect(normalized.pages[0].main).toEqual(["experience", "skills", "summary"]);
    expect(normalized.pages[0].sidebar).toEqual([]);
  });

  it("leaves sidebar-capable templates untouched", () => {
    const plan = {
      pages: [{ id: "p1", main: ["experience"], sidebar: ["skills"] }],
    };

    expect(applyLayoutCapabilities(plan, getTemplateCapabilities("gengar"))).toEqual(plan);
  });
});

describe("sanitizeCustomSections", () => {
  it("returns empty for non-array input", () => {
    expect(sanitizeCustomSections(undefined)).toEqual([]);
    expect(sanitizeCustomSections("nope")).toEqual([]);
  });

  it("drops sections without a title and items without content", () => {
    const sections = sanitizeCustomSections([
      { id: "c1", title: "  ", items: [], visible: true },
      {
        id: "c2",
        title: "Hoạt động",
        placement: "sidebar",
        visible: true,
        items: [
          { id: "i1", heading: "CLB Guitar", body: "Trưởng nhóm 2024" },
          { id: "i2", heading: "", body: "   " },
        ],
      },
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe("c2");
    expect(sections[0].placement).toBe("sidebar");
    expect(sections[0].items).toEqual([{ id: "i1", heading: "CLB Guitar", body: "Trưởng nhóm 2024" }]);
  });

  it("derives deterministic ids when missing and dedupes collisions", () => {
    const input = [
      { title: "Awards", items: [{ body: "Học bổng kỳ 1" }], visible: true },
      { title: "Awards", items: [{ body: "Học bổng kỳ 2" }], visible: true },
    ];

    const first = sanitizeCustomSections(input);
    const second = sanitizeCustomSections(input);

    expect(first[0].id).toMatch(/^custom_/);
    expect(first[0].items[0].id).toMatch(/^custom_item_/);
    expect(new Set(first.map((section) => section.id)).size).toBe(2);
    expect(second).toEqual(first);
  });

  it("coerces junk shapes instead of throwing (import trust boundary)", () => {
    const sections = sanitizeCustomSections([
      null,
      42,
      { title: "OK", placement: "diagonal", visible: "yes", items: [null, { body: "text" }] },
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].placement).toBe("main");
    expect(sections[0].visible).toBe(true);
    expect(sections[0].items).toHaveLength(1);
  });
});
