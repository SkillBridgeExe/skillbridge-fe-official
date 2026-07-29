import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type CheckoutPriceSummaryLabels = {
  plan: string;
  originalPrice: string;
  discount: string;
  total: string;
};

export function CheckoutPriceSummary({
  planName,
  originalAmountVnd,
  discountAmountVnd,
  finalAmountVnd,
  labels,
}: {
  planName: string;
  originalAmountVnd: number;
  discountAmountVnd: number;
  finalAmountVnd: number;
  labels: CheckoutPriceSummaryLabels;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {labels.plan}
        </span>
        <span className="font-poppins font-black text-slate-950">
          {planName}
        </span>
      </div>
      <div className="space-y-3 p-4 text-sm">
        <PriceLine label={labels.originalPrice} value={originalAmountVnd} />
        {discountAmountVnd > 0 ? (
          <PriceLine
            label={labels.discount}
            value={-discountAmountVnd}
            discount
          />
        ) : null}
        <Separator />
        <PriceLine
          label={labels.total}
          value={finalAmountVnd}
          total
          testId="checkout-total"
        />
      </div>
    </div>
  );
}

function PriceLine({
  label,
  value,
  discount = false,
  total = false,
  testId,
}: {
  label: string;
  value: number;
  discount?: boolean;
  total?: boolean;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        discount && "text-emerald-700",
        total && "items-end font-black text-slate-950",
      )}
    >
      <span>{label}</span>
      <span
        data-testid={testId}
        className={cn(
          "shrink-0 whitespace-nowrap font-bold tabular-nums",
          total && "font-poppins text-xl",
        )}
      >
        {value < 0 ? "-" : ""}
        {formatVnd(Math.abs(value))}đ
      </span>
    </div>
  );
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value);
}
