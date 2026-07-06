import type { ResumeDocumentV1 } from "./document-v1";

export type ResumeDocumentPath = string;

export type ResumePatchOperation =
  | { op: "replace"; path: ResumeDocumentPath; value: unknown }
  | { op: "add"; path: ResumeDocumentPath; value: unknown }
  | { op: "remove"; path: ResumeDocumentPath };

export interface ResumePatchSummaryItem {
  path: string;
  section: "summary" | "projects" | "experience" | "unknown";
  label: string;
  before: string;
  after: string;
}

export interface ResumePatchSummary {
  changes: ResumePatchSummaryItem[];
}

// Allowed static and dynamic path prefixes
const ALLOWED_STATIC_PATHS = new Set([
  "/sections/summary/content",
]);

const ALLOWED_DYNAMIC_PREFIXES = [
  { prefix: "/sections/projects/items/", suffix: "/description", section: "projects", label: "Project Description" },
  { prefix: "/sections/projects/items/", suffix: "/contribution", section: "projects", label: "Project Contribution" },
  { prefix: "/sections/projects/items/", suffix: "/result", section: "projects", label: "Project Result" },
  { prefix: "/sections/experience/items/", suffix: "/description", section: "experience", label: "Experience Description" },
  { prefix: "/sections/experience/items/", suffix: "/responsibilities", section: "experience", label: "Experience Responsibilities" },
  { prefix: "/sections/experience/items/", suffix: "/achievements", section: "experience", label: "Experience Achievements" },
] as const;

type PatchTarget =
  | { section: "summary"; label: string; read: (document: ResumeDocumentV1) => string; write: (document: ResumeDocumentV1, value: string) => void }
  | { section: "projects"; label: string; read: (document: ResumeDocumentV1) => string; write: (document: ResumeDocumentV1, value: string) => void }
  | { section: "experience"; label: string; read: (document: ResumeDocumentV1) => string; write: (document: ResumeDocumentV1, value: string) => void };

function isPathAllowed(path: string): boolean {
  if (ALLOWED_STATIC_PATHS.has(path)) return true;
  for (const rule of ALLOWED_DYNAMIC_PREFIXES) {
    if (path.startsWith(rule.prefix) && path.endsWith(rule.suffix)) {
      // Must have exactly one ID part between prefix and suffix
      const middle = path.substring(rule.prefix.length, path.length - rule.suffix.length);
      if (middle.length > 0 && !middle.includes("/")) {
        return true;
      }
    }
  }
  return false;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function rejectIfUnsupportedTextPayload(value: string, path: string): void {
  const trimmed = value.trim();
  const looksLikeJsonContainer =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));

  if (!looksLikeJsonContainer) {
    return;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed !== null && typeof parsed === "object") {
      throw new Error(`Structured JSON payload rejected for text path ${path}`);
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return;
    }
    throw error;
  }
}

function resolvePatchTarget(document: ResumeDocumentV1, path: string): PatchTarget {
  if (!isPathAllowed(path)) {
    throw new Error(`Unauthorized patch path: ${path}`);
  }

  if (path === "/sections/summary/content") {
    return {
      section: "summary",
      label: "Professional Summary",
      read: (doc) => doc.sections.summary.content,
      write: (doc, value) => {
        doc.sections.summary.content = value;
      },
    };
  }

  if (path.startsWith("/sections/projects/items/")) {
    const match = path.match(/^\/sections\/projects\/items\/([^/]+)\/(description|contribution|result)$/);
    if (!match) throw new Error(`Invalid project path: ${path}`);
      const id = match[1];
      const field = match[2] as "description" | "contribution" | "result";
    const item = document.sections.projects.items.find((i) => i.id === id);
      if (!item) throw new Error(`Target project ID not found: ${id}`);

    return {
      section: "projects",
      label: `Project ${field.charAt(0).toUpperCase() + field.slice(1)}`,
      read: (doc) => doc.sections.projects.items.find((i) => i.id === id)?.[field] ?? "",
      write: (doc, value) => {
        const target = doc.sections.projects.items.find((i) => i.id === id);
        if (!target) throw new Error(`Target project ID not found during apply: ${id}`);
        target[field] = value;
      },
    };
  }

  if (path.startsWith("/sections/experience/items/")) {
    const match = path.match(/^\/sections\/experience\/items\/([^/]+)\/(description|responsibilities|achievements)$/);
    if (!match) throw new Error(`Invalid experience path: ${path}`);
      const id = match[1];
      const field = match[2] as "description" | "responsibilities" | "achievements";
    const item = document.sections.experience.items.find((i) => i.id === id);
      if (!item) throw new Error(`Target experience ID not found: ${id}`);

    return {
      section: "experience",
      label: `Experience ${field.charAt(0).toUpperCase() + field.slice(1)}`,
      read: (doc) => doc.sections.experience.items.find((i) => i.id === id)?.[field] ?? "",
      write: (doc, value) => {
        const target = doc.sections.experience.items.find((i) => i.id === id);
        if (!target) throw new Error(`Target experience ID not found during apply: ${id}`);
        target[field] = value;
      },
    };
  }

  throw new Error(`Unauthorized patch path: ${path}`);
}

function validateReplaceOperation(
  document: ResumeDocumentV1,
  op: ResumePatchOperation,
  options?: { allowEmptyText?: boolean },
): { target: PatchTarget; value: string } {
  if (op.op !== "replace") {
    throw new Error(`Unsupported patch operation: ${op.op}`);
  }

  const target = resolvePatchTarget(document, op.path);
  if (typeof op.value !== "string") {
    throw new Error(`Invalid patch value type: expected string for text path ${op.path}`);
  }

  const value = op.value;
  if (!value.trim() && !options?.allowEmptyText) {
    throw new Error(`Empty text replacement rejected for path ${op.path}`);
  }

  rejectIfUnsupportedTextPayload(value, op.path);
  return { target, value };
}

export function applyResumePatch(
  document: ResumeDocumentV1,
  operations: ResumePatchOperation[],
  options?: { allowEmptyText?: boolean },
): ResumeDocumentV1 {
  const validated = operations.map((op) => validateReplaceOperation(document, op, options));
  const cloned = deepClone(document);

  for (const { target, value } of validated) {
    target.write(cloned, value);
  }

  if (cloned.schemaVersion !== 1) {
    throw new Error("Patch illegally mutated schemaVersion");
  }

  return cloned;
}

export function summarizeResumePatch(
  document: ResumeDocumentV1,
  operations: ResumePatchOperation[],
): ResumePatchSummary {
  return {
    changes: operations.map((op) => {
      const { target, value } = validateReplaceOperation(document, op);
      return {
      path: op.path,
        section: target.section,
        label: target.label,
        before: target.read(document),
        after: value,
      };
    }),
  };
}
