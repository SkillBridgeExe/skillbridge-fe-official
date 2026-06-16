import { type ElementType } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status =
  | "active"
  | "pending"
  | "suspended"
  | "draft"
  | "archived"
  | "completed"
  | "reviewed"
  | "unverified";

const meta: Record<Status, { label: string; className: string; icon: ElementType }> = {
  active: {
    label: "Active",
    className:
      "border-[hsl(var(--status-success-border))] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))]",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    className:
      "border-[hsl(var(--status-success-border))] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))]",
    icon: CheckCircle2,
  },
  reviewed: {
    label: "Reviewed",
    className: "border-primary/20 bg-primary/10 text-primary",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    className:
      "border-[hsl(var(--status-warning-border))] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))]",
    icon: Clock,
  },
  unverified: {
    label: "Unverified",
    className:
      "border-[hsl(var(--status-warning-border))] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))]",
    icon: Clock,
  },
  suspended: {
    label: "Suspended",
    className:
      "border-[hsl(var(--status-muted-border))] bg-[hsl(var(--status-muted-bg))] text-[hsl(var(--status-muted-fg))]",
    icon: ShieldAlert,
  },
  draft: {
    label: "Draft",
    className:
      "border-[hsl(var(--status-muted-border))] bg-[hsl(var(--status-muted-bg))] text-[hsl(var(--status-muted-fg))]",
    icon: Clock,
  },
  archived: {
    label: "Archived",
    className:
      "border-[hsl(var(--status-muted-border))] bg-[hsl(var(--status-muted-bg))] text-[hsl(var(--status-muted-fg))]",
    icon: AlertTriangle,
  },
};

export default function AdminStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase() as Status;
  const item = meta[normalized] ?? meta.pending;
  const Icon = item.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 whitespace-nowrap px-2.5 py-1 font-semibold [&_svg]:size-3.5", item.className)}
    >
      <Icon />
      {item.label}
    </Badge>
  );
}
