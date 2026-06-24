// ─── DiagnosisReviewSkill ─────────────────────────────────────────
// Generic companion bubble renderer used for both Step-2 review
// completeness nudge (#16) and Step-1 upload guide.
// Shows a contextual message + optional CTA.

import { ArrowRight } from "lucide-react";

interface Props {
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function DiagnosisReviewSkill({ message, ctaLabel, onCta }: Props) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-[#2F3437] leading-relaxed">{message}</p>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors active:scale-[0.97]"
        >
          {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
