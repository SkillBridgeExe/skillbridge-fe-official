import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { BILLING_ORDER_STATUSES, getBillingOrderStatusMeta } from "@/lib/billing-checkout";
import type { BillingOrderStatus } from "@/api/billing";

export function formatVnd(value: number | null | undefined) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function StatusBadge({ status, label }: { status?: string | null; label?: ReactNode }) {
  const value = status ?? "UNKNOWN";
  const normalized = value.toUpperCase();
  const isBillingOrderStatus = BILLING_ORDER_STATUSES.includes(normalized as BillingOrderStatus);
  const billingStatus = isBillingOrderStatus
    ? getBillingOrderStatusMeta(normalized)
    : null;
  const tone = billingStatus?.tone;
  const className =
    tone === "success" || value === "ACTIVE"
      ? "border-[hsl(var(--status-success-border))] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))]"
      : tone === "warning" || value === "AWAITING_REMAINING" || value === "AWAITING_MENTOR_ACCEPT"
        ? "border-[hsl(var(--status-warning-border))] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))]"
        : tone === "danger" || value === "PAST_DUE"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : tone === "info"
            ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-[hsl(var(--status-muted-border))] bg-[hsl(var(--status-muted-bg))] text-[hsl(var(--status-muted-fg))]";

  return (
    <Badge variant="outline" className={`whitespace-nowrap ${className}`}>
      {label ?? billingStatus?.label ?? value.replace(/_/g, " ")}
    </Badge>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 min-w-0 break-words text-sm font-semibold text-foreground">{value || "-"}</div>
    </div>
  );
}
