// ─── InfoPopover ──────────────────────────────────────────────────
// Click-toggle explainer popover (mobile-first — Radix Tooltip is hover-only
// and can't open on tap). Same backdrop/close pattern as ScoreBreakdownPopover
// and FitBadge; use for badges/numbers that hide "why" behind a hover.

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoPopoverProps {
  /** Always-visible trigger (a badge, number, chip…). */
  trigger: ReactNode;
  /** Popover body. */
  children: ReactNode;
  /** Accessible label for the trigger + dialog. */
  label: string;
  /** Popover title shown in the card header. */
  title?: string;
  /** Horizontal anchor of the popover relative to the trigger. */
  align?: "left" | "center" | "right";
  className?: string;
}

export function InfoPopover({ trigger, children, label, title, align = "left", className }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);

  const alignClass =
    align === "center" ? "left-1/2 -translate-x-1/2" : align === "right" ? "right-0" : "left-0";

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        className="inline-flex items-center cursor-pointer"
      >
        {trigger}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} role="presentation" />
          {/* Popover card */}
          <div
            role="dialog"
            aria-label={label}
            className={cn(
              "absolute z-[71] top-full mt-1.5",
              alignClass,
              "w-[min(280px,85vw)] rounded-xl border border-[#EAEAEA] bg-white p-3 text-left shadow-xl",
              "animate-in fade-in zoom-in-95 duration-200",
            )}
          >
            {title && (
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">{title}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded p-0.5 text-[#787774] transition-colors hover:text-[#2F3437]"
                  aria-label="Close"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {children}
          </div>
        </>
      )}
    </span>
  );
}
