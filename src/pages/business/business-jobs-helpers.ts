export function canCreateBusinessJobDraft(title: string): boolean {
  return title.trim().length >= 2;
}

export function normalizeBusinessJobSearch(value: string): string | undefined {
  return value.trim() || undefined;
}
