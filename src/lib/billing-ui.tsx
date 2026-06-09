import { Badge } from "@/components/ui/badge";

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

export function StatusBadge({ status }: { status?: string | null }) {
  const value = status ?? "UNKNOWN";
  const className =
    value === "PAID" || value === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "PENDING" || value === "AWAITING_REMAINING" || value === "AWAITING_MENTOR_ACCEPT"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : value === "CANCELLED" || value === "FAILED" || value === "EXPIRED" || value === "PAST_DUE"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <Badge variant="outline" className={className}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
