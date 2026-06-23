// ─── CoachTurnView ──────────────────────────────────────────────────
// Renders a single deterministic coaching turn (Pillar 3, no-dead-end).
//  - kind="open"   → just the encouraging prompt; the caller's Textarea below
//                    captures the REAL content (free text → extract pipeline).
//  - kind="choice" → the prompt + A/B/C category chips. A chip only ROUTES/TAGS
//                    the next question — it asserts NO fact (anti-fab). The real
//                    CV content still comes only from the user's typed narrative.
//
// Every string is an i18n key from coach-flow.ts — never literal user text and
// never a fabricated specific bullet.

import { cn } from "@/lib/utils";
import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CoachTurn } from "./coach-flow";

export interface CoachTurnViewProps {
  turn: CoachTurn;
  /** The category key the user already picked (highlights that chip), if any. */
  selectedKey?: string | null;
  /** Pick a CHOICE category → routes/tags the next turn (no fact asserted). */
  onChoose: (optionKey: string) => void;
}

export function CoachTurnView({ turn, selectedKey, onChoose }: CoachTurnViewProps) {
  const { t } = useTranslation("diagnosis");

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-[#2F3437] leading-relaxed flex items-start gap-1.5">
        <Compass className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
        <span>{t(turn.promptKey)}</span>
      </p>

      {turn.kind === "choice" && turn.options && (
        <div className="flex flex-wrap gap-1.5">
          {turn.options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChoose(opt.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                selectedKey === opt.key
                  ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                  : "bg-[#FBFBFA] text-[#2F3437] border-[#EAEAEA] hover:border-primary/20 hover:bg-primary/5",
              )}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
