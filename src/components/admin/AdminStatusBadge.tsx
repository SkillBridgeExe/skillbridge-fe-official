import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

type Status = "active" | "pending" | "suspended" | "draft" | "archived" | "completed" | "reviewed";

const meta: Record<
  Status,
  { label: string; className: string; icon: React.ElementType }
> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-100", icon: Clock },
  suspended: {
    label: "Suspended",
    className: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    icon: ShieldAlert,
  },
  draft: { label: "Draft", className: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700", icon: Clock },
  archived: {
    label: "Archived",
    className: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    icon: AlertTriangle,
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: CheckCircle2,
  },
  reviewed: {
    label: "Reviewed",
    className: "bg-blue-50 text-blue-700 border-blue-100",
    icon: CheckCircle2,
  },
};

export default function AdminStatusBadge({ status }: { status: string }) {
  const s = status as Status;
  const m = meta[s] ?? meta.pending;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold") + " " + m.className}>
      <Icon className="w-3.5 h-3.5" />
      {m.label}
    </span>
  );
}

