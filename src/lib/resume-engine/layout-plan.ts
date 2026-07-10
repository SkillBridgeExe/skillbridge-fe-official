import type { CustomSection, CustomSectionItem, LayoutPage, ResumeLayoutPlan } from "./document-v1";
import type { TemplateCapabilities } from "./template-meta";

const MAX_CUSTOM_SECTION_TITLE = 120;

/**
 * Shared chokepoint for every path that loads or renders a layout plan
 * (load, import, restore, store -> renderer adapter). Pure and deterministic:
 * never generates random IDs, so the same input always normalizes the same way.
 */
export type NormalizeLayoutPlanOptions = {
  /** Every section ID that must appear exactly once across pages (builtin keys + custom section IDs). */
  knownSectionIds: string[];
  /** Order used to build the single default page for docs without a layout plan. */
  fallbackOrder: string[];
  /** Where a known-but-missing section should land (defaults to "main"). */
  preferredPlacement?: Record<string, "main" | "sidebar">;
};

function hashString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function uniquePageId(candidate: unknown, index: number, used: Set<string>): string {
  let id = typeof candidate === "string" && candidate.trim() ? candidate.trim() : `page_${index + 1}`;
  while (used.has(id)) id = `${id}_dup`;
  used.add(id);
  return id;
}

export function normalizeLayoutPlan(
  layout: ResumeLayoutPlan | undefined,
  options: NormalizeLayoutPlanOptions,
): ResumeLayoutPlan {
  const known = new Set(options.knownSectionIds);
  const seen = new Set<string>();
  const usedPageIds = new Set<string>();

  const takeSections = (ids: unknown): string[] => {
    if (!Array.isArray(ids)) return [];
    const result: string[] = [];
    for (const id of ids) {
      if (typeof id !== "string" || !known.has(id) || seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
    return result;
  };

  const rawPages = Array.isArray(layout?.pages) ? layout.pages.filter((page) => page && typeof page === "object") : [];

  const pages: LayoutPage[] = rawPages.map((page, index) => ({
    id: uniquePageId(page.id, index, usedPageIds),
    ...(typeof page.name === "string" && page.name.trim() ? { name: page.name.trim() } : {}),
    ...(page.fullWidth === true ? { fullWidth: true } : {}),
    main: takeSections(page.main),
    sidebar: takeSections(page.sidebar),
  }));

  if (pages.length === 0) {
    pages.push({ id: uniquePageId("page_1", 0, usedPageIds), main: [], sidebar: [] });
  }

  // Known-but-unplaced sections (legacy docs without a plan, or new sections)
  // land on the last page using their preferred/default placement — this must
  // reproduce the historical main/sidebar split for docs saved before P4.
  const lastPage = pages[pages.length - 1];
  const orderedKnown = [
    ...options.fallbackOrder.filter((id) => known.has(id)),
    ...options.knownSectionIds.filter((id) => !options.fallbackOrder.includes(id)),
  ];
  for (const id of orderedKnown) {
    if (seen.has(id)) continue;
    seen.add(id);
    const placement = options.preferredPlacement?.[id] ?? defaultSectionPlacement(id);
    if (placement === "sidebar") lastPage.sidebar.push(id);
    else lastPage.main.push(id);
  }

  return { pages };
}

/**
 * Capability normalization happens here at render time and never mutates the
 * saved document, so a setting saved for an unsupported template is preserved
 * for a later compatible template.
 */
export function applyLayoutCapabilities(plan: ResumeLayoutPlan, caps: TemplateCapabilities): ResumeLayoutPlan {
  // ponytail: every registered template supports multiple pages (shared document.tsx
  // renders layout.pages generically), so only sidebar support needs normalizing here.
  if (caps.usesSidebarSections) return plan;
  return {
    pages: plan.pages.map((page) => ({
      ...page,
      main: [...page.main, ...page.sidebar],
      sidebar: [],
    })),
  };
}

/** Builder sections that default to the main column when the user has not chosen a placement (mirrors the historical adapter split). */
export const DEFAULT_MAIN_SECTIONS = new Set(["experience", "education", "projects"]);

export function defaultSectionPlacement(sectionId: string): "main" | "sidebar" {
  return DEFAULT_MAIN_SECTIONS.has(sectionId) ? "main" : "sidebar";
}

/**
 * Structural slice of the builder store that owns layout editing. Kept as its
 * own type (not CvBuilderState) so this module stays free of store imports.
 */
export type StudioLayoutState = {
  sectionOrder: string[];
  sectionPlacement: Partial<Record<string, "main" | "sidebar">>;
  layoutPages: Array<{ id: string; name?: string; fullWidth?: boolean }>;
  sectionPage: Record<string, string>;
  customSections: CustomSection[];
};

/**
 * Store (editing projection) -> canonical layout plan. Custom sections keep
 * their own relative order and always follow the builtin sections within a
 * placement.
 */
// ponytail: custom sections cannot interleave between builtin sections; lift
// sectionOrder to string[] if that ever becomes a real ask.
export function buildLayoutPlanFromState(state: StudioLayoutState): ResumeLayoutPlan {
  const pages = state.layoutPages.length
    ? state.layoutPages
    : [{ id: "page_1" } as StudioLayoutState["layoutPages"][number]];
  const firstPageId = pages[0].id;

  const entries = [
    ...state.sectionOrder.map((id) => ({
      id,
      placement: state.sectionPlacement[id] ?? defaultSectionPlacement(id),
    })),
    ...state.customSections.map((section) => ({ id: section.id, placement: section.placement })),
  ];

  return {
    pages: pages.map((page) => ({
      id: page.id,
      ...(page.name ? { name: page.name } : {}),
      ...(page.fullWidth ? { fullWidth: true } : {}),
      main: entries
        .filter((entry) => entry.placement === "main" && (state.sectionPage[entry.id] ?? firstPageId) === page.id)
        .map((entry) => entry.id),
      sidebar: entries
        .filter((entry) => entry.placement === "sidebar" && (state.sectionPage[entry.id] ?? firstPageId) === page.id)
        .map((entry) => entry.id),
    })),
  };
}

/** Canonical layout plan -> store editing projection (inverse of buildLayoutPlanFromState). */
export function decomposeLayoutPlan(plan: ResumeLayoutPlan): {
  layoutPages: StudioLayoutState["layoutPages"];
  sectionPage: Record<string, string>;
  sectionPlacement: Record<string, "main" | "sidebar">;
  flatOrder: string[];
} {
  const sectionPage: Record<string, string> = {};
  const sectionPlacement: Record<string, "main" | "sidebar"> = {};
  const flatOrder: string[] = [];

  for (const page of plan.pages) {
    for (const id of page.main) {
      sectionPage[id] = page.id;
      sectionPlacement[id] = "main";
      flatOrder.push(id);
    }
    for (const id of page.sidebar) {
      sectionPage[id] = page.id;
      sectionPlacement[id] = "sidebar";
      flatOrder.push(id);
    }
  }

  return {
    layoutPages: plan.pages.map((page) => ({
      id: page.id,
      ...(page.name ? { name: page.name } : {}),
      ...(page.fullWidth ? { fullWidth: true } : {}),
    })),
    sectionPage,
    sectionPlacement,
    flatOrder,
  };
}

/**
 * The single definition of how custom sections project into canonical
 * `activities` (BE autosave). Hydrate compares against this projection to
 * decide whether the local sections still describe the server content.
 */
export function projectCustomSectionsToActivities(
  sections: CustomSection[],
): Array<{ org: string; role: null; bullets: string[] }> {
  return sections
    .filter((section) => section.visible && section.title.trim())
    .map((section) => ({
      org: section.title.trim(),
      role: null,
      bullets: section.items
        .map((item) => (item.heading ? `${item.heading}: ${item.body}` : item.body).trim())
        .filter(Boolean),
    }));
}

/** Trust boundary companion for import: coerce an arbitrary layoutPages value into a safe page list. */
export function sanitizeLayoutPages(input: unknown): Array<{ id: string; name?: string; fullWidth?: boolean }> {
  if (!Array.isArray(input)) return [{ id: "page_1" }];
  const used = new Set<string>();
  const pages = input
    .filter((page): page is Record<string, unknown> => !!page && typeof page === "object")
    .map((page, index) => ({
      id: uniquePageId(page.id, index, used),
      ...(typeof page.name === "string" && page.name.trim() ? { name: page.name.trim() } : {}),
      ...(page.fullWidth === true ? { fullWidth: true } : {}),
    }));
  return pages.length ? pages : [{ id: "page_1" }];
}

/** Trust boundary companion for import: keep only string->string page assignments. */
export function sanitizeSectionPage(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
    ),
  );
}

