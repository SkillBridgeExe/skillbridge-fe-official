import { useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  Flame,
  Timer,
  Zap,
  Target,
  Lightbulb,
  Award,
  BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_AI_SIDEBAR_SECTIONS } from "@/lib/mock-data/dashboard";
import type { AISidebarInsight } from "@/lib/mock-data/dashboard";

const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  Flame,
  Timer,
  Zap,
  Target,
  Lightbulb,
  Award,
};

const typeColors: Record<AISidebarInsight["type"], { bg: string; text: string; border: string }> = {
  positive: { bg: "bg-emerald-50/80", text: "text-emerald-600", border: "border-emerald-100" },
  warning: { bg: "bg-amber-50/80", text: "text-amber-600", border: "border-amber-100" },
  info: { bg: "bg-blue-50/80", text: "text-blue-600", border: "border-blue-100" },
  tip: { bg: "bg-violet-50/80", text: "text-violet-600", border: "border-violet-100" },
};

interface AISidebarProps {
  activeSection: string;
}

export default function AISidebar({ activeSection }: AISidebarProps) {
  const currentSection = useMemo(() => {
    return (
      MOCK_AI_SIDEBAR_SECTIONS.find((s) => s.sectionId === activeSection) ||
      MOCK_AI_SIDEBAR_SECTIONS[0]
    );
  }, [activeSection]);

  return (
    /* Rendered inside flex layout — parent handles sticky + positioning */
    <aside className="w-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-violet-100 flex items-center justify-center shadow-sm">
            <BrainCircuit className="w-[18px] h-[18px] text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">AI Insights</h3>
            <p className="text-xs text-slate-400 font-medium">
              Powered by SkillBridge AI
            </p>
          </div>
        </div>

        {/* Section indicator */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {currentSection.label}
          </span>
        </div>

        {/* Insight Cards */}
        <div className="space-y-3">
          {currentSection.insights.map((insight, idx) => {
            const colors = typeColors[insight.type];
            const Icon = iconMap[insight.icon] || Sparkles;

            return (
              <div
                key={insight.id}
                className={cn(
                  "rounded-xl border p-3.5 transition-all duration-500",
                  "animate-in fade-in slide-in-from-left-4",
                  colors.bg,
                  colors.border,
                  "hover:translate-x-1 cursor-default"
                )}
                style={{ animationDelay: `${idx * 150}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                      colors.text,
                      "bg-white/60"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 leading-tight">
                      {insight.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom decoration */}
        <div className="pt-2 px-1">
          <div className="h-px bg-gradient-to-r from-primary/20 via-violet-200 to-transparent" />
        </div>
      </div>
    </aside>
  );
}
