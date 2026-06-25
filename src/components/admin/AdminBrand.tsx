import { Bot, RadioTower } from "lucide-react";
import { cn } from "@/lib/utils";
import logoPng from "@/assets/logo/LOGO_Final.png";

export function AdminBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact ? "justify-center" : "")}>
      <div className="flex size-10 shrink-0 items-center justify-center overflow-visible">
        <img
          src={logoPng}
          alt="SkillBridge"
          className="h-[72px] w-auto max-w-none object-contain drop-shadow-sm"
        />
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className="truncate text-sm font-bold leading-none text-foreground">SkillBridge</div>
          <div className="mt-1 truncate text-xs font-medium text-muted-foreground">Admin Operations</div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminAssistantMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3",
        compact ? "justify-center p-2" : "",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground [&_svg]:size-4">
        <Bot />
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            SB Assistant
            <RadioTower className="size-3 text-primary" />
          </div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
            Live admin signals
          </div>
        </div>
      ) : null}
    </div>
  );
}
