import React, { memo, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Ruler, Check } from "lucide-react";
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
      {(kicker || title) && (
        <div className="space-y-1">
          {kicker && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">
              {kicker}
            </p>
          )}
          {title && (
            <h2 className="font-serif text-[19px] font-semibold text-[#2F3437] leading-snug">
              {title}
            </h2>
          )}
        </div>
      )}
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
  label: React.ReactNode;
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
  const radius = 120;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; // Half circle
  const strokeDashoffset = circumference - (displayed / 100) * circumference;

  // SVG Path for half circle
  const arcPath = `M ${strokeWidth/2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth/2} ${radius}`;

  return (
    <div className="flex flex-col items-center pt-8 pb-4 space-y-6" role="img" aria-label={`${label}: ${target}%`}>
      {/* Premium SVG Gauge Chart */}
      <div className="relative flex flex-col items-center justify-end" style={{ width: radius * 2, height: radius + strokeWidth }}>
        <svg
          height={radius + strokeWidth}
          width={radius * 2}
          className="absolute bottom-0 drop-shadow-sm"
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {isExcellent ? (
                <>
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#10B981" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </>
              )}
            </linearGradient>
          </defs>
          {/* Background Track */}
          <path
            d={arcPath}
            stroke="#F1F1EF"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Foreground Progress */}
          <path
            d={arcPath}
            stroke="url(#scoreGradient)"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]"
          />
        </svg>

        {/* Center Score */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center translate-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[64px] font-mono tabular-nums font-black leading-none tracking-tight text-[#2F3437]">
              {displayed}
            </span>
            <span className="text-2xl text-[#A1A1A1] font-medium font-mono">/100</span>
          </div>
          <span className="text-[10px] font-bold text-[#A1A1A1] uppercase tracking-[0.15em] mt-2">
            {label}
          </span>
        </div>
      </div>

      {/* Pull-quote verdict — sleek modern text */}
      <div className={cn(
        "relative text-center max-w-lg px-6 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
        quoteVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      )}>
        <p className={cn(
          "text-[20px] md:text-[24px] leading-snug font-semibold tracking-tight",
          isExcellent ? "text-[#10B981]" : "text-[#2F3437]"
        )}>
          {verdictMessage}
        </p>
      </div>

      {/* Band pill */}
      {isJdMode && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E3E0] bg-[#F1F1EF] px-3 py-1.5 text-[11px] font-bold text-[#787774]"
          title={bandTooltip || undefined}
        >
          <Ruler className="h-3.5 w-3.5" />
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
    <div className="flex flex-wrap items-center justify-center gap-3 py-2 px-1 text-[13px] font-semibold tabular-nums">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#DCE9D7] bg-[#EDF3EC] px-3.5 py-1.5 text-[#346538] shadow-sm">
        <span className="font-mono text-[15px] font-bold">{matched}</span> {t("results.matched")}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-[#F1E5C0] bg-[#FBF3DB] px-3.5 py-1.5 text-[#956400] shadow-sm">
        <span className="font-mono text-[15px] font-bold">{partial}</span> {t("results.partial")}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-[#F6D4D5] bg-[#FDEBEC] px-3.5 py-1.5 text-[#9F2F2D] shadow-sm">
        <span className="font-mono text-[15px] font-bold">{missing}</span> {t("results.missing")}
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

/* ── EditorialTabNav (W25) ───────────────────────────────────────────────── */

/**
 * Underline tab bar — replaces pill-style `rounded-2xl bg-slate-100`.
 * Active tab: serif font + pine accent underline (animated via SectionRule logic).
 * Inactive: 11px uppercase tracking, muted color.
 * Respects prefers-reduced-motion.
 */
export function EditorialTabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <nav className="flex border-b border-[#EAEAEA]" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ink-accent/40 outline-none",
              isActive
                ? "font-serif text-ink-accent"
                : "text-[#787774] hover:text-[#2F3437]",
            )}
          >
            {tab.icon}
            {tab.label}
            {/* Active underline */}
            <span
              className={cn(
                "absolute bottom-0 left-0 right-0 h-[2px] bg-ink-accent transition-all origin-left",
                prefersReduced() ? "" : "duration-300",
                isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}

/* ── StatRow (W25) ───────────────────────────────────────────────────────── */

/**
 * Compact pill stats below the Gauge: ATS score + target role.
 * Does NOT repeat the overall score — the Gauge above handles that.
 */
export function StatRow({
  score: _score,
  atsScore,
  role,
  scoreMessage: _scoreMessage,
  atsNote: _atsNote,
}: {
  score: number;
  atsScore: number;
  role: string;
  scoreMessage: string;
  atsNote?: string;
}) {
  const atsColor = atsScore >= 80 ? "text-[#346538] bg-[#EDF3EC] border-[#DCE9D7]"
    : atsScore >= 50 ? "text-[#956400] bg-[#FBF3DB] border-[#F1E5C0]"
    : "text-[#9F2F2D] bg-[#FDEBEC] border-[#F6D4D5]";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-3 px-1">
      <span className={cn("inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-bold", atsColor)}>
        <Check className="w-3.5 h-3.5" />
        ATS <span className="font-mono tabular-nums">{atsScore}%</span>
      </span>
      {role && role !== "N/A" && (
        <span className="inline-flex items-center gap-2 rounded-full border border-[#EAEAEA] bg-[#FBFBFA] px-3.5 py-1.5 text-[12px] font-bold text-[#2F3437]">
          <Ruler className="w-3.5 h-3.5 text-[#787774]" />
          {role}
        </span>
      )}
    </div>
  );
}

/* ── ActionRail (W25) ────────────────────────────────────────────────────── */

/**
 * Pair CTA (primary + secondary) framed with Chapter kicker.
 * Used in Step1 upload form as the main action area.
 */
export function ActionRail({
  kicker,
  primaryLabel,
  primaryIcon,
  primaryAction,
  primaryDisabled,
  secondaryLabel,
  secondaryIcon,
  secondaryAction,
  secondaryDisabled,
  helperText,
}: {
  kicker?: string;
  primaryLabel: string;
  primaryIcon?: React.ReactNode;
  primaryAction: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  secondaryIcon?: React.ReactNode;
  secondaryAction?: () => void;
  secondaryDisabled?: boolean;
  helperText?: string | null;
}) {
  return (
    <div className="space-y-3 pt-1">
      {kicker && (
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">
          {kicker}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        {secondaryLabel && (
          <button
            onClick={secondaryAction}
            disabled={secondaryDisabled}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 h-12 text-sm font-semibold border transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ink-accent/40 outline-none",
              secondaryDisabled
                ? "border-slate-200/70 border-dashed bg-slate-50/50 text-slate-400 cursor-not-allowed"
                : "border-slate-200 bg-white shadow-sm text-slate-700 hover:border-slate-300 hover:text-ink-accent hover:shadow-md",
            )}
          >
            {secondaryIcon}
            {secondaryLabel}
          </button>
        )}
        <button
          onClick={primaryAction}
          disabled={primaryDisabled}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 h-12 text-sm font-bold transition-all duration-300 outline-none",
            primaryDisabled
              ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-ink-accent to-[#009bda] hover:from-[#009bda] hover:to-ink-accent text-white shadow-lg shadow-ink-accent/20 border border-transparent active:scale-[0.98]",
          )}
        >
          {primaryIcon}
          {primaryLabel}
        </button>
      </div>
      {helperText && (
        <p className="text-center text-xs text-[#787774]">{helperText}</p>
      )}
    </div>
  );
}

