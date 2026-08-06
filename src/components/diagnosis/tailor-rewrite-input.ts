export interface TailorRewriteInput {
  initialText: string;
  requiresManualSelection: boolean;
}

/**
 * Prefer evidence pinned by the backend, then a bullet found in the current CV.
 * When neither exists, expose an explicit manual-selection state so the UI never
 * presents an unexplained blank rewrite dialog.
 */
export function resolveTailorRewriteInput(
  actionBefore: string | null | undefined,
  candidates: string[],
): TailorRewriteInput {
  const exact = actionBefore?.trim();
  if (exact) {
    return { initialText: exact, requiresManualSelection: false };
  }

  const candidate = candidates.find((item) => item.trim())?.trim();
  if (candidate) {
    return { initialText: candidate, requiresManualSelection: false };
  }

  return { initialText: "", requiresManualSelection: true };
}

export function syncTailorRewriteText(
  currentText: string,
  incomingText: string,
  userEdited: boolean,
): string {
  if (userEdited || !incomingText.trim()) return currentText;
  return incomingText;
}
