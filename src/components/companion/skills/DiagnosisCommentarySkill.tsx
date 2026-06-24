// ─── DiagnosisCommentarySkill ──────────────────────────────────────
// Companion bubble renderer for Phase A "proactive grounded commentary"
// (the dolphin COMMENTS on the analysis the user is viewing, not just
// problems). Two kinds:
//   • explain_dimension — as the user scrolls onto a score-breakdown card,
//     the dolphin explains THAT card: real title + real score% + band chip
//     + the BE-authored rationale (VERBATIM "explain why") + the SAME tips
//     the card shows (VERBATIM CvIssue rows). A light dismiss is allowed.
//   • praise_overall — a celebratory framing of the real overall number
//     (+ low band → the real biggest-fix CTA). NO dismiss (praise is not a
//     problem).
//
// ANTI-FABRICATION: every number is VERBATIM from the issue (score20 / overallScore);
// every prose string is EITHER a VERBATIM BE field (issue.why = dim.rationale,
// CvIssue.detail/.suggestion, biggestFix = prioritized_actions[0]) OR a static
// enum-keyed i18n template that only WRAPS the real number/band. The FE composes
// NO novel claim sentence. NO LLM is ever invoked here.

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ElementIssue } from "./element-issues";

interface Props {
  issue: ElementIssue;
  onCta: () => void;
  /** Only wired for explain_dimension (light dismiss); praise has none. */
  onDismiss?: () => void;
}

/** Band chip — color keyed off the deterministic band (mirrors the card tones). */
function BandChip({ band, label }: { band: NonNullable<ElementIssue["band"]>; label: string }) {
  const tone =
    band === "strong"
      ? "border-[#DCE9D7] bg-[#EDF3EC] text-[#346538]"
      : band === "watch"
        ? "border-[#F1E5C0] bg-[#FBF3DB] text-[#956400]"
        : "border-[#F6D4D5] bg-[#FDEBEC] text-[#9F2F2D]";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>{label}</span>
  );
}

function ExplainDimension({ issue, onDismiss }: { issue: ElementIssue; onDismiss?: () => void }) {
  const { t } = useTranslation("diagnosis");
  const pct = issue.score20 != null ? Math.round(issue.score20 * 5) : null;
  const title = issue.titleKey ? t(issue.titleKey) : null;
  const bandLabel = issue.band ? t(`review.band.${issue.band}`) : null;
  // WHY = BE-authored rationale rendered VERBATIM (never invented).
  const why = issue.why ?? null;
  const tips = issue.tips ?? [];

  return (
    <div className="space-y-3 text-sm">
      {/* ── Header: real title + real score% + band chip ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          {title && <p className="font-bold text-[#2F3437] leading-tight">{title}</p>}
          {pct != null && (
            <span className="font-mono text-base font-black tabular-nums text-[#2F3437] shrink-0">
              {pct}%
            </span>
          )}
        </div>
        {issue.band && bandLabel && <BandChip band={issue.band} label={bandLabel} />}
      </div>

      {/* ── WHAT — static enum template keyed by band (wraps band label only,
            no composed claim). Falls back to the generic template if no band. ── */}
      <p className="text-[13px] font-semibold text-[#5F666B] leading-relaxed">
        {issue.band
          ? t(`companion.scoreBreakdown.explain.${issue.band}`, { band: bandLabel ?? "" })
          : t("companion.scoreBreakdown.explain.what", { band: bandLabel ?? "" })}
      </p>

      {/* ── WHY — BE rationale VERBATIM (the "explain why") ── */}
      {why && (
        <p className="text-[13px] text-[#5F666B] leading-relaxed border-l-2 border-primary/20 pl-3">
          {why}
        </p>
      )}

      {/* ── Tips — VERBATIM CvIssue rows (same slice as the card) ── */}
      {tips.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">
            {t("companion.scoreBreakdown.explain.tipsLabel")}
          </p>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-[12px] leading-relaxed text-[#2F3437]">
                <p className="font-medium">{tip.detail}</p>
                {tip.suggestion && (
                  <p className="mt-0.5 text-[#787774]">
                    <span className="font-bold text-[#2F3437]">{t("review.suggestionLabel")} </span>
                    {tip.suggestion}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Light dismiss (explain only — it's commentary, not a problem) ── */}
      {onDismiss && (
        <div className="flex items-center justify-end pt-2 border-t border-[#F1F1EF]">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-semibold text-[#787774] hover:bg-[#F7F6F3] transition-colors"
          >
            {t("companion.elementIssue.dismissOnce")}
          </button>
        </div>
      )}
    </div>
  );
}

function PraiseOverall({ issue, onCta }: { issue: ElementIssue; onCta: () => void }) {
  const { t } = useTranslation("diagnosis");
  const score = issue.overallScore;
  const band = issue.overallBand ?? "good";
  // WHY = the existing band scoreMsg copy rendered VERBATIM (never invented).
  const why = issue.whyKey ? t(issue.whyKey) : null;
  const biggestFix = issue.biggestFix ?? null;
  const ctaLabel = issue.ctaKind
    ? t(`companion.elementIssue.cta.${issue.ctaKind}`)
    : null;

  return (
    <div className="space-y-3 text-sm">
      {/* ── Celebratory framing of the real overall number (template wraps number) ── */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-[#346538] shrink-0" />
        <p className="font-bold text-[#2F3437] leading-snug">
          {t(`companion.praise.${band}`, { score: score ?? 0 })}
        </p>
      </div>

      {/* ── WHY — existing band scoreMsg copy VERBATIM ── */}
      {why && (
        <p className="text-[13px] text-[#5F666B] leading-relaxed border-l-2 border-primary/20 pl-3">
          {why}
        </p>
      )}

      {/* ── Low band only: the real biggest-fix line + CTA ── */}
      {biggestFix && (
        <p className="text-[13px] text-[#2F3437] leading-relaxed">
          <span className="font-bold">{t("companion.praise.biggestFixLabel")} </span>
          {biggestFix}
        </p>
      )}
      {ctaLabel && (
        <button
          type="button"
          onClick={onCta}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-colors active:scale-[0.97]"
        >
          {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function DiagnosisCommentarySkill({ issue, onCta, onDismiss }: Props) {
  if (issue.kind === "praise_overall") {
    return <PraiseOverall issue={issue} onCta={onCta} />;
  }
  // explain_dimension (default)
  return <ExplainDimension issue={issue} onDismiss={onDismiss} />;
}