/**
 * Trust boundary for custom sections: import/restore accept arbitrary JSON.
 * Coerces shapes, drops empty items, and keeps IDs opaque and deterministic
 * (missing IDs are re-derived from content, never random).
 */
export function sanitizeCustomSections(input: unknown): CustomSection[] {
  if (!Array.isArray(input)) return [];

  const usedIds = new Set<string>();
  const sections: CustomSection[] = [];

  for (const [index, raw] of input.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Partial<CustomSection>;

    const title = typeof candidate.title === "string" ? candidate.title.trim().slice(0, MAX_CUSTOM_SECTION_TITLE) : "";
    if (!title) continue;

    const items: CustomSectionItem[] = [];
    if (Array.isArray(candidate.items)) {
      for (const [itemIndex, rawItem] of candidate.items.entries()) {
        if (!rawItem || typeof rawItem !== "object") continue;
        const item = rawItem as Partial<CustomSectionItem>;
        const heading = typeof item.heading === "string" ? item.heading.trim() : "";
        const body = typeof item.body === "string" ? item.body.trim() : "";
        if (!heading && !body) continue;
        const itemId =
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `custom_item_${hashString(`${title}|${itemIndex}|${heading}|${body}`)}`;
        items.push({ id: itemId, ...(heading ? { heading } : {}), body });
      }
    }

    let id =
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id.trim()
        : `custom_${hashString(`${title}|${index}`)}`;
    while (usedIds.has(id)) id = `${id}_dup`;
    usedIds.add(id);

    sections.push({
      id,
      title,
      placement: candidate.placement === "sidebar" ? "sidebar" : "main",
      items,
      visible: candidate.visible !== false,
    });
  }

  return sections;
}
