import { Card, CardContent } from "@/components/ui/card";
import { Clock, Award, BookOpen, FileCheck, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStat } from "@/lib/mock-data/dashboard";

const iconMap: Record<string, React.ElementType> = {
  Clock, Award, BookOpen, FileCheck,
};

const colorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
};

interface DashboardStatsProps {
  stats: DashboardStat[];
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = iconMap[stat.icon] || Clock;
        const c = colorMap[stat.color] || colorMap.primary;
        return (
          <Card key={stat.label} className="glass border-white/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", c.bg)}>
                <Icon className={cn("w-5 h-5", c.text)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-500 truncate">{stat.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                  {stat.trend && (
                    <span className={cn(
                      "flex items-center gap-0.5 text-xs font-bold",
                      stat.trend.isUp ? "text-emerald-600" : "text-red-500"
                    )}>
                      {stat.trend.isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {stat.trend.isUp ? "+" : "-"}{stat.trend.value}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
