import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Calendar,
  FileSearch,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_AI_DAILY_BRIEFING } from "@/lib/mock-data/dashboard";
import type { AIDailyBriefingItem } from "@/lib/mock-data/dashboard";

const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Calendar,
  FileSearch,
};

const typeStyles: Record<AIDailyBriefingItem["type"], { bg: string; border: string; icon: string; dot: string }> = {
  trend: { bg: "bg-emerald-50/80", border: "border-emerald-100", icon: "text-emerald-600", dot: "bg-emerald-500" },
  warning: { bg: "bg-amber-50/80", border: "border-amber-100", icon: "text-amber-600", dot: "bg-amber-500" },
  suggestion: { bg: "bg-blue-50/80", border: "border-blue-100", icon: "text-blue-600", dot: "bg-blue-500" },
  reminder: { bg: "bg-violet-50/80", border: "border-violet-100", icon: "text-violet-600", dot: "bg-violet-500" },
};

interface AIDailyBriefingProps {
  onOpenChat?: () => void;
}

export default function AIDailyBriefing({ onOpenChat }: AIDailyBriefingProps) {
  const [visibleItems, setVisibleItems] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  // Typing simulation — items appear one by one
  useEffect(() => {
    const timer = setTimeout(() => setIsAnalyzing(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAnalyzing) return;
    if (visibleItems >= MOCK_AI_DAILY_BRIEFING.length) return;
    const timer = setTimeout(
      () => setVisibleItems((v) => v + 1),
      300
    );
    return () => clearTimeout(timer);
  }, [visibleItems, isAnalyzing]);

  return (
    <Card className="glass border-white/50 shadow-sm overflow-hidden relative">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-blue-500 to-violet-500" />

      <CardHeader className="pb-2 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-violet-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                AI Daily Briefing
              </CardTitle>
              <p className="text-xs text-slate-400 font-medium">
                Sample insights · demo
              </p>
            </div>
          </div>
          {onOpenChat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenChat}
              className="text-primary font-bold text-xs"
            >
              Ask AI more →
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        {isAnalyzing ? (
          <div className="flex items-center gap-3 py-4">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-slate-400 font-medium">Loading...</span>
          </div>
        ) : (
          <div className="flex flex-col bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm">
            {MOCK_AI_DAILY_BRIEFING.map((item, idx) => {
              if (idx >= visibleItems) return null;
              const style = typeStyles[item.type];
              const Icon = iconMap[item.icon] || Lightbulb;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border-b border-slate-100 last:border-0 transition-all duration-300 hover:bg-slate-50",
                    "animate-in fade-in slide-in-from-bottom-2"
                  )}
                >
                  <div className={cn("flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center", style.bg)}>
                    <Icon className={cn("w-5 h-5", style.icon)} />
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-4">
                    <p 
                      className="text-sm text-slate-700 leading-relaxed font-medium [&>strong]:text-slate-900 [&>strong]:font-bold"
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                  </div>
                  
                  {item.action && (
                    <div className="flex-shrink-0 mt-3 sm:mt-0 w-full sm:w-auto text-right">
                      <Link to={item.action.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8 px-3 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 whitespace-nowrap",
                            style.icon
                          )}
                        >
                          {item.action.label}
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
