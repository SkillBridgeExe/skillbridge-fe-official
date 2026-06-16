import { Bot, RadioTower } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact ? "justify-center" : "")}>
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
        <svg viewBox="0 0 40 40" className="size-10" aria-hidden="true">
          <path
            d="M12 12.5h9.2c3.7 0 6 1.8 6 4.8 0 1.8-.9 3.2-2.4 4 2.2.7 3.5 2.3 3.5 4.6 0 3.2-2.6 5.6-6.9 5.6H12V12.5Z"
            fill="currentColor"
            opacity="0.16"
          />
          <path
            d="M14.5 14.8h6.1c2.4 0 3.7 1 3.7 2.8 0 1.7-1.3 2.8-3.5 2.8h-6.3v-5.6Zm0 8.1h6.9c2.5 0 4 1.1 4 3 0 2-1.5 3.2-4.1 3.2h-6.8v-6.2Z"
            fill="currentColor"
          />
          <path d="M9 9h22v3H9V9Zm0 19h6v3H9v-3Zm21-11h3v14h-3V17Z" fill="currentColor" opacity="0.72" />
        </svg>
        <span className="sr-only">SkillBridge Admin</span>
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
