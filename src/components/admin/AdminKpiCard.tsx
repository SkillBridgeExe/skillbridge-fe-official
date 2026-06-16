import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import AdminProgressRing from "./AdminProgressRing";
import { cn } from "@/lib/utils";

type AdminKpiCardProps = {
  title: string;
  value: string;
  valueNumber?: number;
  valueSuffix?: string;
  progress?: number;
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
  const displayValue =
    valueNumber === undefined
      ? value
      : `${Math.round(valueNumber).toLocaleString()}${valueSuffix}`;

  return (
    <Card className={cn("overflow-hidden border-border/80 bg-card shadow-sm", accent.cardClassName)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-muted-foreground">
              {Icon ? (
                <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4">
                  <Icon />
                </span>
              ) : null}
              <span className="truncate text-sm font-semibold">{title}</span>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span
                className={cn(
                  "font-mono text-3xl font-bold leading-none tracking-normal text-foreground tabular-nums",
                  accent.valueClassName,
                )}
              >
                {displayValue}
              </span>
              {changeLabel ? (
                <Badge
                  variant={changeDirection === "down" ? "destructive" : "secondary"}
                  className="shrink-0 whitespace-nowrap"
                >
                  {changeLabel}
                </Badge>
              ) : null}
            </div>
            {progress !== undefined && progress !== null ? (
              <div className={cn("mt-3 text-xs font-medium text-muted-foreground", accent.subtitleClassName)}>
                {Math.round(progress)}% operational signal
              </div>
            ) : null}
          </div>

          {progress !== undefined ? (
            <div className="shrink-0">
              <AdminProgressRing
                value={progress}
                size={64}
                strokeWidth={8}
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
