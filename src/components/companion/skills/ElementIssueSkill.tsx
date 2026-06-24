// ─── ElementIssueSkill ────────────────────────────────────────────
// Companion bubble renderer for the Perfected Diagnosis Companion
// (Pillar 1+2): the dolphin anchors to ONE problem card and explains
// it. Three slots — WHAT (i18n) + WHY (BE field VERBATIM or static
// enum i18n) + one CTA — plus a "1 of N" footer, a "why this first"
// affordance (only ever-present severity factors — honest), and a
// dismiss/snooze control. NO LLM is ever invoked here.

import { useState } from "react";
import { ArrowRight, ChevronDown, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ElementIssue } from "./element-issues";

interface Props {
  issue: ElementIssue;
  /** 0-based index within the visible queue (for the "1 of N" footer). */
  index: number;
  /** Total visible issues. */
  total: number;
  onCta: () => void;
  onDismiss: () => void;
  onSnooze: () => void;
}

export function ElementIssueSkill({ issue, index, total, onCta, onDismiss, onSnooze }: Props) {
  const { t } = useTranslation("diagnosis");
  const [whyOpen, setWhyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // WHY: BE-authored string rendered VERBATIM when present (anti-fab), else the
  // static enum-keyed i18n string. Never invented.
  const whyText = issue.why ?? (issue.whyKey ? t(issue.whyKey) : null);

  // CTA label keyed off the deterministic ctaKind (null → no CTA).
  const ctaLabel = issue.ctaKind
    ? t(`companion.elementIssue.cta.${issue.ctaKind}`)
    : null;

  // "Why this first" — only the numeric factors that actually exist (honest).
  const factors = issue.severityFactors;
  const presentFactors: Array<{ key: string; value: number }> = [];
  if (factors?.market_demand != null) presentFactors.push({ key: "market_demand", value: factors.market_demand });
  if (factors?.evidence_risk != null) presentFactors.push({ key: "evidence_risk", value: factors.evidence_risk });
  if (factors?.interview_risk != null) presentFactors.push({ key: "interview_risk", value: factors.interview_risk });

  return (
    <div className="space-y-3 text-sm">
      {/* ── WHAT ── */}
      <p className="font-semibold text-[#2F3437] leading-relaxed">
        {t(issue.whatKey)}
      </p>

      {/* ── WHY (verbatim BE field or static enum i18n) ── */}
      {whyText && (
        <p className="text-[13px] text-[#5F666B] leading-relaxed border-l-2 border-primary/20 pl-3">
          {whyText}
        </p>
      )}

      {/* ── CTA ── */}
      {ctaLabel && (
        <button
          type="button"
          onClick={onCta}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-colors active:scale-[0.97]"
        >
          {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* ── "Why this first" affordance (#2) — only present factors ── */}
      {presentFactors.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#787774] hover:text-[#2F3437] transition-colors"
            aria-expanded={whyOpen}
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${whyOpen ? "rotate-180" : ""}`} />
            {t("companion.elementIssue.whyFirst")}
          </button>
          {whyOpen && (
            <ul className="mt-1.5 space-y-1 pl-4">
              {presentFactors.map((f) => (
                <li key={f.key} className="text-[11px] text-[#787774] leading-relaxed">
                  <span className="font-semibold text-[#2F3437]">
                    {t(`companion.elementIssue.factor.${f.key}`)}
                  </span>
                  {": "}
                  <span className="font-mono tabular-nums">{f.value}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Footer: "1 of N" + dismiss/snooze menu ── */}
      <div className="flex items-center justify-between pt-2 border-t border-[#F1F1EF]">
        <span className="text-[11px] font-medium text-[#9AA1A6] tabular-nums">
          {t("companion.elementIssue.oneOfN", { index: index + 1, total })}
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-semibold text-[#787774] hover:bg-[#F7F6F3] transition-colors"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            {t("companion.elementIssue.dismiss")}
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 bottom-full mb-1 w-44 rounded-lg border border-[#EAEAEA] bg-white p-1 shadow-lg z-10"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); onDismiss(); }}
                className="block w-full rounded px-2.5 py-1.5 text-left text-[12px] font-medium text-[#2F3437] hover:bg-[#F7F6F3] transition-colors"
              >
                {t("companion.elementIssue.dismissOnce")}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); onSnooze(); }}
                className="block w-full rounded px-2.5 py-1.5 text-left text-[12px] font-medium text-[#2F3437] hover:bg-[#F7F6F3] transition-colors"
              >
                {t("companion.elementIssue.snooze")}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); onSnooze(); }}
                className="block w-full rounded px-2.5 py-1.5 text-left text-[12px] font-medium text-[#787774] hover:bg-[#F7F6F3] transition-colors"
              >
                {t("companion.elementIssue.intentional")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
