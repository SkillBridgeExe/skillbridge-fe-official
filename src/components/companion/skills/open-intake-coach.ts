// ─── open-intake-coach ──────────────────────────────────────────────
// Pillar 3 (no-dead-end): route a stuck/empty/confused state INTO the existing
// intake coaching loop instead of dead-ending. Registers + activates a single
// `cv_intake` companion context carrying a deterministic coaching trigger.
//
// Anti-fab: this only OPENS the intake bubble in coach mode. The real CV content
// still comes solely from what the user types, generated through the unchanged
// extract→computeIntakeFields pipeline. The coach trigger/gap only route the
// (deterministic, i18n) question; they assert no fact.

import { useCompanionStore } from "@/store/useCompanionStore";
import type { CoachTrigger } from "./coach-flow";

interface CurrentEntry {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  achievements: string;
}

export interface OpenIntakeCoachArgs {
  /** Stable id for the companion context (one per dead-end source). */
  id: string;
  draftId: string;
  entryIndex: number;
  currentEntry: CurrentEntry;
  /** Which dead-end routed the user here (drives the coaching funnel). */
  coachTrigger: CoachTrigger;
  /** Known upstream gap (e.g. "result"/"role") that selects the CHOICE bank. */
  coachGap?: string | null;
  /** Pre-fill the narrative box (e.g. a rewrite's currentValue on MAX_REASK). */
  seedNarrative?: string;
  /** Apply grounded extracted fields back to the store (empty-only + opt-in). */
  onApply: (fields: Record<string, string>) => void;
}

/** Register + activate the intake coaching bubble for a dead-end. */
export function openIntakeCoach(args: OpenIntakeCoachArgs): void {
  const {
    id, draftId, entryIndex, currentEntry,
    coachTrigger, coachGap, seedNarrative, onApply,
  } = args;

  const store = useCompanionStore.getState();
  store.registerContext({
    id,
    getTurn: () => ({
      skill: "cv_intake",
      props: {
        draftId,
        entryIndex,
        currentEntry,
        coachTrigger,
        coachGap: coachGap ?? null,
        seedNarrative,
        onApply,
      },
    }),
  });
  store.activateContext(id);
  useCompanionStore.setState({ bubbleOpen: true });
}
