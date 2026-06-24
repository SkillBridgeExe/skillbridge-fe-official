// ─── DiagnosisProveItSkill ────────────────────────────────────────
// Companion bubble renderer for the "Prove-it" coach (#13).
// Shows a nudge to add evidence for a skill that's in the CV
// but only listed (no concrete bullet).

import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  displayName: string;
  onCta: () => void;
}

export function DiagnosisProveItSkill({ displayName, onCta }: Props) {
  const { t } = useTranslation("diagnosis");
  return (
    <div className="space-y-3 text-sm">
      <p className="text-[#2F3437] leading-relaxed">
        {t("companion.proveit.msg", { skill: displayName })}
      </p>
      <button
        type="button"
        onClick={onCta}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors active:scale-[0.97]"
      >
        {t("companion.proveit.cta")} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
