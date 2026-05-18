import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import AdminProgressRing from "./AdminProgressRing";
import type { LucideIcon } from "lucide-react";

type AdminKpiCardProps = {
  title: string;
  value: string;
  valueNumber?: number;
  valueSuffix?: string;
  progress?: number; // 0-100 (ring)
  accent: {
    ringColorClass: string;
    cardClassName: string;
    valueClassName?: string;
    subtitleClassName?: string;
  };
  changeLabel?: string;
  changeDirection?: "up" | "down";
  icon?: LucideIcon;
};

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function AdminKpiCard({
  title,
  value,
  valueNumber,
  valueSuffix = "",
  progress = 0,
  accent,
  changeLabel,
  changeDirection,
  icon: Icon,
}: AdminKpiCardProps) {
  const valueRef = useRef<HTMLSpanElement | null>(null);

  const target = useMemo(() => {
    if (valueNumber === undefined) return null;
    return valueNumber;
  }, [valueNumber]);

  useEffect(() => {
    if (target === null) return;
    const el = valueRef.current;
    if (!el) return;

    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.2,
      ease: "power3.out",
      onUpdate: () => {
        el.textContent = `${formatNumber(obj.v)}${valueSuffix}`;
      },
    });
    // Set an initial value immediately for better perceived performance.
    el.textContent = `0${valueSuffix}`;
  }, [target, valueSuffix]);

  return (
    <Card className={cn("border-slate-200/70 dark:border-slate-700/70 shadow-sm rounded-2xl overflow-hidden", accent.cardClassName)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {Icon ? <Icon className="w-4 h-4 text-slate-700 dark:text-slate-200" /> : null}
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</div>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span
                ref={valueRef}
                className={cn("text-4xl font-black tabular-nums leading-none", accent.valueClassName ?? "text-slate-900 dark:text-slate-100")}
              >
                {target === null ? value : "0"}
              </span>
              {changeLabel ? (
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-1 rounded-full border",
                    changeDirection === "up"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-red-50 text-red-700 border-red-100"
                  )}
                >
                  {changeLabel}
                </span>
              ) : null}
            </div>
            {progress !== undefined && progress !== null ? (
              <div className={cn("mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300", accent.subtitleClassName)}>
                {Math.round(progress)}% target progress
              </div>
            ) : null}
          </div>

          {progress !== undefined ? (
            <div className="shrink-0">
              <AdminProgressRing
                value={progress}
                size={70}
                strokeWidth={9}
                colorClass={accent.ringColorClass}
                labelSuffix="%"
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

