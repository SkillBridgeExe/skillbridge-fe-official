/** Pick the most-visible registered companion context.
 *  Tie-break by higher `priority`, then first in array order.
 *  Returns null when nothing is visible (all ratios ≤ 0). */
export function pickActiveContext(
  entries: { id: string; ratio: number; priority?: number }[],
): string | null {
  let best: { id: string; ratio: number; priority: number } | null = null;
  for (const e of entries) {
    if (e.ratio <= 0) continue;
    const priority = e.priority ?? 0;
    if (
      !best ||
      e.ratio > best.ratio ||
      (e.ratio === best.ratio && priority > best.priority)
    ) {
      best = { id: e.id, ratio: e.ratio, priority };
    }
  }
  return best?.id ?? null;
}
