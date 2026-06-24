// ─── DiagnosisResultsSkill ───────────────────────────────────────────
// Lean bubble renderer: shows the SINGLE highest-severity next-step
// with one CTA (roadmap or builder). Text is BE `step.action` VERBATIM.

import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

interface Props {
  action: string; // BE next-step text, rendered VERBATIM
  ctaKind: "roadmap" | "builder";
  onCta: () => void;
}

export function DiagnosisResultsSkill({ action, ctaKind, onCta }: Props) {
  const { t } = useTranslation("diagnosis");
  const ctaLabel =
    ctaKind === "builder"
      ? t("companion.results.ctaBuilder", { defaultValue: "Bổ sung bằng chứng" })
      : t("companion.results.ctaRoadmap", { defaultValue: "Xem lộ trình học" });
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#2F3437] leading-relaxed">{action}</p>
      <button
        onClick={onCta}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
      >
        {ctaLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
