// ─── cv-intake-apply ────────────────────────────────────────────────
// Pure logic: compute which fields to apply from the extracted data.
// Anti-clobber: empty fields → autoApply; non-empty with different value → opt-in.

import type { ExtractResponse } from "@/types/companion";

export interface IntakeFieldDiff {
  /** Store field name (company, position, startDate, endDate, description, achievements). */
  field: string;
  /** Label for UI display. */
  label: string;
  /** Current value in store. */
  before: string;
  /** Extracted value from AI. */
  after: string;
  /** true = field was empty → auto-apply. false = non-empty + different → needs opt-in. */
  autoApply: boolean;
}

/** Map BE extract field names → store WorkExperience field names. */
const FIELD_MAP: Record<string, string> = {
  company: "company",
  position: "position",
  start: "startDate",
  end: "endDate",
  description: "description",
  achievements: "achievements",
};

const FIELD_LABELS: Record<string, { vi: string; en: string }> = {
  company: { vi: "Công ty", en: "Company" },
  position: { vi: "Vị trí", en: "Position" },
  start: { vi: "Bắt đầu", en: "Start date" },
  end: { vi: "Kết thúc", en: "End date" },
  description: { vi: "Mô tả", en: "Description" },
  achievements: { vi: "Thành tích", en: "Achievements" },
};

export interface CurrentEntry {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  achievements: string;
}

/**
 * Compute the diff between extracted fields and current entry.
 * Returns an array of IntakeFieldDiff for the preview UI.
 */
export function computeIntakeFields(
  extracted: ExtractResponse,
  current: CurrentEntry,
  locale: "vi" | "en" = "vi",
): IntakeFieldDiff[] {
  const diffs: IntakeFieldDiff[] = [];
  const fields = extracted.fields;

  for (const [beKey, storeKey] of Object.entries(FIELD_MAP)) {
    const fieldData = fields[beKey as keyof typeof fields];
    if (!fieldData) continue;

    // Convert value to string
    const afterRaw = Array.isArray(fieldData.value)
      ? fieldData.value.join("\n")
      : (fieldData.value ?? "");
    const after = afterRaw.trim();

    // Skip empty extracted values
    if (!after) continue;

    const before = (current[storeKey as keyof CurrentEntry] ?? "").trim();
    const label = FIELD_LABELS[beKey]?.[locale] ?? beKey;

    diffs.push({
      field: storeKey,
      label,
      before,
      after,
      autoApply: !before, // empty → auto; non-empty → opt-in
    });
  }

  return diffs;
}
