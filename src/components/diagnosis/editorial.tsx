import React, { memo, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Ruler } from "lucide-react";
import type { GapItem } from "@shared/api";

/* ─────────────────────────────────────────────────────────────────────────────
 * Editorial primitives for Diagnosis Results (W24).
 *
 * HONESTY RULE: VerdictHero pull-quote uses only existing `scoreMessage` band
 * copy — no AI-generated sentences, no invented claims.
 * ────────────────────────────────────────────────────────────────────────── */

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ── SectionRule ─────────────────────────────────────────────────────────── */

/**
 * Hairline divider that draws itself in from left when scrolled into view.
 * Replaces heavy card borders between "chapters".
 */
export const SectionRule = memo(function SectionRule({ className }: { className?: string }) {
  const ref = useRef<HTMLHRElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prefersReduced()) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <hr
      ref={ref}
      className={cn(
        "border-0 h-px bg-[#EAEAEA] transition-all duration-700 origin-left",
        visible ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
        className,
      )}
    />
  );
});

/* ── Chapter ─────────────────────────────────────────────────────────────── */

/**
 * Chapter heading: eyebrow kicker (11px uppercase) + serif title (19–20px).
 */
export function Chapter({
  kicker,
  title,
  children,
  className,
  id,
}: {
  kicker?: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("space-y-5", className)}>
      <div className="space-y-1">
        {kicker && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">
            {kicker}
          </p>
        )}
        <h2 className="font-serif text-[19px] font-semibold text-[#2F3437] leading-snug">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

/* ── VerdictHero ─────────────────────────────────────────────────────────── */

/**
 * Score number (56–64 mono) + pull-quote (serif) + band pill.
 * Replaces FlatScore + confetti with a tasteful editorial reveal.
 *
 * Pull-quote text = `verdictMessage` which MUST come from existing `scoreMessage`
 * or a band copy field — never invented.
 */
export const VerdictHero = memo(function VerdictHero({
  target,
  label,
  verdictMessage,
  isJdMode,
  rubricBand,
  bandLabel,
  bandTooltip,
}: {
  target: number;
  label: string;
  verdictMessage: string;
  isJdMode: boolean;
  rubricBand?: string | null;
  bandLabel?: string;
  bandTooltip?: string;
}) {
  const { t } = useTranslation("diagnosis");
  const [displayed, setDisplayed] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(false);
  const reduced = prefersReduced();

  // Count-up
  useEffect(() => {
    if (reduced) { setDisplayed(target); setQuoteVisible(true); return; }
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setDisplayed(Math.round(start));
      if (start >= target) { clearInterval(timer); setTimeout(() => setQuoteVisible(true), 120); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, reduced]);

  const isExcellent = target >= 85;

  return (
    <div className="flex flex-col items-center py-10 space-y-4" role="img" aria-label={`${label}: ${target}%`}>
      {/* Score */}
      <div className="flex items-baseline gap-1">
        <span className={cn(
          "text-[64px] font-mono tabular-nums font-black leading-none tracking-[-0.02em]",
          isExcellent ? "text-ink-accent" : "text-[#2F3437]",
        )}>
          {displayed}
        </span>
        <span className="text-sm text-[#787774] font-medium">%</span>
      </div>

      {/* Score label */}
      <span className="text-[11px] font-bold text-[#787774] uppercase tracking-widest">
        {label}
      </span>

      {/* Pull-quote verdict — serif, with accent underline */}
      <div className={cn(
        "relative text-center max-w-md px-6 transition-all duration-500",
        quoteVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}>
        <p className={cn(
          "font-serif text-[22px] md:text-[26px] leading-snug font-medium",
          isExcellent ? "text-ink-accent" : "text-[#2F3437]",
        )}>
          {verdictMessage}
        </p>
        {/* Accent underline sweep */}
        <span className={cn(
          "block mx-auto mt-3 h-[2px] bg-ink-accent transition-all origin-left",
          reduced ? "w-16" : "duration-500",
          quoteVisible && !reduced ? "w-16" : reduced ? "" : "w-0",
        )} />
      </div>

      {/* Band pill */}
      {isJdMode && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E3E0] bg-[#F1F1EF] px-2.5 py-1 text-[10px] font-bold text-[#787774]"
          title={bandTooltip || undefined}
        >
          <Ruler className="h-3 w-3" />
          {bandLabel || (rubricBand
            ? t("band.label", { band: t(`band.${rubricBand}`) })
            : t("band.jdYardstick"))}
        </span>
      )}
    </div>
  );
});

/* ── Ribbon ───────────────────────────────────────────────────────────────── */

/**
 * Inline stat row replacing the 4 colored boxes. Shows matched/partial/missing/
 * coverage/exp-fit as compact inline text. Optionally renders deal-breaker +
 * REQUIRED+missing chips from gap_items (= W23 #3: "tóm tắt gap nặng lên top").
 */
export function Ribbon({
  matched,
  partial,
  missing,
  coverage,
  expFitLabel,
  capApplied,
  gapItems,
}: {
  matched: number;
  partial: number;
  missing: number;
  coverage?: number;
  expFitLabel?: string | null;
  capApplied?: boolean;
  gapItems?: GapItem[];
}) {
  const { t } = useTranslation("diagnosis");

  // W23 #3: REQUIRED + missing/overclaimed gaps → surface as chips
  const criticalGaps = (gapItems ?? []).filter(
    (g) =>
      g.importance === "REQUIRED" &&
      (g.cv_status === "missing" || g.cv_status === "overclaimed"),
  );

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 px-1 text-[13px] font-semibold tabular-nums">
      <span className="text-[#346538]">
        <span className="font-mono text-[15px] font-bold">{matched}</span>{" "}
        {t("results.matched")}
      </span>
      <span className="text-[#956400]">
        <span className="font-mono text-[15px] font-bold">{partial}</span>{" "}
        {t("results.partial")}
      </span>
      <span className="text-[#9F2F2D]">
        <span className="font-mono text-[15px] font-bold">{missing}</span>{" "}
        {t("results.missing")}
      </span>
      {coverage != null && (
        <span className="text-[#787774]">
          {t("editorial.coverage", { pct: coverage })}
        </span>
      )}
      {expFitLabel && (
        <span className="text-[#787774]">{expFitLabel}</span>
      )}
      {capApplied && (
        <span className="text-[#956400] text-[11px]">{t("matchDepth.capped")}</span>
      )}

      {/* W23 #3: deal-breaker chips */}
      {criticalGaps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 ml-1">
          {criticalGaps.slice(0, 4).map((g) => (
            <span
              key={g.requirement_id}
              className="px-1.5 py-0.5 rounded border text-[10px] font-bold bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]"
            >
              {g.display_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
