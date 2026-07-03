export type RewriteField = "description" | "achievements";

function achievementLines(value: string): string[] {
  return value.split(/\r?\n/);
}

export function getAchievementLine(value: string, achievementIndex: number): string {
  return achievementLines(value)[achievementIndex] ?? "";
}

export function replaceAchievementLine(value: string, achievementIndex: number, nextLine: string): string {
  const lines = achievementLines(value);
  if (achievementIndex < 0 || achievementIndex >= lines.length) return value;
  lines[achievementIndex] = nextLine;
  return lines.join("\n");
}

export function suggestionKeyForField(
  entryId: string,
  field: RewriteField,
  achievementIndex?: number,
): string {
  const suffix = field === "achievements" && achievementIndex !== undefined ? `[${achievementIndex}]` : "";
  return `${entryId}_${field}${suffix}`;
}

export function parseAchievementFieldIndex(field: string): number | undefined {
  const raw = field.match(/^achievements\[(\d+)\]$/)?.[1];
  return raw === undefined ? undefined : Number(raw);
}
