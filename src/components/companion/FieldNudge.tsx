import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Small, subtle inline hint next to the existing companion trigger — a quiet
 * "N gợi ý" nudge from the cheap rule analyze on blur, never a Clippy popup.
 * `count <= 0` (strong line) → no nudge at all.
 */
export function FieldNudge({ count, onClick }: { count: number; onClick: () => void }) {
  const { t } = useTranslation("diagnosis");
  if (count <= 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 text-xs text-primary hover:bg-primary/5 flex items-center gap-1 px-2 rounded-md"
    >
      <Sparkles className="w-3.5 h-3.5" />
      <span>💡 {count} {t("companion.nudgeSuggestions")}</span>
    </button>
  );
}
