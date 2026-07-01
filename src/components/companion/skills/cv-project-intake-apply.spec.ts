import { describe, expect, it } from "vitest";
import { computeProjectIntakeFields, type CurrentProjectEntry } from "./cv-project-intake-apply";
import type { ProjectIntakeProject } from "@shared/api";

const emptyEntry: CurrentProjectEntry = {
  name: "", role: "", tools: "", link: "", description: "",
};

const filledEntry: CurrentProjectEntry = {
  name: "Old name", role: "Old role", tools: "vue", link: "old.com", description: "Old desc",
};

const baseProject: ProjectIntakeProject = {
  name: "Shop Online",
  role: "Team of 4",
  tech: ["react", "node_js"],
  bullets: ["Built cart", "Deployed to Vercel"],
  link: "github.com/me/shop",
  found_fields: ["name", "role", "tech", "link", "bullets"],
  missing_fields: [],
};

describe("computeProjectIntakeFields", () => {
  it("marks all found+non-empty fields as autoApply when entry is empty", () => {
    const diffs = computeProjectIntakeFields(baseProject, emptyEntry);
    expect(diffs.length).toBe(5);
    expect(diffs.every((d) => d.autoApply)).toBe(true);
    expect(diffs.find((d) => d.field === "name")?.after).toBe("Shop Online");
    // tech[] joined with ", " ; bullets[] rendered as markdown list
    expect(diffs.find((d) => d.field === "tools")?.after).toBe("react, node_js");
    expect(diffs.find((d) => d.field === "description")?.after).toBe("- Built cart\n- Deployed to Vercel");
  });

  it("marks filled fields as opt-in (autoApply=false) and keeps before/after", () => {
    const diffs = computeProjectIntakeFields(baseProject, filledEntry);
    const name = diffs.find((d) => d.field === "name")!;
    expect(name.autoApply).toBe(false);
    expect(name.before).toBe("Old name");
    expect(name.after).toBe("Shop Online");
  });

  it("skips a field the BE marked not-found even if a value is present", () => {
    const project: ProjectIntakeProject = {
      ...baseProject,
      found_fields: ["name", "tech", "link", "bullets"], // role dropped
    };
    const diffs = computeProjectIntakeFields(project, emptyEntry);
    expect(diffs.find((d) => d.field === "role")).toBeUndefined();
  });

  it("skips a found field whose extracted value is empty", () => {
    const project: ProjectIntakeProject = { ...baseProject, name: "", tech: [] };
    const diffs = computeProjectIntakeFields(project, emptyEntry);
    expect(diffs.find((d) => d.field === "name")).toBeUndefined();
    expect(diffs.find((d) => d.field === "tools")).toBeUndefined();
  });

  it("localizes labels", () => {
    const en = computeProjectIntakeFields(baseProject, emptyEntry, "en");
    expect(en.find((d) => d.field === "name")?.label).toBe("Project name");
    const vi = computeProjectIntakeFields(baseProject, emptyEntry, "vi");
    expect(vi.find((d) => d.field === "name")?.label).toBe("Tên dự án");
  });
});
