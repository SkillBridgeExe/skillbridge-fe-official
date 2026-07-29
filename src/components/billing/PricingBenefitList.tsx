import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PricingBenefitItem = {
  key: string;
  label: string;
  value: string;
};

export function PricingBenefitList({
  items,
  premium = false,
}: {
  items: PricingBenefitItem[];
  premium?: boolean;
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item.key}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
        >
          <span className="flex min-w-0 items-center gap-2.5 text-slate-700">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500",
                premium && "bg-primary/10 text-primary",
              )}
            >
              <Check
                aria-hidden="true"
                className="h-3.5 w-3.5"
                strokeWidth={3}
              />
            </span>
            <span className="leading-5">{item.label}</span>
          </span>
          <span
            data-testid="pricing-benefit-quota"
            className={cn(
              "w-28 justify-self-end whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-right text-xs font-extrabold tabular-nums text-slate-700",
              premium && "bg-primary/10 text-primary",
            )}
          >
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
