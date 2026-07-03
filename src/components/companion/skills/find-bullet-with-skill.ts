type BulletEntry = {
  id: string;
  description?: string;
  achievements?: string[] | string;
};

export type ProveItSkillTarget = {
  canonical: string;
  displayName: string;
};

export type BulletSkillMatch = {
  entryId: string;
  field: "description" | `achievements[${number}]`;
};

function normalizeSkillToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}.+#\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textHasSkill(text: string | undefined, skill: ProveItSkillTarget): boolean {
  const normalizedText = normalizeSkillToken(text ?? "");
  if (!normalizedText) return false;

  const candidates = [skill.displayName, skill.canonical]
    .map(normalizeSkillToken)
    .filter(Boolean);

  return candidates.some((candidate) => {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "u").test(normalizedText);
  });
}

function splitAchievements(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value;
  return (value ?? "").split(/\r?\n/);
}

export function findBulletWithSkill(entries: BulletEntry[], skill: ProveItSkillTarget): BulletSkillMatch | null {
  for (const entry of entries) {
    if (textHasSkill(entry.description, skill)) {
      return { entryId: entry.id, field: "description" };
    }

    const lines = splitAchievements(entry.achievements);
    const lineIndex = lines.findIndex((line) => textHasSkill(line, skill));
    if (lineIndex >= 0) {
      return { entryId: entry.id, field: `achievements[${lineIndex}]` };
    }
  }

  return null;
}
