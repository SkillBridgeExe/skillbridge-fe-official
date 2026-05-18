import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const colorMap: Record<"primary" | "emerald" | "amber", { iconBg: string; activeBorder: string; activeBg: string }> = {
  primary: { iconBg: "bg-primary",      activeBorder: "border-primary",      activeBg: "bg-primary/5"  },
  emerald: { iconBg: "bg-emerald-500",  activeBorder: "border-emerald-500",  activeBg: "bg-emerald-50" },
  amber:   { iconBg: "bg-amber-500",    activeBorder: "border-amber-500",    activeBg: "bg-amber-50"   },
};

interface ModeCardProps {
  icon: React.ReactNode;
  color: "primary" | "emerald" | "amber";
  title: string;
  description: string;
  status: "demo" | "available" | "locked";
  lockReason?: string;
  isActive: boolean;
  onClick: () => void;
}

export function ModeCard({ icon, color, title, description, status, lockReason, isActive, onClick }: ModeCardProps) {
  const c = colorMap[color];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 hover:shadow-md",
        isActive ? cn(c.activeBorder, c.activeBg) : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white", c.iconBg)}>
          {icon}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-slate-900">{title}</span>
            {status === "demo" && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Demo
              </span>
            )}
            {status === "available" && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Ready
              </span>
            )}
            {status === "locked" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                <Lock className="w-3 h-3" /> No data yet
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">{description}</p>
          {status === "locked" && lockReason && (
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Lock className="w-3 h-3" /> {lockReason}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
