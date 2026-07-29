import { Link } from "react-router-dom";
import { Crown, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type PremiumDiagnosisGateProps = {
  variant: "audit" | "market";
  className?: string;
};

const AUDIT_WIDTHS = ["w-[88%]", "w-[68%]", "w-[78%]", "w-[58%]"];
const MARKET_WIDTHS = ["w-[82%]", "w-[63%]", "w-[72%]", "w-[54%]"];

/**
 * The preview is intentionally synthetic. Do not pass premium text as children:
 * CSS blur alone would leave paid analysis readable in the DOM.
 */
export function PremiumDiagnosisGate({
  variant,
  className,
}: PremiumDiagnosisGateProps) {
  const { t } = useTranslation("diagnosis");
  const rows = variant === "audit" ? AUDIT_WIDTHS : MARKET_WIDTHS;

  return (
    <section
      aria-label={t("premiumGate.ariaLabel")}
      className={cn(
        "relative isolate overflow-hidden rounded-xl border border-sky-100/80 bg-white",
        variant === "audit" ? "mt-4" : "p-4",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none select-none opacity-60 blur-[4px]",
          variant === "audit" ? "space-y-3 p-4 min-h-[220px]" : "space-y-3",
        )}
      >
        {rows.map((width, index) => (
          <div
            key={index}
            className={cn(
              "rounded-lg border border-slate-100 bg-slate-50",
              variant === "audit" ? "h-14 p-3" : "flex h-8 items-center gap-3 px-3",
            )}
          >
            {variant === "audit" ? (
              <>
                <div className={cn("h-2 rounded bg-slate-300", width)} />
                <div className="mt-2 h-2 w-1/2 rounded bg-slate-200" />
              </>
            ) : (
              <>
                <div className="h-2.5 w-28 rounded bg-slate-300" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div className={cn("h-full rounded-full bg-sky-300", width)} />
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-white/60 p-4 backdrop-blur-[2px]">
        <div className="max-w-md w-full rounded-2xl border border-sky-100 bg-white/95 p-5 text-center shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-primary shadow-sm">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h3 className="mt-2.5 text-base font-bold text-slate-900">
            {t(`premiumGate.${variant}.title`)}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {t(`premiumGate.${variant}.description`)}
          </p>
          <Link
            to="/pricing"
            className="mt-3.5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00AEEF] hover:bg-[#049bd7] px-5 text-xs font-bold text-white shadow-sm transition-all hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Crown className="h-4 w-4 text-amber-300 fill-amber-300" />
            {t("premiumGate.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
