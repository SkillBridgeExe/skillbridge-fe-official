import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MentorProfileStatus } from "@/services/mentor.service";

const STATUS_STYLES: Record<MentorProfileStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200",
  PENDING_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  SUSPENDED: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
};

export function MentorStatusBadge({ status, className }: { status: MentorProfileStatus; className?: string }) {
  const { t } = useTranslation("common");
  return <Badge className={cn("rounded-full border-0 px-3 py-1 font-bold hover:opacity-100", STATUS_STYLES[status], className)}>{t(`mentor.status.${status}`)}</Badge>;
}
