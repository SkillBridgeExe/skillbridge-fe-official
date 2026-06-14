import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ExtractionQuality } from "@shared/api";

/**
 * Honest input-quality disclosure. The BE computes `extraction_quality` deterministically (mojibake /
 * OCR / thin / sparse). This banner ONLY warns when the extracted text may be unreliable — it never
 * shows a score, never blocks anything, and renders NOTHING when the field is absent or confidence is
 * 'high' (the common case). Pure decision in `extractionBannerView` so it is unit-testable without a
 * DOM (the repo has no component-render test infra).
 */
export function extractionBannerView(
  quality?: ExtractionQuality | null,
): { tone: "medium" | "low"; messageKey: string; flags: string[] } | null {
  // Explicit allow-list (not just "!== high"): `quality` is raw BE-JSON passthrough with no runtime
  // narrowing, so any unexpected confidence value is treated like 'high' (render nothing) rather than
  // surfacing a missing i18n key — never show the user a raw `review.extractionQuality.<x>` path.
  if (!quality || (quality.confidence !== "medium" && quality.confidence !== "low")) return null;
  return {
    tone: quality.confidence,
    messageKey: `review.extractionQuality.${quality.confidence}`,
    flags: quality.flags ?? [],
  };
}

export function ExtractionQualityBanner({ quality }: { quality?: ExtractionQuality | null }) {
  const { t } = useTranslation("diagnosis");
  const view = extractionBannerView(quality);
  if (!view) return null;

  const tone =
    view.tone === "low"
      ? "border-[#F6D4D5] bg-[#FDEBEC] text-[#9F2F2D]"
      : "border-[#F1E5C0] bg-[#FBF3DB] text-[#956400]";

  return (
    <div className={cn("mb-6 flex items-start gap-3 rounded-2xl border p-4", tone)} role="status">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-relaxed">{t(view.messageKey)}</p>
        {view.flags.length > 0 && (
          <p className="mt-1 font-mono text-[11px] opacity-70">
            {t("review.extractionQuality.flagsLabel")}: {view.flags.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
