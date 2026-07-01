// ─── cv-project-intake-apply ────────────────────────────────────────
// Pure diff logic for the project narrative intake (W34). Kept out of the
// React component so it's unit-testable — mirrors cv-intake-apply.ts.
//
// Anti-fab: only surfaces fields the BE marked found + non-empty. Never
// invents values; autoApply is limited to fields the user left blank.

import type { ProjectIntakeProject } from "@shared/api";

export interface CurrentProjectEntry {
  name: string;
  role: string;
  tools: string;
  link: string;
  description: string;
}

export interface ProjectIntakeFieldDiff {
  field: string;
  label: string;
  before: string;
  after: string;
  autoApply: boolean;
}

export function computeProjectIntakeFields(
  project: ProjectIntakeProject,
  current: CurrentProjectEntry,
  locale: "vi" | "en" = "vi",
): ProjectIntakeFieldDiff[] {
  const diffs: ProjectIntakeFieldDiff[] = [];
  const fields = [
    {
      key: "name",
      label: { vi: "Tên dự án", en: "Project name" },
      before: current.name,
      after: project.name,
      found: project.found_fields.includes("name"),
    },
    {
      key: "role",
      label: { vi: "Vai trò", en: "Role" },
      before: current.role,
      after: project.role ?? "",
      found: project.found_fields.includes("role"),
    },
    {
      key: "tools",
      label: { vi: "Công nghệ", en: "Technologies" },
      before: current.tools,
      after: (project.tech ?? []).join(", "),
      found: project.found_fields.includes("tech"),
    },
    {
      key: "link",
      label: { vi: "Liên kết", en: "Project link" },
      before: current.link,
      after: project.link ?? "",
      found: project.found_fields.includes("link"),
    },
    {
      key: "description",
      label: { vi: "Mô tả dự án", en: "Project description" },
      before: current.description,
      after: (project.bullets ?? []).map((b) => `- ${b}`).join("\n"),
      found: project.found_fields.includes("bullets"),
    },
  ];

  for (const f of fields) {
    if (!f.found || !f.after.trim()) continue;
    diffs.push({
      field: f.key,
      label: f.label[locale],
      before: f.before.trim(),
      after: f.after.trim(),
      autoApply: !f.before.trim(),
    });
  }
  return diffs;
}
